const Joi = require('joi');

/**
 * Wallet import validation schema
 */
const importWalletSchema = {
  // Import with private key
  privateKey: Joi.object({
    privateKey: Joi.string().required().messages({
      'string.empty': 'Private key cannot be empty',
      'any.required': 'Private key is required'
    })
  }),
  
  // Import with mnemonic
  mnemonic: Joi.object({
    mnemonic: Joi.string().required().messages({
      'string.empty': 'Mnemonic words cannot be empty',
      'any.required': 'Mnemonic words are required'
    }),
    path: Joi.string().optional()
  })
};

// Supported networks
const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'optimism', 'arbitrum'];
const supportedNetworkTypes = ['mainnet', 'testnet', 'sepolia', 'goerli', 'mumbai', 'bsc-testnet', 'optimism-goerli', 'arbitrum-goerli'];

/**
 * Send transaction validation schema
 */
const sendTransactionSchema = Joi.object({
  encryptedPrivateKey: Joi.string().required().messages({
    'string.empty': 'Encrypted private key cannot be empty',
    'any.required': 'Encrypted private key is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'Recipient address cannot be empty',
    'string.pattern.base': 'Invalid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  amount: Joi.string().required().pattern(/^\d*\.?\d*$/).messages({
    'string.empty': 'Amount cannot be empty',
    'string.pattern.base': 'Invalid amount value',
    'any.required': 'Amount is required'
  }),
  gasLimit: Joi.string().optional(),
  maxFeePerGas: Joi.string().optional(),
  maxPriorityFeePerGas: Joi.string().optional(),
  network: Joi.string().valid(...supportedNetworks).optional().messages({
    'any.only': 'Unsupported network. Please choose one of: ' + supportedNetworks.join(', ')
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).optional().messages({
    'any.only': 'Unsupported network type. Please choose one of: ' + supportedNetworkTypes.join(', ')
  })
});

/**
 * Token transaction validation schema
 */
const sendTokenTransactionSchema = Joi.object({
  encryptedPrivateKey: Joi.string().required().messages({
    'string.empty': 'Encrypted private key cannot be empty',
    'any.required': 'Encrypted private key is required'
  }),
  tokenAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'Token address cannot be empty',
    'string.pattern.base': 'Invalid token address',
    'any.required': 'Token address is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'Recipient address cannot be empty',
    'string.pattern.base': 'Invalid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  amount: Joi.string().required().pattern(/^\d*\.?\d*$/).messages({
    'string.empty': 'Amount cannot be empty',
    'string.pattern.base': 'Invalid amount value',
    'any.required': 'Amount is required'
  }),
  decimals: Joi.number().optional().min(0).max(18),
  network: Joi.string().valid(...supportedNetworks).optional().messages({
    'any.only': 'Unsupported network. Please choose one of: ' + supportedNetworks.join(', ')
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).optional().messages({
    'any.only': 'Unsupported network type. Please choose one of: ' + supportedNetworkTypes.join(', ')
  })
});

/**
 * NFT transaction validation schema
 */
const sendNftTransactionSchema = Joi.object({
  encryptedPrivateKey: Joi.string().required().messages({
    'string.empty': 'Encrypted private key cannot be empty',
    'any.required': 'Encrypted private key is required'
  }),
  contractAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'NFT contract address cannot be empty',
    'string.pattern.base': 'Invalid NFT contract address',
    'any.required': 'NFT contract address is required'
  }),
  to: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'Recipient address cannot be empty',
    'string.pattern.base': 'Invalid Ethereum address',
    'any.required': 'Recipient address is required'
  }),
  tokenId: Joi.string().required().pattern(/^\d+$/).messages({
    'string.empty': 'Token ID cannot be empty',
    'string.pattern.base': 'Invalid Token ID value (must be a positive integer)',
    'any.required': 'Token ID is required'
  }),
  amount: Joi.string().optional().pattern(/^\d+$/).default("1").messages({
    'string.pattern.base': 'Invalid amount value (must be a positive integer)'
  }),
  nftType: Joi.string().optional().valid('ERC721', 'ERC1155').default('ERC721').messages({
    'any.only': 'NFT type must be either ERC721 or ERC1155'
  }),
  network: Joi.string().valid(...supportedNetworks).optional().messages({
    'any.only': 'Unsupported network. Please choose one of: ' + supportedNetworks.join(', ')
  }),
  networkType: Joi.string().valid(...supportedNetworkTypes).optional().messages({
    'any.only': 'Unsupported network type. Please choose one of: ' + supportedNetworkTypes.join(', ')
  })
});

/**
 * Wallet address validation schema
 */
const addressSchema = Joi.object({
  address: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
    'string.empty': 'Address cannot be empty',
    'string.pattern.base': 'Invalid Ethereum address',
    'any.required': 'Address is required'
  })
});

module.exports = {
  importWalletSchema,
  sendTransactionSchema,
  sendTokenTransactionSchema,
  sendNftTransactionSchema,
  addressSchema
}; 