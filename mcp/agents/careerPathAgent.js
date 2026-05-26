// Agent: Career Path Advisor
// Suggests job roles the user can apply for now, in 4 weeks, and in 3 months
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUserProfile } = require('../tools/getUserProfile');
const { getResumeAnalysis } = require('../tools/getResumeAnalysis');
const { getRoadmapProgress } = require('../tools/getRoadmapProgress');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

async function careerPathAgent(userId) {
  console.log(`[Agent] careerPathAgent started for userId=${userId}`);

  const [profile, resume, roadmap] = await Promise.all([
    getUserProfile({ userId }),
    getResumeAnalysis({ userId }),
    getRoadmapProgress({ userId }),
  ]);

  const prompt = `You are a career advisor. Based on the user's current skills and learning progress, suggest career paths.

User Profile:
${JSON.stringify(profile, null, 2)}

Resume Analysis:
${JSON.stringify(resume, null, 2)}

Roadmap Progress:
${JSON.stringify(roadmap, null, 2)}

Return a JSON object with exactly these fields:
{
  "currentLevel": string (e.g. "Junior Developer"),
  "targetRole": string (from profile careerGoal),
  "now": [
    {
      "title": string,
      "salaryRange": string,
      "matchPercentage": number,
      "requiredSkills": string[],
      "userHas": string[],
      "userMissing": string[]
    }
  ],
  "inFourWeeks": [
    {
      "title": string,
      "salaryRange": string,
      "matchPercentage": number,
      "whatToComplete": string[]
    }
  ],
  "inThreeMonths": [
    {
      "title": string,
      "salaryRange": string,
      "matchPercentage": number,
      "whatToComplete": string[]
    }
  ],
  "salaryGrowth": string (e.g. "$60k → $80k → $110k"),
  "advice": string (one paragraph career advice)
}

Suggest 2 roles for each timeframe. Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

module.exports = { careerPathAgent };
