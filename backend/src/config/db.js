const { Pool } = require("pg");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString:
        process.env.DATABASE_URL,

      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host:
        process.env.DB_HOST ||
        "localhost",

      port: Number(
        process.env.DB_PORT || 5432
      ),

      database:
        process.env.DB_NAME ||
        "novabank",

      user:
        process.env.DB_USER ||
        "logistics_user",

      password:
        process.env.DB_PASSWORD,

      max: 20,
       ssl: { rejectUnauthorized: false },

      idleTimeoutMillis: 30000,

      connectionTimeoutMillis: 5000,
    };

const pool = new Pool({
  ...poolConfig,

  max: 20,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error
  );
});

module.exports = pool;
