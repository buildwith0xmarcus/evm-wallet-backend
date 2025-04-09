const { ethers } = require('ethers');
const dotenv = require('dotenv');
const { getProvider: getNetworkProvider } = require('./network');
const { rpcCache } = require('./cache');

dotenv.config();

// ERC20 Token ABI - Minimum ABI for token balance query
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
];

// ERC-721 (NFT) standard ABI
const ERC721_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: 'owner', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];

// ERC-1155 (Multi-token) standard ABI
const ERC1155_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];

// Class implementing provider cache
class CachedProvider {
  constructor(provider, network, networkType) {
    this.provider = provider;
    this.network = network;
    this.networkType = networkType;
  }

  // General method for sending RPC requests
  async _sendRpcRequest(method, params = []) {
    // Search for value in cache
    const cachedValue = rpcCache.get(method, params);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // If not in cache, send RPC request
    try {
      const result = await this.provider[method](...params);
      
      // Cache the result
      rpcCache.set(method, params, result);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Implement provider methods
  async getBalance(address) {
    return this._sendRpcRequest('getBalance', [address]);
  }

  async getBlock(blockHashOrNumber) {
    return this._sendRpcRequest('getBlock', [blockHashOrNumber]);
  }

  async getBlockNumber() {
    return this._sendRpcRequest('getBlockNumber', []);
  }

  async getCode(address) {
    return this._sendRpcRequest('getCode', [address]);
  }

  async getGasPrice() {
    return this._sendRpcRequest('getGasPrice', []);
  }

  async getFeeData() {
    return this._sendRpcRequest('getFeeData', []);
  }

  async getTransaction(txHash) {
    return this._sendRpcRequest('getTransaction', [txHash]);
  }

  async getTransactionReceipt(txHash) {
    return this._sendRpcRequest('getTransactionReceipt', [txHash]);
  }

  async call(txParams) {
    return this._sendRpcRequest('call', [txParams]);
  }

  async estimateGas(txParams) {
    return this._sendRpcRequest('estimateGas', [txParams]);
  }

  // This method is not cached - Directly forwarded to provider
  async sendTransaction(txRequest) {
    return this.provider.sendTransaction(txRequest);
  }

  // Forward to provider for event listening and other non-RPC methods
  on(eventName, listener) {
    return this.provider.on(eventName, listener);
  }

  once(eventName, listener) {
    return this.provider.once(eventName, listener);
  }

  removeListener(eventName, listener) {
    return this.provider.removeListener(eventName, listener);
  }

  removeAllListeners(eventName) {
    return this.provider.removeAllListeners(eventName);
  }
}

// Cached provider creator
const getProvider = (network, networkType) => {
  const provider = getNetworkProvider(network, networkType);
  return provider;
};

// Returns Ethereum balance
const getEthBalance = async (address, network, networkType) => {
  try {
    const provider = getProvider(network, networkType);
    const balance = await provider.getBalance(address);
    return balance;
  } catch (error) {
    console.error('Balance query error:', error);
    throw new Error(`Could not query balance: ${error.message}`);
  }
};

// Token balance query (with caching)
const getTokenBalance = async (address, tokenAddress, network, networkType) => {
  try {
    // Cache check
    const cacheKey = `tokenBalance:${network}:${networkType}:${address}:${tokenAddress}`;
    const cachedBalance = rpcCache.get('tokenBalance', [address, tokenAddress, network, networkType]);
    
    if (cachedBalance !== undefined) {
      return {
        balance: cachedBalance.balance,
        decimals: cachedBalance.decimals,
        symbol: cachedBalance.symbol,
        name: cachedBalance.name,
        fromCache: true
      };
    }
    
    const provider = getProvider(network, networkType);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Parallel requests for efficiency
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(address),
      tokenContract.decimals().catch(() => 18), // Default 18 usage
      tokenContract.symbol().catch(() => 'TOKEN'),
      tokenContract.name().catch(() => 'Unknown Token')
    ]);
    
    const result = {
      balance,
      decimals,
      symbol,
      name
    };
    
    // Cache the result
    rpcCache.set('tokenBalance', [address, tokenAddress, network, networkType], result);
    
    return result;
  } catch (error) {
    console.error('Token balance query error:', error);
    throw new Error(`Could not query token balance: ${error.message}`);
  }
};

