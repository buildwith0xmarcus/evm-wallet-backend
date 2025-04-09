# Web3 Wallet Backend

This project is a wallet backend service for Ethereum networks. It supports basic functions such as wallet creation, wallet import, balance querying, and transaction sending.

## Features

- 🔐 Wallet creation and management
- 📥 Wallet import with private key or mnemonic
- 💰 Query ETH and specific ERC-20 token balances
- 📤 Send ETH transfers
- 🔄 Send ERC-20 token transfers
- 🖼️ Send NFT (ERC-721 and ERC-1155) transfers
- 🛡️ Private key security with AES-256 encryption
- 🌐 Multiple blockchain support (Ethereum, Polygon, BSC, Optimism, Arbitrum)
- 🧪 Test network support (Sepolia, Goerli, Mumbai, BSC-Testnet, Optimism-Goerli, Arbitrum-Goerli)
- 📡 Real-time transaction and balance updates via WebSocket
- 🔍 Transaction simulation and Gas optimization
- 💾 RPC request caching

## Technical Details

- **Framework**: Express.js
- **Blockchain Interaction**: ethers.js v6
- **Security**: AES-256 encryption with crypto-js
- **Data Validation**: Joi
- **RPC Provider**: PublicNode
- **Real-time Communication**: Socket.io and Express-WS

## Architectural Design

- **Wallet Creation/Import**: Works independently of network (same private key can be used on all EVM networks)
- **Network Operations**: Balance queries and transfers are performed on a specific network
- **Multi-Network Support**: Access to multiple blockchain networks through a single backend
- **WebSocket Communication**: Subscription system for real-time balance, transaction, and block updates
- **Caching Layer**: Reducing network traffic by caching RPC requests

## Supported Blockchain Networks

The backend supports the following networks:

### Mainnet Networks
- **Ethereum** (ChainID: 1)
- **Polygon** (ChainID: 137)
- **Binance Smart Chain** (ChainID: 56) 
- **Optimism** (ChainID: 10)
- **Arbitrum** (ChainID: 42161)

### Testnet Networks
- **Ethereum**: Sepolia (ChainID: 11155111), Goerli (ChainID: 5)
- **Polygon**: Mumbai (ChainID: 80001)
- **Binance Smart Chain**: Testnet (ChainID: 97)
- **Optimism**: Goerli (ChainID: 420)
- **Arbitrum**: Goerli (ChainID: 421613)

## Getting Started

### Requirements

- Node.js 14+ 
- npm or yarn
- Ethereum RPC connection (Infura, Alchemy, or another provider)

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/username/web3-wallet-backend.git
   cd web3-wallet-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file and add necessary API keys.

5. Start the service:
   ```bash
   npm run dev
   ```

## API Endpoints

### Network Information

- **GET /api/v1/networks**
  - Returns all supported networks and default network information
  - Response:
  ```json
  {
    "success": true,
    "data": {
      "networks": {
        "ethereum": {
          "name": "Ethereum",
          "types": ["mainnet", "sepolia", "goerli"],
          "nativeCurrency": {
            "name": "Ether",
            "symbol": "ETH",
            "decimals": 18
          }
        },
        "polygon": {
          "name": "Polygon",
          "types": ["mainnet", "mumbai"],
          "nativeCurrency": {
            "name": "MATIC",
            "symbol": "MATIC",
            "decimals": 18
          }
        },
        ...
      },
      "defaultNetwork": "ethereum",
      "defaultNetworkType": "mainnet"
    }
  }
  ```

### Wallet Management

- **POST /api/v1/create-wallet**
  - Creates a new Ethereum wallet
  - Response: Address, private key, encrypted private key, and mnemonic

```json
{
    "success": true,
    "data": {
        "address": "0xACd910731960828bD8582e6cf7E4854807f67A27",
        "privateKey": "0x012dc035108160b5114aa33d26d6bde181982eded82f01f04a7d86add6056179",
        "encryptedPrivateKey": "U2FsdGVkX1+xFSEiMrj4yLrHqq7JZNqMLuVpf3fAaATa1Kp3twGOyHwTpHzsZ+fUXfc94jLNpHLJTCe9VLGWCVHeY+DzrXMJ35JDuh/Z126ajTMliyZqwxEHjULWXW35",
        "mnemonic": "orphan sauce april patch version sustain sustain virus bind sadness illegal mixture"
    }
}
```

- **POST /api/v1/import-wallet/private-key**
  - Import wallet with private key
  - Body: `{ "privateKey": "0x..." }`

- **POST /api/v1/import-wallet/mnemonic**
  - Import wallet with mnemonic (seed phrase)
  - Body: `{ "mnemonic": "word1 word2 ...", "path": "m/44'/60'/0'/0/0" }`

### Balance Query

