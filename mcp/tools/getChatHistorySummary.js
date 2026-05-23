// MCP Tool: getChatHistorySummary
// Pulls recent messages and extracts lightweight context for AI
const prisma = require('../../src/lib/prisma');

async function getChatHistorySummary({ userId }) {
  console.log(`[MCP] getChatHistorySummary called for userId=${userId}`);
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId, role: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (messages.length === 0) return { commonTopics: [], userInterests: [], recentQuestions: [] };

    const recentQuestions = messages.slice(0, 5).map((m) => m.content);

    // Extract simple keyword topics from all user messages
    const allText = messages.map((m) => m.content.toLowerCase()).join(' ');
    const topicKeywords = [
      'resume', 'job', 'salary', 'interview', 'skills', 'roadmap',
      'react', 'python', 'javascript', 'machine learning', 'ai', 'backend',
      'frontend', 'fullstack', 'career', 'learning', 'certification', 'linkedin',
    ];
    const commonTopics = topicKeywords.filter((kw) => allText.includes(kw));

    return {
      commonTopics,
      userInterests: commonTopics.slice(0, 5),
      recentQuestions,
      totalMessagesSent: messages.length,
    };
  } catch (err) {
    console.error('[MCP] getChatHistorySummary error:', err.message);
    return { error: err.message };
  }
}

module.exports = { getChatHistorySummary };
