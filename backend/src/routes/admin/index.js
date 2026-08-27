const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const dashboardRoutes =
  require("./dashboard");

const customerRoutes =
  require("./customers");

const accountRoutes =
  require("./accounts");

const transactionRoutes =
  require("./transactions");

  const receiptRoutes =
  require("./receipts");

const notificationRoutes =
  require("./notifications");

const router = express.Router();

/*
 * ================================================================
 * ADMIN AUTHORIZATION
 * ================================================================
 */

router.use(
  authMiddleware,
  adminMiddleware
);

/*
 * ================================================================
 * DASHBOARD
 * ================================================================
 */

router.use(
  "/dashboard",
  dashboardRoutes
);

/*
 * ================================================================
 * CUSTOMERS
 * ================================================================
 */

router.use(
  "/customers",
  customerRoutes
);

/*
 * ================================================================
 * ACCOUNTS
 * ================================================================
 */

router.use(
  "/accounts",
  accountRoutes
);


/*
 * ================================================================
 * TRANSACTIONS
 * ================================================================
 */

router.use(
  "/transactions",
  transactionRoutes
);



/*
 * ================================================================
 * RECEIPTS
 * ================================================================
 */

router.use(
  "/receipts",
  receiptRoutes
);


/*
 * ================================================================
 * NOTIFICATIONS
 * ================================================================
 */

router.use(
  "/notifications",
  notificationRoutes
);
module.exports = router;