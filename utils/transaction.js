const { ethers } = require('ethers');
const { getProvider, DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('./network');

/**
 * Estimates gas limit for transaction
 * @param {Object} txParams - Transaction parameters
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<bigint>} - Estimated gas limit value
 */
const estimateGasLimit = async (txParams, network, networkType) => {
  const provider = getProvider(network, networkType);
  
  try {
    // Estimate transaction gas limit
    const gasEstimate = await provider.estimateGas(txParams);
    
    // Add 10% safety margin to estimate
    const safeGasLimit = gasEstimate * BigInt(110) / BigInt(100);
    
    return safeGasLimit;
  } catch (error) {
    console.error('Gas limit estimation error:', error);
    throw new Error(`Could not estimate gas limit: ${error.message}`);
  }
};

/**
 * Simulates transaction
 * @param {Object} txParams - Transaction parameters
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Simulation result
 */
const simulateTransaction = async (txParams, network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  try {
    const provider = getProvider(network, networkType);
    
    // Estimate gas
    const gasEstimate = await provider.estimateGas(txParams);
    
    // Get call result (static call - throws error on revert)
    let callResult = null;
    let success = true;
    let errorMessage = null;
    
    try {
      callResult = await provider.call(txParams);
    } catch (error) {
      success = false;
      errorMessage = error.message;
    }
    
    // Get current gas prices
    const feeData = await provider.getFeeData();
    
    return {
      success,
      gasEstimate: gasEstimate.toString(),
      callResult,
      errorMessage,
      gasInfo: {
        gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : null,
        maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toString() : null,
        baseFee: feeData.lastBaseFeePerGas ? feeData.lastBaseFeePerGas.toString() : null
      }
    };
  } catch (error) {
    throw new Error(`Transaction simulation failed: ${error.message}`);
  }
};

/**
 * Gas price prediction
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Gas price prediction
 */
const predictGasPrice = async (network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  try {
    const provider = getProvider(network, networkType);
    const feeData = await provider.getFeeData();
    
    const baseFee = feeData.lastBaseFeePerGas || feeData.gasPrice;
    
    // For EIP-1559 supported chains
    if (feeData.maxFeePerGas) {
      const slow = {
        maxFeePerGas: (baseFee * BigInt(120) / BigInt(100)).toString(), // 20% more
        maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas / BigInt(2)).toString(), // Half priority fee
        estimatedTime: '3-5 minutes'
      };
      
      const standard = {
        maxFeePerGas: (baseFee * BigInt(150) / BigInt(100)).toString(), // 50% more
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        estimatedTime: '1-3 minutes'
      };
      
      const fast = {
        maxFeePerGas: (baseFee * BigInt(200) / BigInt(100)).toString(), // 100% more
        maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * BigInt(2)).toString(), // 2x priority fee
        estimatedTime: '<1 minute'
      };
      
      return {
        slow,
        standard,
        fast,
        baseFee: baseFee.toString(),
        eip1559Supported: true
      };
    } else {
      // For legacy gas price model
      const gasPrice = feeData.gasPrice;
      
      const slow = {
        gasPrice: (gasPrice * BigInt(80) / BigInt(100)).toString(), // 20% lower
        estimatedTime: '3-5 minutes'
      };
      
      const standard = {
        gasPrice: gasPrice.toString(),
        estimatedTime: '1-3 minutes'
      };
      
      const fast = {
        gasPrice: (gasPrice * BigInt(120) / BigInt(100)).toString(), // 20% higher
        estimatedTime: '<1 minute'
      };
      
      return {
        slow,
        standard,
        fast,
        eip1559Supported: false
      };
    }
  } catch (error) {
    throw new Error(`Gas price prediction failed: ${error.message}`);
  }
};

/**
 * Determines optimal gas fees
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @param {string} priority - Priority level (low, medium, high)
 * @returns {Promise<Object>} - Optimal gas fees
 */
