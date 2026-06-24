// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RolesModifier} from "../src/RolesModifier.sol";

/// @notice Targeted unit coverage for AgentRegistry, RationaleAnchor, and a few
///         RolesModifier edge cases not covered by the adversarial suite.
contract UnitsTest is BaseTest {
    event AgentRegistered(
        address indexed agentAccount, address indexed principal, bytes32 mandateHash, string mandateURI
    );
    event AgentDeactivated(address indexed agentAccount);
    event RationaleAnchored(bytes32 indexed refId, string ipfsURI, bytes32 contentHash);

    // ── AgentRegistry ────────────────────────────────────────────────────────────

    function test_RegisterAgent_SetsPrincipalToCaller() public {
        bytes32 h = keccak256("m");
        vm.expectEmit(true, true, true, true);
        emit AgentRegistered(agent1, member1, h, "ipfs://m");
        vm.prank(member1);
        registry.registerAgent(agent1, h, "ipfs://m");

        AgentRegistry.AgentRecord memory rec = registry.mandateOf(agent1);
        assertEq(rec.principal, member1);
        assertEq(rec.mandateHash, h);
        assertTrue(rec.active);
    }

    function test_RegisterAgent_RejectsDuplicate() public {
        vm.prank(member1);
        registry.registerAgent(agent1, keccak256("a"), "ipfs://a");
        vm.prank(member2);
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.registerAgent(agent1, keccak256("b"), "ipfs://b");
    }

    function test_DeactivateAgent_ByPrincipal() public {
        vm.prank(member1);
        registry.registerAgent(agent1, keccak256("a"), "ipfs://a");

        vm.expectEmit(true, false, false, false);
        emit AgentDeactivated(agent1);
        vm.prank(member1);
        registry.deactivateAgent(agent1);
        assertFalse(registry.mandateOf(agent1).active);
    }

    function test_DeactivateAgent_ByGuardian() public {
        vm.prank(member1);
        registry.registerAgent(agent1, keccak256("a"), "ipfs://a");

        vm.prank(guardian); // REGISTRY_ADMIN
        registry.deactivateAgent(agent1);
        assertFalse(registry.mandateOf(agent1).active);
    }

    function test_DeactivateAgent_RejectsStranger() public {
        vm.prank(member1);
        registry.registerAgent(agent1, keccak256("a"), "ipfs://a");

        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotPrincipalOrAdmin.selector);
        registry.deactivateAgent(agent1);
    }

    function test_UpdateMandate_OnlyGuardian() public {
        vm.prank(member1);
        registry.registerAgent(agent1, keccak256("a"), "ipfs://a");

        // Principal (non-admin) cannot update the mandate — it is reserved.
        vm.prank(member1);
        vm.expectRevert();
        registry.updateMandate(agent1, keccak256("b"), "ipfs://b");

        // Guardian can.
        vm.prank(guardian);
        registry.updateMandate(agent1, keccak256("b"), "ipfs://b");
        assertEq(registry.mandateOf(agent1).mandateHash, keccak256("b"));
    }

    // ── RationaleAnchor ──────────────────────────────────────────────────────────

    function test_Anchor_EmitsEvent() public {
        bytes32 refId = bytes32(uint256(0xABCD));
        bytes32 contentHash = keccak256("rationale");
        vm.expectEmit(true, false, false, true);
        emit RationaleAnchored(refId, "ipfs://r", contentHash);
        anchor.anchor(refId, "ipfs://r", contentHash);
    }

    // ── RolesModifier extras ──────────────────────────────────────────────────────

    function test_Roles_InactiveAgentBlocked() public {
        // opAgent active in Adversarial.setUp only; here in Units it is NOT
        // configured at all, so it is inactive by default.
        bytes memory data = abi.encodeWithSelector(SEL_ERC20_TRANSFER, payee, uint256(1));
        vm.prank(opAgent);
        vm.expectRevert(RolesModifier.AgentNotActive.selector);
        roles.execTransactionWithRole(address(usd), 0, data, opAgent);
    }

    function test_Roles_TransferFromAmountIsMetered() public {
        // Configure opAgent for transferFrom on usd with a tight perTx so the
        // decoder is exercised on the THIRD calldata word.
        bytes4 selTransferFrom = bytes4(keccak256("transferFrom(address,address,uint256)"));
        vm.startPrank(guardian);
        roles.setAgentActive(opAgent, true);
        roles.setTargetAllowed(opAgent, address(usd), selTransferFrom, true);
        roles.setSpendingCap(opAgent, address(usd), 100, 1000);
        vm.stopPrank();

        usd.mint(address(roles), 10_000);
        // Pre-approve so the inner transferFrom can pull from `member1`.
        usd.mint(member1, 10_000);
        vm.prank(member1);
        usd.approve(address(roles), type(uint256).max);

        // amount = 101 > perTx(100) must revert, proving the amount word (not the
        // address words) is what gets metered.
        bytes memory over = abi.encodeWithSelector(selTransferFrom, member1, payee, uint256(101));
        vm.prank(opAgent);
        vm.expectRevert(abi.encodeWithSelector(RolesModifier.PerTxExceeded.selector, uint256(101), uint256(100)));
        roles.execTransactionWithRole(address(usd), 0, over, opAgent);

        // amount = 100 == perTx succeeds and moves exactly 100.
        bytes memory ok = abi.encodeWithSelector(selTransferFrom, member1, payee, uint256(100));
        uint256 before = usd.balanceOf(payee);
        vm.prank(opAgent);
        roles.execTransactionWithRole(address(usd), 0, ok, opAgent);
        assertEq(usd.balanceOf(payee) - before, 100, "exactly 100 moved");
        assertEq(roles.epochSpend(opAgent, address(usd)), 100, "metered 100");
    }
}
