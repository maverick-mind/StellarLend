# StellarLend Architecture

## Overview

StellarLend is a decentralized lending protocol built on Stellar Soroban, implementing a production-grade architecture with 4 interconnected smart contracts.

## Contract Design

### 1. Token Contract (SEP-41)

The token contract implements the Soroban token standard with:

- **Storage Model**: Persistent storage for balances, allowances, admin, and metadata
- **Authorization**: `require_auth()` on all state-changing functions
- **Events**: Every mutation emits a descriptive event for off-chain indexing
- **Error Handling**: Custom `TokenError` enum with descriptive codes

### 2. Price Oracle Contract

A simplified oracle providing price feeds:

- **Admin-Controlled**: Prices are set by an authorized admin (simulating Chainlink/Band)
- **Batch Operations**: `set_prices()` and `get_prices()` for gas-efficient multi-asset queries
- **Asset Tracking**: Maintains a list of all tracked assets
- **Confidence Scores**: Each price includes a confidence rating (0-100)

### 3. Lending Pool Contract

The core protocol with DeFi mechanics:

#### Interest Rate Model
```
if utilization <= optimal_utilization:
    rate = base_rate + (utilization / optimal) * slope1
else:
    rate = base_rate + slope1 + ((utilization - optimal) / (1 - optimal)) * slope2
```

#### Collateral & Liquidation
- **Collateral Factor**: 75% LTV (Loan-to-Value)
- **Liquidation Threshold**: 85%
- **Liquidation Bonus**: 5% incentive for liquidators
- **Health Factor**: `(collateral × liquidation_threshold) / borrowed`

#### State Management
- **Pool State**: Global counters for deposits, borrows, reserves, and the borrow index
- **User Positions**: Per-user tracking of deposited, borrowed amounts and borrow index snapshot
- **Interest Accumulation**: Compound interest via a global borrow index

### 4. Governance Contract

Token-weighted DAO with:

- **Staking**: Lock governance tokens for voting power
- **Proposals**: Create, vote (for/against), and execute
- **Quorum**: Minimum total votes required
- **Simple Majority**: More for-votes than against-votes to pass
- **Actions**: Parameter updates (collateral factor, rates, reserves)

## Security Considerations

1. **Authorization**: Every state-changing function uses `require_auth()`
2. **Reentrancy**: Soroban's execution model prevents reentrancy by design
3. **Integer Overflow**: Rust's built-in overflow checks (enabled in release profile)
4. **State Archival**: TTL management for long-lived contract data
5. **Input Validation**: All amounts checked for non-negative values

## Frontend Architecture

- **Next.js App Router** with React 19 Server/Client components
- **Context Providers**: WalletProvider, ToastProvider for global state
- **Soroban RPC**: Event streaming via polling `getEvents` endpoint
- **Freighter Integration**: Browser wallet for transaction signing
- **Responsive Design**: Mobile-first with glassmorphism dark theme
