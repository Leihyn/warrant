// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The subset of the ERC-8004 Validation Registry surface Warrant depends on.
/// @dev Signatures copied from ERC-8004 (Trustless Agents, Draft). Warrant forks nothing;
///      it is simply an address that this registry will accept as `validatorAddress`.
interface IValidationRegistry {
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;
}
