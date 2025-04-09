const { ethers } = require("ethers");

const { encrypt, decrypt } = require("../utils/crypto");

const {
  getProvider,
  getEthBalance,
  detectNftStandard,
  getNftOwner,
  ERC721_ABI,
  ERC1155_ABI,
} = require("../utils/ethereum");

const {
  getSpecificTokenBalances,
  getSingleTokenBalance,
} = require("./token.service");

const {
  DEFAULT_NETWORK,
  DEFAULT_NETWORK_TYPE,
  getNetworkInfo,
} = require("../utils/network");

const { enqueueNetworkRequest } = require("../utils/queue");

/**
 * Creates wallet object from encrypted private key
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {Function} decryptFn - Decryption function
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {ethers.Wallet} - Wallet object
 */
const getWalletFromEncryptedKey = (
  encryptedPrivateKey,
  decryptFn,
  network,
  networkType
) => {
  try {
    // Check if passed as object
    if (typeof network === "object") {
      console.warn(
        "Network information passed as object, string value should be used"
      );
      network = DEFAULT_NETWORK; // Use default value
    }

    if (typeof networkType === "object") {
      console.warn("Network type passed as object, string value should be used");
      networkType = DEFAULT_NETWORK_TYPE; // Use default value
    }

    const privateKey = decryptFn(encryptedPrivateKey);
    if (!privateKey) {
      throw new Error("Private key could not be decrypted");
    }

    const provider = getProvider(network, networkType);
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    console.error("Wallet creation error:", error);
    throw new Error("Wallet could not be created: " + error.message);
  }
};

/**
 * Creates a new wallet
 * @returns {Object} - Created wallet information
 */
const createWallet = () => {
  try {
    const wallet = ethers.Wallet.createRandom();

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      encryptedPrivateKey: encrypt(wallet.privateKey),
      mnemonic: wallet.mnemonic.phrase,
    };
  } catch (error) {
    console.error("Wallet creation error:", error);
    throw new Error("Wallet could not be created: " + error.message);
  }
};

/**
 * Imports a wallet using private key
 * @param {string} privateKey - Private key
 * @returns {Object} - Imported wallet information
 */
const importWalletFromPrivateKey = (privateKey) => {
  try {
    const wallet = new ethers.Wallet(privateKey);

    return {
      address: wallet.address,
      encryptedPrivateKey: encrypt(privateKey),
    };
  } catch (error) {
    console.error("Wallet import error:", error);
    throw new Error("Wallet could not be imported: Invalid private key");
  }
};

/**
 * Imports a wallet using mnemonic (seed phrase)
 * @param {string} mnemonic - Mnemonic words (seed phrase)
 * @param {string} path - Derivation path (optional)
 * @returns {Object} - Imported wallet information
 */
const importWalletFromMnemonic = (mnemonic, path = ethers.defaultPath) => {
  try {
    const wallet = ethers.Wallet.fromPhrase(mnemonic, path);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      encryptedPrivateKey: encrypt(wallet.privateKey),
      mnemonic,
    };
  } catch (error) {
    console.error("Wallet import error with mnemonic:", error);
    throw new Error("Wallet could not be imported: Invalid mnemonic");
  }
};

/**
 * Gets wallet balance and token information
 * @param {string} address - Wallet address
 * @param {Object} specificTokens - Token addresses to query specifically
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Account summary
 */
