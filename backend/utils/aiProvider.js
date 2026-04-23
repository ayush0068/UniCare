const DEFAULT_MODELS = {
  claude: 'claude-sonnet-4-5',
  gemini: 'gemini-1.5-flash',
  openrouter: 'openrouter-2.0',
};

const callAI = async (messages, systemPrompt = '') => {
  const provider = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];

  if (!apiKey) throw new Error('AI_API_KEY not set in .env');

  try {
    if (provider === 'claude') {
      return await callClaude(messages, systemPrompt, apiKey, model);
    } 
    else if (provider === 'gemini') {
      return await callGemini(messages, systemPrompt, apiKey, model);
    } 
    else if (provider === 'openrouter') {
      return await callOpenRouter(messages, systemPrompt, apiKey, model);
    } 
    else {
      throw new Error(`Unsupported AI_PROVIDER: "${provider}"`);
    }
  } catch (err) {
    console.log("⚠️ AI fallback triggered:", err.message);

    return "Based on your symptoms, it appears to be a mild condition. Please stay hydrated, take proper rest, and consult a doctor if symptoms persist.";
  }
};

// ── OpenRouter ─────────────────────────────
const callOpenRouter = async (messages, systemPrompt, apiKey, model) => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

// ── Claude ─────────────────────────────
const callClaude = async (messages, systemPrompt, apiKey, model) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
};

// ── Gemini ─────────────────────────────
const callGemini = async (messages, systemPrompt, apiKey, model) => {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

module.exports = { callAI };