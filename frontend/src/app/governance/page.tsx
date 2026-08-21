"use client";

import React, { useState } from "react";
import {
  useWallet,
  useToast,
  formatUSD,
  formatNumber,
  MOCK_PROPOSALS,
  truncateAddress,
} from "../providers";

export default function GovernancePage() {
  const { isConnected } = useWallet();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"proposals" | "stake">("proposals");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [votingOn, setVotingOn] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!isConnected) {
      addToast("error", "Connect your wallet to vote");
      return;
    }
    setVotingOn(proposalId);
    await new Promise((r) => setTimeout(r, 1500));
    addToast("success", `Vote ${support ? "for" : "against"} proposal #${proposalId} submitted!`);
    setVotingOn(null);
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      addToast("error", "Enter a valid amount");
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    addToast("success", `Staked ${stakeAmount} SLT governance tokens!`);
    setStakeAmount("");
    setIsLoading(false);
  };

  return (
    <div className="page-container" id="governance-page">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className="page-title">Governance</h1>
            <p className="page-subtitle">Shape the protocol through community proposals</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            id="create-proposal-btn"
          >
            + New Proposal
          </button>
        </div>
      </div>

      {/* Governance Stats */}
      <div className="stat-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">Total Staked</div>
          <div className="stat-value">{formatUSD(850000)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Proposals</div>
          <div className="stat-value">
            {MOCK_PROPOSALS.filter((p) => p.status === "Active").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Voting Power</div>
          <div className="stat-value">{isConnected ? "15,000" : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Staked SLT</div>
          <div className="stat-value">{isConnected ? "15,000" : "—"}</div>
        </div>
      </div>

      <div className="tab-group" style={{ maxWidth: "300px" }}>
        <button
          className={`tab ${activeTab === "proposals" ? "active" : ""}`}
          onClick={() => setActiveTab("proposals")}
        >
          Proposals
        </button>
        <button
          className={`tab ${activeTab === "stake" ? "active" : ""}`}
          onClick={() => setActiveTab("stake")}
        >
          Stake SLT
        </button>
      </div>

      {activeTab === "proposals" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {MOCK_PROPOSALS.map((proposal) => {
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
            const againstPercent = 100 - forPercent;
            const timeLeft = proposal.endTime - Date.now();
            const isActive = proposal.status === "Active" && timeLeft > 0;

            return (
              <div className="card-glass" key={proposal.id} id={`proposal-${proposal.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <span
                      className={`badge ${
                        proposal.status === "Active"
                          ? "badge-info"
                          : proposal.status === "Passed"
                          ? "badge-success"
                          : "badge-danger"
                      }`}
                      style={{ marginBottom: "8px", display: "inline-block" }}
                    >
                      {proposal.status}
                    </span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                      #{proposal.id} — {proposal.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    by {truncateAddress(proposal.creator)}
                  </span>
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: 1.6 }}>
                  {proposal.description}
                </p>

                {/* Voting Bar */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                    <span style={{ color: "var(--accent-emerald)" }}>
                      For: {formatNumber(forPercent, 1)}% ({formatUSD(proposal.votesFor)})
                    </span>
                    <span style={{ color: "var(--accent-rose)" }}>
                      Against: {formatNumber(againstPercent, 1)}% ({formatUSD(proposal.votesAgainst)})
                    </span>
                  </div>
                  <div className="vote-bar">
                    <div className="vote-bar-for" style={{ width: `${forPercent}%` }} />
                    <div className="vote-bar-against" style={{ width: `${againstPercent}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    <span>{proposal.totalVoters} voters</span>
                    <span>
                      {isActive
                        ? `${Math.floor(timeLeft / 3600000)}h remaining`
                        : "Voting ended"}
                    </span>
                  </div>
                </div>

                {/* Vote Buttons */}
                {isActive && isConnected && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleVote(proposal.id, true)}
                      disabled={votingOn === proposal.id}
                      id={`vote-for-${proposal.id}`}
                    >
                      {votingOn === proposal.id ? "Voting..." : "👍 Vote For"}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleVote(proposal.id, false)}
                      disabled={votingOn === proposal.id}
                      id={`vote-against-${proposal.id}`}
                    >
                      {votingOn === proposal.id ? "Voting..." : "👎 Vote Against"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Staking Section */
        <div className="two-col-layout">
          <div className="card-glass">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
              Stake SLT Tokens
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: 1.6 }}>
              Stake your SLT governance tokens to gain voting power. Your
              voting weight equals your staked balance.
            </p>

            <div className="input-group" style={{ marginBottom: "16px" }}>
              <label className="input-label">Amount to Stake</label>
              <div className="input-with-max">
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  id="stake-amount-input"
                />
                <button className="input-max-btn" onClick={() => setStakeAmount("25000")}>
                  MAX
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleStake}
              disabled={isLoading}
              id="stake-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="spinner" /> Staking...
                </>
              ) : (
                "Stake SLT"
              )}
            </button>
          </div>

          <div className="card-glass">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
              Staking Info
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Your Staked", value: isConnected ? "15,000 SLT" : "—" },
                { label: "Your Voting Power", value: isConnected ? "15,000" : "—" },
                { label: "% of Total", value: isConnected ? "1.76%" : "—" },
                { label: "Min. to Propose", value: "10,000 SLT" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.05)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {item.label}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "20px" }}>
              Create Proposal
            </h2>

            <div className="input-group" style={{ marginBottom: "14px" }}>
              <label className="input-label">Title</label>
              <input className="input-field" placeholder="Proposal title..." id="proposal-title-input" />
            </div>

            <div className="input-group" style={{ marginBottom: "14px" }}>
              <label className="input-label">Description</label>
              <textarea
                className="input-field"
                placeholder="Describe your proposal..."
                style={{ minHeight: "100px", resize: "vertical" }}
                id="proposal-desc-input"
              />
            </div>

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label className="input-label">Action Type</label>
              <select className="input-field" id="proposal-action-select">
                <option value="collateral">Update Collateral Factor</option>
                <option value="liquidation">Update Liquidation Threshold</option>
                <option value="interest">Update Interest Rate</option>
                <option value="reserve">Update Reserve Factor</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  addToast("success", "Proposal created successfully!");
                  setShowCreateModal(false);
                }}
                id="submit-proposal-btn"
              >
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
