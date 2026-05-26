// Agent: Daily Study Plan
// Generates a personalized study plan for today based on pending goals and study hours
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUserProfile } = require('../tools/getUserProfile');
const { getRoadmapProgress } = require('../tools/getRoadmapProgress');
const { getChatHistorySummary } = require('../tools/getChatHistorySummary');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

async function dailyStudyPlanAgent(userId) {
  console.log(`[Agent] dailyStudyPlanAgent started for userId=${userId}`);

  const [profile, roadmap, chatSummary] = await Promise.all([
    getUserProfile({ userId }),
    getRoadmapProgress({ userId }),
    getChatHistorySummary({ userId }),
  ]);

  const prompt = `You are a daily study coach. Create a focused study plan for today based on the data below.

User Profile:
${JSON.stringify(profile, null, 2)}

Roadmap Progress:
${JSON.stringify(roadmap, null, 2)}

Recent Chat Topics:
${JSON.stringify(chatSummary, null, 2)}

Return a JSON object with exactly these fields:
{
  "date": string (today's date),
  "totalHours": number (from profile studyHours),
  "greeting": string (short personalized greeting),
  "blocks": [
    {
      "time": string (e.g. "0:00 - 0:45"),
      "topic": string,
      "goal": string,
      "resource": string,
      "type": "learn" | "practice" | "review"
    }
  ],
  "focusGoal": string (the single most important goal for today),
  "tip": string (one motivational or practical tip),
  "estimatedProgress": string (e.g. "After today you will be 55% complete")
}

Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

module.exports = { dailyStudyPlanAgent };
