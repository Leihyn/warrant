// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ValidationRegistry} from "../src/ValidationRegistry.sol";
import {AttestcoinValidator} from "../src/AttestcoinValidator.sol";
import {IValidationRegistry} from "../src/IValidationRegistry.sol";

/// @title Deploy
/// @notice Puts the whole ERC-8004 triangle on Creditcoin CC3 testnet in one broadcast:
///         identity -> validation registry -> Warrant as the registry's `validatorAddress`.
///
/// The deployer also registers agentId 1, because ERC-8004 lets only the agent owner open a
/// validation request. Same key deploys and requests, so `tools/warrant.mjs submit` works
/// immediately afterwards with no second signer.
///
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url https://rpc.cc3-testnet.creditcoin.network \
///     --private-key $PRIVATE_KEY --broadcast
contract Deploy is Script {
    /// @dev Attestcoin's key for Ethereum mainnet, as returned by the chain-info precompile.
    uint64  constant ETH_MAINNET_CHAINKEY = 3;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function run() external {
        uint64  chainKey = uint64(vm.envOr("CHAIN_KEY", uint256(ETH_MAINNET_CHAINKEY)));
        address token    = vm.envOr("EXPECTED_TOKEN", USDC);
        string memory agentUri =
            vm.envOr("AGENT_URI", string("https://warrant.invalid/agent-card.json"));

        vm.startBroadcast();

        IdentityRegistry   identity = new IdentityRegistry();
        ValidationRegistry registry = new ValidationRegistry(identity);
        AttestcoinValidator warrant =
            new AttestcoinValidator(IValidationRegistry(address(registry)), chainKey, token);
        uint256 agentId = identity.register(agentUri);

        vm.stopBroadcast();

        // Authoritative rather than assumed: read the owner back out of the registry.
        address deployer = identity.ownerOf(agentId);

        console.log("chainId            ", block.chainid);
        console.log("deployer           ", deployer);
        console.log("IdentityRegistry   ", address(identity));
        console.log("ValidationRegistry ", address(registry));
        console.log("AttestcoinValidator", address(warrant));
        console.log("agentId            ", agentId);
        console.log("chainKey           ", uint256(chainKey));
        console.log("expectedToken      ", token);

        string memory obj = "warrant";
        vm.serializeUint(obj,    "chainId",            block.chainid);
        vm.serializeAddress(obj, "deployer",           deployer);
        vm.serializeAddress(obj, "identityRegistry",   address(identity));
        vm.serializeAddress(obj, "validationRegistry", address(registry));
        vm.serializeAddress(obj, "validator",          address(warrant));
        vm.serializeUint(obj,    "chainKey",           uint256(chainKey));
        vm.serializeAddress(obj, "expectedToken",      token);
        string memory out = vm.serializeUint(obj, "agentId", agentId);

        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));
        console.log("wrote deployments/%s.json", vm.toString(block.chainid));
    }
}
