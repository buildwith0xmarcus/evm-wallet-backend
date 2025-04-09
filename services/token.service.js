const { getTokenBalance } = require('../utils/ethereum');
const { DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('../utils/network');

/**
 * Default tokens to query
 * Defining default token addresses for different networks
 */
const DEFAULT_TOKENS = {
  ethereum: {
    mainnet: {
      // Stablecoins
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Tether
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USD Coin
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',  // DAI
      // Wrapped assets
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Wrapped Ether
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  // Wrapped Bitcoin
    },
    // Empty object for test networks - tokens won't be queried unless user specifies
    sepolia: {},
    goerli: {}
  },
  polygon: {
    mainnet: {
      // Stablecoins
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // (PoS) Tether USD
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // (PoS) USD Coin
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',  // (PoS) Dai Stablecoin
      // Wrapped assets
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Wrapped Ether
      WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' // Wrapped Matic
    },
    mumbai: {}
  },
  bsc: {
    mainnet: {
      // Stablecoins
      USDT: '0x55d398326f99059fF775485246999027B3197955', // Binance-Peg BSC-USD
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // Binance-Peg USD Coin
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD Token
      // Wrapped assets
      WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // Wrapped BNB
    },
    testnet: {}
  },
  optimism: {
    mainnet: {
      // Stablecoins
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Tether USD
      USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USD Coin
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',  // Dai Stablecoin
      // Wrapped assets
      WETH: '0x4200000000000000000000000000000000000006' // Wrapped Ether
    },
    goerli: {}
  },
  arbitrum: {
    mainnet: {
      // Stablecoins
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Tether USD
      USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USD Coin
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',  // Dai Stablecoin
      // Wrapped assets
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' // Wrapped Ether
    },
    goerli: {}
  }
};

/**
 * Gets default tokens for a specific network
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Object} - Default tokens
 */
const getDefaultTokensForNetwork = (network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  return (DEFAULT_TOKENS[network] && DEFAULT_TOKENS[network][networkType]) || {};
};

/**
 * Queries balances of specific tokens
 * @param {string} address - Wallet address
 * @param {Object} tokens - Token addresses to query {symbol: address}
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Array>} - List of token balances
 */
const getSpecificTokenBalances = async (address, tokens = {}, network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  try {
    // If user hasn't specified custom token list, use network-specific default tokens
    let tokensToQuery = tokens;
    if (Object.keys(tokens).length === 0) {
      tokensToQuery = getDefaultTokensForNetwork(network, networkType);
    }

    const tokenBalancePromises = Object.entries(tokensToQuery).map(
      async ([symbol, tokenAddress]) => {
        try {
          const tokenData = await getTokenBalance(address, tokenAddress, network, networkType);
          return {
            symbol,
            ...tokenData
          };
        } catch (error) {
          console.warn(`Failed to get ${symbol} token balance:`, error.message);
          return null;
        }
      }
    );

    const results = await Promise.all(tokenBalancePromises);
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Failed to get token balances:', error);
    throw new Error('Failed to get token balances: ' + error.message);
  }
};

/**
 * Queries balance of a single token
 * @param {string} address - Wallet address
 * @param {string} tokenAddress - Token contract address
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Token balance information
 */
const getSingleTokenBalance = async (address, tokenAddress, network = DEFAULT_NETWORK, networkType = DEFAULT_NETWORK_TYPE) => {
  console.log('getSingleTokenBalance', address, tokenAddress, network, networkType);
  try {
    const tokenData = await getTokenBalance(address, tokenAddress, network, networkType);
    return tokenData;
  } catch (error) {
    console.error(`Failed to get token balance (${tokenAddress}):`, error);
    throw new Error('Failed to get token balance: ' + error.message);
  }
};

module.exports = {
  getSpecificTokenBalances,
  getSingleTokenBalance,
  DEFAULT_TOKENS,
  getDefaultTokensForNetwork
}; 