const getWalletSummary = async (
  address,
  specificTokens = {},
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  // Add balance query to queue
  return enqueueNetworkRequest(network, networkType, async () => {
    try {
      // Get network information
      const networkInfo = getNetworkInfo(network, networkType);

      // Query native token balance
      const nativeBalance = await getEthBalance(address, network, networkType);

      // Query token balances
      let tokenBalances = [];

      try {
        tokenBalances = await getSpecificTokenBalances(
          address,
          specificTokens,
          network,
          networkType
        );
      } catch (error) {
        console.warn("Token balance query failed:", error.message);
      }

      return {
        address,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
        nativeCurrency: networkInfo.nativeCurrency.symbol,
        nativeBalance,
        tokenBalances,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting wallet summary:", error);
      throw new Error("Could not get wallet summary: " + error.message);
    }
  });
};

/**
 * Queries balance of a single token
 * @param {string} address - Wallet address
 * @param {string} tokenAddress - Token contract address
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Token balance information
 */
const getTokenBalance = async (
  address,
  tokenAddress,
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  // Add token balance query to queue
  return enqueueNetworkRequest(network, networkType, async () => {
    try {
      const tokenData = await getSingleTokenBalance(
        address,
        tokenAddress,
        network,
        networkType
      );
      const networkInfo = getNetworkInfo(network, networkType);

      return {
        success: true,
        tokenAddress,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
        ...tokenData,
      };
    } catch (error) {
      console.error("Error getting token balance:", error);
      throw new Error("Could not get token balance: " + error.message);
    }
  });
};

/**
 * Sends transaction with wallet
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} to - Recipient address
 * @param {string} amount - Amount to send (ETH)
 * @param {Object} options - Additional options (gasLimit, maxFeePerGas etc.)
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction information
 */
const sendTransaction = async (
  encryptedPrivateKey,
  to,
  amount,
  options = {},
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  // Add transaction sending to queue
  return enqueueNetworkRequest(network, networkType, async () => {
    try {
      const wallet = getWalletFromEncryptedKey(
        encryptedPrivateKey,
        decrypt,
        network,
        networkType
      );
      const networkInfo = getNetworkInfo(network, networkType);
      const provider = getProvider(network, networkType);

      // Get gas prices
      const feeData = await provider.getFeeData();

      console.log("value: ", ethers.parseEther(amount), amount);

      // Create transaction object
      const tx = {
        to,
        value: ethers.parseEther(amount),
        ...options,
      };

      // EIP-1559 support
      if (!tx.gasPrice && !tx.maxFeePerGas) {
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // EIP-1559 supported network
          tx.maxFeePerGas = feeData.maxFeePerGas;
          tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          // Legacy network
          tx.gasPrice = feeData.gasPrice;
        }
      }

      // Sign and send transaction
      const txResponse = await wallet.sendTransaction(tx);
      
      // Return transaction information
      return {
        txHash: txResponse.hash,
        from: wallet.address,
        to,
        amount,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
        transactionFee: {
          gasLimit: txResponse.gasLimit.toString(),
          ...(txResponse.maxFeePerGas ? { maxFeePerGas: txResponse.maxFeePerGas.toString() } : {}),
          ...(txResponse.maxPriorityFeePerGas ? { maxPriorityFeePerGas: txResponse.maxPriorityFeePerGas.toString() } : {}),
          ...(txResponse.gasPrice ? { gasPrice: txResponse.gasPrice.toString() } : {})
        }
      };
    } catch (error) {
      console.error("Transaction sending error:", error);
      throw new Error("Transaction could not be sent: " + error.message);
    }
  });
};

/**
 * Performs ERC-20 token transfer operation
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} tokenAddress - Token contract address
 * @param {string} to - Recipient address
 * @param {string} amount - Amount to send
 * @param {number} decimals - Token decimal places
 * @param {Object} options - Additional options (gasLimit, maxFeePerGas etc.)
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction information
 */
const sendTokenTransaction = async (
  encryptedPrivateKey,
  tokenAddress,
  to,
  amount,
  decimals,
  options = {},
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  // Add token transfer to queue
  return enqueueNetworkRequest(
    async () => {
      try {
        // Create token contract
        const provider = getProvider(network, networkType);
        const wallet = await getWalletFromEncryptedKey(encryptedPrivateKey, decrypt, network, networkType);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

        // If decimals not specified, get from contract
        let tokenDecimals = decimals;
        if (tokenDecimals === undefined) {
          tokenDecimals = await tokenContract.decimals();
        }

        // Format amount correctly
        const formattedAmount = ethers.parseUnits(amount, tokenDecimals);

        // Send transfer transaction
        const tx = await tokenContract.transfer(to, formattedAmount, options);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        console.error('Token transfer failed:', error);
        throw error;
      }
    },
    network,
    networkType
  );
};

/**
 * Performs ERC-721 NFT transfer operation
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} contractAddress - NFT contract address
 * @param {string} to - Recipient address
 * @param {string} tokenId - Token ID to transfer
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction information
 */
