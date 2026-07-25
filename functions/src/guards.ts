import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Mirror of src/constants/index.ts — cannot import across package boundaries
export const CREDIT_COSTS = {
  IMAGE:      1,
  QUOTE_CARD: 1,
  QUOTE_PACK: 1,
  VIDEO:      10,
} as const;

// Per-user per-minute limits
const RATE_LIMITS: Record<string, number> = {
  generateImage:         10,
  generateVideo:          2,
  generateVideoFromImage: 2,
  generateQuotePack:      5,
  generatePost:          10,
  processVoice:           5,
  moderateContent:       20,
};

// Per-user per-day hard caps
const DAILY_CAPS: Record<string, number> = {
  generateImage:         50,
  generateVideo:          5,
  generateVideoFromImage: 5,
  generateQuotePack:     20,
  generatePost:          30,
};

export function validatePrompt(prompt: string, maxLength = 2000): void {
  if (!prompt?.trim()) throw new HttpsError('invalid-argument', 'Prompt is required.');
  if (prompt.length > maxLength) {
    throw new HttpsError('invalid-argument', `Prompt too long. Max ${maxLength} characters.`);
  }
}

// Estimates raw bytes from a base64 string; throws if > 10 MB
export function validateImagePayload(base64: string): void {
  const estimatedBytes = (base64.length * 3) / 4;
  if (estimatedBytes > 10 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Payload too large. Maximum 10 MB.');
  }
}

// Sliding-window rate limit — one Firestore doc per uid+action
export async function rateLimit(uid: string, action: string): Promise<void> {
  const maxPerMinute = RATE_LIMITS[action] ?? 5;
  const db = admin.firestore();
  const ref = db.collection('rateLimits').doc(`${uid}_${action}`);
  const now = Date.now();
  const windowMs = 60_000;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? { count: 0, windowStart: now };
    const inWindow = now - data.windowStart < windowMs;
    const count = inWindow ? data.count : 0;
    if (count >= maxPerMinute) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a minute.');
    }
    tx.set(ref, { count: count + 1, windowStart: inWindow ? data.windowStart : now });
  });
}

// Per-day cap — UTC date key
export async function checkDailyCap(uid: string, action: string): Promise<void> {
  const cap = DAILY_CAPS[action];
  if (!cap) return;
  const today = new Date().toISOString().split('T')[0];
  const db = admin.firestore();
  const ref = db.collection('dailyCaps').doc(`${uid}_${action}_${today}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (count >= cap) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily limit of ${cap} reached. Resets at midnight UTC.`
      );
    }
    tx.set(ref, { count: count + 1 }, { merge: true });
  });
}

// Atomic credit deduction — throws resource-exhausted if insufficient
export async function spendCredits(uid: string, cost: number): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const credits: number = snap.data()?.credits ?? 0;
    if (credits < cost) throw new HttpsError('resource-exhausted', 'Not enough credits.');
    tx.update(userRef, { credits: admin.firestore.FieldValue.increment(-cost) });
  });
}

// Best-effort refund on AI failure — never throws
export async function refundCredits(uid: string, cost: number): Promise<void> {
  try {
    await admin.firestore().collection('users').doc(uid)
      .update({ credits: admin.firestore.FieldValue.increment(cost) });
  } catch { /* non-critical */ }
}

// Best-effort spend audit log — never throws
export async function logSpend(uid: string, action: string, cost: number): Promise<void> {
  try {
    await admin.firestore().collection('spendLog').add({
      uid, action, creditsSpent: cost,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch { /* non-critical */ }
}
