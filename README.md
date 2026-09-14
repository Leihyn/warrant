# Warrant

An ERC-8004 validator that holds no keys and has no opinion.

Live on Creditcoin CC3 testnet:
[`0x606D9162aD1666B9c5735545A2c81af1f3948cF1`](https://creditcoin-testnet.blockscout.com/address/0x606D9162aD1666B9c5735545A2c81af1f3948cF1)

---

## The problem

An autonomous agent finishes a job and says it was paid. Who checks?

ERC-8004, the Trustless Agents standard, answers this with a Validation Registry. An agent's
work is submitted for validation, a `validatorAddress` responds with a score from 0 to 100,
and that score becomes the agent's on-chain reputation. The standard names three things you
can put in the `validatorAddress` slot: a human reviewer, a staked node, or a TEE.

All three are a party you must trust. A reviewer can be lazy or bought. A staked node is only
as honest as its stake is large. A TEE is a hardware vendor's promise.

So the standard called "Trustless Agents" settles its most consequential question — *did this
actually happen?* — by picking whom to trust.

## The observation

`validatorAddress` is an `address`. The spec constrains it no further. An address can be a
contract, and a contract does not need an opinion.

Creditcoin's Attestcoin Protocol exposes a block-prover precompile at `0x0FD2` that verifies,
natively and without an oracle operator, that a given transaction was included in a finalized
block of an attested chain. So a validator can be a contract that answers 100 only when the
work is provable on Ethereum mainnet, and 0 otherwise. No keys. No stake. No quorum. Nothing
to bribe, because there is nobody to bribe.

That is Warrant.

## The gap Warrant closes

Here is the part that matters, and it is easy to miss. From the Attestcoin documentation:

> The block prover precompile does not validate if a transaction was successful or not.

Inclusion is not success. A transaction that reverted, ran out of gas, or moved nothing at all
is still in the block, and it proves *exactly as well* as one that transferred a million
dollars. A validator that stops at "the proof verified" will happily settle a payment that
never happened.

Warrant decodes the receipt from the proven transaction bytes and checks four invariants
before it will answer 100:

| | Invariant | Why it is not optional |
|---|---|---|
| I-1 | **Inclusion** — `0x0FD2` verifies the Merkle proof and continuity chain | The proof itself. The precompile reverts on a bad proof, and a block beyond the attested frontier fails here too, so finality is covered by this one call. |
| I-2 | **Replay** — one proof, one settlement | Without it, a single real payment settles an unlimited number of jobs. |
| I-3 | **Receipt status** — the transaction must have succeeded | The invariant the precompile explicitly does not check for you. |
| I-4 | **Emitter and argument binding** — the log must come from the expected token, and payer, payee and amount must match the claim | An event signature is not exclusive. Anyone can deploy a contract that emits `Transfer`. The caller's assertion is not evidence. |

Anyone may submit a proof. The contract trusts nothing the caller says.

## Proven on chain

Two real USDC transfers on Ethereum mainnet, in **the same block, 25,971,533**. Same Merkle
root, same continuity proof, same attestation. One moved 45.00 USDC. One reverted and moved
nothing.

`0x0FD2` returns `true` for both, because both are genuinely in that block. Warrant does not.

| Mainnet transaction | Receipt | Settled on CC3 | ERC-8004 response |
|---|---|---|---|
| [`0x45f3697…857b41`](https://etherscan.io/tx/0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41) | success, 45.00 USDC | [`0x6d601ec…1c44d9`](https://creditcoin-testnet.blockscout.com/tx/0x6d601ec874682c3ea89d9ff28ae9dbfb657e2be4f64415741ca471a9ef1c44d9) | **100**, tag `attestcoin:0x0FD2` |
| [`0x415fab3…2d7ea6`](https://etherscan.io/tx/0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6) | **reverted**, moved nothing | [`0xda90af0…c9b809`](https://creditcoin-testnet.blockscout.com/tx/0xda90af0212f2e372fe445c104775973607a870d419efeaadb332501a2bc9b809) | **0**, tag `REVERTED`, `RejectedRevertedTransaction` emitted |

Verify either result yourself, straight from the ERC-8004 registry:

```bash
node tools/warrant.mjs status demo-good        # 100
node tools/warrant.mjs status demo-reverted    # 0
```

## How the Attestcoin Protocol is used

Warrant is not an app that happens to read a cross-chain value. The protocol *is* the trust
model — remove it and there is no validator, only another party to trust.

**On chain.** `AttestcoinValidator.prove()` calls the block-prover precompile directly:

```solidity
try NativeQueryVerifierLib.getVerifier().verify(
    chainKey, c.blockHeight, txb, c.merkleProof, c.continuityProof
) returns (bool ok) {
    if (!ok) return _reject(requestHash, txKey, "INCLUSION");
} catch {
    return _reject(requestHash, txKey, "INCLUSION");
}
```

`chainKey = 3` is Ethereum mainnet. The interface and the `EvmV1Decoder` used for receipt and
log decoding are vendored unmodified from `@gluwa/usc-contracts@0.1.2` — see `src/vendor/`,
which is marked as not our work.

**Off chain.** `tools/warrant.mjs` uses `@gluwa/usc-sdk` to build the Merkle and continuity
proofs from the Creditcoin prover service, and reads the attested frontier from the chain-info
precompile so you can tell whether a block is provable yet:

```bash
node tools/warrant.mjs frontier
```

**Where it sits in ERC-8004.** Warrant occupies the `validatorAddress` slot of an otherwise
ordinary Validation Registry. `ValidationRegistry.sol` knows nothing about Attestcoin; it is
the spec surface, unmodified. That is the point: Warrant is a drop-in for any ERC-8004
deployment, not a fork of one.

## Architecture

```
Ethereum mainnet          Creditcoin CC3                       ERC-8004
──────────────────        ────────────────────────────         ─────────────────────
USDC Transfer      ─┐
                    ├──►  prover service ──► Merkle +
block 25,971,533   ─┘      (off chain)        continuity proof
                                                    │
                                                    ▼
                          0x0FD2 precompile ──► inclusion: true
                          (native, no oracle)       │
                                                    ▼
                          AttestcoinValidator ──► I-1 inclusion
                          ("Warrant")             I-2 replay
                                                  I-3 receipt status  ◄── the gap
                                                  I-4 emitter + args
                                                        │
                                                        ▼
                                          validationResponse(100 | 0) ──► ValidationRegistry
```

## Run it

Nothing below needs gas or a deployment except the last section.

```bash
forge test                 # 4 tests, real proof fixtures
cd tools && npm install && cd ..

node tools/warrant.mjs frontier
node tools/warrant.mjs preflight 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
```

`preflight` builds a real proof and calls `0x0FD2` as a view. On the reverted transaction it
prints the whole thesis in six lines.

To deploy your own and settle proofs, see [RUNBOOK.md](RUNBOOK.md). It documents three CC3
quirks that cost real time: `evm_version` must be pre-merge because CC3 omits `mixHash`;
`eth_estimateGas` runs about 2% short on the precompile path, which is enough to lose a
transaction that `eth_call` says is fine; and `usc-testnet.creditcoin.network` in the older
docs no longer resolves.

## Layout

| Path | |
|---|---|
| `src/AttestcoinValidator.sol` | The validator. Four invariants, no keys, no owner. |
| `src/ValidationRegistry.sol` | ERC-8004 Validation Registry, spec surface unmodified. |
| `src/IdentityRegistry.sol` | Minimal ERC-8004 identity: agentId, owner, agentURI. |
| `src/vendor/` | Vendored verbatim from `@gluwa/usc-contracts`. Not our work. |
| `tools/warrant.mjs` | Proof-submission CLI: `frontier`, `preflight`, `submit`, `status`. |
| `tools/go-live.sh` | Waits for gas, deploys, runs both demo settlements. |
| `test/Warrant.t.sol` | 4 tests against real proof fixtures from the live prover. |

## Deployment

Creditcoin CC3 testnet, chain ID `102031`.

| Contract | Address |
|---|---|
| AttestcoinValidator | [`0x606D9162aD1666B9c5735545A2c81af1f3948cF1`](https://creditcoin-testnet.blockscout.com/address/0x606D9162aD1666B9c5735545A2c81af1f3948cF1) |
| ValidationRegistry | [`0x8b619C6F701598f48Acffd218F18A93CeB698Fbd`](https://creditcoin-testnet.blockscout.com/address/0x8b619C6F701598f48Acffd218F18A93CeB698Fbd) |
| IdentityRegistry | [`0x57e56f81b36d55931662A960b6F7c3B8ec02F0B9`](https://creditcoin-testnet.blockscout.com/address/0x57e56f81b36d55931662A960b6F7c3B8ec02F0B9) |

## Status

Deployed and demonstrated on CC3. `forge test` is 4/4. Both settlements above are real
transactions, verified three ways: the CLI's read-back, an independent `status` call against
the registry, and Blockscout.

All three contracts are verified on Blockscout, so the source above is readable on chain.

Not done: `IdentityRegistry` is reduced to ownership plus URI rather than the spec's ERC-721.
Warrant's claim rests on the Validation Registry surface being spec-faithful, which it is.

Built for BUIDL CTC 2026 Fall.