const getOptimalGasFees = async (network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE, priority = 'medium') => {
  try {
    const prediction = await predictGasPrice(network, networkType);
    
    let result;
    
    switch(priority) {
      case 'low':
        result = prediction.slow;
        break;
      case 'high':
        result = prediction.fast;
        break;
      case 'medium':
      default:
        result = prediction.standard;
        break;
    }
    
    // Add base fee and EIP-1559 support information
    result.baseFee = prediction.baseFee;
    result.eip1559Supported = prediction.eip1559Supported;
    
    return result;
  } catch (error) {
    throw new Error(`Could not calculate optimal gas fees: ${error.message}`);
  }
};

/**
 * Analyzes transaction and provides gas usage recommendations
 * @param {Object} txParams - Transaction parameters
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction analysis and recommendations
 */
const analyzeAndOptimizeGas = async (txParams, network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  try {
    // Simulate transaction
    const simulation = await simulateTransaction(txParams, network, networkType);
    
    // Gas predictions
    const gasPrediction = await predictGasPrice(network, networkType);
    
    // Transaction type
    let transactionType = 'ETH Transfer';
    if (txParams.data && txParams.data !== '0x') {
      transactionType = 'Smart Contract Interaction';
    }
    
    // Generate optimization recommendations
    const gasEstimateBigInt = BigInt(simulation.gasEstimate);
    const recommendations = {};
    
    // Recommendations for EIP-1559 supported chains
    if (gasPrediction.eip1559Supported) {
      recommendations.usageOptimization = [];
      
      // Gas limit recommendation - 10% above estimate
      const recommendedGasLimit = (gasEstimateBigInt * BigInt(110) / BigInt(100)).toString();
      recommendations.recommendedParams = {
        gasLimit: recommendedGasLimit,
        maxFeePerGas: gasPrediction.standard.maxFeePerGas,
        maxPriorityFeePerGas: gasPrediction.standard.maxPriorityFeePerGas
      };
      
      // Low priority option
      recommendations.savingOptions = {
        gasLimit: recommendedGasLimit,
        maxFeePerGas: gasPrediction.slow.maxFeePerGas,
        maxPriorityFeePerGas: gasPrediction.slow.maxPriorityFeePerGas,
        estimatedSavingsPercent: '~30%',
        estimatedTime: gasPrediction.slow.estimatedTime
      };
      
      // Fast completion option
      recommendations.speedOptions = {
        gasLimit: recommendedGasLimit,
        maxFeePerGas: gasPrediction.fast.maxFeePerGas,
        maxPriorityFeePerGas: gasPrediction.fast.maxPriorityFeePerGas,
        estimatedTime: gasPrediction.fast.estimatedTime
      };
    } else {
      // Legacy gas price model recommendations
      recommendations.usageOptimization = [];
      
      // Gas limit recommendation - 10% above estimate
      const recommendedGasLimit = (gasEstimateBigInt * BigInt(110) / BigInt(100)).toString();
      recommendations.recommendedParams = {
        gasLimit: recommendedGasLimit,
        gasPrice: gasPrediction.standard.gasPrice
      };
      
      // Low priority option
      recommendations.savingOptions = {
        gasLimit: recommendedGasLimit,
        gasPrice: gasPrediction.slow.gasPrice,
        estimatedSavingsPercent: '~20%',
        estimatedTime: gasPrediction.slow.estimatedTime
      };
      
      // Fast completion option
      recommendations.speedOptions = {
        gasLimit: recommendedGasLimit,
        gasPrice: gasPrediction.fast.gasPrice,
        estimatedTime: gasPrediction.fast.estimatedTime
      };
    }
    
    return {
      transactionType,
      gasEstimate: simulation.gasEstimate,
      success: simulation.success,
      errorMessage: simulation.errorMessage,
      currentNetworkConditions: {
        baseFee: gasPrediction.baseFee,
        eip1559Supported: gasPrediction.eip1559Supported
      },
      recommendations
    };
  } catch (error) {
    throw new Error(`Transaction analysis failed: ${error.message}`);
  }
};

module.exports = {
  estimateGasLimit,
  simulateTransaction,
  predictGasPrice,
  getOptimalGasFees,
  analyzeAndOptimizeGas
}; 