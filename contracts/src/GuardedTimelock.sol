// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title GuardedTimelock
/// @notice A TimelockController whose `minDelay` is a Reserved Matter: it can be
///         changed ONLY by a guardian holding `TIMELOCK_ADMIN`, never by the
///         Governor.
///
/// @dev    WHY THIS EXISTS (constitutional separation, spec §6.3 / §14):
///         The stock OZ `TimelockController.updateDelay` gates on
///         `msg.sender == address(this)` — the timelock administers its own delay
///         via a scheduled self-call. That means an ordinary Governor proposal
///         could schedule `timelock.updateDelay(...)`; when the timelock executes
///         the batch, the caller IS the timelock, so it would succeed. That
///         violates the spec's hard requirement that the Governor "literally lacks
///         the role to change its own timelock delay."
///
///         This subclass closes that path WITHOUT changing the external selector
///         (`updateDelay(uint256)` stays the reserved selector in
///         `reserved-matters.yaml` / `docs/interfaces.md`). It re-gates the
///         function on a guardian-held `TIMELOCK_ADMIN` role and tracks the delay
///         in a shadow variable surfaced through the (virtual) `getMinDelay()`
///         getter — which is the single value every legitimate reader, including
///         the base `_schedule`, consults. The deploy script additionally revokes
///         the timelock's self-administration so no proposal can self-grant a
///         role and escalate. Proven by `test_GovernorLacksRoleToChangeTimelockDelay`.
contract GuardedTimelock is TimelockController {
    /// @notice Reserved Matter role: change the timelock minimum delay (the
    ///         guardian veto window). Held by the guardian multisig.
    bytes32 public constant TIMELOCK_ADMIN = keccak256("TIMELOCK_ADMIN");

    /// @dev Shadow of the active min delay. Authoritative once set; before then,
    ///      `getMinDelay()` falls back to the base constructor value.
    uint256 private _guardedMinDelay;
    bool private _guardedSet;

    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin)
        TimelockController(minDelay, proposers, executors, admin)
    {}

    /// @notice Change the minimum delay. RESERVED MATTER — `TIMELOCK_ADMIN` only.
    /// @dev Overrides the stock self-administration model. Because the Governor /
    ///      timelock-as-executor never holds `TIMELOCK_ADMIN`, a Governor proposal
    ///      that calls this reverts; only a direct guardian transaction succeeds.
    function updateDelay(uint256 newDelay) external override onlyRole(TIMELOCK_ADMIN) {
        emit MinDelayChange(getMinDelay(), newDelay);
        _guardedMinDelay = newDelay;
        _guardedSet = true;
    }

    /// @notice Current minimum delay. The single source of truth read by callers
    ///         and by the inherited `_schedule` (which calls this getter, not the
    ///         base's private field).
    function getMinDelay() public view override returns (uint256) {
        return _guardedSet ? _guardedMinDelay : super.getMinDelay();
    }
}
