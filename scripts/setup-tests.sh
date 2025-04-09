#!/bin/bash

# Install test dependencies
echo "Installing test dependencies..."
npm install --save-dev mocha chai

# Create test directories
echo "Creating test directories..."
mkdir -p tests/unit
mkdir -p tests/integration

# Success message after test setup
echo "Test environment successfully set up!"
echo "To run Sepolia tests: npm run test:sepolia"
echo "To run all tests: npm test" 