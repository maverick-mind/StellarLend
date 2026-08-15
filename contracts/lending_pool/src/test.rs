#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// For lending pool tests, we use the token contract directly
// instead of importing WASM (which requires pre-built artifacts).
// This tests the core lending logic with mock token interactions.

fn create_token(env: &Env, admin: &Address) -> Address {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone()).address();
    token_id
}

fn setup_pool(env: &Env) -> (Address, Address, Address, Address) {
    let pool_id = env.register(LendingPoolContract, ());
    let admin = Address::generate(env);

    let token_id = create_token(env, &admin);
    let collateral_token_id = create_token(env, &admin);
    let oracle_id = Address::generate(env);
    let gov_token_id = Address::generate(env);

    let client = LendingPoolContractClient::new(env, &pool_id);
    client.initialize(
        &admin,
        &token_id,
        &collateral_token_id,
        &oracle_id,
        &gov_token_id,
        &PoolParams {
            collateral_factor: 7500,       // 75% LTV
            liquidation_threshold: 8500,   // 85%
            liquidation_bonus: 500,        // 5%
            base_rate: 200,                // 2% base
            rate_slope1: 400,              // 4%
            rate_slope2: 7500,             // 75%
            optimal_utilization: 8000,     // 80%
            min_deposit: 100_0000000,      // 100 tokens minimum
        },
    );

    (pool_id, admin, token_id, collateral_token_id)
}

fn mint_tokens(env: &Env, token_id: &Address, admin: &Address, to: &Address, amount: i128) {
    let token = soroban_sdk::token::StellarAssetClient::new(env, token_id);
    token.mint(to, &amount);
}

#[test]
fn test_initialize_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, _admin, _token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let state = client.get_pool_state();
    assert_eq!(state.total_deposits, 0);
    assert_eq!(state.total_borrows, 0);

    let params = client.get_params();
    assert_eq!(params.collateral_factor, 7500);
    assert_eq!(params.liquidation_threshold, 8500);
}

#[test]
fn test_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);
    let user = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &user, 10_000_0000000);

    let total = client.deposit(&user, &5_000_0000000);
    assert_eq!(total, 5_000_0000000);

    let state = client.get_pool_state();
    assert_eq!(state.total_deposits, 5_000_0000000);

    let position = client.get_user_position(&user);
    assert_eq!(position.deposited, 5_000_0000000);
}

#[test]
fn test_deposit_and_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);
    let user = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &user, 10_000_0000000);

    client.deposit(&user, &5_000_0000000);
    let withdrawn = client.withdraw(&user, &2_000_0000000);
    assert_eq!(withdrawn, 2_000_0000000);

    let position = client.get_user_position(&user);
    assert_eq!(position.deposited, 3_000_0000000);

    let state = client.get_pool_state();
    assert_eq!(state.total_deposits, 3_000_0000000);
}

#[test]
fn test_borrow_against_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let depositor = Address::generate(&env);
    let borrower = Address::generate(&env);

    // Fund the pool with liquidity
    mint_tokens(&env, &token_id, &admin, &depositor, 100_000_0000000);
    client.deposit(&depositor, &100_000_0000000);

    // Borrower deposits collateral and borrows
    mint_tokens(&env, &token_id, &admin, &borrower, 50_000_0000000);
    client.deposit(&borrower, &50_000_0000000);

    // Borrow 75% of collateral (at 75% LTV)
    let total_borrow = client.borrow(&borrower, &37_000_0000000);
    assert_eq!(total_borrow, 37_000_0000000);

    let position = client.get_user_position(&borrower);
    assert_eq!(position.borrowed, 37_000_0000000);
    assert_eq!(position.deposited, 50_000_0000000);
}

#[test]
#[should_panic]
fn test_borrow_over_limit_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let depositor = Address::generate(&env);
    let borrower = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &depositor, 100_000_0000000);
    client.deposit(&depositor, &100_000_0000000);

    mint_tokens(&env, &token_id, &admin, &borrower, 10_000_0000000);
    client.deposit(&borrower, &10_000_0000000);

    // Try to borrow 90% — exceeds 75% LTV
    client.borrow(&borrower, &9_000_0000000); // Should panic
}

#[test]
fn test_repay_loan() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let depositor = Address::generate(&env);
    let borrower = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &depositor, 100_000_0000000);
    client.deposit(&depositor, &100_000_0000000);

    mint_tokens(&env, &token_id, &admin, &borrower, 50_000_0000000);
    client.deposit(&borrower, &50_000_0000000);

    client.borrow(&borrower, &20_000_0000000);

    // Repay half
    mint_tokens(&env, &token_id, &admin, &borrower, 10_000_0000000);
    let remaining = client.repay(&borrower, &10_000_0000000);
    assert_eq!(remaining, 10_000_0000000);
}

#[test]
fn test_utilization_rate() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &user1, 100_000_0000000);
    mint_tokens(&env, &token_id, &admin, &user2, 50_000_0000000);

    client.deposit(&user1, &100_000_0000000);
    client.deposit(&user2, &50_000_0000000);

    // Borrow 30k out of 150k total = 20% utilization
    client.borrow(&user2, &30_000_0000000);

    let util = client.get_utilization_rate();
    assert!(util > 0);
    assert!(util <= 10000);
}

#[test]
fn test_health_factor() {
    let env = Env::default();
    env.mock_all_auths();

    let (pool_id, admin, token_id, _collateral_id) = setup_pool(&env);
    let client = LendingPoolContractClient::new(&env, &pool_id);

    let depositor = Address::generate(&env);
    let borrower = Address::generate(&env);

    mint_tokens(&env, &token_id, &admin, &depositor, 100_000_0000000);
    client.deposit(&depositor, &100_000_0000000);

    mint_tokens(&env, &token_id, &admin, &borrower, 50_000_0000000);
    client.deposit(&borrower, &50_000_0000000);

    client.borrow(&borrower, &30_000_0000000);

    let health = client.get_health_factor(&borrower);
    // Health factor should be > 10000 (healthy) since 50k * 85% / 30k > 1
    assert!(health > 10000);
}
