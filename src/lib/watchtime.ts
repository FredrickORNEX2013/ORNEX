const WATCH_TIME_KEY = 'ornex_watch_time';
const CLAIMED_REWARDS_KEY = 'ornex_claimed_rewards';
const OFFLINE_THRESHOLD_SEC = 3600;
const REWARD_BATCH = 50;

export type WatchState = {
  totalSeconds: number;
  lastTick: number;
  claimedRewards: number;
};

export function loadWatchState(): WatchState {
  const raw = localStorage.getItem(WATCH_TIME_KEY);
  const claimedRaw = localStorage.getItem(CLAIMED_REWARDS_KEY);
  const claimedRewards = claimedRaw ? parseInt(claimedRaw, 10) : 0;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        totalSeconds: parsed.totalSeconds || 0,
        lastTick: parsed.lastTick || Date.now(),
        claimedRewards,
      };
    } catch {
      // fall through
    }
  }
  return { totalSeconds: 0, lastTick: Date.now(), claimedRewards };
}

export function saveWatchState(totalSeconds: number): void {
  localStorage.setItem(WATCH_TIME_KEY, JSON.stringify({ totalSeconds, lastTick: Date.now() }));
}

export function saveClaimedRewards(count: number): void {
  localStorage.setItem(CLAIMED_REWARDS_KEY, String(count));
}

export function getOfflineVideosUnlocked(state: WatchState): number {
  const fullHours = Math.floor(state.totalSeconds / OFFLINE_THRESHOLD_SEC);
  return fullHours * REWARD_BATCH;
}

export function getUnclaimedOfflineVideos(state: WatchState): number {
  return getOfflineVideosUnlocked(state) - state.claimedRewards;
}

export function getWatchProgress(state: WatchState): number {
  const secondsIntoCurrentHour = state.totalSeconds % OFFLINE_THRESHOLD_SEC;
  return (secondsIntoCurrentHour / OFFLINE_THRESHOLD_SEC) * 100;
}

export function getSecondsIntoCurrentHour(state: WatchState): number {
  return state.totalSeconds % OFFLINE_THRESHOLD_SEC;
}

export function formatWatchTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const OFFLINE_THRESHOLD = OFFLINE_THRESHOLD_SEC;
export const REWARD_VIDEOS_PER_HOUR = REWARD_BATCH;
