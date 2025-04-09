/**
 * Simple in-memory cache implementation
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000; // Default 60 seconds
    this.maxSize = options.maxSize || 1000; // Maximum cache size
    this.hitCount = 0;
    this.missCount = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Reads a value from cache
   * @param {string} key - Read key
   * @returns {any} - Cached value or undefined
   */
  get(key) {
    const item = this.cache.get(key);
    const now = Date.now();
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }
    
    // Remove if expired
    if (item.expiry && item.expiry < now) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    // Update successful access count
    this.stats.hits++;
    
    // Update access time for LRU
    item.lastAccessed = now;
    
    return item.value;
  }

  /**
   * Writes a value to cache
   * @param {string} key - Write key
   * @param {any} value - Value to write
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl) {
    const now = Date.now();
    const expiry = ttl ? now + ttl : now + this.ttl;
    
    this.stats.sets++;
    
    // Check cache capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      expiry,
      lastAccessed: now
    });
  }

  /**
   * Deletes an item from cache matching the key
   * @param {string} key - Key to delete
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clears entire cache
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Removes least recently used item from cache (LRU)
   * @private
   */
  evictLRU() {
    let oldest = Infinity;
    let oldestKey = null;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldest) {
        oldest = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Returns cache statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses || 1)
    };
  }
}

/**
 * Module for caching RPC requests
 */
class RpcCache {
  constructor(options = {}) {
    // Different TTLs for different request types
    this.ttlConfig = {
      // Data that doesn't change instantly
      blockNumber: 3000, // 3 seconds
      getCode: 3600000, // 1 hour (contract code rarely changes)
      
      // Data that can change quickly
      getBalance: 10000, // 10 seconds
      getTransactionCount: 5000, // 5 seconds
      
      // Gas fee data
      getFeeData: 15000, // 15 seconds
      
      // Token balances
      tokenBalance: 15000, // 15 seconds
      
      // Block data (past blocks don't change)
      getBlock: 3600000, // 1 hour
      
      // Default TTL
      default: 5000 // 5 seconds
    };
    
    // Merge with user configuration
    this.ttlConfig = { ...this.ttlConfig, ...options.ttlConfig };
    
    // Create cache instance
    this.cache = new MemoryCache({
      ttl: this.ttlConfig.default,
      maxSize: options.maxSize || 1000
    });
  }

  /**
   * Creates a cache key for RPC method and parameters
   * @param {string} method - RPC method
   * @param {Array} params - RPC parameters
   * @returns {string} - Cache key
   */
  createKey(method, params) {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * Returns TTL value for given method
   * @param {string} method - RPC method
   * @returns {number} - TTL value (ms)
   */
  getTtl(method) {
    return this.ttlConfig[method] || this.ttlConfig.default;
  }

  /**
   * Reads a value from cache
   * @param {string} method - RPC method
   * @param {Array} params - RPC parameters
   * @returns {any} - Cached value or undefined
   */
  get(method, params) {
    const key = this.createKey(method, params);
    return this.cache.get(key);
  }

  /**
   * Writes a value to cache
   * @param {string} method - RPC method
   * @param {Array} params - RPC parameters
   * @param {any} value - Value to write
   */
  set(method, params, value) {
    const key = this.createKey(method, params);
    const ttl = this.getTtl(method);
    this.cache.set(key, value, ttl);
  }

  /**
   * Clears all cache for a specific RPC method
   * @param {string} method - RPC method to clear
   */
  invalidate(method) {
    const keysToDelete = [];
    
    for (const [key] of this.cache.cache.entries()) {
      if (key.startsWith(`${method}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Returns cache statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Singleton RPC cache instance
const rpcCache = new RpcCache();

module.exports = {
  MemoryCache,
  RpcCache,
  rpcCache
}; 