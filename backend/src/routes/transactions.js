const express = require("express");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * HELPERS
 * ================================================================
 */

function normalizeDirection(row, userId) {
  const currentUserId = String(userId);

  if (
    row.sender_user_id &&
    String(row.sender_user_id) === currentUserId
  ) {
    return "DEBIT";
  }

  if (
    row.receiver_user_id &&
    String(row.receiver_user_id) === currentUserId
  ) {
    return "CREDIT";
  }

  return "UNKNOWN";
}


function normalizeCurrency(currency) {
  if (
    typeof currency === "string" &&
    currency.trim().length === 3
  ) {
    return currency.trim().toUpperCase();
  }

  return "NGN";
}


function normalizeInternalTransaction(row, userId) {
  const direction =
    normalizeDirection(row, userId);

  const currency =
    normalizeCurrency(
      row.sender_currency ||
      row.receiver_currency
    );

  const senderName =
    row.sender_full_name ||
    "NovaBank customer";

  const receiverName =
    row.receiver_full_name ||
    "NovaBank customer";

  return {
    id: row.id,

    source: "INTERNAL",

    amount: row.amount,

    currency,

    transaction_type:
      row.transaction_type,

    description:
      row.description || "",

    reference:
      row.reference,

    status:
      row.status,

    created_at:
      row.created_at,

    receipt_number:
      row.receipt_number || null,

    direction,

    title:
      direction === "DEBIT"
        ? `Transfer to ${receiverName}`
        : `Transfer received`,

    subtitle:
      direction === "DEBIT"
        ? `To ${receiverName}`
        : `From ${senderName}`,

    sender: row.sender_id
      ? {
          id: row.sender_id,

          name:
            row.sender_full_name ||
            "NovaBank customer",

          account_number:
            row.sender_account_number,

          account_type:
            row.sender_account_type,

          currency:
            normalizeCurrency(
              row.sender_currency
            ),
        }
      : null,

    receiver: row.receiver_id
      ? {
          id: row.receiver_id,

          name:
            row.receiver_full_name ||
            "NovaBank customer",

          account_number:
            row.receiver_account_number,

          account_type:
            row.receiver_account_type,

          currency:
            normalizeCurrency(
              row.receiver_currency
            ),
        }
      : null,

    bank: {
      name: "NovaBank",
      code: "NOVABANK",
      type: "INTERNAL",
    },
  };
}


function normalizeExternalTransaction(
  row,
  userId
) {
  const direction =
    String(row.sender_user_id) ===
    String(userId)
      ? "DEBIT"
      : "CREDIT";

  const currency =
    normalizeCurrency(
      direction === "DEBIT"
        ? row.source_currency
        : row.destination_currency
    );

  const receiverName =
    row.external_account_name ||
    "External recipient";

  return {
    id: row.id,

    source: "EXTERNAL",

    amount: row.amount,

    currency,

    transaction_type:
      row.transaction_type,

    description:
      row.description || "",

    reference:
      row.reference,

    status:
      row.status,

    created_at:
      row.created_at,

    receipt_number:
      row.receipt_number || null,

    direction,

    title:
      direction === "DEBIT"
        ? `Transfer to ${receiverName}`
        : "External transfer received",

    subtitle:
      direction === "DEBIT"
        ? `${row.external_bank_name || "External bank"} • ${receiverName}`
        : `${row.external_bank_name || "External bank"} • ${receiverName}`,

    sender: row.sender_id
      ? {
          id: row.sender_id,

          name:
            row.sender_full_name ||
            "NovaBank customer",

          account_number:
            row.sender_account_number,

          account_type:
            row.sender_account_type,

          currency:
            normalizeCurrency(
              row.source_currency
            ),
        }
      : null,

    receiver: row.external_account_id
      ? {
          id:
            row.external_account_id,

          name:
            row.external_account_name ||
            "External recipient",

          account_number:
            row.external_account_number,

          account_type:
            "External account",

          currency:
            normalizeCurrency(
              row.destination_currency
            ),
        }
      : null,

    bank: {
      name:
        row.external_bank_name ||
        "External bank",

      code:
        row.external_bank_code ||
        null,

      type:
        row.external_bank_type ||
        "EXTERNAL",
    },

    fee:
      row.fee || "0.00",
  };
}


