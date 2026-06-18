import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'ldr_traders',
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
});

async function checkAudit() {
  try {
    const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20');
    console.log('Audit logs:');
    console.log(JSON.stringify(res.rows, null, 2));

    const notificationsRes = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20');
    console.log('Notifications:');
    console.log(JSON.stringify(notificationsRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkAudit();
