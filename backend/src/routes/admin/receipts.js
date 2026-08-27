const express = require("express");

const pool = require("../../config/db");

const router = express.Router();

/*
 * ================================================================
 * GET ADMIN RECEIPT
 * ================================================================
 *
 * GET /admin/receipts/:receiptNumber
 *
 * Admin-only receipt lookup.
 *
 * Authorization is inherited from:
 *
 * authMiddleware
 * adminMiddleware
 *
 * mounted in:
 *
 * src/routes/admin/index.js
 *
 * Supports:
 *
 * 1. Internal NovaBank transactions
 * 2. External domestic transfers
 * 3. International transfers
 *
 * ================================================================
 */

router.get(
  "/:receiptNumber",
  async (req, res) => {
    try {
      const receiptNumber =
        String(
          req.params.receiptNumber || ""
        ).trim();

      if (!receiptNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Receipt number is required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT

            /*
             * ------------------------------------------------------
             * RECEIPT
             * ------------------------------------------------------
             */

            r.id AS receipt_id,

            r.receipt_number,

            r.created_at AS receipt_created_at,


            /*
             * ------------------------------------------------------
             * INTERNAL TRANSACTION
             * ------------------------------------------------------
             */

            t.id AS internal_transaction_id,

            t.amount AS internal_amount,

            t.transaction_type
              AS internal_transaction_type,

            t.description
              AS internal_description,

            t.reference
              AS internal_reference,

            t.status
              AS internal_status,

            t.created_at
              AS internal_transaction_created_at,


            /*
             * ------------------------------------------------------
             * EXTERNAL TRANSACTION
             * ------------------------------------------------------
             */

            et.id AS external_transaction_id,

            et.amount AS external_amount,

            et.source_currency
              AS external_source_currency,

            et.destination_currency
              AS external_destination_currency,

            et.transaction_type
              AS external_transaction_type,

            et.fee AS external_fee,

            et.description
              AS external_description,

            et.reference
              AS external_reference,

            et.status
              AS external_status,

            et.created_at
              AS external_transaction_created_at,


            /*
             * ------------------------------------------------------
             * INTERNAL SENDER
             * ------------------------------------------------------
             */

            sender.id
              AS sender_account_id,

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

            sender_user.email
              AS sender_email,


            /*
             * ------------------------------------------------------
             * INTERNAL RECEIVER
             * ------------------------------------------------------
             */

            receiver.id
              AS receiver_account_id,

            receiver.account_number
              AS receiver_account_number,

            receiver.account_type
              AS receiver_account_type,

            receiver.currency
              AS receiver_currency,

            receiver.user_id
              AS receiver_user_id,

            receiver_user.full_name
              AS receiver_full_name,

            receiver_user.email
              AS receiver_email,


            /*
             * ------------------------------------------------------
             * EXTERNAL SENDER
             * ------------------------------------------------------
             */

            external_sender.id
              AS external_sender_account_id,

            external_sender.account_number
              AS external_sender_account_number,

            external_sender.account_type
              AS external_sender_account_type,

            external_sender.currency
              AS external_sender_currency,

            external_sender.user_id
              AS external_sender_user_id,

            external_sender_user.full_name
              AS external_sender_full_name,

            external_sender_user.email
              AS external_sender_email,


            /*
             * ------------------------------------------------------
             * EXTERNAL RECEIVER
             * ------------------------------------------------------
             */

            external_receiver.id
              AS external_receiver_account_id,

            external_receiver.account_number
              AS external_receiver_account_number,

            external_receiver.account_name
              AS external_receiver_account_name,

            external_receiver.currency
              AS external_receiver_currency,

            external_receiver.country
              AS external_receiver_country,

            external_receiver.status
              AS external_receiver_status,


            /*
             * ------------------------------------------------------
             * EXTERNAL BANK
             * ------------------------------------------------------
             */

            external_bank.bank_code
              AS external_bank_code,

            external_bank.bank_name
              AS external_bank_name,

            external_bank.country
              AS external_bank_country,

            external_bank.currency
              AS external_bank_currency,

            external_bank.bank_type
              AS external_bank_type


          FROM receipts r


          /*
           * --------------------------------------------------------
           * INTERNAL TRANSACTION
           * --------------------------------------------------------
           */

          LEFT JOIN transactions t
            ON t.id =
              r.transaction_id


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


          /*
           * --------------------------------------------------------
           * EXTERNAL TRANSACTION
           * --------------------------------------------------------
           */

          LEFT JOIN external_transactions et
            ON et.id =
              r.external_transaction_id


          LEFT JOIN accounts external_sender
            ON external_sender.id =
              et.sender_account_id

          LEFT JOIN users external_sender_user
            ON external_sender_user.id =
              external_sender.user_id


          LEFT JOIN external_accounts external_receiver
            ON external_receiver.id =
              et.receiver_external_account_id

          LEFT JOIN external_banks external_bank
            ON external_bank.id =
              external_receiver.bank_id


          WHERE
            r.receipt_number = $1

          LIMIT 1
          `,
          [receiptNumber]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Receipt not found.",
        });
      }

      const row =
        result.rows[0];

      /*
       * ============================================================
       * INTERNAL RECEIPT
       * ============================================================
       */

      if (row.internal_transaction_id) {
        return res.json({
          success: true,

          message:
            "Admin receipt retrieved successfully.",

          data: {
            receipt: {
              id:
                row.receipt_id,

              receipt_number:
                row.receipt_number,

              created_at:
                row.receipt_created_at,

              transaction: {
                id:
                  row.internal_transaction_id,

                amount:
                  row.internal_amount,

                currency:
                  row.sender_currency ||
                  row.receiver_currency ||
                  "NGN",

                transaction_type:
                  row.internal_transaction_type,

                description:
                  row.internal_description || "",

                reference:
                  row.internal_reference,

                status:
                  row.internal_status,

                created_at:
                  row.internal_transaction_created_at,
              },

              sender: {
                id:
                  row.sender_user_id,

                name:
                  row.sender_full_name,

                email:
                  row.sender_email,

                account_number:
                  row.sender_account_number,

                account_type:
                  row.sender_account_type,

                currency:
                  row.sender_currency,
              },

              receiver: {
                id:
                  row.receiver_user_id,

                name:
                  row.receiver_full_name,

                email:
                  row.receiver_email,

                account_number:
                  row.receiver_account_number,

                account_type:
                  row.receiver_account_type,

                currency:
                  row.receiver_currency,
              },

              bank: {
                name:
                  "NovaBank",

                code:
                  "NOVABANK",

                type:
                  "INTERNAL",
              },
            },
          },
        });
      }

      /*
       * ============================================================
       * EXTERNAL RECEIPT
       * ============================================================
       */

      if (row.external_transaction_id) {
        return res.json({
          success: true,

          message:
            "Admin receipt retrieved successfully.",

          data: {
            receipt: {
              id:
                row.receipt_id,

              receipt_number:
                row.receipt_number,

              created_at:
                row.receipt_created_at,

              transaction: {
                id:
                  row.external_transaction_id,

                amount:
                  row.external_amount,

                currency:
                  row.external_source_currency,

                source_currency:
                  row.external_source_currency,

                destination_currency:
                  row.external_destination_currency,

                transaction_type:
                  row.external_transaction_type,

                description:
                  row.external_description || "",

                reference:
                  row.external_reference,

                status:
                  row.external_status,

                fee:
                  row.external_fee,

                created_at:
                  row.external_transaction_created_at,
              },

              sender: {
                id:
                  row.external_sender_user_id,

                name:
                  row.external_sender_full_name,

                email:
                  row.external_sender_email,

                account_number:
                  row.external_sender_account_number,

                account_type:
                  row.external_sender_account_type,

                currency:
                  row.external_sender_currency,
              },

              receiver: {
                id:
                  row.external_receiver_account_id,

                name:
                  row.external_receiver_account_name,

                account_number:
                  row.external_receiver_account_number,

                currency:
                  row.external_receiver_currency,

                country:
                  row.external_receiver_country,

                status:
                  row.external_receiver_status,

                bank_name:
                  row.external_bank_name,

                bank_code:
                  row.external_bank_code,

                bank_country:
                  row.external_bank_country,

                bank_currency:
                  row.external_bank_currency,

                bank_type:
                  row.external_bank_type,
              },

              bank: {
                name:
                  row.external_bank_name ||
                  "External Bank",

                code:
                  row.external_bank_code ||
                  "",

                type:
                  row.external_bank_type ||
                  "EXTERNAL",
              },
            },
          },
        });
      }

      return res.status(404).json({
        success: false,
        message:
          "Receipt transaction not found.",
      });
    } catch (error) {
      console.error(
        "Admin receipt error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve receipt.",
      });
    }
  }
);

module.exports = router;
