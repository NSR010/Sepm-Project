const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  name: Joi.string()
    .min(2)
    .max(50)
    .optional(),

  username: Joi.string()
    .min(2)
    .max(50)
    .optional(),

  password: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),

  preferences: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'Preferences must be an array of categories'
    })
}).or('name', 'username');

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

const contentUploadSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Content title cannot be empty',
      'any.required': 'Title is required'
    }),

  type: Joi.string()
    .valid('art', 'photography', 'writing', 'performance')
    .required()
    .messages({
      'any.only': 'Type must be one of: art, photography, writing, performance',
      'any.required': 'Content type is required'
    }),

  metadata: Joi.alternatives().try(Joi.string(), Joi.object())
    .optional()
    .allow('', null),

  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),

  boardId: Joi.number()
    .integer()
    .optional()
    .allow(null)
});

module.exports = {
  registerSchema,
  loginSchema,
  contentUploadSchema
};
