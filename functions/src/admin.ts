import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const adminUid = defineSecret('ADMIN_UID');

function requireAdmin(uid: string | undefined): void {
  if (!uid || uid !== adminUid.value()) {
    throw new HttpsError('permission-denied', 'Admin only.');
  }
}

// ─── Get users ─────────────────────────────────────────────────────────────────

export const hukumnamaAdminGetUsers = onCall(
  { secrets: [adminUid], cors: true },
  async (request) => {
    requireAdmin(request.auth?.uid);
    const { emailSearch, limit: lim = 50 } = request.data as {
      emailSearch?: string;
      limit?: number;
    };
    const snap = await admin
      .firestore()
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(lim, 200))
      .get();
    let docs: Record<string, unknown>[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (emailSearch?.trim()) {
      const q = emailSearch.trim().toLowerCase();
      docs = docs.filter(d => (d['email'] as string)?.toLowerCase().includes(q));
    }
    return docs.slice(0, 50);
  }
);

// ─── Get generations ───────────────────────────────────────────────────────────

export const hukumnamaAdminGetGenerations = onCall(
  { secrets: [adminUid], cors: true },
  async (request) => {
    requireAdmin(request.auth?.uid);
    const { type, userId, limit: lim = 50 } = request.data as {
      type?: string;
      userId?: string;
      limit?: number;
    };
    const snap = await admin
      .firestore()
      .collection('generations')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(lim, 200))
      .get();
    let docs: Record<string, unknown>[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (type) docs = docs.filter(d => d['type'] === type);
    if (userId?.trim()) docs = docs.filter(d => d['userId'] === userId.trim());
    return docs.slice(0, 50);
  }
);

// ─── Get moderation queue ──────────────────────────────────────────────────────

export const hukumnamaAdminGetRefusals = onCall(
  { secrets: [adminUid], cors: true },
  async (request) => {
    requireAdmin(request.auth?.uid);
    const { limit: lim = 30 } = request.data as { limit?: number };
    const snap = await admin
      .firestore()
      .collection('refusals')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(lim, 100))
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
);

// ─── Adjust credits ────────────────────────────────────────────────────────────

export const hukumnamaAdminAdjustCredits = onCall(
  { secrets: [adminUid], cors: true },
  async (request) => {
    requireAdmin(request.auth?.uid);
    const { uid, delta, reason } = request.data as {
      uid: string;
      delta: number;
      reason: string;
    };
    if (!uid) throw new HttpsError('invalid-argument', 'uid required');
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
      throw new HttpsError('invalid-argument', 'delta must be a finite number');
    }

    const db = admin.firestore();
    let newCredits = 0;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(db.collection('users').doc(uid));
      if (!snap.exists) throw new HttpsError('not-found', 'User not found');
      const current: number = snap.data()?.credits ?? 0;
      newCredits = Math.max(0, current + delta);
      tx.update(db.collection('users').doc(uid), { credits: newCredits });
    });

    // Audit trail in spendLog
    try {
      await db.collection('spendLog').add({
        uid,
        action: 'admin_adjustment',
        creditsSpent: -delta,
        reason: reason?.trim() || 'Admin adjustment',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch { /* non-critical */ }

    return { newCredits };
  }
);

// ─── Ad stats ──────────────────────────────────────────────────────────────────

export const hukumnamaAdminGetAdStats = onCall(
  { secrets: [adminUid], cors: true },
  async (request) => {
    requireAdmin(request.auth?.uid);
    const { days = 30 } = request.data as { days?: number };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const snap = await admin
      .firestore()
      .collection('adEvents')
      .where('date', '>=', cutoffStr)
      .get();

    let rewardedCompletions = 0;
    let creditsGranted = 0;
    let bannerImpressions = 0;
    let interstitialImpressions = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      if (d['type'] === 'reward') {
        rewardedCompletions++;
        creditsGranted += (d['creditsGranted'] as number) ?? 0;
      } else if (d['type'] === 'impression') {
        if (d['adUnit'] === 'banner') bannerImpressions++;
        else if (d['adUnit'] === 'interstitial') interstitialImpressions++;
      }
    }

    return { rewardedCompletions, creditsGranted, bannerImpressions, interstitialImpressions };
  }
);
