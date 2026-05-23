// MCP Tool: getUserProfile
// Wraps existing Prisma profile query — no business logic here
const prisma = require('../../src/lib/prisma');

async function getUserProfile({ userId }) {
  console.log(`[MCP] getUserProfile called for userId=${userId}`);
  try {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { error: 'No profile found for this user' };
    return {
      education: profile.education,
      skills: profile.skills,
      interests: profile.interests,
      careerGoal: profile.careerGoal,
      salaryGoal: profile.salaryGoal,
      studyHours: profile.dailyStudyHours,
    };
  } catch (err) {
    console.error('[MCP] getUserProfile error:', err.message);
    return { error: err.message };
  }
}

module.exports = { getUserProfile };
