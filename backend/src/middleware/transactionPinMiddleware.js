const bcrypt = require("bcrypt");

const pool = require("../config/db");

/*
 * ================================================================
 * TRANSACTION PIN AUTHORIZATION
 * ================================================================
 *
 * This middleware is intended for authenticated money-moving
 * operations.
 *
 * Expected request body:
 *
 * {
 *   transactionPin: "123456"
 * }
 *
 * The PIN is compared against the bcrypt hash stored in:
 *
 * users.transaction_pin_hash
 *
 * The plaintext PIN is never stored.
 *
 * ================================================================
 */

async function transactionPinMiddleware(
  req,
  res,
  next
) {
  try {
    const {
      transactionPin,
    } = req.body;

    /*
     * ------------------------------------------------------------
     * PIN FORMAT
     * ------------------------------------------------------------
     */

    if (
      typeof transactionPin !==
        "string" ||
      !/^\d{6}$/.test(
        transactionPin
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid 6-digit transaction PIN is required.",
      });
    }

    /*
     * ------------------------------------------------------------
     * LOAD USER PIN HASH
     * ------------------------------------------------------------
     */

    const result =
      await pool.query(
        `
        SELECT
          transaction_pin_hash
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [req.user.userId]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    const pinHash =
      result.rows[0]
        .transaction_pin_hash;

    /*
     * ------------------------------------------------------------
     * PIN NOT CONFIGURED
     * ------------------------------------------------------------
     */

    if (!pinHash) {
      return res.status(403).json({
        success: false,
        code:
          "TRANSACTION_PIN_NOT_SET",
        message:
          "You must configure a transaction PIN before making transfers.",
      });
    }

    /*
     * ------------------------------------------------------------
     * VERIFY PIN
     * ------------------------------------------------------------
     */

    const matches =
      await bcrypt.compare(
        transactionPin,
        pinHash
      );

    if (!matches) {
      return res.status(401).json({
        success: false,
        code:
          "INVALID_TRANSACTION_PIN",
        message:
          "The transaction PIN is incorrect.",
      });
    }

    /*
     * Do not pass the plaintext PIN further through the
     * application.
     */

    delete req.body.transactionPin;

    req.transactionAuthorized =
      true;

    next();
  } catch (error) {
    console.error(
      "Transaction PIN authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to authorize transaction.",
    });
  }
}

module.exports =
  transactionPinMiddleware;
