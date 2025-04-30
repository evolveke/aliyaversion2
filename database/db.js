const { Pool } = require('pg');
const { logger } = require('../utils/logger');

// Configure PostgreSQL connection pool using environment variables
const pool = new Pool(
  process.env.NODE_ENV === 'production'
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'aliya_health',
        password: process.env.DB_PASSWORD || 'nurubot',
        port: parseInt(process.env.DB_PORT, 10) || 3001,
        ssl: false,
        max: 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 2000, // Timeout for acquiring a connection
      }
);

// Initialize database connection
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    logger.info('Successfully connected to PostgreSQL database');
    client.release();
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test connection on startup
initializeDatabase().catch((err) => {
  logger.error('Database initialization failed:', err);
  process.exit(-1);
});

module.exports = { pool, initializeDatabase };