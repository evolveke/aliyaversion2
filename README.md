Aliya Health Bot
Aliya Health Bot is a WhatsApp-based health assistant for users in Kenya, powered by Cohere AI. It provides personalized health assessments, symptom diagnoses, fitness and meal plans, menstrual cycle tracking, medication reminders, and daily health tips.
Features

Health Assessment: Evaluate your overall health with a detailed questionnaire and get a score and recommendations.
Symptom Diagnosis: Analyze symptoms for possible diagnoses, home care tips, and medical red flags.
Fitness Plan: Generate personalized daily workout plans tailored to your goal (weight loss, muscle gain, general fitness) and workout type (home, gym).
Meal Plan: Create daily meal plans using Kenyan local foods, tailored to your dietary preference (vegetarian, vegan, omnivore) and goal.
Menstrual Cycle Tracking: Track menstrual cycles and get health tips (for female users).
Medication Reminders: Set reminders for medications with customizable times.
Daily Health Tips: Subscribe to receive daily health tips via WhatsApp.

Prerequisites

Node.js (v16 or higher)
PostgreSQL database
WhatsApp Business API account
Cohere API key

Setup Instructions

Clone the Repository:
git clone <repository-url>
cd aliya-health-bot


Install Dependencies:
npm install


Set Up Environment Variables:

Create a .env file in the root directory.
Add the following variables:COHERE_API_KEY=<your-cohere-api-key>
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
WHATSAPP_TOKEN=<your-whatsapp-token>




Initialize the Database:

Ensure PostgreSQL is running.
The app automatically creates tables on startup via schema.js.


Run the Bot:
node index.js


Authenticate with WhatsApp:

Scan the QR code displayed in the terminal using your WhatsApp account.



Usage

Start the Bot: Send "start" to the bot on WhatsApp.
Onboarding: Complete the onboarding process by providing your name, age, sex, height, weight, and location.
Main Menu: Choose from the available options (1-7) to access features:
Health Assessment
Symptom Diagnosis
Fitness Plan
Meal Plan
Menstrual Cycle Tracking (female users only)
Medication Reminder
Daily Health Tips


Cancel: Type "cancel" at any time to stop the current process and return to the main menu.

Deployment on Render

Create a new Web Service on Render.
Connect your GitHub repository.
Set the following configurations:
Runtime: Node
Build Command: npm install
Start Command: node index.js


Add environment variables in Render’s dashboard (same as in .env).
Deploy the service.
Use Render’s logs to monitor the bot and troubleshoot issues.

Notes

The bot uses Cohere AI for generating health analyses, fitness plans, meal plans, and tips.
All user data is stored in a PostgreSQL database.
Ensure your WhatsApp Business API token is valid and your number is active.

License
This project is licensed under the MIT License. See the LICENSE file for details.
