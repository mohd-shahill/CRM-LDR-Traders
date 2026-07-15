import db from './src/config/db.js';

async function checkLead() {
  const result = await db.query("SELECT id, l1_details, submitted_by FROM leads WHERE id = 'lead-779896'");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
checkLead();
