# HARVEST FLOW - Cardano NFT Lending Platform

HARVEST FLOW is a NFT Based crypto asset lending platform that enables users to participate in real-world asset (RWA) projects while earning fixed-rate returns. The platform combines blockchain technology with social impact initiatives, allowing users to lend crypto assets to projects that aim to improve the world.

## Overview

HARVEST FLOW is a service where users hold crypto assets for a fixed period and receive the same quantity and type of crypto assets at the end of the contract term, along with lending fees calculated at a fixed rate. It is a crypto asset lending (loan-for-consumption) service provided in accordance with Japanese law, ensuring a safe and reliable experience for users.

### Key Features

- **NFT Minting**: Mint Proof of Support NFTs on the Cardano blockchain
- **Project-Based Lending**: Participate in various real-world asset projects
- **Oracle Integration**: Real-time data synchronization with on-chain oracles
- **Wallet Integration**: Seamless connection with Cardano wallets via Mesh SDK
- **Airdrop/Refund System**: Automated refund distribution to NFT holders
- **Multi-Language Support**: English and Japanese (i18n)
- **Real-World Asset Tracking**: Monitor RWA project performance and earnings

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Blockchain**: Cardano (via Mesh SDK)
- **API Provider**: Blockfrost API
- **Smart Contracts**: Aiken/Plutus validators
- **Styling**: TailwindCSS
- **State Management**: React Query (@tanstack/react-query)
- **Deployment**: Vercel

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.0.0
- **Package Manager**: pnpm (preferred) or npm
- **Blockfrost API Keys**: 
  - Preprod API key for development
  - Mainnet API key for production
- **Cardano Wallet**: For development and testing (e.g., Nami, Eternl, Lace)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CardanoHarvestFlow
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables) section).

4. **Initialize the project** (optional)
   ```bash
   pnpm scripts:init <project-id> <network>
   ```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Network Configuration
```bash
CARDANO_NETWORK=preprod  # or 'mainnet'
NEXT_PUBLIC_CARDANO_NETWORK=preprod  # or 'mainnet'
```

### Blockfrost API Keys
```bash
# Preprod (for development)
BLOCKFROST_API_KEY=preprodYourAPIKeyHere
BLOCKFROST_PROJECT_ID=preprodYourAPIKeyHere

# Mainnet (for production)
BLOCKFROST_MAINNET_API_KEY=mainnetYourAPIKeyHere
BLOCKFROST_MAINNET_PROJECT_ID=mainnetYourAPIKeyHere
```

### Treasury Addresses
```bash
# Mainnet treasury address
NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS=addr1q...

# Development treasury address (preprod)
NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS_DEV=addr_test1q...
```

### Policy Configuration
```bash
HARVESTFLOW_POLICY_ID=your-policy-id-here
```

### Database (Optional)
```bash
POSTGRES_URL=postgres://username:password@host/database?sslmode=require
POSTGRES_URL_NON_POOLING=postgres://username:password@host/database?sslmode=require
```

### Payment Wallet (for scripts)
```bash
# ⚠️ NEVER commit this to version control
PAYMENT_MNEMONIC="your 12 or 24 word mnemonic phrase"
PAYMENT_ACCOUNT_INDEX=0
PAYMENT_ADDRESS_INDEX=0
```

### Other Configuration
```bash
NFT_API_SECRET=your-very-secure-secret-key-here
GAS_ENDPOINT=https://script.google.com/macros/s/your-script-id/exec
MSPF_CLIENT_ID=your-mspf-client-id
MSPF_CLIENT_SECRET=your-mspf-client-secret
```

> **⚠️ Security Warning**: Never commit `.env.local` or any files containing mnemonics, API keys, or secrets to version control. Always use `.env.local` for local development secrets.

## Development

### Start Development Server

