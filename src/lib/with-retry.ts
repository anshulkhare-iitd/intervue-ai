function isTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    // resource_exhausted without hard quota = transient throttle, worth retrying
    (msg.includes("resource_exhausted") &&
      !msg.includes("quota_exceeded") &&
      !msg.includes("insufficient_quota"))
  );
}

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransient(error) || attempt === maxAttempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw new Error("Retry exhausted");
}
