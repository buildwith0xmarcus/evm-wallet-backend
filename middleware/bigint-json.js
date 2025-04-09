/**
 * Middleware that enables JSON serialization of BigInt values
 * Converts BigInt values returned by Ethers.js v6 to strings
 */
const bigIntMiddleware = (req, res, next) => {
  // Save original JSON.stringify method
  const originalSend = res.json;
  
  // Override JSON.stringify method
  res.json = function(obj) {
    return originalSend.call(this, JSON.parse(
      JSON.stringify(obj, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      )
    ));
  };
  
  next();
};

module.exports = { bigIntMiddleware }; 