const sendERC721Transaction = async (
  encryptedPrivateKey,
  contractAddress,
  to,
  tokenId,
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE,
  options = {}
) => {
  try {
    const wallet = getWalletFromEncryptedKey(
      encryptedPrivateKey,
      decrypt,
      network,
      networkType
    );
    const networkInfo = getNetworkInfo(network, networkType);

    // Convert tokenId to number
    const tokenIdNumber = parseInt(tokenId, 10);
    if (isNaN(tokenIdNumber)) {
      throw new Error("TokenId should be a valid number");
    }

    // Create contract object
    const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, wallet);

    // Check if we own the token
    const owner = await nftContract.ownerOf(tokenIdNumber);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`You do not own this NFT (ID: ${tokenId})`);
    }

    // Merge override settings
    const overrideOptions = {
      ...options,
    };

    // Transfer NFT (from, to, tokenId)
    const transaction = await nftContract.safeTransferFrom(
      wallet.address,
      to,
      tokenIdNumber,
      overrideOptions
    );

    // Wait for transaction confirmation
    const receipt = await transaction.wait();

    return {
      txHash: transaction.hash,
      from: wallet.address,
      to,
      nftAddress: contractAddress,
      tokenId,
      type: "ERC721",
      network: networkInfo.name,
      chainId: networkInfo.chainId,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? "success" : "failed",
    };
  } catch (error) {
    console.error("ERC-721 NFT transfer error:", error);
    throw new Error("NFT transfer could not be sent: " + error.message);
  }
};

/**
 * Performs ERC-1155 token transfer operation
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} contractAddress - NFT contract address
 * @param {string} to - Recipient address
 * @param {string} amount - Amount to transfer (for ERC-1155)
 * @param {Object} options - Optional parameters like gas settings
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction information
 */
const sendErc1155Transaction = async (
  encryptedPrivateKey,
  contractAddress,
  to,
  amount,
  options = {},
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  return enqueueNetworkRequest(
    async () => {
      try {
        // Check if passed as object
        const params = typeof amount === 'object' ? amount : { tokenId: amount };
        const { tokenId, data } = params;

        // Convert tokenId to number
        const numericTokenId = ethers.parseUnits(tokenId, 0);

        // Create contract object
        const provider = getProvider(network, networkType);
        const wallet = await getWalletFromEncryptedKey(encryptedPrivateKey, decrypt, network, networkType);
        const nftContract = new ethers.Contract(contractAddress, ERC1155_ABI, wallet);

        // Convert amount to BigNumber
        const requestedAmount = ethers.parseUnits(amount, 0);

        // Merge override settings
        const txOptions = {
          ...options,
          gasLimit: options.gasLimit || await nftContract.estimateGas.safeTransferFrom(
            wallet.address,
            to,
            numericTokenId,
            requestedAmount,
            data || ethers.toUtf8Bytes("")
          )
        };

        // Transfer NFT (from, to, tokenId, amount, data)
        const tx = await nftContract.safeTransferFrom(
          wallet.address,
          to,
          numericTokenId,
          requestedAmount,
          data || ethers.toUtf8Bytes(""), // Empty data
          txOptions
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        console.error('ERC-1155 transfer failed:', error);
        throw error;
      }
    },
    network,
    networkType
  );
};

/**
 * Performs NFT transfer operation
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} contractAddress - NFT contract address
 * @param {string} to - Recipient address
 * @param {string} tokenId - Token ID to transfer
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @returns {Promise<Object>} - Transaction information
 */
const sendNftTransaction = async (
  encryptedPrivateKey,
  contractAddress,
  to,
  tokenId,
  network = DEFAULT_NETWORK,
  networkType = DEFAULT_NETWORK_TYPE
) => {
  return enqueueNetworkRequest(
    async () => {
      try {
        // Convert tokenId to number
        const numericTokenId = ethers.parseUnits(tokenId, 0);

        // Create contract object
        const provider = getProvider(network, networkType);
        const wallet = await getWalletFromEncryptedKey(encryptedPrivateKey, decrypt, network, networkType);
        const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, wallet);

        // Check if we own the token
        const owner = await nftContract.ownerOf(numericTokenId);
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new Error('Not the owner of this NFT');
        }

        // Merge override settings
        const txOptions = {
          ...options,
          gasLimit: options.gasLimit || await nftContract.estimateGas.transferFrom(wallet.address, to, numericTokenId)
        };

        // Transfer NFT (from, to, tokenId)
        const tx = await nftContract.transferFrom(wallet.address, to, numericTokenId, txOptions);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        console.error('NFT transfer failed:', error);
        throw error;
      }
    },
    network,
    networkType
  );
};

module.exports = {
  createWallet,
  importWalletFromPrivateKey,
  importWalletFromMnemonic,
  getWalletSummary,
  getTokenBalance,
  sendTransaction,
  sendTokenTransaction,
  sendNftTransaction,
  sendERC721Transaction,
  sendErc1155Transaction,
};
