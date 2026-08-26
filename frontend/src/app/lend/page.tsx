"use client";

import React, { useState } from "react";
import {
  useWallet,
  useToast,
  formatUSD,
  formatPercent,
  MOCK_POOL_STATE,
} from "../providers";

export default function LendPage() {
  const { isConnected, tokenBalance, userPosition, executeTransaction } = useWallet();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const availableBalance = activeTab === "deposit" ? tokenBalance : userPosition.deposited;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      addToast("error", "Please enter a valid positive amount");
      return;
    }
    if (!isConnected) {
      addToast("error", "Please connect your Stellar wallet first");
      return;
    }
    if (numAmount > availableBalance) {
      addToast(
        "error",
        `Insufficient ${activeTab === "deposit" ? "wallet" : "deposited"} balance`
      );
      return;
    }

    setIsLoading(true);
    const result = await executeTransaction(activeTab, numAmount);
    setIsLoading(false);

    if (result.success) {
      addToast(
        "success",
        `Successfully ${activeTab === "deposit" ? "deposited" : "withdrawn"} ${numAmount.toLocaleString()} USDC to lending pool!`,
        result.txHash
      );
      setAmount("");
    } else {
      addToast("error", result.error || "Transaction failed");
    }
  };

  return (
    <div className="page-container" id="lend-page">
      <div className="page-header">
        <h1 className="page-title">Lend</h1>
        <p className="page-subtitle">Deposit assets into Soroban pools to earn passive yield</p>
      </div>

      <div className="two-col-layout">
        {/* Deposit/Withdraw Form */}
        <div className="card-glass">
          <div className="tab-group">
            <button
              className={`tab ${activeTab === "deposit" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("deposit");
                setAmount("");
              }}
              id="deposit-tab"
            >
              Deposit
            </button>
            <button
              className={`tab ${activeTab === "withdraw" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("withdraw");
                setAmount("");
              }}
              id="withdraw-tab"
            >
              Withdraw
            </button>
          </div>

          <div className="input-group" style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label className="input-label">Amount (USDC)</label>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {activeTab === "deposit" ? "Wallet Balance" : "Deposited"}:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{formatUSD(availableBalance)}</strong>
              </span>
            </div>
            <div className="input-with-max">
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                id="lend-amount-input"
              />
              <button
                className="input-max-btn"
                onClick={() => setAmount(availableBalance.toString())}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div
              className="card"
              style={{
                background: "rgba(10, 10, 26, 0.4)",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {activeTab === "deposit" ? "You will deposit" : "You will receive"}
                </span>
                <span style={{ fontWeight: 600 }}>{formatUSD(parseFloat(amount))} USDC</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Supply APY</span>
                <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>
                  {formatPercent(MOCK_POOL_STATE.supplyRate)}
                </span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubmit}
            disabled={isLoading || !amount}
            id="lend-submit-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} /> Signing & Submitting...
              </>
            ) : activeTab === "deposit" ? (
              "Deposit to Pool"
            ) : (
              "Withdraw from Pool"
            )}
          </button>
        </div>

        {/* Pool Info */}
        <div>
          <div className="card-glass" style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
              Pool Statistics
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Total Deposits", value: formatUSD(MOCK_POOL_STATE.totalDeposits), color: "" },
                { label: "Total Borrows", value: formatUSD(MOCK_POOL_STATE.totalBorrows), color: "" },
                {
                  label: "Supply APY",
                  value: formatPercent(MOCK_POOL_STATE.supplyRate),
                  color: "var(--accent-emerald)",
                },
                {
                  label: "Utilization",
                  value: formatPercent(MOCK_POOL_STATE.utilizationRate),
                  color: "var(--accent-cyan)",
                },
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
                  <span
                    style={{
                      fontWeight: 600,
                      color: item.color || "var(--text-primary)",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "12px" }}>
              Your Deposit Summary
            </h3>
            {isConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Deposited</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                    {formatUSD(userPosition.deposited)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Wallet Available</span>
                  <span style={{ fontWeight: 600 }}>{formatUSD(tokenBalance)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Collateral Power</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>
                    {formatUSD(userPosition.borrowLimit)} (75% LTV)
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Connect your Stellar wallet to see your position
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
