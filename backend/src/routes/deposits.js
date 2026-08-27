const express = require("express");
const crypto = require("crypto");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * GET USER ACCOUNTS
 * ================================================================
 *
 * GET /deposits/accounts
 *
 * Returns the authenticated user's active accounts
 * that can receive deposits.
 *
 */

router.get(
  "/accounts",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
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
        AND status = 'Active'
        ORDER BY created_at ASC
        `,
        [req.user.userId]
      );

      return res.json({
        success: true,
        message: "Accounts retrieved successfully.",
        data: {
          accounts: result.rows,
        },
      });
    } catch (error) {
      console.error(
        "Fetch deposit accounts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve accounts.",
      });
    }
  }
);


/*
 * ================================================================
 * DEPOSIT
 * ================================================================
 *
 * POST /deposits
 *
 * Body:
 *
 * {
 *   "accountId": "uuid",
 *   "amount": 30000,
 *   "description": "Initial deposit"
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
        accountId,
        amount,
        description = "",
      } = req.body;

      /*
       * ------------------------------------------------------------
       * VALIDATION
       * ------------------------------------------------------------
       */

      if (!accountId) {
        return res.status(400).json({
          success: false,
          message: "Account ID is required.",
        });
      }

      const depositAmount =
        Number(amount);

      if (
        !Number.isFinite(depositAmount) ||
        depositAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deposit amount must be greater than zero.",
        });
      }

      /*
       * Only allow two decimal places.
       */

      if (
        !Number.isInteger(
          depositAmount * 100
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deposit amount can have a maximum of two decimal places.",
        });
      }

      /*
       * ------------------------------------------------------------
       * START DATABASE TRANSACTION
       * ------------------------------------------------------------
       */

      await client.query("BEGIN");

      /*
       * ------------------------------------------------------------
       * FIND ACCOUNT
       * ------------------------------------------------------------
       *
       * The account must belong to the authenticated user.
       *
       */

      const accountResult =
        await client.query(
          `
          SELECT
            id,
            user_id,
            account_number,
            account_type,
            balance,
            currency,
            status
          FROM accounts
          WHERE id = $1
          AND user_id = $2
          FOR UPDATE
          `,
          [
            accountId,
            req.user.userId,
          ]
        );

      if (
        accountResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Account not found.",
        });
      }

      const account =
        accountResult.rows[0];

      /*
       * ------------------------------------------------------------
       * CHECK ACCOUNT STATUS
       * ------------------------------------------------------------
       */

      if (
        account.status !== "Active"
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "This account is not active.",
        });
      }

      /*
       * ------------------------------------------------------------
       * INCREASE ACCOUNT BALANCE
       * ------------------------------------------------------------
       */

      const balanceResult =
        await client.query(
          `
          UPDATE accounts
          SET balance = balance + $1
          WHERE id = $2
          RETURNING
            id,
            account_number,
            account_type,
            balance,
            currency,
            status
          `,
          [
            depositAmount,
            account.id,
          ]
        );

      const updatedAccount =
        balanceResult.rows[0];

      /*
       * ------------------------------------------------------------
       * GENERATE TRANSACTION REFERENCE
       * ------------------------------------------------------------
       *
       * PostgreSQL requires transactions.reference to be NOT NULL.
       *
       * Example:
       *
       * DEP-550e8400-e29b-41d4-a716-446655440000
       *
       */

      const reference =
        `DEP-${crypto.randomUUID()}`;

      /*
       * ------------------------------------------------------------
       * RECORD DEPOSIT TRANSACTION
       * ------------------------------------------------------------
       *
       * A deposit has no sender account.
       *
       * The selected account is the receiver.
       *
       */

      const transactionResult =
        await client.query(
          `
          INSERT INTO transactions (
            reference,
            sender_account_id,
            receiver_account_id,
            amount,
            transaction_type,
            description,
            status
          )
          VALUES (
            $1,
            NULL,
            $2,
            $3,
            'DEPOSIT',
            $4,
            'SUCCESS'
          )
          RETURNING
            id,
            reference,
            sender_account_id,
            receiver_account_id,
            amount,
            transaction_type,
            description,
            status,
            created_at
          `,
          [
            reference,
            account.id,
            depositAmount,
            description.trim() ||
              "Deposit",
          ]
        );

      const transaction =
        transactionResult.rows[0];

      /*
       * ------------------------------------------------------------
       * COMMIT
       * ------------------------------------------------------------
       */

      await client.query("COMMIT");

      /*
       * ------------------------------------------------------------
       * RESPONSE
       * ------------------------------------------------------------
       */

      return res.status(201).json({
        success: true,
        message:
          "Deposit successful.",
        data: {
          account: updatedAccount,
          transaction,
        },
      });
    } catch (error) {
      /*
       * ------------------------------------------------------------
       * ROLLBACK
       * ------------------------------------------------------------
       *
       * This is extremely important.
       *
       * If the transaction INSERT fails after the balance was
       * increased, the balance update is rolled back too.
       *
       */

      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }

      console.error(
        "Deposit error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process deposit.",
      });
    } finally {
      client.release();
    }
  }
);


module.exports = router;