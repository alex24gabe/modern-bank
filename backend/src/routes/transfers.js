const express = require("express");
const crypto = require("crypto");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const transactionPinMiddleware = require("../middleware/transactionPinMiddleware");

const router = express.Router();

/*
 * ================================================================
 * NOVABANK TRANSFER ROUTES
 * ================================================================
 *
 * Internal:
 *
 * GET  /transfers/accounts
 * GET  /transfers/recipient/:accountNumber
 * POST /transfers
 *
 * External:
 *
 * GET  /transfers/external/banks
 * GET  /transfers/external/recipient/:bankCode/:accountNumber
 * POST /transfers/external
 *
 * International:
 *
 * GET  /transfers/international/countries
 * POST /transfers/international/verify
 * POST /transfers/international
 *
 * IMPORTANT:
 *
 * External and international transfers are simulated against the
 * local external_banks / external_accounts system.
 *
 * They do NOT connect to real banking rails.
 * ================================================================
 */


/*
 * ================================================================
 * CONFIGURATION
 * ================================================================
 */

const EXTERNAL_TRANSFER_FEE = 25.00;

const INTERNATIONAL_TRANSFER_FEE = 15.00;


/*
 * ================================================================
 * HELPERS
 * ================================================================
 */

function generateReference(prefix = "TRF") {
  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();

  return `NB-${prefix}-${timestamp}-${random}`;
}


function parseAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (amount <= 0) {
    return null;
  }

  if (
    Math.round(amount * 100) !==
    Math.round(amount * 100)
  ) {
    return null;
  }

  return Number(
    amount.toFixed(2)
  );
}


function normalizeAccountNumber(value) {
  return String(value || "").trim();
}


function normalizeBankCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


/*
 * ================================================================
 * FORMAT MONEY FOR NOTIFICATIONS
 * ================================================================
 */

function formatNotificationAmount(
  amount,
  currency = "NGN"
) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    )
  ) {
    return `${currency} ${amount}`;
  }

  return `${currency} ${numericAmount.toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}


/*
 * ================================================================
 * CREATE NOTIFICATION
 * ================================================================
 *
 * IMPORTANT:
 *
 * This helper receives the SAME database client used by the
 * transfer transaction.
 *
 * Therefore:
 *
 * BEGIN
 *   transfer
 *   receipt
 *   notification
 * COMMIT
 *
 * If notification creation fails, the whole transfer rolls back.
 * ================================================================
 */

async function createNotification(
  client,
  userId,
  title,
  message
) {
  if (!userId) {
    return;
  }

  await client.query(
    `
    INSERT INTO notifications (
      user_id,
      title,
      message
    )
    VALUES (
      $1,
      $2,
      $3
    )
    `,
    [
      userId,
      title,
      message,
    ]
  );
}


/*
 * ================================================================
 * GET USER ACCOUNTS
 * ================================================================
 *
 * GET /transfers/accounts
 *
 * Returns accounts belonging to the authenticated user.
 * ================================================================
 */

router.get(
  "/accounts",
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
          ORDER BY
            CASE
              WHEN LOWER(account_type) = 'savings'
              THEN 0
              ELSE 1
            END,
            created_at ASC
          `,
          [
            req.user.userId,
          ]
        );

      return res.json({
        success: true,
        message:
          "Transfer accounts retrieved successfully.",
        data: {
          accounts:
            result.rows,
        },
      });
    } catch (error) {
      console.error(
        "Transfer accounts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve transfer accounts.",
      });
    }
  }
);


/*
 * ================================================================
 * RESOLVE INTERNAL NOVABANK RECIPIENT
 * ================================================================
 *
 * GET /transfers/recipient/:accountNumber
 * ================================================================
 */

