const AppError = require("../utils/appError");

const restrictedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const errors = AppError.create("You do not have a permission", 403);
      return next (errors)
    }
    next();
  };
};

module.exports = restrictedTo;
