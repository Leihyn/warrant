#!/usr/bin/env node
// Warrant — proof-submission CLI.
//
// Takes an Ethereum mainnet transaction hash, asks the Creditcoin prover for its inclusion
// proof, and drives the ERC-8004 round trip on CC3: validationRequest -> prove -> read response.
//
//   node tools/warrant.mjs frontier
//   node tools/warrant.mjs preflight <txHash>                 # free, no gas, no deployment
//   node tools/warrant.mjs submit    <txHash> [flags]
//   node tools/warrant.mjs status    <label|0xrequestHash>
//
// ABIs are read from the Foundry artifacts in ../out, so they cannot drift from the contracts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import sdk from "@gluwa/usc-sdk";

const { proofProvider, blockProver, chainInfo } = sdk;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const CC3_RPC    = process.env.CC3_RPC    || "https://rpc.cc3-testnet.creditcoin.network";
const CC3_PROVER = process.env.CC3_PROVER || "https://prover.cc3-testnet.creditcoin.network";
const ETH_RPC    = process.env.ETH_RPC    || "https://ethereum-rpc.publicnode.com";
const EXPLORER   = process.env.CC3_EXPLORER || "https://creditcoin-testnet.blockscout.com";
const CHAIN_KEY  = Number(process.env.CHAIN_KEY || 3);   // 3 = Ethereum mainnet
const TRANSFER_SELECTOR = "0xa9059cbb";                   // transfer(address,uint256)

