import { query } from '../lib/mysql.js';

async function test() {
  try {
    const [tables] = await query("SHOW TABLES LIKE 'discount%'");
    console.log('DISCOUNT TABLES:', tables);
    
    const [rules] = await query('SELECT * FROM discount_rules');
    console.log('DISCOUNT RULES COUNT:', rules.length);
    console.log(rules);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
