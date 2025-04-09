# Web3 Wallet API Documentation

This API provides a backend service for wallet management on Ethereum and other EVM-compatible blockchains.

## Core Features

- Wallet creation and import (privateKey, mnemonic)
- ETH and token balance queries
- ETH transfers
- ERC-20 token transfers
- NFT (ERC-721 and ERC-1155) transfers
- Supported networks: Ethereum, Polygon, BSC, Optimism, Arbitrum
- Real-time transaction notifications (WebSocket)
- Transaction simulation and error detection
- Private key encryption (AES-256)
- EIP-1559 gas strategy support
- Caching strategy to minimize RPC requests

## Supported Networks

The API supports the following EVM-compatible networks:

### Mainnet Networks
- Ethereum (ChainID: 1)
- Polygon (ChainID: 137)
- BSC (ChainID: 56)
- Optimism (ChainID: 10)
- Arbitrum (ChainID: 42161)

### Testnet Networks
- Ethereum: Sepolia (ChainID: 11155111), Goerli (ChainID: 5)
- Polygon: Mumbai (ChainID: 80001)
- BSC: Testnet (ChainID: 97)
- Optimism: Goerli (ChainID: 420)
- Arbitrum: Goerli (ChainID: 421613)

### Wallet Management

#### Create New Wallet

```
POST /api/v1/wallet/create
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "privateKey": "0x...",
    "encryptedPrivateKey": "...",
    "mnemonic": "word1 word2 ... word12"
  }
}
```

#### Import Wallet with Private Key

```
POST /api/v1/wallet/import/private-key
```

**Request:**

```json
{
  "privateKey": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "encryptedPrivateKey": "..."
  }
}
```

#### Import Wallet with Mnemonic

```
POST /api/v1/wallet/import/mnemonic
```

**Request:**

```json
{
  "mnemonic": "word1 word2 ... word12",
  "path": "m/44'/60'/0'/0/0" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "privateKey": "0x...",
    "encryptedPrivateKey": "...",
    "mnemonic": "word1 word2 ... word12"
  }
}
```

#### Get Wallet Balance and Token Information

```
GET /api/v1/wallet/{address}/summary
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "network": "ethereum",
    "chainId": 1,
    "nativeCurrency": "ETH",
    "nativeBalance": "1.5",
    "tokenBalances": [
      {
        "symbol": "USDT",
        "name": "Tether USD",
        "address": "0x...",
        "balance": "1000.00",
        "decimals": 6
      },
      // ... other tokens
    ],
    "lastUpdated": "2024-03-10T12:34:56Z"
  }
}
```

### Transfer Operations

#### Send ETH

```
POST /api/v1/transaction/send
```

**Request:**

```json
{
  "encryptedPrivateKey": "...",
  "to": "0x...",
  "amount": "1.5",
  "gasLimit": "21000", // Optional
  "maxFeePerGas": "50", // Optional (gwei)
  "maxPriorityFeePerGas": "2", // Optional (gwei)
  "network": "ethereum", // Optional (default: ethereum)
  "networkType": "mainnet" // Optional (default: mainnet)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "amount": "1.5",
    "network": "ethereum",
    "chainId": 1,
    "transactionFee": {
      "gasLimit": "21000",
      "maxFeePerGas": "50000000000",
      "maxPriorityFeePerGas": "2000000000"
    }
  }
}
```

#### Send ERC-20 Token

```
POST /api/v1/transaction/token/send
```

**Request:**

```json
{
  "encryptedPrivateKey": "...",
  "tokenAddress": "0x...",
  "to": "0x...",
  "amount": "100.50",
  "decimals": 18, // Optional (will be fetched from contract if not provided)
  "gasLimit": "65000", // Optional
  "maxFeePerGas": "50", // Optional (gwei)
  "maxPriorityFeePerGas": "2", // Optional (gwei)
  "network": "ethereum", // Optional (default: ethereum)
  "networkType": "mainnet" // Optional (default: mainnet)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "tokenAddress": "0x...",
    "amount": "100.50",
    "decimals": 18,
    "network": "ethereum",
    "chainId": 1,
    "blockNumber": 12345678,
    "gasUsed": "52000",
    "effectiveGasPrice": "45000000000",
    "status": "success"
  }
}
```

#### Send NFT

```
POST /api/v1/transaction/nft/send
```

**Request:**