```bash
pnpm dev
# or
npm run dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

#### Development Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build production assets
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

#### Cardano Operation Scripts
- `pnpm scripts:init <project-id> <network>` - Initialize a new project
- `pnpm scripts:toggle-minting <project-id> <network>` - Toggle minting status
- `pnpm scripts:check-oracle <project-id> <network>` - Check oracle status
- `pnpm scripts:check-metadata` - Validate metadata length
- `pnpm scripts:list <project-id> <network>` - List NFT holders
- `pnpm scripts:airdrop <project-id> <network> <ada-per-nft>` - Airdrop refunds to holders
- `pnpm scripts:balance` - Check wallet balance

For detailed usage of these scripts, see the documentation in the `/docs` directory.

## Project Structure

```
CardanoHarvestFlow/
├── app/                    # Next.js App Router
│   ├── [lng]/             # Internationalized routes
│   │   ├── account/      # User account page
│   │   ├── proof/        # Proof of Support page
│   │   └── page.tsx      # Home page
│   └── api/              # API routes
│       ├── cardano/      # Cardano blockchain operations
│       ├── nft/         # NFT operations
│       └── project/     # Project management
├── components/           # React components
│   ├── account/         # Account-related components
│   ├── common/         # Shared UI components
│   ├── modal/          # Modal components
│   ├── proof/          # Proof page components
│   └── top/            # Home page components
├── lib/                 # Core business logic
│   ├── nft-contracts/  # Aiken smart contracts
│   ├── cardano-*.ts    # Cardano service modules
│   └── network-config.ts
├── hooks/              # React hooks
├── scripts/            # Utility scripts
├── public/             # Static assets
│   ├── data/          # Project data (JSON)
│   └── locales/       # i18n translation files
├── docs/              # Documentation
└── types/             # TypeScript type definitions
```

## API Endpoints

### Cardano Operations

- `POST /api/cardano/mint` - Mint a single NFT
- `POST /api/cardano/mint-bulk` - Bulk minting
- `POST /api/cardano/build-tx` - Build a transaction
- `POST /api/cardano/submit` - Submit a transaction
- `POST /api/cardano/init` - Initialize project contract
- `GET /api/cardano/status` - Get transaction status
- `POST /api/cardano/toggle-minting` - Toggle minting status
- `GET /api/cardano/config` - Get network configuration

### NFT Operations

- `GET /api/nft/highest-id` - Get highest NFT ID
- `POST /api/nft/verify-metadata` - Verify NFT metadata

### Project Management

- `GET /api/project/minted-count` - Get minted count for a project
- `POST /api/project/update-minted-count` - Update minted count

## Smart Contracts

The project includes Aiken-based Plutus smart contracts located in `/lib/nft-contracts/aiken/`. These contracts handle:

- Oracle NFT validation
- Series NFT management
- Plutus NFT minting logic

### Building Contracts

```bash
cd lib/nft-contracts/aiken
aiken build
```

### Testing Contracts

```bash
aiken check
```

For more information, see `/lib/nft-contracts/README.md`.

## Deployment

### Vercel Deployment

1. **Configure Vercel Settings**
   - Framework Preset: Next.js
   - Node.js Version: 20.x
   - Install Command: `pnpm install --no-frozen-lockfile`
   - Build Command: `pnpm build`
   - Output Directory: `.next`

2. **Set Environment Variables**
   Add all required environment variables in Vercel dashboard:
   - `BLOCKFROST_API_KEY`
   - `BLOCKFROST_MAINNET_API_KEY`
   - `CARDANO_NETWORK`
   - `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS`
   - And other required variables

3. **Deploy**
   ```bash
   git push origin main
   ```

For detailed deployment instructions, see:
- `DEPLOYMENT.md` - General deployment guide
- `MAINNET_DEPLOYMENT.md` - Mainnet-specific deployment

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Blockfrost API keys set for target network
- [ ] Treasury addresses verified
- [ ] Policy IDs generated and configured
- [ ] Database connections tested (if applicable)
- [ ] Build completes successfully (`pnpm build`)

## Documentation

Additional documentation is available in the `/docs` directory:

- **返済方法.md** (Japanese) - Guide for airdrop/refund operations
- **新しいプロジェクトの追加方法.md** (Japanese) - How to add new projects

## Security

### Best Practices

1. **Never commit secrets**
   - Use `.env.local` for local development
   - Add `.env.local` to `.gitignore`
   - Rotate any accidentally exposed credentials immediately

2. **Mnemonic Security**
   - Never store mnemonics in code or version control
   - Use secure environment variables
   - Consider using hardware wallets for production

3. **API Key Management**
   - Use different keys for development and production
   - Regularly rotate API keys
   - Monitor API usage for suspicious activity

4. **Network Configuration**
   - Always test on preprod before mainnet deployment
   - Verify network settings match target environment
   - Double-check treasury addresses before production