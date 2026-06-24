import Link from "next/link";
import { fetchDaoStats, fetchMembers } from "../lib/client";
import { formatAddress } from "../lib/utils";

export default async function MembersPage() {
  const [members, stats] = await Promise.all([fetchMembers(), fetchDaoStats()]);

  const quorumRequired = Math.ceil((stats.totalSupply * stats.quorumFraction) / 100);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Members & Quorum</h1>
        <p className="text-sm text-muted">
          {members.length} members · {stats.quorumFraction}% quorum threshold · {quorumRequired} of{" "}
          {stats.totalSupply} votes required
        </p>
      </div>

      {/* Quorum math box */}
      <div className="bg-surface-2 border border-border rounded-lg p-4 mb-8 space-y-2">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest">
          Quorum Calculation
        </h2>
        <div className="text-sm text-ink">
          {stats.quorumFraction}% of {stats.totalSupply} total supply ={" "}
          <span className="font-semibold text-accent-2">{quorumRequired} votes</span> required to
          reach quorum
        </div>
        <div className="text-xs text-muted">
          Equal weight (1 member = 1 vote, v1). Each member delegates their vote to their registered
          agent.
        </div>
      </div>

      {/* Members table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left px-4 py-3 font-normal">Member</th>
              <th className="text-left px-4 py-3 font-normal">Delegated Agent</th>
              <th className="text-left px-4 py-3 font-normal">Weight</th>
              <th className="text-left px-4 py-3 font-normal">Participation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.address} className="hover:bg-surface-3 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-ink">{member.name ?? formatAddress(member.address)}</div>
                  <div className="font-mono text-muted/70 text-xs">
                    {formatAddress(member.address)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {member.delegatedAgent ? (
                    <Link href="/agents" className="font-mono text-accent-2 hover:underline">
                      {formatAddress(member.delegatedAgent)}
                    </Link>
                  ) : (
                    <span className="text-muted italic">No agent delegated</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-ink">{member.votingWeight}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${member.participationRate * 100}%` }}
                      />
                    </div>
                    <span className="text-muted">
                      {Math.round(member.participationRate * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-muted">
        <span className="text-warn font-mono">Note:</span> Voting power is delegated to agent smart
        accounts at the token level (ERC721Votes.delegate()). Direct member voting is also possible
        if no agent is delegated.
      </div>
    </div>
  );
}