router.get(
  "/recipient/:accountNumber",
  authMiddleware,
  async (req, res) => {
    try {
      const accountNumber =
        normalizeAccountNumber(
          req.params.accountNumber
        );

      if (
        !/^\d{10}$/.test(
          accountNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid 10-digit NovaBank account number is required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            a.id,
            a.account_number,
            a.account_type,
            a.currency,
            a.status,
            u.full_name
          FROM accounts a
          INNER JOIN users u
            ON u.id = a.user_id
          WHERE
            a.account_number = $1
            AND LOWER(a.status) = 'active'
          LIMIT 1
          `,
          [
            accountNumber,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "NovaBank account not found.",
        });
      }

      const account =
        result.rows[0];

      return res.json({
        success: true,
        message:
          "NovaBank recipient verified successfully.",
        data: {
          account: {
            id:
              account.id,

            account_number:
              account.account_number,

            account_type:
              account.account_type,

            currency:
              account.currency,

            status:
              account.status,

            full_name:
              account.full_name,
          },
        },
      });
    } catch (error) {
      console.error(
        "NovaBank recipient lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify NovaBank account.",
      });
    }
  }
);


/*
 * ================================================================
 * INTERNAL NOVABANK TRANSFER
 * ================================================================
 *
 * POST /transfers
 * ================================================================
 */

router.post(
  "/",
  authMiddleware,
  transactionPinMiddleware,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        senderAccountId,
        receiverAccountNumber,
        description,
      } = req.body;

      const amount =
        parseAmount(
          req.body.amount
        );

      if (!senderAccountId) {
        return res.status(400).json({
          success: false,
          message:
            "Sender account is required.",
        });
      }

      if (!receiverAccountNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Receiver account number is required.",
        });
      }

      if (amount === null) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid transfer amount.",
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        String(description).length > 255
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        });
      }

      await client.query(
        "BEGIN"
      );


      /*
       * LOCK SENDER
       */

      const senderResult =
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
          WHERE
            id = $1
            AND user_id = $2
          FOR UPDATE
          `,
          [
            senderAccountId,
            req.user.userId,
          ]
        );

      if (
        senderResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Sender account not found.",
        });
      }

      const sender =
        senderResult.rows[0];


      /*
       * SENDER STATUS
       */

      if (
        String(
          sender.status
        ).toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Sender account is not active.",
        });
      }


      /*
       * LOCK RECEIVER
       */

      const receiverResult =
        await client.query(
          `
          SELECT
            a.id,
            a.user_id,
            a.account_number,
            a.account_type,
            a.balance,
            a.currency,
            a.status,
            u.full_name
          FROM accounts a
          INNER JOIN users u
            ON u.id = a.user_id
          WHERE
            a.account_number = $1
          FOR UPDATE
          `,
          [
            receiverAccountNumber,
          ]
        );

      if (
        receiverResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Recipient account not found.",
        });
      }

      const receiver =
        receiverResult.rows[0];


      /*
       * SAME ACCOUNT PROTECTION
       */

      if (
        sender.id ===
        receiver.id
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "You cannot transfer money to the same account.",
        });
      }


      /*
       * RECEIVER STATUS
       */

      if (
        String(
          receiver.status
        ).toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Recipient account is not active.",
        });
      }


      /*
       * CURRENCY PROTECTION
       */

      if (
        sender.currency !==
        receiver.currency
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Sender and recipient currencies must match.",
        });
      }


      /*
       * BALANCE
       */

      const senderBalance =
        Number(
          sender.balance
        );

      if (
        !Number.isFinite(
          senderBalance
        ) ||
        senderBalance < amount
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Insufficient funds.",
        });
      }


      /*
       * DEBIT SENDER
       */

      await client.query(
        `
        UPDATE accounts
        SET balance = balance - $1
        WHERE id = $2
        `,
        [
          amount,
          sender.id,
        ]
      );


      /*
       * CREDIT RECEIVER
       */

      await client.query(
        `
        UPDATE accounts
        SET balance = balance + $1
        WHERE id = $2
        `,
        [
          amount,
          receiver.id,
        ]
      );


      /*
       * REFERENCE
       */

      const reference =
        generateReference(
          "INT"
        );


      /*
       * RECORD TRANSACTION
       */

      const transactionResult =
        await client.query(
          `
          INSERT INTO transactions (
            sender_account_id,
            receiver_account_id,
            amount,
            transaction_type,
            description,
            reference,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING
            id,
            amount,
            transaction_type,
            description,
            reference,
            status,
            created_at
          `,
          [
            sender.id,
            receiver.id,
            amount,
            "TRANSFER",
            description
              ? String(
                  description
                ).trim()
              : null,
            reference,
            "SUCCESS",
          ]
        );


      const transaction =
        transactionResult.rows[0];


      /*
       * CREATE RECEIPT
       */

      const receiptNumber =
        `RCP-${transaction.reference}`;

      await client.query(
        `
        INSERT INTO receipts (
          transaction_id,
          receipt_number
        )
        VALUES (
          $1,
          $2
        )
        `,
        [
          transaction.id,
          receiptNumber,
        ]
      );


      /*
       * ==========================================================
       * CREATE INTERNAL TRANSFER NOTIFICATIONS
       * ==========================================================
       */

      const formattedAmount =
        formatNotificationAmount(
          amount,
          sender.currency
        );

      /*
       * If sender and receiver are different users,
       * create one notification for each.
       */

      if (
        String(
          sender.user_id
        ) !==
        String(
          receiver.user_id
        )
      ) {
        await createNotification(
          client,
          sender.user_id,
          "Transfer successful",
          `${formattedAmount} was sent to ${receiver.full_name}.`
        );

        await createNotification(
          client,
          receiver.user_id,
          "Money received",
          `${formattedAmount} was received from a NovaBank customer.`
        );
      } else {
        /*
         * Same user, different accounts.
         *
         * Avoid creating two notifications for the
         * same person.
         */

        await createNotification(
          client,
          sender.user_id,
          "Transfer successful",
          `${formattedAmount} was transferred successfully between your NovaBank accounts.`
        );
      }


      /*
       * COMMIT
       */

      await client.query(
        "COMMIT"
      );


      return res.status(201).json({
        success: true,
        message:
          "Transfer completed successfully.",
        data: {
          transaction,

          receipt: {
            receipt_number:
              receiptNumber,
          },
        },
      });

    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (_) {}

      console.error(
        "Internal transfer error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete transfer.",
      });
    } finally {
      client.release();
    }
  }
);


