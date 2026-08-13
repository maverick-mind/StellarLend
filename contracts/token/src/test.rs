#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_token(env: &Env) -> (Address, Address) {
    let contract_id = env.register(TokenContract, ());
    let admin = Address::generate(env);

    let client = TokenContractClient::new(env, &contract_id);
    client.initialize(
        &admin,
        &7,
        &String::from_str(env, "StellarLend Token"),
        &String::from_str(env, "SLT"),
    );

    (contract_id, admin)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);

    assert_eq!(client.decimals(), 7);
    assert_eq!(client.name(), String::from_str(&env, "StellarLend Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "SLT"));
}

#[test]
fn test_mint_and_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    client.mint(&user, &1_000_000_0);

    assert_eq!(client.balance(&user), 1_000_000_0);
    assert_eq!(client.total_supply(), 1_000_000_0);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &1_000_000_0);
    client.transfer(&alice, &bob, &300_000_0);

    assert_eq!(client.balance(&alice), 700_000_0);
    assert_eq!(client.balance(&bob), 300_000_0);
    assert_eq!(client.total_supply(), 1_000_000_0);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    client.mint(&user, &1_000_000_0);
    client.burn(&user, &400_000_0);

    assert_eq!(client.balance(&user), 600_000_0);
    assert_eq!(client.total_supply(), 600_000_0);
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);

    client.mint(&alice, &1_000_000_0);
    client.approve(&alice, &spender, &500_000_0, &1000);

    assert_eq!(client.allowance(&alice, &spender), 500_000_0);

    client.transfer_from(&spender, &alice, &bob, &200_000_0);

    assert_eq!(client.balance(&alice), 800_000_0);
    assert_eq!(client.balance(&bob), 200_000_0);
    assert_eq!(client.allowance(&alice, &spender), 300_000_0);
}

#[test]
#[should_panic]
fn test_transfer_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_token(&env);
    let client = TokenContractClient::new(&env, &contract_id);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100_0);
    client.transfer(&alice, &bob, &200_0); // Should panic — insufficient balance
}
