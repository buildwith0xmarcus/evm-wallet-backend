const express = require('express');
const { validator } = require('../middleware/validator');
const walletController = require('../controllers/wallet.controller');
const transactionController = require('../controllers/transaction.controller');
const nftController = require('../controllers/nft.controller');
const { 
  walletActionLimiter, 
  transactionLimiter,
  websocketLimiter 
} = require('../middleware/rate-limiter');
const { 
  importWalletSchema, 
  sendTransactionSchema, 
  sendTokenTransactionSchema,
  sendNftTransactionSchema,
  addressSchema 
} = require('../validations/wallet.validation');
const {
  simulateTransactionSchema,
  simulateTokenTransferSchema,
  simulateNftTransferSchema,
  gasParamsSchema
} = require('../validations/transaction.validation');

const router = express.Router();

/**
 * Wallet Routes
 */
// Create a new wallet - Stricter limit
router.post('/create-wallet', walletActionLimiter, walletController.createWallet);

// Import wallet with private key - Stricter limit
router.post(
  '/import-wallet/private-key', 
  walletActionLimiter,
  validator(importWalletSchema.privateKey), 
  walletController.importWalletByPrivateKey
);

// Import wallet with mnemonic - Stricter limit
router.post(
  '/import-wallet/mnemonic', 
  walletActionLimiter,
  validator(importWalletSchema.mnemonic), 
  walletController.importWalletByMnemonic
);

// Get wallet balance and token information
// Query params: ?tokens=SYM1:0xADDR1,SYM2:0xADDR2
router.get(
  '/wallet/:address/balance', 
  walletController.getWalletBalance
);

// Query balance for a specific token
router.get(
  '/wallet/:address/token/:tokenAddress',
  walletController.getTokenBalance
);

// Send ETH Transfer - Transaction limiter
router.post(
  '/send-transaction', 
  transactionLimiter,
  validator(sendTransactionSchema), 
  walletController.sendTransaction
);

// Send Token Transfer - Transaction limiter
router.post(
  '/send-token', 
  transactionLimiter,
  validator(sendTokenTransactionSchema), 
  walletController.sendTokenTransaction
);

// Send NFT Transfer - Transaction limiter
router.post(
  '/send-nft',
  transactionLimiter,
  validator(sendNftTransactionSchema),
  walletController.sendNftTransaction
);

// List supported networks
router.get('/networks', walletController.getSupportedNetworksList);

/**
 * Transaction analysis, simulation and gas optimization routes
 */
// Simulate transaction before sending
router.post(
  '/simulate-transaction',
  transactionLimiter,
  validator(simulateTransactionSchema),
  transactionController.simulateTx
);

// Gas price estimation
router.get(
  '/gas-price',
  transactionController.getGasPricePrediction
);

// Optimal gas prices
router.get(
  '/optimal-gas-fees',
  transactionController.getOptimalFees
);

// Transaction analysis and optimization
router.post(
  '/analyze-transaction',
  transactionLimiter,
  validator(simulateTransactionSchema),
  transactionController.analyzeTransaction
);

// Simulate token transfer
router.post(
  '/simulate-token-transfer',
  transactionLimiter,
  validator(simulateTokenTransferSchema),
  transactionController.simulateTokenTx
);

// Simulate NFT transfer
router.post(
  '/simulate-nft-transfer',
  transactionLimiter,
  validator(simulateNftTransferSchema),
  transactionController.simulateNFTTx
);

// Get NFT ownership information
router.get(
  '/nft/owner/:contractAddress/:tokenId',
  nftController.getNFTOwner
);

// List wallet NFTs
router.get(
  '/wallet/:address/nfts',
  nftController.getWalletNFTs
);

/**
 * Cache and system monitoring
 */
// Cache statistics
router.get(
  '/cache-stats',
  transactionController.getCacheStatistics
);

// Clear cache
router.post(
  '/clear-cache/:method?',
  transactionController.clearCache
);

/**
 * WebSocket Information
 */
// WebSocket test and example usage information
router.get('/websocket-test-info', websocketLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      connectionExample: "const socket = io.connect('http://localhost:3000');",
      availableSubscriptions: [
        {
          name: "balance",
          description: "For wallet balance updates",
          example: {
            subscribe: "socket.emit('subscribe:balance', { address: '0xAddress', network: 'ethereum', networkType: 'mainnet' });",
            listen: "socket.on('balance:update', (data) => { console.log(data); });",
            unsubscribe: "socket.emit('unsubscribe:balance', { address: '0xAddress' });"
          }
        },
        {
          name: "transaction",
          description: "For transaction status updates",
          example: {
            subscribe: "socket.emit('subscribe:transaction', { txHash: '0xHash', network: 'ethereum', networkType: 'mainnet' });",
            listen: "socket.on('transaction:update', (data) => { console.log(data); });",
            unsubscribe: "socket.emit('unsubscribe:transaction', { txHash: '0xHash' });"
          }
        },
        {
          name: "blocks",
          description: "For new blocks",
          example: {
            subscribe: "socket.emit('subscribe:blocks', { network: 'ethereum', networkType: 'mainnet' });",
            listen: "socket.on('block:new', (data) => { console.log(data); });",
            unsubscribe: "socket.emit('unsubscribe:blocks', { network: 'ethereum', networkType: 'mainnet' });"
          }
        },
        {
          name: "gasPrice",
          description: "For gas price updates",
          example: {
            subscribe: "socket.emit('subscribe:gasPrice', { network: 'ethereum', networkType: 'mainnet' });",
            listen: "socket.on('gasPrice:update', (data) => { console.log(data); });",
            unsubscribe: "socket.emit('unsubscribe:gasPrice', { network: 'ethereum', networkType: 'mainnet' });"
          }
        }
      ]
    }
  });
});

module.exports = { ethersRoutes: router }; 