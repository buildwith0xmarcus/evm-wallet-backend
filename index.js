const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const expressWs = require('express-ws');
const { Server } = require('socket.io');
const http = require('http');
const { ethersRoutes } = require('./routes/ethers.routes');
const { errorHandler } = require('./middleware/error-handler');
const { bigIntMiddleware } = require('./middleware/bigint-json');
const { globalLimiter } = require('./middleware/rate-limiter');
const { initializeWebSocketServer } = require('./utils/websocket');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Create HTTP server (required for WebSocket)
const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json()); // JSON body parsing
app.use(bigIntMiddleware); // BigInt serialization

// Global rate limiter for DDoS protection
app.use(globalLimiter);

// API routes
app.use('/api/v1', ethersRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Web3 Wallet API - Version 1.0.0' });
});

// Queue statistics endpoint
app.get('/api/v1/queue/stats', (req, res) => {
  const { getQueueStats } = require('./utils/queue');
  res.json({
    success: true,
    data: getQueueStats()
  });
});

// Error handler
app.use(errorHandler);

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

module.exports = app; 