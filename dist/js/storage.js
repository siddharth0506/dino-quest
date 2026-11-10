// Storage is optional: private browsing and quota failures never block play.
const KEY = "dino-quest-v1";
export function readProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    const runs = Array.isArray(data.runs)
      ? data.runs
          .filter(
            (r) =>
              Number.isFinite(r.score) &&
              r.score >= 0 &&
              Number.isFinite(r.level),
          )
          .slice(0, 10)
      : [];
    return {
      highScore: Math.max(
        0,
        Number(data.highScore) || 0,
        ...runs.map((r) => r.score),
      ),
      bestLevel: Math.max(1, Number(data.bestLevel) || 1),
      runs,
      muted: !!data.muted,
    };
  } catch {
    return { highScore: 0, bestLevel: 1, runs: [], muted: false };
  }
}
export function saveProgress(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