/*
 * ================================================================
 * GET ALL USER TRANSACTIONS
 * ================================================================
 *
 * GET /transactions
 *
 * Returns both:
 *
 * 1. NovaBank internal transfers
 * 2. External transfers
 *
 * Only transactions belonging to the authenticated
 * user's accounts are returned.
 *
 * ================================================================
 */

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      /*
       * ------------------------------------------------------------
       * INTERNAL TRANSACTIONS
       * ------------------------------------------------------------
       */

      const internalResult =
        await pool.query(
          `
          SELECT

            t.id,
            t.amount,
            t.transaction_type,
            t.description,
            t.reference,
            t.status,

            r.receipt_number
              AS receipt_number,

            sender.id
              AS sender_id,

            sender.account_number
              AS sender_account_number,

            sender.account_type
              AS sender_account_type,

            sender.currency
              AS sender_currency,

            sender.user_id
              AS sender_user_id,

            sender_user.full_name
              AS sender_full_name,

            receiver.id
              AS receiver_id,

            receiver.account_number
              AS receiver_account_number,

            receiver.account_type
              AS receiver_account_type,

            receiver.currency
              AS receiver_currency,

            receiver.user_id
              AS receiver_user_id,

            receiver_user.full_name
              AS receiver_full_name

          FROM transactions t

          LEFT JOIN receipts r
            ON r.transaction_id =
              t.id

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

          WHERE
            sender.user_id = $1

            OR

            receiver.user_id = $1

          ORDER BY
            t.created_at DESC
          `,
          [req.user.userId]
        );


      /*
       * ------------------------------------------------------------
       * EXTERNAL TRANSACTIONS
       * ------------------------------------------------------------
       */

      const externalResult =
        await pool.query(
          `
          SELECT

            et.id,
            et.amount,
            et.source_currency,
            et.destination_currency,
            et.transaction_type,
            et.fee,
            et.description,
            et.reference,
            et.status,
            et.created_at,

            r.receipt_number
              AS receipt_number,

            sender.id
              AS sender_id,

            sender.account_number
              AS sender_account_number,

            sender.account_type
              AS sender_account_type,

            sender.user_id
              AS sender_user_id,

            sender_user.full_name
              AS sender_full_name,

            external_account.id
              AS external_account_id,

            external_account.account_number
              AS external_account_number,

            external_account.account_name
              AS external_account_name,

            external_bank.bank_code
              AS external_bank_code,

            external_bank.bank_name
              AS external_bank_name,

            external_bank.bank_type
              AS external_bank_type

          FROM external_transactions et

          LEFT JOIN receipts r
            ON r.external_transaction_id =
              et.id

          INNER JOIN accounts sender
            ON sender.id =
              et.sender_account_id

          INNER JOIN users sender_user
            ON sender_user.id =
              sender.user_id

          INNER JOIN external_accounts external_account
            ON external_account.id =
              et.receiver_external_account_id

          INNER JOIN external_banks external_bank
            ON external_bank.id =
              external_account.bank_id

          WHERE
            sender.user_id = $1

          ORDER BY
            et.created_at DESC
          `,
          [req.user.userId]
        );


      /*
       * ------------------------------------------------------------
       * NORMALIZE
       * ------------------------------------------------------------
       */

      const internalTransactions =
        internalResult.rows.map(
          (row) =>
            normalizeInternalTransaction(
              row,
              req.user.userId
            )
        );


      const externalTransactions =
        externalResult.rows.map(
          (row) =>
            normalizeExternalTransaction(
              row,
              req.user.userId
            )
        );


      /*
       * ------------------------------------------------------------
       * COMBINE
       * ------------------------------------------------------------
       */

      const transactions = [
        ...internalTransactions,
        ...externalTransactions,
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );


      /*
       * ------------------------------------------------------------
       * SUMMARY
       * ------------------------------------------------------------
       */

      const summary = {
        total: transactions.length,

        sent: transactions.filter(
          (transaction) =>
            transaction.direction ===
            "DEBIT"
        ).length,

        received: transactions.filter(
          (transaction) =>
            transaction.direction ===
            "CREDIT"
        ).length,

        successful: transactions.filter(
          (transaction) =>
            String(
              transaction.status
            ).toUpperCase() ===
            "SUCCESS"
        ).length,

        failed: transactions.filter(
          (transaction) =>
            String(
              transaction.status
            ).toUpperCase() ===
            "FAILED"
        ).length,
      };


      return res.json({
        success: true,

        message:
          "Transactions retrieved successfully.",

        data: {
          transactions,

          summary,
        },
      });
    } catch (error) {
      console.error(
        "Transactions error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve transactions.",
      });
    }
  }
);


