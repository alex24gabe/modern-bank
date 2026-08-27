const jwt = require("jsonwebtoken");

function authMiddleware(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const parts =
      authorization.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization header.",
      });
    }

    const token =
      parts[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      !decoded.userId ||
      !decoded.email
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }

    req.user = {
      userId:
        decoded.userId,

      email:
        decoded.email,

      role:
        decoded.role ||
        "CUSTOMER",
    };

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token.",
    });
  }
}

module.exports =
  authMiddleware;