/*
 * ================================================================
 * GET EXTERNAL BANKS
 * ================================================================
 */

router.get(
  "/external/banks",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            id,
            bank_code,
            bank_name,
            country,
            currency,
            bank_type,
            is_active
          FROM external_banks
          WHERE
            is_active = true
            AND bank_type = 'DOMESTIC'
            AND country = 'Nigeria'
          ORDER BY bank_name ASC
          `
        );

      return res.json({
        success: true,
        message:
          "External banks retrieved successfully.",
        data: {
          banks:
            result.rows,
        },
      });
    } catch (error) {
      console.error(
        "External banks error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve external banks.",
      });
    }
  }
);


/*
 * ================================================================
 * RESOLVE EXTERNAL RECIPIENT
 * ================================================================
 */

router.get(
  "/external/recipient/:bankCode/:accountNumber",
  authMiddleware,
  async (req, res) => {
    try {
      const bankCode =
        normalizeBankCode(
          req.params.bankCode
        );

      const accountNumber =
        normalizeAccountNumber(
          req.params.accountNumber
        );

      if (!bankCode) {
        return res.status(400).json({
          success: false,
          message:
            "Bank code is required.",
        });
      }

      if (
        !/^\d{10}$/.test(
          accountNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid 10-digit Nigerian account number is required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            ea.id,
            ea.account_number,
            ea.account_name,
            ea.currency,
            ea.balance,
            ea.country,
            ea.status,
            eb.bank_code,
            eb.bank_name,
            eb.bank_type
          FROM external_accounts ea
          INNER JOIN external_banks eb
            ON eb.id = ea.bank_id
          WHERE
            eb.bank_code = $1
            AND ea.account_number = $2
            AND eb.is_active = true
            AND ea.status = 'Active'
          LIMIT 1
          `,
          [
            bankCode,
            accountNumber,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Bank account could not be found.",
        });
      }

      const account =
        result.rows[0];

      return res.json({
        success: true,
        message:
          "Recipient account verified successfully.",
        data: {
          account: {
            id:
              account.id,

            account_number:
              account.account_number,

            account_name:
              account.account_name,

            currency:
              account.currency,

            country:
              account.country,

            status:
              account.status,

            bank_code:
              account.bank_code,

            bank_name:
              account.bank_name,

            bank_type:
              account.bank_type,
          },
        },
      });

    } catch (error) {
      console.error(
        "External recipient lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify external account.",
      });
    }
  }
);


