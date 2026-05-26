// Agent: Job Readiness
// Evaluates if the user is ready to apply for jobs based on profile, resume, and roadmap
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUserProfile } = require('../tools/getUserProfile');
const { getResumeAnalysis } = require('../tools/getResumeAnalysis');
const { getRoadmapProgress } = require('../tools/getRoadmapProgress');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

async function jobReadinessAgent(userId) {
  console.log(`[Agent] jobReadinessAgent started for userId=${userId}`);

  const [profile, resume, roadmap] = await Promise.all([
    getUserProfile({ userId }),
    getResumeAnalysis({ userId }),
    getRoadmapProgress({ userId }),
  ]);

  const prompt = `You are a career readiness evaluator. Based on the data below, evaluate if this user is ready to apply for jobs.

User Profile:
${JSON.stringify(profile, null, 2)}

Resume Analysis:
${JSON.stringify(resume, null, 2)}

Roadmap Progress:
${JSON.stringify(roadmap, null, 2)}

Return a JSON object with exactly these fields:
{
  "readinessScore": number (0-100),
  "verdict": "Ready" | "Almost Ready" | "Not Ready",
  "currentSkills": string[],
  "missingSkills": string[],
  "completedGoals": number,
  "pendingGoals": number,
  "progressPercentage": number,
  "canApplyFor": string[],
  "readyIn": string,
  "topActions": string[],
  "summary": string
}

Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

module.exports = { jobReadinessAgent };
