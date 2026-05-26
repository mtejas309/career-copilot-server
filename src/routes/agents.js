const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { jobReadinessAgent } = require('../../mcp/agents/jobReadinessAgent');
const { dailyStudyPlanAgent } = require('../../mcp/agents/dailyStudyPlanAgent');
const { generateInterviewQuestions, evaluateAnswer, generateInterviewSummary } = require('../../mcp/agents/mockInterviewAgent');
const { careerPathAgent } = require('../../mcp/agents/careerPathAgent');

// GET /api/agents/job-readiness
// Returns readiness score, verdict, missing skills, what to apply for now
router.get('/job-readiness', requireAuth, async (req, res) => {
  try {
    const result = await jobReadinessAgent(req.userId);
    res.json(result);
  } catch (err) {
    console.error('[Route] job-readiness error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

// GET /api/agents/daily-plan
// Returns today's personalized study schedule
router.get('/daily-plan', requireAuth, async (req, res) => {
  try {
    const result = await dailyStudyPlanAgent(req.userId);
    res.json(result);
  } catch (err) {
    console.error('[Route] daily-plan error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

// GET /api/agents/career-path
// Returns job roles user can apply for now, in 4 weeks, in 3 months
router.get('/career-path', requireAuth, async (req, res) => {
  try {
    const result = await careerPathAgent(req.userId);
    res.json(result);
  } catch (err) {
    console.error('[Route] career-path error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

// POST /api/agents/interview/start
// Generates 5 interview questions based on profile + resume
router.post('/interview/start', requireAuth, async (req, res) => {
  try {
    const result = await generateInterviewQuestions(req.userId);
    res.json(result);
  } catch (err) {
    console.error('[Route] interview/start error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

// POST /api/agents/interview/evaluate
// Evaluates a single answer
// Body: { question: string, answer: string, role: string }
router.post('/interview/evaluate', requireAuth, async (req, res) => {
  const { question, answer, role } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'question and answer are required' });
  }
  try {
    const result = await evaluateAnswer(question, answer, role || 'Software Developer');
    res.json(result);
  } catch (err) {
    console.error('[Route] interview/evaluate error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

// POST /api/agents/interview/summary
// Generates final interview summary
// Body: { questions: string[], answers: string[] }
router.post('/interview/summary', requireAuth, async (req, res) => {
  const { questions, answers } = req.body;
  if (!questions || !answers || questions.length !== answers.length) {
    return res.status(400).json({ error: 'questions and answers arrays required with equal length' });
  }
  try {
    const result = await generateInterviewSummary(questions, answers);
    res.json(result);
  } catch (err) {
    console.error('[Route] interview/summary error:', err.message);
    res.status(503).json({ error: 'Agent unavailable. Please try again later.' });
  }
});

module.exports = router;