/*
 * ================================================================
 * GET SINGLE TRANSACTION
 * ================================================================
 *
 * GET /transactions/:id
 *
 * ================================================================
 */
router.get(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const transactionId =
        String(
          req.params.id
        ).trim();


      /*
       * ------------------------------------------------------------
       * INTERNAL TRANSACTION
       * ------------------------------------------------------------
       */

      const internalResult =
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

            r.receipt_number
              AS receipt_number,

            sender.id
              AS sender_id,

            sender.account_number
              AS sender_account_number,

            sender.account_type
              AS sender_account_type,

            sender.currency
              AS sender_currency,

            sender.user_id
              AS sender_user_id,

            sender_user.full_name
              AS sender_full_name,

            receiver.id
              AS receiver_id,

            receiver.account_number
              AS receiver_account_number,

            receiver.account_type
              AS receiver_account_type,

            receiver.currency
              AS receiver_currency,

            receiver.user_id
              AS receiver_user_id,

            receiver_user.full_name
              AS receiver_full_name

          FROM transactions t

          LEFT JOIN receipts r
            ON r.transaction_id =
              t.id

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

          WHERE
            t.id = $1

            AND (

              sender.user_id = $2

              OR

              receiver.user_id = $2

            )

          LIMIT 1
          `,
          [
            transactionId,
            req.user.userId,
          ]
        );


      if (
        internalResult.rows.length >
        0
      ) {
        const transaction =
          normalizeInternalTransaction(
            internalResult.rows[0],
            req.user.userId
          );

        return res.json({
          success: true,

          message:
            "Transaction retrieved successfully.",

          data: {
            transaction,

            receipt:
              internalResult.rows[0]
                .receipt_number
                ? {
                    receipt_number:
                      internalResult.rows[0]
                        .receipt_number,
                  }
                : null,
          },
        });
      }


      /*
       * ------------------------------------------------------------
       * EXTERNAL TRANSACTION
       * ------------------------------------------------------------
       */

      const externalResult =
        await pool.query(
          `
          SELECT

            et.id,
            et.amount,
            et.source_currency,
            et.destination_currency,
            et.transaction_type,
            et.fee,
            et.description,
          FROM external_transactions et

          LEFT JOIN receipts r
            ON r.external_transaction_id =
              et.id

          INNER JOIN accounts sender

            sender.account_number
              AS sender_account_number,

            sender.account_type
              AS sender_account_type,

            sender.user_id
              AS sender_user_id,

            sender_user.full_name
              AS sender_full_name,

            external_account.id
              AS external_account_id,

            external_account.account_number
              AS external_account_number,

            external_account.account_name
              AS external_account_name,

            external_bank.bank_code
              AS external_bank_code,

            external_bank.bank_name
              AS external_bank_name,

            external_bank.bank_type
              AS external_bank_type

          FROM external_transactions et

          LEFT JOIN receipts r
            ON r.external_transaction_id =
              et.id

          INNER JOIN accounts sender
            ON sender.id =
              et.sender_account_id

          INNER JOIN users sender_user
            ON sender_user.id =
              sender.user_id

          INNER JOIN external_accounts external_account
            ON external_account.id =
              et.receiver_external_account_id

          INNER JOIN external_banks external_bank
            ON external_bank.id =
              external_account.bank_id

          WHERE
            et.id = $1

            AND sender.user_id = $2

          LIMIT 1
          `,
          [
            transactionId,
            req.user.userId,
          ]
        );


      if (
        externalResult.rows.length >
        0
      ) {
        const transaction =
          normalizeExternalTransaction(
            externalResult.rows[0],
            req.user.userId
          );

        return res.json({
          success: true,

          message:
            "Transaction retrieved successfully.",

          data: {
            transaction,

            receipt:
              externalResult.rows[0]
                .receipt_number
                ? {
                    receipt_number:
                      externalResult.rows[0]
                        .receipt_number,
                  }
                : null,
          },
        });
      }


      /*
       * ------------------------------------------------------------
       * NOT FOUND
       * ------------------------------------------------------------
       */

      return res.status(404).json({
        success: false,

        message:
          "Transaction not found.",
      });
    } catch (error) {
      console.error(
        "Transaction detail error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve transaction.",
      });
    }
  }
);


module.exports = router;