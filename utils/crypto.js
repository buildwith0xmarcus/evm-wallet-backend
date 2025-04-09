const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypts text using AES-256
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const ciphertext = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return ciphertext;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption operation failed');
  }
};

/**
 * Decrypts AES-256 encrypted text
 * @param {string} ciphertext - Encrypted text
 * @returns {string} - Decrypted text
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!originalText) {
      throw new Error('Decryption failed');
    }
    
    return originalText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption operation failed');
  }
};

module.exports = {
  encrypt,
  decrypt
}; 