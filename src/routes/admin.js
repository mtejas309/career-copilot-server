const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(requireAuth, requireAdmin);

// GET /api/admin/users — list all users
router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          resumes: true,
          roadmaps: true,
          chatMessages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

// GET /api/admin/users/:id — full detail for one user
router.get('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      profile: true,
      resumes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileUrl: true, analysisJson: true, createdAt: true },
      },
      roadmaps: {
        orderBy: { generatedAt: 'desc' },
        include: { weeks: { include: { goals: true } } },
      },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
});

// PATCH /api/admin/users/:id/role — promote/demote user
router.patch('/users/:id/role', async (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "admin"' });
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(updated);
});

// GET /api/admin/stats — overall platform stats
router.get('/stats', async (_req, res) => {
  const [totalUsers, totalResumes, totalRoadmaps, totalMessages] = await Promise.all([
    prisma.user.count(),
    prisma.resume.count(),
    prisma.roadmap.count(),
    prisma.chatMessage.count(),
  ]);
  res.json({ totalUsers, totalResumes, totalRoadmaps, totalMessages });
});

module.exports = router;
