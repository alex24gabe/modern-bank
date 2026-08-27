const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| JWT TOKEN
|--------------------------------------------------------------------------
*/

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post("/register", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      fullName,
      email,
      password,
      phone = "",
      address = "",
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await client.query(
        `
        SELECT id
        FROM users
        WHERE email = $1
        `,
        [normalizedEmail]
      );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    /*
     * ------------------------------------------------------------
     * CREATE USER
     * ------------------------------------------------------------
     *
     * role defaults to CUSTOMER at database level.
     *
     * We explicitly return it so the newly generated JWT
     * contains:
     *
     * role: "CUSTOMER"
     * ------------------------------------------------------------
     */

    const userResult =
      await client.query(
        `
        INSERT INTO users (
          full_name,
          email,
          password_hash,
          phone,
          address
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING
          id,
          full_name,
          email,
          phone,
          address,
          role,
          created_at
        `,
        [
          fullName.trim(),
          normalizedEmail,
          passwordHash,
          phone,
          address,
        ]
      );

    const user =
      userResult.rows[0];

    /*
     * ------------------------------------------------------------
     * CREATE DEFAULT SAVINGS ACCOUNT
     * ------------------------------------------------------------
     */

    let accountNumber;
    let accountCreated = false;

    while (!accountCreated) {
      accountNumber = String(
        Math.floor(
          1000000000 +
            Math.random() * 9000000000
        )
      );

      try {
        await client.query(
          `
          INSERT INTO accounts (
            user_id,
            account_number,
            account_type,
            balance,
            currency,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          `,
          [
            user.id,
            accountNumber,
            "SAVINGS",
            0,
            "NGN",
            "Active",
          ]
        );

        accountCreated = true;
      } catch (error) {
        /*
         * PostgreSQL unique violation.
         * Generate another account number.
         */

        if (error.code === "23505") {
          continue;
        }

        throw error;
      }
    }

    await client.query("COMMIT");

    /*
     * ------------------------------------------------------------
     * GENERATE JWT
     * ------------------------------------------------------------
     */

    const token =
      generateToken(user);

    return res.status(201).json({
      success: true,

      message:
        "Registration successful.",

      data: {
        user,

        account: {
          account_number:
            accountNumber,

          account_type:
            "SAVINGS",

          balance: 0,

          currency: "NGN",

          status: "Active",
        },

        token,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to create account.",
    });
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
     * ------------------------------------------------------------
     * FETCH USER
     * ------------------------------------------------------------
     *
     * IMPORTANT:
     * role is required here because generateToken()
     * includes user.role in the JWT.
     * ------------------------------------------------------------
     */

    const result =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          password_hash,
          phone,
          address,
          role
        FROM users
        WHERE email = $1
        `,
        [normalizedEmail]
      );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const user =
      result.rows[0];

    /*
     * ------------------------------------------------------------
     * VERIFY PASSWORD
     * ------------------------------------------------------------
     */

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /*
     * ------------------------------------------------------------
     * FETCH ACCOUNTS
     * ------------------------------------------------------------
     *
     * Admin users intentionally do not need an account.
     * Therefore this can legitimately return [].
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
          status
        FROM accounts
        WHERE user_id = $1
        ORDER BY created_at ASC
        `,
        [user.id]
      );

    /*
     * ------------------------------------------------------------
     * GENERATE JWT
     * ------------------------------------------------------------
     *
     * The JWT now contains:
     *
     * userId
     * email
     * role
     * ------------------------------------------------------------
     */

    const token =
      generateToken(user);

    /*
     * NEVER return password_hash
     * to the frontend.
     */

    delete user.password_hash;

    return res.json({
      success: true,

      message:
        "Login successful.",

      data: {
        user,

        accounts:
          accountResult.rows,

        token,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
|
| GET /auth/me
|
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const userResult =
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
          WHERE id = $1
          `,
          [req.user.userId]
        );

      if (
        userResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

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
          [req.user.userId]
        );

      return res.json({
        success: true,

        message:
          "User retrieved successfully.",

        data: {
          user:
            userResult.rows[0],

          accounts:
            accountResult.rows,
        },
      });
    } catch (error) {
      console.error(
        "Fetch current user error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve user.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
|
| PATCH /auth/profile
|
| Updates:
| - full name
| - phone
| - address
|
| Email remains unchanged.
|
|--------------------------------------------------------------------------
*/

router.patch(
  "/profile",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        fullName,
        phone,
        address,
      } = req.body;

      /*
       * ------------------------------------------------------------
       * AT LEAST ONE FIELD REQUIRED
       * ------------------------------------------------------------
       */

      if (
        fullName === undefined &&
        phone === undefined &&
        address === undefined
      ) {
        return res.status(400).json({
          success: false,

          message:
            "At least one profile field is required.",
        });
      }

      /*
       * ------------------------------------------------------------
       * NORMALIZE VALUES
       * ------------------------------------------------------------
       */

      const normalizedFullName =
        fullName !== undefined
          ? String(fullName).trim()
          : null;

      const normalizedPhone =
        phone !== undefined
          ? String(phone).trim()
          : null;

      const normalizedAddress =
        address !== undefined
          ? String(address).trim()
          : null;

      /*
       * ------------------------------------------------------------
       * FULL NAME VALIDATION
       * ------------------------------------------------------------
       */

      if (
        fullName !== undefined &&
        !normalizedFullName
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Full name cannot be empty.",
        });
      }

      if (
        normalizedFullName &&
        normalizedFullName.length > 120
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Full name cannot exceed 120 characters.",
        });
      }

      /*
       * ------------------------------------------------------------
       * PHONE VALIDATION
       * ------------------------------------------------------------
       */

      if (
        normalizedPhone &&
        normalizedPhone.length > 30
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Phone number cannot exceed 30 characters.",
        });
      }

      /*
       * ------------------------------------------------------------
       * ADDRESS VALIDATION
       * ------------------------------------------------------------
       */

      if (
        normalizedAddress &&
        normalizedAddress.length > 500
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Address cannot exceed 500 characters.",
        });
      }

      /*
       * ------------------------------------------------------------
       * UPDATE AUTHENTICATED USER ONLY
       * ------------------------------------------------------------
       */

      const result =
        await pool.query(
          `
          UPDATE users
          SET
            full_name =
              COALESCE(
                $1,
                full_name
              ),

            phone =
              COALESCE(
                $2,
                phone
              ),

            address =
              COALESCE(
                $3,
                address
              )

          WHERE id = $4

          RETURNING
            id,
            full_name,
            email,
            phone,
            address,
            role,
            created_at
          `,
          [
            normalizedFullName,
            normalizedPhone,
            normalizedAddress,
            req.user.userId,
          ]
        );

      /*
       * ------------------------------------------------------------
       * USER NOT FOUND
       * ------------------------------------------------------------
       */

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "User not found.",
        });
      }

      /*
       * ------------------------------------------------------------
       * SUCCESS
       * ------------------------------------------------------------
       */

      return res.json({
        success: true,

        message:
          "Profile updated successfully.",

        data: {
          user:
            result.rows[0],
        },
      });
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to update profile.",
      });
    }
  }
);

module.exports = router;