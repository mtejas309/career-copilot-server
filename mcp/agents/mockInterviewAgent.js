// Agent: Mock Interview
// Generates interview questions based on target role and weak areas,
// and evaluates user answers when submitted
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUserProfile } = require('../tools/getUserProfile');
const { getResumeAnalysis } = require('../tools/getResumeAnalysis');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Step 1: Generate interview questions
async function generateInterviewQuestions(userId) {
  console.log(`[Agent] mockInterviewAgent generateQuestions for userId=${userId}`);

  const [profile, resume] = await Promise.all([
    getUserProfile({ userId }),
    getResumeAnalysis({ userId }),
  ]);

  const prompt = `You are a senior technical interviewer. Generate a mock interview for this candidate.

User Profile:
${JSON.stringify(profile, null, 2)}

Resume Analysis:
${JSON.stringify(resume, null, 2)}

Return a JSON object with exactly these fields:
{
  "role": string (target role from profile),
  "difficulty": "Junior" | "Mid" | "Senior",
  "questions": [
    {
      "id": number,
      "type": "technical" | "behavioral" | "gap",
      "question": string,
      "topic": string,
      "hint": string (optional hint for the user)
    }
  ],
  "totalQuestions": number,
  "estimatedTime": string (e.g. "20-30 minutes"),
  "focusAreas": string[]
}

Generate exactly 5 questions:
- 2 technical (based on their existing skills)
- 2 gap questions (based on missing skills)
- 1 behavioral

Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

// Step 2: Evaluate a single answer
async function evaluateAnswer(question, answer, role) {
  console.log(`[Agent] mockInterviewAgent evaluateAnswer for question: ${question}`);

  const prompt = `You are a senior ${role} interviewer. Evaluate this interview answer.

Question: ${question}
Candidate Answer: ${answer}

Return a JSON object with exactly these fields:
{
  "score": number (1-10),
  "grade": "Excellent" | "Good" | "Average" | "Needs Improvement",
  "strengths": string[],
  "improvements": string[],
  "modelAnswer": string (ideal answer in 2-3 sentences),
  "feedback": string (one paragraph personalized feedback)
}

Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

// Step 3: Generate final interview summary after all answers
async function generateInterviewSummary(questions, answers) {
  console.log(`[Agent] mockInterviewAgent generateSummary`);

  const prompt = `You are a senior interviewer. Summarize this mock interview performance.

Questions and Answers:
${JSON.stringify(questions.map((q, i) => ({ question: q.question, answer: answers[i] })), null, 2)}

Return a JSON object with exactly these fields:
{
  "overallScore": number (1-100),
  "grade": "Excellent" | "Good" | "Average" | "Needs Improvement",
  "strongAreas": string[],
  "weakAreas": string[],
  "topRecommendations": string[],
  "readyToInterview": boolean,
  "summary": string (2-3 sentence overall summary)
}

Return only valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}

module.exports = { generateInterviewQuestions, evaluateAnswer, generateInterviewSummary };
