#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, String, Symbol,
    token::{self, Interface as _},
};
use soroban_token_sdk::metadata::TokenMetadata;
use soroban_token_sdk::TokenUtils;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InsufficientAllowance = 5,
    InvalidAmount = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address),
    TotalSupply,
    Initialized,
}

fn check_nonnegative(amount: i128) -> Result<(), TokenError> {
    if amount < 0 {
        Err(TokenError::InvalidAmount)
    } else {
        Ok(())
    }
}

fn read_balance(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(addr.clone()))
        .unwrap_or(0)
}

fn write_balance(env: &Env, addr: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Balance(addr.clone()), &amount);
}

fn read_total_supply(env: &Env) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

fn write_total_supply(env: &Env, amount: i128) {
    env.storage().persistent().set(&DataKey::TotalSupply, &amount);
}

fn read_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Allowance(from.clone(), spender.clone()))
        .unwrap_or(0)
}

fn write_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
}

fn read_admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::Admin)
        .unwrap()
}

fn has_admin(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Admin)
}

fn write_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// Initialize the token contract with admin, name, symbol, and decimals
    pub fn initialize(
        env: Env,
        admin: Address,
        decimals: u32,
        name: String,
        symbol: String,
    ) -> Result<(), TokenError> {
        if has_admin(&env) {
            return Err(TokenError::AlreadyInitialized);
        }

        write_admin(&env, &admin);

        TokenUtils::new(&env).metadata().set_metadata(&TokenMetadata {
            decimal: decimals,
            name: name.clone(),
            symbol: symbol.clone(),
        });

        // Emit initialization event
        env.events().publish(
            (symbol_short!("init"),),
            (admin.clone(), name, symbol, decimals),
        );

        Ok(())
    }

    /// Mint new tokens — admin only
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), TokenError> {
        check_nonnegative(amount)?;
        let admin = read_admin(&env);
        admin.require_auth();

        let balance = read_balance(&env, &to);
        write_balance(&env, &to, balance + amount);

        let supply = read_total_supply(&env);
        write_total_supply(&env, supply + amount);

        // Emit mint event
        env.events().publish(
            (symbol_short!("mint"), admin),
            (to.clone(), amount),
        );

        Ok(())
    }

    /// Burn tokens from an address — admin only
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), TokenError> {
        check_nonnegative(amount)?;
        from.require_auth();

        let balance = read_balance(&env, &from);
        if balance < amount {
            return Err(TokenError::InsufficientBalance);
        }

        write_balance(&env, &from, balance - amount);

        let supply = read_total_supply(&env);
        write_total_supply(&env, supply - amount);

        env.events().publish(
            (symbol_short!("burn"), from.clone()),
            amount,
        );

        Ok(())
    }

    /// Transfer tokens from one address to another
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), TokenError> {
        check_nonnegative(amount)?;
        from.require_auth();

        let from_balance = read_balance(&env, &from);
        if from_balance < amount {
            return Err(TokenError::InsufficientBalance);
        }

        write_balance(&env, &from, from_balance - amount);

        let to_balance = read_balance(&env, &to);
        write_balance(&env, &to, to_balance + amount);

        env.events().publish(
            (symbol_short!("transfer"),),
            (from, to, amount),
        );

        Ok(())
    }

    /// Transfer tokens using an allowance
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        check_nonnegative(amount)?;
        spender.require_auth();

        let allowance = read_allowance(&env, &from, &spender);
        if allowance < amount {
            return Err(TokenError::InsufficientAllowance);
        }
        write_allowance(&env, &from, &spender, allowance - amount);

        let from_balance = read_balance(&env, &from);
        if from_balance < amount {
            return Err(TokenError::InsufficientBalance);
        }

        write_balance(&env, &from, from_balance - amount);

        let to_balance = read_balance(&env, &to);
        write_balance(&env, &to, to_balance + amount);

        env.events().publish(
            (symbol_short!("transfer"),),
            (from, to, amount),
        );

        Ok(())
    }

    /// Approve an allowance for a spender
    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        _expiration_ledger: u32,
    ) -> Result<(), TokenError> {
        check_nonnegative(amount)?;
        from.require_auth();

        write_allowance(&env, &from, &spender, amount);

        env.events().publish(
            (symbol_short!("approve"),),
            (from, spender, amount),
        );

        Ok(())
    }

    // === View functions ===

    pub fn balance(env: Env, id: Address) -> i128 {
        read_balance(&env, &id)
    }

    pub fn total_supply(env: Env) -> i128 {
        read_total_supply(&env)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        read_allowance(&env, &from, &spender)
    }

    pub fn decimals(env: Env) -> u32 {
        TokenUtils::new(&env).metadata().get_metadata().decimal
    }

    pub fn name(env: Env) -> String {
        TokenUtils::new(&env).metadata().get_metadata().name
    }

    pub fn symbol(env: Env) -> String {
        TokenUtils::new(&env).metadata().get_metadata().symbol
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    /// Set a new admin — current admin only
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TokenError> {
        let admin = read_admin(&env);
        admin.require_auth();
        write_admin(&env, &new_admin);

        env.events().publish(
            (symbol_short!("admin"),),
            (admin, new_admin),
        );

        Ok(())
    }
}

#[cfg(test)]
mod test;
