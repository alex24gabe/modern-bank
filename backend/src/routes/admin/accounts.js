const express = require("express");

const pool = require("../../config/db");

const router = express.Router();

/*
 * ================================================================
 * GET ADMIN ACCOUNTS
 * ================================================================
 *
 * GET /admin/accounts
 *
 * Query parameters:
 *
 * search
 * status
 * accountType
 * page
 * limit
 *
 * ================================================================
 */

router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      accountType = "",
    } = req.query;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const offset =
      (page - 1) * limit;

    const values = [];
    const conditions = [];

    /*
     * ------------------------------------------------------------
     * SEARCH
     * ------------------------------------------------------------
     */

    if (search.trim()) {
      values.push(
        `%${search.trim()}%`
      );

      conditions.push(`
        (
          a.account_number ILIKE $${values.length}
          OR u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
        )
      `);
    }

    /*
     * ------------------------------------------------------------
     * STATUS
     * ------------------------------------------------------------
     */

    if (status.trim()) {
      values.push(
        status.trim()
      );

      conditions.push(`
        LOWER(a.status) = LOWER($${values.length})
      `);
    }

    /*
     * ------------------------------------------------------------
     * ACCOUNT TYPE
     * ------------------------------------------------------------
     */

    if (accountType.trim()) {
      values.push(
        accountType.trim().toUpperCase()
      );

      conditions.push(`
        a.account_type = $${values.length}
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    /*
     * ------------------------------------------------------------
     * TOTAL COUNT
     * ------------------------------------------------------------
     */

    const countResult =
      await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM accounts a

        INNER JOIN users u
          ON u.id = a.user_id

        ${whereClause}
        `,
        values
      );

    const total =
      countResult.rows[0].total;

    /*
     * ------------------------------------------------------------
     * ACCOUNTS
     * ------------------------------------------------------------
     */

    const accountValues = [
      ...values,
      limit,
      offset,
    ];

    const result =
      await pool.query(
        `
        SELECT
          a.id,
          a.user_id,
          a.account_number,
          a.account_type,
          a.balance,
          a.currency,
          a.status,
          a.created_at,

          u.full_name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone,

          (
            SELECT COUNT(*)::int
            FROM transactions t
            WHERE
              t.sender_account_id = a.id
              OR t.receiver_account_id = a.id
          ) AS transaction_count,

          (
            SELECT COUNT(*)::int
            FROM deposits d
            WHERE d.account_id = a.id
          ) AS deposit_count

        FROM accounts a

        INNER JOIN users u
          ON u.id = a.user_id

        ${whereClause}

        ORDER BY
          a.created_at DESC

        LIMIT $${accountValues.length - 1}
        OFFSET $${accountValues.length}

        `,
        accountValues
      );

    return res.json({
      success: true,

      message:
        "Accounts retrieved successfully.",

      data: {
        accounts:
          result.rows,

        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(
              total / limit
            ),
        },

        filters: {
          search:
            search.trim() || null,

          status:
            status.trim() || null,

          accountType:
            accountType.trim()
              ? accountType
                  .trim()
                  .toUpperCase()
              : null,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin accounts error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve accounts.",
    });
  }
});


/*
 * ================================================================
 * GET ADMIN ACCOUNT DETAIL
 * ================================================================
 *
 * GET /admin/accounts/:accountId
 *
 * ================================================================
 */

