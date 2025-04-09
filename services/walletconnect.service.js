const SignClient = require('@walletconnect/sign-client').default;
const { getSdkError } = require('@walletconnect/utils');
const { ethers } = require('ethers');

class WalletConnectService {
    constructor() {
        this.signClient = null;
        this.session = null;
        this.pendingProposal = null;
    }

    async initialize() {
        if (!process.env.WALLET_CONNECT_PROJECT_ID) {
            throw new Error('WALLET_CONNECT_PROJECT_ID environment variable is required');
        }

        if (!this.signClient) {
            this.signClient = await SignClient.init({
                projectId: process.env.WALLET_CONNECT_PROJECT_ID,
                metadata: {
                    name: 'Web3 Wallet Backend',
                    description: 'Web3 Wallet Backend Service',
                    url: process.env.APP_URL || 'http://localhost:3002',
                    icons: ['https://walletconnect.com/walletconnect-logo.png']
                }
            });

            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        if (!this.signClient) return;

        this.signClient.on('session_event', ({ event, session }) => {
            console.log('session_event:', event);
        });

        this.signClient.on('session_update', ({ topic, params }) => {
            console.log('session_update:', topic, params);
        });

        this.signClient.on('session_delete', () => {
            console.log('session_delete');
            this.session = null;
        });
    }

    async createConnection() {
        try {
            if (!this.signClient) {
                await this.initialize();
            }

            const { uri, approval } = await this.signClient.connect({
                requiredNamespaces: {
                    eip155: {
                        methods: [
                            'eth_sendTransaction',
                            'eth_signTransaction',
                            'eth_sign',
                            'personal_sign',
                            'eth_signTypedData'
                        ],
                        chains: ['eip155:1'], // Ethereum Mainnet
                        events: ['chainChanged', 'accountsChanged']
                    }
                }
            });

            this.pendingProposal = approval;
            return uri;

        } catch (error) {
            console.error('WalletConnect connection error:', error);
            throw error;
        }
    }

    async handleConnectionApproval() {
        if (!this.pendingProposal) {
            throw new Error('No pending connection request');
        }

        try {
            const session = await this.pendingProposal();
            this.session = session;
            this.pendingProposal = null;
            return session;
        } catch (error) {
            console.error('Connection approval error:', error);
            this.pendingProposal = null;
            throw error;
        }
    }

    async disconnect() {
        if (this.session) {
            await this.signClient.disconnect({
                topic: this.session.topic,
                reason: getSdkError('USER_DISCONNECTED')
            });
            this.session = null;
        }
    }

    async signMessage(message) {
        if (!this.session) {
            throw new Error('No active session found');
        }

        const account = this.session.namespaces.eip155.accounts[0];
        const [namespace, reference, address] = account.split(':');

        const result = await this.signClient.request({
            topic: this.session.topic,
            chainId: `${namespace}:${reference}`,
            request: {
                method: 'personal_sign',
                params: [
                    ethers.hexlify(ethers.toUtf8Bytes(message)),
                    address
                ]
            }
        });

        return result;
    }

    async sendTransaction(transaction) {
        if (!this.session) {
            throw new Error('No active session found');
        }

        const account = this.session.namespaces.eip155.accounts[0];
        const [namespace, reference, address] = account.split(':');

        const result = await this.signClient.request({
            topic: this.session.topic,
            chainId: `${namespace}:${reference}`,
            request: {
                method: 'eth_sendTransaction',
                params: [{
                    from: address,
                    to: transaction.to,
                    value: ethers.hexlify(transaction.value),
                    data: transaction.data || '0x'
                }]
            }
        });

        return result;
    }

    getConnectionStatus() {
        return {
            connected: !!this.session,
            accounts: this.session ? this.session.namespaces.eip155.accounts : [],
            chainId: this.session ? this.session.namespaces.eip155.chains[0] : null
        };
    }
}

module.exports = new WalletConnectService(); 