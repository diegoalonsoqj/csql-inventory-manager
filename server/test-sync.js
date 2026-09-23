import { runSync } from './src/services/gcp-sync.service.js';

console.log('Starting sync...');
try {
  const result = await runSync();
  console.log('Sync result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Sync error:', err.message);
}
