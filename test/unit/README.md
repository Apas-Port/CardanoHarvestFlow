# Unit Test Documentation

This directory contains unit test records for Aiken smart contracts located in `lib/nft-contracts/aiken/`.

## Overview

Unit tests are written directly in the Aiken contract files using the `test` keyword. The test runner script executes these tests and generates detailed Markdown logs.

## Prerequisites

- **Aiken**: Version 1.1.5 or later must be installed
  - Install from: https://aiken-lang.org
  - Verify installation: `aiken --version`

## Running Tests

### Using the Test Runner Script

The easiest way to run tests and generate logs:

```bash
cd test/unit
./run-tests.sh
```

This will:
1. Navigate to the Aiken contracts directory
2. Execute `aiken check` to run all tests
3. Generate a timestamped Markdown log file in `logs/`
4. Display a summary of results

### Manual Execution

You can also run tests manually:

```bash
cd lib/nft-contracts/aiken
aiken check
```

## Test Log Format

Test logs are saved in `logs/` directory with the naming convention:
- `aiken-test-YYYY-MM-DD-HHMMSS.md`

Each log file contains:

### Test Execution Information
- Date and time of execution
- Aiken version used
- Test directory path
- Log file name

### Test Summary
- Overall status (PASSED/FAILED)
- Total number of tests
- Number of passed tests
- Number of failed tests
- Execution duration

### Test Results by File
- Results organized by contract file
- Individual test status (✅ PASSED / ❌ FAILED)
- Error messages for failed tests

### Full Test Output
- Complete raw output from `aiken check` command

## Understanding Test Results

### Status Indicators

- ✅ **PASSED**: Test executed successfully
- ❌ **FAILED**: Test failed (check error details)
- ⚠️ **UNKNOWN**: Test status could not be determined

### Example Log Structure

```markdown
# Aiken Unit Test Results

## Test Execution Information
- **Date**: 2025-01-15 14:30:00
- **Aiken Version**: v1.1.5
- **Test Directory**: lib/nft-contracts/aiken

## Test Summary
- **Status**: ✅ ALL TESTS PASSED
- **Total Tests**: 15
- **Passed**: 15
- **Failed**: 0
- **Duration**: 2.34s

## Test Results by File

### validators/oracle_nft.ak
- ✅ success_mint() - PASSED
- ✅ success_burn() - PASSED
- ❌ test_burn() - FAILED
  - Error: ...
```

## Test Files

Tests are located in the following contract files:

- `validators/oracle_nft.ak` - Oracle NFT validator tests
- `validators/oracle.ak` - Oracle validator tests
- `validators/plutus_nft.ak` - Plutus NFT validator tests
- `validators/series.ak` - Series validator tests
- `lib/util.ak` - Utility function tests

## Troubleshooting

### Aiken Command Not Found

If you see `aiken: command not found`:

1. Install Aiken following the official guide
2. Ensure Aiken is in your PATH
3. Verify with: `aiken --version`

### Tests Fail to Compile

If tests fail during compilation:

1. Check Aiken version compatibility (requires v1.1.5+)
2. Verify all dependencies are installed
3. Run `aiken build` to check for compilation errors
4. Review error messages in the log file

### No Test Output

If the script runs but produces no test results:

1. Verify tests exist in contract files (look for `test` keyword)
2. Check that you're in the correct directory
3. Run `aiken check` manually to see raw output

## Best Practices

1. **Run tests before committing**: Always run tests before committing contract changes
2. **Review logs**: Check log files for detailed test results
3. **Keep logs**: Test logs provide a history of test execution
4. **Update tests**: Add new tests when adding new contract functionality

## Related Documentation

- [Aiken Documentation](https://aiken-lang.org)
- [Aiken Testing Guide](https://aiken-lang.org/documentation/guides/testing)
- Project README: `/README.md`

