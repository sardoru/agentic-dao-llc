// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {RolesModifier} from "../src/RolesModifier.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MembershipToken} from "../src/MembershipToken.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

/// @notice ADVERSARIAL SAFETY PROOFS (spec §16.2). These are the proof that an
///         agent — or the Governor acting for agents — cannot exceed its
///         authority. Do NOT weaken any assertion in this file. If a test cannot
///         pass, the system is unsafe and the cause must be fixed, not the test.
contract AdversarialTest is BaseTest {
    uint8 internal constant FOR = 1;

    // Per-tx and per-epoch caps for the bounded-ops agent (mUSD has 6 decimals).
    uint256 internal constant PER_TX = 1_000e6; // 1,000 mUSD
    uint256 internal constant PER_EPOCH = 10_000e6; // 10,000 mUSD

    function setUp() public override {
        super.setUp();

        // Configure the bounded-ops agent at the Roles layer (guardian = ROLES_ADMIN).
        // The agent may only call ERC20 transfer() on the mUSD token, capped.
        vm.startPrank(guardian);
        roles.setAgentActive(opAgent, true);
        roles.setTargetAllowed(opAgent, address(usd), SEL_ERC20_TRANSFER, true);
        roles.setSpendingCap(opAgent, address(usd), PER_TX, PER_EPOCH);
        vm.stopPrank();

        // Fund the Roles modifier so it can actually move tokens on execution
        // (the modifier is msg.sender of the inner transfer).
        usd.mint(address(roles), 1_000_000e6);
    }

    // ── 1. spending caps (perTx AND cumulative perEpoch) ────────────────────────

    function test_AgentCannotExceedSpendingCap() public {
        // (a) A single transfer over perTx reverts.
        bytes memory overPerTx = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX + 1);
        vm.prank(opAgent);
        vm.expectRevert(
            abi.encodeWithSelector(RolesModifier.PerTxExceeded.selector, PER_TX + 1, PER_TX)
        );
        roles.execTransactionWithRole(address(usd), 0, overPerTx, opAgent);

        // (b) A within-perTx transfer succeeds and meters the epoch.
        bytes memory ok = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX);
        vm.prank(opAgent);
        roles.execTransactionWithRole(address(usd), 0, ok, opAgent);
        assertEq(roles.epochSpend(opAgent, address(usd)), PER_TX, "epoch metered");

        // (c) Spend up to perEpoch with repeated within-perTx transfers, then the
        // transfer that would cross perEpoch reverts even though it is within
        // perTx. PER_EPOCH/PER_TX = 10 transfers total; we already did 1.
        for (uint256 i = 1; i < 10; i++) {
            bytes memory step = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX);
            vm.prank(opAgent);
            roles.execTransactionWithRole(address(usd), 0, step, opAgent);
        }
        assertEq(roles.epochSpend(opAgent, address(usd)), PER_EPOCH, "epoch at cap");

        // The next within-perTx transfer pushes cumulative over perEpoch -> revert.
        bytes memory overEpoch = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, 1);
        vm.prank(opAgent);
        vm.expectRevert(
            abi.encodeWithSelector(RolesModifier.PerEpochExceeded.selector, PER_EPOCH + 1, PER_EPOCH)
        );
        roles.execTransactionWithRole(address(usd), 0, overEpoch, opAgent);
    }

    function test_EpochRollsAfterWindow() public {
        // Spend the full epoch, then advance past EPOCH_SECONDS; the cap resets.
        for (uint256 i = 0; i < 10; i++) {
            bytes memory step = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX);
            vm.prank(opAgent);
            roles.execTransactionWithRole(address(usd), 0, step, opAgent);
        }
        assertEq(roles.epochSpend(opAgent, address(usd)), PER_EPOCH, "epoch at cap");

        vm.warp(block.timestamp + roles.EPOCH_SECONDS());
        assertEq(roles.epochSpend(opAgent, address(usd)), 0, "epoch view reset after window");

        // A fresh transfer succeeds in the new window.
        bytes memory step2 = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX);
        vm.prank(opAgent);
        roles.execTransactionWithRole(address(usd), 0, step2, opAgent);
        assertEq(roles.epochSpend(opAgent, address(usd)), PER_TX, "new window metered");
    }

    // ── 2. reserved / non-allow-listed selectors not callable via Roles ─────────

    function test_AgentCannotCallReservedSelector() public {
        // The agent is allow-listed ONLY for transfer() on usd. Attempt to call a
        // reserved selector (updateDelay) on the timelock through Roles. It is not
        // allow-listed -> TargetNotAllowed revert (never reaches the timelock).
        bytes memory updateDelayCall = abi.encodeWithSelector(SEL_UPDATE_DELAY, uint256(1));
        vm.prank(opAgent);
        vm.expectRevert(
            abi.encodeWithSelector(RolesModifier.TargetNotAllowed.selector, address(timelock), SEL_UPDATE_DELAY)
        );
        roles.execTransactionWithRole(address(timelock), 0, updateDelayCall, opAgent);

        // Also: a reserved selector on an otherwise-allow-listed TARGET (usd) is
        // still blocked, because allow-listing is per (target, selector). The
        // agent has transfer() on usd but NOT approve() on usd.
        bytes4 selApprove = bytes4(keccak256("approve(address,uint256)"));
        bytes memory approveCall = abi.encodeWithSelector(selApprove, payee, uint256(1));
        vm.prank(opAgent);
        vm.expectRevert(
            abi.encodeWithSelector(RolesModifier.TargetNotAllowed.selector, address(usd), selApprove)
        );
        roles.execTransactionWithRole(address(usd), 0, approveCall, opAgent);
    }

    // ── 3. guardian cancel inside the timelock window blocks execution ──────────

    function test_GuardianCanCancelInTimelockWindow() public {
        vm.deal(address(treasury), 10 ether);
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(address(treasury), 0, abi.encodeWithSignature("withdrawETH(address,uint256)", payee, 1 ether));
        string memory description = "payment to be vetoed";
        bytes32 descHash = keccak256(bytes(description));

        uint256 proposalId = _propose(agent1, targets, values, calldatas, description);
        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.prank(agent2);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.prank(member3);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        governor.queue(targets, values, calldatas, descHash);
        bytes32 opId = _timelockOpId(targets, values, calldatas, descHash);
        assertTrue(timelock.isOperationPending(opId), "scheduled");

        // Guardian cancels INSIDE the delay window (before it elapses).
        vm.prank(guardian);
        timelock.cancel(opId);

        // Even after the original delay would have elapsed, execution fails.
        vm.warp(block.timestamp + MIN_DELAY + 1);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descHash);

        // And the proposal is reported Canceled.
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Canceled), "Canceled");
    }

    // ── 4-7. constitutional separation: Governor lacks every reserved role ──────
    //
    // Pattern: drive a real proposal whose executed call is the reserved action.
    // It passes the vote, queues, and the timelock TRIES to execute it — but the
    // timelock (acting as the Governor's executor) holds no admin role on the
    // target, so the inner call reverts and the proposal cannot complete. This
    // proves there is no on-chain path from an agent-driven proposal to a
    // Reserved Matter.

    function _runReservedProposalExpectingExecRevert(
        address target,
        bytes memory reservedCall,
        string memory description
    ) internal {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(target, 0, reservedCall);
        bytes32 descHash = keccak256(bytes(description));

        uint256 proposalId = _propose(agent1, targets, values, calldatas, description);
        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.prank(agent2);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.prank(member3);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded), "vote passed");

        // Queue + wait the full delay: the vote is NOT the safety boundary.
        governor.queue(targets, values, calldatas, descHash);
        vm.warp(block.timestamp + MIN_DELAY + 1);

        // Execution reverts because the executor (timelock, on the Governor's
        // behalf) lacks the admin role for the reserved call. THIS is the
        // constitutional separation: the agent path runs out of authority here.
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descHash);
        assertTrue(
            uint8(governor.state(proposalId)) != uint8(IGovernor.ProposalState.Executed),
            "reserved matter must NOT execute"
        );
    }

    function test_GovernorLacksRoleToChangeTimelockDelay() public {
        // Sanity: neither the Governor nor the Timelock-as-executor may change the
        // delay; only the guardian (timelock DEFAULT_ADMIN) can.
        assertFalse(
            timelock.hasRole(DEFAULT_ADMIN_ROLE, address(governor)), "governor not timelock admin"
        );
        bytes memory call = abi.encodeWithSelector(SEL_UPDATE_DELAY, uint256(1 minutes));
        _runReservedProposalExpectingExecRevert(address(timelock), call, "lower the timelock delay");

        // Delay is unchanged.
        assertEq(timelock.getMinDelay(), MIN_DELAY, "delay untouched");
    }

    function test_GovernorLacksRoleToUpdateMandate() public {
        // First register an agent so there is a mandate to (attempt to) update.
        bytes32 origHash = keccak256("orig-mandate");
        vm.prank(member1);
        registry.registerAgent(agent1, origHash, "ipfs://orig");

        assertFalse(registry.hasRole(registry.REGISTRY_ADMIN(), address(governor)), "gov not registry admin");
        assertFalse(registry.hasRole(registry.REGISTRY_ADMIN(), address(timelock)), "timelock not registry admin");

        bytes memory call = abi.encodeWithSelector(
            SEL_UPDATE_MANDATE, agent1, keccak256("evil-mandate"), "ipfs://evil"
        );
        _runReservedProposalExpectingExecRevert(address(registry), call, "rewrite an agent mandate");

        // Mandate is unchanged.
        AgentRegistry.AgentRecord memory rec = registry.mandateOf(agent1);
        assertEq(rec.mandateHash, origHash, "mandate hash untouched");
    }

    function test_GovernorLacksRoleToMintMembership() public {
        assertFalse(token.hasRole(token.MEMBERSHIP_ADMIN(), address(governor)), "gov not membership admin");
        assertFalse(token.hasRole(token.MEMBERSHIP_ADMIN(), address(timelock)), "timelock not membership admin");

        // Attempt to mint a 4th membership (to stranger) via governance.
        bytes memory call = abi.encodeWithSelector(SEL_MINT_MEMBERSHIP, stranger, uint256(99));
        _runReservedProposalExpectingExecRevert(address(token), call, "mint membership to stranger");

        // No token minted to stranger.
        assertEq(token.balanceOf(stranger), 0, "stranger got no membership");
    }

    function test_GovernorLacksRoleToChangeRolesConfig() public {
        assertFalse(roles.hasRole(roles.ROLES_ADMIN(), address(governor)), "gov not roles admin");
        assertFalse(roles.hasRole(roles.ROLES_ADMIN(), address(timelock)), "timelock not roles admin");

        // Attempt to widen a spending cap via governance.
        bytes memory call = abi.encodeWithSelector(
            SEL_SET_SPENDING_CAP, opAgent, address(usd), uint256(type(uint256).max), uint256(type(uint256).max)
        );
        _runReservedProposalExpectingExecRevert(address(roles), call, "blow open the spending cap");

        // Cap unchanged: a transfer over the ORIGINAL perTx still reverts.
        bytes memory overPerTx = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, PER_TX + 1);
        vm.prank(opAgent);
        vm.expectRevert(abi.encodeWithSelector(RolesModifier.PerTxExceeded.selector, PER_TX + 1, PER_TX));
        roles.execTransactionWithRole(address(usd), 0, overPerTx, opAgent);
    }

    // ── 8. non-member cannot vote ───────────────────────────────────────────────

    function test_NonMemberCannotVote() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(address(0xBEEF), 0, "");
        uint256 proposalId = _propose(agent1, targets, values, calldatas, "signal");

        // `stranger` holds no membership and no delegated power -> 0 weight.
        assertEq(token.getVotes(stranger), 0, "stranger has no voting power");

        // Casting a vote is allowed by the Governor but contributes ZERO weight;
        // assert the tally is unaffected by the stranger's vote.
        vm.prank(stranger);
        governor.castVoteWithReason(proposalId, FOR, "i am nobody");

        (uint256 against, uint256 forVotes, uint256 abstain) = governor.proposalVotes(proposalId);
        assertEq(forVotes, 0, "stranger added 0 for-weight");
        assertEq(against, 0, "no against");
        assertEq(abstain, 0, "no abstain");
    }

    // ── constitutional separation: whole-deployment role audit ──────────────────

    /// @notice Single audit asserting the FULL separation invariant after deploy:
    ///         the Governor holds NONE of the constitutional admin roles, the
    ///         guardian holds ALL of them, and the deployer renounced everything.
    function test_RoleSeparation_GovernorHoldsNothing_GuardianHoldsAll() public view {
        // Governor holds NO constitutional admin role anywhere.
        assertFalse(token.hasRole(DEFAULT_ADMIN_ROLE, address(governor)), "gov !token admin");
        assertFalse(token.hasRole(token.MEMBERSHIP_ADMIN(), address(governor)), "gov !membership");
        assertFalse(registry.hasRole(DEFAULT_ADMIN_ROLE, address(governor)), "gov !registry admin");
        assertFalse(registry.hasRole(registry.REGISTRY_ADMIN(), address(governor)), "gov !registry");
        assertFalse(roles.hasRole(DEFAULT_ADMIN_ROLE, address(governor)), "gov !roles admin");
        assertFalse(roles.hasRole(roles.ROLES_ADMIN(), address(governor)), "gov !roles");
        assertFalse(timelock.hasRole(DEFAULT_ADMIN_ROLE, address(governor)), "gov !timelock admin");
        assertFalse(timelock.hasRole(timelock.TIMELOCK_ADMIN(), address(governor)), "gov !timelock admin role");

        // Guardian holds ALL constitutional admin roles.
        assertTrue(token.hasRole(DEFAULT_ADMIN_ROLE, guardian), "guardian token admin");
        assertTrue(token.hasRole(token.MEMBERSHIP_ADMIN(), guardian), "guardian membership");
        assertTrue(registry.hasRole(DEFAULT_ADMIN_ROLE, guardian), "guardian registry admin");
        assertTrue(registry.hasRole(registry.REGISTRY_ADMIN(), guardian), "guardian registry");
        assertTrue(roles.hasRole(DEFAULT_ADMIN_ROLE, guardian), "guardian roles admin");
        assertTrue(roles.hasRole(roles.ROLES_ADMIN(), guardian), "guardian roles");
        assertTrue(timelock.hasRole(DEFAULT_ADMIN_ROLE, guardian), "guardian timelock admin");
        assertTrue(timelock.hasRole(timelock.TIMELOCK_ADMIN(), guardian), "guardian timelock-admin role");
        assertTrue(timelock.hasRole(timelock.CANCELLER_ROLE(), guardian), "guardian canceller");

        // Governor IS the timelock proposer + executor (operational authority only).
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), address(governor)), "gov proposer");
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), address(governor)), "gov executor");

        // Deployer renounced everything; timelock self-admin revoked.
        assertFalse(token.hasRole(DEFAULT_ADMIN_ROLE, deployer), "deployer renounced token");
        assertFalse(registry.hasRole(DEFAULT_ADMIN_ROLE, deployer), "deployer renounced registry");
        assertFalse(roles.hasRole(DEFAULT_ADMIN_ROLE, deployer), "deployer renounced roles");
        assertFalse(timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer), "deployer renounced timelock");
        assertFalse(timelock.hasRole(DEFAULT_ADMIN_ROLE, address(timelock)), "timelock self-admin revoked");

        // Treasury is owned by the timelock (funds move only via execution).
        assertEq(treasury.owner(), address(timelock), "treasury owned by timelock");
    }

    // ── 9. soulbound: membership cannot be transferred ──────────────────────────

    function test_SoulboundTransferReverts() public {
        // member1 owns token 1. Every transfer path must revert with Soulbound.
        vm.prank(member1);
        vm.expectRevert(MembershipToken.Soulbound.selector);
        token.transferFrom(member1, member2, 1);

        vm.prank(member1);
        vm.expectRevert(MembershipToken.Soulbound.selector);
        token.safeTransferFrom(member1, member2, 1);

        // Approvals are also blocked (defense in depth).
        vm.prank(member1);
        vm.expectRevert(MembershipToken.Soulbound.selector);
        token.approve(member2, 1);

        vm.prank(member1);
        vm.expectRevert(MembershipToken.Soulbound.selector);
        token.setApprovalForAll(member2, true);

        // The token is still held by member1.
        assertEq(token.ownerOf(1), member1, "still owned by member1");
    }
}
