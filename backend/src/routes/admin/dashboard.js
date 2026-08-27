const express = require("express");

const pool = require("../../config/db");

const router = express.Router();


/*
 * ================================================================
 * ADMIN DASHBOARD
 * ================================================================
 *
 * GET /admin/dashboard
 *
 * Returns operational statistics from the existing NovaBank
 * database.
 * ================================================================
 */

router.get(
  "/",
  async (req, res) => {
    try {

      /*
       * ------------------------------------------------------------
       * CUSTOMER STATISTICS
       * ------------------------------------------------------------
       */

      const customerResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_customers,

            COUNT(*) FILTER (
              WHERE role = 'CUSTOMER'
            )::int AS customer_accounts,

            COUNT(*) FILTER (
              WHERE role = 'ADMIN'
            )::int AS administrators

          FROM users
        `);


      /*
       * ------------------------------------------------------------
       * ACCOUNT STATISTICS
       * ------------------------------------------------------------
       */

      const accountResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_accounts,

            COUNT(*) FILTER (
              WHERE LOWER(status) = 'active'
            )::int AS active_accounts,

            COALESCE(
              SUM(balance),
              0
            ) AS total_balance

          FROM accounts
        `);


      /*
       * ------------------------------------------------------------
       * TRANSACTION STATISTICS
       * ------------------------------------------------------------
       */

      const transactionResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_transactions,

            COUNT(*) FILTER (
              WHERE status = 'SUCCESS'
            )::int AS successful_transactions,

            COUNT(*) FILTER (
              WHERE status <> 'SUCCESS'
            )::int AS unsuccessful_transactions,

            COUNT(*) FILTER (
              WHERE created_at >= CURRENT_DATE
            )::int AS transactions_today,

            COALESCE(
              SUM(amount) FILTER (
                WHERE status = 'SUCCESS'
              ),
              0
            ) AS successful_transaction_volume

          FROM transactions
        `);


      /*
       * ------------------------------------------------------------
       * EXTERNAL TRANSACTION STATISTICS
       * ------------------------------------------------------------
       */

      const externalResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_external_transactions,

            COUNT(*) FILTER (
              WHERE status = 'SUCCESS'
            )::int AS successful_external_transactions,

            COUNT(*) FILTER (
              WHERE transaction_type = 'DOMESTIC_TRANSFER'
            )::int AS domestic_transfers,

            COUNT(*) FILTER (
              WHERE transaction_type = 'INTERNATIONAL_TRANSFER'
            )::int AS international_transfers,

            COALESCE(
              SUM(amount) FILTER (
                WHERE status = 'SUCCESS'
              ),
              0
            ) AS external_transaction_volume

          FROM external_transactions
        `);


      /*
       * ------------------------------------------------------------
       * NOTIFICATION STATISTICS
       * ------------------------------------------------------------
       */

      const notificationResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_notifications,

            COUNT(*) FILTER (
              WHERE is_read = false
            )::int AS unread_notifications

          FROM notifications
        `);


      /*
       * ------------------------------------------------------------
       * RECENT TRANSACTIONS
       * ------------------------------------------------------------
       */

      const recentTransactionsResult =
        await pool.query(`
          SELECT
            t.id,
            t.amount,
            t.transaction_type,
            t.reference,
            t.status,
            t.created_at,

            sender.account_number
              AS sender_account_number,

            receiver.account_number
              AS receiver_account_number

          FROM transactions t

          LEFT JOIN accounts sender
            ON sender.id =
              t.sender_account_id

          LEFT JOIN accounts receiver
            ON receiver.id =
              t.receiver_account_id

          ORDER BY
            t.created_at DESC

          LIMIT 10
        `);


      /*
       * ------------------------------------------------------------
       * RESPONSE
       * ------------------------------------------------------------
       */

      return res.json({
        success: true,

        message:
          "Admin dashboard retrieved successfully.",

        data: {

          customers:
            customerResult.rows[0],

          accounts:
            accountResult.rows[0],

          transactions:
            transactionResult.rows[0],

          externalTransfers:
            externalResult.rows[0],

          notifications:
            notificationResult.rows[0],

          recentTransactions:
            recentTransactionsResult.rows,
        },
      });

    } catch (error) {

      console.error(
        "Admin dashboard error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve admin dashboard.",
      });
    }
  }
);


module.exports = router;
