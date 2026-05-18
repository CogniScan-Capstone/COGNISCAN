export const AUTH_LOADING_MIN_MS = 3000;

export function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function waitForMinimumLoading(
  startedAt: number,
  minimumMs = AUTH_LOADING_MIN_MS,
) {
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, minimumMs - elapsed);
  if (remaining > 0) {
    await wait(remaining);
  }
}
