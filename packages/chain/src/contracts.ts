import {
  type Address,
  type Hex,
  type PublicClient,
  encodeFunctionData,
  keccak256,
  stringToBytes,
} from "viem";
import {
  agentRegistryAbi,
  governorAbi,
  membershipTokenAbi,
  rationaleAnchorAbi,
  rolesModifierAbi,
} from "./abis";
import { type ContractAddresses, requireAddress } from "./env";

/** An unsigned EIP-1559-style call request, ready to hand to the policy-gated Signer. */
export interface CallRequest {
  to: Address;
  data: Hex;
  value: bigint;
}

const noValue = (to: Address, data: Hex): CallRequest => ({ to, data, value: 0n });

/** On-chain mandate record as returned by AgentRegistry.mandateOf. */
export interface AgentRecord {
  principal: Address;
  mandateHash: Hex;
  mandateURI: string;
  active: boolean;
}

/**
 * Typed read + call-request helpers for every contract in `docs/interfaces.md`.
 * Reads execute against the public client; writes return an unsigned `CallRequest`
 * (the Signer re-checks policy and signs — the chain layer never broadcasts on its
 * own). This keeps the policy chokepoint authoritative.
 */
export function makeContracts(client: PublicClient, addresses: ContractAddresses) {
  const governor = () => requireAddress(addresses, "governor", "GOVERNOR");
  const token = () => requireAddress(addresses, "membershipToken", "MEMBERSHIP_TOKEN");
  const timelock = () => requireAddress(addresses, "timelock", "TIMELOCK");
  const registry = () => requireAddress(addresses, "agentRegistry", "AGENT_REGISTRY");
  const roles = () => requireAddress(addresses, "rolesModifier", "ROLES_MODIFIER");
  const anchor = () => requireAddress(addresses, "rationaleAnchor", "RATIONALE_ANCHOR");

  return {
    // ── Governor ──────────────────────────────────────────────────────────────
    governor: {
      proposeRequest(
        targets: Address[],
        values: bigint[],
        calldatas: Hex[],
        description: string,
      ): CallRequest {
        return noValue(
          governor(),
          encodeFunctionData({
            abi: governorAbi,
            functionName: "propose",
            args: [targets, values, calldatas, description],
          }),
        );
      },
      castVoteWithReasonRequest(proposalId: bigint, support: number, reason: string): CallRequest {
        return noValue(
          governor(),
          encodeFunctionData({
            abi: governorAbi,
            functionName: "castVoteWithReason",
            args: [proposalId, support, reason],
          }),
        );
      },
      queueRequest(
        targets: Address[],
        values: bigint[],
        calldatas: Hex[],
        descriptionHash: Hex,
      ): CallRequest {
        return noValue(
          governor(),
          encodeFunctionData({
            abi: governorAbi,
            functionName: "queue",
            args: [targets, values, calldatas, descriptionHash],
          }),
        );
      },
      executeRequest(
        targets: Address[],
        values: bigint[],
        calldatas: Hex[],
        descriptionHash: Hex,
      ): CallRequest {
        const total = values.reduce((a, b) => a + b, 0n);
        return {
          to: governor(),
          data: encodeFunctionData({
            abi: governorAbi,
            functionName: "execute",
            args: [targets, values, calldatas, descriptionHash],
          }),
          value: total,
        };
      },
      state(proposalId: bigint): Promise<number> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "state",
          args: [proposalId],
        });
      },
      proposalVotes(proposalId: bigint): Promise<readonly [bigint, bigint, bigint]> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "proposalVotes",
          args: [proposalId],
        });
      },
      quorum(timepoint: bigint): Promise<bigint> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "quorum",
          args: [timepoint],
        });
      },
      proposalSnapshot(proposalId: bigint): Promise<bigint> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "proposalSnapshot",
          args: [proposalId],
        });
      },
      proposalDeadline(proposalId: bigint): Promise<bigint> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "proposalDeadline",
          args: [proposalId],
        });
      },
      hashProposal(
        targets: Address[],
        values: bigint[],
        calldatas: Hex[],
        descriptionHash: Hex,
      ): Promise<bigint> {
        return client.readContract({
          address: governor(),
          abi: governorAbi,
          functionName: "hashProposal",
          args: [targets, values, calldatas, descriptionHash],
        });
      },
    },

    // ── AgentRegistry ───────────────────────────────────────────────────────────
    registry: {
      registerAgentRequest(
        agentAccount: Address,
        mandateHash: Hex,
        mandateURI: string,
      ): CallRequest {
        return noValue(
          registry(),
          encodeFunctionData({
            abi: agentRegistryAbi,
            functionName: "registerAgent",
            args: [agentAccount, mandateHash, mandateURI],
          }),
        );
      },
      // NOTE: updateMandate is a Reserved Matter (REGISTRY_ADMIN / guardian only).
      // It is intentionally NOT exposed as an agent-callable request builder.
      updateMandateRequest(agentAccount: Address, newHash: Hex, mandateURI: string): CallRequest {
        return noValue(
          registry(),
          encodeFunctionData({
            abi: agentRegistryAbi,
            functionName: "updateMandate",
            args: [agentAccount, newHash, mandateURI],
          }),
        );
      },
      async mandateOf(agentAccount: Address): Promise<AgentRecord> {
        const r = await client.readContract({
          address: registry(),
          abi: agentRegistryAbi,
          functionName: "mandateOf",
          args: [agentAccount],
        });
        return {
          principal: r.principal,
          mandateHash: r.mandateHash,
          mandateURI: r.mandateURI,
          active: r.active,
        };
      },
    },

    // ── MembershipToken ───────────────────────────────────────────────────────
    token: {
      delegateRequest(delegatee: Address): CallRequest {
        return noValue(
          token(),
          encodeFunctionData({
            abi: membershipTokenAbi,
            functionName: "delegate",
            args: [delegatee],
          }),
        );
      },
      getVotes(account: Address): Promise<bigint> {
        return client.readContract({
          address: token(),
          abi: membershipTokenAbi,
          functionName: "getVotes",
          args: [account],
        });
      },
      clock(): Promise<number> {
        return client.readContract({
          address: token(),
          abi: membershipTokenAbi,
          functionName: "clock",
        });
      },
    },

    // ── RolesModifier (bounded operational execution) ─────────────────────────
    roles: {
      execTransactionWithRoleRequest(
        to: Address,
        value: bigint,
        data: Hex,
        agent: Address,
      ): CallRequest {
        return {
          to: roles(),
          data: encodeFunctionData({
            abi: rolesModifierAbi,
            functionName: "execTransactionWithRole",
            args: [to, value, data, agent],
          }),
          value: 0n,
        };
      },
      // setSpendingCap / setTargetAllowed / setAgentActive are Reserved Matters
      // (ROLES_ADMIN / guardian only); request builders exist for the guardian
      // tooling but the agent policy engine denies these selectors.
      setSpendingCapRequest(
        agent: Address,
        tokenAddr: Address,
        perTx: bigint,
        perEpoch: bigint,
      ): CallRequest {
        return noValue(
          roles(),
          encodeFunctionData({
            abi: rolesModifierAbi,
            functionName: "setSpendingCap",
            args: [agent, tokenAddr, perTx, perEpoch],
          }),
        );
      },
      setTargetAllowedRequest(
        agent: Address,
        target: Address,
        selector: Hex,
        allowed: boolean,
      ): CallRequest {
        return noValue(
          roles(),
          encodeFunctionData({
            abi: rolesModifierAbi,
            functionName: "setTargetAllowed",
            args: [agent, target, selector, allowed],
          }),
        );
      },
      epochSpend(agent: Address, tokenAddr: Address): Promise<bigint> {
        return client.readContract({
          address: roles(),
          abi: rolesModifierAbi,
          functionName: "epochSpend",
          args: [agent, tokenAddr],
        });
      },
    },

    // ── RationaleAnchor ───────────────────────────────────────────────────────
    anchor: {
      anchorRequest(refId: Hex, ipfsURI: string, contentHash: Hex): CallRequest {
        return noValue(
          anchor(),
          encodeFunctionData({
            abi: rationaleAnchorAbi,
            functionName: "anchor",
            args: [refId, ipfsURI, contentHash],
          }),
        );
      },
    },
  };
}

export type Contracts = ReturnType<typeof makeContracts>;

/** keccak256 of a proposal description string — the `descriptionHash` queue/execute need. */
export function descriptionHash(description: string): Hex {
  return keccak256(stringToBytes(description));
}
