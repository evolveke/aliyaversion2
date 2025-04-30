const messages = {
  // Introduction message for unregistered users
  introduction: `
Hello! I am Aliya, your personal health assistant. I can help you with health assessments, symptom diagnosis, fitness and meal plans, menstrual cycle tracking, medication reminders, and daily health tips. To get started, please type "start".
  `,

  // Disclaimer message
  disclaimer: `
**Disclaimer and Terms of Use**

Aliya Health Bot provides general health information and tools for wellness tracking. Here’s how it works and what you need to know:

- **Not Medical Advice**: I am not a doctor. The information I provide is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.
- **Data Usage**: Your data (e.g., name, age, health information) will be stored securely in a database to personalize your experience and provide tailored recommendations.
- **Data Security**: We use industry-standard encryption and security practices to protect your data. However, no system is 100% secure, and you share information at your own risk.
- **Consent**: By using this bot, you consent to the collection, storage, and use of your data as described.

Please type "accept" to agree to these terms and proceed, or "decline" to exit.
  `,

  // Response for declining terms
  decline_response: `
Thank you for your interest. If you change your mind, feel free to message me again to start the process. Goodbye!
  `,

  // Main menu (unchanged)
  main_menu: (sex) => `
Please choose an option by typing the number:
1. Health Assessment
2. Symptom Diagnosis
3. Fitness Plan
4. Meal Plan
${sex === 'female' ? '5. Menstrual Cycle Tracking\n' : ''}6. Medication Reminder
7. Daily Health Tips
Type "cancel" to reset.
  `,

  // Error messages (unchanged)
  error_invalid_input: 'Invalid input. Please try again with the correct format.',
  error_general: 'Something went wrong. Please try again later.',
  error_not_available: 'This feature is not available for your profile.',

  // Onboarding (unchanged)
  onboarding_name: 'Please enter your full name.',
  onboarding_age: 'Please enter your age (18-120).',
  onboarding_sex: 'Please enter your sex (male/female).',
  onboarding_height: 'Please enter your height in cm (100-250).',
  onboarding_weight: 'Please enter your weight in kg (30-300).',
  onboarding_location: 'Please enter your location (e.g., Nairobi).',
  onboarding_menstrual: 'Do you have a menstrual cycle? (yes/no)',

  // Health Assessment (unchanged)
  health_assessment_start: 'Starting health assessment. Answer the following questions.',
  assessment_overall_health: 'How would you rate your overall health? (excellent/good/fair/poor)',
  assessment_fruit_veggie: 'How many servings of fruits and vegetables do you eat daily? (e.g., 3)',
  assessment_sugary_drinks: 'How often do you consume sugary drinks or snacks? (daily/weekly/rarely/never)',
  assessment_exercise_days: 'How many days per week do you exercise? (0-7)',
  assessment_sitting_breaks: 'How often do you take breaks from sitting? (often/sometimes/rarely/never)',
  assessment_sleep_hours: 'How many hours do you sleep per night? (e.g., 7)',
  assessment_wake_refreshed: 'Do you wake up feeling refreshed? (always/mostly/sometimes/never)',
  assessment_stress_anxiety: 'How often do you feel stressed or anxious? (always/mostly/sometimes/never)',
  assessment_relaxation_techniques: 'Do you use relaxation techniques like meditation? (yes/no)',
  assessment_chronic_conditions: 'Do you have any chronic conditions? (yes/no)',
  assessment_family_history: 'Is there a family history of chronic diseases? (yes/no)',
  assessment_smoking_vaping: 'Do you smoke or vape? (yes/no)',
  assessment_alcohol_drinks: 'How many alcoholic drinks do you have per week? (e.g., 2)',
  assessment_headaches_body_aches: 'Do you experience frequent headaches or body aches? (always/mostly/sometimes/never)',
  assessment_weight_changes: 'Have you had unintentional weight changes recently? (yes/no)',
  assessment_result: 'Health Assessment Complete!\nScore: {score}/100\nAnalysis: {analysis}\nConsult a doctor for professional advice.',

  // Symptom Diagnosis (unchanged)
  symptom_diagnosis: 'Please describe your symptoms (e.g., fever, cough).',
  symptom_severity: 'How severe are your symptoms? (mild/moderate/severe)',
  symptom_duration: 'How many days have you had these symptoms? (e.g., 2)',
  symptom_result: 'Diagnosis: {analysis}\nPlease consult a doctor for a professional diagnosis.',
  symptom_followup: 'How are your symptoms now? Reply with an update or type "cancel".',
  symptom_persist: 'Your symptoms may be serious. Please seek immediate medical attention.',

  // Fitness Plan (added reminder time prompt)
  fitness_plan_goal: 'What is your fitness goal? (weight loss/muscle gain/general fitness)',
  fitness_plan_type: 'Where will you work out? (home/gym)',
  fitness_plan_duration: 'How many days do you want to pursue this goal? (1-365)',
  fitness_plan_daily_time: 'How long will you work out daily? (30min/45min/1hr)',
  fitness_plan_reminder_time: 'At what time would you like to receive your daily fitness plan? (HH:MM, 24-hour format)',
  fitness_plan_result: 'Fitness Plan:\n{plan}\nYou’ll receive a new plan daily at your specified time for {duration} days.',
  fitness_reminder: 'Time for your workout!\nToday’s Plan: {plan}',

  // Meal Plan (added reminder time prompt)
  meal_plan_preference: 'What is your dietary preference? (vegetarian/vegan/omnivore)',
  meal_plan_goal: 'What is your meal plan goal? (weight loss/muscle gain/general fitness)',
  meal_plan_duration: 'How many days do you want to pursue this goal? (1-365)',
  meal_plan_reminder_time: 'At what time would you like to receive your daily meal plan? (HH:MM, 24-hour format)',
  meal_plan_result: 'Meal Plan:\n{plan}\nYou’ll receive a new plan daily at your specified time for {duration} days.',
  meal_reminder: 'Time for your meal!\nToday’s Plan: {plan}',

  // Menstrual Cycle Tracking (unchanged)
  menstrual_tracking_update: 'Do you want to update your menstrual cycle details? (yes/no)',
  menstrual_last_period: 'Please enter the start date of your last period (YYYY-MM-DD).',
  menstrual_cycle_length: 'What is your average cycle length in days? (21-35)',
  menstrual_result: 'Next Period: {nextPeriod}\nTips: {analysis}\nTrack again next month.',

  // Medication Reminder (unchanged)
  medication_name: 'Please enter the name of the medication.',
  medication_time: 'Please enter the reminder time (HH:MM, 24-hour format).',
  medication_result: 'Medication reminder set! You’ll be notified daily.',
  medication_reminder: 'Time to take your medication: {name}',

  // Daily Health Tips (unchanged)
  daily_tips: 'Do you want to subscribe or unsubscribe from daily health tips? (subscribe/unsubscribe)',
  daily_tips_subscribe: 'You’re now subscribed to daily health tips!',
  daily_tips_unsubscribe: 'You’ve unsubscribed from daily health tips.',
  daily_tip: 'Daily Health Tip: {tip}',
};

function getMessage(key, params = {}) {
  let message = messages[key] || messages.error_general;
  if (typeof message === 'function') {
    message = message(params.sex || '');
  }
  for (const [param, value] of Object.entries(params)) {
    message = message.replace(`{${param}}`, value);
  }
  return message;
}

module.exports = { getMessage };