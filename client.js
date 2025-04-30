const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { logger } = require('./utils/logger');
const http = require('http');

// Initialize WhatsApp client
function initializeClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  // Log QR code for authentication
  client.on('qr', (qr) => {
    logger.info('QR code received, scan it to authenticate:');
    qrcode.generate(qr, { small: true });
  });

  // Log when client is ready
  client.on('ready', () => {
    logger.info('WhatsApp client is ready');
  });

  // Log authentication failure
  client.on('auth_failure', (msg) => {
    logger.error('Authentication failure:', msg);
  });

  // Initialize the client
  client.initialize().catch((err) => {
    logger.error('Error initializing WhatsApp client:', err);
  });

  // Create an HTTP server to bind to 0.0.0.0 and the specified PORT
  const PORT = process.env.PORT || 10000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Aliya Health Bot is running\n');
  });

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${PORT}`);
  });

  return client;
}

module.exports = { initializeClient };