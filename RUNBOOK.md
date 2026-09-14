# Warrant — deploy and prove

Two commands stand between a funded key and a live ERC-8004 validation on Creditcoin.
Everything below has been run end to end except the CC3 broadcast itself, which is waiting
on testnet gas.

## Status: LIVE on Creditcoin CC3

Deployed and demonstrated 2026-09-14. Nothing is blocked.

| | |
|---|---|
| IdentityRegistry | [`0x57e56f81b36d55931662A960b6F7c3B8ec02F0B9`](https://creditcoin-testnet.blockscout.com/address/0x57e56f81b36d55931662A960b6F7c3B8ec02F0B9) |
| ValidationRegistry | [`0x8b619C6F701598f48Acffd218F18A93CeB698Fbd`](https://creditcoin-testnet.blockscout.com/address/0x8b619C6F701598f48Acffd218F18A93CeB698Fbd) |
| **AttestcoinValidator (Warrant)** | [`0x606D9162aD1666B9c5735545A2c81af1f3948cF1`](https://creditcoin-testnet.blockscout.com/address/0x606D9162aD1666B9c5735545A2c81af1f3948cF1) |
| Deployer | `0xD3EFF0247E7b61d75A34e1965939e736fe69C4c2` |
| agentId | 1 |

### The two settlements

| | Mainnet tx | On CC3 | Response |
|---|---|---|---|
| Payment **happened**, 45.00 USDC | `0x45f3697…857b41` | [`0x6d601ec…1c44d9`](https://creditcoin-testnet.blockscout.com/tx/0x6d601ec874682c3ea89d9ff28ae9dbfb657e2be4f64415741ca471a9ef1c44d9) | **100**, tag `attestcoin:0x0FD2` |
| Payment **reverted**, 13.00 USDC | `0x415fab3…2d7ea6` | [`0xda90af0…c9b809`](https://creditcoin-testnet.blockscout.com/tx/0xda90af0212f2e372fe445c104775973607a870d419efeaadb332501a2bc9b809) | **0**, tag `REVERTED`, `RejectedRevertedTransaction` emitted |

Both mainnet transactions are in **the same block, 25,971,533** — same Merkle root, same
continuity proof, same attestation. `0x0FD2` returned `true` for both. Warrant did not.

Read either result back at any time:

```bash
node tools/warrant.mjs status demo-good        # 100
node tools/warrant.mjs status demo-reverted    # 0
```

---

## Chain facts, verified against the live network

| | |
|---|---|
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Chain ID | **`102031`** (`0x18e8f`) |
| Prover | `https://prover.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Block prover precompile | `0x0000000000000000000000000000000000000FD2` (native — `eth_getCode` is empty by design) |
| `chainKey` for Ethereum mainnet | `3` |
| Block time | ~15s, gas 0.5–1 gwei |

`usc-testnet.creditcoin.network` appears in some search results and older docs. It does not
resolve. `cc3-testnet` is the live network and the one with the precompile.

## Three chain quirks that cost real time

**1. `evm_version` must be pre-merge.** CC3 omits `mixHash` from block headers (also
`withdrawalsRoot` and all blob fields — it is a Frontier/Substrate EVM). With
`evm_version = "cancun"`, forge fails before broadcasting:

```
EVM error; header validation error: `prevrandao` not set
```

`foundry.toml` is set to `london`, which uses `difficulty` (present, `0x0`) instead.

**2. `eth_estimateGas` runs marginally short.** On the `prove()` path it returned **216,903**
against an actual **220,732** — about 2% under, and ethers applies no buffer, so the first
attempt ran out of gas *even though `eth_call` on the identical payload succeeded*. The CLI
now sends an explicit 5,000,000 gas limit (block limit is 75M). Override with `--gas`.

If you ever see a `prove` transaction revert while `--dry` passes, this is why.

**3. The faucet gives 10,000 tCTC**, not a drip. Deployment costs ~0.0026 CTC.

---

## Getting more tCTC

Discord: <https://discord.gg/creditcoin> -> `#token-faucet` -> `/faucet address:0x...`
Or <https://thirdweb.com/creditcoin-testnet> -> Faucet -> Get 0.01 tCTC (needs a connected wallet).

Deploy from whatever key you hold — the address only needs gas, nothing is bound to it.
`./tools/go-live.sh` prints the faucet command for your own key's address, waits for funds,
then deploys and runs both demos.

---

## Run it before the faucet lands

`preflight` needs no gas, no key, and no deployment. It builds a real proof from the
Creditcoin prover and calls the precompile as a view. If this works, the hard half works.

```bash
cd tools && npm install && cd ..

# how far Attestcoin has attested Ethereum mainnet
node tools/warrant.mjs frontier

# a real 45.00 USDC payment that succeeded
node tools/warrant.mjs preflight 0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41

# a real 13.00 USDC payment in the SAME BLOCK that reverted
node tools/warrant.mjs preflight 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
```

The second one is the demo. The precompile returns `true` for a transaction that moved no
money, because it cannot see receipt status — the Attestcoin docs say so outright. That gap
is what Warrant closes.

`preflight` reads payer, payee and amount off mainnet itself: from the `Transfer` log when
the transaction succeeded, and from the calldata when it reverted and emitted nothing.

---

## Step 1 — deploy to CC3

The moment the faucet lands:

```bash
export PRIVATE_KEY=0x...        # the key behind 0x890da1c1…f9d8

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

One broadcast deploys `IdentityRegistry`, `ValidationRegistry` and `AttestcoinValidator`,
then registers `agentId 1` to the deployer. Same key deploys and requests, so step 2 needs
no second signer.

Addresses are written to `deployments/102031.json`. The CLI reads that file automatically,
keyed on the chain ID it is connected to, so a stray local deployment can never be mistaken
for the CC3 one.

**Verify before moving on:**

```bash
cast call $(jq -r .validator deployments/102031.json) "chainKey()(uint64)" \
  --rpc-url https://rpc.cc3-testnet.creditcoin.network      # expect 3
```

### Optional: contract verification

Blockscout, not Etherscan:

```bash
forge verify-contract <address> src/AttestcoinValidator.sol:AttestcoinValidator \
  --verifier blockscout \
  --verifier-url https://creditcoin-testnet.blockscout.com/api \
  --chain-id 102031
```

Skip this if time is short. A verified contract is nice; a working demo is the submission.

---

## Step 2 — settle a proof on chain

```bash
export PRIVATE_KEY=0x...

# the payment that happened   -> response 100
node tools/warrant.mjs submit 0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41 \
  --label demo-good

# the payment that did not    -> response 0 + RejectedRevertedTransaction
node tools/warrant.mjs submit 0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6 \
  --label demo-reverted
```

Each run opens a `validationRequest`, submits the proof to `prove()`, and reads the answer
back out of the ERC-8004 registry rather than out of Warrant's own event. Nonces are managed
explicitly because the two sends are back to back.

Read a result again at any time:

```bash
node tools/warrant.mjs status demo-reverted
```

Flags, all optional: `--payer`, `--payee`, `--min` (base units), `--label`, `--dry`.
Omit payer/payee/min and they are derived from mainnet. `--dry` simulates `prove()` without
broadcasting, but only once a request is open.

---

## What the demo should show

Both transactions sit in **the same Ethereum mainnet block, 25,971,533**. Same Merkle root,
same continuity proof, same attestation. One moved 45.00 USDC. One moved nothing.

`0x0FD2` says `true` to both. Warrant says 100 to one and 0 to the other, and emits
`RejectedRevertedTransaction` for the second. Point the explorer at that event.

---

## If something breaks

**`the prover could not build a proof`**
The block is ahead of the attested frontier. Run `node tools/warrant.mjs frontier` and
compare. Lag is normally under a hundred blocks; the demo transactions are far behind it and
will not drift.

**`NotAgentOwner`**
`validationRequest` was sent by a key that does not own `agentId 1`. Use the deploying key,
or point `--label` at a request that key already opened.

**`insufficient funds`**
The faucet has not landed. See the top of this file.

**`nonce has already been used`**
A previous run is still in flight. Wait one block (~15s) and retry; nonces are read fresh
each time.

**`no deployment for chainId 102031`**
Step 1 has not run, or it ran against a different RPC. Check `deployments/`.

---

## What has actually been run

Verified 2026-09-14, on Creditcoin CC3 (chain 102031) unless noted:

- `forge test` — 4/4 passing under `evm_version = london`.
- `forge script Deploy --broadcast` — **live on CC3**. All three contracts have bytecode on
  chain; `agentId 1` registered to the deployer; `deployments/102031.json` written.
- `warrant.mjs frontier` / `preflight` — live, both demo transactions, real prover proofs,
  `0x0FD2` returned `true` for both.
- `warrant.mjs submit` — **live on CC3, both settlements**, transaction hashes above. Verified
  three ways: the CLI's own read-back, an independent `status` call, and Blockscout.
- `warrant.mjs status` — both results read back from the ERC-8004 registry.
- `go-live.sh` — guard path, balance poll, deploy, and both submissions.

Earlier local rehearsal: full round trip against Anvil with `0x0FD2` stubbed, which is what
caught the ABI encoding of the nested `Claim` tuple before it mattered.

**Known gap:** contracts are not verified on Blockscout. Command is in the section above;
it is cosmetic, not blocking.
