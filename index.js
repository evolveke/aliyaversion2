require('dotenv').config();
const { Client } = require('whatsapp-web.js');
const { initializeClient } = require('./client');
const { getState, setState, clearState } = require('./state');
const { pool, initializeDatabase } = require('./database/db');
const { createTables } = require('./database/schema');
const { getMessage } = require('./services/messages');
const { setClient, scheduleReminder, cancelReminders } = require('./services/reminders');
const { analyzeHealthData } = require('./services/cohere');
const { logger } = require('./utils/logger');

// Initialize WhatsApp client
logger.info('Starting WhatsApp client initialization...');
const client = initializeClient();
logger.info('WhatsApp client initialized');

// Pass client to reminder service
setClient(client);

// Initialize database and create tables
async function initialize() {
  try {
    await initializeDatabase();
    await createTables();
    logger.info('Database initialization complete');
  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1);
  }
}

logger.info('Starting database initialization...');
initialize();

// Schedule reminders on client ready
client.on('ready', async () => {
  logger.info('WhatsApp client is ready');

  // Schedule daily fitness and meal plan generation for all active plans
  try {
    // Fetch active fitness plans
    const fitnessPlans = await pool.query(`
      SELECT * FROM fitness_plans
      WHERE created_at + (duration_days || ' days')::INTERVAL > NOW()
    `);
    for (const plan of fitnessPlans.rows) {
      const userId = plan.user_id;
      const reminderTime = plan.reminder_time;
      const durationDays = plan.duration_days;
      const daysRemaining = Math.ceil(
        (new Date(plan.created_at).getTime() + durationDays * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysRemaining > 0) {
        try {
          const user = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]).then(res => res.rows[0]);
          scheduleReminder(
            userId,
            null, // Message will be generated dynamically
            parseTimeToNextOccurrence(reminderTime),
            async () => {
              const newPlan = await analyzeHealthData({
                goal: plan.goal,
                type: plan.type,
                daily_time: plan.daily_time,
                age: user.age,
                weight: user.weight,
                height: user.height,
                sex: user.sex,
              });
              await pool.query(
                'UPDATE fitness_plans SET plan = $1 WHERE id = $2',
                [newPlan, plan.id]
              );
              return getMessage('fitness_reminder', { plan: newPlan });
            },
            daysRemaining
          );
        } catch (error) {
          logger.error(`Failed to schedule fitness plan reminder for user ${userId}:`, error);
        }
      }
    }

    // Fetch active meal plans
    const mealPlans = await pool.query(`
      SELECT * FROM meal_plans
      WHERE created_at + (duration_days || ' days')::INTERVAL > NOW()
    `);
    for (const plan of mealPlans.rows) {
      const userId = plan.user_id;
      const reminderTime = plan.reminder_time;
      const durationDays = plan.duration_days;
      const daysRemaining = Math.ceil(
        (new Date(plan.created_at).getTime() + durationDays * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysRemaining > 0) {
        try {
          const user = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]).then(res => res.rows[0]);
          scheduleReminder(
            userId,
            null, // Message will be generated dynamically
            parseTimeToNextOccurrence(reminderTime),
            async () => {
              const newPlan = await analyzeHealthData({
                preference: plan.preference,
                goal: plan.goal,
                age: user.age,
                weight: user.weight,
                height: user.height,
                sex: user.sex,
              });
              await pool.query(
                'UPDATE meal_plans SET plan = $1 WHERE id = $2',
                [newPlan, plan.id]
              );
              return getMessage('meal_reminder', { plan: newPlan });
            },
            daysRemaining
          );
        } catch (error) {
          logger.error(`Failed to schedule meal plan reminder for user ${userId}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error scheduling existing plans:', error);
  }
});

// Sanitize input
function sanitizeInput(input) {
  return input.toLowerCase().trim();
}

// Parse time for reminders (HH:MM to next occurrence)
function parseTimeToNextOccurrence(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    logger.warn(`Invalid reminder time: ${timeStr}, defaulting to 08:00`);
    timeStr = '08:00';
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  return reminderTime.getTime();
}

// Health assessment scoring
function calculateHealthScore(answers) {
  let score = 0;

  // Overall health
  if (answers.overall_health === 'excellent') score += 20;
  else if (answers.overall_health === 'good') score += 15;
  else if (answers.overall_health === 'fair') score += 10;

  // Fruit and veggie servings
  const fruitVeggieServings = parseInt(answers.fruit_veggie) || 0;
  score += Math.min(fruitVeggieServings * 2, 10);

  // Sugary drinks and snacks
  if (answers.sugary_drinks === 'never') score += 10;
  else if (answers.sugary_drinks === 'rarely') score += 5;

  // Exercise days
  const exerciseDays = parseInt(answers.exercise_days) || 0;
  score += exerciseDays * 2;

  // Sitting breaks
  if (answers.sitting_breaks === 'often') score += 5;

  // Sleep hours
  const sleepHours = parseInt(answers.sleep_hours) || 0;
  if (sleepHours >= 7 && sleepHours <= 9) score += 10;

  // Wake refreshed
  if (answers.wake_refreshed === 'always' || answers.wake_refreshed === 'mostly') score += 5;

  // Stress and anxiety
  if (answers.stress_anxiety === 'never' || answers.stress_anxiety === 'sometimes') score += 5;

  // Relaxation techniques
  if (answers.relaxation_techniques === 'yes') score += 5;

  // Chronic conditions
  if (answers.chronic_conditions === 'no') score += 5;

  // Family history
  if (answers.family_history === 'no') score += 5;

  // Smoking/vaping
  if (answers.smoking_vaping === 'no') score += 5;

  // Alcohol drinks
  const alcoholDrinks = parseInt(answers.alcohol_drinks) || 0;
  if (alcoholDrinks <= 2) score += 5;

  // Headaches/body aches
  if (answers.headaches_body_aches === 'never' || answers.headaches_body_aches === 'sometimes') score += 5;

  // Weight changes
  if (answers.weight_changes === 'no') score += 5;

  return Math.min(score, 100);
}

// Handle incoming messages
client.on('message', async (message) => {
  const userId = message.from;
  const input = sanitizeInput(message.body.toLowerCase());
  let state = getState(userId) || { step: 'introduction', data: {} };

  // Check WhatsApp client status
  const isClientReady = client.info && client.info.wid;
  logger.debug(`WhatsApp client ready: ${isClientReady}`);
  if (!isClientReady) {
    logger.warn('WhatsApp client not ready, cannot process message');
    return;
  }

  try {
    // Check if user exists in the database
    const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length > 0) {
      state.data = { ...state.data, ...userResult.rows[0] };
      // If no active step, set to main_menu for registered users
      if (!state.step || state.step === 'introduction') {
        state.step = 'main_menu';
      }
      setState(userId, state);
    } else {
      // Handle unregistered user
      if (state.step === 'introduction') {
        message.reply(getMessage('introduction'));
        setState(userId, { step: 'waiting_for_start', data: state.data });
        return;
      }

      if (state.step === 'waiting_for_start') {
        if (input === 'start') {
          message.reply(getMessage('disclaimer'));
          setState(userId, { step: 'waiting_for_consent', data: state.data });
        } else {
          message.reply(getMessage('introduction'));
        }
        return;
      }

      if (state.step === 'waiting_for_consent') {
        if (input === 'accept') {
          setState(userId, { step: 'onboarding_name', data: state.data });
          message.reply(getMessage('onboarding_name'));
        } else if (input === 'decline') {
          message.reply(getMessage('decline_response'));
          clearState(userId);
          // No main menu here as user has declined
        } else {
          message.reply(getMessage('error_invalid_input'));
        }
        return;
      }
    }

    // Handle "cancel" at any point
    if (input === 'cancel') {
      cancelReminders(userId);
      clearState(userId);
      state = { step: 'main_menu', data: state.data };
      setState(userId, state);
      message.reply(getMessage('main_menu', { sex: state.data.sex }));
      return;
    }

    // Onboarding process for new users
    if (state.step === 'onboarding_name') {
      if (/^[a-zA-Z\s]+$/.test(input)) {
        state.data.name = input;
        setState(userId, { step: 'onboarding_age', data: state.data });
        message.reply(getMessage('onboarding_age'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_age') {
      const age = parseInt(input);
      if (!isNaN(age) && age >= 18 && age <= 120) {
        state.data.age = age;
        setState(userId, { step: 'onboarding_sex', data: state.data });
        message.reply(getMessage('onboarding_sex'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_sex') {
      if (['male', 'female'].includes(input)) {
        state.data.sex = input;
        setState(userId, { step: 'onboarding_height', data: state.data });
        message.reply(getMessage('onboarding_height'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_height') {
      const height = parseInt(input);
      if (!isNaN(height) && height >= 100 && height <= 250) {
        state.data.height = height;
        setState(userId, { step: 'onboarding_weight', data: state.data });
        message.reply(getMessage('onboarding_weight'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_weight') {
      const weight = parseInt(input);
      if (!isNaN(weight) && weight >= 30 && weight <= 300) {
        state.data.weight = weight;
        setState(userId, { step: 'onboarding_location', data: state.data });
        message.reply(getMessage('onboarding_location'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_location') {
      if (/^[a-zA-Z\s]+$/.test(input)) {
        state.data.location = input;
        if (state.data.sex === 'female') {
          setState(userId, { step: 'onboarding_menstrual', data: state.data });
          message.reply(getMessage('onboarding_menstrual'));
        } else {
          await pool.query(
            'INSERT INTO users (user_id, name, age, sex, height, weight, location, menstrual) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [userId, state.data.name, state.data.age, state.data.sex, state.data.height, state.data.weight, state.data.location, false]
          );
          message.reply(`🎉 Onboarding complete, ${state.data.name}! You're all set to start using Aliya Health Bot.`);
          setState(userId, { step: 'ask_health_assessment', data: state.data });
          message.reply("Would you like to do a health assessment now or later? (now/later)");
        }
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'onboarding_menstrual') {
      if (['yes', 'no'].includes(input)) {
        state.data.menstrual = input === 'yes';
        await pool.query(
          'INSERT INTO users (user_id, name, age, sex, height, weight, location, menstrual) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [userId, state.data.name, state.data.age, state.data.sex, state.data.height, state.data.weight, state.data.location, state.data.menstrual]
        );
        message.reply(`🎉 Onboarding complete, ${state.data.name}! You're all set to start using Aliya Health Bot.`);
        setState(userId, { step: 'ask_health_assessment', data: state.data });
        message.reply("Would you like to do a health assessment now or later? (now/later)");
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Ask about health assessment after onboarding
    if (state.step === 'ask_health_assessment') {
      if (input === 'now') {
        setState(userId, { step: 'health_assessment', data: { ...state.data, questionIndex: 0 } });
        message.reply(getMessage('health_assessment_start'));
        message.reply(getMessage('assessment_overall_health'));
      } else if (input === 'later') {
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply("Please type 'now' or 'later'.");
      }
      return;
    }

    // Main menu for registered users
    if (state.step === 'main_menu') {
      if (['1', '2', '3', '4', '5', '6', '7'].includes(input)) {
        if (input === '1') {
          setState(userId, { step: 'health_assessment', data: { ...state.data, questionIndex: 0 } });
          message.reply(getMessage('health_assessment_start'));
          message.reply(getMessage('assessment_overall_health'));
        } else if (input === '2') {
          setState(userId, { step: 'symptom_diagnosis', data: state.data });
          message.reply(getMessage('symptom_diagnosis'));
        } else if (input === '3') {
          // Check for existing fitness plan
          const existingFitnessPlan = await pool.query(
            `SELECT * FROM fitness_plans 
             WHERE user_id = $1 
             AND created_at + (duration_days || ' days')::INTERVAL > NOW()`,
            [userId]
          );
          if (existingFitnessPlan.rows.length > 0) {
            const plan = existingFitnessPlan.rows[0];
            message.reply(
              `You already have an active fitness plan:\n` +
              `Goal: ${plan.goal}, Type: ${plan.type}, Duration: ${plan.duration_days} days\n` +
              `Creating a new plan will delete the existing one. Proceed? (yes/no)`
            );
            setState(userId, { step: 'confirm_new_fitness_plan', data: state.data });
          } else {
            setState(userId, { step: 'fitness_plan_goal', data: state.data });
            message.reply(getMessage('fitness_plan_goal'));
          }
        } else if (input === '4') {
          // Check for existing meal plan
          const existingMealPlan = await pool.query(
            `SELECT * FROM meal_plans 
             WHERE user_id = $1 
             AND created_at + (duration_days || ' days')::INTERVAL > NOW()`,
            [userId]
          );
          if (existingMealPlan.rows.length > 0) {
            const plan = existingMealPlan.rows[0];
            message.reply(
              `You already have an active meal plan:\n` +
              `Preference: ${plan.preference}, Goal: ${plan.goal}, Duration: ${plan.duration_days} days\n` +
              `Creating a new plan will delete the existing one. Proceed? (yes/no)`
            );
            setState(userId, { step: 'confirm_new_meal_plan', data: state.data });
          } else {
            setState(userId, { step: 'meal_plan_preference', data: state.data });
            message.reply(getMessage('meal_plan_preference'));
          }
        } else if (input === '5' && state.data.sex === 'female') {
          setState(userId, { step: 'menstrual_tracking_update', data: state.data });
          message.reply(getMessage('menstrual_tracking_update'));
        } else if (input === '6') {
          setState(userId, { step: 'medication_name', data: state.data });
          message.reply(getMessage('medication_name'));
        } else if (input === '7') {
          setState(userId, { step: 'daily_tips', data: state.data });
          message.reply(getMessage('daily_tips'));
        } else {
          message.reply(getMessage('error_not_available'));
          message.reply(getMessage('main_menu', { sex: state.data.sex }));
        }
      } else {
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      }
      return;
    }

    // Confirm new fitness plan
    if (state.step === 'confirm_new_fitness_plan') {
      if (input === 'yes') {
        // Delete existing fitness plan
        await pool.query(
          `DELETE FROM fitness_plans 
           WHERE user_id = $1 
           AND created_at + (duration_days || ' days')::INTERVAL > NOW()`,
          [userId]
        );
        message.reply('Existing fitness plan deleted. Let’s create a new one.');
        setState(userId, { step: 'fitness_plan_goal', data: state.data });
        message.reply(getMessage('fitness_plan_goal'));
      } else if (input === 'no') {
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply('Keeping your existing fitness plan.');
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply('Please type "yes" or "no".');
      }
      return;
    }

    // Confirm new meal plan
    if (state.step === 'confirm_new_meal_plan') {
      if (input === 'yes') {
        // Delete existing meal plan
        await pool.query(
          `DELETE FROM meal_plans 
           WHERE user_id = $1 
           AND created_at + (duration_days || ' days')::INTERVAL > NOW()`,
          [userId]
        );
        message.reply('Existing meal plan deleted. Let’s create a new one.');
        setState(userId, { step: 'meal_plan_preference', data: state.data });
        message.reply(getMessage('meal_plan_preference'));
      } else if (input === 'no') {
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply('Keeping your existing meal plan.');
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply('Please type "yes" or "no".');
      }
      return;
    }

    // Health Assessment
    if (state.step === 'health_assessment') {
      logger.debug(`Processing health assessment for user ${userId}, questionIndex: ${state.data.questionIndex}`);
    
      const questions = [
        'assessment_overall_health',
        'assessment_fruit_veggie',
        'assessment_sugary_drinks',
        'assessment_exercise_days',
        'assessment_sitting_breaks',
        'assessment_sleep_hours',
        'assessment_wake_refreshed',
        'assessment_stress_anxiety',
        'assessment_relaxation_techniques',
        'assessment_chronic_conditions',
        'assessment_family_history',
        'assessment_smoking_vaping',
        'assessment_alcohol_drinks',
        'assessment_headaches_body_aches',
        'assessment_weight_changes',
      ];
      const questionIndex = state.data.questionIndex || 0;
      logger.debug(`Question index: ${questionIndex}, Questions length: ${questions.length}`);
      const currentQuestion = questions[questionIndex];
    
      // Define a helper function to complete the assessment
      const completeAssessment = async () => {
        logger.debug('Health assessment complete, calculating score...');
        try {
          const score = calculateHealthScore(state.data);
          logger.debug(`Calculated health score: ${score}`);
      
          logger.debug('Calling analyzeHealthData...');
          const analysis = await analyzeHealthData(state.data);
          logger.debug(`Analysis result: ${analysis}`);
      
          // Insert into health_assessments table
          logger.debug('Inserting health assessment into health_assessments table...');
          await pool.query(
            'INSERT INTO health_assessments (user_id, score, analysis, created_at) VALUES ($1, $2, $3, $4)',
            [userId, score, analysis, new Date()]
          );
          logger.debug('Health assessment saved to health_assessments table');
      
          // Insert into health_data table
          logger.debug('Inserting health data into health_data table...');
          await pool.query(
            `INSERT INTO health_data (
              user_id, overall_health, fruit_veggie, sugary_drinks, exercise_days, sitting_breaks,
              sleep_hours, wake_refreshed, stress_anxiety, relaxation_techniques, chronic_conditions,
              family_history, smoking_vaping, alcohol_drinks, headaches_body_aches, weight_changes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              userId,
              state.data.overall_health,
              parseInt(state.data.fruit_veggie) || 0,
              state.data.sugary_drinks,
              parseInt(state.data.exercise_days) || 0,
              state.data.sitting_breaks,
              parseInt(state.data.sleep_hours) || 0,
              state.data.wake_refreshed,
              state.data.stress_anxiety,
              state.data.relaxation_techniques,
              state.data.chronic_conditions,
              state.data.family_history,
              state.data.smoking_vaping,
              parseInt(state.data.alcohol_drinks) || 0,
              state.data.headaches_body_aches,
              state.data.weight_changes,
              new Date(),
            ]
          );
          logger.debug('Health data saved to health_data table');
      
          logger.debug('Sending assessment result to user...');
          try {
            await message.reply(getMessage('assessment_result', { score, analysis }));
          } catch (replyError) {
            logger.error('Error sending assessment result:', replyError);
          }
      
          // Clean up state.data by removing assessment-specific fields
          const cleanedData = {
            user_id: state.data.user_id,
            name: state.data.name,
            age: state.data.age,
            sex: state.data.sex,
            height: state.data.height,
            weight: state.data.weight,
            location: state.data.location,
            menstrual: state.data.menstrual,
            created_at: state.data.created_at,
          };
          state = { step: 'main_menu', data: cleanedData };
          setState(userId, state);
          logger.debug('Sending main menu to user...');
          try {
            await message.reply(getMessage('main_menu', { sex: state.data.sex }));
          } catch (replyError) {
            logger.error('Error sending main menu:', replyError);
          }
        } catch (error) {
          logger.error('Error completing health assessment:', error);
          try {
            await message.reply('There was an issue completing your health assessment. Let’s return to the main menu.');
            state = { step: 'main_menu', data: state.data };
            setState(userId, state);
            await message.reply(getMessage('main_menu', { sex: state.data.sex }));
          } catch (replyError) {
            logger.error('Error sending error message:', replyError);
          }
        }
      };
    
      if (questionIndex >= questions.length) {
        await completeAssessment();
        return;
      }
    
      const validations = {
        assessment_overall_health: ['excellent', 'good', 'fair', 'poor'],
        assessment_fruit_veggie: (val) => !isNaN(val) && val >= 0,
        assessment_sugary_drinks: ['daily', 'weekly', 'rarely', 'never'],
        assessment_exercise_days: (val) => !isNaN(val) && val >= 0 && val <= 7,
        assessment_sitting_breaks: ['often', 'sometimes', 'rarely', 'never'],
        assessment_sleep_hours: (val) => !isNaN(val) && val >= 0 && val <= 24,
        assessment_wake_refreshed: ['always', 'mostly', 'sometimes', 'never'],
        assessment_stress_anxiety: ['always', 'mostly', 'sometimes', 'never'],
        assessment_relaxation_techniques: ['yes', 'no'],
        assessment_chronic_conditions: ['yes', 'no'],
        assessment_family_history: ['yes', 'no'],
        assessment_smoking_vaping: ['yes', 'no'],
        assessment_alcohol_drinks: (val) => !isNaN(val) && val >= 0,
        assessment_headaches_body_aches: ['always', 'mostly', 'sometimes', 'never'],
        assessment_weight_changes: ['yes', 'no'],
      };
    
      logger.debug(`Validating input for question: ${currentQuestion}`);
      const validation = validations[currentQuestion];
      const isValid = typeof validation === 'function' ? validation(input) : validation.includes(input);
      logger.debug(`Input: ${input}, Is valid: ${isValid}`);
    
      if (isValid) {
        state.data[currentQuestion.split('assessment_')[1]] = input;
        state.data.questionIndex = questionIndex + 1;
        setState(userId, state);
    
        logger.debug(`Updated questionIndex to: ${state.data.questionIndex}`);
        if (state.data.questionIndex < questions.length) {
          logger.debug(`Sending next question: ${questions[state.data.questionIndex]}`);
          await message.reply(getMessage(questions[state.data.questionIndex]));
        } else {
          logger.debug('No more questions, completing assessment');
          await completeAssessment();
        }
      } else {
        logger.debug('Invalid input, sending error message');
        await message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Symptom Diagnosis
    if (state.step === 'symptom_diagnosis') {
      state.data.symptoms = input;
      setState(userId, { step: 'symptom_severity', data: state.data });
      message.reply(getMessage('symptom_severity'));
      return;
    }

    if (state.step === 'symptom_severity') {
      if (['mild', 'moderate', 'severe'].includes(input)) {
        state.data.severity = input;
        setState(userId, { step: 'symptom_duration', data: state.data });
        message.reply(getMessage('symptom_duration'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'symptom_duration') {
      const duration = parseInt(input);
      if (!isNaN(duration) && duration >= 0) {
        state.data.duration = duration;
        const analysis = await analyzeHealthData({
          symptoms: state.data.symptoms,
          severity: state.data.severity,
          duration: state.data.duration,
        });
        await pool.query(
          'INSERT INTO symptom_diagnoses (user_id, symptoms, severity, duration, analysis) VALUES ($1, $2, $3, $4, $5)',
          [userId, state.data.symptoms, state.data.severity, state.data.duration, analysis]
        );
        message.reply(getMessage('symptom_result', { analysis }));
        scheduleReminder(
          userId,
          getMessage('symptom_followup'),
          Date.now() + 24 * 60 * 60 * 1000,
          async () => {
            setState(userId, { step: 'symptom_followup', data: { previousAnalysis: analysis } });
          },
          1
        );
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'symptom_followup') {
      const updatedAnalysis = await analyzeHealthData({
        previousAnalysis: state.data.previousAnalysis,
        update: input,
      });
      message.reply(updatedAnalysis); // Reply with the updated analysis
      if (updatedAnalysis.toLowerCase().includes('seek medical attention')) {
        message.reply(getMessage('symptom_persist'));
      }
      state = { step: 'main_menu', data: state.data };
      setState(userId, state);
      message.reply(getMessage('main_menu', { sex: state.data.sex }));
      return;
    }

    // Fitness Plan
    if (state.step === 'fitness_plan_goal') {
      if (['weight loss', 'muscle gain', 'general fitness'].includes(input)) {
        state.data.fitness_goal = input;
        setState(userId, { step: 'fitness_plan_type', data: state.data });
        message.reply(getMessage('fitness_plan_type'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'fitness_plan_type') {
      if (['home', 'gym'].includes(input)) {
        state.data.fitness_type = input;
        setState(userId, { step: 'fitness_plan_duration', data: state.data });
        message.reply(getMessage('fitness_plan_duration'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'fitness_plan_duration') {
      const duration = parseInt(input);
      if (!isNaN(duration) && duration >= 1 && duration <= 365) {
        state.data.fitness_duration = duration;
        setState(userId, { step: 'fitness_plan_daily_time', data: state.data });
        message.reply(getMessage('fitness_plan_daily_time'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'fitness_plan_daily_time') {
      if (['30min', '45min', '1hr'].includes(input)) {
        state.data.fitness_daily_time = input;
        setState(userId, { step: 'fitness_plan_reminder_time', data: state.data });
        message.reply(getMessage('fitness_plan_reminder_time'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'fitness_plan_reminder_time') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (timeRegex.test(input)) {
        state.data.fitness_reminder_time = input;
        const plan = await analyzeHealthData({
          goal: state.data.fitness_goal,
          type: state.data.fitness_type,
          daily_time: state.data.fitness_daily_time,
          age: state.data.age,
          weight: state.data.weight,
          height: state.data.height,
          sex: state.data.sex,
        });
        await pool.query(
          'INSERT INTO fitness_plans (user_id, goal, type, duration_days, daily_time, reminder_time, plan) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, state.data.fitness_goal, state.data.fitness_type, state.data.fitness_duration, state.data.fitness_daily_time, state.data.fitness_reminder_time, plan]
        );
        const initialMessage = getMessage('fitness_reminder', { plan: plan }) || 'Time for your fitness plan update';
        message.reply(getMessage('fitness_plan_result', { plan, duration: state.data.fitness_duration }));
        scheduleReminder(
          userId,
          initialMessage, // Ensure a fallback message
          parseTimeToNextOccurrence(state.data.fitness_reminder_time),
          async () => {
            const newPlan = await analyzeHealthData({
              goal: state.data.fitness_goal,
              type: state.data.fitness_type,
              daily_time: state.data.fitness_daily_time,
              age: state.data.age,
              weight: state.data.weight,
              height: state.data.height,
              sex: state.data.sex,
            });
            await pool.query(
              'UPDATE fitness_plans SET plan = $1 WHERE user_id = $2 AND goal = $3 AND type = $4 AND duration_days = $5',
              [newPlan, userId, state.data.fitness_goal, state.data.fitness_type, state.data.fitness_duration]
            );
            return getMessage('fitness_reminder', { plan: newPlan }) || 'Time for your fitness plan update';
          },
          1
        );
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Meal Plan
    if (state.step === 'meal_plan_preference') {
      if (['vegetarian', 'vegan', 'omnivore'].includes(input)) {
        state.data.meal_preference = input;
        setState(userId, { step: 'meal_plan_goal', data: state.data });
        message.reply(getMessage('meal_plan_goal'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'meal_plan_goal') {
      if (['weight loss', 'muscle gain', 'general fitness'].includes(input)) {
        state.data.meal_goal = input;
        setState(userId, { step: 'meal_plan_duration', data: state.data });
        message.reply(getMessage('meal_plan_duration'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'meal_plan_duration') {
      const duration = parseInt(input);
      if (!isNaN(duration) && duration >= 1 && duration <= 365) {
        state.data.meal_duration = duration;
        setState(userId, { step: 'meal_plan_reminder_time', data: state.data });
        message.reply(getMessage('meal_plan_reminder_time'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'meal_plan_reminder_time') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (timeRegex.test(input)) {
        state.data.meal_reminder_time = input;
        const plan = await analyzeHealthData({
          preference: state.data.meal_preference,
          goal: state.data.meal_goal,
          age: state.data.age,
          weight: state.data.weight,
          height: state.data.height,
          sex: state.data.sex,
        });
        await pool.query(
          'INSERT INTO meal_plans (user_id, preference, goal, duration_days, reminder_time, plan) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, state.data.meal_preference, state.data.meal_goal, state.data.meal_duration, state.data.meal_reminder_time, plan]
        );
        const initialMessage = getMessage('meal_reminder', { plan: plan });
        message.reply(getMessage('meal_plan_result', { plan, duration: state.data.meal_duration }));
        scheduleReminder(
          userId,
          initialMessage, // Use initial plan message
          parseTimeToNextOccurrence(state.data.meal_reminder_time),
          async () => {
            const newPlan = await analyzeHealthData({
              preference: state.data.meal_preference,
              goal: state.data.meal_goal,
              age: state.data.age,
              weight: state.data.weight,
              height: state.data.height,
              sex: state.data.sex,
            });
            await pool.query(
              'UPDATE meal_plans SET plan = $1 WHERE user_id = $2 AND preference = $3 AND goal = $4 AND duration_days = $5',
              [newPlan, userId, state.data.meal_preference, state.data.meal_goal, state.data.meal_duration]
            );
            return getMessage('meal_reminder', { plan: newPlan }); // Return new message for next reminder
          },
          1 // Daily reminder (1 day)
        );
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Menstrual Cycle Tracking
    if (state.step === 'menstrual_tracking_update') {
      if (['yes', 'no'].includes(input)) {
        if (input === 'yes') {
          setState(userId, { step: 'menstrual_last_period', data: state.data });
          message.reply(getMessage('menstrual_last_period'));
        } else {
          state = { step: 'main_menu', data: state.data };
          setState(userId, state);
          message.reply(getMessage('main_menu', { sex: state.data.sex }));
        }
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'menstrual_last_period') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(input) && !isNaN(Date.parse(input))) {
        state.data.last_period = input;
        setState(userId, { step: 'menstrual_cycle_length', data: state.data });
        message.reply(getMessage('menstrual_cycle_length'));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    if (state.step === 'menstrual_cycle_length') {
      const cycleLength = parseInt(input);
      if (!isNaN(cycleLength) && cycleLength >= 21 && cycleLength <= 35) {
        const lastPeriod = new Date(state.data.last_period);
        const nextPeriod = new Date(lastPeriod.getTime() + cycleLength * 24 * 60 * 60 * 1000);
        const nextPeriodStr = nextPeriod.toISOString().split('T')[0];
        const analysis = await analyzeHealthData({
          last_period: state.data.last_period,
          cycle_length: cycleLength,
        });
        await pool.query(
          'INSERT INTO menstrual_cycles (user_id, last_period, cycle_length, next_period, analysis) VALUES ($1, $2, $3, $4, $5)',
          [userId, state.data.last_period, cycleLength, nextPeriodStr, analysis]
        );
        message.reply(getMessage('menstrual_result', { nextPeriod: nextPeriodStr, analysis }));
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Medication Reminder
    if (state.step === 'medication_name') {
      state.data.medication_name = input;
      setState(userId, { step: 'medication_time', data: state.data });
      message.reply(getMessage('medication_time'));
      return;
    }

    if (state.step === 'medication_time') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (timeRegex.test(input)) {
        state.data.medication_time = input;
        await pool.query(
          'INSERT INTO medication_reminders (user_id, medication_name, reminder_time) VALUES ($1, $2, $3)',
          [userId, state.data.medication_name, state.data.medication_time]
        );
        message.reply(getMessage('medication_result'));
        scheduleReminder(
          userId,
          getMessage('medication_reminder', { name: state.data.medication_name }),
          parseTimeToNextOccurrence(state.data.medication_time),
          async () => {
            const updatedReminder = await pool.query(
              'SELECT medication_name FROM medication_reminders WHERE user_id = $1 AND reminder_time = $2',
              [userId, state.data.medication_time]
            );
            const currentName = updatedReminder.rows[0]?.medication_name || state.data.medication_name;
            return getMessage('medication_reminder', { name: currentName }); // Update if changed
          },
          Infinity
        );
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Daily Health Tips
    if (state.step === 'daily_tips') {
      if (['subscribe', 'unsubscribe'].includes(input)) {
        if (input === 'subscribe') {
          await pool.query(
            'INSERT INTO subscriptions (user_id, daily_tips) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET daily_tips = $2',
            [userId, true]
          );
          message.reply(getMessage('daily_tips_subscribe'));
          scheduleReminder(
            userId,
            getMessage('daily_tip', { tip: await analyzeHealthData({ type: 'health_tip' }) }), // Initial tip
            parseTimeToNextOccurrence('08:00'),
            async () => {
              const newTip = await analyzeHealthData({ type: 'health_tip' });
              return getMessage('daily_tip', { tip: newTip }); // Generate new tip daily
            },
            Infinity // Ongoing daily reminders
          );
        } else {
          await pool.query(
            'INSERT INTO subscriptions (user_id, daily_tips) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET daily_tips = $2',
            [userId, false]
          );
          cancelReminders(userId);
          message.reply(getMessage('daily_tips_unsubscribe'));
        }
        state = { step: 'main_menu', data: state.data };
        setState(userId, state);
        message.reply(getMessage('main_menu', { sex: state.data.sex }));
      } else {
        message.reply(getMessage('error_invalid_input'));
      }
      return;
    }

    // Default: Show main menu for registered users
    state = { step: 'main_menu', data: state.data };
    setState(userId, state);
    message.reply(getMessage('main_menu', { sex: state.data.sex }));
  } catch (error) {
    logger.error('Error processing message:', error);
    message.reply(getMessage('error_general'));
    state = { step: 'main_menu', data: state.data };
    setState(userId, state);
    message.reply(getMessage('main_menu', { sex: state.data.sex }));
  }
});