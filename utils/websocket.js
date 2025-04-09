const socketIo = require('socket.io');
const { ethers } = require('ethers');
const { getProvider } = require('./network');
const { getEthBalance } = require('./ethereum');
const { enqueueNetworkRequest } = require('./queue');

// Objects to manage WebSocket connections and subscriptions
let io;
let activeSubscriptions = {
  balances: {}, // address -> client IDs mapping
  pendingTxs: {}, // tx hash -> client IDs mapping
  blocks: {}, // network -> client IDs mapping
  gasPrice: {} // network -> client IDs mapping
};

// Connection limits
const connectionLimits = {
  maxConnectionsPerIP: 10,
  connections: {}, // IP -> connection count mapping
};

// Initialize WebSocket server
const initializeWebSocketServer = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Check connection limits
  io.use((socket, next) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                     socket.handshake.address;
                     
    // Increment IP connection count
    connectionLimits.connections[clientIP] = 
      (connectionLimits.connections[clientIP] || 0) + 1;
    
    // Check limit
    if (connectionLimits.connections[clientIP] > connectionLimits.maxConnectionsPerIP) {
      console.warn(`Maximum connection limit reached for IP ${clientIP} (${connectionLimits.maxConnectionsPerIP})`);
      return next(new Error('Too many connections'));
    }
    
    // Add IP counter reduction on disconnect event
    socket.on('disconnect', () => {
      if (connectionLimits.connections[clientIP]) {
        connectionLimits.connections[clientIP]--;
        if (connectionLimits.connections[clientIP] <= 0) {
          delete connectionLimits.connections[clientIP];
        }
      }
    });
    
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Session information
    let clientSubscriptions = {
      balances: new Set(),
      pendingTxs: new Set(),
      blocks: new Set(),
      gasPrice: new Set()
    };

    // Simple rate limiter for request throttling
    const requestLimiter = {
      timeWindow: 60 * 1000, // 1 minute
      maxRequests: 60,       // 60 requests per minute
      requests: {},          // socket id -> request timestamps mapping
    };

    // Check if a request exceeds rate limit
    const isRateLimited = (eventType) => {
      const now = Date.now();
      const key = `${socket.id}:${eventType}`;
      
      if (!requestLimiter.requests[key]) {
        requestLimiter.requests[key] = [];
      }
      
      // Clean up old requests from time window
      requestLimiter.requests[key] = requestLimiter.requests[key].filter(
        timestamp => (now - timestamp) < requestLimiter.timeWindow
      );
      
      // Check rate limit
      if (requestLimiter.requests[key].length >= requestLimiter.maxRequests) {
        console.warn(`Rate limit exceeded for client ${socket.id} for ${eventType} event`);
        return true;
      }
      
      // Add this request
      requestLimiter.requests[key].push(now);
      return false;
    };

    // Balance tracking subscription
    socket.on('subscribe:balance', async ({ address, network, networkType }) => {
      // Rate limit check
      if (isRateLimited('subscribe:balance')) {
        socket.emit('error', { 
          message: 'Rate limit exceeded, please try again later.' 
        });
        return;
      }
      
      try {
        // Register address subscription
        if (!activeSubscriptions.balances[address]) {
          activeSubscriptions.balances[address] = new Set();
        }
        activeSubscriptions.balances[address].add(socket.id);
        clientSubscriptions.balances.add(address);
        
        // Queue and send initial balance information
        enqueueNetworkRequest(network, networkType, async () => {
          const balance = await getEthBalance(address, network, networkType);
          return balance;
        })
        .then(balance => {
          socket.emit('balance:update', {
            address,
            balance: balance.toString(),
            network,
            networkType,
            timestamp: Date.now()
          });
        })
        .catch(error => {
          console.error('Balance query error:', error);
          socket.emit('error', { 
            message: 'An error occurred while querying balance',
            error: error.message 
          });
        });
        
        console.log(`Client ${socket.id} started balance subscription: ${address}`);
      } catch (error) {
        console.error('Balance subscription error:', error);
        socket.emit('error', { message: 'Balance subscription error', error: error.message });
      }
    });

    // Transaction status tracking subscription
    socket.on('subscribe:transaction', async ({ txHash, network, networkType }) => {
      // Rate limit check
      if (isRateLimited('subscribe:transaction')) {
        socket.emit('error', { 
          message: 'Rate limit exceeded, please try again later.' 
        });
        return;
      }
      
      try {
        if (!activeSubscriptions.pendingTxs[txHash]) {
          activeSubscriptions.pendingTxs[txHash] = new Set();
          
          // Queue and check transaction status
          enqueueNetworkRequest(network, networkType, async () => {
            const provider = getProvider(network, networkType);
            return await provider.getTransaction(txHash);
          })
          .then(tx => {
            if (tx) {
              // Send initial transaction information
              const txStatus = tx.confirmations > 0 ? 'confirmed' : 'pending';
              io.to(Array.from(activeSubscriptions.pendingTxs[txHash])).emit('transaction:update', {
                txHash,
                status: txStatus,
                confirmations: tx.confirmations,
                timestamp: Date.now()
              });
              
              // Watch transaction
              const provider = getProvider(network, networkType);
              provider.once(txHash, (receipt) => {
                const clients = Array.from(activeSubscriptions.pendingTxs[txHash] || []);
                io.to(clients).emit('transaction:update', {
                  txHash,
                  status: receipt.status ? 'success' : 'failed',
                  confirmations: 1,
                  receipt: {
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
                    status: receipt.status
                  },
                  timestamp: Date.now()
                });
                
                // Gas usage analysis
                const gasUsed = receipt.gasUsed.toString();
                const effectiveGasPrice = receipt.effectiveGasPrice.toString();
                const totalCost = ethers.formatEther(receipt.gasUsed * receipt.effectiveGasPrice);
                
                io.to(clients).emit('transaction:gasAnalysis', {
                  txHash,
                  gasUsed,
                  effectiveGasPrice,
                  totalCost,
                  timestamp: Date.now()
                });
              });
            }
          })
          .catch(error => {
            console.error('Transaction query error:', error);
          });
        }
        
        activeSubscriptions.pendingTxs[txHash].add(socket.id);
        clientSubscriptions.pendingTxs.add(txHash);
        
        console.log(`Client ${socket.id} started transaction subscription: ${txHash}`);
      } catch (error) {
        console.error('Transaction subscription error:', error);
        socket.emit('error', { message: 'Transaction subscription error', error: error.message });
      }
    });

    // Block tracking subscription
    socket.on('subscribe:blocks', async ({ network, networkType }) => {
      // Rate limit check
      if (isRateLimited('subscribe:blocks')) {
        socket.emit('error', { 
          message: 'Rate limit exceeded, please try again later.' 
        });
        return;
      }
      
      try {
        const networkKey = `${network}:${networkType}`;
        
        if (!activeSubscriptions.blocks[networkKey]) {
          activeSubscriptions.blocks[networkKey] = new Set();
          
          // Create provider
          const provider = getProvider(network, networkType);
          
          // Listen for new blocks
          provider.on('block', async (blockNumber) => {
            // Stop listening if no subscribers remain
            if (!activeSubscriptions.blocks[networkKey] || activeSubscriptions.blocks[networkKey].size === 0) {
              provider.removeAllListeners('block');
              return;
            }
            
            // Queue and get block information
            enqueueNetworkRequest(network, networkType, async () => {
              return await provider.getBlock(blockNumber);
            })
            .then(block => {
              if (block) {
                const clients = Array.from(activeSubscriptions.blocks[networkKey]);
                io.to(clients).emit('block:new', {
                  blockNumber,
                  timestamp: block.timestamp,
                  hash: block.hash,
                  parentHash: block.parentHash,
                  miner: block.miner,
                  transactionCount: block.transactions.length,
                  network,
                  networkType
                });
              }
            })
            .catch(error => {
              console.error('Block information retrieval error:', error);
            });
          });
        }
        
        activeSubscriptions.blocks[networkKey].add(socket.id);
        clientSubscriptions.blocks.add(networkKey);
        
        console.log(`Client ${socket.id} started block subscription: ${networkKey}`);
      } catch (error) {
        console.error('Block subscription error:', error);
        socket.emit('error', { message: 'Block subscription error', error: error.message });
      }
    });

    // Gas price tracking subscription
    socket.on('subscribe:gasPrice', async ({ network, networkType }) => {
      // Rate limit check
      if (isRateLimited('subscribe:gasPrice')) {
        socket.emit('error', { 
          message: 'Rate limit exceeded, please try again later.' 
        });
        return;
      }
      
      try {
        const networkKey = `${network}:${networkType}`;
        
        if (!activeSubscriptions.gasPrice[networkKey]) {
          activeSubscriptions.gasPrice[networkKey] = new Set();
          
          // Create interval for gas price update - every 15 seconds
          const intervalId = setInterval(() => {
            // Stop if no subscribers remain
            if (!activeSubscriptions.gasPrice[networkKey] || activeSubscriptions.gasPrice[networkKey].size === 0) {
              clearInterval(intervalId);
              return;
            }
            
            // Queue and check gas price
            enqueueNetworkRequest(network, networkType, async () => {
              const provider = getProvider(network, networkType);
              return await provider.getFeeData();
            })
            .then(feeData => {
              if (feeData) {
                const clients = Array.from(activeSubscriptions.gasPrice[networkKey]);
                io.to(clients).emit('gasPrice:update', {
                  network,
                  networkType,
                  gasPrice: feeData.gasPrice?.toString(),
                  maxFeePerGas: feeData.maxFeePerGas?.toString(),
                  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
                  timestamp: Date.now()
                });
              }
            })
            .catch(error => {
              console.error('Gas price retrieval error:', error);
            });
          }, 15000);
        }
        
        activeSubscriptions.gasPrice[networkKey].add(socket.id);
        clientSubscriptions.gasPrice.add(networkKey);
        
        // Queue and send initial gas price information
        enqueueNetworkRequest(network, networkType, async () => {
          const provider = getProvider(network, networkType);
          return await provider.getFeeData();
        })
        .then(feeData => {
          socket.emit('gasPrice:update', {
            network,
            networkType,
            gasPrice: feeData.gasPrice?.toString(),
            maxFeePerGas: feeData.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
            timestamp: Date.now()
          });
        })
        .catch(error => {
          console.error('Gas price retrieval error:', error);
          socket.emit('error', { 
            message: 'An error occurred while querying gas price',
            error: error.message 
          });
        });
        
        console.log(`Client ${socket.id} started gas price subscription: ${networkKey}`);
      } catch (error) {
        console.error('Gas price subscription error:', error);
        socket.emit('error', { message: 'Gas price subscription error', error: error.message });
      }
    });

    // Unsubscribe from all subscriptions
    socket.on('unsubscribe:balance', ({ address }) => {
      if (activeSubscriptions.balances[address]) {
        activeSubscriptions.balances[address].delete(socket.id);
        clientSubscriptions.balances.delete(address);
        console.log(`Client ${socket.id} unsubscribed from balance subscription: ${address}`);
      }
    });

    socket.on('unsubscribe:transaction', ({ txHash }) => {
      if (activeSubscriptions.pendingTxs[txHash]) {
        activeSubscriptions.pendingTxs[txHash].delete(socket.id);
        clientSubscriptions.pendingTxs.delete(txHash);
        console.log(`Client ${socket.id} unsubscribed from transaction subscription: ${txHash}`);
      }
    });

    socket.on('unsubscribe:blocks', ({ network, networkType }) => {
      const networkKey = `${network}:${networkType}`;
      if (activeSubscriptions.blocks[networkKey]) {
        activeSubscriptions.blocks[networkKey].delete(socket.id);
        clientSubscriptions.blocks.delete(networkKey);
        console.log(`Client ${socket.id} unsubscribed from block subscription: ${networkKey}`);
      }
    });

    socket.on('unsubscribe:gasPrice', ({ network, networkType }) => {
      const networkKey = `${network}:${networkType}`;
      if (activeSubscriptions.gasPrice[networkKey]) {
        activeSubscriptions.gasPrice[networkKey].delete(socket.id);
        clientSubscriptions.gasPrice.delete(networkKey);
        console.log(`Client ${socket.id} unsubscribed from gas price subscription: ${networkKey}`);
      }
    });

    // Clean up all subscriptions on disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Clean up balance subscriptions
      for (const address of clientSubscriptions.balances) {
        if (activeSubscriptions.balances[address]) {
          activeSubscriptions.balances[address].delete(socket.id);
          if (activeSubscriptions.balances[address].size === 0) {
            delete activeSubscriptions.balances[address];
          }
        }
      }
      
      // Clean up transaction subscriptions
      for (const txHash of clientSubscriptions.pendingTxs) {
        if (activeSubscriptions.pendingTxs[txHash]) {
          activeSubscriptions.pendingTxs[txHash].delete(socket.id);
          if (activeSubscriptions.pendingTxs[txHash].size === 0) {
            delete activeSubscriptions.pendingTxs[txHash];
          }
        }
      }
      
      // Clean up block subscriptions
      for (const networkKey of clientSubscriptions.blocks) {
        if (activeSubscriptions.blocks[networkKey]) {
          activeSubscriptions.blocks[networkKey].delete(socket.id);
          if (activeSubscriptions.blocks[networkKey].size === 0) {
            delete activeSubscriptions.blocks[networkKey];
          }
        }
      }
      
      // Clean up gas price subscriptions
      for (const networkKey of clientSubscriptions.gasPrice) {
        if (activeSubscriptions.gasPrice[networkKey]) {
          activeSubscriptions.gasPrice[networkKey].delete(socket.id);
          if (activeSubscriptions.gasPrice[networkKey].size === 0) {
            delete activeSubscriptions.gasPrice[networkKey];
          }
        }
      }
      
      // Clean up rate limiter information
      Object.keys(requestLimiter.requests).forEach(key => {
        if (key.startsWith(socket.id)) {
          delete requestLimiter.requests[key];
        }
      });
    });
  });

  console.log('WebSocket server started');
  return io;
};

