const { pool } = require('./db');
const { logger } = require('../utils/logger');

// Function to create database tables if they don't exist
async function createTables() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        sex VARCHAR(50) NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        location VARCHAR(255) NOT NULL,
        menstrual BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Users table created successfully');

    // Health Assessments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_assessments (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        score INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Health Assessments table created successfully');

    // Health Data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_data (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        overall_health VARCHAR(50),
        fruit_veggie INTEGER,
        sugary_drinks VARCHAR(50),
        exercise_days INTEGER,
        sitting_breaks VARCHAR(50),
        sleep_hours INTEGER,
        wake_refreshed VARCHAR(50),
        stress_anxiety VARCHAR(50),
        relaxation_techniques VARCHAR(50),
        chronic_conditions VARCHAR(50),
        family_history VARCHAR(50),
        smoking_vaping VARCHAR(50),
        alcohol_drinks INTEGER,
        headaches_body_aches VARCHAR(50),
        weight_changes VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Health Data table created successfully');

    // Symptom Diagnoses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS symptom_diagnoses (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        symptoms TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        duration INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Symptom Diagnoses table created successfully');

    // Fitness Plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fitness_plans (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        goal VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        duration_days INTEGER NOT NULL,  -- Added duration_days column
        daily_time VARCHAR(50) NOT NULL,
        reminder_time VARCHAR(50) NOT NULL,
        plan TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Fitness Plans table created successfully');

    // Meal Plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        preference VARCHAR(50) NOT NULL,
        goal VARCHAR(255) NOT NULL,
        duration_days INTEGER NOT NULL,  -- Added duration_days column
        reminder_time VARCHAR(50) NOT NULL,
        plan TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Meal Plans table created successfully');

    // Men ASSISTANT: strual Cycles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menstrual_cycles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        last_period DATE NOT NULL,
        cycle_length INTEGER NOT NULL,
        next_period DATE NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Menstrual Cycles table created successfully');

    // Medication Reminders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medication_reminders (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id),
        medication_name VARCHAR(255) NOT NULL,
        reminder_time VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Medication Reminders table created successfully');

    // Subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(user_id),
        daily_tips BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Subscriptions table created successfully');
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
}

module.exports = { createTables };