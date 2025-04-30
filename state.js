const { logger } = require('./utils/logger');

// In-memory store for user states
const userStates = new Map();

// Get user state
function getState(userId) {
  const state = userStates.get(userId);
  if (state) {
    logger.debug(`Retrieved state for user ${userId}: ${JSON.stringify(state)}`);
  } else {
    logger.debug(`No state found for user ${userId}`);
  }
  return state;
}

// Set user state
function setState(userId, state) {
  try {
    userStates.set(userId, state);
    logger.debug(`Set state for user ${userId}: ${JSON.stringify(state)}`);
  } catch (error) {
    logger.error(`Error setting state for user ${userId}:`, error);
    throw error;
  }
}

// Clear user state
function clearState(userId) {
  try {
    if (userStates.delete(userId)) {
      logger.debug(`Cleared state for user ${userId}`);
    } else {
      logger.debug(`No state to clear for user ${userId}`);
    }
  } catch (error) {
    logger.error(`Error clearing state for user ${userId}:`, error);
    throw error;
  }
}

module.exports = { getState, setState, clearState };