// Send balance update to all clients subscribed to a specific address
const broadcastBalanceUpdate = async (address, network, networkType) => {
  if (activeSubscriptions.balances[address] && activeSubscriptions.balances[address].size > 0) {
    // Queue balance update
    return enqueueNetworkRequest(network, networkType, async () => {
      const balance = await getEthBalance(address, network, networkType);
      return balance;
    })
    .then(balance => {
      const clients = Array.from(activeSubscriptions.balances[address]);
      
      io.to(clients).emit('balance:update', {
        address,
        balance: balance.toString(),
        network,
        networkType,
        timestamp: Date.now()
      });
      
      return true;
    })
    .catch(error => {
      console.error('Broadcast balance update error:', error);
      return false;
    });
  }
  return false;
};

// Send transaction update to all clients subscribed to a specific transaction
const broadcastTransactionUpdate = (txHash, status, receipt) => {
  if (activeSubscriptions.pendingTxs[txHash] && activeSubscriptions.pendingTxs[txHash].size > 0) {
    try {
      const clients = Array.from(activeSubscriptions.pendingTxs[txHash]);
      
      io.to(clients).emit('transaction:update', {
        txHash,
        status,
        receipt,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Broadcast transaction update error:', error);
      return false;
    }
  }
  return false;
};

module.exports = {
  initializeWebSocketServer,
  broadcastBalanceUpdate,
  broadcastTransactionUpdate
}; 