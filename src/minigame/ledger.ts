// The mini-game ledger: its own spend log (results/minigame/) and its own total cap, separate
// from the probes' (probe.config.ts). Cap $35 (Dylan, Oct 25); PROBE_TOTAL_USD can only lower it.

export const MINIGAME_TOTAL_USD = Math.min(35, Number(process.env.PROBE_TOTAL_USD ?? 35));
