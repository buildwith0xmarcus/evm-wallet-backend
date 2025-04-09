const walletConnectService = require('../services/walletconnect.service');

class WalletConnectController {
    async createConnection(req, res) {
        try {
            const uri = await walletConnectService.createConnection();
            res.json({
                success: true,
                data: { uri }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async handleConnectionApproval(req, res) {
        try {
            const session = await walletConnectService.handleConnectionApproval();
            res.json({
                success: true,
                data: {
                    connected: true,
                    accounts: session.namespaces.eip155.accounts,
                    chainId: session.namespaces.eip155.chains[0]
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async disconnect(req, res) {
        try {
            await walletConnectService.disconnect();
            res.json({
                success: true,
                message: "Connection successfully terminated"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getConnectionStatus(req, res) {
        try {
            const status = walletConnectService.getConnectionStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async signMessage(req, res) {
        try {
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: "Message to sign is required"
                });
            }

            const signature = await walletConnectService.signMessage(message);
            res.json({
                success: true,
                data: { signature }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async sendTransaction(req, res) {
        try {
            const { to, value, data } = req.body;
            if (!to || !value) {
                return res.status(400).json({
                    success: false,
                    error: "Recipient address and amount are required"
                });
            }

            const txHash = await walletConnectService.sendTransaction({
                to,
                value,
                data: data || '0x'
            });

            res.json({
                success: true,
                data: { transactionHash: txHash }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new WalletConnectController(); 