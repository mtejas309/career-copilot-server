const { GoogleGenerativeAI } = require('@google/generative-ai');
const { toolDeclarations, executeTool } = require('../../mcp/executor');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Model with MCP tools registered for function calling
const modelWithTools = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  tools: [{ functionDeclarations: toolDeclarations }],
});

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

// New MCP-powered chat flow:
// 1. AI decides which tools to call based on user message
// 2. We execute those tools to fetch real user data
// 3. AI generates final response using tool results
async function chatReply(userId, history) {
  const systemInstruction = {
    role: 'system',
    parts: [{
      text: `You are an expert AI career coach. You have access to tools to fetch the user's profile, resume analysis, roadmap progress, and chat history summary.
Always call the relevant tools before answering to give personalized, data-driven advice.
Be concise, encouraging, and actionable.`,
    }],
  };

  const chatHistory = history.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = modelWithTools.startChat({
    history: chatHistory,
    systemInstruction,
  });

  const lastMessage = history[history.length - 1];
  console.log(`[AI] Sending message to Gemini with MCP tools for userId=${userId}`);

  let result = await chat.sendMessage(lastMessage.content);
  let response = result.response;

  // Agentic loop: keep executing tools until AI gives a final text response
  while (response.functionCalls && response.functionCalls().length > 0) {
    const toolResults = [];

    for (const call of response.functionCalls()) {
      console.log(`[AI] Gemini requested tool: ${call.name}`, call.args);
      const toolResult = await executeTool(call.name, { ...call.args, userId });
      console.log(`[AI] Tool result for ${call.name}:`, toolResult);

      toolResults.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    // Send tool results back to AI
    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  return response.text();
}

module.exports = { analyzeResume, generateRoadmap, chatReply };
