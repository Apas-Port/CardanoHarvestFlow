# How to Add New Projects

When publishing a new project on Harvestflow, you work in the following order: local environment setup, on-chain initialization, and deployment to Vercel. This document explains the process using `scripts/init-project.ts`.

## 0. Prerequisites

First, clone the repository and install dependencies.

```bash
pnpm install
```

### Environment Variable Configuration

Environment variables are managed in the `.env` file at the project root. Add the following:

```bash
# Network configuration
CARDANO_NETWORK=preprod
NEXT_PUBLIC_CARDANO_NETWORK=preprod

# Blockfrost API keys
BLOCKFROST_API_KEY=<preprod key>
BLOCKFROST_MAINNET_API_KEY=<mainnet key>

# Treasury address (address that receives mint proceeds)
NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS=<mainnet address>
NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS_DEV=<preprod address>

# Wallet configuration (for local development)
PAYMENT_MNEMONIC="<12 or 24 word mnemonic>"
# PAYMENT_ACCOUNT_INDEX=0
# PAYMENT_ADDRESS_INDEX=0
# PAYMENT_MNEMONIC_PASSPHRASE=

# Project-specific parameter UTXO (automatically added after init command execution)
# PARAM_UTXO_PROJECT_NAME='{"outputIndex": 0, "txHash": "..."}'
```

If you're using multiple accounts with Lace, adjust `PAYMENT_ACCOUNT_INDEX` and `PAYMENT_ADDRESS_INDEX` according to your actual usage.

> **Security Note**:
> - **Never commit `PAYMENT_MNEMONIC` to Git**.
> - Ensure the `.env` file is included in `.gitignore`.
> - Use Vercel's environment variable settings for production.

## 1. Editing Project JSON

When adding a new project, first add an object like the following to `public/data/dev-projects.json`. The `id` should be a unique string (e.g., "001", "002").

```json
{
  "id": "002",
  "num": 2,
  "title": "Project Name",
  "subTitle": "Subtitle",
  "description": "Project overview",
  "apy": 8.0,
  "lendingType": "ADA",
  "network": "Cardano",
  "capacity": 300,
  "unitPrice": 1,
  "collectionName": "Harvestflow",
  "mainImage": "/images/project/2/main.png",
  "previewImage": "/images/project/2/preview.jpg",
  "tuktukImage": "/images/project/2/tuktuk.png",
  "policyId": "",
  "legacyPolicyIds": [],
  "status": "active",
  "interestEarned": "base number",
  "interestRate": 8.0,
  "repaymentMethod": "AT MATURITY",
  "lendingPeriod": 12,
  "assetId": ["79", "80", "81"],
  "startDate": "1 Oct 2025",
  "listing": true,
  "maxMints": 100,
  "paramUtxoEnvKey": "PARAM_UTXO_PROJECT_2",
  "mintPriceLovelace": 1969750,
  "metadata": {
    "name": "Harvestflow Project NFT",
    "image": "ipfs://QmY53cEvybvh9BkHjgGeP2C8mG5FEjLcnVjegkGeTmqEQ1",
    "description": "Support the project through this NFT",
    "mediaType": "image/png",
    "attributes": [
      {
        "trait_type": "Collection",
        "value": "Harvestflow"
      },
      {
        "trait_type": "Project",
        "value": "Project Name"
      },
      {
        "trait_type": "APY",
        "value": "8%"
      },
      {
        "trait_type": "Lending Period",
        "value": "12 months"
      }
    ]
  }
}
```

> **⚠️ Metadata Length Limit**:
> - Cardano metadata has a **64-byte limit per field**.
> - All fields in the `metadata` object (`name`, `description`, `image` (IPFS CID part), each value in `attributes`, etc.) must be 64 bytes or less.
> - To check metadata length, run `pnpm run scripts:check-metadata`.
> - This command automatically checks both `public/data/projects.json` and `public/data/dev-projects.json`.
> - If errors are detected, fix the metadata before minting.

#### Field Categories

