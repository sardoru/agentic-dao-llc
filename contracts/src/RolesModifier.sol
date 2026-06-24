// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/// @title RolesModifier
/// @notice MINIMAL in-house stand-in for the Zodiac Roles Modifier v2 (full
///         Zodiac is out of v1 scope — see ADR 0003). Per agent it enforces, on
///         every routed execution:
///           1. the agent is active,
///           2. the (target, selector) pair is on the agent's allow-list,
///           3. for known ERC20 value-moving selectors, the decoded amount is
///              within `perTx` AND cumulative within `perEpoch` (rolling epoch).
///         Any check failing reverts — this is the "agent cannot exceed its
///         authority" safety proof at the contract layer.
///
/// @dev    This contract is the on-chain mirror of the runtime policy engine and
///         of the legal Agent Mandate. Its admin setters
///         (`setSpendingCap`/`setTargetAllowed`/`setAgentActive`) are Reserved
///         Matters gated by `ROLES_ADMIN`, held by the guardian — never the
///         Governor (`test_GovernorLacksRoleToChangeRolesConfig`).
///
///         Production note: replace with the audited Zodiac Roles Modifier v2
///         behind a Safe; this is a focused re-implementation of just the
///         scoping + allowance semantics needed for v1's safety tests.
contract RolesModifier is AccessControl {
    using Address for address;

    /// @notice Reserved Matter role: configure agent caps + allow-lists + active
    ///         flag. Held by the guardian multisig; never by the Governor.
    bytes32 public constant ROLES_ADMIN = keccak256("ROLES_ADMIN");

    // Known ERC20 value-moving selectors. For these we decode and meter the
    // moved `amount`. (We meter transfer/transferFrom outflows; approve is
    // metered too because an allowance is a deferred outflow.)
    bytes4 internal constant SEL_TRANSFER = bytes4(keccak256("transfer(address,uint256)")); // 0xa9059cbb
    bytes4 internal constant SEL_TRANSFER_FROM = bytes4(keccak256("transferFrom(address,address,uint256)")); // 0x23b872dd
    bytes4 internal constant SEL_APPROVE = bytes4(keccak256("approve(address,uint256)")); // 0x095ea7b3

    struct SpendingCap {
        uint256 perTx; // max moved per single execution
        uint256 perEpoch; // max cumulative moved within the rolling epoch
        bool set; // whether a cap has been configured for (agent, token)
    }

    struct EpochState {
        uint256 spent; // cumulative amount moved in the current epoch window
        uint256 epochStart; // timestamp the current epoch window began
    }

    /// @dev Fixed rolling-epoch length for v1 (1 week). The interface
    ///      (`setSpendingCap(agent,token,perTx,perEpoch)`) pins exactly four args
    ///      per `reserved-matters.yaml`, so the epoch length is a contract
    ///      constant rather than a per-cap field. Documented in ADR 0003.
    uint256 public constant EPOCH_SECONDS = 7 days;

    // agent => active
    mapping(address => bool) public agentActive;
    // agent => target => selector => allowed
    mapping(address => mapping(address => mapping(bytes4 => bool))) public targetAllowed;
    // agent => token => cap
    mapping(address => mapping(address => SpendingCap)) public caps;
    // agent => token => rolling epoch accounting
    mapping(address => mapping(address => EpochState)) internal epochs;

    event AgentExecuted(address agent, address to, bytes4 selector, address token, uint256 amount);
    event ExecutionSuccess(bytes32 txHash);
    event SpendingCapSet(address indexed agent, address indexed token, uint256 perTx, uint256 perEpoch);
    event TargetAllowedSet(address indexed agent, address indexed target, bytes4 selector, bool allowed);
    event AgentActiveSet(address indexed agent, bool active);

    error AgentNotActive();
    error TargetNotAllowed(address to, bytes4 selector);
    error CapNotSet(address token);
    error PerTxExceeded(uint256 amount, uint256 perTx);
    error PerEpochExceeded(uint256 wouldSpend, uint256 perEpoch);
    error InnerCallFailed();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROLES_ADMIN, admin);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reserved-Matter admin setters (ROLES_ADMIN / guardian only)
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Set the per-tx / per-epoch spending cap for (agent, token).
    function setSpendingCap(address agent, address token, uint256 perTx, uint256 perEpoch)
        external
        onlyRole(ROLES_ADMIN)
    {
        caps[agent][token] = SpendingCap({perTx: perTx, perEpoch: perEpoch, set: true});
        emit SpendingCapSet(agent, token, perTx, perEpoch);
    }

    /// @notice Allow or disallow an agent to call `selector` on `target`.
    function setTargetAllowed(address agent, address target, bytes4 selector, bool allowed)
        external
        onlyRole(ROLES_ADMIN)
    {
        targetAllowed[agent][target][selector] = allowed;
        emit TargetAllowedSet(agent, target, selector, allowed);
    }

    /// @notice Activate or deactivate an agent's operational authority.
    function setAgentActive(address agent, bool active) external onlyRole(ROLES_ADMIN) {
        agentActive[agent] = active;
        emit AgentActiveSet(agent, active);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Execution chokepoint
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Execute `data` against `to` on behalf of `agent`, subject to the
    ///         agent's active flag, (target, selector) allow-list, and ERC20
    ///         spending caps. Reverts if any constraint is violated.
    /// @dev    `msg.sender` is intentionally not constrained here: this is a v1
    ///         stand-in and the caller is expected to be the agent's signer or
    ///         (in tests) the harness acting as the agent. The Reserved-Matter
    ///         property under test is that this path can NEVER exceed the
    ///         guardian-configured scope/caps, regardless of who triggers it.
    function execTransactionWithRole(address to, uint256 value, bytes calldata data, address agent)
        external
        returns (bool)
    {
        if (!agentActive[agent]) revert AgentNotActive();

        bytes4 selector = _selectorOf(data);
        if (!targetAllowed[agent][to][selector]) {
            revert TargetNotAllowed(to, selector);
        }

        // Meter ERC20 value-moving calls. For these, the `to` contract IS the
        // token, and we decode the moved amount from calldata.
        (bool isValueMove, uint256 amount) = _decodeAmount(selector, data);
        if (isValueMove) {
            _meterSpend(agent, to, amount);
            emit AgentExecuted(agent, to, selector, to, amount);
        } else {
            emit AgentExecuted(agent, to, selector, address(0), 0);
        }

        // Perform the inner call. functionCallWithValue bubbles the revert reason
        // on failure.
        bytes memory ret = to.functionCallWithValue(data, value);
        ret; // silence unused-var; return data not needed by callers in v1

        bytes32 txHash = keccak256(abi.encode(agent, to, value, data, block.number));
        emit ExecutionSuccess(txHash);
        return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Views
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Amount spent by `agent` in `token` within the CURRENT rolling
    ///         epoch. Returns 0 if the stored epoch window has elapsed (a fresh
    ///         window would start on the next metered call).
    function epochSpend(address agent, address token) external view returns (uint256) {
        EpochState storage es = epochs[agent][token];
        if (es.epochStart == 0 || block.timestamp >= es.epochStart + EPOCH_SECONDS) {
            return 0;
        }
        return es.spent;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Internal
    // ──────────────────────────────────────────────────────────────────────────

    /// @dev Extract the 4-byte selector from calldata; treat empty/short data as
    ///      the zero selector (a bare ETH send), which must still be explicitly
    ///      allow-listed.
    function _selectorOf(bytes calldata data) internal pure returns (bytes4) {
        if (data.length < 4) return bytes4(0);
        return bytes4(data[:4]);
    }

    /// @dev Decode the moved `amount` for known ERC20 selectors. Reverts on a
    ///      malformed payload (too short to hold the expected args), since an
    ///      under-length transfer payload must never slip past the meter.
    function _decodeAmount(bytes4 selector, bytes calldata data)
        internal
        pure
        returns (bool isValueMove, uint256 amount)
    {
        if (selector == SEL_TRANSFER || selector == SEL_APPROVE) {
            // transfer(address to, uint256 amount) / approve(address spender, uint256 amount)
            // calldata layout: [0:4]=selector, [4:36]=addr word, [36:68]=amount word.
            require(data.length >= 68, "ROLES: bad transfer/approve payload");
            amount = uint256(bytes32(data[36:68]));
            return (true, amount);
        }
        if (selector == SEL_TRANSFER_FROM) {
            // transferFrom(address from, address to, uint256 amount)
            // calldata layout: [0:4]=selector, [4:36]=from, [36:68]=to, [68:100]=amount.
            require(data.length >= 100, "ROLES: bad transferFrom payload");
            amount = uint256(bytes32(data[68:100]));
            return (true, amount);
        }
        return (false, 0);
    }

    /// @dev Apply per-tx and rolling per-epoch caps for (agent, token), updating
    ///      epoch state. Reverts if either bound is exceeded.
    function _meterSpend(address agent, address token, uint256 amount) internal {
        SpendingCap storage cap = caps[agent][token];
        if (!cap.set) revert CapNotSet(token);
        if (amount > cap.perTx) revert PerTxExceeded(amount, cap.perTx);

        EpochState storage es = epochs[agent][token];
        // Roll the epoch window if unset or elapsed.
        if (es.epochStart == 0 || block.timestamp >= es.epochStart + EPOCH_SECONDS) {
            es.epochStart = block.timestamp;
            es.spent = 0;
        }

        uint256 wouldSpend = es.spent + amount;
        if (wouldSpend > cap.perEpoch) revert PerEpochExceeded(wouldSpend, cap.perEpoch);

        es.spent = wouldSpend;
    }
}
