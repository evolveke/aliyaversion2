const { pool } = require('./db');

async function createTables() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        sex TEXT NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        location TEXT NOT NULL,
        menstrual BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Health assessments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_assessments (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Health data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_data (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        overall_health TEXT,
        fruit_veggie INTEGER,
        sugary_drinks TEXT,
        exercise_days INTEGER,
        sitting_breaks TEXT,
        sleep_hours INTEGER,
        wake_refreshed TEXT,
        stress_anxiety TEXT,
        relaxation_techniques TEXT,
        chronic_conditions TEXT,
        family_history TEXT,
        smoking_vaping TEXT,
        alcohol_drinks INTEGER,
        headaches_body_aches TEXT,
        weight_changes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Symptom diagnoses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS symptom_diagnoses (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        severity TEXT NOT NULL,
        duration INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fitness plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fitness_plans (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        type TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        daily_time TEXT NOT NULL,
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        plan TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add reminder_time column if it doesn't exist
    await pool.query(`
      ALTER TABLE fitness_plans
      ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00'
    `);

    // Meal plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        preference TEXT NOT NULL,
        goal TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        plan TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add reminder_time column if it doesn't exist
    await pool.query(`
      ALTER TABLE meal_plans
      ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00'
    `);

    // Menstrual cycles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menstrual_cycles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        last_period DATE NOT NULL,
        cycle_length INTEGER NOT NULL,
        next_period DATE NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Medication reminders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medication_reminders (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        medication_name TEXT NOT NULL,
        reminder_time TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id TEXT PRIMARY KEY,
        daily_tips BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}

module.exports = { createTables };