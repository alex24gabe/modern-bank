const express = require("express");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * BENEFICIARIES
 * ================================================================
 *
 * Customer-side saved NovaBank recipients.
 *
 * Database:
 *
 * beneficiaries
 *   id
 *   user_id
 *   beneficiary_account_id
 *   nickname
 *   created_at
 *
 * Important:
 * - A beneficiary belongs to the authenticated user.
 * - The beneficiary points to an existing NovaBank account.
 * - Users cannot save their own account as a beneficiary.
 * - Account details are resolved from the accounts table.
 */


/*
 * ================================================================
 * GET ALL BENEFICIARIES
 * ================================================================
 *
 * GET /beneficiaries
 *
 * Returns only beneficiaries belonging to the authenticated user.
 */

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          b.id,
          b.nickname,
          b.created_at,

          a.id AS account_id,
          a.account_number,
          a.account_type,
          a.currency,
          a.status,

          u.id AS owner_id,
          u.full_name AS owner_name

        FROM beneficiaries b

        INNER JOIN accounts a
          ON a.id = b.beneficiary_account_id

        INNER JOIN users u
          ON u.id = a.user_id

        WHERE b.user_id = $1

        ORDER BY b.created_at DESC
        `,
        [req.user.userId]
      );

      const beneficiaries =
        result.rows.map(
          (beneficiary) => ({
            id: beneficiary.id,

            nickname:
              beneficiary.nickname || "",

            created_at:
              beneficiary.created_at,

            account: {
              id:
                beneficiary.account_id,

              account_number:
                beneficiary.account_number,

              account_type:
                beneficiary.account_type,

              currency:
                beneficiary.currency,

              status:
                beneficiary.status,

              owner: {
                id:
                  beneficiary.owner_id,

                full_name:
                  beneficiary.owner_name,
              },
            },
          })
        );

      return res.json({
        success: true,

        message:
          "Beneficiaries retrieved successfully.",

        data: {
          beneficiaries,
        },
      });
    } catch (error) {
      console.error(
        "Get beneficiaries error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve beneficiaries.",
      });
    }
  }
);


/*
 * ================================================================
 * GET SINGLE BENEFICIARY
 * ================================================================
 *
 * GET /beneficiaries/:id
 *
 * Returns a beneficiary only if it belongs to
 * the authenticated user.
 */

router.get(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          b.id,
          b.nickname,
          b.created_at,

          a.id AS account_id,
          a.account_number,
          a.account_type,
          a.currency,
          a.status,

          u.id AS owner_id,
          u.full_name AS owner_name

        FROM beneficiaries b

        INNER JOIN accounts a
          ON a.id = b.beneficiary_account_id

        INNER JOIN users u
          ON u.id = a.user_id

        WHERE
          b.id = $1
          AND b.user_id = $2

        LIMIT 1
        `,
        [
          req.params.id,
          req.user.userId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,

          message:
            "Beneficiary not found.",
        });
      }

      const beneficiary =
        result.rows[0];

      return res.json({
        success: true,

        message:
          "Beneficiary retrieved successfully.",

        data: {
          beneficiary: {
            id:
              beneficiary.id,

            nickname:
              beneficiary.nickname || "",

            created_at:
              beneficiary.created_at,

            account: {
              id:
                beneficiary.account_id,

              account_number:
                beneficiary.account_number,

              account_type:
                beneficiary.account_type,

              currency:
                beneficiary.currency,

              status:
                beneficiary.status,

              owner: {
                id:
                  beneficiary.owner_id,

                full_name:
                  beneficiary.owner_name,
              },
            },
          },
        },
      });
    } catch (error) {
      console.error(
        "Get beneficiary error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve beneficiary.",
      });
    }
  }
);


/*
 * ================================================================
 * ADD BENEFICIARY
 * ================================================================
 *
 * POST /beneficiaries
 *
 * Body:
 *
 * {
 *   "accountNumber": "1234567890",
 *   "nickname": "Sarah"
 * }
 *
 * We deliberately accept accountNumber instead of exposing
 * internal account UUIDs to the client.
 */

