# Repayment (Airdrop) Methods for NFT Holders

This document explains how to airdrop (repay) ADA to NFT holders based on their holdings.

## Overview

Use the `scripts:airdrop` command to send ADA to NFT holders of a project in bulk, calculated as: number of NFTs held × specified ADA amount.

## Prerequisites

### Environment Variable Configuration

The following environment variables must be set in the `.env` file:

```bash
# Blockfrost API keys
BLOCKFROST_API_KEY=<preprod key>
BLOCKFROST_MAINNET_API_KEY=<mainnet key>

# Wallet configuration (sender)
PAYMENT_MNEMONIC="<12 or 24 word mnemonic>"
```

> **Important**: **Never commit `PAYMENT_MNEMONIC` to Git**.

### Wallet Balance Check

Before sending, ensure the sender wallet has sufficient balance. Required balance is as follows:

- Total amount to send = Total NFTs held by all holders × ADA/NFT
- Transaction fees = Approximately 0.2 ADA × number of batches (estimate)
- **Required balance = Total amount to send + Transaction fees**

## Basic Usage

### 1. First Execution

```bash
pnpm scripts:airdrop <project-id> <network> <ada-per-nft>
```

**Parameters:**
- `project-id`: Project ID (e.g., `001`, `002`)
- `network`: Network (`preprod` or `mainnet`)
- `ada-per-nft`: Repayment ADA amount per NFT (e.g., `10`)

**Usage Examples:**
```bash
# Send 10 ADA per NFT to holders of project 001 on preprod
pnpm scripts:airdrop 001 preprod 10

# Send 5 ADA per NFT to holders of project 002 on mainnet
pnpm scripts:airdrop 002 mainnet 5
```

### 2. Execution Flow

1. **Fetch NFT Holders**: Retrieves a list of NFT holders for the project
2. **Calculate Amounts**: Calculates each address's holdings × ADA/NFT
3. **Balance Check**: Verifies wallet has sufficient balance
4. **Batch Processing**: Processes in batches of 50 addresses, considering transaction size limits
5. **Log Saving**: Records each transaction result in JSON format

### 3. Example Output

```
🚀 Starting airdrop refund for project 001 on preprod
   ADA per NFT: 10

📊 Fetching NFT holders...
Total holders: 25
Already processed: 0
Pending: 25

💰 Total refund amount: 250 ADA
   (250000000 lovelace)

💼 Wallet balance: 500 ADA
   Required: 250.5 ADA (including estimated fees)

📦 Processing 25 recipients in batches of 50...

[Batch 1/1] Processing 25 recipients...
  ✅ Success! TX: abc123def456...

============================================================
📊 Summary:
   Successful: 25 addresses
   Failed: 0 addresses
   Total sent: 250 ADA
   Log file: logs/airdrop-001-preprod-2024-01-01T12-00-00.json
============================================================
```

## Re-execution (Processing Only Failed Addresses)

If an error occurs mid-execution, you can re-run only failed addresses, skipping those that already succeeded.

### Re-execution Command

```bash
pnpm scripts:airdrop <project-id> <network> <ada-per-nft> --resume-from=<log-file>
```

**Usage Example:**
```bash
# Resume from previous log file
pnpm scripts:airdrop 001 preprod 10 --resume-from=logs/airdrop-001-preprod-2024-01-01T12-00-00.json
```

### Re-execution Behavior

1. Reads the specified log file
2. Extracts addresses from transactions with `status: "success"` and existing `txHash` in the log
3. Skips these addresses and processes only remaining addresses
4. Records results in a new log file (existing log is not overwritten)

> **Important**: Addresses that already succeeded will **never be sent again**. Addresses recorded as successful in the log file are automatically skipped.

## Log Files

### Log File Location

Log files are saved in the `logs/` directory.

File name format: `airdrop-<project-id>-<network>-<timestamp>.json`

Example: `airdrop-001-preprod-2024-01-01T12-00-00.json`

### Log File Structure

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "projectId": "001",
  "network": "preprod",
  "adaPerNft": 10,
  "totalHolders": 25,
  "totalAmount": "250000000",
  "transactions": [
    {
      "txHash": "abc123def456...",
      "addresses": ["addr1...", "addr2..."],
      "amounts": ["10000000", "50000000"],
      "status": "success",
      "timestamp": "2024-01-01T12:00:05.000Z"
    },
    {
      "txHash": null,
      "addresses": ["addr3..."],
      "amounts": ["20000000"],
      "status": "failed",
      "error": "Insufficient balance",
      "timestamp": "2024-01-01T12:00:10.000Z"
    }
  ],
  "summary": {
    "successful": 24,
    "failed": 1,
    "totalSent": "240000000"
  }
}
```

### How to Check Log Files

```bash
# Format and display JSON file
cat logs/airdrop-001-preprod-2024-01-01T12-00-00.json | jq .

# Display only successful transactions
cat logs/airdrop-001-preprod-2024-01-01T12-00-00.json | jq '.transactions[] | select(.status == "success")'

# Display only failed transactions
cat logs/airdrop-001-preprod-2024-01-01T12-00-00.json | jq '.transactions[] | select(.status == "failed")'
```

## Important Notes

### Security

- **Never commit `PAYMENT_MNEMONIC` to Git**
- Ensure the `.env` file is included in `.gitignore`
- Always test on preprod before executing on production (mainnet)

### Transaction Size Limits

Cardano transactions have an approximate 16KB size limit. Therefore, the script automatically processes in batches of 50 addresses.

If there are many addresses, they will be split across multiple transactions. After sending each transaction, it waits 2 seconds before processing the next batch (considering Blockfrost API rate limits).

### Error Handling

- If transaction submission fails, error details are recorded in the log
- Failed addresses are processed on re-execution
- For network errors or API limit errors, check the log and re-execute

### Insufficient Balance

If wallet balance is insufficient, the script displays an error and exits before execution.

```
❌ Error: Insufficient balance. Need 250.5 ADA, but have 200 ADA
```

In this case, add sufficient balance to the wallet and re-execute.

### Log File Management

- Log files are saved in the `logs/` directory
- `logs/` is included in `.gitignore`, so it won't be committed to Git
- Manually backup important log files

## Troubleshooting

### Common Errors

#### 1. `PAYMENT_MNEMONIC is not set in .env`
- Verify that `PAYMENT_MNEMONIC` is set in the `.env` file

#### 2. `Missing Blockfrost API key for <network>`
- Verify that the appropriate Blockfrost API key is set in the `.env` file
- For preprod: `BLOCKFROST_API_KEY`
- For mainnet: `BLOCKFROST_MAINNET_API_KEY`

#### 3. `Project <project-id> not found`
- Verify the project ID is correct
- Check that the project exists in `public/data/dev-projects.json` (preprod) or `public/data/projects.json` (mainnet)

#### 4. `No UTXOs available`
- Wallet may not have UTXOs
- Send a small amount of ADA to the wallet and retry

#### 5. `Failed to create collateral`
- Failed to create Collateral UTxO
- Verify wallet has sufficient balance (approximately 5 ADA required for Collateral creation)

### Notes on Re-execution

- When re-executing, **always specify the same `ada-per-nft` value**
- Specifying a different value will change the amount sent
- Use the log file path displayed during the previous execution as-is

## Related Commands

- `pnpm scripts:list <project-id> <network>`: Display NFT holder list (for verification before sending)
