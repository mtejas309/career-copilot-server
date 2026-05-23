const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { generateRoadmap } = require('../lib/ai');

router.get('/roadmap', requireAuth, async (req, res) => {
  const roadmap = await prisma.roadmap.findFirst({
    where: { userId: req.userId },
    orderBy: { generatedAt: 'desc' },
    include: {
      weeks: {
        include: { goals: true },
        orderBy: { weekNumber: 'asc' },
      },
    },
  });
  if (!roadmap) return res.status(404).json({ error: 'No roadmap found' });
  res.json(roadmap);
});

router.post('/roadmap/generate', requireAuth, async (req, res) => {
  const [profile, resume] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: req.userId } }),
    prisma.resume.findFirst({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  if (!profile) return res.status(400).json({ error: 'Complete your profile first' });

  let aiResult;
  try {
    aiResult = await generateRoadmap(profile, resume?.analysisJson ?? {});
  } catch (err) {
    console.error('AI roadmap failed:', err.message);
    return res.status(503).json({ error: 'AI is currently unavailable. Please try again later.' });
  }

  const roadmap = await prisma.roadmap.create({
    data: {
      userId: req.userId,
      title: aiResult.title,
      goal: aiResult.goal,
      duration: aiResult.duration,
      weeks: {
        create: aiResult.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          theme: w.theme,
          resources: w.resources ?? [],
          goals: {
            create: (w.goals ?? []).map((title) => ({ title })),
          },
        })),
      },
    },
    include: {
      weeks: {
        include: { goals: true },
        orderBy: { weekNumber: 'asc' },
      },
    },
  });

  res.status(201).json(roadmap);
});

router.patch('/roadmap/goals/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const goal = await prisma.roadmapGoal.findUnique({ where: { id } });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const updated = await prisma.roadmapGoal.update({
    where: { id },
    data: {
      completed: !goal.completed,
      completedAt: !goal.completed ? new Date() : null,
    },
  });
  res.json(updated);
});

module.exports = router;