// Detects NFT standard (ERC721 or ERC1155) - with caching
const detectNftStandard = async (contractAddress, network, networkType) => {
  try {
    // Cache check
    const cachedStandard = rpcCache.get('detectNftStandard', [contractAddress, network, networkType]);
    if (cachedStandard !== undefined) {
      return cachedStandard;
    }
    
    const provider = getProvider(network, networkType);
    
    // ERC165 support check (supportsInterface)
    const ERC165_ABI = [
      {
        inputs: [{ type: 'bytes4', name: 'interfaceId' }],
        name: 'supportsInterface',
        outputs: [{ type: 'bool', name: '' }],
        stateMutability: 'view',
        type: 'function'
      }
    ];
    
    const contract = new ethers.Contract(contractAddress, ERC165_ABI, provider);
    
    // First, check ERC165 support
    try {
      // ERC721 interface ID: 0x80ac58cd
      // ERC1155 interface ID: 0xd9b67a26
      const [supportsERC721, supportsERC1155] = await Promise.all([
        contract.supportsInterface('0x80ac58cd').catch(() => false),
        contract.supportsInterface('0xd9b67a26').catch(() => false)
      ]);
      
      let standard = null;
      
      if (supportsERC721) {
        standard = 'ERC721';
      } else if (supportsERC1155) {
        standard = 'ERC1155';
      }
      
      // Cache the result (NFT standard is immutable, long-term cache)
      if (standard) {
        rpcCache.set('detectNftStandard', [contractAddress, network, networkType], standard);
      }
      
      return standard;
    } catch (error) {
      // If supportsInterface method is missing or error occurred
      // Check contract code and look at its function signatures
      const bytecode = await provider.getCode(contractAddress);
      
      // ERC721 and ERC1155 function signatures check
      if (bytecode.includes('80ac58cd')) { // ERC721 interface ID
        rpcCache.set('detectNftStandard', [contractAddress, network, networkType], 'ERC721');
        return 'ERC721';
      } else if (bytecode.includes('d9b67a26')) { // ERC1155 interface ID
        rpcCache.set('detectNftStandard', [contractAddress, network, networkType], 'ERC1155');
        return 'ERC1155';
      }
      
      return null;
    }
  } catch (error) {
    console.error('NFT standard detection error:', error);
    return null;
  }
};

// Returns NFT owner
const getNftOwner = async (contractAddress, tokenId, network, networkType) => {
  try {
    // Cache check
    const cachedOwner = rpcCache.get('getNftOwner', [contractAddress, tokenId, network, networkType]);
    if (cachedOwner !== undefined) {
      return cachedOwner;
    }
    
    const provider = getProvider(network, networkType);
    
    // First, detect NFT standard
    const standard = await detectNftStandard(contractAddress, network, networkType);
    
    if (standard === 'ERC721') {
      const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      const owner = await nftContract.ownerOf(tokenId);
      
      // Cache the result
      rpcCache.set('getNftOwner', [contractAddress, tokenId, network, networkType], owner);
      
      return owner;
    } else if (standard === 'ERC1155') {
      // ERC1155 does not have ownerOf, we can only check balance
      return null;
    } else {
      return null;
    }
  } catch (error) {
    console.error('NFT owner query error:', error);
    return null;
  }
};

// Returns cache statistics
const getCacheStats = () => {
  return rpcCache.getStats();
};

// Clear cache for a specific RPC method
const invalidateCache = (method) => {
  return rpcCache.invalidate(method);
};

/**
 * Retrieves data from cache, if not found, calls callback function
 * @param {string} method - Method name (e.g: getBalance, tokenBalance)
 * @param {string} key - Cache key
 * @param {Function} callback - Async function to call if data not found
 * @param {number} ttl - Cache duration in seconds (default: 30 seconds)
 * @returns {Promise<any>} - Data from callback
 */
const getFromCache = async (method, key, callback, ttl = 30) => {
  // Integrate with existing cache system
  const cacheKey = `${method}:${key}`;
  const cachedResult = await rpcCache.get(cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  const result = await callback();
  await rpcCache.set(cacheKey, result, ttl);
  
  return result;
};

module.exports = {
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  getProvider,
  getEthBalance,
  getTokenBalance,
  detectNftStandard,
  getNftOwner,
  getCacheStats,
  invalidateCache,
  getFromCache
}; 