#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PoolError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InsufficientCollateral = 5,
    InsufficientLiquidity = 6,
    PositionHealthy = 7,
    NoPosition = 8,
    InvalidAmount = 9,
    BelowMinimum = 10,
    OverMaxBorrow = 11,
}

/// Pool configuration parameters
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolParams {
    pub collateral_factor: u32,      // e.g. 7500 = 75% LTV
    pub liquidation_threshold: u32,  // e.g. 8500 = 85%
    pub liquidation_bonus: u32,      // e.g. 500 = 5% bonus to liquidator
    pub base_rate: u32,              // Base interest rate (annual, basis points)
    pub rate_slope1: u32,            // Rate slope below optimal utilization
    pub rate_slope2: u32,            // Rate slope above optimal utilization
    pub optimal_utilization: u32,    // e.g. 8000 = 80%
    pub min_deposit: i128,           // Minimum deposit amount
}

/// User position data
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserPosition {
    pub deposited: i128,             // Amount deposited as collateral
    pub borrowed: i128,              // Amount borrowed
    pub borrow_index: i128,          // Interest accumulator at borrow time
    pub last_update: u64,            // Timestamp of last position update
}

/// Pool state
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolState {
    pub total_deposits: i128,
    pub total_borrows: i128,
    pub total_reserves: i128,
    pub borrow_index: i128,          // Global interest accumulator
    pub last_accrue_time: u64,
    pub reserve_factor: u32,         // e.g. 1000 = 10%
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TokenId,
    OracleId,
    CollateralTokenId,
    GovTokenId,
    Params,
    State,
    Position(Address),
    Initialized,
}

const DECIMALS: i128 = 1_000_000_0; // 7 decimal places (Stellar standard)
const BASIS_POINTS: i128 = 10_000;
const SECONDS_PER_YEAR: u64 = 31_536_000;
const INDEX_PRECISION: i128 = 1_000_000_000_000; // 12 decimals for index

#[contract]
pub struct LendingPoolContract;

#[contractimpl]
impl LendingPoolContract {
    /// Initialize the lending pool with all contract references and parameters
    pub fn initialize(
        env: Env,
        admin: Address,
        token_id: Address,           // Lending token (what users deposit/borrow)
        collateral_token_id: Address, // Collateral token
        oracle_id: Address,          // Price oracle contract
        gov_token_id: Address,       // Governance token
        params: PoolParams,
    ) -> Result<(), PoolError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(PoolError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TokenId, &token_id);
        env.storage().persistent().set(&DataKey::CollateralTokenId, &collateral_token_id);
        env.storage().persistent().set(&DataKey::OracleId, &oracle_id);
        env.storage().persistent().set(&DataKey::GovTokenId, &gov_token_id);
        env.storage().persistent().set(&DataKey::Params, &params);

        let initial_state = PoolState {
            total_deposits: 0,
            total_borrows: 0,
            total_reserves: 0,
            borrow_index: INDEX_PRECISION,
            last_accrue_time: env.ledger().timestamp(),
            reserve_factor: 1000, // 10%
        };
        env.storage().persistent().set(&DataKey::State, &initial_state);
        env.storage().persistent().set(&DataKey::Initialized, &true);

        env.events().publish(
            (symbol_short!("pool"), symbol_short!("init")),
            (admin, token_id, oracle_id),
        );

