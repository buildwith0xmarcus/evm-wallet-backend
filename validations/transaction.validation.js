const Joi = require('joi');

// Supported networks
const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'optimism', 'arbitrum'];
const supportedNetworkTypes = ['mainnet', 'testnet', 'sepolia', 'goerli', 'mumbai', 'bsc-testnet', 'optimism-goerli', 'arbitrum-goerli'];

/**
 * Transaction simulation validation schema
 */
const simulateTransactionSchema = Joi.object({
  from: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Sender address is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  value: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Value must be numeric only'
  }),
  data: Joi.string().pattern(/^0x[a-fA-F0-9]*$/).messages({
    'string.pattern.base': 'Data field must be a valid hex value'
  }),
  gasPrice: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Gas price must be numeric only'
  }),
  maxFeePerGas: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Max fee per gas must be numeric only'
  }),
  maxPriorityFeePerGas: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Max priority fee per gas must be numeric only'
  }),
  gasLimit: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Gas limit must be numeric only'
  }),
  nonce: Joi.number().integer().min(0).messages({
    'number.base': 'Nonce must be an integer',
    'number.min': 'Nonce must be 0 or greater'
  }),
  network: Joi.string().valid(...supportedNetworks).messages({
    'any.only': 'Please enter a valid network name'
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).messages({
    'any.only': 'Please enter a valid network type'
  }),
  priority: Joi.string().valid('low', 'medium', 'high').messages({
    'any.only': 'Priority must be low, medium or high'
  })
});

/**
 * Gas parameters validation schema
 */
const gasParamsSchema = Joi.object({
  network: Joi.string().valid(...supportedNetworks).messages({
    'any.only': 'Please enter a valid network name'
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).messages({
    'any.only': 'Please enter a valid network type'
  }),
  priority: Joi.string().valid('low', 'medium', 'high').messages({
    'any.only': 'Priority must be low, medium or high'
  })
});

/**
 * Token transfer simulation schema
 */
const simulateTokenTransferSchema = Joi.object({
  from: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Sender address is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  tokenAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid token address',
    'any.required': 'Token address is required'
  }),
  amount: Joi.string().required().pattern(/^\d*\.?\d*$/).messages({
    'string.empty': 'Amount cannot be empty',
    'string.pattern.base': 'Amount must be numeric only',
    'any.required': 'Amount is required'
  }),
  decimals: Joi.number().integer().min(0).max(18).messages({
    'number.base': 'Decimal places must be an integer',
    'number.min': 'Decimal places must be minimum 0',
    'number.max': 'Decimal places must be maximum 18'
  }),
  network: Joi.string().valid(...supportedNetworks).messages({
    'any.only': 'Unsupported network. Please choose one of: ' + supportedNetworks.join(', ')
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).messages({
    'any.only': 'Unsupported network type. Please choose one of: ' + supportedNetworkTypes.join(', ')
  })
});

/**
 * NFT transfer simulation schema
 */
const simulateNftTransferSchema = Joi.object({
  from: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Sender address is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  contractAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.pattern.base': 'Please enter a valid NFT contract address',
    'any.required': 'NFT contract address is required'
  }),
  tokenId: Joi.string().required().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Token ID must be numeric only',
    'any.required': 'Token ID is required'
  }),
  amount: Joi.string().pattern(/^\d+$/).messages({
    'string.pattern.base': 'Amount must be numeric only'
  })
});

module.exports = {
  simulateTransactionSchema,
  simulateTokenTransferSchema,
  simulateNftTransferSchema,
  gasParamsSchema
}; 