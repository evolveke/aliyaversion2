const { Client } = require('whatsapp-web.js');
const { logger } = require('../utils/logger');
const moment = require('moment-timezone'); // Install with `npm install moment-timezone`

// In-memory store for reminders
const reminders = new Map();

// Initialize WhatsApp client (assumes client is passed from index.js)
let client = null;

function setClient(whatsappClient) {
  client = whatsappClient;
}

// Schedule a reminder
function scheduleReminder(userId, message, timeStr, callback = null, durationDays = 1) {
  try {
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim() === '') {
      logger.error(`Invalid message for user ${userId}: ${message}`);
      return;
    }

    // Parse time string (e.g., "08:00 AM") to a timestamp
    const now = moment().tz('Africa/Nairobi'); // Use user's timezone (adjust based on location)
    const [time, period] = timeStr.match(/(\d{2}:\d{2}) (AM|PM)/i).slice(1);
    const [hours, minutes] = time.split(':').map(Number);
    let reminderTime = moment(now).set({ hour: hours % 12 + (period.toUpperCase() === 'PM' ? 12 : 0), minute: minutes, second: 0, millisecond: 0 });

    // If the time is in the past today, schedule for tomorrow
    if (reminderTime.isBefore(now)) {
      reminderTime.add(1, 'day');
    }

    const timeMs = reminderTime.valueOf();
    if (timeMs <= Date.now()) {
      logger.warn(`Reminder time ${timeMs} is in the past or invalid for user ${userId}`);
      return;
    }

    // Calculate delay until the reminder time
    const delay = timeMs - Date.now();

    // Store reminder details
    const reminderId = `${userId}_${timeMs}`;
    reminders.set(reminderId, {
      userId,
      message: message.trim(),
      time: timeMs,
      callback,
      durationDays: durationDays === Infinity ? Infinity : Math.max(1, durationDays),
      daysLeft: durationDays === Infinity ? Infinity : Math.max(1, durationDays),
    });

    // Schedule the reminder
    const job = setTimeout(async () => {
      try {
        await client.sendMessage(userId, reminder.message);
        logger.info(`Reminder sent to ${userId}: ${reminder.message}`);

        if (callback) {
          await callback();
        }

        const reminder = reminders.get(reminderId);
        if (reminder && reminder.daysLeft > 1) {
          reminder.daysLeft = reminder.durationDays === Infinity ? Infinity : reminder.daysLeft - 1;
          const nextTime = reminder.time + 24 * 60 * 60 * 1000; // Next day
          scheduleReminder(userId, reminder.message, moment(nextTime).format('HH:mm A'), callback, reminder.daysLeft);
        } else {
          reminders.delete(reminderId);
          logger.info(`Reminder ${reminderId} completed or removed`);
        }
      } catch (error) {
        logger.error(`Error sending reminder to ${userId}: ${error.message}`);
      }
    }, delay);

    logger.info(`Reminder scheduled for ${userId} at ${reminderTime.format('YYYY-MM-DD HH:mm:ss')} for ${durationDays} days with message: ${message}`);
  } catch (error) {
    logger.error(`Error scheduling reminder for ${userId}: ${error.message}`);
  }
}

// Cancel all reminders for a user
function cancelReminders(userId) {
  for (const [reminderId] of reminders) {
    if (reminderId.startsWith(`${userId}_`)) {
      reminders.delete(reminderId);
      logger.info(`Cancelled reminder ${reminderId}`);
    }
  }
}

module.exports = { setClient, scheduleReminder, cancelReminders };