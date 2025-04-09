const { ethers } = require('ethers');
const { getProvider, DEFAULT_NETWORK, DEFAULT_NETWORK_TYPE } = require('../utils/network');

// ERC721 ABI only for ownerOf function
const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)'
];

// ERC1155 ABI only for balanceOf function
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)'
];

/**
 * Get NFT owner
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getNFTOwner = async (req, res, next) => {
  try {
    const { contractAddress, tokenId } = req.params;
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    // Get provider
    const provider = getProvider(network, networkType);
    
    try {
      // Convert tokenId to number
      const tokenIdNumber = parseInt(tokenId, 10);
      
      // Try as ERC721 first
      const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      const owner = await nftContract.ownerOf(tokenIdNumber);
      
      res.status(200).json({
        success: true,
        data: {
          contractAddress,
          tokenId,
          owner,
          standard: 'ERC721',
          network,
          networkType
        }
      });
    } catch (error) {
      // Return error message if not ERC721
      res.status(400).json({
        success: false,
        message: 'Could not get NFT ownership information',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * List NFTs owned by wallet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getWalletNFTs = async (req, res, next) => {
  try {
    const { address } = req.params;
    const network = req.query.network || DEFAULT_NETWORK;
    const networkType = req.query.networkType || DEFAULT_NETWORK_TYPE;
    
    // NOTE: This function should return NFTs owned by the wallet connected to the backend
    // Use Ethereum API (e.g., Alchemy, Moralis) to get NFTs
    
    // This example returns an empty array just to show that the API is working
    // In a real application, NFT information should be fetched from an API
    res.status(200).json({
      success: true,
      data: {
        owner: address,
        nfts: [], // This part should be filled with an NFT API
        network,
        networkType
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNFTOwner,
  getWalletNFTs
}; 