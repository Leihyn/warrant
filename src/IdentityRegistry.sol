// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IdentityRegistry
/// @notice Minimal ERC-8004 identity: an agentId owned by an address, resolving to an agentURI.
/// @dev The production shape is ERC-721 + URIStorage per the spec. This is deliberately reduced
///      to ownership + URI, which is all the Validation Registry's authorization check needs.
///      Warrant's claim rests on the Validation Registry surface being spec-faithful, not this.
contract IdentityRegistry {
    uint256 private _next = 1;
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => string) public agentURI;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);

    function register(string calldata uri) external returns (uint256 agentId) {
        agentId = _next++;
        ownerOf[agentId] = msg.sender;
        agentURI[agentId] = uri;
        emit Registered(agentId, uri, msg.sender);
    }
}