```json
{
  "encryptedPrivateKey": "...",
  "contractAddress": "0x...",
  "to": "0x...",
  "tokenId": "123",
  "amount": "1", // Required for ERC-1155, ignored for ERC-721
  "nftType": "ERC721", // Optional (will be auto-detected)
  "network": "ethereum", // Optional (default: ethereum)
  "networkType": "mainnet" // Optional (default: mainnet)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "nftAddress": "0x...",
    "tokenId": "123",
    "type": "ERC721",
    "network": "ethereum",
    "chainId": 1,
    "blockNumber": 12345678,
    "status": "success"
  }
}
```

### Transaction Analysis and Simulation

#### Transaction Simulation

```
POST /api/v1/transaction/simulate
```

**Request:**

```json
{
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000", // 1 ETH (in wei)
  "data": "0x...", // Optional, for smart contract interactions
  "gasPrice": "50000000000", // Optional
  "gasLimit": "21000" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "estimatedGas": "21000",
    "totalCost": "1000105000000000000",
    "totalCostEth": "1.000105",
    "hasEnoughBalance": true,
    "remainingBalance": "2.1"
  }
}
```

#### Gas Price Estimation

```
GET /api/v1/gas-price?network=ethereum&networkType=mainnet
```

**Response:**

```json
{
  "success": true,
  "data": {
    "networkCondition": "normal",
    "isEip1559": true,
    "trend": "increasing",
    "avgUtilization": 0.68,
    "baseFee": "15000000000",
    "maxPriorityFeePerGas": "1500000000",
    "maxFeePerGas": "35000000000",
    "blockHistory": [
      {
        "number": 18453260,
        "baseFeePerGas": "14000000000",
        "utilization": 0.65
      }
      // ... other blocks
    ],
    "source": "prediction"
  }
}
```

## WebSocket API

The API provides WebSocket connections for real-time updates on wallet balances and transaction statuses. To connect to the WebSocket server:

```javascript
const socket = io('ws://localhost:3000');

// Subscribe to balance updates for an address
socket.emit('subscribe', {
  type: 'balance',
  address: '0x...'
});

// Listen for balance updates
socket.on('balance', (data) => {
  console.log(`Balance updated for ${data.address}: ${data.balance}`);
});

// Unsubscribe
socket.emit('unsubscribe', {
  type: 'balance',
  address: '0x...'
});
```

### Transaction Monitoring

```javascript
// Subscribe to transaction status updates
socket.emit('subscribe', {
  type: 'transaction',
  txHash: '0x...'
});

// Listen for transaction updates
socket.on('transaction', (data) => {
  console.log(`Transaction status: ${data.status}, Confirmations: ${data.confirmations}`);
  
  if (data.status === 'confirmed') {
    console.log('Transaction confirmed!', data.receipt);
  }
});

// Listen for gas usage analytics
socket.on('gasAnalytics', (data) => {
  console.log(`Gas used: ${data.gasUsed}, Total cost: ${data.totalCost} ETH`);
});

// Unsubscribe
socket.emit('unsubscribe', {
  type: 'transaction',
  txHash: '0x...'
});
```

### Block Monitoring

```javascript
// Subscribe to new blocks
socket.emit('subscribe', {
  type: 'newBlocks'
});

// Listen for new blocks
socket.on('block', (data) => {
  console.log(`New block: ${data.blockNumber}, Transaction count: ${data.transactionCount}`);
});

// Unsubscribe
socket.emit('unsubscribe', {
  type: 'newBlocks'
});
```

### Gas Price Monitoring

```javascript
// Subscribe to gas price updates
socket.emit('subscribe', {
  type: 'gasPrice'
});

// Listen for gas price updates
socket.on('gasPrice', (data) => {
  console.log(`Gas price: ${data.gasPrice}, Max fee: ${data.maxFeePerGas}`);
});

// Unsubscribe
socket.emit('unsubscribe', {
  type: 'gasPrice'
});
```

## Error Responses

The API returns error responses in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "stack": "..." // Only in development mode
}
```

## Development

### Environment Variables

The API requires the following environment variables to be set in a `.env` file:

```
PORT=3000
ENCRYPTION_KEY=your-secure-encryption-key-here

# Default Network
DEFAULT_NETWORK=ethereum
DEFAULT_NETWORK_TYPE=mainnet

# RPC Endpoints
ETHEREUM_MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-api-key
ETHEREUM_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-api-key
ETHEREUM_GOERLI_RPC_URL=https://goerli.infura.io/v3/your-api-key

POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

OPTIMISM_MAINNET_RPC_URL=https://mainnet.optimism.io
OPTIMISM_GOERLI_RPC_URL=https://goerli.optimism.io

ARBITRUM_MAINNET_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_GOERLI_RPC_URL=https://goerli-rollup.arbitrum.io/rpc
```