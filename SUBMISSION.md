# DoraHacks submission — BUIDL CTC 2026 Fall

Deadline **04:59 WAT / 03:59 UTC, 14 Sep 2026**. The DoraHacks timeline widget renders in your
browser's timezone, and "23:59 ET Sep 13" equals 03:59 UTC, so treat 04:59 local as the wall.

Everything below is copy-paste ready. Fields marked **YOU** are the ones I cannot fill.

---

## Profile tab

**BUIDL name**
```
Warrant
```

**BUIDL logo** — upload `brand/logo.png` (480×480 PNG, 19 KB).

**Vision** (describe the problem this project solves) — **249 / 256 characters**
```
An agent says it was paid. Who checks? ERC-8004's answer is a reviewer, a staked node, or a TEE — all someone you must trust. Warrant is a validator with no keys: 100 only when the payment is provable on Ethereum mainnet via Attestcoin, 0 otherwise.
```
The longer version below is too long for this field; keep it for the Attestcoin Integration
Summary and the deck, which have no such limit.

**Category**
```
AI
```
The AI track describes this exactly: *"process cryptographically verified cross-chain data to
autonomously inform decisions and trigger on-chain transactions without centralized oracle
operators."* ERC-8004 is the Trustless **Agents** standard. Do not pick DeFi — you would be
competing on TVL narratives you do not have.

**GitHub**
```
https://github.com/Leihyn/warrant
```

**Project website** — the deck, once you have made it public:
```
https://claude.ai/code/artifact/3cc6144e-6ce6-496d-bd0e-ac39e957ffac
```
It is **private until you share it**. Open it, use the page's share menu, then either paste the
link or print to PDF (Cmd+P — it has print styles) and upload that instead.

**Demo video** — **YOU**. Script at the bottom of this file.

**Social links** (at least one required)
```
https://github.com/Leihyn
```

---

## Attestcoin Protocol Integration Summary

This is a scored criterion ("depth of Attestcoin Protocol utilization"). Paste whole:

```
Warrant calls the Attestcoin block-prover precompile at 0x0FD2 directly from
AttestcoinValidator.prove(), verifying that a payment transaction was included in
a finalized Ethereum mainnet block (chainKey 3). Off chain, the CLI uses
@gluwa/usc-sdk to build the Merkle and continuity proofs from the Creditcoin
prover service, and reads the attested frontier from the chain-info precompile so
a caller can tell whether a block is provable yet. The interface and EVM decoder
are vendored unmodified from @gluwa/usc-contracts.

The protocol is not a feature here, it is the trust model. Remove it and there is
no validator, only another party to trust.

Critically, the Attestcoin documentation states that the block prover "does not
validate if a transaction was successful or not." Inclusion is not success: a
transaction that reverted is still in the block and proves exactly as well as one
that moved a million dollars. A validator that stops at "the proof verified" will
settle a payment that never happened. Warrant decodes the receipt from the proven
transaction bytes and enforces four invariants — inclusion, replay, receipt
status, and emitter/argument binding — closing the gap the precompile explicitly
leaves open.

Demonstrated with two real USDC transfers from the SAME Ethereum mainnet block
25,971,533. Same Merkle root, same continuity proof, same attestation. 0x0FD2
returns true for both. Warrant returns 100 for the one that succeeded and 0 for
the one that reverted, emitting RejectedRevertedTransaction.

Live on Creditcoin CC3 (chain 102031), all contracts verified on Blockscout:
  AttestcoinValidator  0x606D9162aD1666B9c5735545A2c81af1f3948cF1
  ValidationRegistry   0x8b619C6F701598f48Acffd218F18A93CeB698Fbd
  IdentityRegistry     0x57e56f81b36d55931662A960b6F7c3B8ec02F0B9
```

---

## Evidence a judge can check in 60 seconds

