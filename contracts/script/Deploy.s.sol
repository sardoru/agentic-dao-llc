// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {MembershipToken} from "../src/MembershipToken.sol";
import {DaoGovernor} from "../src/DaoGovernor.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RolesModifier} from "../src/RolesModifier.sol";
import {RationaleAnchor} from "../src/RationaleAnchor.sol";
import {Treasury} from "../src/Treasury.sol";
import {GuardedTimelock} from "../src/GuardedTimelock.sol";

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @notice Deployment result bundle, returned so tests can reuse the exact same
///         wiring the production script performs (single source of truth for
///         "who holds which role").
struct Deployment {
    MembershipToken token;
    GuardedTimelock timelock;
    DaoGovernor governor;
    AgentRegistry registry;
    RolesModifier roles;
    RationaleAnchor anchor;
    Treasury treasury;
}

/// @title DAODeployer
/// @notice Pure library that performs the full constitutional wiring. Reused by
///         both `Deploy.s.sol` (the broadcastable script) and the Foundry tests,
///         so the property "Governor holds no constitutional role" is asserted
///         against the SAME code path that ships.
library DAODeployer {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    struct Params {
        address deployer; // bootstrap admin; renounced at the end
        address guardian; // multisig holding ALL constitutional admin roles
        uint256 minDelay; // timelock minDelay (guardian veto window)
        uint48 votingDelay;
        uint32 votingPeriod;
        uint256 proposalThreshold;
        uint256 quorumNumerator; // % of supply (GovernorVotesQuorumFraction)
    }

    /// @dev Deploys all contracts and wires roles per spec §14/§19:
    ///        - Timelock PROPOSER + EXECUTOR  = Governor
    ///        - Timelock CANCELLER            = guardian
    ///        - Timelock DEFAULT_ADMIN (delay authority) = guardian only
    ///        - DEFAULT_ADMIN + every *_ADMIN on token/registry/roles = guardian
    ///        - Governor holds NONE of the above constitutional roles
    ///        - deployer's bootstrap admin roles are renounced at the end
    function deploy(Params memory p) internal returns (Deployment memory d) {
        // 1. Constitutional contracts. Each is constructed with the DEPLOYER as
        //    bootstrap admin so the deployer can finish wiring, then renounces.
        d.token = new MembershipToken("DAO Membership", "DAOM", p.deployer);
        d.registry = new AgentRegistry(p.deployer);
        d.roles = new RolesModifier(p.deployer);
        d.anchor = new RationaleAnchor();

        // 2. Timelock. `admin = deployer` temporarily so we can grant roles, then
        //    hand the admin (delay authority) to the guardian and renounce.
        //    GuardedTimelock re-gates updateDelay to TIMELOCK_ADMIN (guardian),
        //    closing the Governor-self-execution path (spec §6.3 / §14).
        address[] memory empty = new address[](0);
        d.timelock = new GuardedTimelock(p.minDelay, empty, empty, p.deployer);

        // 3. Governor wired to the token (vote source) + timelock (execution).
        d.governor =
            new DaoGovernor(IVotes(address(d.token)), d.timelock, p.votingDelay, p.votingPeriod, p.proposalThreshold, p.quorumNumerator);

        // 4. Treasury owned by the Timelock (funds move only via executed proposals).
        d.treasury = new Treasury(address(d.timelock));

        // 5. Timelock roles: Governor = PROPOSER + EXECUTOR; guardian = CANCELLER.
        d.timelock.grantRole(d.timelock.PROPOSER_ROLE(), address(d.governor));
        d.timelock.grantRole(d.timelock.EXECUTOR_ROLE(), address(d.governor));
        d.timelock.grantRole(d.timelock.CANCELLER_ROLE(), p.guardian);
        // Guardian becomes the Timelock admin (role management) AND holds
        // TIMELOCK_ADMIN, which is the ONLY authority that can change minDelay
        // (the reserved matter). The Governor never gets either.
        d.timelock.grantRole(DEFAULT_ADMIN_ROLE, p.guardian);
        d.timelock.grantRole(d.timelock.TIMELOCK_ADMIN(), p.guardian);
        // Revoke the timelock's self-administration so no executed proposal can
        // self-grant a role and escalate around constitutional separation.
        d.timelock.revokeRole(DEFAULT_ADMIN_ROLE, address(d.timelock));

        // 6. Constitutional admin roles on token/registry/roles → guardian.
        d.token.grantRole(DEFAULT_ADMIN_ROLE, p.guardian);
        d.token.grantRole(d.token.MEMBERSHIP_ADMIN(), p.guardian);

        d.registry.grantRole(DEFAULT_ADMIN_ROLE, p.guardian);
        d.registry.grantRole(d.registry.REGISTRY_ADMIN(), p.guardian);

        d.roles.grantRole(DEFAULT_ADMIN_ROLE, p.guardian);
        d.roles.grantRole(d.roles.ROLES_ADMIN(), p.guardian);

        // 7. Renounce the deployer's bootstrap authority everywhere. After this,
        //    ONLY the guardian holds constitutional admin power; the Governor
        //    holds none.
        d.token.renounceRole(d.token.MEMBERSHIP_ADMIN(), p.deployer);
        d.token.renounceRole(DEFAULT_ADMIN_ROLE, p.deployer);

        d.registry.renounceRole(d.registry.REGISTRY_ADMIN(), p.deployer);
        d.registry.renounceRole(DEFAULT_ADMIN_ROLE, p.deployer);

        d.roles.renounceRole(d.roles.ROLES_ADMIN(), p.deployer);
        d.roles.renounceRole(DEFAULT_ADMIN_ROLE, p.deployer);

        d.timelock.renounceRole(DEFAULT_ADMIN_ROLE, p.deployer);
    }
}

/// @notice Broadcastable deploy script for local anvil / Base Sepolia.
contract Deploy is Script {
    function run() external returns (Deployment memory d) {
        address deployer = msg.sender;
        // GUARDIAN_SAFE must be set; never default the guardian to the deployer
        // on a real network (that would collapse the safety model).
        address guardian = vm.envOr("GUARDIAN_SAFE", deployer);

        DAODeployer.Params memory p = DAODeployer.Params({
            deployer: deployer,
            guardian: guardian,
            // Recommended production values (spec §6). Override via env if desired.
            minDelay: vm.envOr("TIMELOCK_MIN_DELAY", uint256(2 days)),
            votingDelay: uint48(vm.envOr("VOTING_DELAY", uint256(1 hours))),
            votingPeriod: uint32(vm.envOr("VOTING_PERIOD", uint256(2 days))),
            proposalThreshold: vm.envOr("PROPOSAL_THRESHOLD", uint256(1)),
            quorumNumerator: vm.envOr("QUORUM_NUMERATOR", uint256(30))
        });

        require(guardian != deployer, "GUARDIAN_SAFE must differ from deployer");

        vm.startBroadcast();
        d = DAODeployer.deploy(p);
        vm.stopBroadcast();

        console2.log("MembershipToken:", address(d.token));
        console2.log("TimelockController:", address(d.timelock));
        console2.log("DaoGovernor:", address(d.governor));
        console2.log("AgentRegistry:", address(d.registry));
        console2.log("RolesModifier:", address(d.roles));
        console2.log("RationaleAnchor:", address(d.anchor));
        console2.log("Treasury:", address(d.treasury));
        console2.log("Guardian:", guardian);
    }
}
