// Tiny animation helper on top of Pixi's ticker (runs once per frame).
// tween() moves numeric properties of an object over time and resolves a Promise when done,
// so animations can be chained with async/await.
import type { Ticker } from 'pixi.js';

export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Easing = (t) => t * t * t;
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutBounce: Easing = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// Accessibility: when the system asks for less motion (prefers-reduced-motion),
// animations run faster and without bounce/overshoot. Pauses made with wait() keep their length,
// so banners stay on screen long enough to be read.
const REDUCED_SPEED = 0.5; // 0.5 = half the duration

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function tween(
  ticker: Ticker,
  target: object,
  to: Record<string, number>,
  duration: number,
  ease: Easing = easeOutCubic,
  delay = 0,
): Promise<void> {
  if (prefersReducedMotion()) {
    duration *= REDUCED_SPEED;
    delay *= REDUCED_SPEED;
    if (ease === easeOutBounce || ease === easeOutBack) ease = easeOutCubic;
  }
  return run(ticker, target, to, duration, ease, delay);
}

export function wait(ticker: Ticker, ms: number): Promise<void> {
  return run(ticker, {}, {}, ms, linear, 0);
}

function run(
  ticker: Ticker,
  target: object,
  to: Record<string, number>,
  duration: number,
  ease: Easing,
  delay: number,
): Promise<void> {
  const obj = target as Record<string, number>;
  return new Promise((resolve) => {
    let elapsed = -delay;
    let from: Record<string, number> | null = null;

    const update = (t: Ticker) => {
      elapsed += t.deltaMS;
      if (elapsed < 0) return; // still waiting for the delay

      if (!from) {
        // capture the starting values only when the animation actually starts
        from = {};
        for (const key of Object.keys(to)) from[key] = obj[key];
      }

      const progress = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);
      const eased = ease(progress);
      for (const key of Object.keys(to)) {
        obj[key] = from[key] + (to[key] - from[key]) * eased;
      }

      if (progress >= 1) {
        ticker.remove(update);
        resolve();
      }
    };

    ticker.add(update);
  });
}
