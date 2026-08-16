#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GovError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    ProposalNotFound = 4,
    AlreadyVoted = 5,
    VotingEnded = 6,
    VotingNotEnded = 7,
    ProposalNotPassed = 8,
    AlreadyExecuted = 9,
    InsufficientVotingPower = 10,
    InvalidQuorum = 11,
}

/// Proposal action types
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalAction {
    UpdateCollateralFactor(u32),
    UpdateLiquidationThreshold(u32),
    UpdateInterestRate(u32),
    UpdateReserveFactor(u32),
    TransferAdmin(Address),
}

/// Proposal status
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Failed,
    Executed,
}

/// Full proposal struct
#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub action: ProposalAction,
    pub votes_for: i128,
    pub votes_against: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub status: ProposalStatus,
    pub executed: bool,
    pub total_voters: u32,
}

/// Vote record
#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteRecord {
    pub voter: Address,
    pub proposal_id: u32,
    pub support: bool,
    pub weight: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    GovTokenId,
    LendingPoolId,
    ProposalCount,
    Proposal(u32),
    Vote(u32, Address),   // (proposal_id, voter)
    VotingDuration,
    Quorum,
    MinProposalPower,
    Initialized,
    StakedBalance(Address),
    TotalStaked,
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Initialize governance with token and lending pool references
    pub fn initialize(
        env: Env,
        admin: Address,
        gov_token_id: Address,
        lending_pool_id: Address,
        voting_duration: u64,     // Duration in seconds
        quorum: i128,             // Minimum total votes needed
        min_proposal_power: i128, // Minimum staked tokens to create proposal
    ) -> Result<(), GovError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(GovError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::GovTokenId, &gov_token_id);
        env.storage().persistent().set(&DataKey::LendingPoolId, &lending_pool_id);
        env.storage().persistent().set(&DataKey::VotingDuration, &voting_duration);
        env.storage().persistent().set(&DataKey::Quorum, &quorum);
        env.storage().persistent().set(&DataKey::MinProposalPower, &min_proposal_power);
        env.storage().persistent().set(&DataKey::ProposalCount, &0u32);
        env.storage().persistent().set(&DataKey::TotalStaked, &0i128);
        env.storage().persistent().set(&DataKey::Initialized, &true);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("init")),
            (admin, gov_token_id, lending_pool_id),
        );

        Ok(())
    }

    /// Stake governance tokens for voting power
    pub fn stake(env: Env, user: Address, amount: i128) -> Result<i128, GovError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        if amount <= 0 {
            return Err(GovError::Unauthorized);
        }

        // Transfer tokens to governance contract
        let token_id: Address = env.storage().persistent().get(&DataKey::GovTokenId).unwrap();
        let token = soroban_sdk::token::Client::new(&env, &token_id);
        token.transfer(&user, &env.current_contract_address(), &amount);

        // Update staked balance
        let current: i128 = env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(user.clone()))
            .unwrap_or(0);
        let new_balance = current + amount;
        env.storage().persistent().set(&DataKey::StakedBalance(user.clone()), &new_balance);

        // Update total staked
        let total: i128 = env.storage().persistent().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().persistent().set(&DataKey::TotalStaked, &(total + amount));

        env.events().publish(
            (symbol_short!("stake"),),
            (user, amount, new_balance),
        );

        Ok(new_balance)
    }

    /// Unstake governance tokens
    pub fn unstake(env: Env, user: Address, amount: i128) -> Result<i128, GovError> {
        user.require_auth();
        Self::check_initialized(&env)?;

        let current: i128 = env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(user.clone()))
            .unwrap_or(0);

        if current < amount {
            return Err(GovError::InsufficientVotingPower);
        }

        // Transfer tokens back to user
        let token_id: Address = env.storage().persistent().get(&DataKey::GovTokenId).unwrap();
        let token = soroban_sdk::token::Client::new(&env, &token_id);
        token.transfer(&env.current_contract_address(), &user, &amount);

        let new_balance = current - amount;
        env.storage().persistent().set(&DataKey::StakedBalance(user.clone()), &new_balance);

        let total: i128 = env.storage().persistent().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().persistent().set(&DataKey::TotalStaked, &(total - amount));

        env.events().publish(
            (symbol_short!("unstake"),),
            (user, amount, new_balance),
        );

        Ok(new_balance)
    }

    /// Create a new governance proposal
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        action: ProposalAction,
    ) -> Result<u32, GovError> {
        creator.require_auth();
        Self::check_initialized(&env)?;

        // Check creator has minimum voting power
        let staked: i128 = env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(creator.clone()))
            .unwrap_or(0);
        let min_power: i128 = env.storage()
            .persistent()
            .get(&DataKey::MinProposalPower)
            .unwrap();

        if staked < min_power {
            return Err(GovError::InsufficientVotingPower);
        }

        let voting_duration: u64 = env.storage()
            .persistent()
            .get(&DataKey::VotingDuration)
            .unwrap();

        let mut count: u32 = env.storage()
            .persistent()
            .get(&DataKey::ProposalCount)
            .unwrap();
        count += 1;

        let proposal = Proposal {
            id: count,
            creator: creator.clone(),
            title: title.clone(),
            description,
            action,
            votes_for: 0,
            votes_against: 0,
            start_time: env.ledger().timestamp(),
            end_time: env.ledger().timestamp() + voting_duration,
            status: ProposalStatus::Active,
            executed: false,
            total_voters: 0,
        };

        env.storage().persistent().set(&DataKey::Proposal(count), &proposal);
        env.storage().persistent().set(&DataKey::ProposalCount, &count);

        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("created")),
            (count, creator, title),
        );

        Ok(count)
    }

    /// Cast a vote on an active proposal
    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u32,
        support: bool,
    ) -> Result<(), GovError> {
        voter.require_auth();
        Self::check_initialized(&env)?;

        // Check if already voted
        if env.storage().persistent().has(&DataKey::Vote(proposal_id, voter.clone())) {
            return Err(GovError::AlreadyVoted);
        }

        let mut proposal: Proposal = env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovError::ProposalNotFound)?;

        // Check voting is still active
        if env.ledger().timestamp() > proposal.end_time {
            return Err(GovError::VotingEnded);
        }

        // Get voter's staked balance as voting weight
        let weight: i128 = env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(voter.clone()))
            .unwrap_or(0);

        if weight == 0 {
            return Err(GovError::InsufficientVotingPower);
        }

        // Record vote
        if support {
            proposal.votes_for += weight;
        } else {
            proposal.votes_against += weight;
        }
        proposal.total_voters += 1;

        let vote_record = VoteRecord {
            voter: voter.clone(),
            proposal_id,
            support,
            weight,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().persistent().set(&DataKey::Vote(proposal_id, voter.clone()), &vote_record);

        env.events().publish(
            (symbol_short!("vote"),),
            (voter, proposal_id, support, weight),
        );

        Ok(())
    }

    /// Execute a passed proposal
    pub fn execute_proposal(env: Env, proposal_id: u32) -> Result<(), GovError> {
        Self::check_initialized(&env)?;

        let mut proposal: Proposal = env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovError::ProposalNotFound)?;

        if proposal.executed {
            return Err(GovError::AlreadyExecuted);
        }

        // Check voting has ended
        if env.ledger().timestamp() <= proposal.end_time {
            return Err(GovError::VotingNotEnded);
        }

        // Check quorum
        let quorum: i128 = env.storage().persistent().get(&DataKey::Quorum).unwrap();
        let total_votes = proposal.votes_for + proposal.votes_against;
        if total_votes < quorum {
            proposal.status = ProposalStatus::Failed;
            env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
            return Err(GovError::InvalidQuorum);
        }

        // Check if passed (simple majority)
        if proposal.votes_for <= proposal.votes_against {
            proposal.status = ProposalStatus::Failed;
            env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
            return Err(GovError::ProposalNotPassed);
        }

        // Mark as executed
        proposal.status = ProposalStatus::Executed;
        proposal.executed = true;
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("exec")),
            (proposal_id, proposal.action.clone()),
        );

        Ok(())
    }

    // === View Functions ===

    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, GovError> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovError::ProposalNotFound)
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    pub fn get_staked_balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(user))
            .unwrap_or(0)
    }

    pub fn get_total_staked(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0)
    }

    pub fn get_vote(env: Env, proposal_id: u32, voter: Address) -> Result<VoteRecord, GovError> {
        env.storage()
            .persistent()
            .get(&DataKey::Vote(proposal_id, voter))
            .ok_or(GovError::ProposalNotFound)
    }

    // === Internal ===

    fn check_initialized(env: &Env) -> Result<(), GovError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(GovError::NotInitialized);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