/*
 * ================================================================
 * EXTERNAL DOMESTIC TRANSFER
 * ================================================================
 */

router.post(
  "/external",
  authMiddleware,
  transactionPinMiddleware,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        senderAccountId,
        bankCode,
        receiverAccountNumber,
        description,
      } = req.body;

      const amount =
        parseAmount(
          req.body.amount
        );

      const normalizedBankCode =
        normalizeBankCode(
          bankCode
        );

      const normalizedAccountNumber =
        normalizeAccountNumber(
          receiverAccountNumber
        );

      if (!senderAccountId) {
        return res.status(400).json({
          success: false,
          message:
            "Sender account is required.",
        });
      }

      if (!normalizedBankCode) {
        return res.status(400).json({
          success: false,
          message:
            "Recipient bank is required.",
        });
      }

      if (
        !/^\d{10}$/.test(
          normalizedAccountNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid 10-digit Nigerian account number is required.",
        });
      }

      if (amount === null) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid transfer amount.",
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        String(description).length > 255
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        });
      }

      const fee =
        EXTERNAL_TRANSFER_FEE;

      const totalDebit =
        Number(
          (
            amount +
            fee
          ).toFixed(2)
        );

      await client.query(
        "BEGIN"
      );


      /*
       * LOCK SENDER
       */

      const senderResult =
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
          WHERE
            id = $1
            AND user_id = $2
          FOR UPDATE
          `,
          [
            senderAccountId,
            req.user.userId,
          ]
        );

      if (
        senderResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Sender account not found.",
        });
      }

      const sender =
        senderResult.rows[0];


      if (
        String(
          sender.status
        ).toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Sender account is not active.",
        });
      }


      /*
       * External domestic transfers require NGN.
       */

      if (
        String(
          sender.currency
        ).toUpperCase() !==
        "NGN"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Other Nigerian bank transfers currently require an NGN account.",
        });
      }


      /*
       * LOCK BANK
       */

      const bankResult =
        await client.query(
          `
          SELECT
            id,
            bank_code,
            bank_name,
            country,
            currency,
            bank_type,
            is_active
          FROM external_banks
          WHERE
            bank_code = $1
            AND is_active = true
            AND bank_type = 'DOMESTIC'
            AND country = 'Nigeria'
          FOR UPDATE
          `,
          [
            normalizedBankCode,
          ]
        );

      if (
        bankResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Selected bank is unavailable.",
        });
      }

      const bank =
        bankResult.rows[0];


      /*
       * LOCK EXTERNAL ACCOUNT
       */

      const receiverResult =
        await client.query(
          `
          SELECT
            ea.id,
            ea.bank_id,
            ea.account_number,
            ea.account_name,
            ea.currency,
            ea.balance,
            ea.country,
            ea.status
          FROM external_accounts ea
          WHERE
            ea.bank_id = $1
            AND ea.account_number = $2
          FOR UPDATE
          `,
          [
            bank.id,
            normalizedAccountNumber,
          ]
        );

      if (
        receiverResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Recipient bank account could not be found.",
        });
      }

      const receiver =
        receiverResult.rows[0];


      if (
        String(
          receiver.status
        ).toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Recipient account is not active.",
        });
      }


      /*
       * Currency consistency.
       */

      if (
        String(
          receiver.currency
        ).toUpperCase() !==
        "NGN"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "The selected external account does not support NGN transfers.",
        });
      }


      /*
       * BALANCE
       */

      const senderBalance =
        Number(
          sender.balance
        );

      if (
        !Number.isFinite(
          senderBalance
        ) ||
        senderBalance <
          totalDebit
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Insufficient funds for this transfer and fee.",
          data: {
            amount,
            fee,
            totalDebit,
            availableBalance:
              senderBalance,
          },
        });
      }


      /*
       * DEBIT
       */

      await client.query(
        `
        UPDATE accounts
        SET balance = balance - $1
        WHERE id = $2
        `,
        [
          totalDebit,
          sender.id,
        ]
      );


      /*
       * CREDIT EXTERNAL ACCOUNT
       */

      await client.query(
        `
        UPDATE external_accounts
        SET balance = balance + $1
        WHERE id = $2
        `,
        [
          amount,
          receiver.id,
        ]
      );


      /*
       * RECORD EXTERNAL TRANSACTION
       */

      const reference =
        generateReference(
          "EXT"
        );

      const transactionResult =
        await client.query(
          `
          INSERT INTO external_transactions (
            sender_account_id,
            receiver_external_account_id,
            amount,
            source_currency,
            destination_currency,
            transaction_type,
            fee,
            description,
            reference,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )
          RETURNING
            id,
            sender_account_id,
            receiver_external_account_id,
            amount,
            source_currency,
            destination_currency,
            transaction_type,
            fee,
            description,
            reference,
            status,
            created_at
          `,
          [
            sender.id,
            receiver.id,
            amount,
            sender.currency,
            receiver.currency,
            "DOMESTIC_TRANSFER",
            fee,
            description
              ? String(
                  description
                ).trim()
              : null,
            reference,
            "SUCCESS",
          ]
        );

      const transaction =
        transactionResult.rows[0];


      /*
       * CREATE RECEIPT
       */

      const receiptNumber =
        `RCP-${transaction.reference}`;

      await client.query(
        `
        INSERT INTO receipts (
          transaction_id,
          external_transaction_id,
          receipt_number
        )
        VALUES (
          NULL,
          $1,
          $2
        )
        `,
        [
          transaction.id,
          receiptNumber,
        ]
      );


      /*
       * ==========================================================
       * CREATE EXTERNAL TRANSFER NOTIFICATION
       * ==========================================================
       */

      const formattedAmount =
        formatNotificationAmount(
          amount,
          sender.currency
        );

      await createNotification(
        client,
        sender.user_id,
        "External transfer successful",
        `${formattedAmount} was sent to ${receiver.account_name} at ${bank.bank_name}.`
      );


      /*
       * COMMIT
       */

      await client.query(
        "COMMIT"
      );


      return res.status(201).json({
        success: true,
        message:
          "External transfer completed successfully.",
        data: {
          transaction,

          receipt: {
            receipt_number:
              receiptNumber,
          },

          sender: {
            account_number:
              sender.account_number,

            account_type:
              sender.account_type,

            currency:
              sender.currency,

            balance_before:
              senderBalance,

            balance_after:
              Number(
                (
                  senderBalance -
                  totalDebit
                ).toFixed(2)
              ),
          },

          recipient: {
            account_name:
              receiver.account_name,

            account_number:
              receiver.account_number,

            bank_code:
              bank.bank_code,

            bank_name:
              bank.bank_name,

            currency:
              receiver.currency,
          },

          amount,

          fee,

          totalDebit,
        },
      });

    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (_) {}

      console.error(
        "External transfer error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete external transfer.",
      });
    } finally {
      client.release();
    }
  }
);


/*
 * ================================================================
 * INTERNATIONAL TRANSFERS
 * ================================================================
 *
 * These transfers are simulated against the local
 * external_banks / external_accounts database.
 *
 * They do NOT connect to real SWIFT or banking rails.
 *
 * ================================================================
 */


/*
 * ================================================================
 * SUPPORTED INTERNATIONAL COUNTRIES
 * ================================================================
 */

router.get(
  "/international/countries",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT DISTINCT
            eb.country,
            eb.currency,
            eb.bank_type
          FROM external_banks eb
          WHERE
            eb.is_active = TRUE
            AND eb.bank_type = 'INTERNATIONAL'
          ORDER BY
            eb.country ASC,
            eb.currency ASC
          `
        );

      return res.json({
        success: true,

        message:
          "International transfer destinations retrieved successfully.",

        data: {
          countries:
            result.rows,
        },
      });
    } catch (error) {
      console.error(
        "International countries error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve international destinations.",
      });
    }
  }
);


