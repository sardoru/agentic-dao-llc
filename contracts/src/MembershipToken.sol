// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Votes} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title MembershipToken
/// @notice Soulbound (non-transferable) ERC721 membership token with native
///         delegation (ERC721Votes). One token per member; voting weight is a
///         flat 1 per token (equal weight, one-member-one-vote in v1).
/// @dev    Constitutional separation: `MEMBERSHIP_ADMIN` (mint/burn = admit/remove
///         members) is a Reserved Matter held by the guardian multisig. The
///         DaoGovernor holds NONE of the AccessControl roles on this contract.
///
///         Members `delegate()` (inherited from Votes) their unit of voting power
///         to an agent account, which is what lets agents `propose`/`castVote` in
///         the Governor.
///
///         Clock runs in TIMESTAMP mode so the Governor's timing is independent of
///         block production rate (IERC6372).
contract MembershipToken is ERC721, ERC721Votes, AccessControl {
    /// @notice Reserved Matter role: admit/remove members (mint/burn membership).
    ///         Held by the guardian multisig; never by the Governor.
    bytes32 public constant MEMBERSHIP_ADMIN = keccak256("MEMBERSHIP_ADMIN");

    /// @dev Thrown when any transfer or approval is attempted (soulbound).
    error Soulbound();

    constructor(string memory name_, string memory symbol_, address admin)
        ERC721(name_, symbol_)
        EIP712(name_, "1")
    {
        // Bootstrap admin (the deployer at construction time). The deploy script
        // grants DEFAULT_ADMIN_ROLE + MEMBERSHIP_ADMIN to the guardian multisig
        // and renounces the deployer's bootstrap role at the end.
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MEMBERSHIP_ADMIN, admin);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Membership administration (Reserved Matter — MEMBERSHIP_ADMIN only)
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Admit a member by minting their soulbound token.
    /// @dev Reverts via AccessControl if caller lacks MEMBERSHIP_ADMIN.
    function mintMembership(address member, uint256 tokenId) external onlyRole(MEMBERSHIP_ADMIN) {
        _safeMint(member, tokenId);
    }

    /// @notice Remove a member by burning their token.
    function burnMembership(uint256 tokenId) external onlyRole(MEMBERSHIP_ADMIN) {
        _burn(tokenId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Soulbound enforcement + voting bookkeeping
    // ──────────────────────────────────────────────────────────────────────────

    /// @dev Single chokepoint for mint/transfer/burn. Allow mint (from == 0) and
    ///      burn (to == 0); revert any true transfer (from != 0 && to != 0).
    ///      Still calls super so ERC721Votes keeps voting units consistent on
    ///      mint/burn.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Votes)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert Soulbound();
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Block approvals outright — a soulbound token can never be moved, so an
    ///      approval is meaningless and we refuse it for clarity/defense in depth.
    function approve(address, uint256) public pure override {
        revert Soulbound();
    }

    /// @dev Block operator approvals for the same reason.
    function setApprovalForAll(address, bool) public pure override {
        revert Soulbound();
    }

    /// @dev Resolve the diamond between ERC721 and ERC721Votes for the batch
    ///      balance hook. We never mint in batches (one token per member), but the
    ///      override is required by the compiler.
    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Votes) {
        super._increaseBalance(account, amount);
    }

    /// @dev Flat voting weight: exactly 1 unit per token held, regardless of
    ///      tokenId. (Overrides ERC721Votes' default of returning the balance,
    ///      which would also be 1 here since we only ever mint one token per
    ///      member — but we pin it explicitly to make the invariant unambiguous.)
    function _getVotingUnits(address account) internal view override returns (uint256) {
        return balanceOf(account);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IERC6372 clock — TIMESTAMP mode
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Current timepoint, in seconds (timestamp clock mode).
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    /// @notice Machine-readable clock description.
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ERC165
    // ──────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
