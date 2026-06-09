import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables manually from .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length > 1) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');

app.use(express.json());
// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read conversations
const readConversations = () => {
  try {
    if (!fs.existsSync(CONVERSATIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CONVERSATIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading conversations file:', err);
    return [];
  }
};

// Helper to write conversations
const writeConversations = (conversations) => {
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing conversations file:', err);
  }
};

// --- SYSTEM INSTRUCTIONS FOR PERSONAS ---
const PERSONA_PROMPTS = {
  aether: "You are Aether, a balanced, friendly, and helpful AI assistant. You explain things clearly, structure your answers logically, and are extremely polite.",
  codex: "You are Codex, an expert software developer. You write clean, optimized, and modern code snippets. Always include explanations, code comments, and best practices. Format code blocks beautifully with appropriate language tags.",
  sophia: "You are Sophia, a deep-thinking, philosophical AI companion. You encourage self-reflection, analyze questions from different angles, and write in a thoughtful, calm, and intellectually engaging tone.",
  spark: "You are Spark, a highly creative and expressive storyteller. You speak with high enthusiasm, paint vivid pictures with your words, and love writing creative stories, metaphors, and imaginative scenarios."
};

// --- MOCK RESPONSE GENERATOR ---
const getMockResponse = (userMessage, persona) => {
  const msg = userMessage.toLowerCase();
  
  if (persona === 'codex') {
    if (msg.includes('html') || msg.includes('css') || msg.includes('website') || msg.includes('design')) {
      return `Here is a beautiful glassmorphic card component built with HTML and CSS:

\`\`\`html
<div class="glass-card">
  <div class="card-glow"></div>
  <h3>Premium Interface</h3>
  <p>Sleek design with real-time blur and glowing borders.</p>
  <button class="btn-primary">Explore</button>
</div>
\`\`\`

And the styling in CSS:

\`\`\`css
.glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;
  color: #fff;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%);
  pointer-events: none;
}
\`\`\`

*Developer Tip:* Make sure to set a nice dark background for your page to let the glassmorphism and glows stand out!`;
    }
    
    if (msg.includes('js') || msg.includes('javascript') || msg.includes('code') || msg.includes('function')) {
      return `Here is a clean JavaScript implementation of a debounced search handler, essential for optimize autocomplete inputs:

\`\`\`javascript
/**
 * Creates a debounced function that delays invoking func until after wait 
 * milliseconds have elapsed since the last time the debounced function was invoked.
 */
function debounce(func, wait) {
  let timeoutId;
  
  return function (...args) {
    const context = this;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Example usage:
const handleSearchInput = debounce((event) => {
  console.log("Fetching API results for:", event.target.value);
}, 300);

document.getElementById("search-box")
  .addEventListener("input", handleSearchInput);
\`\`\`

### Why use debounce?
1. **Performance**: It limits server API requests when users type rapidly.
2. **User Experience**: Prevents the UI from lagging due to excessive rendering on keypresses.`;
    }

    return `Hello there! I am Codex, your coding copilot. 
Here is a quick template you can use to write asynchronous fetch calls in JavaScript:

\`\`\`javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
}
\`\`\`

Let me know what coding problem or algorithm you'd like me to help write or debug next!`;
  }

  if (persona === 'sophia') {
    if (msg.includes('life') || msg.includes('meaning') || msg.includes('purpose')) {
      return `To contemplate the meaning of life is to engage in one of humanity's oldest dialogues. 

Existentialists like Jean-Paul Sartre suggest that *existence precedes essence*—that we are born first, and then it is our responsibility to define who we are and what our lives stand for. There is no predefined script.

Consider these dimensions:
1. **Connection**: The deep bonds we forge with others.
2. **Growth**: The unfolding of our curiosity and understanding.
3. **Creation**: Expressing our inner world through art, code, or action.

Perhaps the meaning of life is not a treasure to be found, but a canvas to be painted. What colors are you choosing to paint yours with today?`;
    }

    return `Welcome to a moment of quiet reflection. I am Sophia.

In our busy lives, we often look outward for answers, seeking validation in productivity and metrics. Yet, the philosopher Socrates famously noted that "the unexamined life is not worth living." 

What question is sitting quietly in your mind today? Let us explore it together, not to find a quick fix, but to understand its roots.`;
  }

  if (persona === 'spark') {
    if (msg.includes('story') || msg.includes('write') || msg.includes('create')) {
      return `The sky was not blue; it was a swirling sea of violet dust and amber nebula rings. 

Far below, on the crystal cliffs of Orena, Lyra adjusted her brass goggles. In her palm, the pocket compass wasn't pointing North—it was spinning wildly, drawn by the heartbeat of the floating islands above. 

"Just one jump," she whispered to herself. The wind rising from the chasm smelled of ozone and ancient rain. 

She took a breath, stepped off the ledge, and instead of falling, she floated. Her boots caught the solar thermals, launching her upward into the glowing sky...

*Do you want to know what she finds on the floating islands, or shall we change her destination? Tell me where her journey leads next!*`;
    }

    return `Greetings, traveler of imagination! I am Spark! ✨

Imagine a world where sound has color and colors make music. A place where every word you speak ripples through the air like a tiny rainbow, and a quiet whisper creates a soft, golden melody. 

What kind of world shall we build or explore today? Give me a spark of an idea, and we will light up a whole universe together!`;
  }

  // Default 'Aether' responses
  if (msg.includes('help') || msg.includes('what can you do')) {
    return `I can help you with a wide range of tasks!
1. **Answering Questions**: Explaining science, history, logic, and more.
2. **Writing & Coding**: Drafting essays, writing code templates, or debugging scripts.
3. **Brainstorming**: Coming up with creative ideas, titles, or solutions.
4. **Voice Interaction**: You can activate text-to-speech or voice input to talk with me!

Try switching my **Persona** in the sidebar to talk with **Codex (the Developer)**, **Sophia (the Philosopher)**, or **Spark (the Storyteller)**!`;
  }

  return `Hello! I am Aether, your general AI assistant. I'm running locally on your computer.

I can help you answer questions, brainstorm ideas, write code, or structure documents. 

To make this experience fully live, click the **Settings** icon in the sidebar and enter your **Gemini API Key**. Otherwise, feel free to chat with me and try out the different custom personas!`;
};

// --- CHAT ENDPOINT (STREAMING API) ---
app.post('/api/chat', async (req, res) => {
  const { messages, persona = 'aether', apiKey, temperature = 0.7 } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  // Determine which API key to use
  const activeKey = apiKey || process.env.GEMINI_API_KEY;

  // Set response headers for Server-Sent Events (SSE) streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!activeKey) {
    // Run Mock Mode — send entire response instantly
    const userMessage = messages[messages.length - 1].content;
    const mockReply = getMockResponse(userMessage, persona);
    
    res.write(`data: ${JSON.stringify({ text: mockReply })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Call real Gemini API
  try {
    const sysInstruction = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.aether;
    
    // Map roles to Gemini roles ('user' and 'model')
    const geminiContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Target the streamGenerateContent API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${activeKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: {
          parts: [{ text: sysInstruction }]
        },
        generationConfig: {
          temperature: parseFloat(temperature)
        }
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Gemini API request failed:', errText);
      res.write(`data: ${JSON.stringify({ error: `Gemini API Error: ${apiResponse.statusText}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Save the last line if it is incomplete
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Gemini streams responses as JSON lines, sometimes prefixed with comma or inside brackets
        // We need to parse individual chunks
        // Example chunk: {"candidates": [{"content": {"parts": [{"text": "hello"}]}}]}
        // Wait, streamGenerateContent returns a JSON array of structures, or objects separated by newlines
        // Let's strip the leading comma or bracket if any, or parse objects directly
        let cleanLine = trimmed;
        if (cleanLine.startsWith(',')) cleanLine = cleanLine.substring(1).trim();
        if (cleanLine.startsWith('[') || cleanLine.startsWith(']')) continue;

        try {
          const parsed = JSON.parse(cleanLine);
          const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (textChunk) {
            res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
          }
        } catch (e) {
          // Incomplete JSON or other separator lines, we skip or accumulate
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error in streaming Gemini API:', error);
    res.write(`data: ${JSON.stringify({ error: `Internal Server Error: ${error.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// --- CONVERSATION ENDPOINTS ---

// Get all conversations (list)
app.get('/api/conversations', (req, res) => {
  const list = readConversations().map(conv => ({
    id: conv.id,
    title: conv.title,
    persona: conv.persona,
    updatedAt: conv.updatedAt
  }));
  res.json(list);
});

// Get a single conversation details
app.get('/api/conversations/:id', (req, res) => {
  const conversations = readConversations();
  const conv = conversations.find(c => c.id === req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  res.json(conv);
});

// Save or update a conversation
app.post('/api/conversations', (req, res) => {
  const { id, title, persona, messages } = req.body;
  if (!id || !messages) {
    return res.status(400).json({ error: 'ID and messages are required.' });
  }

  const conversations = readConversations();
  const index = conversations.findIndex(c => c.id === id);

  const updatedConversation = {
    id,
    title: title || messages[0]?.content?.substring(0, 30) || 'New Conversation',
    persona: persona || 'aether',
    messages,
    updatedAt: new Date().toISOString()
  };

  if (index !== -1) {
    conversations[index] = updatedConversation;
  } else {
    conversations.unshift(updatedConversation); // add to top
  }

  writeConversations(conversations);
  res.json(updatedConversation);
});

// Delete a conversation
app.delete('/api/conversations/:id', (req, res) => {
  const conversations = readConversations();
  const filtered = conversations.filter(c => c.id !== req.params.id);
  writeConversations(filtered);
  res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Chatbot Server running at http://localhost:${PORT}`);
});