const die = (m) => { console.error("\n  ERROR  " + m + "\n"); process.exit(1); };
const abiOf = (name) => {
  const p = path.join(ROOT, "out", `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(p)) die(`missing artifact ${p}\n         run: forge build`);
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
};

/// Pinned to the chain the provider is actually connected to, so a stray local-anvil
/// deployment can never be mistaken for the CC3 one.
async function loadDeployment(provider) {
  const explicit = process.env.DEPLOYMENT && path.resolve(HERE, process.env.DEPLOYMENT);
  if (explicit) {
    if (!fs.existsSync(explicit)) die(`DEPLOYMENT points at ${explicit}, which does not exist`);
    return JSON.parse(fs.readFileSync(explicit, "utf8"));
  }
  const chainId = Number((await provider.getNetwork()).chainId);
  const file = path.join(ROOT, "deployments", `${chainId}.json`);
  if (!fs.existsSync(file)) {
    die(`no deployment for chainId ${chainId} (looked for ${file}).\n` +
        "         Deploy first:  forge script script/Deploy.s.sol:Deploy \\\n" +
        "                          --rpc-url " + CC3_RPC + " \\\n" +
        "                          --private-key $PRIVATE_KEY --broadcast");
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// The SDK has returned proof sub-structs as both named objects and positional arrays across
// versions. Normalise to the shape the Solidity Claim expects rather than assuming one.
const normSibling = (s) => Array.isArray(s) ? { hash: s[0], isLeft: s[1] } : { hash: s.hash, isLeft: s.isLeft };
const normMerkle = (m) => Array.isArray(m)
  ? { root: m[0], siblings: (m[1] || []).map(normSibling) }
  : { root: m.root, siblings: (m.siblings || []).map(normSibling) };
const normContinuity = (c) => Array.isArray(c)
  ? { lowerEndpointDigest: c[0], roots: c[1] || [] }
  : { lowerEndpointDigest: c.lowerEndpointDigest, roots: c.roots || [] };

async function buildProof(txHash) {
  const builder = new proofProvider.service.ProofBuilder(CHAIN_KEY, CC3_PROVER, 60_000);
  const r = await builder.getProof(txHash);
  if (!r || r.success === false || !r.data) {
    die(`the prover could not build a proof for ${txHash}.\n` +
        `         Usually this means the block is not inside the attested frontier yet.\n` +
        `         Check with:  node tools/warrant.mjs frontier`);
  }
  const d = r.data;
  return {
    blockHeight: Number(d.headerNumber),
    txBytes: d.txBytes,
    merkleProof: normMerkle(d.merkleProof),
    continuityProof: normContinuity(d.continuityProof),
  };
}

/// Derive payer / payee / amount from mainnet itself, so the operator does not hand-type them.
/// A successful transfer is read from its Transfer log. A REVERTED transfer has no logs at all,
/// so it is read from the calldata — which is precisely the case Warrant exists to reject.
async function describeMainnetTx(txHash) {
  const eth = new ethers.JsonRpcProvider(ETH_RPC);
  const [tx, rc] = await Promise.all([eth.getTransaction(txHash), eth.getTransactionReceipt(txHash)]);
  if (!tx || !rc) die(`${txHash} not found on ${ETH_RPC}`);

  const out = { status: rc.status, block: rc.blockNumber, token: tx.to, logs: rc.logs.length };
  const TRANSFER_SIG = ethers.id("Transfer(address,address,uint256)");
  const log = rc.logs.find((l) => l.topics[0] === TRANSFER_SIG && l.topics.length >= 3);

  if (log) {
    out.payer  = ethers.getAddress("0x" + log.topics[1].slice(26));
    out.payee  = ethers.getAddress("0x" + log.topics[2].slice(26));
    out.amount = BigInt(log.data);
    out.source = "Transfer log";
  } else if (tx.data.startsWith(TRANSFER_SELECTOR)) {
    const [to, value] = ethers.AbiCoder.defaultAbiCoder()
      .decode(["address", "uint256"], "0x" + tx.data.slice(10));
    out.payer  = ethers.getAddress(tx.from);
    out.payee  = ethers.getAddress(to);
    out.amount = value;
    out.source = "calldata (no logs — this transaction emitted nothing)";
  } else {
    out.source = "unknown";
  }
  return out;
}

const usdc = (v) => (Number(v) / 1e6).toFixed(2) + " USDC";
const flag = (argv, name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? dflt : argv[i + 1];
};

// ── commands ──────────────────────────────────────────────────────────────────

async function cmdFrontier() {
  const p = new ethers.JsonRpcProvider(CC3_RPC);
  const ci = new chainInfo.PrecompileChainInfoProvider(p);
  const f = await ci.getLatestAttestedHeightAndHash(CHAIN_KEY);
  // v0.18 returns {height,hash,...}; older builds returned a positional tuple.
  const h = Number(Array.isArray(f) ? f[0] : f.height);
  const hash = Array.isArray(f) ? f[1] : f.hash;
  const eth = new ethers.JsonRpcProvider(ETH_RPC);
  const head = await eth.getBlockNumber();
  console.log(`\n  chainKey ${CHAIN_KEY} (Ethereum mainnet)`);
  console.log(`  attested frontier  ${h}  ${hash}`);
  console.log(`  mainnet head       ${head}`);
  console.log(`  lag                ${head - h} blocks`);
  console.log(`\n  A transaction is provable only at or below the frontier.\n`);
}

/// Free. No gas, no deployment, no key. Proves the proof pipeline end to end.
async function cmdPreflight(txHash) {
  if (!txHash) die("usage: node tools/warrant.mjs preflight <mainnetTxHash>");
  const info = await describeMainnetTx(txHash);
  console.log(`\n  === Ethereum mainnet ===`);
  console.log(`  tx              ${txHash}`);
  console.log(`  block           ${info.block}`);
  console.log(`  token           ${info.token}`);
  console.log(`  receipt status  ${info.status}  ${info.status === 1 ? "(succeeded)" : "<-- REVERTED. This payment did not happen."}`);
  console.log(`  logs emitted    ${info.logs}`);
  if (info.payer) console.log(`  transfer        ${info.payer} -> ${info.payee}  ${usdc(info.amount)}   [${info.source}]`);

  const proof = await buildProof(txHash);
  console.log(`\n  === Creditcoin prover ===`);
  console.log(`  blockHeight     ${proof.blockHeight}`);
  console.log(`  txBytes         ${ethers.dataLength(proof.txBytes)} bytes`);
  console.log(`  merkle siblings ${proof.merkleProof.siblings.length}`);
  console.log(`  continuity roots ${proof.continuityProof.roots.length}`);

  const p = new ethers.JsonRpcProvider(CC3_RPC);
  const bp = new blockProver.PrecompileBlockProver(p);
  const ok = await bp.verifySingle(
    CHAIN_KEY, proof.blockHeight, proof.txBytes, proof.merkleProof, proof.continuityProof);
  console.log(`\n  === precompile 0x0FD2 ===`);
  console.log(`  verifySingle    ${ok}`);
  if (ok && info.status === 0) {
    console.log(`\n  The precompile says this transaction is in the block. It is right.`);
    console.log(`  It does not say the transaction succeeded, because it cannot see that.`);
    console.log(`  That gap is the entire reason Warrant exists.\n`);
  } else {
    console.log("");
  }
}

async function cmdSubmit(argv) {
  const txHash = argv[0];
  if (!txHash || txHash.startsWith("--")) {
    die("usage: node tools/warrant.mjs submit <mainnetTxHash> [--payer 0x..] [--payee 0x..] [--min 45000000] [--label job-1] [--dry]");
  }
  const dry = argv.includes("--dry");
  const key = process.env.PRIVATE_KEY;
  if (!key && !dry) die("PRIVATE_KEY is not set. Export it, or pass --dry to simulate.");

  const provider = new ethers.JsonRpcProvider(CC3_RPC);
  const dep = await loadDeployment(provider);
  const info = await describeMainnetTx(txHash);

  const payer = ethers.getAddress(flag(argv, "payer", info.payer) || ethers.ZeroAddress);
  const payee = ethers.getAddress(flag(argv, "payee", info.payee) || ethers.ZeroAddress);
  const minAmount = BigInt(flag(argv, "min", info.amount ?? 0n));
  const label = flag(argv, "label", `warrant:${txHash}`);
  const requestHash = ethers.id(label);

  console.log(`\n  validator       ${dep.validator}   (chainId ${dep.chainId})`);
  console.log(`  registry        ${dep.validationRegistry}`);
  console.log(`  agentId         ${dep.agentId}`);
  console.log(`  label           ${label}`);
  console.log(`  requestHash     ${requestHash}`);
  console.log(`\n  claim           ${payer} -> ${payee}  >= ${usdc(minAmount)}`);
  console.log(`  mainnet status  ${info.status}${info.status === 0 ? "  <-- REVERTED" : ""}   [${info.source}]`);

  const proof = await buildProof(txHash);
  console.log(`  proof           block ${proof.blockHeight}, ${ethers.dataLength(proof.txBytes)} bytes tx`);

  const claim = { ...proof, payer, payee, minAmount };

  provider.pollingInterval = 1000;
  const runner = dry ? provider : new ethers.Wallet(key, provider);
  const registry  = new ethers.Contract(dep.validationRegistry, abiOf("ValidationRegistry"), runner);
  const validator = new ethers.Contract(dep.validator, abiOf("AttestcoinValidator"), runner);

  // Is a request already open under this label? ERC-8004 requires one before a response.
  let already = false;
  try {
    await registry.getValidationStatus(requestHash);
    already = true;
  } catch { /* UnknownRequest — expected on a fresh label */ }

  if (dry) {
    if (!already) {
      console.log(`\n  --dry: no validation request is open under label "${label}".`);
      console.log(`         prove() cannot be simulated until one exists, because ERC-8004`);
      console.log(`         rejects a response to an unknown request.`);
      console.log(`         The proof half is already verified above — run \`preflight\` for that,`);
      console.log(`         or drop --dry to open the request and settle it for real.\n`);
      return;
    }
    await validator.prove.staticCall(requestHash, claim, { from: dep.deployer });
    console.log(`\n  --dry: prove() simulated against the open request without reverting.`);
    console.log(`         Nothing was broadcast.\n`);
    return;
  }

  // Nonces are managed explicitly: back-to-back sends otherwise race the provider's
  // cached transaction count and the second one is rejected as a reused nonce.
  let nonce = await provider.getTransactionCount(runner.address, "latest");

  if (already) {
    console.log(`\n  request already open, skipping validationRequest`);
  } else {
    const t1 = await registry.validationRequest(
      dep.validator, dep.agentId, `warrant://job/${txHash}`, requestHash, { nonce: nonce++ });
    console.log(`\n  validationRequest  ${t1.hash}`);
    await t1.wait();
  }

  // 2. Submit the proof. Anyone may call this; the contract trusts nothing the caller asserts.
  //
  // Gas is set explicitly. CC3's eth_estimateGas comes back marginally short for the 0x0FD2
  // path and ethers applies no buffer: the estimate was 216,903 against an actual 220,732, so
  // the transaction ran out of gas even though eth_call on the identical payload succeeded.
  // A ~2% shortfall is enough to lose the transaction. Block limit is 75M; overshooting is free.
  const gasLimit = BigInt(flag(argv, "gas", "5000000"));
  const t2 = await validator.prove(requestHash, claim, { nonce: nonce++, gasLimit });
  console.log(`  prove              ${t2.hash}`);
  const rc = await t2.wait();

  // 3. Read the answer back out of the registry — the ERC-8004 surface, not our event.
  const [, agentId, response, responseHash, tag] = await registry.getValidationStatus(requestHash);

  console.log(`\n  === ERC-8004 validationResponse ===`);
  console.log(`  agentId         ${agentId}`);
  console.log(`  response        ${response}   ${response === 100n ? "<-- validated" : "<-- NOT validated"}`);
  console.log(`  responseHash    ${responseHash}`);
  console.log(`  tag             ${tag}`);

  for (const log of rc.logs) {
    try {
      const ev = validator.interface.parseLog(log);
      if (ev) console.log(`  event           ${ev.name}(${ev.args.map(String).join(", ")})`);
    } catch { /* not ours */ }
  }
  if (Number(dep.chainId) !== 31337) console.log(`\n  explorer        ${EXPLORER}/tx/${t2.hash}`);
  console.log("");
}

