#!/usr/bin/env bash
# Waits for tCTC to land, then deploys and runs the full demo. One command, then walk away.
#
#   export PRIVATE_KEY=0x...
#   ./tools/go-live.sh
#
# Safe to re-run: if a deployment for the connected chain already exists it skips to the demo.
set -euo pipefail

RPC="${CC3_RPC:-https://rpc.cc3-testnet.creditcoin.network}"
EXPLORER="${CC3_EXPLORER:-https://creditcoin-testnet.blockscout.com}"
GOOD=0x45f369754959b6b57e35009e0552b5952d8cab022828c709e54d4a755d857b41
BAD=0x415fab30ccd6853ffaba2f660f7ff7c0ed71c8b0d31d5cddd51e0e342f2d7ea6
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${PRIVATE_KEY:?PRIVATE_KEY is not set. export PRIVATE_KEY=0x... first.}"

ADDR="$(cast wallet address --private-key "$PRIVATE_KEY")"
echo "  deployer   $ADDR"
echo "  rpc        $RPC"
echo "  faucet     /faucet address:$ADDR    (Creditcoin Discord, #token-faucet)"
echo "             or https://thirdweb.com/creditcoin-testnet  ->  Faucet  ->  Get 0.01 tCTC"
echo

# ── wait for gas ─────────────────────────────────────────────────────────────
while true; do
  BAL="$(cast balance "$ADDR" --rpc-url "$RPC" 2>/dev/null || echo 0)"
  if [ "$BAL" != "0" ]; then
    echo "  funded: $(cast from-wei "$BAL") CTC"
    break
  fi
  printf "\r  waiting for tCTC…  %s" "$(date +%H:%M:%S)"
  sleep 10
done
echo

# ── deploy ───────────────────────────────────────────────────────────────────
# Chain id is read from the RPC, never hardcoded.
CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"
DEP="deployments/${CHAIN_ID}.json"
echo "  chainId    $CHAIN_ID"

if [ -f "$DEP" ]; then
  echo "  $DEP already exists, skipping deploy"
else
  forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --broadcast
  test -f "$DEP" || { echo "  deploy did not write $DEP"; exit 1; }
fi
echo
echo "  validator  $EXPLORER/address/$(jq -r .validator "$DEP")"
echo

# ── the demo ─────────────────────────────────────────────────────────────────
echo "=============== 1/2  a payment that HAPPENED  -> expect 100 ==============="
node tools/warrant.mjs submit "$GOOD" --label demo-good
echo
echo "=============== 2/2  a payment that REVERTED  -> expect 0   ==============="
node tools/warrant.mjs submit "$BAD" --label demo-reverted
echo
echo "  Both transactions are in the same Ethereum mainnet block, 25,971,533."
echo "  0x0FD2 said true to both. Warrant did not."
