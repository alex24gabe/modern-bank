require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const pool = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const accountRoutes = require("./src/routes/accounts");
const depositRoutes = require("./src/routes/deposits");
const transactionRoutes = require("./src/routes/transactions");
const transferRoutes = require("./src/routes/transfers");
const beneficiaryRoutes =
  require("./src/routes/beneficiaries");
const transactionPinRoutes =
  require("./src/routes/transactionPin");
const receiptRoutes =
  require("./src/routes/receipts");
const notificationRoutes =
  require("./src/routes/notifications");
const adminRoutes =
  require("./src/routes/admin");

const app = express();

/*
 * ================================================================
 * SECURITY / MIDDLEWARE
 * ================================================================
 */

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);

app.use(helmet());

app.use(compression());

app.use(morgan("dev"));

app.use(express.json());

/*
 * ================================================================
 * ROOT
 * ================================================================
 */

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "NovaBank API is running.",
  });
});

/*
 * ================================================================
 * HEALTH CHECK
 * ================================================================
 */

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        NOW() AS server_time
    `);

    return res.json({
      success: true,
      message: "NovaBank backend is healthy.",
      database: result.rows[0],
    });
  } catch (error) {
    console.error("Health check error:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});

/*
 * ================================================================
 * API ROUTES
 * ================================================================
 */

app.use("/auth", authRoutes);

app.use("/accounts", accountRoutes);

app.use("/deposits", depositRoutes);

app.use("/transactions", transactionRoutes);

app.use("/transfers", transferRoutes);
app.use(
  "/beneficiaries",
  beneficiaryRoutes
);
app.use(
  "/transaction-pin",
  transactionPinRoutes
);
app.use(
  "/receipts",
  receiptRoutes
);
app.use(
  "/notifications",
  notificationRoutes
);
app.use(
  "/admin",
  adminRoutes
);

/*
 * ================================================================
 * 404 HANDLER
 * ================================================================
 */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint not found.",
    path: req.originalUrl,
    method: req.method,
  });
});

/*
 * ================================================================
 * GLOBAL ERROR HANDLER
 * ================================================================
 */

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

/*
 * ================================================================
 * START SERVER
 * ================================================================
 */

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log("========================================");
  console.log("🚀 NovaBank Backend Started");
  console.log(`🌍 Port: ${PORT}`);
  console.log(`🗄️ Database: ${process.env.DB_NAME}`);
  console.log("========================================");
});