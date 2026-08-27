function adminMiddleware(
  req,
  res,
  next
) {
  if (
    !req.user ||
    req.user.role !== "ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Administrator access required.",
    });
  }

  next();
}

module.exports =
  adminMiddleware;