/*
 * ================================================================
 * VERIFY INTERNATIONAL RECIPIENT
 * ================================================================
 */

router.post(
  "/international/verify",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        countryCode,
        country,
        currency,
        accountNumber,
        iban,
        swift,
      } = req.body;

      const normalizedCountryCode =
        String(
          countryCode || ""
        )
          .trim()
          .toUpperCase();

      const normalizedCountry =
        String(
          country || ""
        ).trim();

      const normalizedCurrency =
        String(
          currency || ""
        )
          .trim()
          .toUpperCase();

      const normalizedAccountNumber =
        String(
          accountNumber || ""
        ).trim();

      const normalizedIban =
        String(
          iban || ""
        )
          .trim()
          .toUpperCase();

      const normalizedSwift =
        String(
          swift || ""
        )
          .trim()
          .toUpperCase();


      /*
       * BASIC VALIDATION
       */

      if (
        !normalizedCountry &&
        !normalizedCountryCode
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Destination country is required.",
        });
      }

      if (!normalizedCurrency) {
        return res.status(400).json({
          success: false,
          message:
            "Destination currency is required.",
        });
      }

      if (
        !normalizedAccountNumber &&
        !normalizedIban
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account number or IBAN is required.",
        });
      }

      if (!normalizedSwift) {
        return res.status(400).json({
          success: false,
          message:
            "SWIFT/BIC code is required.",
        });
      }


      /*
       * FIND INTERNATIONAL BANK
       */

      const bankResult =
        await pool.query(
          `
          SELECT
            id,
            bank_code,
            bank_name,
            country,
            currency,
            bank_type,
            swift_code,
            is_active
          FROM external_banks
          WHERE
            is_active = TRUE
            AND bank_type = 'INTERNATIONAL'
            AND UPPER(currency) = $1
            AND UPPER(swift_code) = $2
            AND (
              UPPER(country) = UPPER($3)
              OR $4 = ''
            )
          LIMIT 1
          `,
          [
            normalizedCurrency,
            normalizedSwift,
            normalizedCountry,
            normalizedCountryCode,
          ]
        );


      if (
        bankResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "No supported international bank matches the supplied country, currency and SWIFT/BIC.",
        });
      }

      const bank =
        bankResult.rows[0];


      /*
       * FIND RECIPIENT ACCOUNT
       */

      const accountResult =
        await pool.query(
          `
          SELECT
            ea.id,
            ea.account_number,
            ea.account_name,
            ea.currency,
            ea.balance,
            ea.country,
            ea.status,

            eb.id AS bank_id,
            eb.bank_code,
            eb.bank_name,
            eb.country AS bank_country,
            eb.currency AS bank_currency,
            eb.bank_type,
            eb.swift_code
          FROM external_accounts ea

          INNER JOIN external_banks eb
            ON eb.id = ea.bank_id

          WHERE
            ea.bank_id = $1
            AND ea.status = 'Active'
            AND (
              (
                $2 <> ''
                AND ea.account_number = $2
              )
              OR
              (
                $3 <> ''
                AND UPPER(ea.iban) = $3
              )
            )

          LIMIT 1
          `,
          [
            bank.id,
            normalizedAccountNumber,
            normalizedIban,
          ]
        );


      if (
        accountResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "International recipient account could not be verified.",
        });
      }


      const account =
        accountResult.rows[0];


      /*
       * RESPONSE
       */

      return res.json({
        success: true,

        message:
          "International recipient verified successfully.",

        data: {
          recipient: {
            id:
              account.id,

            account_number:
              account.account_number,

            account_name:
              account.account_name,

            currency:
              account.currency,

            country:
              account.country,

            status:
              account.status,

            bank_code:
              account.bank_code,

            bank_name:
              account.bank_name,

            bank_type:
              account.bank_type,

            swift_code:
              account.swift_code,

            iban:
              account.iban || null,
          },
        },
      });

    } catch (error) {
      console.error(
        "International recipient verification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify international recipient.",
      });
    }
  }
);


