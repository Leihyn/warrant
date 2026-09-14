import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../constants";
import { sans } from "../fonts";

/**
 * Burned-in captions. Times are in SECONDS on the whole-film timeline, so the
 * cue list can be generated straight from a transcript of the real narration
 * rather than guessed from the script — what the narrator actually said is the
 * only thing worth putting on screen.
 *
 * Rendered above the section rail and behind nothing, with its own scrim, so it
 * stays legible over full-bleed screen footage as well as over flat backgrounds.
 */

export type Cue = { from: number; to: number; text: string };

export const Captions: React.FC<{ cues: Cue[]; offset?: number }> = ({ cues, offset = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + offset;
  const cue = cues.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;

  // a short fade so cues do not snap, but never long enough to lag the voice
  const inA = Math.min(1, (t - cue.from) / 0.12);
  const outA = Math.min(1, (cue.to - t) / 0.12);
  const opacity = Math.max(0, Math.min(inA, outA));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 108,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 96px",
          padding: "16px 30px",
          borderRadius: 10,
          background: "rgba(5,7,10,.82)",
          border: `1px solid rgba(255,255,255,.07)`,
          backdropFilter: "blur(6px)",
          fontFamily: sans,
          fontSize: 34,
          lineHeight: 1.34,
          color: C.fg,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

/**
 * The whole-film cue list, generated from a transcript of the recorded
 * narration and then corrected against the script that was read, because a
 * caption that disagrees with the voice is worse than no caption at all.
 */
export const CUES: Cue[] = [
  { from: 0.0, to: 5.2, text: "Your agent has a twelve-dollar-a-month API subscription." },
  { from: 5.2, to: 12.16, text: "You fund it with five hundred dollars. In forty months it's dead, and so is whatever it was maintaining." },
  { from: 12.16, to: 16.96, text: "Recurring costs don't stop. Budgets do." },
  { from: 16.96, to: 20.08, text: "Weir endows the bill instead of funding the agent." },
  { from: 20.08, to: 24.92, text: "You commit principal to Aave once. From then on the agent is paid only what the index adds." },
  { from: 24.92, to: 30.4, text: "And it can never touch the principal. Not because we check, but because of how the number is computed." },
  { from: 30.4, to: 36.96, text: "This is Aave's liquidity index, live on Base Sepolia. Every figure you're about to see is derived from it." },
  { from: 36.96, to: 37.96, text: "Nothing here is seeded." },
  { from: 37.96, to: 44.48, text: "Here's a real endowment. Two hundred and fifty thousand USDC, held back." },
  { from: 44.48, to: 50.56, text: "The number on the right is what's spilled over the crest, climbing about a hundred and sixteen units a second as you watch." },
  { from: 50.56, to: 58.6, text: "The agent can release that. It cannot release a unit more." },
  { from: 58.6, to: 64.34, text: "The released amount is principal times the change in index, over the starting index." },
  { from: 64.34, to: 69.06, text: "There's no amount parameter. Nothing to pass in, and nothing to abuse." },
  { from: 69.06, to: 71.8, text: "And this is the proof, not the claim." },
  { from: 71.8, to: 84.04, text: "Principal committed: two hundred and fifty thousand. aTokens actually held: two hundred and fifty thousand point eight nine." },
  { from: 84.04, to: 89.24, text: "Committed is less than or equal to held, every block." },
  { from: 89.24, to: 93.52, text: "If that ever inverted the guarantee would be a lie, so we show it instead of asserting it." },
  { from: 93.52, to: 98.36, text: "Anyone can press this. I'm not the owner and I'm not the agent, and it doesn't matter." },
  { from: 98.36, to: 102.46, text: "The amount comes from Aave's index, and the destination comes from contract storage." },
  { from: 102.46, to: 106.56, text: "There's nothing for a caller to choose, and nothing for a caller to gain." },
  { from: 106.56, to: 109.24, text: "That's why this needs no keeper, no relayer, and no trust in us." },
  { from: 109.24, to: 116.2, text: "This transaction is the agent paying itself. Sixteen thousandths of a dollar released, principal unchanged." },
  { from: 116.2, to: 124.78, text: "The agent asks the question it actually needs answered. Not “what's my balance”, but “what can I spend forever”." },
  { from: 124.78, to: 133.68, text: "That's served from a subgraph indexing every release on The Graph. It answers: perpetual — a five-dollar-a-day burn is fifty-two percent of income." },
  { from: 133.68, to: 143.79, text: "Uniswap converts a WETH endowment's yield into the USDC bills are denominated in, with the minimum output floored by Aave's own oracle." },
  { from: 143.79, to: 145.96, text: "So a caller can raise the slippage guard, but never lower it." },
  { from: 145.96, to: 152.16, text: "Weir is live on Base Sepolia, the contract is verified, and the agent has already paid itself." },
  { from: 152.16, to: 158.4, text: "An endowment your agent can't outspend, because the cap is arithmetic, not a policy it could edit." },
];
