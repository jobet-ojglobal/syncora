// lib/inflow/rate-limit.ts

let blockedUntil = 0;

export async function waitForInflowCooldown() {
  const waitMs = blockedUntil - Date.now();

  if (waitMs > 0) {
    console.warn(
      `[InFlow API] Global cooldown active. Waiting ${waitMs}ms`
    );

    await new Promise((resolve) =>
      setTimeout(resolve, waitMs)
    );
  }
}

export function setInflowCooldown(ms: number) {
  blockedUntil = Math.max(
    blockedUntil,
    Date.now() + ms
  );
}