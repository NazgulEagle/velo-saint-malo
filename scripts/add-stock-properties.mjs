/**
 * Add stock tracking properties to the Velos database in Notion.
 * Run once: node scripts/add-stock-properties.mjs
 *
 * NOTE: If the Notion API token is expired, update it in api/.env first.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envContent = readFileSync(resolve(__dirname, '../api/.env'), 'utf-8');
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    process.env[key] = val;
  }
}

const require = createRequire(resolve(__dirname, '../api/node_modules/.package-lock.json'));
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DB_BIKES = process.env.VELO_DB_BIKES;

console.log('Token:', process.env.NOTION_API_TOKEN?.substring(0, 15) + '...');
console.log('DB_BIKES:', DB_BIKES);

async function addStockProperties() {
  console.log('\nAdding stock properties to Velos DB...');

  await notion.databases.update({
    database_id: DB_BIKES,
    properties: {
      'Stock loue': { number: { format: 'number' } },
    },
  });

  console.log('Added: Stock loue (number)');

  // Initialize "Stock loue" to 0 for all bikes
  const pages = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: DB_BIKES,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  for (const page of pages) {
    const currentLoue = page.properties['Stock loue']?.number;
    if (currentLoue === null || currentLoue === undefined) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          'Stock loue': { number: 0 },
        },
      });
      const name = page.properties['Modele']?.title?.[0]?.plain_text || 'unknown';
      console.log(`  Set Stock loue = 0 for: ${name}`);
    }
  }

  console.log(`\nDone! ${pages.length} bikes processed.`);
  console.log('\nManually add formula in Notion:');
  console.log('  Property: "Stock disponible"');
  console.log('  Formula: prop("Stock total") - prop("Stock loue")');
}

addStockProperties().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
