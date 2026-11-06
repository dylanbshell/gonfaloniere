// The mini-game ledger: its own spend log (results/minigame/) and its own total cap, separate
// from the probes' (probe.config.ts). Cap $45 (Dylan, Oct 28; $35 from Oct 25); PROBE_TOTAL_USD can only lower it.

export const MINIGAME_TOTAL_USD = Math.min(45, Number(process.env.PROBE_TOTAL_USD ?? 45));
