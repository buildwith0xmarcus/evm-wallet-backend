const { ethers } = require('ethers');
const { getProvider, DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('../utils/network');

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
 * Prepares decoded transaction data for EVM-based transactions
 * @param {Object} txParams - Transaction parameters
 * @param {Object} contractInfo - Contract information (ABI, address etc.)
 * @returns {Object} - Decoded transaction data
 */
const decodeTransactionData = (txParams, contractInfo) => {
  try {
    if (!txParams.data || txParams.data === '0x') {
      return { type: 'transfer', decoded: null };
    }
    
    const iface = new ethers.Interface(contractInfo.abi);
    const decoded = iface.parseTransaction({ data: txParams.data, value: txParams.value });
    
    return {
      type: 'contract_interaction',
      decoded: {
        name: decoded.name,
        signature: decoded.signature,
        args: decoded.args,
        functionFragment: decoded.functionFragment
      }
    };
  } catch (error) {
    return { 
      type: 'unknown', 
      error: error.message,
      data: txParams.data
    };
  }
};

module.exports = {
  simulateTransaction,
  decodeTransactionData
}; 