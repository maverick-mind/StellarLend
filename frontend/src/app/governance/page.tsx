"use client";

import React, { useState } from "react";
import {
  useWallet,
  useToast,
  formatUSD,
  formatNumber,
  truncateAddress,
} from "../providers";

export default function GovernancePage() {
  const {
    isConnected,
    stakedGovBalance,
    tokenBalance,
    proposals,
    executeTransaction,
  } = useWallet();

  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"proposals" | "stake">("proposals");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [votingOn, setVotingOn] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const currentTime = React.useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0
  );

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!isConnected) {
      addToast("error", "Please connect your Stellar wallet to vote");
      return;
    }
    if (stakedGovBalance <= 0) {
      addToast("error", "You need to stake SLT tokens to obtain voting power");
      return;
    }

    setVotingOn(proposalId);
    const result = await executeTransaction("vote", stakedGovBalance, {
      proposalId,
      support,
    });
    setVotingOn(null);

    if (result.success) {
      addToast(
        "success",
        `Voted ${support ? "FOR" : "AGAINST"} Proposal #${proposalId} with ${stakedGovBalance.toLocaleString()} voting power!`,
        result.txHash
      );
    } else {
      addToast("error", result.error || "Vote submission failed");
    }
  };

  const handleStake = async () => {
    const numAmount = parseFloat(stakeAmount);
    if (!stakeAmount || isNaN(numAmount) || numAmount <= 0) {
      addToast("error", "Enter a valid positive amount");
      return;
    }
    if (!isConnected) {
      addToast("error", "Please connect your Stellar wallet first");
      return;
    }

    setIsLoading(true);
    const result = await executeTransaction("stake", numAmount);
    setIsLoading(false);

    if (result.success) {
      addToast(
        "success",
        `Successfully staked ${numAmount.toLocaleString()} SLT tokens for DAO voting power!`,
        result.txHash
      );
      setStakeAmount("");
    } else {
      addToast("error", result.error || "Staking failed");
    }
  };

  return (
    <div className="page-container" id="governance-page">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className="page-title">Governance</h1>
            <p className="page-subtitle">Shape the StellarLend protocol through community proposals</p>
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
          <div className="stat-label">Total Protocol Staked</div>
          <div className="stat-value">{formatUSD(850000)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Proposals</div>
          <div className="stat-value">
            {proposals.filter((p) => p.status === "Active").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Voting Power</div>
          <div className="stat-value" style={{ color: "var(--accent-emerald)" }}>
            {isConnected ? `${formatNumber(stakedGovBalance, 0)} votes` : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Staked SLT</div>
          <div className="stat-value" style={{ color: "var(--accent-cyan)" }}>
            {isConnected ? `${formatNumber(stakedGovBalance, 0)} SLT` : "—"}
          </div>
        </div>
      </div>

      <div className="tab-group" style={{ maxWidth: "300px" }}>
        <button
          className={`tab ${activeTab === "proposals" ? "active" : ""}`}
          onClick={() => setActiveTab("proposals")}
        >
          Proposals ({proposals.length})
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
          {proposals.map((proposal) => {
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
            const againstPercent = 100 - forPercent;
            const timeLeft = currentTime > 0 ? proposal.endTime - currentTime : 86400000;
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
                    by {truncateAddress(proposal.creator, 6)}
                  </span>
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: 1.6 }}>
                  {proposal.description}
                </p>

                {/* Voting Bar */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                    <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                      For: {formatNumber(forPercent, 1)}% ({formatUSD(proposal.votesFor)})
                    </span>
                    <span style={{ color: "var(--accent-rose)", fontWeight: 600 }}>
                      Against: {formatNumber(againstPercent, 1)}% ({formatUSD(proposal.votesAgainst)})
                    </span>
                  </div>
                  <div className="vote-bar">
                    <div className="vote-bar-for" style={{ width: `${forPercent}%` }} />
                    <div className="vote-bar-against" style={{ width: `${againstPercent}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    <span>{proposal.totalVoters} community votes</span>
                    <span>
                      {isActive
                        ? `${Math.max(1, Math.floor(timeLeft / 3600000))}h remaining`
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
                      {votingOn === proposal.id ? (
                        <>
                          <span className="spinner" style={{ width: 14, height: 14 }} /> Signing...
                        </>
                      ) : (
                        "👍 Vote For"
                      )}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleVote(proposal.id, false)}
                      disabled={votingOn === proposal.id}
                      id={`vote-against-${proposal.id}`}
                    >
                      {votingOn === proposal.id ? (
                        <>
                          <span className="spinner" style={{ width: 14, height: 14 }} /> Signing...
                        </>
                      ) : (
                        "👎 Vote Against"
                      )}
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
              Stake SLT Governance Tokens
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: 1.6 }}>
              Stake your SLT governance tokens to gain on-chain voting power. Your
              voting weight equals your active staked balance.
            </p>

            <div className="input-group" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="input-label">Amount to Stake</label>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Available: {formatNumber(tokenBalance, 0)} SLT
                </span>
              </div>
              <div className="input-with-max">
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  id="stake-amount-input"
                />
                <button
                  className="input-max-btn"
                  onClick={() => setStakeAmount(tokenBalance.toString())}
                >
                  MAX
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleStake}
              disabled={isLoading || !stakeAmount}
              id="stake-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} /> Signing with Wallet...
                </>
              ) : (
                "Stake SLT Tokens"
              )}
            </button>
          </div>

          <div className="card-glass">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
              Your Governance Status
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Your Staked Balance", value: isConnected ? `${formatNumber(stakedGovBalance, 0)} SLT` : "—", color: "var(--accent-cyan)" },
                { label: "Active Voting Weight", value: isConnected ? `${formatNumber(stakedGovBalance, 0)} votes` : "—", color: "var(--accent-emerald)" },
                { label: "Proposal Quorum", value: "100,000 SLT", color: "" },
                { label: "Min. to Submit Proposal", value: "10,000 SLT", color: "" },
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
                  <span style={{ fontWeight: 600, color: item.color || "var(--text-primary)" }}>
                    {item.value}
                  </span>
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
              Create Community Proposal
            </h2>

            <div className="input-group" style={{ marginBottom: "14px" }}>
              <label className="input-label">Proposal Title</label>
              <input
                className="input-field"
                placeholder="e.g. Update Collateral Factor to 80%"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                id="proposal-title-input"
              />
            </div>

            <div className="input-group" style={{ marginBottom: "14px" }}>
              <label className="input-label">Description</label>
              <textarea
                className="input-field"
                placeholder="Explain the motivation and impact of this parameter update..."
                style={{ minHeight: "100px", resize: "vertical" }}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                id="proposal-desc-input"
              />
            </div>

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label className="input-label">Target Parameter Action</label>
              <select className="input-field" id="proposal-action-select">
                <option value="collateral">Update Collateral Factor (LTV)</option>
                <option value="liquidation">Update Liquidation Threshold</option>
                <option value="interest">Update Interest Rate Slopes</option>
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
                  if (!newTitle) {
                    addToast("error", "Please provide a title for the proposal");
                    return;
                  }
                  addToast("success", `Proposal "${newTitle}" created and active for voting!`);
                  setNewTitle("");
                  setNewDesc("");
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
