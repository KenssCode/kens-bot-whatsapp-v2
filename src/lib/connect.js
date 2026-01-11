/**
 * Koneksi Database PostgreSQL
 * Menggunakan pg library untuk Railway PostgreSQL
 */

const { Pool } = require('pg');
const config = require('../config/config');

let pool = null;

/**
 * Inisialisasi koneksi database
 */
function initDatabase() {
  if (pool) return pool;
  
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });

    return pool;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
}

/**
 * Execute query dengan parameterized values
 */
async function query(text, params) {
  const client = initDatabase();
  if (!client) return null;
  
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get client dari pool untuk transaction
 */
async function getClient() {
  const client = initDatabase();
  if (!client) return null;
  
  try {
    return await client.connect();
  } catch (error) {
    console.error('Failed to get database client:', error);
    return null;
  }
}

/**
 * Initialize database tables
 */
async function initTables() {
  try {
    // Table untuk menyimpan data grup
    await query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        jid VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255),
        fee_percentage DECIMAL(5,2) DEFAULT 1.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table untuk menyimpan statistik transaksi
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        group_jid VARCHAR(100) NOT NULL,
        seller_jid VARCHAR(100) NOT NULL,
        buyer_jid VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        fee_amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table untuk command usage statistics
    await query(`
      CREATE TABLE IF NOT EXISTS command_stats (
        id SERIAL PRIMARY KEY,
        command VARCHAR(50) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize tables:', error);
    return false;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDatabase,
  query,
  getClient,
  initTables,
  closeDatabase,
  pool
};

