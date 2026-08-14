#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, Map, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    PriceNotFound = 4,
    InvalidPrice = 5,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Price(Address),
    LastUpdate(Address),
    Initialized,
    AssetList,
}

/// Price data with timestamp
#[contracttype]
#[derive(Clone, Debug)]
pub struct PriceData {
    pub price: i128,       // Price in base units (18 decimals)
    pub timestamp: u64,    // Ledger timestamp of last update
    pub confidence: u32,   // Confidence level (0-100)
}

#[contract]
pub struct PriceOracleContract;

#[contractimpl]
impl PriceOracleContract {
    /// Initialize the oracle with an admin address
    pub fn initialize(env: Env, admin: Address) -> Result<(), OracleError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(OracleError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Initialized, &true);

        let empty_list: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::AssetList, &empty_list);

        env.events().publish(
            (symbol_short!("init"),),
            admin,
        );

        Ok(())
    }

    /// Set or update the price for an asset — admin only
    pub fn set_price(
        env: Env,
        asset: Address,
        price: i128,
        confidence: u32,
    ) -> Result<(), OracleError> {
        let admin: Address = env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();

        if price <= 0 {
            return Err(OracleError::InvalidPrice);
        }

        // Get old price for event
        let old_price = env.storage()
            .persistent()
            .get::<DataKey, PriceData>(&DataKey::Price(asset.clone()))
            .map(|p| p.price)
            .unwrap_or(0);

        let price_data = PriceData {
            price,
            timestamp: env.ledger().timestamp(),
            confidence,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Price(asset.clone()), &price_data);

        // Track the asset in our list
        let mut assets: Vec<Address> = env.storage()
            .persistent()
            .get(&DataKey::AssetList)
            .unwrap_or(Vec::new(&env));

        // Add asset if not already tracked
        let mut found = false;
        for i in 0..assets.len() {
            if assets.get(i).unwrap() == asset {
                found = true;
                break;
            }
        }
        if !found {
            assets.push_back(asset.clone());
            env.storage().persistent().set(&DataKey::AssetList, &assets);
        }

        // Emit PriceUpdated event
        env.events().publish(
            (symbol_short!("price"), symbol_short!("updated")),
            (asset, old_price, price, confidence),
        );

        Ok(())
    }

    /// Set prices for multiple assets in a single transaction — admin only
    pub fn set_prices(
        env: Env,
        assets: Vec<Address>,
        prices: Vec<i128>,
        confidences: Vec<u32>,
    ) -> Result<(), OracleError> {
        let admin: Address = env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();

        for i in 0..assets.len() {
            let asset = assets.get(i).unwrap();
            let price = prices.get(i).unwrap();
            let confidence = confidences.get(i).unwrap();

            if price <= 0 {
                return Err(OracleError::InvalidPrice);
            }

            let price_data = PriceData {
                price,
                timestamp: env.ledger().timestamp(),
                confidence,
            };

            env.storage()
                .persistent()
                .set(&DataKey::Price(asset.clone()), &price_data);
        }

        env.events().publish(
            (symbol_short!("price"), symbol_short!("batch")),
            assets.len(),
        );

        Ok(())
    }

    /// Get the current price for an asset
    pub fn get_price(env: Env, asset: Address) -> Result<PriceData, OracleError> {
        env.storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::PriceNotFound)
    }

    /// Get prices for multiple assets
    pub fn get_prices(env: Env, assets: Vec<Address>) -> Vec<PriceData> {
        let mut results = Vec::new(&env);
        for i in 0..assets.len() {
            let asset = assets.get(i).unwrap();
            let price_data = env.storage()
                .persistent()
                .get::<DataKey, PriceData>(&DataKey::Price(asset))
                .unwrap_or(PriceData {
                    price: 0,
                    timestamp: 0,
                    confidence: 0,
                });
            results.push_back(price_data);
        }
        results
    }

    /// Get the list of all tracked assets
    pub fn get_assets(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::AssetList)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the admin address
    pub fn admin(env: Env) -> Result<Address, OracleError> {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)
    }

    /// Transfer admin role
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), OracleError> {
        let admin: Address = env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &new_admin);

        env.events().publish(
            (symbol_short!("admin"),),
            (admin, new_admin),
        );

        Ok(())
    }
}

#[cfg(test)]
mod test;
