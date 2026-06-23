import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';

// ─── Keyword blocklist ────────────────────────────────────────────────────────
// Fast first-pass check before Gemini moderation. Patterns are intentionally
// narrow to avoid blocking legitimate devotional content.

const BLOCKLIST: RegExp[] = [
  // Facial/bodily depictions of the Ten Gurus
  /\b(guru\s*(nanak|angad|amar das|ram das|arjan|hargobind|har rai|har krishan|tegh bahadur|gobind singh))\s*(face|portrait|body|nude|naked|realistic photo|render)\b/i,

  // Sexual content
  /\b(nude|naked|pornograph|sexual|explicit|adult content|erotic|lewd)\b/i,

  // Mockery or parody of Sikh faith
  /\b(mock(ing|ery)?|parody|satiri[sz]|burlesque|ridicul|make fun of)\b.*\b(sikh|gurbani|guru|waheguru|gurdwara|khalsa|nitnem)\b/i,
  /\b(sikh|gurbani|guru|waheguru|gurdwara)\b.*\b(mock(ing|ery)?|parody|satiri[sz]|joke|funny meme)\b/i,

  // Hate speech
  /\b(hate|inferior|subhuman|degenerate|vermin)\b.*\b(sikh|hindu|muslim|christian|punjabi)\b/i,
];

export function checkBlocklist(prompt: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKLIST) {
    if (pattern.test(prompt)) {
      return {
        blocked: true,
        reason: 'This content violates our policy on respectful religious content.',
      };
    }
  }
  return { blocked: false };
}

// ─── Gemini moderation ────────────────────────────────────────────────────────

const MODERATION_SYSTEM = `
You are a content safety reviewer for Hukumnama AI Studio — a Sikh spiritual content creation app.

Your job: evaluate whether an AI image or video generation prompt could produce content that:
1. Depicts the faces or bodies of the Ten Sikh Gurus (strictly prohibited — no exceptions)
2. Mocks, parodies, or disrespects Gurbani, Sikh prayers, or religious practices
3. Uses Sikh religious imagery for political propaganda or divisive messaging
4. Contains hate speech, discrimination, or content demeaning any community
5. Includes sexual content, nudity, or graphic violence in any context
6. Glorifies terrorism or extremist ideology

PERMITTED content: Gurdwara architecture, abstract Khanda/Nishan Sahib symbols, spiritual landscapes,
natural scenes, festival celebrations, community life, non-figurative devotional artwork.

Be firm on the prohibited items but do not over-block legitimate devotional content.
Respond ONLY with a JSON object — no other text.
`.trim();

interface ModerationResult {
  safe: boolean;
  reason: string;
  severity: 'none' | 'low' | 'medium' | 'high';
}

export async function runGeminiModeration(
  prompt: string,
  ai: GoogleGenAI,
): Promise<ModerationResult> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Evaluate this generation prompt for safety:\n\n"${prompt}"\n\nReturn JSON: { "safe": boolean, "reason": "one sentence", "severity": "none"|"low"|"medium"|"high" }`,
      config: {
        systemInstruction: MODERATION_SYSTEM,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return JSON.parse(response.text ?? '{"safe":true,"reason":"check inconclusive","severity":"none"}');
  } catch {
    // Inconclusive moderation → allow (blocklist already ran as hard gate)
    return { safe: true, reason: 'Moderation check inconclusive.', severity: 'none' };
  }
}

// ─── Refusal logging ──────────────────────────────────────────────────────────

export async function logRefusal(opts: {
  userId: string;
  prompt: string;
  reason: string;
  severity: string;
  source: 'blocklist' | 'gemini';
}): Promise<void> {
  try {
    await admin.firestore().collection('refusals').add({
      ...opts,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Logging failure must never block the error response to the user
  }
}

// ─── Combined moderation gate ─────────────────────────────────────────────────
// Call this before ANY AI generation. Throws HttpsError('permission-denied')
// if the prompt fails, which the client error handler catches.

export async function moderatePrompt(
  prompt: string,
  userId: string,
  ai: GoogleGenAI,
): Promise<void> {
  // 1. Fast blocklist
  const bl = checkBlocklist(prompt);
  if (bl.blocked) {
    await logRefusal({
      userId,
      prompt,
      reason: bl.reason!,
      severity: 'high',
      source: 'blocklist',
    });
    throw new HttpsError(
      'permission-denied',
      `Content rejected: ${bl.reason} Please review our Content Policy.`,
    );
  }

  // 2. Gemini safety check
  const gemini = await runGeminiModeration(prompt, ai);
  if (!gemini.safe) {
    await logRefusal({
      userId,
      prompt,
      reason: gemini.reason,
      severity: gemini.severity,
      source: 'gemini',
    });
    throw new HttpsError(
      'permission-denied',
      `Content rejected: ${gemini.reason} Hukumnama AI Studio is committed to respectful Sikh content.`,
    );
  }
}
