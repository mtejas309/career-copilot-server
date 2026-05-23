const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { chatReply } = require('../lib/ai');

const HISTORY_WINDOW = 20;

router.get('/chat/history', requireAuth, async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/chat/message', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  await prisma.chatMessage.create({ data: { userId: req.userId, role: 'user', content } });

  // MCP flow: only fetch history — AI will call MCP tools itself for profile/roadmap
  const history = await prisma.chatMessage.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_WINDOW,
  });

  let reply;
  try {
    reply = await chatReply(req.userId, history.reverse());
  } catch (err) {
    console.error('AI chat failed:', err.message);
    return res.status(503).json({ error: 'AI is currently unavailable. Please try again later.' });
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: { userId: req.userId, role: 'assistant', content: reply },
  });

  res.json(assistantMessage);
});

router.delete('/chat/history', requireAuth, async (req, res) => {
  await prisma.chatMessage.deleteMany({ where: { userId: req.userId } });
  res.json({ message: 'Chat history cleared' });
});

module.exports = router;
