import db from './src/config/db.js';

async function updateLegacyLeads() {
  const result = await db.query("SELECT id, l1_details FROM leads WHERE submitted_by IS NULL");
  for (const row of result.rows) {
    const details = row.l1_details || {};
    details.source = 'Website';
    await db.query("UPDATE leads SET l1_details = $1 WHERE id = $2", [details, row.id]);
  }
  console.log("Updated", result.rows.length, "legacy leads to have Website source.");
  process.exit(0);
}
updateLegacyLeads();
