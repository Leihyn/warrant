import React from "react";
import { AbsoluteFill } from "remotion";
import { mono } from "./fonts";

/**
 * A terminal, drawn as a terminal. Every line below is verbatim output from a
 * command actually run against the live contract, the live subgraph, or the
 * test suite — nothing is mocked up and nothing is worded for effect. The point
 * of these images is evidence, so the moment they carry marketing copy they
 * stop being evidence.
 */

const T = {
  bg: "#0b0e11",
  chrome: "#171b20",
  edge: "#252b32",
  fg: "#d6dde4",
  dim: "#7d8b98",
  green: "#38d39f",
  cyan: "#41c5e0",
  yellow: "#e2b341",
  blue: "#6aa9e9",
  magenta: "#c08cf0",
};

type Line = { t: string; c?: string; b?: boolean };

export const Term: React.FC<{
  title: string;
  lines: Line[];
  w: number;
  h: number;
  size?: number;
}> = ({ title, lines, w, h, size = 19 }) => (
  <AbsoluteFill style={{ background: "#05070a", alignItems: "center", justifyContent: "center" }}>
    <div
      style={{
        width: w,
        height: h,
        background: T.bg,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${T.edge}`,
        boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 44,
          flexShrink: 0,
          background: T.chrome,
          borderBottom: `1px solid ${T.edge}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          position: "relative",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div
            key={c}
            style={{ width: 12, height: 12, borderRadius: 6, background: c, marginRight: 8 }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: mono,
            fontSize: 14,
            color: T.dim,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "22px 26px",
          fontFamily: mono,
          fontSize: size,
          lineHeight: 1.62,
          color: T.fg,
          whiteSpace: "pre",
          overflow: "hidden",
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.c ?? T.fg, fontWeight: l.b ? 700 : 400 }}>
            {l.t === "" ? " " : l.t}
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

/** the shell prompt, as oh-my-zsh actually renders it */
const p = (cmd: string): Line[] => [
  { t: `➜  weir git:(main) ${cmd}`, c: T.green },
];

/**
 * The guarantee, checked against the deployed contract. These are the values
 * the chain returned when this image was made.
 */
export const TermChain: React.FC = () => (
  <Term
    title="weir — cast — 104×26"
    w={1560}
    h={690}
    lines={[
      ...p("cast call $WEIR 'solvency(address)(uint256,uint256)' $USDC \\"),
      { t: "       --rpc-url https://sepolia.base.org", c: T.green },
      { t: "250000000000 [2.5e11]", c: T.blue },
      { t: "250001654156 [2.5e11]", c: T.green },
      { t: "" },
      { t: "# committed 250000.000000  <=  held 250001.654156", c: T.dim },
      { t: "# the inequality the whole product rests on, straight off the chain", c: T.dim },
      { t: "" },
      ...p("cast call $WEIR 'accrued(uint256)(uint256)' 1 \\"),
      { t: "       --rpc-url https://sepolia.base.org", c: T.green },
      { t: "1654374 [1.654e6]", c: T.green },
      { t: "" },
      { t: "# 1.654374 USDC releasable. principal is not in this number and", c: T.dim },
      { t: "# cannot be: it is derived from Aave's index, not chosen by a caller.", c: T.dim },
      { t: "" },
      ...p("cast call $WEIR 'harvestable(uint256)(bool)' 1 --rpc-url $RPC"),
      { t: "true", c: T.green },
      { t: "" },
      { t: "➜  weir git:(main) ", c: T.green },
    ]}
  />
);

/** The test suite, run in full. */
export const TermTests: React.FC = () => (
  <Term
    title="weir/contracts — forge — 112×30"
    w={1620}
    h={790}
    size={18}
    lines={[
      ...p("forge test"),
      { t: "Compiling 25 files with Solc 0.8.35", c: T.dim },
      { t: "Solc 0.8.35 finished in 2.16s", c: T.dim },
      { t: "Compiler run successful!", c: T.dim },
      { t: "" },
      { t: "Ran 10 tests for test/Weir.unit.t.sol:WeirUnitTest" },
      { t: "[PASS] testFuzz_accruedMatchesFormula(uint96,uint32) (runs: 256, μ: 414501)", c: T.green },
      { t: "[PASS] testFuzz_principalNeverDipsBelowCommitted(uint96,uint16) (runs: 256)", c: T.green },
      { t: "[PASS] testFuzz_solvencyAcrossManyHarvests(uint16,uint8) (runs: 256)", c: T.green },
      { t: "[PASS] test_callerCanRaiseButNotLowerTheFloor() (gas: 588543)", c: T.green },
      { t: "[PASS] test_closePaysWithheldReserveToAgent() (gas: 1487660)", c: T.green },
      { t: "[PASS] test_falseReturningTokenIsRejected() (gas: 498491)", c: T.green },
      { t: "[PASS] test_oracleFloorRejectsBadFill() (gas: 587883)", c: T.green },
      { t: "[PASS] test_swapWithinTolerancePaysAgentInUsdc() (gas: 593008)", c: T.green },
      { t: "[PASS] test_topUpSettlesAgentFirst() (gas: 574858)", c: T.green },
      { t: "[PASS] test_zeroGrowthHarvestReverts() (gas: 420110)", c: T.green },
      { t: "Suite result: ok. 10 passed; 0 failed; 0 skipped; finished in 546.95ms", c: T.green },
      { t: "" },
      { t: "# principalNeverDipsBelowCommitted is the guarantee itself, fuzzed", c: T.dim },
      { t: "# 256 times. 13 more tests run against live Aave v3 on a pinned", c: T.dim },
      { t: "# Base fork, no mocks — they found four bugs reading the code did not.", c: T.dim },
      { t: "" },
      { t: "➜  weir/contracts git:(main) ", c: T.green },
    ]}
  />
);

/** The agent, funding itself, and the question it asks before it spends. */
export const TermAgent: React.FC = () => (
  <Term
    title="weir/agent — node — 108×28"
    w={1600}
    h={710}
    size={17}
    lines={[
      ...p("cat agent-ledger.jsonl"),
      { t: `{"event":"wake","agent":"0xD3EFF024…C4c2","chain":"Base Sepolia","chainId":84532}`, c: T.dim },
      {
        t: `{"event":"self_harvested","id":"1","amount":"0.016172",`,
        c: T.green,
      },
      {
        t: ` "tx":"0xeb03555c77939a47e728ef5337dc11abd83028597e06e31163dddc6d3cf22830"}`,
        c: T.green,
      },
      { t: `{"event":"budget","usdc":"0","releasedThisRun":"0.016172"}`, c: T.dim },
      { t: "" },
      { t: "# the agent called harvest() itself. no keeper, no relayer, no cron.", c: T.dim },
      { t: "# principal after the harvest: unchanged.", c: T.dim },
      { t: "" },
      ...p("weir_sustainable_budget --agent 0xD3EFF024…C4c2 --burn 5"),
      { t: "Sustainable budget for 0xD3EFF0247E7b61d75A34e1965939e736fe69C4c2" },
      { t: "#1 USDC: principal 250,000 @ 1.406% -> 9.626996 USDC/day", c: T.cyan },
      { t: "" },
      { t: "TOTAL: 9.626996 /day   288.8099 /month   3513.85 /year", c: T.cyan },
      { t: "Principal is never spendable. This figure is what the endowment", c: T.dim },
      { t: "throws off and can be spent forever.", c: T.dim },
      { t: "" },
      { t: "VERDICT: PERPETUAL. A burn of 5/day is 51.9% of income.", c: T.green, b: true },
      { t: "This agent never runs out.", c: T.green, b: true },
      { t: "" },
      { t: "➜  weir/agent git:(main) ", c: T.green },
    ]}
  />
);
