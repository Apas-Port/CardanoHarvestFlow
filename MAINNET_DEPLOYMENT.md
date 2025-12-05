# Mainnet Deployment Guide

## Prerequisites

Before deploying to mainnet, ensure you have:

1. **Blockfrost Mainnet API Key**
   - Sign up at https://blockfrost.io/
   - Create a mainnet project
   - Copy your mainnet API key (starts with `mainnet...`)

2. **Mainnet Treasury Wallet Address**
   - Create a mainnet wallet (e.g., using Nami, Eternl, or Yoroi)
   - Get your mainnet address (starts with `addr1...`)
   - **IMPORTANT**: Keep your wallet seed phrase secure and never commit it to the repository

3. **Google Sheets API Credentials** (for asset data)
   - Keep your existing Google Sheets configuration
   - Ensure the GAS_ENDPOINT is configured in your environment

## Environment Configuration

### 1. Update `.env` file for mainnet:

```bash
# Network Configuration
CARDANO_NETWORK=mainnet

# Blockfrost Mainnet Configuration
BLOCKFROST_API_KEY=mainnetYourAPIKeyHere
BLOCKFROST_PROJECT_ID=mainnetYourAPIKeyHere

# Treasury Address (for receiving payments)
NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS=addr1YourMainnetTreasuryAddressHere

# Keep existing configurations
NFT_API_SECRET=your-secure-secret-key
GAS_ENDPOINT=https://script.google.com/macros/s/your-script-id/exec
MSPF_CLIENT_ID=your-mspf-client-id
MSPF_CLIENT_SECRET=your-mspf-client-secret

# Database (if using)
POSTGRES_URL=your-postgres-url
POSTGRES_URL_NON_POOLING=your-postgres-url-non-pooling
```

### 2. Generate Policy ID for Mainnet

After updating the treasury address, regenerate the policy ID:

```bash
npm run generate-policy-id
```

Update the `HARVESTFLOW_POLICY_ID` in your `.env` file with the generated value.

## Code Updates for Mainnet

### 1. Network Configuration

The application automatically detects the network based on `CARDANO_NETWORK` environment variable. The following components will adapt automatically:

- **Blockfrost API URLs**: Switches from preprod to mainnet endpoints
- **Explorer URLs**: Updates to mainnet explorers (cardanoscan.io)
- **Transaction fees**: Uses mainnet fee structure

### 2. Projects Data

Update `/public/data/projects.json` with mainnet-specific data:

```json
{
  "id": "00000000000000000000000000000001",
  "policyId": "your-mainnet-policy-id",
  "network": "Cardano",  // Use "Cardano" for mainnet
  // ... other project data
}
```

## Safety Checklist

Before going live on mainnet:

- [ ] **Never commit mainnet wallet mnemonics or private keys**
- [ ] Test all functionality on preprod/testnet first
- [ ] Verify treasury address is correct (double-check character by character)
- [ ] Ensure Blockfrost API key is for mainnet (starts with `mainnet`)
- [ ] Backup all wallet seed phrases securely (offline)
- [ ] Set appropriate transaction limits and validation
- [ ] Implement proper error handling for failed transactions
- [ ] Monitor initial transactions carefully
- [ ] Have a rollback plan ready

## Testing on Mainnet

1. **Start with small amounts**: Test with minimal ADA amounts first
2. **Monitor transactions**: Use cardanoscan.io to verify all transactions
3. **Check metadata**: Ensure NFT metadata is correctly stored on-chain
4. **Verify fees**: Confirm transaction fees are as expected

## Switching Between Networks

To switch between mainnet and testnet:

1. Update `CARDANO_NETWORK` in `.env`:
   - `mainnet` for production
   - `preprod` for testing

2. Update Blockfrost keys accordingly
3. Update treasury addresses
4. Restart the application

## Monitoring and Maintenance

1. **Transaction Monitoring**:
   - Monitor treasury address at: `https://cardanoscan.io/address/[your-address]`
   - Check transaction history regularly

2. **Error Logging**:
   - Monitor application logs for transaction failures
   - Set up alerts for failed minting attempts

3. **Regular Updates**:
   - Keep Cardano libraries updated
   - Monitor Cardano protocol changes

## Support and Resources

- Blockfrost Documentation: https://docs.blockfrost.io/
- Cardano Developer Portal: https://developers.cardano.org/
- Mesh SDK Documentation: https://meshjs.dev/

## Emergency Procedures

If issues occur on mainnet:

1. **Immediately disable minting**: Set an environment flag to disable new mints
2. **Document the issue**: Record transaction IDs and error messages
3. **Switch to maintenance mode**: Redirect users to a maintenance page
4. **Investigate and fix**: Debug in preprod environment first
5. **Test thoroughly**: Ensure fix works on testnet before re-enabling mainnet

Remember: Mainnet transactions are permanent and involve real money. Always double-check everything before deployment.