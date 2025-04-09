const walletService = require('../services/wallet.service');
const { getSupportedNetworks, DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('../utils/network');
const { broadcastBalanceUpdate, broadcastTransactionUpdate } = require('../utils/websocket');

/**
 * Creates a new wallet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createWallet = async (req, res, next) => {
  try {
    // Note: Wallet creation works independently of the network
    // A single private key/address pair is created for all EVM networks
    const wallet = walletService.createWallet();
    res.status(201).json({
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        mnemonic: wallet.mnemonic
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Imports a wallet using private key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const importWalletByPrivateKey = async (req, res, next) => {
  try {
    // Note: Wallet import works independently of the network
    const { privateKey } = req.body;
    const wallet = walletService.importWalletFromPrivateKey(privateKey);
    
    res.status(200).json({
      success: true,
      data: {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Imports a wallet using mnemonic
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const importWalletByMnemonic = async (req, res, next) => {
  try {
    // Note: Wallet import works independently of the network
    const { mnemonic, path } = req.body;
    const wallet = walletService.importWalletFromMnemonic(mnemonic, path);
    
    res.status(200).json({
      success: true,
      data: {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        mnemonic: wallet.mnemonic
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets wallet balance and token information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getWalletBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    
    // Specific tokens requested by the client
    const specificTokens = req.query.tokens ? 
      parseTokenQueryParam(req.query.tokens) : {};
    
    // Get network and network type values
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    const walletData = await walletService.getWalletSummary(address, specificTokens, network, networkType);
    
    res.status(200).json({
      success: true,
      data: walletData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Queries balance of a single token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTokenBalance = async (req, res, next) => {
  try {
    const { address, tokenAddress } = req.params;
    
    // Get network and network type values
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    const tokenData = await walletService.getTokenBalance(address, tokenAddress, network, networkType);
    
    res.status(200).json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Performs ETH transfer transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sendTransaction = async (req, res, next) => {
  try {
    const { encryptedPrivateKey, to, amount, gasPrice, maxFeePerGas, maxPriorityFeePerGas, gasLimit } = req.body;
    const network = req.body.network || DEFAULT_NETWORK;
    const networkType = req.body.networkType || DEFAULT_NETWORK_TYPE;
    
    // Arrange gas parameters
    const gasOptions = {};
    if (gasPrice) gasOptions.gasPrice = gasPrice;
    if (maxFeePerGas) gasOptions.maxFeePerGas = maxFeePerGas;
    if (maxPriorityFeePerGas) gasOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
    if (gasLimit) gasOptions.gasLimit = gasLimit;
    
    const txResult = await walletService.sendTransaction(
      encryptedPrivateKey, 
      to, 
      amount,
      gasOptions,
      network,
      networkType
    );
    
    // Broadcast transaction and balance updates (WebSocket)
    broadcastTransactionUpdate(txResult.txHash, 'pending', null);
    
    // Balance update for sender and receiver addresses
    if (txResult.from) {
      setTimeout(() => {
        broadcastBalanceUpdate(txResult.from, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    if (to) {
      setTimeout(() => {
        broadcastBalanceUpdate(to, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    res.status(200).json({
      success: true,
      data: txResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Performs ERC-20 token transfer transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sendTokenTransaction = async (req, res, next) => {
  try {
    const { encryptedPrivateKey, tokenAddress, to, amount, decimals, gasPrice, maxFeePerGas, maxPriorityFeePerGas, gasLimit } = req.body;
    const network = req.body.network || DEFAULT_NETWORK;
    const networkType = req.body.networkType || DEFAULT_NETWORK_TYPE;
    
    // Arrange gas parameters
    const gasOptions = {};
    if (gasPrice) gasOptions.gasPrice = gasPrice;
    if (maxFeePerGas) gasOptions.maxFeePerGas = maxFeePerGas;
    if (maxPriorityFeePerGas) gasOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
    if (gasLimit) gasOptions.gasLimit = gasLimit;
    
    const txResult = await walletService.sendTokenTransaction(
      encryptedPrivateKey,
      tokenAddress,
      to,
      amount,
      decimals,
      gasOptions,
      network,
      networkType
    );
    
    // Broadcast transaction and balance updates (WebSocket)
    broadcastTransactionUpdate(txResult.txHash, 'pending', null);
    
    // Balance update for sender and receiver addresses
    if (txResult.from) {
      setTimeout(() => {
        broadcastBalanceUpdate(txResult.from, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    if (to) {
      setTimeout(() => {
        broadcastBalanceUpdate(to, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    res.status(200).json({
      success: true,
      data: txResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Performs ERC-721/ERC-1155 NFT transfer transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sendNftTransaction = async (req, res, next) => {
  try {
    const { encryptedPrivateKey, contractAddress, to, tokenId, amount = '1', nftType = 'ERC721', gasPrice, maxFeePerGas, maxPriorityFeePerGas, gasLimit } = req.body;
    const network = req.body.network || DEFAULT_NETWORK;
    const networkType = req.body.networkType || DEFAULT_NETWORK_TYPE;
    
    // Arrange gas parameters
    const gasOptions = {};
    if (gasPrice) gasOptions.gasPrice = gasPrice;
    if (maxFeePerGas) gasOptions.maxFeePerGas = maxFeePerGas;
    if (maxPriorityFeePerGas) gasOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
    if (gasLimit) gasOptions.gasLimit = gasLimit;
    
    const txResult = await walletService.sendNftTransaction(
      encryptedPrivateKey,
      contractAddress,
      to,
      tokenId,
      amount,
      nftType,
      gasOptions,
      network,
      networkType
    );
    
    // Broadcast transaction and balance updates (WebSocket)
    broadcastTransactionUpdate(txResult.txHash, 'pending', null);
    
    // Balance update for sender and receiver addresses
    if (txResult.from) {
      setTimeout(() => {
        broadcastBalanceUpdate(txResult.from, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    if (to) {
      setTimeout(() => {
        broadcastBalanceUpdate(to, network, networkType);
      }, 2000); // Wait a bit for transaction to enter mempool
    }
    
    res.status(200).json({
      success: true,
      data: txResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets list of supported networks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getSupportedNetworksList = async (req, res, next) => {
  try {
    const networks = getSupportedNetworks();
    res.status(200).json({
      success: true,
      data: networks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parses token query parameter
 * @param {string} tokenQueryParam - Token query parameter string
 * @returns {Object} Parsed token parameters
 */
const parseTokenQueryParam = (tokenQueryParam) => {
  if (!tokenQueryParam) return {};
  
  const tokens = {};
  const tokenPairs = tokenQueryParam.split(',');
  
  tokenPairs.forEach(pair => {
    const [symbol, address] = pair.split(':');
    if (symbol && address) {
      tokens[symbol.trim().toUpperCase()] = address.trim();
    }
  });
  
  return tokens;
};

module.exports = {
  createWallet,
  importWalletByPrivateKey,
  importWalletByMnemonic,
  getWalletBalance,
  getTokenBalance,
  sendTransaction,
  sendTokenTransaction,
  sendNftTransaction,
  getSupportedNetworksList
}; 