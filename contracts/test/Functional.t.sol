// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {Treasury} from "../src/Treasury.sol";

/// @notice Functional / happy-path coverage (spec §16.1): delegation, the full
///         propose→execute lifecycle, defeated proposals, quorum + counting
///         boundaries, and guardian cancel.
contract FunctionalTest is BaseTest {
    // For/Against/Abstain encoding (GovernorCountingSimple).
    uint8 internal constant AGAINST = 0;
    uint8 internal constant FOR = 1;
    uint8 internal constant ABSTAIN = 2;

    // ── delegation ──────────────────────────────────────────────────────────────

    function test_DelegationGivesVotingPower() public view {
        // member1 delegated to agent1, member2 to agent2, member3 to self.
        assertEq(token.getVotes(agent1), 1, "agent1 should have 1 vote");
        assertEq(token.getVotes(agent2), 1, "agent2 should have 1 vote");
        assertEq(token.getVotes(member3), 1, "member3 should have 1 vote");
        // The members themselves hold no voting power once delegated away.
        assertEq(token.getVotes(member1), 0, "member1 delegated away");
        assertEq(token.getVotes(member2), 0, "member2 delegated away");
    }

    function test_ReDelegationUpdatesWeight() public {
        // member1 re-delegates from agent1 to agent2.
        vm.prank(member1);
        token.delegate(agent2);
        vm.warp(block.timestamp + 1);

        assertEq(token.getVotes(agent1), 0, "agent1 lost member1's vote");
        assertEq(token.getVotes(agent2), 2, "agent2 now holds member1+member2");
    }

    // ── full lifecycle: propose -> active -> vote -> succeeded -> queue -> execute

    function test_FullProposalLifecycle_TreasuryPayment() public {
        // Fund the treasury with ETH; a proposal pays `payee` from it.
        vm.deal(address(treasury), 10 ether);
        uint256 amount = 3 ether;

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _single(
            address(treasury), 0, abi.encodeCall(Treasury.withdrawETH, (payee, amount))
        );
        string memory description = "Pay invoice to payee";
        bytes32 descHash = keccak256(bytes(description));

        // Pending immediately after propose.
        vm.prank(agent1);
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending), "Pending");

        // After votingDelay -> Active.
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Active), "Active");

        // Cast votes with reason: agent1, agent2, member3 all FOR -> 3/3, quorum met.
        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, FOR, "agent1: invoice is valid");
        vm.prank(agent2);
        governor.castVoteWithReason(proposalId, FOR, "agent2: concur");
        vm.prank(member3);
        governor.castVoteWithReason(proposalId, FOR, "member3: concur");

        // After votingPeriod -> Succeeded.
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded), "Succeeded");

        // Queue into the timelock.
        governor.queue(targets, values, calldatas, descHash);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Queued), "Queued");

        // Cannot execute before the delay elapses.
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descHash);

        // After minDelay -> execute moves funds.
        vm.warp(block.timestamp + MIN_DELAY + 1);
        uint256 before = payee.balance;
        governor.execute(targets, values, calldatas, descHash);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed), "Executed");
        assertEq(payee.balance - before, amount, "payee received funds");
    }

    function test_DefeatedProposalCannotExecute() public {
        vm.deal(address(treasury), 10 ether);
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _single(
            address(treasury), 0, abi.encodeCall(Treasury.withdrawETH, (payee, 1 ether))
        );
        string memory description = "Defeated payment";
        bytes32 descHash = keccak256(bytes(description));

        uint256 proposalId = _propose(agent1, targets, values, calldatas, description);

        // Everyone votes AGAINST -> defeated.
        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, AGAINST, "no");
        vm.prank(agent2);
        governor.castVoteWithReason(proposalId, AGAINST, "no");
        vm.prank(member3);
        governor.castVoteWithReason(proposalId, AGAINST, "no");

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated), "Defeated");

        // Cannot queue or execute a defeated proposal.
        vm.expectRevert();
        governor.queue(targets, values, calldatas, descHash);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descHash);
    }

    // ── quorum + counting boundary cases ────────────────────────────────────────

    function test_QuorumExactBoundary_Succeeds() public {
        // 3 members => supply 3. Quorum = 30% of 3 = 0.9 -> floor => quorum value
        // is 0 (OZ computes (supply*num)/denom = (3*30)/100 = 0). So even a single
        // FOR vote both clears the (zero) quorum bar and wins the majority.
        // We assert the exact quorum figure, then that exactly one FOR vote
        // succeeds — the boundary where votes-for == quorum-needed.
        uint256 snapshotQuorum = governor.quorum(block.timestamp - 1);
        assertEq(snapshotQuorum, 0, "quorum floors to 0 at supply=3, 30%");

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(address(0xBEEF), 0, "");
        string memory description = "Signal at exact quorum boundary";
        uint256 proposalId = _propose(agent1, targets, values, calldatas, description);

        // Exactly one FOR vote.
        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, FOR, "single for");

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        // forVotes (1) >= quorum (0) and forVotes > against (0) -> Succeeded.
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded), "boundary Succeeded");

        (uint256 against, uint256 forVotes, uint256 abstain) = governor.proposalVotes(proposalId);
        assertEq(forVotes, 1, "1 for");
        assertEq(against, 0, "0 against");
        assertEq(abstain, 0, "0 abstain");
        assertGe(forVotes, snapshotQuorum, "for >= quorum at boundary");
    }

    function test_QuorumNonTrivialBoundary() public {
        // Grow membership to supply=10 so 30% quorum = exactly 3 (a non-trivial
        // integer). Then prove the precise boundary: 2 FOR (below quorum) is
        // Defeated; exactly 3 FOR (== quorum) Succeeds.
        vm.startPrank(guardian);
        address[] memory extras = new address[](7);
        for (uint256 i = 0; i < 7; i++) {
            extras[i] = makeAddr(string.concat("extra", vm.toString(i)));
            token.mintMembership(extras[i], 100 + i);
        }
        vm.stopPrank();
        // Each extra self-delegates so it can cast its own weight.
        for (uint256 i = 0; i < 7; i++) {
            vm.prank(extras[i]);
            token.delegate(extras[i]);
        }
        vm.warp(block.timestamp + 1);

        // supply is now 10 (3 original + 7 extra). quorum = (10*30)/100 = 3.
        uint256 q = governor.quorum(block.timestamp - 1);
        assertEq(q, 3, "quorum is exactly 3 at supply=10, 30%");

        // ── Case A: 2 FOR votes — one below quorum — Defeated. ──
        {
            (address[] memory t, uint256[] memory v, bytes[] memory c) = _single(address(0xBEEF), 0, "");
            uint256 pidA = _propose(agent1, t, v, c, "below quorum");
            vm.prank(agent1);
            governor.castVoteWithReason(pidA, FOR, "for");
            vm.prank(agent2);
            governor.castVoteWithReason(pidA, FOR, "for");
            vm.warp(block.timestamp + VOTING_PERIOD + 1);
            (, uint256 forA,) = governor.proposalVotes(pidA);
            assertEq(forA, 2, "2 for");
            assertLt(forA, q, "below quorum");
            assertEq(uint8(governor.state(pidA)), uint8(IGovernor.ProposalState.Defeated), "below quorum Defeated");
        }

        // ── Case B: exactly 3 FOR votes — at quorum — Succeeds. ──
        {
            (address[] memory t, uint256[] memory v, bytes[] memory c) = _single(address(0xBEEF), 0, "");
            uint256 pidB = _propose(agent1, t, v, c, "at quorum");
            vm.prank(agent1);
            governor.castVoteWithReason(pidB, FOR, "for");
            vm.prank(agent2);
            governor.castVoteWithReason(pidB, FOR, "for");
            vm.prank(member3);
            governor.castVoteWithReason(pidB, FOR, "for");
            vm.warp(block.timestamp + VOTING_PERIOD + 1);
            (, uint256 forB,) = governor.proposalVotes(pidB);
            assertEq(forB, 3, "3 for");
            assertEq(forB, q, "exactly at quorum");
            assertEq(uint8(governor.state(pidB)), uint8(IGovernor.ProposalState.Succeeded), "at quorum Succeeds");
        }
    }

    function test_TieIsNotMajority_Defeated() public {
        // Counting boundary: a tie (1 FOR / 1 AGAINST) is NOT a majority under
        // GovernorCountingSimple (requires forVotes > againstVotes), so the
        // proposal is Defeated even though quorum (forVotes+abstain) is met.
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(address(0xBEEF), 0, "");
        uint256 proposalId = _propose(agent1, targets, values, calldatas, "Tie proposal");

        vm.prank(agent1);
        governor.castVoteWithReason(proposalId, FOR, "for");
        vm.prank(agent2);
        governor.castVoteWithReason(proposalId, AGAINST, "against");

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated), "tie is Defeated");
    }

    function test_ProposalThresholdBoundary() public {
        // proposalThreshold == 1. An address with exactly 1 vote (agent1) can
        // propose; an address with 0 votes (stranger) cannot.
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _single(address(0xBEEF), 0, "");

        // stranger has 0 votes -> propose reverts.
        vm.prank(stranger);
        vm.expectRevert();
        governor.propose(targets, values, calldatas, "stranger cannot propose");

        // agent1 has exactly threshold -> succeeds.
        vm.prank(agent1);
        uint256 pid = governor.propose(targets, values, calldatas, "agent1 can propose");
        assertEq(uint8(governor.state(pid)), uint8(IGovernor.ProposalState.Pending), "proposed at threshold");
    }

    // ── guardian cancel (happy-path veto) ───────────────────────────────────────

    function test_GuardianCanCancelQueuedProposal() public {
        vm.deal(address(treasury), 10 ether);
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _single(
            address(treasury), 0, abi.encodeCall(Treasury.withdrawETH, (payee, 1 ether))
        );
        string memory description = "Cancelable payment";
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

        // Guardian holds CANCELLER on the timelock; cancel the scheduled op.
        bytes32 timelockId = _timelockOpId(targets, values, calldatas, descHash);
        assertTrue(timelock.isOperationPending(timelockId), "op scheduled");

        vm.prank(guardian);
        timelock.cancel(timelockId);
        assertFalse(timelock.isOperation(timelockId), "op cancelled");

        // Execution now fails (op no longer scheduled).
        vm.warp(block.timestamp + MIN_DELAY + 1);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descHash);
    }
}