async function cmdStatus(arg) {
  if (!arg) die("usage: node tools/warrant.mjs status <label|0xrequestHash>");
  const requestHash = arg.startsWith("0x") && arg.length === 66 ? arg : ethers.id(arg);
  const provider = new ethers.JsonRpcProvider(CC3_RPC);
  const dep = await loadDeployment(provider);
  const registry = new ethers.Contract(dep.validationRegistry, abiOf("ValidationRegistry"), provider);
  const [validatorAddress, agentId, response, responseHash, tag, lastUpdate] =
    await registry.getValidationStatus(requestHash);
  console.log(`\n  requestHash     ${requestHash}`);
  console.log(`  validator       ${validatorAddress}`);
  console.log(`  agentId         ${agentId}`);
  console.log(`  response        ${response}`);
  console.log(`  responseHash    ${responseHash}`);
  console.log(`  tag             ${tag}`);
  console.log(`  lastUpdate      ${new Date(Number(lastUpdate) * 1000).toISOString()}\n`);
}

const [cmd, ...rest] = process.argv.slice(2);
const run = {
  frontier:  () => cmdFrontier(),
  preflight: () => cmdPreflight(rest[0]),
  submit:    () => cmdSubmit(rest),
  status:    () => cmdStatus(rest[0]),
}[cmd];

if (!run) {
  console.log(`
  warrant — proof-submission CLI

    node tools/warrant.mjs frontier               how far Attestcoin has attested mainnet
    node tools/warrant.mjs preflight <txHash>     build a proof and hit 0x0FD2 (free, no gas)
    node tools/warrant.mjs submit <txHash>        full ERC-8004 round trip on CC3
    node tools/warrant.mjs status <label>         read a validation response back

  submit flags:  --payer 0x..  --payee 0x..  --min <base units>  --label <string>
                 --gas <limit, default 5000000>  --dry
                 (payer/payee/min are read off mainnet when omitted)
`);
  process.exit(1);
}
run().catch((e) => die(e.shortMessage || e.message || String(e)));
