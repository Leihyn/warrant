// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier, NativeQueryVerifierLib} from "./vendor/INativeQueryVerifier.sol";
import {EvmV1Decoder} from "./vendor/EvmV1Decoder.sol";
import {IValidationRegistry} from "./IValidationRegistry.sol";

/// @title AttestcoinValidator ("Warrant")
/// @notice An ERC-8004 validator that holds no keys and has no opinion.
///
/// ERC-8004's Validation Registry accepts any address as `validatorAddress` and names three ways
/// to fill that slot: a reviewer, a staked node, a TEE. All three are a party you must trust.
/// An address can be a contract, and a contract does not need an opinion. This one answers 100
/// only when the work is provable on Ethereum mainnet and every admissibility condition holds.
///
/// Anyone may submit a proof. The contract trusts nothing the caller asserts.
contract AttestcoinValidator {
    /// @dev Transfer(address,address,uint256)
    bytes32 private constant TRANSFER_SIG =
        0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;

    IValidationRegistry public immutable registry;
    uint64  public immutable chainKey;      // 3 = Ethereum mainnet
    address public immutable expectedToken; // the only contract whose Transfer logs count

    /// @notice Replay guard. Keyed on the proven transaction bytes.
    mapping(bytes32 => bool) public consumed;

    struct Claim {
        uint64 blockHeight;
        bytes  txBytes;
        INativeQueryVerifier.MerkleProof     merkleProof;
        INativeQueryVerifier.ContinuityProof continuityProof;
        address payer;
        address payee;
        uint256 minAmount;
    }

    event Validated(bytes32 indexed requestHash, bytes32 indexed txKey, uint256 amount);
    event Rejected(bytes32 indexed requestHash, bytes32 indexed txKey, string reason);
    /// @notice Emitted when a proof is valid but the underlying transaction REVERTED.
    /// @dev This is the case `0x0FD2` cannot see. The docs are explicit: "The block prover
    ///      precompile does not validate if a transaction was successful or not."
    event RejectedRevertedTransaction(bytes32 indexed requestHash, bytes32 indexed txKey);

    constructor(IValidationRegistry _registry, uint64 _chainKey, address _expectedToken) {
        registry = _registry; chainKey = _chainKey; expectedToken = _expectedToken;
    }

    function prove(bytes32 requestHash, Claim calldata c) external {
        bytes memory txb = c.txBytes;
        bytes32 txKey = keccak256(txb);

        // I-1 INCLUSION. The precompile reverts on a bad proof rather than returning false, and a
        // block outside the attested frontier fails here too, so finality is covered by this call.
        try NativeQueryVerifierLib.getVerifier().verify(
            chainKey, c.blockHeight, txb, c.merkleProof, c.continuityProof
        ) returns (bool ok) {
            if (!ok) return _reject(requestHash, txKey, "INCLUSION");
        } catch {
            return _reject(requestHash, txKey, "INCLUSION");
        }

        // I-2 REPLAY. One proof, one settlement.
        if (consumed[txKey]) return _reject(requestHash, txKey, "REPLAY");

        // I-3 RECEIPT STATUS. The invariant the precompile does not check for you.
        // A transaction that ran out of gas or reverted is still in the block and still proves.
        EvmV1Decoder.ReceiptFields memory r = EvmV1Decoder.decodeReceiptFields(txb);
        if (r.receiptStatus != 1) {
            emit RejectedRevertedTransaction(requestHash, txKey);
            return _reject(requestHash, txKey, "REVERTED");
        }

        // I-4 EMITTER + ARGUMENT BINDING. An event signature is not exclusive: anyone can deploy a
        // contract that emits Transfer. Only logs from the expected token count, and the decoded
        // arguments must match the claim rather than the caller's say-so.
        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(r, TRANSFER_SIG);
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].address_ != expectedToken) continue;
            if (logs[i].topics.length < 3) continue;
            if (address(uint160(uint256(logs[i].topics[1]))) != c.payer) continue;
            if (address(uint160(uint256(logs[i].topics[2]))) != c.payee) continue;
            uint256 amount = abi.decode(logs[i].data, (uint256));
            if (amount < c.minAmount) continue;

            consumed[txKey] = true;
            registry.validationResponse(requestHash, 100, "", txKey, "attestcoin:0x0FD2");
            emit Validated(requestHash, txKey, amount);
            return;
        }
        _reject(requestHash, txKey, "NO_MATCHING_TRANSFER");
    }

    function _reject(bytes32 requestHash, bytes32 txKey, string memory reason) private {
        registry.validationResponse(requestHash, 0, "", txKey, reason);
        emit Rejected(requestHash, txKey, reason);
    }
}