| | Link |
|---|---|
| Validator contract (verified source) | https://creditcoin-testnet.blockscout.com/address/0x606D9162aD1666B9c5735545A2c81af1f3948cF1 |
| Payment that happened → **100** | https://creditcoin-testnet.blockscout.com/tx/0x6d601ec874682c3ea89d9ff28ae9dbfb657e2be4f64415741ca471a9ef1c44d9 |
| Payment that reverted → **0** | https://creditcoin-testnet.blockscout.com/tx/0xda90af0212f2e372fe445c104775973607a870d419efeaadb332501a2bc9b809 |
| The two mainnet transactions, same block 25,971,533 | `0x45f3697…857b41` (success) / `0x415fab3…2d7ea6` (reverted) |

No install needed to reproduce the thesis:
```bash
git clone https://github.com/Leihyn/warrant && cd warrant
forge test                                   # 4/4
cd tools && npm install && cd ..
node tools/warrant.mjs preflight 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
```

---

## Team tab — YOU

Per the rules, for each member: first & last name, email, Telegram (optional), X (optional),
LinkedIn (optional), resume PDF (optional), short bio, role, country of residence, country of
citizenship. Team size minimum 1.

Suggested bio/role if solo:
```
Role: Solo builder — protocol design, Solidity, tooling.
```

---

## Demo video script — 90 seconds, YOU

Screen-record a terminal. No editing required. Upload to YouTube (the form embeds YouTube).

**0:00–0:15 — the problem.** Over the README:
> "ERC-8004 lets any address be a validator, and names three you can trust: a reviewer, a
> staked node, a TEE. All three are somebody you have to trust."

**0:15–0:35 — the payment that happened.**
```bash
node tools/warrant.mjs preflight 0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41
```
> "A real 45 USDC payment on Ethereum mainnet. Attestcoin proves it. Warrant validates it."

**0:35–1:05 — the climax. Let the output sit on screen.**
```bash
node tools/warrant.mjs preflight 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
```
It prints `receipt status 0 <-- REVERTED`, then `verifySingle true`, then the thesis.
> "Same block. Same Merkle root. This one moved nothing — and the precompile still says true,
> because it cannot see receipt status. That is the gap Warrant closes."

**1:05–1:30 — on chain.** Open the rejection transaction in Blockscout, point at
`RejectedRevertedTransaction`. Then:
```bash
node tools/warrant.mjs status demo-reverted     # 0
```
> "Nothing to bribe, because there is nobody to bribe."

---

## Checklist

- [x] Deployed on a testnet — CC3, chain 102031
- [x] Working Attestcoin integration running in the project
- [x] Technical documentation (README + RUNBOOK)
- [x] GitHub repo with README
- [x] Contracts verified on Blockscout
- [x] Logo (`brand/logo.png`)
- [x] Original work, created during the hackathon
- [ ] **Demo video** — YOU
- [x] Deck built (`deck/index.html`, hosted) — **YOU** must make it public or print to PDF
- [ ] **Team information** — YOU
- [ ] **Register as a hacker, then create the BUIDL and submit** — YOU

Create the BUIDL early: DoraHacks lets you keep editing until the deadline, so submitting a
draft now turns the cliff into a ratchet.


---

## Seeing it locally

**Warrant has no web app.** It is three contracts plus a CLI, so there is nothing to "run" in a
browser. The only web artifact is the deck.

**The deck:**
```bash
cd deck && python3 -m http.server 8080
```
Then open <http://127.0.0.1:8080/>. Or just double-click `deck/index.html` — it is a single
self-contained file and opens straight from disk.

**The project itself** is a terminal program. This is what a judge, and your video, should see:
```bash
cd tools && npm install && cd ..

node tools/warrant.mjs frontier                      # how far Attestcoin has attested mainnet
node tools/warrant.mjs preflight 0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41
node tools/warrant.mjs preflight 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
node tools/warrant.mjs status demo-good              # 100
node tools/warrant.mjs status demo-reverted          # 0
```
None of those need gas, a key, or a deployment. They hit the live Creditcoin prover and the
real `0x0FD2` precompile.

**The deployed contracts** are visible on Blockscout with verified source — that is the closest
thing to a "live site" this project has:
<https://creditcoin-testnet.blockscout.com/address/0x606D9162aD1666B9c5735545A2c81af1f3948cF1>
