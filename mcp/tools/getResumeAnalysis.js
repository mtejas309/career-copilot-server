// MCP Tool: getResumeAnalysis
// Fetches latest resume analysis JSON from DB — no re-calling AI
const prisma = require('../../src/lib/prisma');

async function getResumeAnalysis({ userId }) {
  console.log(`[MCP] getResumeAnalysis called for userId=${userId}`);
  try {
    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!resume) return { error: 'No resume found for this user' };
    if (!resume.analysisJson) return { error: 'Resume uploaded but not yet analyzed' };

    const a = resume.analysisJson;
    return {
      strengths: a.strengths ?? [],
      weaknesses: a.weaknesses ?? [],
      skillGaps: a.missingSkills ?? [],
      recommendations: a.recommendations ?? [],
      skills: a.skills ?? [],
      experience: a.experience ?? '',
    };
  } catch (err) {
    console.error('[MCP] getResumeAnalysis error:', err.message);
    return { error: err.message };
  }
}

module.exports = { getResumeAnalysis };
