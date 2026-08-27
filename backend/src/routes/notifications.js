const express = require("express");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ================================================================
 * GET NOTIFICATIONS
 * ================================================================
 *
 * GET /notifications
 *
 * Returns notifications belonging only to the authenticated user.
 *
 * Optional query:
 *
 * ?limit=20
 *
 * ================================================================
 */

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      let limit = Number(
        req.query.limit
      );

      if (
        !Number.isInteger(limit) ||
        limit <= 0
      ) {
        limit = 20;
      }

      /*
       * Prevent unnecessarily large queries.
       */

      limit = Math.min(
        limit,
        100
      );

      const result =
        await pool.query(
          `
          SELECT
            id,
            title,
            message,
            is_read,
            created_at
          FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
          `,
          [
            req.user.userId,
            limit,
          ]
        );

      return res.json({
        success: true,

        message:
          "Notifications retrieved successfully.",

        data: {
          notifications:
            result.rows,
        },
      });
    } catch (error) {
      console.error(
        "Notifications retrieval error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve notifications.",
      });
    }
  }
);


/*
 * ================================================================
 * GET UNREAD NOTIFICATION COUNT
 * ================================================================
 *
 * GET /notifications/unread-count
 *
 * ================================================================
 */

router.get(
  "/unread-count",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE
            user_id = $1
            AND is_read = false
          `,
          [
            req.user.userId,
          ]
        );

      return res.json({
        success: true,

        message:
          "Unread notification count retrieved successfully.",

        data: {
          count:
            result.rows[0].count,
        },
      });
    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve unread notification count.",
      });
    }
  }
);


/*
 * ================================================================
 * MARK SINGLE NOTIFICATION AS READ
 * ================================================================
 *
 * PATCH /notifications/:id/read
 *
 * ================================================================
 */

router.patch(
  "/:id/read",
  authMiddleware,
  async (req, res) => {
    try {
      const notificationId =
        String(
          req.params.id || ""
        ).trim();

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message:
            "Notification ID is required.",
        });
      }

      const result =
        await pool.query(
          `
          UPDATE notifications
          SET is_read = true
          WHERE
            id = $1
            AND user_id = $2
          RETURNING
            id,
            title,
            message,
            is_read,
            created_at
          `,
          [
            notificationId,
            req.user.userId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Notification marked as read.",

        data: {
          notification:
            result.rows[0],
        },
      });
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to mark notification as read.",
      });
    }
  }
);


/*
 * ================================================================
 * MARK ALL NOTIFICATIONS AS READ
 * ================================================================
 *
 * PATCH /notifications/read-all
 *
 * ================================================================
 */

router.patch(
  "/read-all",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          UPDATE notifications
          SET is_read = true
          WHERE
            user_id = $1
            AND is_read = false
          `,
          [
            req.user.userId,
          ]
        );

      return res.json({
        success: true,

        message:
          "All notifications marked as read.",

        data: {
          updated:
            result.rowCount,
        },
      });
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to mark all notifications as read.",
      });
    }
  }
);


module.exports = router;
