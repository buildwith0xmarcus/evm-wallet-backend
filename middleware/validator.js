const Joi = require('joi');

/**
 * Request validation middleware
 * @param {Joi.Schema} schema - Validation schema
 */
const validator = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  next();
};

module.exports = { validator }; 