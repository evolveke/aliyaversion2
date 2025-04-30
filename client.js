const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { logger } = require('./utils/logger');

function initializeClient() {
  logger.info('Initializing WhatsApp client...');

  const sessionPath = '.wwebjs_auth';
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    logger.info('QR code generated');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    logger.info('WhatsApp client is ready');
  });

  client.on('authenticated', () => {
    logger.info('WhatsApp client authenticated');
  });

  client.on('auth_failure', (msg) => {
    logger.error('Authentication failure:', msg);
    logger.info('Clearing session data due to authentication failure...');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    setTimeout(() => client.initialize(), 5000); // Retry after 5 seconds
  });

  client.on('disconnected', (reason) => {
    logger.warn('Client disconnected:', reason);
    setTimeout(() => client.initialize(), 5000); // Retry after 5 seconds
  });

  // Handle initialization errors
  const maxRetries = 3;
  let retryCount = 0;

  async function initializeWithRetry() {
    try {
      await client.initialize();
    } catch (error) {
      logger.error('Failed to initialize WhatsApp client:', error);
      if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        logger.warn('DNS resolution failed for web.whatsapp.com. Retrying...');
        if (retryCount < maxRetries) {
          retryCount++;
          logger.info(`Retry ${retryCount}/${maxRetries} in 5 seconds...`);
          setTimeout(initializeWithRetry, 5000);
        } else {
          logger.error('Max retries reached. Could not connect to WhatsApp. Please check your network and try again.');
          process.exit(1); // Exit the process if max retries are reached
        }
      } else {
        throw error; // Rethrow other errors
      }
    }
  }

  initializeWithRetry();
  return client;
}

module.exports = { initializeClient };