- **GET /api/v1/wallet/:address/balance**
  - Returns local token and other token balances for a wallet address
  - Specify network: `?network=polygon&networkType=mainnet`
  - Query additional token balances: `?tokens=SYMBOL1:0xADDRESS1,SYMBOL2:0xADDRESS2`

- **GET /api/v1/wallet/:address/token/:tokenAddress**
  - Query balance for a specific token
  - Specify network: `?network=bsc&networkType=mainnet`

### Transfer Operations

- **POST /api/v1/send-transaction**
  - Sends local token transfer (ETH/MATIC/BNB/etc.)
  - Body: 
    ```json
    { 
      "encryptedPrivateKey": "encrypted-key", 
      "to": "0xTargetAddress", 
      "amount": "0.01",
      "gasLimit": "21000", 
      "network": "ethereum",
      "networkType": "mainnet"
    }
    ```

- **POST /api/v1/send-token-transaction**
  - Sends ERC-20 token transfer
  - Body: 
    ```json
    {
      "encryptedPrivateKey": "encrypted-key",
      "tokenAddress": "0xTokenContractAddress",
      "to": "0xTargetAddress",
      "amount": "10",
      "decimals": 18,
      "network": "polygon",
      "networkType": "mainnet"
    }
    ```

- **POST /api/v1/send-nft-transaction**
  - Sends NFT (ERC-721 or ERC-1155) transfer
  - NFT standard can be automatically determined or specified with `nftType`
  - Body: 
    ```json
    {
      "encryptedPrivateKey": "encrypted-key",
      "nftAddress": "0xNFTContractAddress",
      "to": "0xTargetAddress",
      "tokenId": "123",
      "amount": "1",  // Optional, for ERC-1155 (default: 1)
      "nftType": "ERC721",  // Optional: "ERC721" or "ERC1155"
      "network": "ethereum", 
      "networkType": "mainnet"
    }
    ```

### Transaction Analysis and Gas Optimization

- **POST /api/v1/simulate-transaction**
  - Simulates transaction before sending
  - Body: Transaction parameters 
  - Specify network: `?network=ethereum&networkType=mainnet`

- **GET /api/v1/gas-price**
  - Estimates gas price
  - Specify network: `?network=ethereum&networkType=mainnet`

- **GET /api/v1/optimal-gas-fees**
  - Suggests optimal gas fee values
  - Specify network: `?network=ethereum&networkType=mainnet&priority=medium`
  - priority: low, medium, high

- **POST /api/v1/analyze-transaction**
  - Analyzes and optimizes transaction
  - Body: Transaction parameters

### Cache Management

- **GET /api/v1/cache-stats**
  - Returns cache statistics

- **POST /api/v1/clear-cache/:method?**
  - Clears cache for a specific RPC method or all cache
  - `:method`: getBalance, tokenBalance, getBlock, getFeeData, detectNftStandard, getNftOwner

### WebSocket API

WebSocket API provides a subscription model for real-time updates:

#### Establishing Connection

```javascript
const socket = io.connect('http://localhost:3000');
```

#### Balance Tracking

```javascript
// Balance tracking subscription
socket.emit('subscribe:balance', { 
  address: '0xWallet', 
  network: 'ethereum', 
  networkType: 'mainnet' 
});

// Listen for balance updates
socket.on('balance:update', (data) => {
  console.log(`New balance for address ${data.address}: ${data.balance}`);
});

// Cancel subscription
socket.emit('unsubscribe:balance', { address: '0xWallet' });
```

#### Transaction Tracking

```javascript
// Transaction tracking subscription
socket.emit('subscribe:transaction', { 
  txHash: '0xHashValue', 
  network: 'ethereum', 
  networkType: 'mainnet' 
});

// Listen for transaction updates
socket.on('transaction:update', (data) => {
  console.log(`Transaction status: ${data.status}, Confirmations: ${data.confirmations}`);
});

// Listen for gas analysis
socket.on('transaction:gasAnalysis', (data) => {
  console.log(`Total cost: ${data.totalCost} ETH`);
});

// Cancel subscription
socket.emit('unsubscribe:transaction', { txHash: '0xHashValue' });
```

#### Block Tracking

```javascript
// Block tracking subscription
socket.emit('subscribe:blocks', { 
  network: 'ethereum', 
  networkType: 'mainnet' 
});

// Listen for new blocks
socket.on('block:new', (data) => {
  console.log(`New block: ${data.blockNumber}, Transaction count: ${data.transactionCount}`);
});

// Cancel subscription
socket.emit('unsubscribe:blocks', { network: 'ethereum', networkType: 'mainnet' });
```

#### Gas Price Tracking

