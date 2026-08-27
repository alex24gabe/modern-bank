const express = require("express");

const pool = require("../../config/db");

const router = express.Router();

/*
 * ================================================================
 * ADMIN TRANSACTIONS
 * ================================================================
 *
 * Unified read-only transaction interface for administrators.
 *
 * Internal transactions:
 *   transactions
 *
 * External transactions:
 *   external_transactions
 *
 * GET /
 * GET /:id
 * ================================================================
 */

/*
 * ================================================================
 * GET TRANSACTIONS
 * ================================================================
 *
 * GET /admin/transactions
 *
 * Query parameters:
 *
 * page
 * limit
 * search
 * status
 * type
 * source
 * currency
 * from
 * to
 * ================================================================
 */

router.get("/", async (req, res) => {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 20,
        1
      ),
      100
    );

    const offset = (page - 1) * limit;

    const search =
      String(req.query.search || "").trim();

    const status =
      String(req.query.status || "").trim();

    const type =
      String(req.query.type || "").trim();

    const source =
      String(req.query.source || "")
        .trim()
        .toUpperCase();

    const currency =
      String(req.query.currency || "")
        .trim()
        .toUpperCase();

    const from =
      String(req.query.from || "").trim();

    const to =
      String(req.query.to || "").trim();

    /*
     * ------------------------------------------------------------
     * Build internal transaction query
     * ------------------------------------------------------------
     */

    const internalConditions = [];
    const internalValues = [];

    const addInternalCondition = (
      sql,
      value
    ) => {
      internalValues.push(value);

      internalConditions.push(
        sql.replace(
          "$VALUE",
          `$${internalValues.length}`
        )
      );
    };

    if (search) {
      addInternalCondition(
        `
        (
          t.reference ILIKE '%' || $VALUE || '%'
          OR sender.account_number ILIKE '%' || $VALUE || '%'
          OR receiver.account_number ILIKE '%' || $VALUE || '%'
          OR sender_user.full_name ILIKE '%' || $VALUE || '%'
          OR receiver_user.full_name ILIKE '%' || $VALUE || '%'
          OR sender_user.email ILIKE '%' || $VALUE || '%'
          OR receiver_user.email ILIKE '%' || $VALUE || '%'
        )
        `,
        search
      );
    }

    if (status) {
      addInternalCondition(
        `t.status = $VALUE`,
        status
      );
    }

    if (type) {
      addInternalCondition(
        `t.transaction_type = $VALUE`,
        type
      );
    }

    if (currency) {
      addInternalCondition(
        `
        (
          sender.currency = $VALUE
          OR receiver.currency = $VALUE
        )
        `,
        currency
      );
    }

    if (from) {
      addInternalCondition(
        `t.created_at >= $VALUE::timestamp`,
        from
      );
    }

    if (to) {
      addInternalCondition(
        `
        t.created_at <
        ($VALUE::date + INTERVAL '1 day')
        `,
        to
      );
    }

    /*
     * ------------------------------------------------------------
     * Build external transaction query
     * ------------------------------------------------------------
     */

    const externalConditions = [];
    const externalValues = [];

    const addExternalCondition = (
      sql,
      value
    ) => {
      externalValues.push(value);

      externalConditions.push(
        sql.replace(
          "$VALUE",
          `$${externalValues.length}`
        )
      );
    };

    if (search) {
      addExternalCondition(
        `
        (
          et.reference ILIKE '%' || $VALUE || '%'
          OR sender.account_number ILIKE '%' || $VALUE || '%'
          OR sender_user.full_name ILIKE '%' || $VALUE || '%'
          OR sender_user.email ILIKE '%' || $VALUE || '%'
          OR eb.bank_name ILIKE '%' || $VALUE || '%'
          OR ea.account_number ILIKE '%' || $VALUE || '%'
          OR ea.account_name ILIKE '%' || $VALUE || '%'
        )
        `,
        search
      );
    }

    if (status) {
      addExternalCondition(
        `et.status = $VALUE`,
        status
      );
    }

    if (type) {
      addExternalCondition(
        `et.transaction_type = $VALUE`,
        type
      );
    }

    if (currency) {
      addExternalCondition(
        `
        (
          et.source_currency = $VALUE
          OR et.destination_currency = $VALUE
        )
        `,
        currency
      );
    }

    if (from) {
      addExternalCondition(
        `et.created_at >= $VALUE::timestamp`,
        from
      );
    }

    if (to) {
      addExternalCondition(
        `
        et.created_at <
        ($VALUE::date + INTERVAL '1 day')
        `,
        to
      );
    }

    /*
     * ------------------------------------------------------------
     * Source filter
     * ------------------------------------------------------------
     */

    const includeInternal =
      !source || source === "INTERNAL";

    const includeExternal =
      !source || source === "EXTERNAL";

    /*
     * ------------------------------------------------------------
     * Internal transactions
     * ------------------------------------------------------------
     */

    const internalQuery = `
      SELECT
        t.id,
        'INTERNAL' AS source,
        t.transaction_type,
        t.amount,
        COALESCE(
          sender.currency,
          receiver.currency,
          'NGN'
        ) AS currency,

        t.description,
        t.reference,
        t.status,
        t.created_at,

        0::numeric AS fee,

        sender.id AS sender_account_id,
        sender.account_number
          AS sender_account_number,
        sender.account_type
          AS sender_account_type,
        sender.currency
          AS sender_currency,

        sender_user.id
          AS sender_user_id,
        sender_user.full_name
          AS sender_name,
        sender_user.email
          AS sender_email,

        receiver.id
          AS receiver_account_id,
        receiver.account_number
          AS receiver_account_number,
        receiver.account_type
          AS receiver_account_type,
        receiver.currency
          AS receiver_currency,

        receiver_user.id
          AS receiver_user_id,
        receiver_user.full_name
          AS receiver_name,
        receiver_user.email
          AS receiver_email,

        NULL::uuid
          AS receiver_external_account_id,

        NULL::text
          AS external_bank_name,

        NULL::text
          AS external_bank_code,

        NULL::text
          AS external_account_number,

        NULL::text
          AS external_account_name,

        NULL::text
          AS source_currency,

        NULL::text
          AS destination_currency,

        EXISTS (
          SELECT 1
          FROM receipts r
          WHERE r.transaction_id = t.id
        ) AS has_receipt

      FROM transactions t

      LEFT JOIN accounts sender
        ON sender.id =
          t.sender_account_id

      LEFT JOIN users sender_user
        ON sender_user.id =
          sender.user_id

      LEFT JOIN accounts receiver
        ON receiver.id =
          t.receiver_account_id

      LEFT JOIN users receiver_user
        ON receiver_user.id =
          receiver.user_id

      ${
        internalConditions.length
          ? `WHERE ${internalConditions.join(
              " AND "
            )}`
          : ""
      }
    `;

    /*
     * ------------------------------------------------------------
     * External transactions
     * ------------------------------------------------------------
     */

    const externalQuery = `
      SELECT
        et.id,
        'EXTERNAL' AS source,
        et.transaction_type,
        et.amount,

        et.source_currency
          AS currency,

        et.description,
        et.reference,
        et.status,
        et.created_at,

        et.fee,

        sender.id AS sender_account_id,
        sender.account_number
          AS sender_account_number,
        sender.account_type
          AS sender_account_type,
        sender.currency
          AS sender_currency,

        sender_user.id
          AS sender_user_id,
        sender_user.full_name
          AS sender_name,
        sender_user.email
          AS sender_email,

        NULL::uuid
          AS receiver_account_id,

        NULL::text
          AS receiver_account_number,

        NULL::text
          AS receiver_account_type,

        NULL::text
          AS receiver_currency,

        NULL::uuid
          AS receiver_user_id,

        NULL::text
          AS receiver_name,

        NULL::text
          AS receiver_email,

        et.receiver_external_account_id,

        eb.bank_name
          AS external_bank_name,

        eb.bank_code
          AS external_bank_code,

        ea.account_number
          AS external_account_number,

        ea.account_name
          AS external_account_name,

        et.source_currency,

        et.destination_currency,

        EXISTS (
          SELECT 1
          FROM receipts r
          WHERE
            r.external_transaction_id =
              et.id
        ) AS has_receipt

      FROM external_transactions et

      INNER JOIN accounts sender
        ON sender.id =
          et.sender_account_id

      INNER JOIN users sender_user
        ON sender_user.id =
          sender.user_id

      INNER JOIN external_accounts ea
        ON ea.id =
          et.receiver_external_account_id

      INNER JOIN external_banks eb
        ON eb.id =
          ea.bank_id

      ${
        externalConditions.length
          ? `WHERE ${externalConditions.join(
              " AND "
            )}`
          : ""
      }
    `;

    /*
     * ------------------------------------------------------------
     * Combine sources
     * ------------------------------------------------------------
     */

    const parts = [];

    const values = [];

    if (includeInternal) {
      parts.push(internalQuery);

      for (const value of internalValues) {
        values.push(value);
      }
    }

    if (includeExternal) {
      const externalOffset =
        values.length;

      const adjustedExternalQuery =
        externalQuery.replace(
          /\$(\d+)/g,
          (_, number) =>
            `${
              Number(number) +
              externalOffset
            }`
        );

      parts.push(adjustedExternalQuery);

      for (const value of externalValues) {
        values.push(value);
      }
    }

    if (parts.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid transaction source.",
      });
    }

    const unionQuery = parts.join(
      "\nUNION ALL\n"
    );

    /*
     * ------------------------------------------------------------
     * Count
     * ------------------------------------------------------------
     */

    const countResult =
      await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM (
          ${unionQuery}
        ) combined
        `,
        values
      );

    const total =
      countResult.rows[0].total;

    /*
     * ------------------------------------------------------------
     * Pagination values
     * ------------------------------------------------------------
     */

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const limitPosition =
      values.length + 1;

    const offsetPosition =
      values.length + 2;

    /*
     * ------------------------------------------------------------
     * Final result
     * ------------------------------------------------------------
     */

    const result =
      await pool.query(
        `
        SELECT *
        FROM (
          ${unionQuery}
        ) combined

        ORDER BY
          created_at DESC

        LIMIT $${limitPosition}
        OFFSET $${offsetPosition}
        `,
        dataValues
      );

    const transactions =
      result.rows.map((row) => ({
        id: row.id,

        source: row.source,

        transaction_type:
          row.transaction_type,

        amount: row.amount,

        currency:
          row.currency,

        source_currency:
          row.source_currency,

        destination_currency:
          row.destination_currency,

        description:
          row.description || "",

        reference:
          row.reference,

        status:
          row.status,

        fee:
          row.fee,

        created_at:
          row.created_at,

        has_receipt:
          row.has_receipt,

        sender: {
          account_id:
            row.sender_account_id,

          account_number:
            row.sender_account_number,

          account_type:
            row.sender_account_type,

          currency:
            row.sender_currency,

          name:
            row.sender_name,

          email:
            row.sender_email,
        },

        receiver:
          row.source === "INTERNAL"
            ? {
                account_id:
                  row.receiver_account_id,

                account_number:
                  row.receiver_account_number,

                account_type:
                  row.receiver_account_type,

                currency:
                  row.receiver_currency,

                name:
                  row.receiver_name,

                email:
                  row.receiver_email,
              }
            : {
                external_account_id:
                  row.receiver_external_account_id,

                bank_name:
                  row.external_bank_name,

                bank_code:
                  row.external_bank_code,

                account_number:
                  row.external_account_number,

                account_name:
                  row.external_account_name,

                destination_currency:
                  row.destination_currency,
              },
      }));

    return res.json({
      success: true,

      message:
        "Transactions retrieved successfully.",

      data: {
        transactions,

        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(total / limit),
        },

        filters: {
          search:
            search || null,

          status:
            status || null,

          type:
            type || null,

          source:
            source || null,

          currency:
            currency || null,

          from:
            from || null,

          to:
            to || null,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin transactions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve transactions.",
    });
  }
});


/*
 * ================================================================
 * GET TRANSACTION DETAIL
 * ================================================================
 *
 * GET /admin/transactions/:id
 *
 * The ID may belong to either:
 *
 * transactions
 * external_transactions
 *
 * ================================================================
 */

router.get("/:id", async (req, res) => {
  try {
    const id =
      String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction ID is required.",
      });
    }

    /*
     * ------------------------------------------------------------
     * Try internal transaction first
     * ------------------------------------------------------------
     */

    const internalResult =
      await pool.query(
        `
        SELECT
          t.id,
          t.transaction_type,
          t.amount,
          t.description,
          t.reference,
          t.status,
          t.created_at,

          sender.id
            AS sender_account_id,

          sender.account_number
            AS sender_account_number,

          sender.account_type
            AS sender_account_type,

          sender.currency
            AS sender_currency,

          sender_user.id
            AS sender_user_id,

          sender_user.full_name
            AS sender_name,

          sender_user.email
            AS sender_email,

          receiver.id
            AS receiver_account_id,

          receiver.account_number
            AS receiver_account_number,

          receiver.account_type
            AS receiver_account_type,

          receiver.currency
            AS receiver_currency,

          receiver_user.id
            AS receiver_user_id,

          receiver_user.full_name
            AS receiver_name,

          receiver_user.email
            AS receiver_email,

          r.id
            AS receipt_id,

          r.receipt_number,

          r.created_at
            AS receipt_created_at

        FROM transactions t

        LEFT JOIN accounts sender
          ON sender.id =
            t.sender_account_id

        LEFT JOIN users sender_user
          ON sender_user.id =
            sender.user_id

        LEFT JOIN accounts receiver
          ON receiver.id =
            t.receiver_account_id

        LEFT JOIN users receiver_user
          ON receiver_user.id =
            receiver.user_id

        LEFT JOIN receipts r
          ON r.transaction_id =
            t.id

        WHERE t.id = $1

        LIMIT 1
        `,
        [id]
      );

    if (internalResult.rows.length > 0) {
      const row =
        internalResult.rows[0];

      return res.json({
        success: true,

        message:
          "Transaction retrieved successfully.",

        data: {
          transaction: {
            id: row.id,

            source: "INTERNAL",

            transaction_type:
              row.transaction_type,

            amount:
              row.amount,

            currency:
              row.sender_currency ||
              row.receiver_currency ||
              "NGN",

            description:
              row.description || "",

            reference:
              row.reference,

            status:
              row.status,

            created_at:
              row.created_at,

            fee: "0",

            sender: {
              account_id:
                row.sender_account_id,

              account_number:
                row.sender_account_number,

              account_type:
                row.sender_account_type,

              currency:
                row.sender_currency,

              name:
                row.sender_name,

              email:
                row.sender_email,
            },

            receiver: {
              account_id:
                row.receiver_account_id,

              account_number:
                row.receiver_account_number,

              account_type:
                row.receiver_account_type,

              currency:
                row.receiver_currency,

              name:
                row.receiver_name,

              email:
                row.receiver_email,
            },

            receipt:
              row.receipt_id
                ? {
                    id:
                      row.receipt_id,

                    receipt_number:
                      row.receipt_number,

                    created_at:
                      row.receipt_created_at,
                  }
                : null,
          },
        },
      });
    }

    /*
     * ------------------------------------------------------------
     * Try external transaction
     * ------------------------------------------------------------
     */

    const externalResult =
      await pool.query(
        `
        SELECT
          et.id,
          et.transaction_type,
          et.amount,
          et.source_currency,
          et.destination_currency,
          et.fee,
          et.description,
          et.reference,
          et.status,
          et.created_at,

          sender.id
            AS sender_account_id,

          sender.account_number
            AS sender_account_number,

          sender.account_type
            AS sender_account_type,

          sender.currency
            AS sender_currency,

          sender_user.id
            AS sender_user_id,

          sender_user.full_name
            AS sender_name,

          sender_user.email
            AS sender_email,

          ea.id
            AS receiver_external_account_id,

          ea.account_number
            AS receiver_account_number,

          ea.account_name
            AS receiver_account_name,

          eb.bank_name
            AS receiver_bank_name,

          eb.bank_code
            AS receiver_bank_code,

          r.id
            AS receipt_id,

          r.receipt_number,

          r.created_at
            AS receipt_created_at

        FROM external_transactions et

        INNER JOIN accounts sender
          ON sender.id =
            et.sender_account_id

        INNER JOIN users sender_user
          ON sender_user.id =
            sender.user_id

        INNER JOIN external_accounts ea
          ON ea.id =
            et.receiver_external_account_id

        INNER JOIN external_banks eb
          ON eb.id =
            ea.bank_id

        LEFT JOIN receipts r
          ON r.external_transaction_id =
            et.id

        WHERE et.id = $1

        LIMIT 1
        `,
        [id]
      );

    if (externalResult.rows.length > 0) {
      const row =
        externalResult.rows[0];

      return res.json({
        success: true,

        message:
          "Transaction retrieved successfully.",

        data: {
          transaction: {
            id: row.id,

            source: "EXTERNAL",

            transaction_type:
              row.transaction_type,

            amount:
              row.amount,

            source_currency:
              row.source_currency,

            destination_currency:
              row.destination_currency,

            description:
              row.description || "",

            reference:
              row.reference,

            status:
              row.status,

            created_at:
              row.created_at,

            fee:
              row.fee,

            sender: {
              account_id:
                row.sender_account_id,

              account_number:
                row.sender_account_number,

              account_type:
                row.sender_account_type,

              currency:
                row.sender_currency,

              name:
                row.sender_name,

              email:
                row.sender_email,
            },

            receiver: {
              external_account_id:
                row.receiver_external_account_id,

              account_number:
                row.receiver_account_number,

              account_name:
                row.receiver_account_name,

              bank_name:
                row.receiver_bank_name,

              bank_code:
                row.receiver_bank_code,

              destination_currency:
                row.destination_currency,
            },

            receipt:
              row.receipt_id
                ? {
                    id:
                      row.receipt_id,

                    receipt_number:
                      row.receipt_number,

                    created_at:
                      row.receipt_created_at,
                  }
                : null,
          },
        },
      });
    }

    return res.status(404).json({
      success: false,
      message:
        "Transaction not found.",
    });
  } catch (error) {
    console.error(
      "Admin transaction detail error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve transaction.",
    });
  }
});


module.exports = router;
