#!/bin/bash

# Aiken Unit Test Runner
# This script runs Aiken tests and saves the results in Markdown format

set -e

# Get the project root directory (assuming script is in test/unit/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AIKEN_DIR="$PROJECT_ROOT/lib/nft-contracts/aiken"
LOG_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
LOG_FILE="$LOG_DIR/aiken-test-$TIMESTAMP.md"

# Change to Aiken directory
cd "$AIKEN_DIR"

# Get Aiken version
AIKEN_VERSION=$(aiken --version 2>/dev/null || echo "unknown")

# Run tests and capture output
echo "Running Aiken tests..."
TEST_OUTPUT=$(aiken check 2>&1) || TEST_EXIT_CODE=$?

# Get current date and time
CURRENT_DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Start writing log file
cat > "$LOG_FILE" << EOF
# Aiken Unit Test Results

## Test Execution Information
- **Date**: $CURRENT_DATE
- **Aiken Version**: $AIKEN_VERSION
- **Test Directory**: lib/nft-contracts/aiken
- **Log File**: aiken-test-$TIMESTAMP.md

## Test Summary

EOF

# Parse test results from summary lines (format: "X tests | Y passed | Z failed")
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Extract test counts from lines like "19 tests | 19 passed | 0 failed"
while IFS= read -r line; do
    if [[ "$line" =~ ([0-9]+)\ tests\ \|\ ([0-9]+)\ passed\ \|\ ([0-9]+)\ failed ]]; then
        file_total="${BASH_REMATCH[1]}"
        file_passed="${BASH_REMATCH[2]}"
        file_failed="${BASH_REMATCH[3]}"
        TOTAL_TESTS=$((TOTAL_TESTS + file_total))
        PASSED_TESTS=$((PASSED_TESTS + file_passed))
        FAILED_TESTS=$((FAILED_TESTS + file_failed))
    fi
done <<< "$TEST_OUTPUT"

# If no tests found from summary lines, try to extract from Summary line
if [ $TOTAL_TESTS -eq 0 ]; then
    SUMMARY_LINE=$(echo "$TEST_OUTPUT" | grep -E "Summary [0-9]+ checks" || echo "")
    if [[ "$SUMMARY_LINE" =~ Summary\ ([0-9]+)\ checks ]]; then
        TOTAL_TESTS="${BASH_REMATCH[1]}"
        # If we have total but no breakdown, assume all passed if exit code is 0
        if [ ${TEST_EXIT_CODE:-0} -eq 0 ]; then
            PASSED_TESTS=$TOTAL_TESTS
            FAILED_TESTS=0
        fi
    fi
fi

# Determine status
if [ ${TEST_EXIT_CODE:-0} -eq 0 ] && [ $FAILED_TESTS -eq 0 ]; then
    echo "- **Status**: ✅ ALL TESTS PASSED" >> "$LOG_FILE"
else
    echo "- **Status**: ❌ SOME TESTS FAILED" >> "$LOG_FILE"
fi

echo "- **Total Tests**: $TOTAL_TESTS" >> "$LOG_FILE"
echo "- **Passed**: $PASSED_TESTS" >> "$LOG_FILE"
echo "- **Failed**: $FAILED_TESTS" >> "$LOG_FILE"

# Add duration if available
DURATION=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+\.[0-9]+s" | head -1 || echo "N/A")
echo "- **Duration**: $DURATION" >> "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "## Test Results by File" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Extract test results by file
CURRENT_FILE=""
IN_SECTION=false

while IFS= read -r line; do
    # Check if line indicates a test section (format: "┍━ oracle_nft ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    # Use sed to extract filename between "┍━" and "━"
    if echo "$line" | grep -q "^[[:space:]]*┍━"; then
        CURRENT_FILE=$(echo "$line" | sed -E 's/^[[:space:]]*┍━[[:space:]]+([a-zA-Z0-9_]+).*/\1/')
        IN_SECTION=true
        if [ -n "$CURRENT_FILE" ]; then
            echo "### $CURRENT_FILE" >> "$LOG_FILE"
        fi
    # Check if line indicates end of section (format: "┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    elif echo "$line" | grep -q "^[[:space:]]*┕"; then
        IN_SECTION=false
        echo "" >> "$LOG_FILE"
    # Check if line indicates a test result (format: "│ PASS [mem: 583962, cpu: 205773761] success_mint")
    elif [ "$IN_SECTION" = true ] && echo "$line" | grep -qE "^[[:space:]]*│[[:space:]]+(PASS|FAIL)"; then
        TEST_STATUS=$(echo "$line" | sed -E 's/^[[:space:]]*│[[:space:]]+([A-Z]+).*/\1/')
        # Extract test name (last word on the line before potential trace indicators)
        TEST_NAME=$(echo "$line" | sed -E 's/^[[:space:]]*│[[:space:]]+[A-Z]+.*[[:space:]]+([a-zA-Z0-9_]+)$/\1/')
        # If TEST_NAME extraction failed, try alternative pattern
        if [[ "$TEST_NAME" =~ ^[[:space:]]*│ ]]; then
            TEST_NAME=$(echo "$line" | awk '{print $NF}' | sed 's/[^a-zA-Z0-9_].*//')
        fi
        if [ "$TEST_STATUS" = "PASS" ]; then
            echo "- ✅ $TEST_NAME() - PASSED" >> "$LOG_FILE"
        elif [ "$TEST_STATUS" = "FAIL" ]; then
            echo "- ❌ $TEST_NAME() - FAILED" >> "$LOG_FILE"
        fi
    # Check for error/trace messages within test section
    elif [ "$IN_SECTION" = true ] && echo "$line" | grep -qE "^[[:space:]]*│[[:space:]]+\·[[:space:]]+with[[:space:]]+traces"; then
        # Skip trace header line
        continue
    elif [ "$IN_SECTION" = true ] && echo "$line" | grep -qE "^[[:space:]]*│[[:space:]]+\|[[:space:]]+\|"; then
        # Extract trace message (format: "│ | is_nft_mint_allowed ? False")
        TRACE_MSG=$(echo "$line" | sed -E 's/^[[:space:]]*│[[:space:]]*\|[[:space:]]*\|[[:space:]]*//')
        if [ -n "$TRACE_MSG" ]; then
            echo "  - Trace: $TRACE_MSG" >> "$LOG_FILE"
        fi
    fi
done <<< "$TEST_OUTPUT"

# Add full output section
echo "" >> "$LOG_FILE"
echo "## Full Test Output" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo '```' >> "$LOG_FILE"
echo "$TEST_OUTPUT" >> "$LOG_FILE"
echo '```' >> "$LOG_FILE"

# Print summary
echo ""
echo "Test execution completed!"
echo "Log file saved to: $LOG_FILE"
echo ""

# Exit with test exit code
exit ${TEST_EXIT_CODE:-0}