| Field | Category | Purpose/Description |
| --- | --- | --- |
| `id`, `num` | UI display | Project identifier/number |
| `title`, `subTitle`, `description` | UI display | Project description text |
| `lendingType`, `network` | UI display | Project classification information |
| `capacity`, `unitPrice` | UI display | Display parameters for UI |
| `mainImage`, `previewImage`, `tuktukImage` | UI display | Image paths |
| `status`, `listing` | UI display | Project status/listing flag |
| `interestEarned`, `interestRate`, `repaymentMethod` | UI display | Interest information (display only) |
| `assetId`, `startDate` | UI display | Related information (for display) |
| `legacyPolicyIds` | UI display | Legacy policy IDs (for verification/compatibility) |
| `apy` | Blockchain initialization | Registered to Oracle's `expectedAprNumerator` |
| `lendingPeriod` | Blockchain initialization | Used to calculate `maturationTime` (in months) |
| `maxMints` | Blockchain initialization | Registered to Oracle's `maxMints` |
| `mintPriceLovelace` | Blockchain initialization | Registered to Oracle's `lovelacePrice` (e.g., 1969750 = 1.96975 ADA). If below 1.5 ADA, may fall below UTxO minimum and cause mint errors |
| `collectionName` | Blockchain & UI | NFT collection name (also used on blockchain) |
| `policyId` | Retrieved from blockchain | Automatically generated and updated from Oracle after `init` execution |
| `paramUtxoEnvKey` | Server-side configuration | Environment variable key name (for Oracle UTxO reference) |
| `metadata` | NFT metadata | Metadata used when minting NFTs |

Place images in `public/images/project/<num>/`. When publishing to mainnet in the future, copy the same structure to `public/data/projects.json`.

### Understanding Data Structure

When adding a project, it's important to distinguish between **information registered on the blockchain** and **information maintained in the frontend**.

#### Information Registered on Blockchain (Oracle Datum)

The following information is permanently recorded on the Oracle UTxO on the blockchain when `init-project.ts` is executed. These are used in contract logic and require transactions to change.

| Field | Description | Data Type | Corresponding JSON Field |
| --- | --- | --- | --- |
| `nftIndex` | Current NFT index (automatically incremented with each mint) | Integer | (dynamically updated, not stored in JSON) |
| `lovelacePrice` | NFT mint price (in Lovelace) | Integer | `mintPriceLovelace` |
| `feeCollectorAddress` | Fee collection address (pubKeyHash + stakeCredentialHash) | PubKeyAddress | (automatically retrieved from network config) |
| `nftMintAllowed` | Mint permission flag | Bool | (set to `true` on initialization, can be changed later) |
| `nftTradeAllowed` | Trade permission flag | Bool | (set to `true` on initialization, can be changed later) |
| `expectedAprNumerator` | APR numerator | Integer | `apy` (value as-is) |
| `expectedAprDenominator` | APR denominator | Integer | Fixed value `100` |
| `maturationTime` | Maturity time (Unix timestamp) | Integer | Calculated from `startDate` + `lendingPeriod` |
| `maxMints` | Maximum mint count | Integer | `maxMints` |

**Information Generated/Referenced on Blockchain**:
- `policyId`: NFT policy ID generated from Oracle UTxO parameters (written back to JSON after `init-project.ts` execution)
- `paramUtxo`: Oracle UTxO reference information (`txHash`, `outputIndex`) → managed in `.env` environment variables

#### Information Maintained in Frontend (dev-projects.json / projects.json)

The following information is managed in JSON files and used for UI display and filtering. It is not registered on the blockchain.

**UI Display (unrelated to blockchain)**:
- `id`, `num`: Project identifiers
- `title`, `subTitle`, `description`: Project description text
- `mainImage`, `previewImage`, `tuktukImage`: Image paths
- `status`: Project status (`"active"`, `"inactive"`, etc.)
- `listing`: Whether to display in listing
- `assetId`: Related asset IDs (for display)
- `interestEarned`, `interestRate`, `repaymentMethod`: Interest information (for display)
- `lendingType`, `network`: Project classification (for display)
- `capacity`, `unitPrice`: Display parameters for UI

