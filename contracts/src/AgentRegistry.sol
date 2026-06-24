// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AgentRegistry
/// @notice On-chain anchor binding: member (principal) → agent account →
///         mandate hash + URI. The off-chain mandate document's keccak256 must
///         equal `mandateHash`; CI and the dashboard verify the match.
/// @dev    A member registers their OWN agent (`msg.sender == principal`).
///         Deactivation is allowed by the principal OR the guardian
///         (`REGISTRY_ADMIN`). Updating a mandate is a Reserved Matter, so it is
///         `REGISTRY_ADMIN`-only — the Governor holds no such role.
contract AgentRegistry is AccessControl {
    /// @notice Reserved Matter role: update an agent's bound mandate. Held by the
    ///         guardian multisig; never by the Governor.
    bytes32 public constant REGISTRY_ADMIN = keccak256("REGISTRY_ADMIN");

    struct AgentRecord {
        address principal; // human member who delegated
        bytes32 mandateHash; // keccak256 of canonical mandate JSON (doc on IPFS)
        string mandateURI; // ipfs://...
        bool active;
    }

    mapping(address agentAccount => AgentRecord) public agents;

    event AgentRegistered(
        address indexed agentAccount, address indexed principal, bytes32 mandateHash, string mandateURI
    );
    event AgentMandateUpdated(address indexed agentAccount, bytes32 oldHash, bytes32 newHash, string mandateURI);
    event AgentDeactivated(address indexed agentAccount);

    error NotPrincipal();
    error NotPrincipalOrAdmin();
    error AlreadyRegistered();
    error UnknownAgent();
    error ZeroAgentAccount();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN, admin);
    }

    /// @notice A member registers their own agent account with a mandate.
    /// @dev `msg.sender` is recorded as the principal. Re-registering an existing
    ///      agent account is rejected; use `updateMandate` (guardian) instead.
    function registerAgent(address agentAccount, bytes32 mandateHash, string calldata mandateURI) external {
        if (agentAccount == address(0)) revert ZeroAgentAccount();
        if (agents[agentAccount].principal != address(0)) revert AlreadyRegistered();

        agents[agentAccount] =
            AgentRecord({principal: msg.sender, mandateHash: mandateHash, mandateURI: mandateURI, active: true});

        emit AgentRegistered(agentAccount, msg.sender, mandateHash, mandateURI);
    }

    /// @notice Deactivate an agent. Allowed by the principal OR the guardian.
    function deactivateAgent(address agentAccount) external {
        AgentRecord storage rec = agents[agentAccount];
        if (rec.principal == address(0)) revert UnknownAgent();
        if (msg.sender != rec.principal && !hasRole(REGISTRY_ADMIN, msg.sender)) {
            revert NotPrincipalOrAdmin();
        }
        rec.active = false;
        emit AgentDeactivated(agentAccount);
    }

    /// @notice Update an agent's mandate. RESERVED MATTER — guardian only.
    /// @dev Reverts via AccessControl if caller lacks REGISTRY_ADMIN. This is the
    ///      property proven by `test_GovernorLacksRoleToUpdateMandate`.
    function updateMandate(address agentAccount, bytes32 newHash, string calldata mandateURI)
        external
        onlyRole(REGISTRY_ADMIN)
    {
        AgentRecord storage rec = agents[agentAccount];
        if (rec.principal == address(0)) revert UnknownAgent();
        bytes32 oldHash = rec.mandateHash;
        rec.mandateHash = newHash;
        rec.mandateURI = mandateURI;
        emit AgentMandateUpdated(agentAccount, oldHash, newHash, mandateURI);
    }

    /// @notice Full record for an agent account.
    function mandateOf(address agentAccount) external view returns (AgentRecord memory) {
        return agents[agentAccount];
    }
}
