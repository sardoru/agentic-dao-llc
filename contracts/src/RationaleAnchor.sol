// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RationaleAnchor
/// @notice Tiny anchor that joins an on-chain action (proposalId or actionId) to
///         the off-chain reasoning doc stored on IPFS, by emitting the URI and
///         its content hash. The indexer joins on `refId`; the dashboard fetches
///         the doc and verifies `contentHash`.
/// @dev    Permissionless by design: anchoring is purely additive evidence. The
///         runtime enforces "no rationale → no submission"; this contract just
///         records what was anchored. Anyone can over-anchor, but the bound
///         action's own access control is what gates state changes elsewhere.
contract RationaleAnchor {
    event RationaleAnchored(bytes32 indexed refId, string ipfsURI, bytes32 contentHash);

    /// @notice Anchor a rationale document for a referenced action.
    /// @param refId       proposalId or a runtime-defined action id
    /// @param ipfsURI     ipfs://... location of the rationale doc
    /// @param contentHash keccak256 of the canonical rationale bytes
    function anchor(bytes32 refId, string calldata ipfsURI, bytes32 contentHash) external {
        emit RationaleAnchored(refId, ipfsURI, contentHash);
    }
}