/*
 * ================================================================
 * EXECUTE INTERNATIONAL TRANSFER
 * ================================================================
 *
 * POST /transfers/international
 * ================================================================
 */

router.post(
  "/international",
  authMiddleware,
  transactionPinMiddleware,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        senderAccountId,
        countryCode,
        country,
        currency,
        accountNumber,
        iban,
        swift,
        amount,
        description,
      } = req.body;


      /*
       * NORMALIZE INPUT
       */

      const normalizedCountryCode =
        String(
          countryCode || ""
        )
          .trim()
          .toUpperCase();

      const normalizedCountry =
        String(
          country || ""
        ).trim();

      const normalizedCurrency =
        String(
          currency || ""
        )
          .trim()
          .toUpperCase();

      const normalizedAccountNumber =
        String(
          accountNumber || ""
        ).trim();

      const normalizedIban =
        String(
          iban || ""
        )
          .trim()
          .toUpperCase();

      const normalizedSwift =
        String(
          swift || ""
        )
          .trim()
          .toUpperCase();

      const normalizedDescription =
        String(
          description || ""
        ).trim();

      const transferAmount =
        Number(amount);


      /*
       * INPUT VALIDATION
       */

      if (!senderAccountId) {
        return res.status(400).json({
          success: false,
          message:
            "Sender account is required.",
        });
      }

      if (
        !normalizedCountry &&
        !normalizedCountryCode
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Destination country is required.",
        });
      }

      if (!normalizedCurrency) {
        return res.status(400).json({
          success: false,
          message:
            "Destination currency is required.",
        });
      }

      if (
        !normalizedAccountNumber &&
        !normalizedIban
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account number or IBAN is required.",
        });
      }

      if (!normalizedSwift) {
        return res.status(400).json({
          success: false,
          message:
            "SWIFT/BIC code is required.",
        });
      }

      if (
        !Number.isFinite(
          transferAmount
        ) ||
        transferAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid transfer amount is required.",
        });
      }

      if (
        Math.round(
          transferAmount * 100
        ) !==
        transferAmount * 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount can have a maximum of two decimal places.",
        });
      }


      const amountRounded =
        Number(
          transferAmount.toFixed(2)
        );


      /*
       * BEGIN TRANSACTION
       */

      await client.query(
        "BEGIN"
      );


      /*
       * LOCK SENDER ACCOUNT
       */

      const senderResult =
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
          WHERE
            id = $1
            AND user_id = $2
          FOR UPDATE
          `,
          [
            senderAccountId,
            req.user.userId,
          ]
        );


      if (
        senderResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Sender account not found.",
        });
      }


      const sender =
        senderResult.rows[0];


      /*
       * SENDER VALIDATION
       */

      if (
        String(
          sender.status
        ).toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Sender account is not active.",
        });
      }


      /*
       * INTERNATIONAL BANK
       */

      const bankResult =
        await client.query(
          `
          SELECT
            id,
            bank_code,
            bank_name,
            country,
            currency,
            bank_type,
            swift_code,
            is_active
          FROM external_banks
          WHERE
            is_active = TRUE
            AND bank_type = 'INTERNATIONAL'
            AND UPPER(currency) = $1
            AND UPPER(swift_code) = $2
            AND (
              UPPER(country) = UPPER($3)
              OR $4 = ''
            )
          LIMIT 1
          `,
          [
            normalizedCurrency,
            normalizedSwift,
            normalizedCountry,
            normalizedCountryCode,
          ]
        );


      if (
        bankResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "Supported international bank not found.",
        });
      }


      const bank =
        bankResult.rows[0];


      /*
       * LOCK RECIPIENT ACCOUNT
       */

      const recipientResult =
        await client.query(
          `
          SELECT
            ea.id,
            ea.bank_id,
            ea.account_number,
            ea.account_name,
            ea.currency,
            ea.balance,
            ea.country,
            ea.status,

            eb.bank_code,
            eb.bank_name,
            eb.country AS bank_country,
            eb.currency AS bank_currency,
            eb.bank_type,
            eb.swift_code
          FROM external_accounts ea

          INNER JOIN external_banks eb
            ON eb.id = ea.bank_id

          WHERE
            ea.bank_id = $1
            AND ea.status = 'Active'
            AND (
              (
                $2 <> ''
                AND ea.account_number = $2
              )
              OR
              (
                $3 <> ''
                AND UPPER(ea.iban) = $3
              )
            )

          FOR UPDATE

          LIMIT 1
          `,
          [
            bank.id,
            normalizedAccountNumber,
            normalizedIban,
          ]
        );


      if (
        recipientResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          success: false,
          message:
            "International recipient account not found.",
        });
      }


      const recipient =
        recipientResult.rows[0];


      /*
       * CURRENCY VALIDATION
       */

      if (
        String(
          sender.currency
        ).toUpperCase() !==
        String(
          bank.currency
        ).toUpperCase()
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            `Your ${sender.currency} account cannot directly fund a ${bank.currency} international transfer.`,
        });
      }


      if (
        String(
          recipient.currency
        ).toUpperCase() !==
        String(
          bank.currency
        ).toUpperCase()
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "Recipient currency does not match the destination bank currency.",
        });
      }


      /*
       * SAME ACCOUNT PROTECTION
       */

      if (
        sender.account_number ===
        recipient.account_number
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            "You cannot transfer money to the same account.",
        });
      }


      /*
       * FEE
       */

      const fee =
        INTERNATIONAL_TRANSFER_FEE;

      const totalDebit =
        Number(
          (
            amountRounded +
            fee
          ).toFixed(2)
        );


      /*
       * BALANCE
       */

      const senderBalance =
        Number(
          sender.balance
        );

      if (
        senderBalance <
        totalDebit
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,
          message:
            `Insufficient funds. You need ${totalDebit.toFixed(2)} ${sender.currency} including the international transfer fee.`,
        });
      }


      /*
       * REFERENCE
       */

      const reference =
        generateReference(
          "INT"
        );


      /*
       * DEBIT SENDER
       */

      await client.query(
        `
        UPDATE accounts
        SET
          balance =
            balance - $1
        WHERE
          id = $2
        `,
        [
          totalDebit,
          sender.id,
        ]
      );


      /*
       * CREDIT EXTERNAL ACCOUNT
       */

      await client.query(
        `
        UPDATE external_accounts
        SET
          balance =
            balance + $1
        WHERE
          id = $2
        `,
        [
          amountRounded,
          recipient.id,
        ]
      );


      /*
       * RECORD INTERNATIONAL TRANSACTION
       */

      const transactionResult =
        await client.query(
          `
          INSERT INTO external_transactions (
            sender_account_id,
            receiver_external_account_id,
            amount,
            source_currency,
            destination_currency,
            transaction_type,
            fee,
            description,
            reference,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )
          RETURNING
            id,
            sender_account_id,
            receiver_external_account_id,
            amount,
            source_currency,
            destination_currency,
            transaction_type,
            fee,
            description,
            reference,
            status,
            created_at
          `,
          [
            sender.id,
            recipient.id,
            amountRounded,
            sender.currency,
            recipient.currency,
            "INTERNATIONAL_TRANSFER",
            fee,
            normalizedDescription ||
              null,
            reference,
            "SUCCESS",
          ]
        );


      const transaction =
        transactionResult.rows[0];


      /*
       * CREATE RECEIPT
       */

      const receiptNumber =
        `RCP-${transaction.reference}`;

      await client.query(
        `
        INSERT INTO receipts (
          transaction_id,
          external_transaction_id,
          receipt_number
        )
        VALUES (
          NULL,
          $1,
          $2
        )
        `,
        [
          transaction.id,
          receiptNumber,
        ]
      );


      /*
       * ==========================================================
       * CREATE INTERNATIONAL TRANSFER NOTIFICATION
       * ==========================================================
       */

      const formattedAmount =
        formatNotificationAmount(
          amountRounded,
          sender.currency
        );

      await createNotification(
        client,
        sender.user_id,
        "International transfer successful",
        `${formattedAmount} was sent to ${recipient.account_name} at ${recipient.bank_name}.`
      );


      /*
       * COMMIT
       */

      await client.query(
        "COMMIT"
      );


      /*
       * RESPONSE
       */

      return res.status(201).json({
        success: true,

        message:
          "International transfer completed successfully.",

        data: {
          transaction,

          receipt: {
            receipt_number:
              receiptNumber,
          },

          recipient: {
            account_number:
              recipient.account_number,

            account_name:
              recipient.account_name,

            currency:
              recipient.currency,

            country:
              recipient.country,

            bank_code:
              recipient.bank_code,

            bank_name:
              recipient.bank_name,

            swift_code:
              recipient.swift_code,

            iban:
              recipient.iban ||
              null,
          },

          fee,

          totalDebit,

          currency:
            sender.currency,
        },
      });

    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        console.error(
          "International transfer rollback error:",
          rollbackError
        );
      }

      console.error(
        "International transfer error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete international transfer.",
      });
    } finally {
      client.release();
    }
  }
);


/*
 * ================================================================
 * EXPORT
 * ================================================================
 */

module.exports = router;