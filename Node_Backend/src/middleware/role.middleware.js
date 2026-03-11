function authorizeRoles(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return next(
        new Error(
          "Forbidden: You don't have permission to access this resource",
        ),
      );
    }
    next();
  };
}


module.exports = authorizeRoles;