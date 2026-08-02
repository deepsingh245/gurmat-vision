import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { app } from './config';

let _analytics: ReturnType<typeof getAnalytics> | null = null;

isSupported().then(yes => {
  if (yes) _analytics = getAnalytics(app);
}).catch(() => {});

export function track(event: string, params?: Record<string, string | number>): void {
  if (!_analytics) return;
  try { logEvent(_analytics, event, params); } catch { /* ad blocker / no measurementId */ }
}
