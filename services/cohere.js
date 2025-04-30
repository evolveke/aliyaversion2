const { CohereClient } = require('cohere-ai');
const { logger } = require('../utils/logger');

// Initialize Cohere client with API key from environment variable
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Analyze health data using Cohere API
async function analyzeHealthData(data) {
  try {
    // Filter relevant health data for health assessment
    const healthData = {
      overall_health: data.overall_health,
      fruit_veggie_servings: parseInt(data.fruit_veggie) || 0,
      sugary_drinks_snacks: data.sugary_drinks,
      exercise_days: parseInt(data.exercise_days) || 0,
      sitting_breaks: data.sitting_breaks,
      sleep_hours: parseInt(data.sleep_hours) || 0,
      wake_refreshed: data.wake_refreshed,
      stress_anxiety: data.stress_anxiety,
      relaxation_techniques: data.relaxation_techniques,
      chronic_conditions: data.chronic_conditions,
      family_history: data.family_history,
      smoking_vaping: data.smoking_vaping,
      alcohol_drinks: parseInt(data.alcohol_drinks) || 0,
      headaches_body_aches: data.headaches_body_aches,
      weight_changes: data.weight_changes,
    };

    logger.debug('Filtered health data for Cohere:', healthData);

    // Build a prompt based on the data type
    const prompt = buildPrompt(data);

    // Use Cohere to generate a detailed analysis
    const generateResponse = await cohere.generate({
      model: 'command',
      prompt: prompt,
      max_tokens: 300,
      temperature: 0.7,
    });

    const analysis = generateResponse.generations[0].text.trim() || 'No analysis available';
    logger.debug('Cohere analysis result:', analysis);
    return analysis;
  } catch (error) {
    logger.error('Error in analyzeHealthData:', error);
    // Fallback response for network errors
    if (error.message.includes('fetch failed')) {
      return 'Unable to analyze health data due to a network issue. Please try again later or consult a doctor for personalized advice.';
    }
    return 'Unable to analyze health data at this time. Please consult a doctor for personalized advice.';
  }
}

// Build prompt based on input data
function buildPrompt(data) {
  if (data.type === 'health_tip') {
    return 'Generate a concise daily health tip for general wellness suitable for a user in Kenya.';
  }

  if (data.symptoms) {
    return `
      Analyze the following symptoms for a possible diagnosis, home care tips, and red flags requiring medical attention:
      Symptoms: ${data.symptoms}
      Severity: ${data.severity}
      Duration: ${data.duration} days
      Provide a clear and concise response, including a disclaimer to consult a doctor.
    `;
  }

  if (data.overall_health) {
    return `
      Analyze the following health assessment data for a user in Kenya and provide a summary with actionable recommendations:
      Overall Health: ${data.overall_health}
      Fruit/Veggie Servings: ${data.fruit_veggie}
      Sugary Drinks/Snacks: ${data.sugary_drinks}
      Exercise Days: ${data.exercise_days}
      Sitting Breaks: ${data.sitting_breaks}
      Sleep Hours: ${data.sleep_hours}
      Wake Refreshed: ${data.wake_refreshed}
      Stress/Anxiety: ${data.stress_anxiety}
      Relaxation Techniques: ${data.relaxation_techniques}
      Chronic Conditions: ${data.chronic_conditions}
      Family History: ${data.family_history}
      Smoking/Vaping: ${data.smoking_vaping}
      Alcohol Drinks: ${data.alcohol_drinks}
      Headaches/Body Aches: ${data.headaches_body_aches}
      Weight Changes: ${data.weight_changes}
      First, classify the user's health status as "Healthy", "Needs Improvement", or "Unhealthy" based on the data. Then, provide actionable recommendations considering local Kenyan lifestyle and resources. Include a disclaimer to consult a doctor.
    `;
  }

  if (data.goal && data.type) {
    return `
      Generate a personalized daily fitness plan for a user in Kenya with the following details:
      - Age: ${data.age || 'unknown'} years
      - Weight: ${data.weight || 'unknown'} kg
      - Height: ${data.height || 'unknown'} cm
      - Sex: ${data.sex || 'unknown'}
      - Fitness Goal: ${data.goal}
      - Workout Type: ${data.type} (strictly design the plan for ${data.type}-based workouts)
      - Daily Time: ${data.daily_time}
      Design a daily workout plan specifically for a ${data.type} setting, tailored to the user's age, weight, height, sex, and fitness goal. Include exercises suitable for ${data.type} environments in Kenya, considering local resources (e.g., minimal equipment for home workouts, or gym equipment for gym settings).
    `;
  }

  if (data.preference && data.goal) {
    return `
      Generate a personalized daily meal plan using Kenyan local foods for a user with the following details:
      - Age: ${data.age || 'unknown'} years
      - Weight: ${data.weight || 'unknown'} kg
      - Height: ${data.height || 'unknown'} cm
      - Sex: ${data.sex || 'unknown'}
      - Dietary Preference: ${data.preference}
      - Goal: ${data.goal} (strictly design the meal plan to support ${data.goal})
      Design a daily meal plan with breakfast, lunch, dinner, and snacks, specifically tailored to support the user's goal of ${data.goal}, considering their age, weight, height, and sex. Use locally available foods in Kenya to meet their nutritional needs.
    `;
  }

  if (data.last_period && data.cycle_length) {
    return `
      Analyze the following menstrual cycle data and provide health tips for a user in Kenya:
      Last Period: ${data.last_period}
      Cycle Length: ${data.cycle_length} days
      Provide tips for menstrual health and wellness, considering local Kenyan resources and practices.
    `;
  }

  if (data.latest_score && data.latest_analysis) {
    return `
      Compare the following health assessments for a user in Kenya and provide insights:
      Latest Assessment: Score ${data.latest_score}, Analysis: ${data.latest_analysis}
      Previous Assessment: Score ${data.previous_score || 'N/A'}, Analysis: ${data.previous_analysis || 'N/A'}
      Highlight improvements or concerns and provide recommendations tailored to a Kenyan lifestyle.
    `;
  }

  if (data.previousAnalysis) {
    return `
      Follow up on the previous symptom analysis for a user in Kenya: ${data.previousAnalysis}
      Check if symptoms are persistent and recommend next steps, including seeking medical attention if necessary. Consider local healthcare access in Kenya.
    `;
  }

  return 'Provide a general health analysis based on available data for a user in Kenya, considering local lifestyle and resources.';
}

module.exports = { analyzeHealthData };