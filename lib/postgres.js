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
    connectionTimeoutMillis: 15000,
  });

  global.postgresPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });
}

pool = global.postgresPool;

export async function query(text, params, retryCount = 1) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    const isTimeout = error.code === 'ETIMEDOUT' || 
                      error.message?.includes('timeout') || 
                      error.message?.includes('Timeout');
    if (isTimeout && retryCount > 0) {
      console.warn(`PostgreSQL query connection timeout. Retrying in 1.5s... (${retryCount} attempt remaining)`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return query(text, params, retryCount - 1);
    }
    console.error('PostgreSQL query execution error:', error);
    throw error;
  }
}

export default pool;
