#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_governance(env: &Env) -> (Address, Address, Address, Address) {
    let gov_contract_id = env.register(GovernanceContract, ());
    let admin = Address::generate(env);

    // Register a mock token for governance
    let token_id = env.register_stellar_asset_contract_v2(admin.clone()).address();

    let lending_pool_id = Address::generate(env);

    let client = GovernanceContractClient::new(env, &gov_contract_id);
    client.initialize(
        &admin,
        &token_id,
        &lending_pool_id,
        &86400,       // 1 day voting duration
        &100_0000000, // 100 tokens quorum
        &10_0000000,  // 10 tokens minimum to propose
    );

    (gov_contract_id, admin, token_id, lending_pool_id)
}

fn fund_and_stake(env: &Env, gov_id: &Address, token_id: &Address, admin: &Address, user: &Address, amount: i128) {
    let token = soroban_sdk::token::StellarAssetClient::new(env, token_id);
    token.mint(user, &amount);

    let gov_client = GovernanceContractClient::new(env, gov_id);
    gov_client.stake(user, &amount);
}

#[test]
fn test_initialize_governance() {
    let env = Env::default();
    env.mock_all_auths();

    let (gov_id, _admin, _token_id, _pool_id) = setup_governance(&env);
    let client = GovernanceContractClient::new(&env, &gov_id);

    assert_eq!(client.get_proposal_count(), 0);
    assert_eq!(client.get_total_staked(), 0);
}

#[test]
fn test_stake_and_unstake() {
    let env = Env::default();
    env.mock_all_auths();

    let (gov_id, admin, token_id, _pool_id) = setup_governance(&env);
    let client = GovernanceContractClient::new(&env, &gov_id);
    let user = Address::generate(&env);

    fund_and_stake(&env, &gov_id, &token_id, &admin, &user, 500_0000000);

    assert_eq!(client.get_staked_balance(&user), 500_0000000);
    assert_eq!(client.get_total_staked(), 500_0000000);

    client.unstake(&user, &200_0000000);
    assert_eq!(client.get_staked_balance(&user), 300_0000000);
    assert_eq!(client.get_total_staked(), 300_0000000);
}

#[test]
fn test_create_proposal() {
    let env = Env::default();
    env.mock_all_auths();

    let (gov_id, admin, token_id, _pool_id) = setup_governance(&env);
    let client = GovernanceContractClient::new(&env, &gov_id);
    let proposer = Address::generate(&env);

    fund_and_stake(&env, &gov_id, &token_id, &admin, &proposer, 50_0000000);

    let proposal_id = client.create_proposal(
        &proposer,
        &String::from_str(&env, "Increase LTV"),
        &String::from_str(&env, "Increase collateral factor to 80%"),
        &ProposalAction::UpdateCollateralFactor(8000),
    );

    assert_eq!(proposal_id, 1);
    assert_eq!(client.get_proposal_count(), 1);

    let proposal = client.get_proposal(&1);
    assert_eq!(proposal.id, 1);
    assert_eq!(proposal.votes_for, 0);
    assert_eq!(proposal.votes_against, 0);
}

#[test]
fn test_vote_on_proposal() {
    let env = Env::default();
    env.mock_all_auths();

    let (gov_id, admin, token_id, _pool_id) = setup_governance(&env);
    let client = GovernanceContractClient::new(&env, &gov_id);

    let proposer = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    fund_and_stake(&env, &gov_id, &token_id, &admin, &proposer, 50_0000000);
    fund_and_stake(&env, &gov_id, &token_id, &admin, &voter1, 100_0000000);
    fund_and_stake(&env, &gov_id, &token_id, &admin, &voter2, 75_0000000);

    let proposal_id = client.create_proposal(
        &proposer,
        &String::from_str(&env, "Update Rate"),
        &String::from_str(&env, "Update interest rate model"),
        &ProposalAction::UpdateInterestRate(300),
    );

    client.vote(&voter1, &proposal_id, &true);
    client.vote(&voter2, &proposal_id, &false);

    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.votes_for, 100_0000000);
    assert_eq!(proposal.votes_against, 75_0000000);
    assert_eq!(proposal.total_voters, 2);
}

#[test]
#[should_panic]
fn test_double_vote_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (gov_id, admin, token_id, _pool_id) = setup_governance(&env);
    let client = GovernanceContractClient::new(&env, &gov_id);

    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);

    fund_and_stake(&env, &gov_id, &token_id, &admin, &proposer, 50_0000000);
    fund_and_stake(&env, &gov_id, &token_id, &admin, &voter, 100_0000000);

    let proposal_id = client.create_proposal(
        &proposer,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test proposal"),
        &ProposalAction::UpdateReserveFactor(500),
    );

    client.vote(&voter, &proposal_id, &true);
    client.vote(&voter, &proposal_id, &false); // Should panic — already voted
}
