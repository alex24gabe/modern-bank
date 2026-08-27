const express = require("express");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * NOVABANK ACCOUNT PRODUCTS
 * ================================================================
 *
 * SAVINGS
 * - Automatically created during registration
 * - NGN
 *
 * CURRENT
 * - Opened manually by customer
 * - NGN
 *
 * DOMICILIARY
 * - Opened manually by customer
 * - USD
 *
 * The frontend NEVER decides the currency.
 * The backend decides it from the account type.
 */

const ACCOUNT_TYPES = {
  SAVINGS: {
    name: "Savings Account",
    currency: "NGN",
  },

  CURRENT: {
    name: "Current Account",
    currency: "NGN",
  },

  DOMICILIARY: {
    name: "Domiciliary Account",
    currency: "USD",
  },
};


/*
 * ================================================================
 * GENERATE UNIQUE ACCOUNT NUMBER
 * ================================================================
 */

async function generateAccountNumber(client) {
  while (true) {
    const accountNumber = String(
      Math.floor(
        1000000000 +
          Math.random() * 9000000000
      )
    );

    const result = await client.query(
      `
      SELECT id
      FROM accounts
      WHERE account_number = $1
      LIMIT 1
      `,
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return accountNumber;
    }
  }
}


/*
 * ================================================================
 * CREATE ACCOUNT
 * ================================================================
 *
 * POST /accounts
 *
 * Body:
 *
 * {
 *   "accountType": "CURRENT"
 * }
 *
 */

router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        accountType,
      } = req.body;

      /*
       * ------------------------------------------------------------
       * Validate account type
       * ------------------------------------------------------------
       */

      if (!accountType) {
        return res.status(400).json({
          success: false,
          message:
            "Account type is required.",
        });
      }

      const normalizedType =
        String(accountType)
          .trim()
          .toUpperCase();

      const accountConfig =
        ACCOUNT_TYPES[normalizedType];

      if (!accountConfig) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid account type.",
        });
      }


      /*
       * ------------------------------------------------------------
       * Start transaction
       * ------------------------------------------------------------
       */

      await client.query("BEGIN");


      /*
       * ------------------------------------------------------------
       * Verify user
       * ------------------------------------------------------------
       */

      const userResult =
        await client.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.userId]
        );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }


      /*
       * ------------------------------------------------------------
       * Prevent duplicate account types
       * ------------------------------------------------------------
       *
       * One customer can have:
       *
       * SAVINGS       → one
       * CURRENT       → one
       * DOMICILIARY   → one
       *
       */

      const existingAccount =
        await client.query(
          `
          SELECT
            id,
            account_number,
            account_type,
            balance,
            currency,
            status,
            created_at
          FROM accounts
          WHERE user_id = $1
          AND account_type = $2
          LIMIT 1
          `,
          [
            req.user.userId,
            normalizedType,
          ]
        );

      if (
        existingAccount.rows.length > 0
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            `You already have a ${accountConfig.name}.`,
          data: {
            account:
              existingAccount.rows[0],
          },
        });
      }


      /*
       * ------------------------------------------------------------
       * Generate unique account number
       * ------------------------------------------------------------
       */

      const accountNumber =
        await generateAccountNumber(
          client
        );


      /*
       * ------------------------------------------------------------
       * Create account
       * ------------------------------------------------------------
       *
       * Currency is controlled by ACCOUNT_TYPES.
       *
       * SAVINGS      → NGN
       * CURRENT      → NGN
       * DOMICILIARY  → USD
       */

      const accountResult =
        await client.query(
          `
          INSERT INTO accounts (
            user_id,
            account_number,
            account_type,
            balance,
            currency,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            0,
            $4,
            'Active'
          )
          RETURNING
            id,
            account_number,
            account_type,
            balance,
            currency,
            status,
            created_at
          `,
          [
            req.user.userId,
            accountNumber,
            normalizedType,
            accountConfig.currency,
          ]
        );

      const account =
        accountResult.rows[0];


      /*
       * ------------------------------------------------------------
       * Commit
       * ------------------------------------------------------------
       */

      await client.query("COMMIT");


      /*
       * ------------------------------------------------------------
       * Response
       * ------------------------------------------------------------
       */

      return res.status(201).json({
        success: true,
        message:
          `${accountConfig.name} created successfully.`,
        data: {
          account,
        },
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }

      console.error(
        "Create account error:",
        error
      );


      /*
       * PostgreSQL unique violation.
       */

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message:
            "You already have this type of account.",
        });
      }


      return res.status(500).json({
        success: false,
        message:
          "Unable to create account.",
      });
    } finally {
      client.release();
    }
  }
);


/*
 * ================================================================
 * GET ALL USER ACCOUNTS
 * ================================================================
 *
 * GET /accounts
 *
 */

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            id,
            account_number,
            account_type,
            balance,
            currency,
            status,
            created_at
          FROM accounts
          WHERE user_id = $1
          ORDER BY created_at ASC
          `,
          [req.user.userId]
        );

      return res.json({
        success: true,
        message:
          "Accounts retrieved successfully.",
        data: {
          accounts: result.rows,
        },
      });
    } catch (error) {
      console.error(
        "Get accounts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve accounts.",
      });
    }
  }
);


/*
 * ================================================================
 * GET AVAILABLE ACCOUNT TYPES
 * ================================================================
 *
 * GET /accounts/types
 *
 * Returns only account types that the customer
 * has not already opened.
 *
 */

router.get(
  "/types",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT account_type
          FROM accounts
          WHERE user_id = $1
          `,
          [req.user.userId]
        );

      const existingTypes =
        new Set(
          result.rows.map(
            (row) =>
              row.account_type
          )
        );

      const accountTypes =
        Object.entries(
          ACCOUNT_TYPES
        )
          .filter(
            ([type]) =>
              !existingTypes.has(type)
          )
          .map(
            ([type, config]) => ({
              type,
              name: config.name,
              currency:
                config.currency,
            })
          );

      return res.json({
        success: true,
        message:
          "Available account types retrieved successfully.",
        data: {
          accountTypes,
        },
      });
    } catch (error) {
      console.error(
        "Get account types error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve account types.",
      });
    }
  }
);


/*
 * ================================================================
 * GET ONE ACCOUNT
 * ================================================================
 *
 * GET /accounts/:accountId
 *
 * IMPORTANT:
 *
 * We check BOTH:
 *
 * account.id
 *
 * AND
 *
 * account.user_id
 *
 * Therefore a logged-in customer cannot retrieve
 * another customer's account simply by changing
 * the account ID in the URL.
 *
 */

router.get(
  "/:accountId",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        accountId,
      } = req.params;

      const result =
        await pool.query(
          `
          SELECT
            id,
            account_number,
            account_type,
            balance,
            currency,
            status,
            created_at
          FROM accounts
          WHERE id = $1
          AND user_id = $2
          LIMIT 1
          `,
          [
            accountId,
            req.user.userId,
          ]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Account not found.",
        });
      }

      return res.json({
        success: true,
        message:
          "Account retrieved successfully.",
        data: {
          account:
            result.rows[0],
        },
      });
    } catch (error) {
      console.error(
        "Get account error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve account.",
      });
    }
  }
);


module.exports = router;