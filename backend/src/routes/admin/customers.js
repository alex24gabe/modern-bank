const express = require("express");

const pool = require("../../config/db");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN CUSTOMERS
|--------------------------------------------------------------------------
|
| This router is mounted under:
|
| /admin/customers
|
| Authentication and ADMIN authorization are applied centrally by:
|
| src/routes/admin/index.js
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| GET CUSTOMERS
|--------------------------------------------------------------------------
|
| GET /admin/customers
|
| Returns a paginated list of customers with:
|
| - profile information
| - number of accounts
| - total balance
| - account currencies
| - role
| - registration date
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    /*
     * ------------------------------------------------------------
     * PAGINATION
     * ------------------------------------------------------------
     */

    const page = Math.max(
      Number.parseInt(
        req.query.page,
        10
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 20,
        1
      ),
      100
    );

    const offset =
      (page - 1) * limit;


    /*
     * ------------------------------------------------------------
     * OPTIONAL SEARCH
     * ------------------------------------------------------------
     *
     * Search by:
     *
     * - full name
     * - email
     * - phone
     * ------------------------------------------------------------
     */

    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search.trim()
        : "";


    const searchValue =
      `%${search}%`;


    /*
     * ------------------------------------------------------------
     * CUSTOMER COUNT
     * ------------------------------------------------------------
     */

    const countResult =
      await pool.query(
        `
        SELECT
          COUNT(*)::int AS total

        FROM users

        WHERE
          role = 'CUSTOMER'

          AND (
            $1 = ''

            OR full_name ILIKE $2

            OR email ILIKE $2

            OR COALESCE(phone, '') ILIKE $2
          )
        `,
        [
          search,
          searchValue,
        ]
      );


    const total =
      countResult.rows[0].total;


    /*
     * ------------------------------------------------------------
     * CUSTOMER LIST
     * ------------------------------------------------------------
     */

    const result =
      await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.address,
          u.role,
          u.created_at,

          COUNT(a.id)::int
            AS account_count,

          COALESCE(
            SUM(a.balance),
            0
          ) AS total_balance,

          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', a.id,
                'account_number',
                  a.account_number,
                'account_type',
                  a.account_type,
                'balance',
                  a.balance,
                'currency',
                  a.currency,
                'status',
                  a.status
              )
              ORDER BY a.created_at ASC
            )
            FILTER (
              WHERE a.id IS NOT NULL
            ),
            '[]'::json
          ) AS accounts

        FROM users u

        LEFT JOIN accounts a
          ON a.user_id = u.id

        WHERE
          u.role = 'CUSTOMER'

          AND (
            $1 = ''

            OR u.full_name ILIKE $2

            OR u.email ILIKE $2

            OR COALESCE(
              u.phone,
              ''
            ) ILIKE $2
          )

        GROUP BY
          u.id

        ORDER BY
          u.created_at DESC

        LIMIT $3
        OFFSET $4
        `,
        [
          search,
          searchValue,
          limit,
          offset,
        ]
      );


    /*
     * ------------------------------------------------------------
     * RESPONSE
     * ------------------------------------------------------------
     */

    return res.json({
      success: true,

      message:
        "Customers retrieved successfully.",

      data: {
        customers:
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
            search || null,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin customers list error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to retrieve customers.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| GET SINGLE CUSTOMER
|--------------------------------------------------------------------------
|
| GET /admin/customers/:id
|
| Returns:
|
| - customer profile
| - all banking accounts
| - account balances
|
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  try {
    const customerId =
      String(
        req.params.id || ""
      ).trim();


    if (!customerId) {
      return res.status(400).json({
        success: false,

        message:
          "Customer ID is required.",
      });
    }


    /*
     * ------------------------------------------------------------
     * CUSTOMER PROFILE
     * ------------------------------------------------------------
     */

    const customerResult =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          address,
          role,
          created_at

        FROM users

        WHERE
          id = $1

          AND role = 'CUSTOMER'

        LIMIT 1
        `,
        [customerId]
      );


    if (
      customerResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Customer not found.",
      });
    }


    /*
     * ------------------------------------------------------------
     * CUSTOMER ACCOUNTS
     * ------------------------------------------------------------
     */

    const accountResult =
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
        [customerId]
      );


    /*
     * ------------------------------------------------------------
     * TRANSACTION SUMMARY
     * ------------------------------------------------------------
     *
     * Internal transactions involving any of the customer's
     * accounts.
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
              WHERE t.status = 'SUCCESS'
            ),
            0
          ) AS successful_volume

        FROM transactions t

        WHERE
          t.sender_account_id IN (
            SELECT id
            FROM accounts
            WHERE user_id = $1
          )

          OR

          t.receiver_account_id IN (
            SELECT id
            FROM accounts
            WHERE user_id = $1
          )
        `,
        [customerId]
      );


    /*
     * ------------------------------------------------------------
     * RESPONSE
     * ------------------------------------------------------------
     */

    return res.json({
      success: true,

      message:
        "Customer retrieved successfully.",

      data: {
        customer:
          customerResult.rows[0],

        accounts:
          accountResult.rows,

        transactionSummary:
          transactionSummaryResult.rows[0],
      },
    });
  } catch (error) {
    console.error(
      "Admin customer detail error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to retrieve customer.",
    });
  }
});


module.exports = router;
