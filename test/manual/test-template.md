# Manual Test Results

## Test Information
- **Test Date**: YYYY-MM-DD
- **Tester**: [Your Name]
- **Environment**: preprod / mainnet
- **Browser**: Chrome / Firefox / Safari / Edge
- **Browser Version**: [e.g., Chrome 120.0]
- **Wallet**: Nami / Eternl / Lace / Flint / Other
- **Wallet Version**: [e.g., Nami 2.0.1]
- **Network**: preprod / mainnet
- **Test Duration**: [e.g., 2 hours]

## Test Results

| # | Feature | Test Case | Expected Result | Actual Result | Status |
|---|---------|-----------|-----------------|---------------|--------|
| 1 | Wallet Connection | Connect wallet | Wallet connects successfully, address displayed | | PASS / FAIL / SKIP |
| 2 | Wallet Connection | Disconnect wallet | Wallet disconnects, connection state cleared | | PASS / FAIL / SKIP |
| 3 | Wallet Connection | Switch wallet | Can switch between different wallet providers | | PASS / FAIL / SKIP |
| 4 | Wallet Connection | Wallet info display | Wallet address displayed correctly | | PASS / FAIL / SKIP |
| 5 | Project Management | Project list display | All active projects displayed on homepage | | PASS / FAIL / SKIP |
| 6 | Project Management | Project details view | Project details (APY, capacity, unit price) shown correctly | | PASS / FAIL / SKIP |
| 7 | Project Management | Minted count display | Current minted count matches on-chain data | | PASS / FAIL / SKIP |
| 8 | Project Management | Project status filter | Can filter projects by status (active/inactive) | | PASS / FAIL / SKIP |
| 9 | NFT Minting | Single NFT mint | Single NFT minted successfully with correct metadata | | PASS / FAIL / SKIP |
| 10 | NFT Minting | Token ID generation | Sequential token ID generated correctly (HARVESTFLOW#N) | | PASS / FAIL / SKIP |
| 11 | NFT Minting | Metadata validation | NFT metadata (name, image, description) correct | | PASS / FAIL / SKIP |
| 12 | NFT Minting | Mint price payment | Correct amount of ADA deducted from wallet | | PASS / FAIL / SKIP |
| 13 | NFT Minting | Bulk mint (5 NFTs) | 5 NFTs minted successfully in single transaction | | PASS / FAIL / SKIP |
| 14 | NFT Minting | Bulk mint (10 NFTs) | 15 NFTs minted successfully in single transaction | | PASS / FAIL / SKIP |
| 15 | NFT Minting | Mint with insufficient funds | Error message shown when wallet balance insufficient | | PASS / FAIL / SKIP |
| 16 | NFT Minting | Mint when minting disabled | Error message shown when minting is disabled | | PASS / FAIL / SKIP |
| 17 | NFT Minting | Mint beyond max capacity | Error message shown when max mints reached | | PASS / FAIL / SKIP |
| 18 | NFT Minting | Mint transaction confirmation | Transaction hash displayed after successful mint | | PASS / FAIL / SKIP |
| 19 | NFT Minting | Mint status tracking | Loading states (signing, submitting) shown | | PASS / FAIL / SKIP |
| 20 | Transaction Processing | Transaction submission | Transaction submitted to blockchain successfully | | PASS / FAIL / SKIP |
| 21 | Transaction Processing | Transaction status check | Transaction status API returns correct status | | PASS / FAIL / SKIP |
| 22 | Transaction Processing | Transaction error handling | Error messages displayed for failed transactions | | PASS / FAIL / SKIP |
| 23 | Transaction Processing | Transaction timeout | Timeout handled gracefully after extended wait | | PASS / FAIL / SKIP |
| 24 | Oracle Functionality | Oracle status check | Oracle status API returns correct state | | PASS / FAIL / SKIP |
| 25 | Oracle Functionality | Oracle UTxO validation | Oracle UTxO found and validated correctly | | PASS / FAIL / SKIP |
| 26 | Oracle Functionality | Oracle update handling | Oracle updates reflected in UI correctly | | PASS / FAIL / SKIP |
| 27 | NFT Display | NFT list display | User's NFTs displayed in account page | | PASS / FAIL / SKIP |
| 28 | NFT Display | NFT metadata display | NFT metadata (name, image, attributes) shown correctly | | PASS / FAIL / SKIP |
| 29 | NFT Display | NFT filtering | Can categorize NFTs by project or collection | | PASS / FAIL / SKIP |
| 30 | Account Page | Account dashboard | Account page loads with user's NFT collection | | PASS / FAIL / SKIP |
| 31 | Account Page | Transaction history | Transaction history displayed correctly | | PASS / FAIL / SKIP |
| 32 | Account Page | Project navigation | Can navigate to project details from account page | | PASS / FAIL / SKIP |
| 33 | Proof Page | Proof of Support display | Proof page shows NFT details and project info | | PASS / FAIL / SKIP |
| 34 | Proof Page | RWA data display | RWA project data shown correctly | | PASS / FAIL / SKIP |
| 35 | Proof Page | Asset overview | Asset overview section displays correctly | | PASS / FAIL / SKIP |
| 36 | API Endpoints | GET /api/cardano/mint | Mint data returned correctly | | PASS / FAIL / SKIP |
| 37 | API Endpoints | POST /api/cardano/mint | Single NFT mint request processed | | PASS / FAIL / SKIP |
| 38 | API Endpoints | POST /api/cardano/mint-bulk | Bulk mint request processed | | PASS / FAIL / SKIP |
| 39 | API Endpoints | GET /api/cardano/status | Project status returned correctly | | PASS / FAIL / SKIP |
| 40 | API Endpoints | POST /api/cardano/status | Status update processed correctly | | PASS / FAIL / SKIP |
| 41 | API Endpoints | GET /api/nft/highest-id | Highest token ID returned correctly | | PASS / FAIL / SKIP |
| 42 | API Endpoints | POST /api/nft/highest-id | Highest token ID updated correctly | | PASS / FAIL / SKIP |
| 43 | API Endpoints | POST /api/nft/verify-metadata | Metadata verification works correctly | | PASS / FAIL / SKIP |
| 44 | API Endpoints | GET /api/project/minted-count | Minted count returned correctly | | PASS / FAIL / SKIP |
| 45 | API Endpoints | POST /api/project/update-minted-count | Minted count updated correctly | | PASS / FAIL / SKIP |
| 46 | Error Handling | Network error | Graceful error handling when network fails | | PASS / FAIL / SKIP |
| 47 | Error Handling | Wallet rejection | Error message shown when user rejects transaction | | PASS / FAIL / SKIP |
| 48 | Error Handling | Invalid project ID | Error message shown for invalid project ID | | PASS / FAIL / SKIP |
| 49 | Error Handling | Missing required fields | Validation errors shown for missing fields | | PASS / FAIL / SKIP |
| 50 | UI/UX | Loading states | Loading indicators shown during async operations | | PASS / FAIL / SKIP |
| 51 | UI/UX | Success messages | Success messages displayed after operations | | PASS / FAIL / SKIP |
| 52 | UI/UX | Error messages | Error messages clear and actionable | | PASS / FAIL / SKIP |
| 53 | UI/UX | Modal dialogs | Modals open and close correctly | | PASS / FAIL / SKIP |
| 54 | UI/UX | Navigation | Navigation between pages works correctly | | PASS / FAIL / SKIP |
| 55 | Internationalization | Language switching | Can switch between English and Japanese | | PASS / FAIL / SKIP |
| 56 | Internationalization | Text translation | All text translated correctly | | PASS / FAIL / SKIP |
| 57 | Airdrop/Refund | Airdrop execution | Airdrop script executes successfully | | PASS / FAIL / SKIP |
| 58 | Airdrop/Refund | Refund distribution | Refunds distributed to NFT holders correctly | | PASS / FAIL / SKIP |
| 59 | Airdrop/Refund | Airdrop log generation | Airdrop logs generated correctly | | PASS / FAIL / SKIP |
| 60 | Admin Functions | Toggle minting | Admin can enable/disable minting for project | | PASS / FAIL / SKIP |
| 61 | Admin Functions | Oracle test | Oracle test endpoint works correctly | | PASS / FAIL / SKIP |
| 62 | Admin Functions | Config test | Config test endpoint works correctly | | PASS / FAIL / SKIP |

## Test Summary

- **Total Test Cases**: [Count]
- **Passed**: [Count]
- **Failed**: [Count]
- **Skipped**: [Count]
- **Pass Rate**: [Percentage]%

## Critical Issues Found

[List any critical bugs or issues discovered during testing]

## Minor Issues Found

[List any minor bugs or UX issues discovered during testing]

## Recommendations

[Any recommendations for improvements or follow-up testing]

## Additional Notes

[Any additional observations, edge cases tested, or environment-specific notes]

---

## How to Use This Template

1. Copy this template to `test-results/manual-test-YYYY-MM-DD-HHMMSS.md`
2. Fill in the Test Information section at the top
3. For each test case:
   - Mark Status as PASS, FAIL, or SKIP
   - Fill in Actual Result column
4. Complete the Test Summary section
5. Document any issues found
6. Save the file in the `test-results/` directory

## Test Case Descriptions

### Wallet Connection
Tests the ability to connect and disconnect Cardano wallets, display wallet information, and handle wallet switching.

### Project Management
Tests the display and management of lending projects, including project lists, details, and minted counts.

### NFT Minting
Tests the core NFT minting functionality, including single and bulk minting, metadata validation, and error handling.

### Transaction Processing
Tests transaction submission, status tracking, error handling, and timeout scenarios.

### Oracle Functionality
Tests the integration with on-chain oracles, including data fetching and status validation.

### NFT Display
Tests the display of user's NFT collection, including metadata, filtering, and search functionality.

### Account Page
Tests the user account dashboard, transaction history, and navigation features.

### Proof Page
Tests the Proof of Support page, including NFT details, RWA data, and asset overview.

### API Endpoints
Tests all API endpoints for correct request/response handling and data validation.

### Error Handling
Tests error scenarios and validation, including network errors, wallet rejections, and invalid inputs.

### UI/UX
Tests user interface responsiveness, loading states, error messages, and navigation.

### Internationalization
Tests multi-language support and text translation.

### Airdrop/Refund
Tests automated refund distribution to NFT holders (admin/script testing).

### Admin Functions
Tests administrative functions like toggling minting and testing oracle/config endpoints.

