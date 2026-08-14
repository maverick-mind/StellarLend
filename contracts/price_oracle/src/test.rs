#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, Vec};

fn setup_oracle(env: &Env) -> (Address, Address) {
    let contract_id = env.register(PriceOracleContract, ());
    let admin = Address::generate(env);

    let client = PriceOracleContractClient::new(env, &contract_id);
    client.initialize(&admin);

    (contract_id, admin)
}

#[test]
fn test_initialize_oracle() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);

    assert_eq!(client.admin(), admin);
}

#[test]
fn test_set_and_get_price() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);
    let asset = Address::generate(&env);

    client.set_price(&asset, &1_500_000_000_000_000_000, &95);

    let price_data = client.get_price(&asset);
    assert_eq!(price_data.price, 1_500_000_000_000_000_000);
    assert_eq!(price_data.confidence, 95);
}

#[test]
fn test_batch_prices() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    let mut assets = Vec::new(&env);
    assets.push_back(asset1.clone());
    assets.push_back(asset2.clone());

    let mut prices = Vec::new(&env);
    prices.push_back(1_000_000_000_000_000_000i128);
    prices.push_back(2_000_000_000_000_000_000i128);

    let mut confidences = Vec::new(&env);
    confidences.push_back(90u32);
    confidences.push_back(85u32);

    client.set_prices(&assets, &prices, &confidences);

    let results = client.get_prices(&assets);
    assert_eq!(results.len(), 2);
    assert_eq!(results.get(0).unwrap().price, 1_000_000_000_000_000_000);
    assert_eq!(results.get(1).unwrap().price, 2_000_000_000_000_000_000);
}

#[test]
fn test_price_update_event() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);
    let asset = Address::generate(&env);

    // Set initial price
    client.set_price(&asset, &1_000_000_000, &90);

    // Update price — should track old price in event
    client.set_price(&asset, &1_500_000_000, &95);

    let price_data = client.get_price(&asset);
    assert_eq!(price_data.price, 1_500_000_000);
}

#[test]
fn test_asset_tracking() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    client.set_price(&asset1, &1_000, &90);
    client.set_price(&asset2, &2_000, &85);

    let assets = client.get_assets();
    assert_eq!(assets.len(), 2);
}

#[test]
#[should_panic]
fn test_invalid_price_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, _admin) = setup_oracle(&env);
    let client = PriceOracleContractClient::new(&env, &contract_id);
    let asset = Address::generate(&env);

    client.set_price(&asset, &-100, &90); // Should panic — negative price
}