**Used During Blockchain Initialization (after initialization, blockchain values take priority)**:
- `apy`: Used as APR numerator registered to Oracle (after initialization, read from Oracle)
- `lendingPeriod`: Used to calculate `maturationTime`
- `maxMints`: Used as maximum mint count registered to Oracle
- `mintPriceLovelace`: Used as price registered to Oracle
- `collectionName`: Used as NFT collection name (also referenced on blockchain)

**Values Retrieved from Blockchain**:
- `policyId`: Automatically updated after Oracle initialization
- `paramUtxoEnvKey`: Environment variable key name (used when server retrieves Oracle UTxO)

**For NFT Metadata**:
- `metadata`: Metadata used when minting NFTs (can also be registered to IPFS)

#### Data Synchronization

- **During Initialization**: Values from `dev-projects.json` are registered to Oracle
- **After Initialization**: `policyId` is automatically written back to JSON
- **At Runtime**: When minting or checking Oracle status, the latest state (price, mint count, permission flags, etc.) is retrieved from the Oracle on the blockchain via Blockfrost API

> **Note**: Values like `apy`, `lendingPeriod`, `maxMints`, `mintPriceLovelace` are also stored in JSON, but in actual contract operation, **values from the Oracle on the blockchain take priority**. If JSON values differ from Oracle values, Oracle values are used.

## 2. On-Chain Initialization

### 2.1 Wallet Balance Check

Before protocol initialization, check your wallet balance:

```bash
pnpm run scripts:balance [network]
```

This command displays the current wallet address and balance (in lovelace and ADA). Sufficient ADA is required for protocol initialization.

**Usage Examples**:
```bash
# Check balance on mainnet (default)
pnpm run scripts:balance

# Check balance on preprod
pnpm run scripts:balance preprod
```

### 2.2 Protocol Initialization

`pnpm run scripts:init <project-id> [network]`

When you run this command, the following information from `dev-projects.json` is registered to the Oracle UTxO on the blockchain:
- `apy` → Oracle's `expectedAprNumerator`
- `lendingPeriod` → Oracle's `maturationTime` (calculated from current time + `lendingPeriod`)
- `maxMints` → Oracle's `maxMints`
- `mintPriceLovelace` → Oracle's `lovelacePrice`
- `collectionName` → Used as NFT collection name

On first execution, a transaction to create a collateral UTxO is sent, so wait about 10-30 seconds for completion. When the command succeeds, the reference UTxO JSON is displayed and automatically added to the `.env` file. At the same time, the latest `policyId` is written back to the corresponding project in `public/data/dev-projects.json`.

