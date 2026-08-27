const express = require("express");

const pool = require("../../config/db");

const router = express.Router();

/*
 * ================================================================
 * GET ADMIN NOTIFICATIONS
 * ================================================================
 *
 * GET /admin/notifications
 *
 * Returns notifications across all customers.
 *
 * Supported query parameters:
 *
 * ?page=1
 * ?limit=20
 * ?search=transfer
 * ?read=true
 * ?read=false
 *
 * ================================================================
 */

router.get(
  "/",
  async (req, res) => {
    try {
      let page = Number(
        req.query.page
      );

      let limit = Number(
        req.query.limit
      );

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        page = 1;
      }

      if (
        !Number.isInteger(limit) ||
        limit < 1
      ) {
        limit = 20;
      }

      limit = Math.min(limit, 100);

      const offset =
        (page - 1) * limit;

      const search =
        String(
          req.query.search || ""
        ).trim();

      const readParam =
        String(
          req.query.read || ""
        ).trim()
        .toLowerCase();

      const conditions = [];
      const values = [];

      /*
       * ------------------------------------------------------------
       * SEARCH
       * ------------------------------------------------------------
       */

      if (search) {
        values.push(
          `%${search}%`
        );

        const searchIndex =
          values.length;

        conditions.push(`
          (
            n.title ILIKE $${searchIndex}
            OR n.message ILIKE $${searchIndex}
            OR u.full_name ILIKE $${searchIndex}
            OR u.email ILIKE $${searchIndex}
          )
        `);
      }

      /*
       * ------------------------------------------------------------
       * READ FILTER
       * ------------------------------------------------------------
       */

      if (
        readParam === "true" ||
        readParam === "false"
      ) {
        values.push(
          readParam === "true"
        );

        conditions.push(
          `n.is_read = $${values.length}`
        );
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
          FROM notifications n
          INNER JOIN users u
            ON u.id = n.user_id
          ${whereClause}
          `,
          values
        );

      const total =
        countResult.rows[0].total;

      /*
       * ------------------------------------------------------------
       * NOTIFICATIONS
       * ------------------------------------------------------------
       */

      const notificationValues =
        [...values];

      notificationValues.push(limit);
      const limitIndex =
        notificationValues.length;

      notificationValues.push(offset);
      const offsetIndex =
        notificationValues.length;

      const result =
        await pool.query(
          `
          SELECT
            n.id,
            n.user_id,
            n.title,
            n.message,
            n.is_read,
            n.created_at,

            u.full_name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone

          FROM notifications n

          INNER JOIN users u
            ON u.id = n.user_id

          ${whereClause}

          ORDER BY
            n.created_at DESC

          LIMIT $${limitIndex}
          OFFSET $${offsetIndex}
          `,
          notificationValues
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      return res.json({
        success: true,

        message:
          "Admin notifications retrieved successfully.",

        data: {
          notifications:
            result.rows,

          pagination: {
            page,
            limit,
            total,
            totalPages,
          },

          filters: {
            search:
              search || null,

            read:
              readParam === "true"
                ? true
                : readParam === "false"
                ? false
                : null,
          },
        },
      });
    } catch (error) {
      console.error(
        "Admin notifications retrieval error:",
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
 * MARK SINGLE NOTIFICATION AS READ
 * ================================================================
 *
 * PATCH /admin/notifications/:id/read
 *
 * ================================================================
 */

router.patch(
  "/:id/read",
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
          WHERE id = $1

          RETURNING
            id,
            user_id,
            title,
            message,
            is_read,
            created_at
          `,
          [notificationId]
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
        "Admin mark notification read error:",
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
 * PATCH /admin/notifications/read-all
 *
 * ================================================================
 */

router.patch(
  "/read-all",
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          UPDATE notifications
          SET is_read = true
          WHERE is_read = false
          `
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
        "Admin mark all notifications read error:",
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
