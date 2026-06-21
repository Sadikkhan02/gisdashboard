import pg from 'pg';

const { Pool } = pg;

let pool;

if (!global.postgresPool) {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.warn('Warning: POSTGRES_URL environment variable is not defined.');
  }
  global.postgresPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  global.postgresPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });
}

pool = global.postgresPool;

export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('PostgreSQL query execution error:', error);
    throw error;
  }
}

export default pool;
