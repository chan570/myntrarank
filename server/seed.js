import './config/env.js';
import { seedDatabase } from './services/seedService.js';

try {
  const count = await seedDatabase();
  console.log(`Seed complete (${count} products).`);
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
}