> **Reference**: For details on information registered on the blockchain, see the [Understanding Data Structure](#understanding-data-structure) section.

**Usage Examples**:
```bash
# Initialize on preprod (default)
pnpm run scripts:init 002

# Initialize on mainnet
pnpm run scripts:init 002 mainnet
```

**Execution Example**:
```shell
% pnpm run scripts:init 002

🚀 Initializing Oracle for project: 002 on preprod

📋 Project Configuration:
   - Title: Project Name
   - Collection: Harvestflow
   - APY: 8%
   - Lending Period: 12 months
   - Max Mints: 100
   - Mint Price: 1.96975 ADA

🔗 Using preprod network

💼 No collateral UTxO found, creating one...

📝 Collateral creation transaction submitted: 58aa2dec5d7e3a154a93f1b37bde37dfe61e7f85d5043a670356ac2ce1ad2a8a

⏳ Waiting for collateral confirmation (30 seconds)...

✅ Collateral UTxO confirmed!

💼 Wallet Address: addr_test1qrvr7ffc2xjxk4wn5vxflernwu76la8ruqgx4nrq5q6eplv5fpsna8q8hytqhepswuavuaqg83qtnkkrndtv3jxhd7fqtxr8p8

⚙️  Oracle Parameters:
   - Lovelace Price: 1969750 (1.96975 ADA)
   - Expected APR: 8/100 (8%)
   - Maturation Time: 2026-10-01T00:00:00.000Z
   - Max Mints: 100

📦 Loading nft-contracts...

🔨 Booting Oracle...

✅ Oracle booted successfully!

📝 ParamUtxo:
   - TX Hash: bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20
   - Output Index: 2

⏳ Waiting for transaction confirmation (30 seconds)...

🔓 Enabling NFT minting...

✅ NFT minting enabled successfully!

🔑 Policy ID: e9491aa6d9aeabd3a266fbaa13aee963b05e9db4afb12f8795443d1a

💾 Saved paramUtxo to: param-utxo-002.json
💾 Updated dev-projects.json with policyId
💾 Updated .env with PARAM_UTXO_PROJECT_2

🔍 Environment Variable Confirmation:
   PARAM_UTXO_PROJECT_2='{"txHash":"bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20","outputIndex":2}'

✨ Project initialization completed!

📋 Next steps:
   1. Update your frontend .env with the new policyId
   2. Restart your development server
   3. Test minting with the new project
```

The `PARAM_UTXO_xxx` content displayed in this command's output is automatically added to the **`.env` file at the project root**.

### 2.2 Oracle Status Check (Optional)

`pnpm run scripts:check-oracle <project-id> [network]`

This command checks the Oracle status to verify that minting is allowed and that price and supply limits are as expected.

**Usage Examples**:
```bash
# Check Oracle status on preprod (default)
pnpm run scripts:check-oracle 002

# Check Oracle status on mainnet
pnpm run scripts:check-oracle 002 mainnet
```

### 2.3 Toggle Minting Permission (Optional)

To temporarily pause minting, run `pnpm run scripts:toggle-minting -- --project=<project-id> --disable`. To resume, run `pnpm run scripts:toggle-minting -- --project=<project-id> --enable`.

**Usage Examples**:
```bash
# Disable minting
pnpm run scripts:toggle-minting -- --project=002 --disable

# Enable minting
pnpm run scripts:toggle-minting -- --project=002 --enable

# Check current status
pnpm run scripts:toggle-minting -- --project=002 --status
```

### 2.4 Execute Minting & Update PolicyID

To actually mint NFTs, start the frontend with `npm run dev` or call the server API directly.

**Note**: After minting once, you may need to obtain the correct PolicyID and embed it in `dev-projects.json`. PolicyID can be checked on block explorers like CExplorer.

### 2.5 Holder Verification

`pnpm run scripts:list <project-id> <network>`

This command retrieves a list of NFT holders for the specified project.

**Usage Examples**:
```bash
# Get holder list on preprod
pnpm run scripts:list 002 preprod

# Get holder list on mainnet
pnpm run scripts:list 002 mainnet
```

**Execution Example**:
```shell
% pnpm run scripts:list 002 preprod

Fetching NFT holders for project 002 on preprod...

Project: Project Name
Policy ID: e9491aa6d9aeabd3a266fbaa13aee963b05e9db4afb12f8795443d1a
Collection: Harvestflow

Fetching assets...
Found 2 NFTs

========================================================================================================================
Address                                                                                                         | Token IDs                      | Quantity
========================================================================================================================
addr_test1qr87g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sthc6ty | 0, 1                           | 2
========================================================================================================================

Total holders: 1
Total NFTs: 2

Statistics:
- Average NFTs per holder: 2.00
- Largest holder: addr_test1qr87g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sthc6ty (2 NFTs)
```

## 3. Environment Variable Organization

### Environment Variables to Set in Project Root `.env`

Environment variables hold information needed to reference the Oracle UTxO on the blockchain. These are only used server-side and are not exposed to clients.

| Key | Category | Purpose/Description | Location |
| --- | --- | --- | --- |
| **Blockchain Reference Information** ||||
| `PARAM_UTXO_<PROJECT>` | Blockchain reference | Automatically generated after `init` command execution. Contains Oracle UTxO location information (`txHash` and `outputIndex`) as a JSON string. Used when server reads Oracle data. Also register with the same name in Vercel environment variables. | `.env` |
| **Wallet Configuration (for server-side signing)** ||||
| `PAYMENT_MNEMONIC` | Server configuration | 12 or 24 word mnemonic used for transaction signing on the server. **For security, do not commit to Git**. | `.env` |
| `PAYMENT_ACCOUNT_INDEX` | Server configuration | Adjusts derivation path when using multiple accounts with Lace, etc. (default: 0). | `.env` |
| `PAYMENT_ADDRESS_INDEX` | Server configuration | Adjusts derivation path when using multiple addresses with Lace, etc. (default: 0). | `.env` |
| `PAYMENT_MNEMONIC_PASSPHRASE` | Server configuration | Only set if using BIP39 passphrase. | `.env` |
| **Network Configuration** ||||
| `CARDANO_NETWORK` | Network configuration | Network to use (`preprod` or `mainnet`). | `.env` |
| `BLOCKFROST_API_KEY` | Network configuration | Blockfrost API key for Preprod. | `.env` |
| `BLOCKFROST_MAINNET_API_KEY` | Network configuration | Blockfrost API key for Mainnet. | `.env` |
| `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS` | Network configuration | Treasury address for Mainnet (address that receives mint proceeds). **Required**. | `.env` |
| `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS_DEV` | Network configuration | Treasury address for Preprod (address that receives mint proceeds). **Required**. | `.env` |

> **Important**: 
> - When deploying to production environments like Vercel, also add the same environment variables to Vercel's environment variable settings.
> - `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS` and `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS_DEV` are **required**. If not set, the application will stop with an error on startup.
> - `PARAM_UTXO_*` environment variables only store Oracle UTxO reference information. Actual data recorded in the Oracle (price, APR, mint count, etc.) is read by the server from the blockchain via Blockfrost API.

## 4. Verification

First, check metadata length limits:

```bash
pnpm run scripts:check-metadata
```

If this command detects errors, fix the metadata before minting.

Next, start the application with `npm run dev` and verify that the new project appears on the top page. Then run `npm run lint` to ensure static analysis passes. After performing a test mint, verify again that holder information can be retrieved with `pnpm run scripts:list <project-id> <network>`.

## 5. Deployment

When publishing to production, add the same entry to `public/data/projects.json`. Replace `policyId` and `paramUtxoEnvKey` with production values, and switch Vercel environment variables to mainnet (e.g., `BLOCKFROST_MAINNET_API_KEY` or `CARDANO_NETWORK=mainnet`). Then run `pnpm run scripts:init <project-id> mainnet` to create a production reference UTxO. Finally, deploy to Vercel and check the status with `pnpm run scripts:check-oracle <project-id> mainnet`.

## Command Reference

| Command | Description |
| --- | --- |
| `pnpm run scripts:init <project-id> [network]` | Initializes the protocol and generates a new param UTxO. |
| `pnpm run scripts:check-oracle <project-id> [network]` | Checks the price and status recorded in the Oracle. Omitting `network` checks on preprod, specifying `mainnet` checks on mainnet. |
| `pnpm run scripts:check-metadata` | Checks that each metadata field does not exceed the 64-byte limit. Automatically checks both `projects.json` and `dev-projects.json`. |
| `pnpm run scripts:toggle-minting -- --project=<project-id> --enable` | Enables minting. |
| `pnpm run scripts:toggle-minting -- --project=<project-id> --disable` | Disables minting. |
| `pnpm run scripts:toggle-minting -- --project=<project-id> --status` | Checks minting permission status. |
| `pnpm run scripts:list <project-id> <network>` | Displays holder list for the latest policyId. |

## Troubleshooting

- If `No collateral found` is displayed, the collateral UTxO may not have been generated yet. Wait a few seconds for the transaction to be included in a block and retry. If balance is insufficient, add ADA.
- If `ENOENT: open '/...{"txHash":...}'` is displayed, extra quotes are attached to `PARAM_UTXO_*` in `.env`. Fix it to a pure JSON string.
- If `Minting error: TxSignError` is displayed, the browser wallet may not have the required inputs. Select the correct wallet or add funding UTxOs.
- If `TxSubmitFail` is displayed, there is an issue with redeemer or datum integrity. Check the error message and investigate if there are discrepancies in settings like price.
- If `MAX_LENGTH_LIMIT` error is displayed, a metadata field exceeds 64 bytes. Run `pnpm run scripts:check-metadata` to identify the problematic field and fix it.
- If the project is not found, verify that it has been correctly added to `public/data/dev-projects.json` or `public/data/projects.json`.

Following the above flow, you can consistently perform on-chain setup for new projects, UI reflection, and deployment.