router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        accountNumber,
        nickname,
      } = req.body;

      /*
       * ------------------------------------------------------------
       * VALIDATION
       * ------------------------------------------------------------
       */

      if (
        typeof accountNumber !==
          "string" ||
        !accountNumber.trim()
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Account number is required.",
        });
      }

      const normalizedAccountNumber =
        accountNumber.trim();

      let normalizedNickname =
        null;

      if (
        nickname !== undefined &&
        nickname !== null
      ) {
        if (
          typeof nickname !==
          "string"
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Nickname must be a string.",
          });
        }

        normalizedNickname =
          nickname.trim();

        if (
          normalizedNickname.length >
          100
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Nickname cannot exceed 100 characters.",
          });
        }

        if (
          normalizedNickname.length ===
          0
        ) {
          normalizedNickname = null;
        }
      }

      await client.query(
        "BEGIN"
      );

      /*
       * ------------------------------------------------------------
       * FIND BENEFICIARY ACCOUNT
       * ------------------------------------------------------------
       */

      const accountResult =
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

            u.full_name AS owner_name

          FROM accounts a

          INNER JOIN users u
            ON u.id = a.user_id

          WHERE
            a.account_number = $1

          LIMIT 1
          `,
          [
            normalizedAccountNumber,
          ]
        );

      if (
        accountResult.rows.length ===
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

      const account =
        accountResult.rows[0];

      /*
       * ------------------------------------------------------------
       * PREVENT SELF-BENEFICIARY
       * ------------------------------------------------------------
       */

      if (
        account.user_id ===
        req.user.userId
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,

          message:
            "You cannot add your own account as a beneficiary.",
        });
      }

      /*
       * ------------------------------------------------------------
       * ACCOUNT STATUS
       * ------------------------------------------------------------
       */

      if (
        String(account.status)
          .toLowerCase() !==
        "active"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          success: false,

          message:
            "This account is not active and cannot be added as a beneficiary.",
        });
      }

      /*
       * ------------------------------------------------------------
       * DUPLICATE CHECK
       * ------------------------------------------------------------
       */

      const existingResult =
        await client.query(
          `
          SELECT
            id
          FROM beneficiaries

          WHERE
            user_id = $1
            AND beneficiary_account_id = $2

          LIMIT 1
          `,
          [
            req.user.userId,
            account.id,
          ]
        );

      if (
        existingResult.rows.length >
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          success: false,

          message:
            "This account is already saved as a beneficiary.",
        });
      }

      /*
       * ------------------------------------------------------------
       * CREATE BENEFICIARY
       * ------------------------------------------------------------
       */

      const insertResult =
        await client.query(
          `
          INSERT INTO beneficiaries (
            user_id,
            beneficiary_account_id,
            nickname
          )
          VALUES (
            $1,
            $2,
            $3
          )
          RETURNING
            id,
            nickname,
            created_at
          `,
          [
            req.user.userId,
            account.id,
            normalizedNickname,
          ]
        );

      await client.query(
        "COMMIT"
      );

      const created =
        insertResult.rows[0];

      return res.status(201).json({
        success: true,

        message:
          "Beneficiary added successfully.",

        data: {
          beneficiary: {
            id:
              created.id,

            nickname:
              created.nickname || "",

            created_at:
              created.created_at,

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

              owner: {
                id:
                  account.user_id,

                full_name:
                  account.owner_name,
              },
            },
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
        "Create beneficiary error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to add beneficiary.",
      });
    } finally {
      client.release();
    }
  }
);


/*
 * ================================================================
 * UPDATE BENEFICIARY
 * ================================================================
 *
 * PATCH /beneficiaries/:id
 *
 * Currently supports changing the nickname.
 *
 * Body:
 *
 * {
 *   "nickname": "My Brother"
 * }
 */

router.patch(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        nickname,
      } = req.body;

      if (
        nickname !== undefined &&
        nickname !== null &&
        typeof nickname !==
          "string"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Nickname must be a string.",
        });
      }

      if (
        nickname === undefined
      ) {
        return res.status(400).json({
          success: false,

          message:
            "No beneficiary changes were provided.",
        });
      }

      let normalizedNickname =
        null;

      if (
        nickname !== null
      ) {
        normalizedNickname =
          nickname.trim();

        if (
          normalizedNickname.length >
          100
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Nickname cannot exceed 100 characters.",
          });
        }

        if (
          normalizedNickname.length ===
          0
        ) {
          normalizedNickname = null;
        }
      }

      const result =
        await pool.query(
          `
          UPDATE beneficiaries

          SET nickname = $1

          WHERE
            id = $2
            AND user_id = $3

          RETURNING
            id,
            nickname,
            created_at,
            beneficiary_account_id
          `,
          [
            normalizedNickname,
            req.params.id,
            req.user.userId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Beneficiary not found.",
        });
      }

      /*
       * Fetch the updated account information.
       */

      const beneficiary =
        result.rows[0];

      const accountResult =
        await pool.query(
          `
          SELECT
            a.id,
            a.account_number,
            a.account_type,
            a.currency,
            a.status,

            u.id AS owner_id,
            u.full_name AS owner_name

          FROM accounts a

          INNER JOIN users u
            ON u.id = a.user_id

          WHERE a.id = $1

          LIMIT 1
          `,
          [
            beneficiary.beneficiary_account_id,
          ]
        );

      if (
        accountResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Beneficiary account no longer exists.",
        });
      }

      const account =
        accountResult.rows[0];

      return res.json({
        success: true,

        message:
          "Beneficiary updated successfully.",

        data: {
          beneficiary: {
            id:
              beneficiary.id,

            nickname:
              beneficiary.nickname || "",

            created_at:
              beneficiary.created_at,

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

              owner: {
                id:
                  account.owner_id,

                full_name:
                  account.owner_name,
              },
            },
          },
        },
      });
    } catch (error) {
      console.error(
        "Update beneficiary error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to update beneficiary.",
      });
    }
  }
);


/*
 * ================================================================
 * DELETE BENEFICIARY
 * ================================================================
 *
 * DELETE /beneficiaries/:id
 *
 * A user can only delete their own beneficiary.
 */

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          DELETE FROM beneficiaries

          WHERE
            id = $1
            AND user_id = $2

          RETURNING
            id
          `,
          [
            req.params.id,
            req.user.userId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Beneficiary not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Beneficiary removed successfully.",

        data: {
          beneficiaryId:
            result.rows[0].id,
        },
      });
    } catch (error) {
      console.error(
        "Delete beneficiary error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to remove beneficiary.",
      });
    }
  }
);


module.exports = router;
