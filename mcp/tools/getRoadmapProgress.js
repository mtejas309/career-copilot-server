// MCP Tool: getRoadmapProgress
// Aggregates roadmap + weeks + goals into a progress summary
const prisma = require('../../src/lib/prisma');

async function getRoadmapProgress({ userId }) {
  console.log(`[MCP] getRoadmapProgress called for userId=${userId}`);
  try {
    const roadmap = await prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      include: {
        weeks: {
          include: { goals: true },
          orderBy: { weekNumber: 'asc' },
        },
      },
    });

    if (!roadmap) return { error: 'No roadmap found for this user' };

    const allGoals = roadmap.weeks.flatMap((w) => w.goals);
    const completedGoals = allGoals.filter((g) => g.completed);
    const pendingGoals = allGoals.filter((g) => !g.completed);
    const progressPercentage =
      allGoals.length > 0 ? Math.round((completedGoals.length / allGoals.length) * 100) : 0;

    return {
      title: roadmap.title,
      goal: roadmap.goal,
      duration: roadmap.duration,
      totalGoals: allGoals.length,
      completedGoals: completedGoals.map((g) => g.title),
      pendingGoals: pendingGoals.map((g) => g.title),
      progressPercentage,
      currentWeek: roadmap.weeks.find((w) => w.goals.some((g) => !g.completed))?.weekNumber ?? roadmap.duration,
    };
  } catch (err) {
    console.error('[MCP] getRoadmapProgress error:', err.message);
    return { error: err.message };
  }
}

module.exports = { getRoadmapProgress };
