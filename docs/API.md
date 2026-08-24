# StellarLend API Reference

## Token Contract

### `initialize(admin: Address, decimals: u32, name: String, symbol: String)`
Initialize the token with metadata. Can only be called once.

### `mint(to: Address, amount: i128)`
Mint new tokens. Requires admin authorization.

### `burn(from: Address, amount: i128)`
Burn tokens from an address. Requires `from` authorization.

### `transfer(from: Address, to: Address, amount: i128)`
Transfer tokens between addresses.

### `approve(from: Address, spender: Address, amount: i128, expiration_ledger: u32)`
Approve a spending allowance.

### `transfer_from(spender: Address, from: Address, to: Address, amount: i128)`
Transfer using an approved allowance.

### View Functions
- `balance(id: Address) -> i128`
- `total_supply() -> i128`
- `allowance(from: Address, spender: Address) -> i128`
- `decimals() -> u32`
- `name() -> String`
- `symbol() -> String`

---

## Price Oracle Contract

### `initialize(admin: Address)`
Set the oracle admin.

### `set_price(asset: Address, price: i128, confidence: u32)`
Set price for a single asset. Admin only.

### `set_prices(assets: Vec<Address>, prices: Vec<i128>, confidences: Vec<u32>)`
Batch set prices. Admin only.

### View Functions
- `get_price(asset: Address) -> PriceData`
- `get_prices(assets: Vec<Address>) -> Vec<PriceData>`
- `get_assets() -> Vec<Address>`

### PriceData Structure
```rust
pub struct PriceData {
    pub price: i128,       // Price in base units
    pub timestamp: u64,    // Ledger timestamp
    pub confidence: u32,   // Confidence (0-100)
}
```

---

## Lending Pool Contract

### `initialize(admin, token_id, collateral_token_id, oracle_id, gov_token_id, params: PoolParams)`
Initialize pool with contract references and parameters.

### `deposit(user: Address, amount: i128) -> i128`
Deposit tokens into the pool. Returns total deposited.

### `withdraw(user: Address, amount: i128) -> i128`
Withdraw tokens from the pool. Returns amount withdrawn.

### `borrow(user: Address, amount: i128) -> i128`
Borrow tokens against collateral. Returns total borrowed.

### `repay(user: Address, amount: i128) -> i128`
Repay borrowed tokens. Returns remaining debt.

### `liquidate(liquidator: Address, borrower: Address) -> i128`
Liquidate an under-collateralized position. Returns collateral seized.

### `accrue_interest() -> ()`
Accrue interest on all borrows.

### `update_params(new_params: PoolParams) -> ()`
Update pool parameters. Admin only.

### View Functions
- `get_user_position(user: Address) -> UserPosition`
- `get_pool_state() -> PoolState`
- `get_params() -> PoolParams`
- `get_utilization_rate() -> u32`
- `get_borrow_rate() -> u32`
- `get_health_factor(user: Address) -> u32`

### PoolParams Structure
```rust
pub struct PoolParams {
    pub collateral_factor: u32,      // e.g. 7500 = 75%
    pub liquidation_threshold: u32,  // e.g. 8500 = 85%
    pub liquidation_bonus: u32,      // e.g. 500 = 5%
    pub base_rate: u32,              // Annual rate (basis points)
    pub rate_slope1: u32,
    pub rate_slope2: u32,
    pub optimal_utilization: u32,
    pub min_deposit: i128,
}
```

---

## Governance Contract

### `initialize(admin, gov_token_id, lending_pool_id, voting_duration, quorum, min_proposal_power)`
Set up governance with parameters.

### `stake(user: Address, amount: i128) -> i128`
Stake governance tokens. Returns new staked balance.

### `unstake(user: Address, amount: i128) -> i128`
Unstake governance tokens.

### `create_proposal(creator, title, description, action: ProposalAction) -> u32`
Create a new proposal. Returns proposal ID.

### `vote(voter: Address, proposal_id: u32, support: bool)`
Cast a token-weighted vote.

### `execute_proposal(proposal_id: u32)`
Execute a passed proposal after voting ends.

### View Functions
- `get_proposal(proposal_id: u32) -> Proposal`
- `get_proposal_count() -> u32`
- `get_staked_balance(user: Address) -> i128`
- `get_total_staked() -> i128`
- `get_vote(proposal_id: u32, voter: Address) -> VoteRecord`

---

## Events

All contracts emit structured events that can be monitored via `soroban events` CLI or the `getEvents` RPC method.

| Contract | Event | Topics | Data |
|----------|-------|--------|------|
| Token | mint | `["mint", admin]` | `(to, amount)` |
| Token | transfer | `["transfer"]` | `(from, to, amount)` |
| Token | burn | `["burn", from]` | `amount` |
| Oracle | price_updated | `["price", "updated"]` | `(asset, old, new, confidence)` |
| Pool | deposit | `["deposit"]` | `(user, amount, total)` |
| Pool | borrow | `["borrow"]` | `(user, amount, total)` |
| Pool | repay | `["repay"]` | `(user, amount, remaining)` |
| Pool | liquidate | `["liquidate"]` | `(liquidator, borrower, debt, seized)` |
| Pool | interest | `["interest"]` | `(amount, new_index)` |
| Gov | proposal_created | `["proposal", "created"]` | `(id, creator, title)` |
| Gov | vote | `["vote"]` | `(voter, proposal_id, support, weight)` |
| Gov | proposal_executed | `["proposal", "exec"]` | `(id, action)` |
