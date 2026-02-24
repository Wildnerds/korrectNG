#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 *
 * Run this once and add the keys to your .env file:
 *   node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n========================================');
console.log('   VAPID Keys Generated Successfully');
console.log('========================================\n');
console.log('Add these to your backend .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:support@korrectng.ng`);
console.log('\n----------------------------------------');
console.log('Also add this to your web app .env.local:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n========================================\n');
