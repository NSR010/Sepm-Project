const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/['"]/g, '')
      });
    }

    next();
  };
};

module.exports = validate;