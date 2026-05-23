const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.get('/profile', requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
  res.json(profile);
});

router.put('/profile', requireAuth, async (req, res) => {
  const { education, skills, interests, careerGoal, salaryGoal, dailyStudyHours } = req.body;
  const profile = await prisma.profile.upsert({
    where: { userId: req.userId },
    update: { education, skills, interests, careerGoal, salaryGoal, dailyStudyHours },
    create: { userId: req.userId, education, skills, interests, careerGoal, salaryGoal, dailyStudyHours },
  });
  res.json(profile);
});

module.exports = router;
