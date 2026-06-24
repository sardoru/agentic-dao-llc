// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {DAODeployer, Deployment} from "../script/Deploy.s.sol";
import {MembershipToken} from "../src/MembershipToken.sol";
import {DaoGovernor} from "../src/DaoGovernor.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RolesModifier} from "../src/RolesModifier.sol";
import {RationaleAnchor} from "../src/RationaleAnchor.sol";
import {Treasury} from "../src/Treasury.sol";
import {GuardedTimelock} from "../src/GuardedTimelock.sol";

/// @dev Minimal mock ERC20 used to drive RolesModifier spending-cap accounting
///      and Treasury withdrawals without pulling a real token in.
contract MockERC20 {
    string public name = "Mock USD";
    string public symbol = "mUSD";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/// @notice Shared fixture: deploys the full system via the SAME `DAODeployer`
///         library the production script uses, mints membership to test members,
///         and exposes role/selector constants used across functional and
///         adversarial suites.
abstract contract BaseTest is Test {
    // Selectors (must match reserved-matters.yaml + docs/interfaces.md).
    bytes4 internal constant SEL_UPDATE_DELAY = bytes4(keccak256("updateDelay(uint256)"));
    bytes4 internal constant SEL_UPDATE_MANDATE = bytes4(keccak256("updateMandate(address,bytes32,string)"));
    bytes4 internal constant SEL_MINT_MEMBERSHIP = bytes4(keccak256("mintMembership(address,uint256)"));
    bytes4 internal constant SEL_SET_SPENDING_CAP = bytes4(keccak256("setSpendingCap(address,address,uint256,uint256)"));
    bytes4 internal constant SEL_SET_TARGET_ALLOWED = bytes4(keccak256("setTargetAllowed(address,address,bytes4,bool)"));
    bytes4 internal constant SEL_GRANT_ROLE = bytes4(keccak256("grantRole(bytes32,address)"));
    bytes4 internal constant SEL_ERC20_TRANSFER = bytes4(keccak256("transfer(address,uint256)"));

    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    // Governance timing (small values for tests; timestamp clock mode).
    uint48 internal constant VOTING_DELAY = 1 hours;
    uint32 internal constant VOTING_PERIOD = 1 days;
    uint256 internal constant PROPOSAL_THRESHOLD = 1;
    uint256 internal constant QUORUM_NUMERATOR = 30; // 30%
    uint256 internal constant MIN_DELAY = 2 days;

    // Actors
    address internal deployer = makeAddr("deployer");
    address internal guardian = makeAddr("guardian");
    address internal member1 = makeAddr("member1");
    address internal member2 = makeAddr("member2");
    address internal member3 = makeAddr("member3");
    address internal agent1 = makeAddr("agent1"); // member1's voting agent
    address internal agent2 = makeAddr("agent2"); // member2's voting agent
    address internal opAgent = makeAddr("opAgent"); // bounded-ops agent
    address internal payee = makeAddr("payee");
    address internal stranger = makeAddr("stranger");

    // Deployment
    MembershipToken internal token;
    GuardedTimelock internal timelock;
    DaoGovernor internal governor;
    AgentRegistry internal registry;
    RolesModifier internal roles;
    RationaleAnchor internal anchor;
    Treasury internal treasury;

    MockERC20 internal usd;

    function setUp() public virtual {
        // Deploy via the real wiring library, as the deployer.
        vm.startPrank(deployer);
        Deployment memory d = DAODeployer.deploy(
            DAODeployer.Params({
                deployer: deployer,
                guardian: guardian,
                minDelay: MIN_DELAY,
                votingDelay: VOTING_DELAY,
                votingPeriod: VOTING_PERIOD,
                proposalThreshold: PROPOSAL_THRESHOLD,
                quorumNumerator: QUORUM_NUMERATOR
            })
        );
        vm.stopPrank();

        token = d.token;
        timelock = d.timelock;
        governor = d.governor;
        registry = d.registry;
        roles = d.roles;
        anchor = d.anchor;
        treasury = d.treasury;

        usd = new MockERC20();

        // Mint membership to three members (guardian is MEMBERSHIP_ADMIN).
        vm.startPrank(guardian);
        token.mintMembership(member1, 1);
        token.mintMembership(member2, 2);
        token.mintMembership(member3, 3);
        vm.stopPrank();

        // Members delegate their unit of voting power to their agents (or self).
        vm.prank(member1);
        token.delegate(agent1);
        vm.prank(member2);
        token.delegate(agent2);
        // member3 self-delegates so it can vote directly in some tests.
        vm.prank(member3);
        token.delegate(member3);

        // Move time forward so delegation snapshots are in the past for proposals
        // created later (timestamp clock).
        vm.warp(block.timestamp + 1);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    /// @dev Build a single-call proposal payload.
    function _single(address target, uint256 value, bytes memory data)
        internal
        pure
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = target;
        values[0] = value;
        calldatas[0] = data;
    }

    /// @dev The timelock operation id for a Governor-queued batch. OZ's
    ///      GovernorTimelockControl salts the timelock op with
    ///      `bytes20(address(governor)) ^ descriptionHash` (NOT the bare
    ///      descriptionHash), so the cancel/veto tests must reproduce that salt.
    function _timelockOpId(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descHash
    ) internal view returns (bytes32) {
        bytes32 salt = bytes20(address(governor)) ^ descHash;
        return timelock.hashOperationBatch(targets, values, calldatas, 0, salt);
    }

    /// @dev Propose, advance past votingDelay, return proposalId. Proposer must
    ///      hold >= proposalThreshold votes at the snapshot.
    function _propose(
        address proposer,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) internal returns (uint256 proposalId) {
        vm.prank(proposer);
        proposalId = governor.propose(targets, values, calldatas, description);
        // Advance to Active.
        vm.warp(block.timestamp + VOTING_DELAY + 1);
    }
}
