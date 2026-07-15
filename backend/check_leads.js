import db from './src/config/db.js';

async function checkLeads() {
  const result = await db.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
checkLeads();
