import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const MAX_DAILY_REWARDS = 3;
const REWARD_CREDITS = 5;

// grantAdReward — called by the client after a rewarded ad completes.
// Rate-limited server-side: max MAX_DAILY_REWARDS per user per day.
// Credits are updated atomically in a Firestore transaction.
export const hukumnamaGrantAdReward = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = request.auth.uid;
  const today = new Date().toISOString().split('T')[0];
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError('not-found', 'User document not found.');

    const data = snap.data()!;
    const lastAdReward: string | null = data.lastAdReward ?? null;
    const adRewardsToday: number = lastAdReward === today ? (data.adRewardsToday ?? 0) : 0;

    if (adRewardsToday >= MAX_DAILY_REWARDS) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily limit reached. You can earn up to ${MAX_DAILY_REWARDS} ad rewards per day. Come back tomorrow!`,
      );
    }

    tx.update(userRef, {
      credits: (data.credits ?? 0) + REWARD_CREDITS,
      lastAdReward: today,
      adRewardsToday: adRewardsToday + 1,
    });
  });

  // Log the reward event (Admin SDK bypasses Firestore rules)
  await db.collection('adEvents').add({
    userId: uid,
    type: 'reward',
    adUnit: 'rewarded',
    creditsGranted: REWARD_CREDITS,
    date: today,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { creditsGranted: REWARD_CREDITS };
});
