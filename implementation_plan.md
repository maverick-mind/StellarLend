# StellarLend — DeFi Lending/Borrowing Protocol on Soroban

A production-ready, end-to-end decentralized lending/borrowing platform built on Stellar's Soroban smart contracts with a Next.js frontend.

## Project Summary

**StellarLend** allows users to:
- **Deposit** tokens as collateral into lending pools
- **Borrow** against their collateral with dynamic interest rates
- **Repay** loans and withdraw collateral
- **Liquidate** under-collateralized positions for profit
- **Governance** — stake governance tokens to vote on protocol parameters

This hits every Level 3 requirement: advanced contracts, inter-contract communication, event streaming, CI/CD, tests, mobile-responsive UI, and production architecture.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│  (Dashboard, Lending, Borrowing, Liquidation, Governance) │
│  Mobile Responsive • Real-time Events • Error Handling    │
└────────────────────────┬─────────────────────────────────┘
                         │ @stellar/stellar-sdk
                         │ Freighter Wallet
┌────────────────────────▼─────────────────────────────────┐
│              Stellar Soroban (Testnet)                     │
│                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Token       │  │  LendingPool │  │  PriceOracle     │ │
│  │  Contract    │◄─┤  Contract    │──┤  Contract        │ │
│  │  (SAC/Custom)│  │  (Core Logic)│  │  (Price Feeds)   │ │
│  └─────────────┘  └──────┬───────┘  └──────────────────┘ │
│                          │                                 │
│                   ┌──────▼───────┐                         │
│                   │  Governance  │                         │
│                   │  Contract    │                         │
│                   │  (DAO Votes) │                         │
│                   └──────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

---

## Proposed Changes

### 1. Smart Contracts (Rust/Soroban)

We'll create **4 interconnected smart contracts** demonstrating advanced Soroban patterns:

---

#### [NEW] `contracts/token/src/lib.rs` — Custom Token Contract

A Soroban token with mint/burn/transfer capabilities, used as the lending pool's native token.

- Implements standard Soroban token interface (SEP-41)
- Admin-controlled minting for test scenarios
- Events emitted on every transfer, mint, burn
- Storage: balances, allowances, admin, metadata

#### [NEW] `contracts/token/Cargo.toml`

Dependencies: `soroban-sdk`, `soroban-token-sdk`

---

#### [NEW] `contracts/price_oracle/src/lib.rs` — Price Oracle Contract

Provides price feeds for collateral valuation. Demonstrates **inter-contract communication** — the LendingPool calls this contract to get asset prices.

- `set_price(asset, price)` — Admin sets prices (simulates oracle feed)
- `get_price(asset) -> i128` — Returns current price
- `get_prices(assets) -> Vec<(Address, i128)>` — Batch price query
- Events: `PriceUpdated { asset, old_price, new_price, timestamp }`

#### [NEW] `contracts/price_oracle/Cargo.toml`

---

#### [NEW] `contracts/lending_pool/src/lib.rs` — Core Lending Pool Contract ⭐

The heart of the protocol. This contract handles deposits, borrows, repayments, and liquidations.

**Key functions:**
- `initialize(admin, token, oracle, gov_token, params)` — Set up the pool
- `deposit(user, amount) -> shares` — Deposit tokens, receive pool shares
- `withdraw(user, shares) -> amount` — Burn shares, receive tokens
- `borrow(user, collateral_amount, borrow_amount)` — Borrow against collateral
- `repay(user, amount)` — Repay borrowed amount + interest
- `liquidate(liquidator, borrower)` — Liquidate under-collateralized position
- `get_user_position(user) -> Position` — View user's lending/borrowing state
- `accrue_interest()` — Calculate and apply compound interest

**Advanced features:**
- **Inter-contract calls** to PriceOracle for collateral valuation
- **Inter-contract calls** to Token for transfers
- **Dynamic interest rate model** — utilization-based rates
- **Collateralization ratio checks** — prevents over-borrowing
- **Liquidation bonus** — incentivizes liquidators
- **Events**: `Deposited`, `Withdrawn`, `Borrowed`, `Repaid`, `Liquidated`, `InterestAccrued`

#### [NEW] `contracts/lending_pool/Cargo.toml`

---

#### [NEW] `contracts/governance/src/lib.rs` — Governance Contract

Token-weighted voting on protocol parameter changes. Demonstrates cross-contract calls back to LendingPool.

- `create_proposal(creator, title, description, action)` — Submit a proposal
- `vote(voter, proposal_id, support)` — Cast weighted vote
- `execute_proposal(proposal_id)` — Execute passed proposal
- `get_proposal(id) -> Proposal` — View proposal details
- Events: `ProposalCreated`, `VoteCast`, `ProposalExecuted`

#### [NEW] `contracts/governance/Cargo.toml`

---

#### [NEW] `Cargo.toml` — Workspace Root

Workspace manifest managing all 4 contracts.

---

### 2. Contract Tests

#### [NEW] `contracts/token/src/test.rs`
- Test mint, transfer, burn, allowances
- Test admin authorization
- Test event emission

#### [NEW] `contracts/price_oracle/src/test.rs`
- Test price setting and retrieval
- Test batch price queries
- Test unauthorized access prevention

#### [NEW] `contracts/lending_pool/src/test.rs`
- Test deposit/withdraw flow
- Test borrow/repay with interest
- Test liquidation mechanics
- Test inter-contract calls to oracle
- Test collateralization ratio enforcement
- **3+ passing tests minimum** (will have 8+)

#### [NEW] `contracts/governance/src/test.rs`
- Test proposal creation and voting
- Test execution of passed proposals

---

### 3. Frontend (Next.js)

