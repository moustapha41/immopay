import { sequelize } from './models/index.js';
import { runAccountingSync } from './controllers/accountingController.js';

async function test() {
  try {
    await sequelize.authenticate();
    const synced = await runAccountingSync();
    console.log('Synced:', synced);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
test();
