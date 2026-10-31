#!/usr/bin/env node
/**
 * Script to configure or inspect Telegram Bot Webhook for Taskera removal approvals
 *
 * Usage:
 *   node scripts/setTelegramWebhook.js [action] [serverUrl]
 *
 * Actions:
 *   set    - Register webhook URL and secret_token with Telegram (default)
 *   get    - Retrieve current webhook info from Telegram
 *   delete - Remove current webhook from Telegram
 *
 * Environment variables:
 *   TASKERA_APPROVAL_BOT_TOKEN or TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET or TASKERA_TELEGRAM_WEBHOOK_SECRET
 *   SERVER_URL or RENDER_EXTERNAL_URL (e.g. https://taskera-backend.onrender.com)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of whether the script is invoked from root or server/
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to process.cwd()

const botToken =
  (process.env.TASKERA_APPROVAL_BOT_TOKEN && process.env.TASKERA_APPROVAL_BOT_TOKEN.trim()) ||
  (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim());

const secretToken =
  (process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_WEBHOOK_SECRET.trim()) ||
  (process.env.TASKERA_TELEGRAM_WEBHOOK_SECRET && process.env.TASKERA_TELEGRAM_WEBHOOK_SECRET.trim());

const args = process.argv.slice(2);
const action = args[0] || 'set';
const customServerUrl = args[1];

if (!botToken) {
  console.error('❌ Error: No bot token provided. Set TASKERA_APPROVAL_BOT_TOKEN or TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const telegramApi = `https://api.telegram.org/bot${botToken}`;

async function run() {
  try {
    if (action === 'get') {
      console.log('🔍 Fetching current Telegram webhook info...');
      const res = await fetch(`${telegramApi}/getWebhookInfo`);
      const data = await res.json();
      console.log('Result:', JSON.stringify(data, null, 2));
      return;
    }

    if (action === 'delete') {
      console.log('🗑️ Deleting Telegram webhook...');
      const res = await fetch(`${telegramApi}/deleteWebhook`);
      const data = await res.json();
      console.log('Result:', JSON.stringify(data, null, 2));
      return;
    }

    // Default: 'set'
    const rawServerUrl =
      customServerUrl ||
      process.env.SERVER_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      '';

    if (!rawServerUrl) {
      console.error(
        '❌ Error: Server URL is required for setting webhook.\n' +
        'Pass as argument (e.g. node scripts/setTelegramWebhook.js set https://your-app.onrender.com)\n' +
        'or define SERVER_URL in .env'
      );
      process.exit(1);
    }

    const cleanBaseUrl = rawServerUrl.trim().replace(/\/+$/, '');
    const webhookUrl = `${cleanBaseUrl}/api/telegram/approval-webhook`;

    console.log(`🚀 Configuring Telegram webhook:\n   URL: ${webhookUrl}`);
    if (secretToken) {
      console.log(`   Secret Token: [Configured - ${secretToken.length} chars]`);
    } else {
      console.warn('   ⚠️ Warning: No TELEGRAM_WEBHOOK_SECRET configured. Proceeding without secret token.');
    }

    const payload = {
      url: webhookUrl,
      allowed_updates: ['callback_query', 'message'],
    };
    if (secretToken) {
      payload.secret_token = secretToken;
    }

    const response = await fetch(`${telegramApi}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.ok) {
      console.log('✅ Webhook successfully configured with Telegram!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Telegram rejected setWebhook:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Network exception while setting webhook:', error.message);
    process.exit(1);
  }
}

run();