#### [NEW] `frontend/` — Next.js Application

Created via `npx create-next-app@latest`.

##### Pages & Components:

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with wallet connection, navigation |
| `app/page.tsx` | Landing page — hero, stats, protocol overview |
| `app/dashboard/page.tsx` | User dashboard — positions, balances, health factor |
| `app/lend/page.tsx` | Deposit/Withdraw interface |
| `app/borrow/page.tsx` | Borrow/Repay interface with collateral management |
| `app/liquidate/page.tsx` | Liquidation opportunities browser |
| `app/governance/page.tsx` | Proposal list, voting, creation |
| `components/WalletConnect.tsx` | Freighter wallet integration |
| `components/TransactionModal.tsx` | TX status with loading/error states |
| `components/PositionCard.tsx` | User position display |
| `components/StatsBar.tsx` | Protocol statistics (TVL, rates, etc.) |
| `components/EventStream.tsx` | Real-time event feed from Soroban |
| `components/MobileNav.tsx` | Responsive mobile navigation |
| `lib/stellar.ts` | Stellar SDK configuration & contract clients |
| `lib/events.ts` | Event streaming via Soroban RPC `getEvents` |
| `lib/contracts.ts` | Contract interaction helpers |
| `hooks/useWallet.ts` | Wallet state management hook |
| `hooks/useContract.ts` | Contract interaction hook |
| `hooks/useEvents.ts` | Event streaming hook |

##### Design System:
- **Dark mode** with glassmorphism cards
- **Gradient accents** — purple-to-cyan DeFi aesthetic
- **Micro-animations** — hover effects, loading skeletons, toast notifications
- **Mobile-first** responsive design
- **Inter font** from Google Fonts
- **Real-time updates** via polling Soroban RPC events

##### Frontend Tests:

| File | Purpose |
|------|---------|
| `__tests__/WalletConnect.test.tsx` | Wallet connection flow |
| `__tests__/Dashboard.test.tsx` | Dashboard rendering |
| `__tests__/ContractInteraction.test.tsx` | Contract call mocking |

---

### 4. CI/CD Pipeline

#### [NEW] `.github/workflows/ci.yml` — Continuous Integration

```yaml
# Triggers: push to main, pull requests
# Jobs:
#   1. contracts-test: Build & test all Rust contracts
#   2. frontend-test: Lint & test Next.js frontend
#   3. contracts-build: Build WASM artifacts
```

#### [NEW] `.github/workflows/deploy.yml` — Continuous Deployment

```yaml
# Triggers: push to main (after CI passes), manual dispatch
# Jobs:
#   1. deploy-contracts: Deploy to Stellar testnet
#   2. deploy-frontend: Deploy to Vercel
```

---

### 5. Deployment Scripts

#### [NEW] `scripts/deploy.sh`
Automated deployment script for all contracts in dependency order:
1. Deploy Token → get contract ID
2. Deploy PriceOracle → get contract ID
3. Deploy Governance → get contract ID
4. Deploy LendingPool → initialize with other contract IDs

#### [NEW] `scripts/setup-testnet.sh`
Fund testnet accounts, initialize contracts, set test data.

---

### 6. Documentation

#### [NEW] `README.md`
Complete documentation covering:
- Project overview and architecture
- Setup instructions (local dev, testnet)
- Contract addresses and deployment info
- Frontend deployment link
- Screenshots (mobile responsive, CI/CD, tests)
- Demo video link
- Technology stack
- Testing guide

#### [NEW] `docs/ARCHITECTURE.md`
Deep-dive into contract architecture and design decisions.

#### [NEW] `docs/API.md`
Contract function reference and event schemas.

---

## Project Structure

```
StellerProject/
├── Cargo.toml                    # Workspace root
├── contracts/
│   ├── token/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── test.rs
│   ├── price_oracle/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── test.rs
│   ├── lending_pool/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── test.rs
│   └── governance/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           └── test.rs
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── app/                     # Next.js app router
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── public/
│   └── __tests__/
├── scripts/
│   ├── deploy.sh
│   └── setup-testnet.sh
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   ├── ARCHITECTURE.md
│   └── API.md
└── README.md
```

---

## Verification Plan

### Automated Tests
1. **Contract tests**: `cargo test` — target 8+ passing tests across all contracts
2. **Frontend tests**: `npm test` — 3+ passing component/integration tests
3. **Build verification**: `stellar contract build` for all contracts

### Manual Verification
- Test full deposit → borrow → repay → withdraw flow on testnet
- Verify mobile responsiveness across breakpoints
- Confirm event streaming displays real-time updates
- Screenshot CI/CD pipeline passing in GitHub Actions
- Record 1-2 minute demo video

### Submission Artifacts
- [ ] Public GitHub repo with 10+ meaningful commits
- [ ] Live demo link on Vercel
- [ ] Contract deployment addresses on testnet
- [ ] Transaction hash for contract interaction
- [ ] Screenshots: mobile UI, CI/CD pipeline, test output
- [ ] Demo video (1-2 minutes)

---

## Open Questions

> [!IMPORTANT]
> **Stellar CLI Version**: Your Rust is v1.89 which limits us to `stellar-cli@25.2.0`. This is fully functional for our needs. Alternatively, we could update Rust with `rustup update` to get the latest CLI. **Do you want to update Rust first, or proceed with v25.2.0?**

> [!NOTE]
> **Testnet Wallet**: We'll need a testnet-funded Stellar account for deployment. I'll generate one using the Stellar Friendbot. No real funds needed.

> [!NOTE]
> **Freighter Wallet**: For the demo, you'll need the [Freighter browser extension](https://www.freighter.app/) installed. This is the standard Stellar wallet for dApp interactions.
