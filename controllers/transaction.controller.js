const { 
  simulateTransaction,
  predictGasPrice, 
  analyzeAndOptimizeGas,
  getOptimalGasFees
} = require('../utils/transaction');
const { DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('../utils/network');
const { getCacheStats, invalidateCache } = require('../utils/ethereum');
const transactionService = require('../services/transaction.service');

/**
 * Simulates transaction before sending
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const simulateTx = async (req, res, next) => {
  try {
    const { 
      from, 
      to, 
      value, 
      data, 
      gasPrice, 
      maxFeePerGas, 
      maxPriorityFeePerGas,
      gasLimit,
      nonce
    } = req.body;
    
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    // Transaction parameters
    const txParams = {
      from,
      to,
      value: value ? BigInt(value) : undefined,
      data,
      gasPrice: gasPrice ? BigInt(gasPrice) : undefined,
      maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : undefined,
      gasLimit: gasLimit ? BigInt(gasLimit) : undefined,
      nonce: nonce !== undefined ? nonce : undefined
    };
    
    // Simulate transaction
    const simulation = await simulateTransaction(txParams, network, networkType);
    
    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Simulates token transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const simulateTokenTx = async (req, res, next) => {
  try {
    const { from, to, tokenAddress, amount, decimals = 18 } = req.body;
    const network = req.body.network || DEFAULT_NETWORK;
    const networkType = req.body.networkType || DEFAULT_NETWORK_TYPE;

    // Create ABI encoding for token transfer
    const transferFunctionSignature = '0xa9059cbb'; // transfer(address,uint256) function signature
    const receiverPadded = to.slice(2).padStart(64, '0');
    const amountPadded = BigInt(amount).toString(16).padStart(64, '0');
    const data = `${transferFunctionSignature}${receiverPadded}${amountPadded}`;

    // Transaction object for simulation
    const txParams = {
      from,
      to: tokenAddress,
      value: '0',
      data
    };

    // Get call results
    const result = await transactionService.simulateTransaction(txParams, network, networkType);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Simulates NFT transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const simulateNFTTx = async (req, res, next) => {
  try {
    const { from, to, contractAddress, tokenId, nftType = 'ERC721', amount = '1' } = req.body;
    const network = req.body.network || DEFAULT_NETWORK;
    const networkType = req.body.networkType || DEFAULT_NETWORK_TYPE;

    let data;
    if (nftType === 'ERC721') {
      // ABI encoding for ERC721 safeTransferFrom function
      const transferFunctionSignature = '0x42842e0e'; // safeTransferFrom(address,address,uint256) function signature
      const senderPadded = from.slice(2).padStart(64, '0');
      const receiverPadded = to.slice(2).padStart(64, '0');
      const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
      data = `${transferFunctionSignature}${senderPadded}${receiverPadded}${tokenIdPadded}`;
    } else {
      // ABI encoding for ERC1155 safeTransferFrom function
      const transferFunctionSignature = '0xf242432a'; // safeTransferFrom(address,address,uint256,uint256,bytes) function signature
      const senderPadded = from.slice(2).padStart(64, '0');
      const receiverPadded = to.slice(2).padStart(64, '0');
      const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
      const amountPadded = BigInt(amount).toString(16).padStart(64, '0');
      const dataPosition = '00000000000000000000000000000000000000000000000000000000000000a0'; // bytes offset
      const dataLength = '0000000000000000000000000000000000000000000000000000000000000000'; // empty bytes
      
      data = `${transferFunctionSignature}${senderPadded}${receiverPadded}${tokenIdPadded}${amountPadded}${dataPosition}${dataLength}`;
    }

    // Transaction object for simulation
    const txParams = {
      from,
      to: contractAddress,
      value: '0',
      data
    };

    // Get call results
    const result = await transactionService.simulateTransaction(txParams, network, networkType);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Estimates gas price
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getGasPricePrediction = async (req, res, next) => {
  try {
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    // Predict gas price
    const prediction = await predictGasPrice(network, networkType);
    
    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint that suggests optimal fee values
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getOptimalFees = async (req, res, next) => {
  try {
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    const priority = req.query.priority || 'medium'; // low, medium, high
    
    // Get optimal gas fees
    const fees = await getOptimalGasFees(network, networkType, priority);
    
    res.status(200).json({
      success: true,
      data: {
        ...fees,
        maxFeePerGas: fees.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas?.toString(),
        gasPrice: fees.gasPrice?.toString(),
        baseFee: fees.baseFee?.toString(),
        priority
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyzes and optimizes transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const analyzeTransaction = async (req, res, next) => {
  try {
    const { 
      from, 
      to, 
      value, 
      data,
      gasPrice, 
      maxFeePerGas, 
      maxPriorityFeePerGas,
      gasLimit
    } = req.body;
    
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    // Transaction parameters
    const txParams = {
      from,
      to,
      value: value ? BigInt(value) : undefined,
      data,
      gasPrice: gasPrice ? BigInt(gasPrice) : undefined,
      maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : undefined,
      gasLimit: gasLimit ? BigInt(gasLimit) : undefined
    };
    
    // Analyze and optimize transaction
    const analysis = await analyzeAndOptimizeGas(txParams, network, networkType);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets cache statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getCacheStatistics = async (req, res, next) => {
  try {
    const stats = getCacheStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clears cache
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const clearCache = async (req, res, next) => {
  try {
    const { method } = req.params;
    
    if (method) {
      invalidateCache(method);
    } else {
      // A function to clear all cache can be created
      const methods = [
        'getBalance', 
        'tokenBalance', 
        'getBlock', 
        'getFeeData',
        'detectNftStandard',
        'getNftOwner'
      ];
      
      methods.forEach(method => invalidateCache(method));
    }
    
    res.status(200).json({
      success: true,
      message: method ? `${method} cache cleared` : 'All cache cleared'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  simulateTx,
  simulateTokenTx,
  simulateNFTTx,
  getGasPricePrediction,
  getOptimalFees,
  analyzeTransaction,
  getCacheStatistics,
  clearCache
}; 