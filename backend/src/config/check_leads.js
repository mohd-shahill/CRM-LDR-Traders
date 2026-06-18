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

async function checkLeads() {
  try {
    const res = await pool.query('SELECT id, owner_name, vehicle_number, status, assigned_to FROM leads');
    console.log('Leads count:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
    
    const usersRes = await pool.query('SELECT id, name, email FROM users');
    console.log('Users:', JSON.stringify(usersRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkLeads();
