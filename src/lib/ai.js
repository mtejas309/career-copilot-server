const { generateText, generateWithTools } = require('./modelRouter');
const { toolDeclarations, executeTool } = require('../../mcp/executor');

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

async function analyzeResume(rawText) {
  const prompt = `Analyze the following resume and return a JSON object with these fields:
- skills: string[] (skills the candidate has)
- missingSkills: string[] (common skills for their target role that are absent)
- experience: string (brief summary of experience level and background)
- strengths: string[]
- weaknesses: string[]
- recommendations: string[]

Return only valid JSON, no markdown fences or explanation.

Resume:
${rawText}`;

  const { text } = await generateText(prompt);
  return JSON.parse(stripJsonFences(text));
}

async function generateRoadmap(profile, analysisJson) {
  const prompt = `Create a structured learning roadmap for a job seeker. Return a JSON object with:
- title: string
- goal: string
- duration: number (weeks)
- weeks: array of { weekNumber, theme, resources: string[], goals: string[] }

User profile:
${JSON.stringify(profile, null, 2)}

Resume analysis:
${JSON.stringify(analysisJson, null, 2)}

Return only valid JSON, no markdown fences or explanation.`;

  const { text } = await generateText(prompt);
  return JSON.parse(stripJsonFences(text));
}

async function chatReply(userId, history) {
  const systemInstruction = {
    role: 'system',
    parts: [{
      text: `You are an expert AI career coach. You have access to tools to fetch the user's profile, resume analysis, roadmap progress, and chat history summary.
Always call the relevant tools before answering to give personalized, data-driven advice.
Be concise, encouraging, and actionable.`,
    }],
  };

  const { text, provider } = await generateWithTools(history, systemInstruction, toolDeclarations, executeTool, userId);
  return { reply: text, provider };
}

module.exports = { analyzeResume, generateRoadmap, chatReply };
