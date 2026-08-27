const express = require("express");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * GET RECEIPT
 * ================================================================
 *
 * GET /receipts/:receiptNumber
 *
 * Supports:
 *
 * 1. Internal NovaBank transactions
 *    receipts.transaction_id
 *
 * 2. External domestic transfers
 *    receipts.external_transaction_id
 *
 * 3. International transfers
 *    receipts.external_transaction_id
 *
 * Access:
 *
 * - Internal:
 *   authenticated sender OR receiver
 *
 * - External / International:
 *   authenticated sender
 *
 * ================================================================
 */

router.get(
  "/:receiptNumber",
  authMiddleware,
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

      /*
       * ------------------------------------------------------------
       * RECEIPT LOOKUP
       * ------------------------------------------------------------
       *
       * We support both:
       *
       * receipts.transaction_id
       *
       * and
       *
       * receipts.external_transaction_id
       *
       */

      const result =
        await pool.query(
          `
          SELECT

            /*
             * ------------------------------------------------------
             * RECEIPT
             * ------------------------------------------------------
             */

            r.id
              AS receipt_id,

            r.receipt_number,

            r.created_at
              AS receipt_created_at,


            /*
             * ------------------------------------------------------
             * INTERNAL TRANSACTION
             * ------------------------------------------------------
             */

            t.id
              AS internal_transaction_id,

            t.amount
              AS internal_amount,

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
             * EXTERNAL / INTERNATIONAL TRANSACTION
             * ------------------------------------------------------
             */

            et.id
              AS external_transaction_id,

            et.amount
              AS external_amount,

            et.source_currency
              AS external_source_currency,

            et.destination_currency
              AS external_destination_currency,

            et.transaction_type
              AS external_transaction_type,

            et.fee
              AS external_fee,

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
             *
             * This is the user's NovaBank account.
             *
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
             *
             * This is the simulated external bank account.
             *
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


          /*
           * --------------------------------------------------------
           * INTERNAL SENDER
           * --------------------------------------------------------
           */

          LEFT JOIN accounts sender
            ON sender.id =
              t.sender_account_id

          LEFT JOIN users sender_user
            ON sender_user.id =
              sender.user_id


          /*
           * --------------------------------------------------------
           * INTERNAL RECEIVER
           * --------------------------------------------------------
           */

          LEFT JOIN accounts receiver
            ON receiver.id =
              t.receiver_account_id

          LEFT JOIN users receiver_user
            ON receiver_user.id =
              receiver.user_id


          /*
           * --------------------------------------------------------
           * EXTERNAL / INTERNATIONAL TRANSACTION
           * --------------------------------------------------------
           */

          LEFT JOIN external_transactions et
            ON et.id =
              r.external_transaction_id


          /*
           * --------------------------------------------------------
           * EXTERNAL SENDER
           * --------------------------------------------------------
           */

          LEFT JOIN accounts external_sender
            ON external_sender.id =
              et.sender_account_id

          LEFT JOIN users external_sender_user
            ON external_sender_user.id =
              external_sender.user_id


          /*
           * --------------------------------------------------------
           * EXTERNAL RECEIVER
           * --------------------------------------------------------
           */

          LEFT JOIN external_accounts external_receiver
            ON external_receiver.id =
              et.receiver_external_account_id


          /*
           * --------------------------------------------------------
           * EXTERNAL BANK
           * --------------------------------------------------------
           */

          LEFT JOIN external_banks external_bank
            ON external_bank.id =
              external_receiver.bank_id


          /*
           * --------------------------------------------------------
           * RECEIPT + OWNERSHIP
           * --------------------------------------------------------
           */

          WHERE
            r.receipt_number = $1

            AND
            (
              /*
               * Internal transaction:
               * authenticated user is sender OR receiver.
               */

              (
                r.transaction_id IS NOT NULL

                AND
                (
                  sender.user_id = $2

                  OR

                  receiver.user_id = $2
                )
              )

              OR

              /*
               * External / international transaction:
               * authenticated user must be the sender.
               */

              (
                r.external_transaction_id IS NOT NULL

                AND
                external_sender.user_id = $2
              )
            )

          LIMIT 1
          `,
          [
            receiptNumber,
            req.user.userId,
          ]
        );


      /*
       * ------------------------------------------------------------
       * NOT FOUND
       * ------------------------------------------------------------
       */

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Receipt not found.",
        });
      }


      const row =
        result.rows[0];


      /*
       * ------------------------------------------------------------
       * DETERMINE SOURCE
       * ------------------------------------------------------------
       */

      const isExternal =
        Boolean(
          row.external_transaction_id
        );


      /*
       * ============================================================
       * EXTERNAL / INTERNATIONAL RECEIPT
       * ============================================================
       */

      if (isExternal) {
        const transactionType =
          String(
            row.external_transaction_type ||
              ""
          ).toUpperCase();

        const isInternational =
          transactionType.includes(
            "INTERNATIONAL"
          );


        return res.json({
          success: true,

          message:
            "Receipt retrieved successfully.",

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
                  row.external_source_currency ||
                  "NGN",

                destination_currency:
                  row.external_destination_currency ||
                  null,

                transaction_type:
                  row.external_transaction_type,

                description:
                  row.external_description ||
                  "",

                reference:
                  row.external_reference,

                status:
                  row.external_status,

                fee:
                  row.external_fee,

                created_at:
                  row.external_transaction_created_at,

                direction:
                  "DEBIT",
              },

              sender: {
                id:
                  row.external_sender_account_id,

                name:
                  row.external_sender_full_name ||
                  "NovaBank customer",

                email:
                  row.external_sender_email ||
                  null,

                account_number:
                  row.external_sender_account_number,

                account_type:
                  row.external_sender_account_type,

                currency:
                  row.external_sender_currency ||
                  "NGN",
              },

              receiver: {
                id:
                  row.external_receiver_account_id,

                name:
                  row.external_receiver_account_name ||
                  "External bank customer",

                email:
                  null,

                account_number:
                  row.external_receiver_account_number,

                account_type:
                  "EXTERNAL",

                currency:
                  row.external_receiver_currency ||
                  row.external_destination_currency ||
                  "NGN",

                country:
                  row.external_receiver_country ||
                  row.external_bank_country ||
                  null,

                status:
                  row.external_receiver_status ||
                  null,
              },

              bank: {
                name:
                  row.external_bank_name ||
                  "External bank",

                code:
                  row.external_bank_code ||
                  null,

                type:
                  isInternational
                    ? "INTERNATIONAL"
                    : "DOMESTIC",

                country:
                  row.external_bank_country ||
                  row.external_receiver_country ||
                  null,

                currency:
                  row.external_bank_currency ||
                  row.external_receiver_currency ||
                  null,
              },
            },
          },
        });
      }


      /*
       * ============================================================
       * INTERNAL NOVABANK RECEIPT
       * ============================================================
       */

      const isSender =
        String(
          row.sender_user_id
        ) ===
        String(
          req.user.userId
        );


      const direction =
        isSender
          ? "DEBIT"
          : "CREDIT";


      return res.json({
        success: true,

        message:
          "Receipt retrieved successfully.",

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
                row.internal_description ||
                "",

              reference:
                row.internal_reference,

              status:
                row.internal_status,

              created_at:
                row.internal_transaction_created_at,

              direction,
            },

            sender: {
              id:
                row.sender_account_id,

              name:
                row.sender_full_name ||
                "NovaBank customer",

              email:
                row.sender_email ||
                null,

              account_number:
                row.sender_account_number,

              account_type:
                row.sender_account_type,

              currency:
                row.sender_currency ||
                "NGN",
            },

            receiver: {
              id:
                row.receiver_account_id,

              name:
                row.receiver_full_name ||
                "NovaBank customer",

              email:
                row.receiver_email ||
                null,

              account_number:
                row.receiver_account_number,

              account_type:
                row.receiver_account_type,

              currency:
                row.receiver_currency ||
                "NGN",
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
    } catch (error) {
      console.error(
        "Receipt retrieval error:",
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