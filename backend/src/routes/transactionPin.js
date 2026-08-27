const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * TRANSACTION PIN
 * ================================================================
 *
 * POST  /transaction-pin/setup
 * PATCH /transaction-pin/change
 * GET   /transaction-pin/status
 *
 * The actual PIN is NEVER stored.
 *
 * users.transaction_pin_hash
 * contains only a bcrypt hash.
 *
 * ================================================================
 */

const PIN_LENGTH = 6;


/*
 * ================================================================
 * VALIDATE PIN
 * ================================================================
 */

function isValidPin(pin) {
  return (
    typeof pin === "string" &&
    /^\d{6}$/.test(pin)
  );
}


/*
 * ================================================================
 * GET PIN STATUS
 * ================================================================
 *
 * GET /transaction-pin/status
 *
 * Used by the frontend to determine whether
 * the customer has configured a transaction PIN.
 *
 * ================================================================
 */

router.get(
  "/status",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            transaction_pin_hash IS NOT NULL
              AS configured
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

      return res.json({
        success: true,
        data: {
          configured:
            result.rows[0].configured,
        },
      });
    } catch (error) {
      console.error(
        "Transaction PIN status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve transaction PIN status.",
      });
    }
  }
);


/*
 * ================================================================
 * SETUP TRANSACTION PIN
 * ================================================================
 *
 * POST /transaction-pin/setup
 *
 * Body:
 *
 * {
 *   "currentPassword": "...",
 *   "pin": "123456",
 *   "confirmPin": "123456"
 * }
 *
 * Current password is required because configuring
 * a transaction PIN is a security-sensitive action.
 *
 * ================================================================
 */

router.post(
  "/setup",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        currentPassword,
        pin,
        confirmPin,
      } = req.body;

      if (
        !currentPassword ||
        typeof currentPassword !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password is required.",
        });
      }

      if (!isValidPin(pin)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction PIN must contain exactly 6 digits.",
        });
      }

      if (pin !== confirmPin) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction PINs do not match.",
        });
      }

      const userResult =
        await pool.query(
          `
          SELECT
            id,
            password_hash,
            transaction_pin_hash
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.userId]
        );

      if (
        userResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      const user =
        userResult.rows[0];

      /*
       * Prevent setup from replacing an existing PIN.
       */

      if (
        user.transaction_pin_hash
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A transaction PIN is already configured. Use the change PIN operation instead.",
        });
      }

      /*
       * Verify login password.
       */

      const passwordMatches =
        await bcrypt.compare(
          currentPassword,
          user.password_hash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect.",
        });
      }

      /*
       * Hash PIN.
       */

      const pinHash =
        await bcrypt.hash(
          pin,
          12
        );

      await pool.query(
        `
        UPDATE users
        SET transaction_pin_hash = $1
        WHERE id = $2
        `,
        [
          pinHash,
          req.user.userId,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          "Transaction PIN configured successfully.",
        data: {
          configured: true,
        },
      });
    } catch (error) {
      console.error(
        "Transaction PIN setup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to configure transaction PIN.",
      });
    }
  }
);


/*
 * ================================================================
 * CHANGE TRANSACTION PIN
 * ================================================================
 *
 * PATCH /transaction-pin/change
 *
 * Body:
 *
 * {
 *   "currentPassword": "...",
 *   "currentPin": "123456",
 *   "newPin": "654321",
 *   "confirmPin": "654321"
 * }
 *
 * Two credentials are required:
 *
 * 1. Current login password
 * 2. Current transaction PIN
 *
 * ================================================================
 */

router.patch(
  "/change",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        currentPassword,
        currentPin,
        newPin,
        confirmPin,
      } = req.body;

      if (
        !currentPassword ||
        typeof currentPassword !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password is required.",
        });
      }

      if (!isValidPin(currentPin)) {
        return res.status(400).json({
          success: false,
          message:
            "Current transaction PIN must contain exactly 6 digits.",
        });
      }

      if (!isValidPin(newPin)) {
        return res.status(400).json({
          success: false,
          message:
            "New transaction PIN must contain exactly 6 digits.",
        });
      }

      if (newPin !== confirmPin) {
        return res.status(400).json({
          success: false,
          message:
            "New transaction PINs do not match.",
        });
      }

      if (currentPin === newPin) {
        return res.status(400).json({
          success: false,
          message:
            "New transaction PIN must be different from the current PIN.",
        });
      }

      const userResult =
        await pool.query(
          `
          SELECT
            id,
            password_hash,
            transaction_pin_hash
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.userId]
        );

      if (
        userResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      const user =
        userResult.rows[0];

      if (
        !user.transaction_pin_hash
      ) {
        return res.status(409).json({
          success: false,
          message:
            "No transaction PIN has been configured yet.",
        });
      }

      /*
       * Verify login password.
       */

      const passwordMatches =
        await bcrypt.compare(
          currentPassword,
          user.password_hash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect.",
        });
      }

      /*
       * Verify existing transaction PIN.
       */

      const currentPinMatches =
        await bcrypt.compare(
          currentPin,
          user.transaction_pin_hash
        );

      if (!currentPinMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Current transaction PIN is incorrect.",
        });
      }

      /*
       * Generate new hash.
       */

      const newPinHash =
        await bcrypt.hash(
          newPin,
          12
        );

      await pool.query(
        `
        UPDATE users
        SET transaction_pin_hash = $1
        WHERE id = $2
        `,
        [
          newPinHash,
          req.user.userId,
        ]
      );

      return res.json({
        success: true,
        message:
          "Transaction PIN changed successfully.",
        data: {
          configured: true,
        },
      });
    } catch (error) {
      console.error(
        "Transaction PIN change error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to change transaction PIN.",
      });
    }
  }
);


module.exports = router;
