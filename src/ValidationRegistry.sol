// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IdentityRegistry} from "./IdentityRegistry.sol";

/// @title ValidationRegistry
/// @notice ERC-8004 Validation Registry, spec surface unmodified.
/// @dev The whole point of Warrant is that this contract is ordinary. `validatorAddress` is an
///      address and the spec constrains it no further, so a contract can occupy that slot just as
///      a human reviewer, a staked node or a TEE can. Nothing here knows Attestcoin exists.
contract ValidationRegistry {
    struct Validation {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool requested;
    }

    IdentityRegistry public immutable identity;
    mapping(bytes32 => Validation) private _v;

    event ValidationRequest(
        address indexed validatorAddress, uint256 indexed agentId,
        string requestURI, bytes32 indexed requestHash
    );
    event ValidationResponse(
        address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash,
        uint8 response, string responseURI, bytes32 responseHash, string tag
    );

    error NotAgentOwner();
    error NotNamedValidator();
    error UnknownRequest();
    error AlreadyRequested();
    error ResponseOutOfRange();

    constructor(IdentityRegistry _identity) { identity = _identity; }

    /// @dev Spec: only the agentId owner or an approved operator may request.
    function validationRequest(
        address validatorAddress, uint256 agentId,
        string calldata requestURI, bytes32 requestHash
    ) external {
        if (identity.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (_v[requestHash].requested) revert AlreadyRequested();
        _v[requestHash] = Validation(validatorAddress, agentId, 0, bytes32(0), "", block.timestamp, true);
        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    /// @dev Spec: only the named validatorAddress may respond. Response is 0-100.
    function validationResponse(
        bytes32 requestHash, uint8 response,
        string calldata responseURI, bytes32 responseHash, string calldata tag
    ) external {
        Validation storage v = _v[requestHash];
        if (!v.requested) revert UnknownRequest();
        if (v.validatorAddress != msg.sender) revert NotNamedValidator();
        if (response > 100) revert ResponseOutOfRange();
        v.response = response; v.responseHash = responseHash; v.tag = tag; v.lastUpdate = block.timestamp;
        emit ValidationResponse(msg.sender, v.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash)
        external view
        returns (address validatorAddress, uint256 agentId, uint8 response,
                 bytes32 responseHash, string memory tag, uint256 lastUpdate)
    {
        Validation storage v = _v[requestHash];
        if (!v.requested) revert UnknownRequest();
        return (v.validatorAddress, v.agentId, v.response, v.responseHash, v.tag, v.lastUpdate);
    }
}
