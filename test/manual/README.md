# Manual Test Documentation

This directory contains manual test records for the HARVEST FLOW Cardano NFT Lending Platform.

## Overview

Manual testing is performed by operations staff to verify core functionality of the platform. Test results are recorded in Markdown format using the provided template.

## Purpose

Manual testing ensures that:
- Core features work as expected in real-world scenarios
- User experience is smooth and intuitive
- Integration between components functions correctly
- Edge cases and error scenarios are handled properly

## Test Template

The test template (`test-template.md`) includes 67 test cases covering:

1. **Wallet Connection** (4 tests)
   - Connect/disconnect wallets
   - Wallet information display
   - Wallet switching

2. **Project Management** (4 tests)
   - Project list and details
   - Minted count display
   - Project status filtering

3. **NFT Minting** (11 tests)
   - Single and bulk minting
   - Token ID generation
   - Metadata validation
   - Error handling

4. **Transaction Processing** (5 tests)
   - Transaction submission and tracking
   - Error handling and timeouts
   - Transaction cancellation

5. **Oracle Functionality** (4 tests)
   - Oracle data fetching
   - Status validation
   - UTxO validation

6. **NFT Display** (4 tests)
   - NFT list and metadata
   - Filtering and search

7. **Account Page** (3 tests)
   - Dashboard display
   - Transaction history
   - Navigation

8. **Proof Page** (3 tests)
   - Proof of Support display
   - RWA data display
   - Asset overview

9. **API Endpoints** (9 tests)
   - All major API endpoints
   - Request/response validation

10. **Error Handling** (4 tests)
    - Network errors
    - Wallet rejections
    - Validation errors

11. **UI/UX** (6 tests)
    - Responsive design
    - Loading states
    - Error messages
    - Navigation

12. **Internationalization** (2 tests)
    - Language switching
    - Text translation

13. **Airdrop/Refund** (3 tests)
    - Airdrop execution
    - Refund distribution
    - Log generation

14. **Admin Functions** (3 tests)
    - Toggle minting
    - Oracle/config testing

## How to Record Test Results

### Step 1: Prepare for Testing

1. Ensure you have access to:
   - Test environment (preprod or mainnet)
   - Cardano wallet (Nami, Eternl, Lace, etc.)
   - Test project with sufficient test ADA

2. Note your testing environment:
   - Browser and version
   - Wallet and version
   - Network (preprod/mainnet)

### Step 2: Create Test Result File

1. Copy the template:
   ```bash
   cp test-template.md test-results/manual-test-YYYY-MM-DD-HHMMSS.md
   ```

2. Replace `YYYY-MM-DD-HHMMSS` with current date and time:
   ```bash
   cp test-template.md test-results/manual-test-2025-01-15-143000.md
   ```

### Step 3: Fill in Test Information

Update the "Test Information" section:
- Test Date
- Tester Name
- Environment (preprod/mainnet)
- Browser and version
- Wallet and version
- Network
- Test Duration

### Step 4: Execute Tests

For each test case in the table:

1. **Read the test case description** in the template
2. **Execute the test** following the test case steps
3. **Record the result**:
   - **Status**: Mark as `PASS`, `FAIL`, or `SKIP`
   - **Actual Result**: Describe what actually happened
   - **Notes**: Add any relevant observations or issues

### Step 5: Complete Test Summary

After completing all tests:

1. Count total test cases
2. Count passed, failed, and skipped tests
3. Calculate pass rate: `(Passed / Total) × 100%`
4. Document any critical or minor issues found
5. Add recommendations for improvements

### Step 6: Save and Review

1. Save the test result file
2. Review the results for any patterns or recurring issues
3. Share results with the development team if issues are found

## Test Result Status Values

- **PASS**: Test case passed successfully
- **FAIL**: Test case failed (document the issue in Notes)
- **SKIP**: Test case was skipped (document reason in Notes)

## Example Test Result Entry

```markdown
| 9 | NFT Minting | Single NFT mint | Single NFT minted successfully with correct metadata | NFT minted successfully. Token ID: HARVESTFLOW#42. Metadata verified on Blockfrost. | PASS | Transaction hash: abc123... |
```

## Best Practices

1. **Test systematically**: Follow the test cases in order when possible
2. **Document thoroughly**: Include transaction hashes, error messages, and screenshots when relevant
3. **Test edge cases**: Don't just test happy paths - test error scenarios too
4. **Be specific**: In "Actual Result", describe exactly what happened
5. **Note environment**: Document any environment-specific issues
6. **Test on multiple browsers**: If possible, test on Chrome, Firefox, and Safari
7. **Test on mobile**: Verify responsive design on mobile devices

## Test Frequency

- **Before releases**: Full manual test suite should be executed
- **After major changes**: Relevant test cases should be re-executed
- **Weekly**: Critical path tests (wallet connection, NFT minting, transaction processing)
- **As needed**: When bugs are reported or new features are added

## Reporting Issues

When documenting failed tests:

1. **Describe the issue clearly**: What happened vs. what was expected
2. **Include error messages**: Copy exact error messages
3. **Add transaction hashes**: If applicable, include transaction hashes
4. **Note reproduction steps**: How to reproduce the issue
5. **Include screenshots**: If visual issues, include screenshots
6. **Specify environment**: Browser, wallet, network, etc.

## Test Result File Naming

Test result files should follow this naming convention:
- `manual-test-YYYY-MM-DD-HHMMSS.md`

Examples:
- `manual-test-2025-01-15-143000.md` (January 15, 2025 at 2:30 PM)
- `manual-test-2025-01-15-160000.md` (January 15, 2025 at 4:00 PM)

## Related Documentation

- Unit Test Documentation: `/test/unit/README.md`
- Project README: `/README.md`
- API Documentation: See individual API route files in `/app/api/`
- Deployment Guide: `/DEPLOYMENT.md`

## Questions or Issues?

If you encounter issues during testing or have questions about test cases:

1. Check the test case description in the template
2. Review related documentation
3. Contact the development team
4. Document the issue in the test results