router.get(
  "/:accountId",
  async (req, res) => {
    try {
      const {
        accountId,
      } = req.params;

      /*
       * ------------------------------------------------------------
       * ACCOUNT + OWNER
       * ------------------------------------------------------------
       */

      const accountResult =
        await pool.query(
          `
          SELECT
            a.id,
            a.user_id,
            a.account_number,
            a.account_type,
            a.balance,
            a.currency,
            a.status,
            a.created_at,

            u.full_name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            u.address AS customer_address,
            u.created_at AS customer_created_at

          FROM accounts a

          INNER JOIN users u
            ON u.id = a.user_id

          WHERE a.id = $1

          LIMIT 1
          `,
          [accountId]
        );

      if (
        accountResult.rows.length ===
        0
      ) {
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
       * TRANSACTION SUMMARY
       * ------------------------------------------------------------
       */

      const transactionSummaryResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int
              AS transaction_count,

            COUNT(*) FILTER (
              WHERE t.status = 'SUCCESS'
            )::int
              AS successful_transactions,

            COALESCE(
              SUM(t.amount) FILTER (
                WHERE
                  t.status = 'SUCCESS'
                  AND (
                    t.sender_account_id = $1
                    OR t.receiver_account_id = $1
                  )
              ),
              0
            ) AS transaction_volume

          FROM transactions t

          WHERE
            t.sender_account_id = $1
            OR t.receiver_account_id = $1
          `,
          [accountId]
        );

     /*
 * ------------------------------------------------------------
 * DEPOSIT SUMMARY
 * ------------------------------------------------------------
 */

const depositSummaryResult =
  await pool.query(
    `
    SELECT
      COUNT(*)::int
        AS deposit_count,

      COALESCE(
        SUM(amount),
        0
      ) AS deposit_volume

    FROM deposits

    WHERE account_id = $1
    `,
    [accountId]
  );

      /*
       * ------------------------------------------------------------
       * RECENT TRANSACTIONS
       * ------------------------------------------------------------
       */

      const transactionsResult =
        await pool.query(
          `
          SELECT
            t.id,
            t.amount,
            t.transaction_type,
            t.description,
            t.reference,
            t.status,
            t.created_at,

            CASE
              WHEN t.sender_account_id = $1
                THEN 'DEBIT'

              WHEN t.receiver_account_id = $1
                THEN 'CREDIT'

              ELSE 'UNKNOWN'
            END AS direction,

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

          WHERE
            t.sender_account_id = $1
            OR t.receiver_account_id = $1

          ORDER BY
            t.created_at DESC

          LIMIT 20
          `,
          [accountId]
        );

      /*
       * ------------------------------------------------------------
       * RESPONSE
       * ------------------------------------------------------------
       */

      return res.json({
        success: true,

        message:
          "Account retrieved successfully.",

        data: {
          account,

          transactionSummary:
            transactionSummaryResult
              .rows[0],

          depositSummary:
            depositSummaryResult
              .rows[0],

          recentTransactions:
            transactionsResult.rows,
        },
      });
    } catch (error) {
      console.error(
        "Admin account detail error:",
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


/*
 * ================================================================
 * UPDATE ACCOUNT STATUS
 * ================================================================
 *
 * PATCH /admin/accounts/:accountId/status
 *
 * Body:
 *
 * {
 *   "status": "Active"
 * }
 *
 * Allowed:
 *
 * Active
 * Suspended
 * Closed
 *
 * ================================================================
 */

router.patch(
  "/:accountId/status",
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        accountId,
      } = req.params;

      const requestedStatus =
        String(
          req.body?.status || ""
        )
          .trim()
          .toLowerCase();

      const statusMap = {
        active: "Active",
        suspended: "Suspended",
        closed: "Closed",
      };

      const status =
        statusMap[
          requestedStatus
        ];

      if (!status) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid account status. Allowed values are Active, Suspended and Closed.",
        });
      }

      await client.query(
        "BEGIN"
      );

      const existingResult =
        await client.query(
          `
          SELECT
            id,
            account_number,
            account_type,
            status

          FROM accounts

          WHERE id = $1

          FOR UPDATE
          `,
          [accountId]
        );

      if (
        existingResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Account not found.",
        });
      }

      const updatedResult =
        await client.query(
          `
          UPDATE accounts

          SET status = $1

          WHERE id = $2

          RETURNING
            id,
            user_id,
            account_number,
            account_type,
            balance,
            currency,
            status,
            created_at
          `,
          [
            status,
            accountId,
          ]
        );

      await client.query(
        "COMMIT"
      );

      return res.json({
        success: true,

        message:
          "Account status updated successfully.",

        data: {
          account:
            updatedResult.rows[0],
        },
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}

      console.error(
        "Admin account status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update account status.",
      });
    } finally {
      client.release();
    }
  }
);


module.exports = router;