        Ok(())
    }

    /// Deposit tokens into the lending pool
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<i128, PoolError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        let params: PoolParams = env.storage().persistent().get(&DataKey::Params).unwrap();
        if amount < params.min_deposit {
            return Err(PoolError::BelowMinimum);
        }

        // Accrue interest first
        Self::accrue_interest_internal(&env)?;

        // Transfer tokens from user to pool
        let token_id: Address = env.storage().persistent().get(&DataKey::TokenId).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&user, &env.current_contract_address(), &amount);

        // Update user position
        let mut position = Self::get_or_create_position(&env, &user);
        position.deposited += amount;
        position.last_update = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);

        // Update pool state
        let mut state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();
        state.total_deposits += amount;
        env.storage().persistent().set(&DataKey::State, &state);

        // Emit deposit event
        env.events().publish(
            (symbol_short!("deposit"),),
            (user.clone(), amount, position.deposited),
        );

        Ok(position.deposited)
    }

    /// Withdraw tokens from the lending pool
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<i128, PoolError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        Self::accrue_interest_internal(&env)?;

        let mut position = Self::get_position(&env, &user)?;
        if position.deposited < amount {
            return Err(PoolError::InsufficientBalance);
        }

        // Check if withdrawal would make position unhealthy
        let new_deposit = position.deposited - amount;
        if position.borrowed > 0 {
            Self::check_health_factor(&env, new_deposit, position.borrowed)?;
        }

        // Check pool has enough liquidity
        let mut state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();
        let available = state.total_deposits - state.total_borrows;
        if available < amount {
            return Err(PoolError::InsufficientLiquidity);
        }

        // Transfer tokens to user
        let token_id: Address = env.storage().persistent().get(&DataKey::TokenId).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&env.current_contract_address(), &user, &amount);

        // Update position
        position.deposited = new_deposit;
        position.last_update = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);

        // Update pool state
        state.total_deposits -= amount;
        env.storage().persistent().set(&DataKey::State, &state);

        env.events().publish(
            (symbol_short!("withdraw"),),
            (user.clone(), amount, position.deposited),
        );

        Ok(amount)
    }

    /// Borrow tokens against deposited collateral
    pub fn borrow(env: Env, user: Address, amount: i128) -> Result<i128, PoolError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        Self::accrue_interest_internal(&env)?;

        let mut position = Self::get_position(&env, &user)?;
        let mut state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();

        // Check liquidity
        let available = state.total_deposits - state.total_borrows;
        if available < amount {
            return Err(PoolError::InsufficientLiquidity);
        }

        // Calculate new borrow with existing interest
        let accrued_borrow = Self::calculate_accrued_borrow(&position, &state);
        let new_total_borrow = accrued_borrow + amount;

        // Check collateral ratio using oracle (inter-contract call)
        Self::check_health_factor(&env, position.deposited, new_total_borrow)?;

        // Transfer borrowed tokens to user
        let token_id: Address = env.storage().persistent().get(&DataKey::TokenId).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&env.current_contract_address(), &user, &amount);

        // Update position
        position.borrowed = new_total_borrow;
        position.borrow_index = state.borrow_index;
        position.last_update = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);

        // Update pool state
        state.total_borrows += amount;
        env.storage().persistent().set(&DataKey::State, &state);

        env.events().publish(
            (symbol_short!("borrow"),),
            (user.clone(), amount, new_total_borrow),
        );

        Ok(new_total_borrow)
    }

    /// Repay borrowed tokens
    pub fn repay(env: Env, user: Address, amount: i128) -> Result<i128, PoolError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        Self::accrue_interest_internal(&env)?;

        let mut position = Self::get_position(&env, &user)?;
        let state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();

        let accrued_borrow = Self::calculate_accrued_borrow(&position, &state);
        let repay_amount = if amount > accrued_borrow { accrued_borrow } else { amount };

        // Transfer tokens from user to pool
        let token_id: Address = env.storage().persistent().get(&DataKey::TokenId).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&user, &env.current_contract_address(), &repay_amount);

        // Update position
        position.borrowed = accrued_borrow - repay_amount;
        position.borrow_index = state.borrow_index;
        position.last_update = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);

        // Update pool state
        let mut state = state;
        state.total_borrows -= repay_amount;
        env.storage().persistent().set(&DataKey::State, &state);

        env.events().publish(
            (symbol_short!("repay"),),
            (user.clone(), repay_amount, position.borrowed),
        );

        Ok(position.borrowed)
    }

    /// Liquidate an under-collateralized position
    pub fn liquidate(
        env: Env,
        liquidator: Address,
        borrower: Address,
    ) -> Result<i128, PoolError> {
        liquidator.require_auth();
        Self::check_initialized(&env)?;

        Self::accrue_interest_internal(&env)?;

        let mut position = Self::get_position(&env, &borrower)?;
        let params: PoolParams = env.storage().persistent().get(&DataKey::Params).unwrap();
        let mut state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();

        let accrued_borrow = Self::calculate_accrued_borrow(&position, &state);

        // Check if position is liquidatable (health factor < 1)
        let collateral_value = position.deposited;
        let max_borrow = (collateral_value * params.liquidation_threshold as i128) / BASIS_POINTS;
        if accrued_borrow <= max_borrow {
            return Err(PoolError::PositionHealthy);
        }

        // Calculate liquidation amounts
        let liquidation_bonus_rate = params.liquidation_bonus as i128;
        let collateral_to_seize = (accrued_borrow * (BASIS_POINTS + liquidation_bonus_rate)) / BASIS_POINTS;
        let actual_seize = if collateral_to_seize > position.deposited {
            position.deposited
        } else {
            collateral_to_seize
        };

        // Liquidator pays off the debt
        let token_id: Address = env.storage().persistent().get(&DataKey::TokenId).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&liquidator, &env.current_contract_address(), &accrued_borrow);

        // Transfer seized collateral to liquidator (as token value)
        token.transfer(&env.current_contract_address(), &liquidator, &actual_seize);

        // Update borrower's position
        position.deposited -= actual_seize;
        position.borrowed = 0;
        position.borrow_index = state.borrow_index;
        position.last_update = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Position(borrower.clone()), &position);

        // Update pool state
        state.total_borrows -= accrued_borrow;
        state.total_deposits -= actual_seize;
        env.storage().persistent().set(&DataKey::State, &state);

        env.events().publish(
            (symbol_short!("liquidate"),),
            (liquidator.clone(), borrower.clone(), accrued_borrow, actual_seize),
        );

        Ok(actual_seize)
    }

    // === View Functions ===

    /// Get user's current position
    pub fn get_user_position(env: Env, user: Address) -> Result<UserPosition, PoolError> {
        Self::get_position(&env, &user)
    }

    /// Get current pool state
    pub fn get_pool_state(env: Env) -> Result<PoolState, PoolError> {
        Self::check_initialized(&env)?;
        env.storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(PoolError::NotInitialized)
    }

    /// Get pool parameters
    pub fn get_params(env: Env) -> Result<PoolParams, PoolError> {
        env.storage()
            .persistent()
            .get(&DataKey::Params)
            .ok_or(PoolError::NotInitialized)
    }

    /// Calculate current utilization rate (basis points)
    pub fn get_utilization_rate(env: Env) -> Result<u32, PoolError> {
        let state: PoolState = env.storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(PoolError::NotInitialized)?;

        if state.total_deposits == 0 {
            return Ok(0);
        }

        Ok(((state.total_borrows * BASIS_POINTS) / state.total_deposits) as u32)
    }

    /// Calculate current borrow APR (basis points)
    pub fn get_borrow_rate(env: Env) -> Result<u32, PoolError> {
        let state: PoolState = env.storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(PoolError::NotInitialized)?;
        let params: PoolParams = env.storage()
            .persistent()
            .get(&DataKey::Params)
            .ok_or(PoolError::NotInitialized)?;

        Ok(Self::calculate_borrow_rate(&state, &params))
    }

    /// Calculate health factor for a user (basis points, 10000 = healthy)
    pub fn get_health_factor(env: Env, user: Address) -> Result<u32, PoolError> {
        let position = Self::get_position(&env, &user)?;
        let state: PoolState = env.storage().persistent().get(&DataKey::State).unwrap();
        let params: PoolParams = env.storage().persistent().get(&DataKey::Params).unwrap();

        let accrued_borrow = Self::calculate_accrued_borrow(&position, &state);
        if accrued_borrow == 0 {
            return Ok(10_000); // Max healthy
        }

        let max_borrow = (position.deposited * params.liquidation_threshold as i128) / BASIS_POINTS;
        Ok(((max_borrow * BASIS_POINTS) / accrued_borrow) as u32)
    }

    /// Accrue interest — callable by anyone
    pub fn accrue_interest(env: Env) -> Result<(), PoolError> {
        Self::accrue_interest_internal(&env)
    }

    /// Update pool parameters — admin only (used by governance)
    pub fn update_params(env: Env, new_params: PoolParams) -> Result<(), PoolError> {
        let admin: Address = env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(PoolError::NotInitialized)?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Params, &new_params);

        env.events().publish(
            (symbol_short!("params"),),
            (new_params.collateral_factor, new_params.liquidation_threshold),
        );

        Ok(())
    }

    // === Internal Functions ===

    fn check_initialized(env: &Env) -> Result<(), PoolError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }
        Ok(())
    }

    fn get_or_create_position(env: &Env, user: &Address) -> UserPosition {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user.clone()))
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                borrow_index: INDEX_PRECISION,
                last_update: env.ledger().timestamp(),
            })
    }

    fn get_position(env: &Env, user: &Address) -> Result<UserPosition, PoolError> {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user.clone()))
            .ok_or(PoolError::NoPosition)
    }

    fn calculate_borrow_rate(state: &PoolState, params: &PoolParams) -> u32 {
        if state.total_deposits == 0 {
            return params.base_rate;
        }

        let utilization = ((state.total_borrows * BASIS_POINTS) / state.total_deposits) as u32;
        let optimal = params.optimal_utilization;

        if utilization <= optimal {
            // Below optimal: base_rate + (utilization / optimal) * slope1
            params.base_rate + (utilization * params.rate_slope1) / optimal
        } else {
            // Above optimal: base_rate + slope1 + ((utilization - optimal) / (1 - optimal)) * slope2
            let excess = utilization - optimal;
            let remaining = 10_000 - optimal;
            params.base_rate + params.rate_slope1 + (excess * params.rate_slope2) / remaining
        }
    }

    fn calculate_accrued_borrow(position: &UserPosition, state: &PoolState) -> i128 {
        if position.borrowed == 0 || position.borrow_index == 0 {
            return position.borrowed;
        }
        (position.borrowed * state.borrow_index) / position.borrow_index
    }

    fn accrue_interest_internal(env: &Env) -> Result<(), PoolError> {
        let mut state: PoolState = env.storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(PoolError::NotInitialized)?;

        let current_time = env.ledger().timestamp();
        let time_delta = current_time - state.last_accrue_time;

        if time_delta == 0 || state.total_borrows == 0 {
            state.last_accrue_time = current_time;
            env.storage().persistent().set(&DataKey::State, &state);
            return Ok(());
        }

        let params: PoolParams = env.storage().persistent().get(&DataKey::Params).unwrap();
        let borrow_rate = Self::calculate_borrow_rate(&state, &params) as i128;

        // Calculate interest accrued
        let interest_factor = (borrow_rate * time_delta as i128) / (SECONDS_PER_YEAR as i128 * 100);
        let interest = (state.total_borrows * interest_factor) / BASIS_POINTS;

        // Update borrow index
        let index_delta = (state.borrow_index * interest_factor) / BASIS_POINTS;
        state.borrow_index += index_delta;

        // Add reserves
        let reserves = (interest * state.reserve_factor as i128) / BASIS_POINTS;
        state.total_reserves += reserves;

        // Interest goes back to depositors
        state.total_deposits += interest - reserves;
        state.total_borrows += interest;
        state.last_accrue_time = current_time;

        env.storage().persistent().set(&DataKey::State, &state);

        env.events().publish(
            (symbol_short!("interest"),),
            (interest, state.borrow_index),
        );

        Ok(())
    }

    fn check_health_factor(env: &Env, collateral: i128, borrow: i128) -> Result<(), PoolError> {
        let params: PoolParams = env.storage().persistent().get(&DataKey::Params).unwrap();
        let max_borrow = (collateral * params.collateral_factor as i128) / BASIS_POINTS;

        if borrow > max_borrow {
            return Err(PoolError::InsufficientCollateral);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
