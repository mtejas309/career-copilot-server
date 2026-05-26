const { GoogleGenerativeAI } = require('@google/generative-ai');

// Wave order: Gemini → OpenRouter → Groq
const WAVE = [
  {
    name: 'gemini',
    textModel: 'gemini-2.0-flash-lite',
    chatModel: 'gemini-2.0-flash-lite',
  },
  {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    textModel: 'meta-llama/llama-3.3-70b-instruct:free',
    chatModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    textModel: 'llama-3.3-70b-versatile',
    chatModel: 'llama-3.3-70b-versatile',
  },
];

function isRateLimit(err) {
  if (!err) return false;
  if (err.status === 429 || err.httpStatus === 429 || err.statusCode === 429) return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('quota');
}

function isProviderAvailable(provider) {
  if (provider.name === 'gemini') return !!process.env.GEMINI_API_KEY;
  return !!process.env[provider.apiKeyEnv];
}

// Gemini: simple text generation
async function geminiGenerateText(model) {
  return async (prompt) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const m = genAI.getGenerativeModel({ model });
    const result = await m.generateContent(prompt);
    return result.response.text().trim();
  };
}

// OpenAI-compatible: simple text generation
async function openaiGenerateText(baseUrl, apiKey, model, prompt) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    const err = new Error(`${baseUrl} error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// Generate plain text with wave fallback
async function generateText(prompt) {
  let lastError;
  for (const provider of WAVE) {
    if (!isProviderAvailable(provider)) {
      console.log(`[ModelRouter] Skipping ${provider.name} (no API key)`);
      continue;
    }
    try {
      console.log(`[ModelRouter] Trying ${provider.name} for text generation`);
      let text;
      if (provider.name === 'gemini') {
        const fn = await geminiGenerateText(provider.textModel);
        text = await fn(prompt);
      } else {
        text = await openaiGenerateText(
          provider.baseUrl,
          process.env[provider.apiKeyEnv],
          provider.textModel,
          prompt
        );
      }
      console.log(`[ModelRouter] ${provider.name} succeeded`);
      return { text, provider: provider.name };
    } catch (err) {
      if (isRateLimit(err)) {
        console.warn(`[ModelRouter] Rate limit on ${provider.name}, switching to next wave`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`All providers exhausted. Last error: ${lastError?.message}`);
}

// Convert Gemini functionDeclarations to OpenAI tools format
function toOpenAITools(functionDeclarations) {
  return functionDeclarations.map((decl) => ({
    type: 'function',
    function: { name: decl.name, description: decl.description, parameters: decl.parameters },
  }));
}

// Gemini agentic loop with MCP tools
async function runGeminiChat(history, systemInstruction, toolDeclarations, executeToolFn, userId) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelWithTools = genAI.getGenerativeModel({
    model: WAVE[0].chatModel,
    tools: [{ functionDeclarations: toolDeclarations }],
  });

  const chatHistory = history.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = modelWithTools.startChat({ history: chatHistory, systemInstruction });
  const lastMessage = history[history.length - 1];

  let result = await chat.sendMessage(lastMessage.content);
  let response = result.response;

  while (response.functionCalls && response.functionCalls().length > 0) {
    const toolResults = [];
    for (const call of response.functionCalls()) {
      console.log(`[ModelRouter] Gemini tool call: ${call.name}`, call.args);
      const toolResult = await executeToolFn(call.name, { ...call.args, userId });
      toolResults.push({ functionResponse: { name: call.name, response: toolResult } });
    }
    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  return response.text();
}

// OpenAI-compatible agentic loop with tool calling
async function runOpenAIChat(baseUrl, apiKey, model, messages, openAITools, executeToolFn, userId) {
  const currentMessages = [...messages];

  while (true) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: currentMessages, tools: openAITools, tool_choice: 'auto' }),
    });

    if (!res.ok) {
      const err = new Error(`${baseUrl} error: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const message = data.choices[0].message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }

    currentMessages.push(message);

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[ModelRouter] Tool call: ${toolCall.function.name}`, args);
      const result = await executeToolFn(toolCall.function.name, { ...args, userId });
      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
}

// Agentic chat with tool use and wave fallback
async function generateWithTools(history, systemInstruction, toolDeclarations, executeToolFn, userId) {
  const openAITools = toOpenAITools(toolDeclarations);
  const systemText = systemInstruction.parts[0].text;

  // Build OpenAI-format messages for non-Gemini providers
  const openAIMessages = [
    { role: 'system', content: systemText },
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  let lastError;
  for (const provider of WAVE) {
    if (!isProviderAvailable(provider)) {
      console.log(`[ModelRouter] Skipping ${provider.name} (no API key)`);
      continue;
    }
    try {
      console.log(`[ModelRouter] Trying ${provider.name} for agentic chat`);
      let text;
      if (provider.name === 'gemini') {
        text = await runGeminiChat(history, systemInstruction, toolDeclarations, executeToolFn, userId);
      } else {
        text = await runOpenAIChat(
          provider.baseUrl,
          process.env[provider.apiKeyEnv],
          provider.chatModel,
          openAIMessages,
          openAITools,
          executeToolFn,
          userId
        );
      }
      console.log(`[ModelRouter] ${provider.name} succeeded`);
      return { text, provider: provider.name };
    } catch (err) {
      if (isRateLimit(err)) {
        console.warn(`[ModelRouter] Rate limit on ${provider.name}, switching to next wave`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`All providers exhausted. Last error: ${lastError?.message}`);
}

module.exports = { generateText, generateWithTools };
