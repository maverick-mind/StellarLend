"use client";

import React from "react";
import Link from "next/link";
import { formatUSD, MOCK_POOL_STATE } from "./providers";

export default function HomePage() {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero-badge">
          ⚡ Built on Stellar Soroban &bull; Testnet Live
        </div>

        <h1>
          The Future of <br />
          <span>Decentralized Lending</span>
        </h1>

        <p>
          Deposit assets, borrow against collateral, and earn yield on the
          Stellar network. Ultra-fast 5-second finality with institutional-grade
          smart contract security.
        </p>

        <div className="hero-actions">
          <Link href="/lend" className="btn btn-primary btn-lg" id="hero-lend-btn">
            Start Lending →
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg" id="hero-dashboard-btn">
            View Dashboard
          </Link>
        </div>

        <div className="hero-stats">
          <div>
            <div className="hero-stat-value">{formatUSD(MOCK_POOL_STATE.totalDeposits)}</div>
            <div className="hero-stat-label">Total Value Locked</div>
          </div>
          <div>
            <div className="hero-stat-value">{MOCK_POOL_STATE.borrowRate}%</div>
            <div className="hero-stat-label">Borrow APR</div>
          </div>
          <div>
            <div className="hero-stat-value">{MOCK_POOL_STATE.supplyRate}%</div>
            <div className="hero-stat-label">Supply APY</div>
          </div>
          <div>
            <div className="hero-stat-value">5s</div>
            <div className="hero-stat-label">Finality</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="page-container" id="features">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🏦</div>
            <h3 className="feature-title">Lending Pools</h3>
            <p className="feature-desc">
              Deposit your assets into lending pools and earn passive yield from
              borrower interest payments. Withdraw anytime.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3 className="feature-title">Collateralized Borrowing</h3>
            <p className="feature-desc">
              Borrow against your deposited collateral with dynamic interest
              rates based on real-time utilization.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔮</div>
            <h3 className="feature-title">Price Oracle</h3>
            <p className="feature-desc">
              Real-time price feeds power collateral valuation through
              inter-contract communication on Soroban.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h3 className="feature-title">Liquidation Engine</h3>
            <p className="feature-desc">
              Under-collateralized positions are automatically liquidatable,
              ensuring protocol solvency with liquidator incentives.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗳️</div>
            <h3 className="feature-title">DAO Governance</h3>
            <p className="feature-desc">
              Stake governance tokens, create proposals, and vote on protocol
              parameters with token-weighted voting.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📡</div>
            <h3 className="feature-title">Real-Time Events</h3>
            <p className="feature-desc">
              Live event streaming from Soroban contracts keeps the UI updated
              with every deposit, borrow, and liquidation.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="page-container" style={{ paddingTop: 0 }}>
        <div className="card-glass" style={{ textAlign: "center", padding: "48px 32px" }}>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "16px",
              letterSpacing: "-0.5px",
            }}
          >
            Production-Ready Architecture
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 32px",
              lineHeight: 1.7,
            }}
          >
            4 interconnected Soroban smart contracts with CI/CD pipelines,
            comprehensive testing, and automated deployment workflows.
          </p>

          <div
            className="stat-grid"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <div className="stat-card">
              <div className="stat-label">Smart Contracts</div>
              <div className="stat-value">4</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Contract Tests</div>
              <div className="stat-value">25+</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CI/CD Pipelines</div>
              <div className="stat-value">2</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Network</div>
              <div className="stat-value" style={{ fontSize: "1.25rem" }}>Testnet</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="page-container"
        style={{ textAlign: "center", paddingBottom: "80px" }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "16px",
            letterSpacing: "-0.5px",
          }}
        >
          Ready to <span style={{ color: "var(--primary-400)" }}>start earning</span>?
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "24px",
          }}
        >
          Connect your Freighter wallet and start lending on Stellar today.
        </p>
        <Link href="/lend" className="btn btn-primary btn-lg" id="cta-lend-btn">
          Launch App →
        </Link>
      </section>
    </div>
  );
}
