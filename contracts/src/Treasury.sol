// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Treasury
/// @notice Thin vault that holds ETH and ERC20 assets. Funds move ONLY at the
///         direction of the owner, which is the TimelockController. Because the
///         Timelock's PROPOSER/EXECUTOR is the DaoGovernor and its CANCELLER is
///         the guardian, treasury spends only ever happen through an executed
///         proposal that survived the veto window.
/// @dev    Kept intentionally minimal (spec §6 / §21: a Safe owned by the Timelock
///         is the production target; this is the in-repo stand-in for tests and
///         the scripted end-to-end run).
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event Deposited(address indexed from, uint256 amount);
    event WithdrawnETH(address indexed to, uint256 amount);
    event WithdrawnERC20(address indexed token, address indexed to, uint256 amount);

    error ETHTransferFailed();

    /// @param owner_ The TimelockController address.
    constructor(address owner_) Ownable(owner_) {}

    /// @notice Accept plain ETH transfers.
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw ETH. Only the Timelock (owner) — i.e. only via an executed
    ///         proposal — can move funds.
    function withdrawETH(address to, uint256 amount) external onlyOwner {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert ETHTransferFailed();
        emit WithdrawnETH(to, amount);
    }

    /// @notice Withdraw an ERC20 balance. Owner (Timelock) only.
    function withdrawERC20(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit WithdrawnERC20(token, to, amount);
    }
}
