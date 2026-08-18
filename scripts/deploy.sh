#!/bin/bash
# StellarLend Deployment Script
# Deploys all contracts to Stellar Testnet in dependency order

set -euo pipefail

echo "🚀 StellarLend Contract Deployment"
echo "=================================="
echo ""

NETWORK="testnet"
SOURCE="deployer"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if deployer identity exists, create if not
if ! stellar keys show $SOURCE 2>/dev/null; then
    echo -e "${BLUE}Generating deployer identity and funding from Friendbot...${NC}"
    stellar keys generate $SOURCE --network $NETWORK --fund
    echo -e "${GREEN}✅ Deployer funded${NC}"
fi

echo ""
echo "📋 Deployer Address:"
stellar keys address $SOURCE
echo ""

# Step 1: Build all contracts
echo "🔨 Building contracts..."
cargo build --release --target wasm32-unknown-unknown
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Deploy Token Contract
echo "📦 Deploying Token Contract..."
TOKEN_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/stellar_lend_token.wasm \
    --source $SOURCE \
    --network $NETWORK)
echo -e "${GREEN}✅ Token Contract: $TOKEN_ID${NC}"

# Step 3: Deploy Price Oracle
echo "📦 Deploying Price Oracle..."
ORACLE_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/stellar_lend_price_oracle.wasm \
    --source $SOURCE \
    --network $NETWORK)
echo -e "${GREEN}✅ Price Oracle: $ORACLE_ID${NC}"

# Step 4: Deploy Governance
echo "📦 Deploying Governance Contract..."
GOV_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/stellar_lend_governance.wasm \
    --source $SOURCE \
    --network $NETWORK)
echo -e "${GREEN}✅ Governance Contract: $GOV_ID${NC}"

# Step 5: Deploy Lending Pool
echo "📦 Deploying Lending Pool..."
POOL_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/stellar_lend_lending_pool.wasm \
    --source $SOURCE \
    --network $NETWORK)
echo -e "${GREEN}✅ Lending Pool: $POOL_ID${NC}"

echo ""
echo "=================================="
echo "🎉 Deployment Complete!"
echo "=================================="
echo ""
echo "Contract IDs:"
echo "  Token:      $TOKEN_ID"
echo "  Oracle:     $ORACLE_ID"
echo "  Governance: $GOV_ID"
echo "  Pool:       $POOL_ID"
echo ""

# Save contract IDs to file
cat > deployment-info.json << EOF
{
    "network": "$NETWORK",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "contracts": {
        "token": "$TOKEN_ID",
        "price_oracle": "$ORACLE_ID",
        "governance": "$GOV_ID",
        "lending_pool": "$POOL_ID"
    },
    "deployer": "$(stellar keys address $SOURCE)"
}
EOF

echo "📄 Deployment info saved to deployment-info.json"
