// MCP Executor
// Single entry point to call any MCP tool by name.
// AI layer calls this after deciding which tools are needed.
const { getUserProfile } = require('./tools/getUserProfile');
const { getResumeAnalysis } = require('./tools/getResumeAnalysis');
const { getRoadmapProgress } = require('./tools/getRoadmapProgress');
const { getChatHistorySummary } = require('./tools/getChatHistorySummary');

const tools = {
  getUserProfile,
  getResumeAnalysis,
  getRoadmapProgress,
  getChatHistorySummary,
};

// Gemini function declarations — tells AI what tools exist and what params they take
const toolDeclarations = [
  {
    name: 'getUserProfile',
    description: 'Get the user profile including education, skills, interests, career goal, salary goal, and study hours.',
    parameters: {
      type: 'OBJECT',
      properties: { userId: { type: 'NUMBER', description: 'The user ID' } },
      required: ['userId'],
    },
  },
  {
    name: 'getResumeAnalysis',
    description: 'Get the AI analysis of the user resume including strengths, weaknesses, skill gaps, and recommendations.',
    parameters: {
      type: 'OBJECT',
      properties: { userId: { type: 'NUMBER', description: 'The user ID' } },
      required: ['userId'],
    },
  },
  {
    name: 'getRoadmapProgress',
    description: 'Get the user roadmap progress including completed goals, pending goals, and progress percentage.',
    parameters: {
      type: 'OBJECT',
      properties: { userId: { type: 'NUMBER', description: 'The user ID' } },
      required: ['userId'],
    },
  },
  {
    name: 'getChatHistorySummary',
    description: 'Get a summary of the user recent chat history including common topics and recent questions.',
    parameters: {
      type: 'OBJECT',
      properties: { userId: { type: 'NUMBER', description: 'The user ID' } },
      required: ['userId'],
    },
  },
];

async function executeTool(name, args) {
  const tool = tools[name];
  if (!tool) throw new Error(`Unknown MCP tool: ${name}`);
  console.log(`[MCP Executor] Running tool: ${name}`, args);
  return await tool(args);
}

module.exports = { toolDeclarations, executeTool };