```javascript
// Gas price tracking subscription
socket.emit('subscribe:gasPrice', { 
  network: 'ethereum', 
  networkType: 'mainnet' 
});

// Listen for gas price updates
socket.on('gasPrice:update', (data) => {
  console.log(`Gas price: ${data.gasPrice}, Max fee: ${data.maxFeePerGas}`);
});

// Cancel subscription
socket.emit('unsubscribe:gasPrice', { network: 'ethereum', networkType: 'mainnet' });
```

## Default Tokens

The following tokens are automatically queried:

- **USDT** - Tether (0xdAC17F958D2ee523a2206206994597C13D831ec7)
- **USDC** - USD Coin (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- **DAI** - DAI Stablecoin (0x6B175474E89094C44Da98b954EedeAC495271d0F)
- **WETH** - Wrapped Ether (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
- **WBTC** - Wrapped Bitcoin (0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599)

## Security Features

- **Private Keys**: Private keys are stored and transmitted with AES-256 encryption
- **Validation**: All API inputs are validated with Joi schemas
- **Error Handling**: Comprehensive error catching and handling
- **HTTP Security**: Security headers with Helmet middleware

## Supported NFT Standards

The backend supports the following NFT standards:

- **ERC-721** - Unique NFT standard
- **ERC-1155** - Multi-token standard (Multiple tokens within the same contract)

When sending NFT transfers, if `nftType` is not specified, the backend automatically detects the contract type.

## Testing

To set up the project's test environment:

```bash
# Install test dependencies and directories
./scripts/setup-tests.sh

# Run tests on Sepolia test network
npm run test:sepolia

# Run all tests
npm test
```

### Test Coverage

- **Sepolia Tests**: Tests on real token and NFT contracts on Sepolia test network
  - Wallet balance and token balance queries
  - NFT standard detection and ownership verification
  - Transaction simulations (read-only mode)

Test results are printed to the console in detail and provide information about whether the tests were successful.

## WalletConnect API Endpoints

The following API endpoints are available for WalletConnect v2 integration. All endpoints are under the `/api/v1/wallet-connect` prefix.

### Create Connection

```http
POST /api/v1/wallet-connect/connect
```

Creates a new WalletConnect session and returns a URI for QR code.

**Response**
```json
{
  "success": true,
  "data": {
    "uri": "wc:..."
  }
}
```

### Connection Approval

```http
POST /api/v1/wallet-connect/approve
```

Approves the connection after the user scans the QR code with their wallet.

**Response**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "accounts": ["eip155:1:0x..."],
    "chainId": "eip155:1"
  }
}
```

### Connection Status

```http
GET /api/v1/wallet-connect/status
```

Checks the status of the current WalletConnect session.

**Response**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "accounts": ["eip155:1:0x..."],
    "chainId": "eip155:1"
  }
}
```

### Message Signing

```http
POST /api/v1/wallet-connect/sign-message
```

Signs the specified message with the connected wallet.

**Request**
```json
{
  "message": "Hello WalletConnect!"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "signature": "0x..."
  }
}
```

### Send Transaction

```http
POST /api/v1/wallet-connect/send-transaction
```

Sends a transaction to the blockchain.

**Request**
```json
{
  "to": "0x...",
  "value": "1000000000000000000", // 1 ETH (in wei)
  "data": "0x..." // Optional
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x..."
  }
}
```

### Disconnect

```http
POST /api/v1/wallet-connect/disconnect
```

Terminates the current WalletConnect session.

**Response**
```json
{
  "success": true,
  "message": "Connection successfully terminated"
}
```

### Setup

1. Get your WalletConnect Project ID:
   - Create a free account at https://cloud.walletconnect.com/
   - Create a new project and copy your Project ID

2. Add the required variables to your `.env` file:
   ```env
   WALLET_CONNECT_PROJECT_ID=YOUR_PROJECT_ID_HERE
   APP_URL=http://localhost:3002
   ```

### Supported Methods

- `eth_sendTransaction`: Send transaction
- `eth_signTransaction`: Sign transaction
- `eth_sign`: Ethereum signing
- `personal_sign`: Personal message signing
- `eth_signTypedData`: Typed data signing

### Supported Events

- `chainChanged`: Chain change
- `accountsChanged`: Account change 

## Test.js Execution Instructions

1. Run test.js for comprehensive testing:
```bash
# Make sure you have configured your .env file with test credentials
node test.js
```

The test.js script will run a comprehensive test suite that includes:
- Wallet import and management
- Balance queries
- Token operations
- NFT operations
- Transaction simulations
- Real transaction tests
- WebSocket functionality
- Cache operations

## Error Handling

The API uses standard HTTP status codes and returns error messages in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse. Limits are applied per IP address and endpoint.

## Security

- Private keys are encrypted before storage
- All sensitive data is transmitted over HTTPS
- Rate limiting prevents abuse
- Input validation and sanitization
- CORS protection


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 