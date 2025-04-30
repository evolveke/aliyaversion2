const { Client } = require('whatsapp-web.js');
const { logger } = require('../utils/logger');
const { getMessage } = require('./messages');

// In-memory store for reminders
const reminders = new Map();

// Initialize WhatsApp client (assumes client is passed from index.js)
let client = null;

function setClient(whatsappClient) {
  client = whatsappClient;
}

// Schedule a reminder
function scheduleReminder(userId, message, time, callback = null, durationDays = 1) {
  try {
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    const now = Date.now();
    if (time <= now) {
      logger.warn(`Reminder time ${time} is in the past for user ${userId}`);
      return;
    }

    // Calculate delay until the reminder time
    const delay = time - now;

    // Store reminder details
    const reminderId = `${userId}_${time}`;
    reminders.set(reminderId, {
      userId,
      message,
      time,
      callback,
      durationDays: durationDays === Infinity ? Infinity : Math.max(1, durationDays),
      daysLeft: durationDays === Infinity ? Infinity : Math.max(1, durationDays),
    });

    // Schedule the reminder
    setTimeout(async () => {
      try {
        // Send the reminder message
        await client.sendMessage(userId, message);
        logger.info(`Reminder sent to ${userId}: ${message}`);

        // Execute callback if provided (e.g., for symptom follow-up)
        if (callback) {
          await callback();
        }

        // Handle recurring reminders
        const reminder = reminders.get(reminderId);
        if (reminder && reminder.daysLeft > 1) {
          // Decrease days left
          reminder.daysLeft = reminder.durationDays === Infinity ? Infinity : reminder.daysLeft - 1;

          // Schedule next reminder (24 hours later)
          const nextTime = reminder.time + 24 * 60 * 60 * 1000;
          scheduleReminder(
            userId,
            message,
            nextTime,
            callback,
            reminder.durationDays === Infinity ? Infinity : reminder.daysLeft
          );
        } else {
          // Remove reminder if duration is complete
          reminders.delete(reminderId);
          logger.info(`Reminder ${reminderId} completed or removed`);
        }
      } catch (error) {
        logger.error(`Error sending reminder to ${userId}:`, error);
      }
    }, delay);

    logger.info(`Reminder scheduled for ${userId} at ${new Date(time).toISOString()} for ${durationDays} days`);
  } catch (error) {
    logger.error(`Error scheduling reminder for ${userId}:`, error);
  }
}

// Cancel all reminders for a user (e.g., on "cancel" command)
function cancelReminders(userId) {
  for (const [reminderId] of reminders) {
    if (reminderId.startsWith(`${userId}_`)) {
      reminders.delete(reminderId);
      logger.info(`Cancelled reminder ${reminderId}`);
    }
  }
}

module.exports = { setClient, scheduleReminder, cancelReminders };