const express = require('express');
const router = express.Router();
const walletConnectController = require('../controllers/walletconnect.controller');

// Create WalletConnect connection
router.post('/connect', walletConnectController.createConnection);

// Handle connection approval
router.post('/approve', walletConnectController.handleConnectionApproval);

// Disconnect
router.post('/disconnect', walletConnectController.disconnect);

// Check connection status
router.get('/status', walletConnectController.getConnectionStatus);

// Sign message
router.post('/sign-message', walletConnectController.signMessage);

// Send transaction
router.post('/send-transaction', walletConnectController.sendTransaction);

module.exports = {
    walletConnectRoutes: router
}; 