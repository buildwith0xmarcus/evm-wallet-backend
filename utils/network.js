const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

// Supported networks
const NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: {
      mainnet: 1,
      sepolia: 11155111,
      goerli: 5
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: {
      mainnet: 'https://etherscan.io',
      sepolia: 'https://sepolia.etherscan.io',
      goerli: 'https://goerli.etherscan.io'
    },
    rpcUrl: {
      mainnet: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://ethereum.publicnode.com',
      sepolia: process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
      goerli: process.env.ETHEREUM_GOERLI_RPC_URL || 'https://ethereum-goerli.publicnode.com'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: {
      mainnet: 137,
      mumbai: 80001
    },
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorer: {
      mainnet: 'https://polygonscan.com',
      mumbai: 'https://mumbai.polygonscan.com'
    },
    rpcUrl: {
      mainnet: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-bor.publicnode.com',
      mumbai: process.env.POLYGON_MUMBAI_RPC_URL || 'https://polygon-mumbai-bor.publicnode.com'
    }
  },
  bsc: {
    name: 'Binance Smart Chain',
    chainId: {
      mainnet: 56,
      testnet: 97
    },
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorer: {
      mainnet: 'https://bscscan.com',
      testnet: 'https://testnet.bscscan.com'
    },
    rpcUrl: {
      mainnet: process.env.BSC_MAINNET_RPC_URL || 'https://binance.publicnode.com',
      testnet: process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.publicnode.com'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: {
      mainnet: 10,
      goerli: 420
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: {
      mainnet: 'https://optimistic.etherscan.io',
      goerli: 'https://goerli-optimism.etherscan.io'
    },
    rpcUrl: {
      mainnet: process.env.OPTIMISM_MAINNET_RPC_URL || 'https://optimism.publicnode.com',
      goerli: process.env.OPTIMISM_GOERLI_RPC_URL || 'https://optimism-goerli.publicnode.com'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: {
      mainnet: 42161,
      goerli: 421613
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: {
      mainnet: 'https://arbiscan.io',
      goerli: 'https://goerli.arbiscan.io'
    },
    rpcUrl: {
      mainnet: process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arbitrum.publicnode.com',
      goerli: process.env.ARBITRUM_GOERLI_RPC_URL || 'https://arbitrum-goerli.publicnode.com'
    }
  }
};

// Helper function to find network name from chain ID
const getNetworkNameById = (chainId) => {
  for (const [network, data] of Object.entries(NETWORKS)) {
    for (const [type, id] of Object.entries(data.chainId)) {
      if (id === chainId) {
        return { network, type };
      }
    }
  }
  return { network: 'unknown', type: 'unknown' };
};

// Get default network and network type
const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK || 'ethereum';
const DEFAULT_NETWORK_TYPE = process.env.DEFAULT_NETWORK_TYPE || 'mainnet';

/**
 * Returns provider for specified network
 * @param {string} network - Network name (ethereum, polygon, bsc, optimism, arbitrum)
 * @param {string} networkType - Network type (mainnet, testnet, sepolia, goerli, mumbai, bsc-testnet, optimism-goerli, arbitrum-goerli)
 * @returns {ethers.JsonRpcProvider} - Provider object
 */
const getProvider = (network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  // Fix network type (testnet for BSC, mumbai for Polygon etc.)
  let normalizedNetworkType = networkType;
  
  // Check if passed as object
  if (typeof network === 'object') {
    console.warn('Network information passed as object, string value should be used');
    network = DEFAULT_NETWORK;  // Use default value
  }
  
  if (typeof networkType === 'object') {
    console.warn('Network type passed as object, string value should be used');
    networkType = DEFAULT_NETWORK_TYPE;  // Use default value
  }
  
  if (network === 'bsc' && networkType === 'testnet') {
    normalizedNetworkType = 'testnet';
  } else if (network === 'polygon' && networkType === 'testnet') {
    normalizedNetworkType = 'mumbai';
  } else if (networkType === 'testnet') {
    normalizedNetworkType = 'goerli'; // Use goerli for default test network
  }
  
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  const rpcUrl = networkConfig.rpcUrl[normalizedNetworkType];
  if (!rpcUrl) {
    throw new Error(`${networkType} type is not supported for ${network} network`);
  }
  
  return new ethers.JsonRpcProvider(rpcUrl);
};

/**
 * Returns network information
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Object} - Network information
 */
const getNetworkInfo = (network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  // Fix network type
  let normalizedNetworkType = networkType;
  
  // Check if passed as object
  if (typeof network === 'object') {
    console.warn('Network information passed as object, string value should be used');
    network = DEFAULT_NETWORK;  // Use default value
  }
  
  if (typeof networkType === 'object') {
    console.warn('Network type passed as object, string value should be used');
    networkType = DEFAULT_NETWORK_TYPE;  // Use default value
  }
  
  if (network === 'bsc' && networkType === 'testnet') {
    normalizedNetworkType = 'testnet';
  } else if (network === 'polygon' && networkType === 'testnet') {
    normalizedNetworkType = 'mumbai';
  } else if (networkType === 'testnet') {
    normalizedNetworkType = 'goerli';
  }
  
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  return {
    name: networkConfig.name,
    chainId: networkConfig.chainId[normalizedNetworkType],
    nativeCurrency: networkConfig.nativeCurrency,
    blockExplorer: networkConfig.blockExplorer[normalizedNetworkType],
    rpcUrl: networkConfig.rpcUrl[normalizedNetworkType]
  };
};

/**
 * Returns list of supported networks
 * @returns {Object} - Network list
 */
const getSupportedNetworks = () => {
  const networks = {};
  for (const [network, data] of Object.entries(NETWORKS)) {
    networks[network] = {
      name: data.name,
      types: Object.keys(data.chainId),
      nativeCurrency: data.nativeCurrency
    };
  }
  return networks;
};

module.exports = {
  NETWORKS,
  getProvider,
  getNetworkInfo,
  getSupportedNetworks,
  getNetworkNameById,
  DEFAULT_NETWORK,
  DEFAULT_NETWORK_TYPE
}; 