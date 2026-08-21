"use client";

import React, { useState } from "react";
import {
  useWallet,
  useToast,
  formatUSD,
  formatPercent,
  formatNumber,
  MOCK_POOL_STATE,
  MOCK_USER_POSITION,
} from "../providers";

export default function BorrowPage() {
  const { isConnected } = useWallet();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"borrow" | "repay">("borrow");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const borrowLimit = MOCK_USER_POSITION.borrowLimit;
  const currentBorrowed = MOCK_USER_POSITION.borrowed;
  const available = borrowLimit - currentBorrowed;

  const simulatedHealthFactor = amount && parseFloat(amount) > 0
    ? activeTab === "borrow"
      ? (MOCK_USER_POSITION.deposited * 0.85) /
        (currentBorrowed + parseFloat(amount))
      : (MOCK_USER_POSITION.deposited * 0.85) /
        Math.max(currentBorrowed - parseFloat(amount), 1)
    : MOCK_USER_POSITION.healthFactor;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      addToast("error", "Please enter a valid amount");
      return;
    }
    if (!isConnected) {
      addToast("error", "Please connect your wallet first");
      return;
    }
    if (activeTab === "borrow" && parseFloat(amount) > available) {
      addToast("error", "Amount exceeds your borrow limit");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    addToast(
      "success",
      `${activeTab === "borrow" ? "Borrowed" : "Repaid"} ${amount} USDC successfully!`
    );
    setAmount("");
    setIsLoading(false);
  };

  return (
    <div className="page-container" id="borrow-page">
      <div className="page-header">
        <h1 className="page-title">Borrow</h1>
        <p className="page-subtitle">Borrow against your collateral at competitive rates</p>
      </div>

      <div className="two-col-layout">
        {/* Borrow/Repay Form */}
        <div className="card-glass">
          <div className="tab-group">
            <button
              className={`tab ${activeTab === "borrow" ? "active" : ""}`}
              onClick={() => setActiveTab("borrow")}
              id="borrow-tab"
            >
              Borrow
            </button>
            <button
              className={`tab ${activeTab === "repay" ? "active" : ""}`}
              onClick={() => setActiveTab("repay")}
              id="repay-tab"
            >
              Repay
            </button>
          </div>

          <div className="input-group" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label className="input-label">Amount (USDC)</label>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {activeTab === "borrow"
                  ? `Available: ${formatUSD(available)}`
                  : `Owed: ${formatUSD(currentBorrowed)}`}
              </span>
            </div>
            <div className="input-with-max">
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                id="borrow-amount-input"
              />
              <button
                className="input-max-btn"
                onClick={() =>
                  setAmount(
                    activeTab === "borrow"
                      ? available.toString()
                      : currentBorrowed.toString()
                  )
                }
              >
                MAX
              </button>
            </div>
          </div>

          {/* Health Factor Simulation */}
          {amount && parseFloat(amount) > 0 && (
            <div
              className="card"
              style={{
                background: "rgba(10, 10, 26, 0.4)",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Projected Health Factor
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        simulatedHealthFactor > 1.5
                          ? "var(--accent-emerald)"
                          : simulatedHealthFactor > 1.1
                          ? "var(--accent-amber)"
                          : "var(--accent-rose)",
                    }}
                  >
                    {formatNumber(simulatedHealthFactor)}
                  </span>
                </div>
                <div className="health-bar">
                  <div
                    className={`health-bar-fill ${
                      simulatedHealthFactor > 1.5
                        ? "healthy"
                        : simulatedHealthFactor > 1.1
                        ? "warning"
                        : "danger"
                    }`}
                    style={{
                      width: `${Math.min((simulatedHealthFactor / 2) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Borrow APR</span>
                <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                  {formatPercent(MOCK_POOL_STATE.borrowRate)}
                </span>
              </div>
            </div>
          )}

          {simulatedHealthFactor < 1.1 && amount && parseFloat(amount) > 0 && (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              ⚠️ Warning: This borrow amount puts your position at risk of liquidation.
            </div>
          )}

          <button
            className={`btn ${activeTab === "borrow" ? "btn-primary" : "btn-success"} btn-full btn-lg`}
            onClick={handleSubmit}
            disabled={isLoading || !amount}
            id="borrow-submit-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner" /> Processing...
              </>
            ) : activeTab === "borrow" ? (
              "Borrow USDC"
            ) : (
              "Repay USDC"
            )}
          </button>
        </div>

        {/* Position Info */}
        <div>
          <div className="card-glass" style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
              Your Borrowing Position
            </h3>
            {isConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Collateral Deposited", value: formatUSD(MOCK_USER_POSITION.deposited) },
                  { label: "Current Borrow", value: formatUSD(currentBorrowed), color: "var(--accent-cyan)" },
                  { label: "Borrow Limit (75% LTV)", value: formatUSD(borrowLimit) },
                  { label: "Available to Borrow", value: formatUSD(available), color: "var(--accent-emerald)" },
                  {
                    label: "Health Factor",
                    value: formatNumber(MOCK_USER_POSITION.healthFactor),
                    color:
                      MOCK_USER_POSITION.healthFactor > 1.5
                        ? "var(--accent-emerald)"
                        : "var(--accent-amber)",
                  },
                  {
                    label: "Liquidation Threshold",
                    value: "85%",
                    color: "var(--accent-rose)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
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
            ) : (
              <p style={{ color: "var(--text-muted)" }}>Connect wallet to see your position</p>
            )}
          </div>

          <div className="card-glass">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              ℹ️ How Borrowing Works
            </h3>
            <ul
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                lineHeight: 1.8,
                paddingLeft: "16px",
              }}
            >
              <li>Deposit collateral to increase your borrow limit</li>
              <li>Borrow up to 75% of your collateral value (LTV)</li>
              <li>Interest accrues continuously at the current APR</li>
              <li>Positions below 85% health are liquidatable</li>
              <li>Repay anytime — no lock-up periods</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
