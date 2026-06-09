/* ==========================================================================
   ChatVibe - Core Frontend Engine
   ========================================================================== */

// --- GLOBAL STATE ---
let state = {
  conversations: [],
  activeConversationId: null,
  activePersona: 'aether',
  apiKey: '',
  temperature: 0.7,
  isSpeechOutputEnabled: false,
  isRecording: false,
  messages: []
};

// --- DOM ELEMENTS ---
const el = {
  sidebar: document.getElementById('app-sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle-btn'),
  sidebarClose: document.getElementById('sidebar-close-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  conversationList: document.getElementById('conversation-list'),
  openSettingsBtn: document.getElementById('open-settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  resetSettingsBtn: document.getElementById('reset-settings-btn'),
  apiKeyInput: document.getElementById('settings-api-key'),
  toggleApiKeyVisibility: document.getElementById('toggle-api-key-visibility'),
  settingsPersona: document.getElementById('settings-persona'),
  settingsTemp: document.getElementById('settings-temperature'),
  tempDisplay: document.getElementById('temperature-value-display'),
  exportHistoryBtn: document.getElementById('export-history-btn'),
  
  // Header
  headerPersonaAvatar: document.getElementById('header-persona-avatar'),
  headerPersonaName: document.getElementById('header-persona-name'),
  headerPersonaDesc: document.getElementById('header-persona-desc'),
  toggleSpeechOutput: document.getElementById('toggle-speech-output'),
  speechOutputIcon: document.getElementById('speech-output-icon'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  
  // Chat viewport
  chatHistoryContainer: document.getElementById('chat-history-container'),
  welcomeContainer: document.getElementById('welcome-container'),
  personaCards: document.querySelectorAll('.persona-card'),
  
  // Input
  chatForm: document.getElementById('chat-input-form'),
  chatTextarea: document.getElementById('chat-textarea'),
  toggleSpeechInput: document.getElementById('toggle-speech-input'),
  micIcon: document.getElementById('mic-icon'),
  sendMessageBtn: document.getElementById('send-message-btn')
};

// --- PERSONA DEFINITIONS ---
const PERSONA_CONFIGS = {
  aether: {
    name: 'Aether',
    desc: 'Your general AI assistant',
    icon: 'sparkles',
    themeClass: 'theme-aether'
  },
  codex: {
    name: 'Codex',
    desc: 'Expert software developer',
    icon: 'code-2',
    themeClass: 'theme-codex'
  },
  sophia: {
    name: 'Sophia',
    desc: 'Deep philosophical explorer',
    icon: 'compass',
    themeClass: 'theme-sophia'
  },
  spark: {
    name: 'Spark',
    desc: 'Creative storyteller',
    icon: 'wand-2',
    themeClass: 'theme-spark'
  }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load configuration from localStorage
  loadLocalConfig();
  
  // 2. Setup Lucide icons configuration
  lucide.createIcons();
  
  // 3. Setup event listeners
  setupEventListeners();
  
  // 4. Set marked options for markdown formatting
  setupMarkdownParser();
  
  // 5. Fetch conversations from server
  await fetchConversations();
  
  // 6. Reset UI view
  showWelcomeScreen();
  
  // 7. Auto-grow textarea setup
  setupTextareaAutoGrow();
});

// --- STATE MANAGEMENT / CONFIG ---
function loadLocalConfig() {
  state.apiKey = localStorage.getItem('cv_api_key') || '';
  state.temperature = parseFloat(localStorage.getItem('cv_temp')) || 0.7;
  state.activePersona = localStorage.getItem('cv_default_persona') || 'aether';
  state.isSpeechOutputEnabled = localStorage.getItem('cv_speech_output') === 'true';

  // Apply visual configurations to settings form
  el.apiKeyInput.value = state.apiKey;
  el.settingsTemp.value = state.temperature;
  el.tempDisplay.textContent = state.temperature;
  el.settingsPersona.value = state.activePersona;
  
  updateSpeechOutputButton();
  updatePersonaVisuals(state.activePersona);
}

function saveLocalConfig() {
  state.apiKey = el.apiKeyInput.value.trim();
  state.temperature = parseFloat(el.settingsTemp.value);
  state.activePersona = el.settingsPersona.value;
  
  localStorage.setItem('cv_api_key', state.apiKey);
  localStorage.setItem('cv_temp', state.temperature.toString());
  localStorage.setItem('cv_default_persona', state.activePersona);
  
  updatePersonaVisuals(state.activePersona);
}

function updatePersonaVisuals(personaKey) {
  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.aether;
  
  // Update Header details
  el.headerPersonaName.textContent = config.name;
  el.headerPersonaDesc.textContent = config.desc;
  
  // Update Avatar Icon and class
  el.headerPersonaAvatar.className = `persona-avatar ${config.themeClass}`;
  el.headerPersonaAvatar.innerHTML = `<i data-lucide="${config.icon}"></i>`;
  
  // Re-highlight active persona card if in welcome view
  document.querySelectorAll('.persona-card').forEach(card => {
    card.classList.remove('active');
    if (card.dataset.persona === personaKey) {
      card.classList.add('active');
    }
  });

  lucide.createIcons();
}

function updateSpeechOutputButton() {
  if (state.isSpeechOutputEnabled) {
    el.toggleSpeechOutput.classList.add('active');
    el.speechOutputIcon.setAttribute('data-lucide', 'volume-2');
  } else {
    el.toggleSpeechOutput.classList.remove('active');
    el.speechOutputIcon.setAttribute('data-lucide', 'volume-x');
  }
  lucide.createIcons();
}

function setupMarkdownParser() {
  // Custom marked options to output HTML safely
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });

  // Custom renderer for code blocks to add copy button
  const renderer = new marked.Renderer();
  renderer.code = (code, language) => {
    const lang = language || 'javascript';
    const uniqueId = `code-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store original code as an attribute to retrieve easily for copying
    const escapedCode = code.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return `
      <div class="code-block-container" id="${uniqueId}">
        <div class="code-block-header">
          <span>${lang.toUpperCase()}</span>
          <button class="copy-code-btn" onclick="copyCodeBlock('${uniqueId}')">
            <i data-lucide="copy"></i>
            <span>Copy Code</span>
          </button>
        </div>
        <pre><code class="language-${lang}">${escapedCode}</code></pre>
      </div>
    `;
  };
  marked.use({ renderer });
}

// Make copy code globally accessible
window.copyCodeBlock = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const codeEl = container.querySelector('code');
  if (!codeEl) return;
  
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    const btn = container.querySelector('.copy-code-btn');
    const label = btn.querySelector('span');
    const icon = btn.querySelector('i');
    
    label.textContent = 'Copied!';
    icon.setAttribute('data-lucide', 'check');
    lucide.createIcons();
    
    setTimeout(() => {
      label.textContent = 'Copy Code';
      icon.setAttribute('data-lucide', 'copy');
      lucide.createIcons();
    }, 2000);
  });
};

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Sidebar toggles
  el.sidebarToggle.addEventListener('click', () => el.sidebar.classList.add('open'));
  el.sidebarClose.addEventListener('click', () => el.sidebar.classList.remove('open'));
  
  // Settings modal
  el.openSettingsBtn.addEventListener('click', () => {
    el.apiKeyInput.value = state.apiKey;
    el.settingsTemp.value = state.temperature;
    el.tempDisplay.textContent = state.temperature;
    el.settingsPersona.value = state.activePersona;
    el.settingsModal.classList.add('open');
  });
  
  el.closeSettingsBtn.addEventListener('click', () => el.settingsModal.classList.remove('open'));
  
  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) el.settingsModal.classList.remove('open');
  });
  
  el.saveSettingsBtn.addEventListener('click', () => {
    saveLocalConfig();
    el.settingsModal.classList.remove('open');
  });

  el.resetSettingsBtn.addEventListener('click', () => {
    el.apiKeyInput.value = '';
    el.settingsTemp.value = '0.7';
    el.tempDisplay.textContent = '0.7';
    el.settingsPersona.value = 'aether';
  });

  el.settingsTemp.addEventListener('input', (e) => {
    el.tempDisplay.textContent = e.target.value;
  });

  el.toggleApiKeyVisibility.addEventListener('click', () => {
    const isPass = el.apiKeyInput.type === 'password';
    el.apiKeyInput.type = isPass ? 'text' : 'password';
    el.toggleApiKeyVisibility.querySelector('i').setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
    lucide.createIcons();
  });
  
  // New chat button
  el.newChatBtn.addEventListener('click', () => {
    startNewChat();
    if (window.innerWidth <= 768) {
      el.sidebar.classList.remove('open');
    }
  });

  // Welcome Persona cards
  el.personaCards.forEach(card => {
    card.addEventListener('click', () => {
      const p = card.dataset.persona;
      state.activePersona = p;
      updatePersonaVisuals(p);
    });
  });

  // Toggle Speech Output (TTS)
  el.toggleSpeechOutput.addEventListener('click', () => {
    state.isSpeechOutputEnabled = !state.isSpeechOutputEnabled;
    localStorage.setItem('cv_speech_output', state.isSpeechOutputEnabled);
    updateSpeechOutputButton();
  });

  // Voice Input (STT)
  el.toggleSpeechInput.addEventListener('click', toggleVoiceInput);

  // Clear chat
  el.clearChatBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear this chat history?')) {
      startNewChat();
    }
  });

  // Textarea hotkeys
  el.chatTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.chatForm.requestSubmit();
    }
  });

  // Chat form submit
  el.chatForm.addEventListener('submit', handleFormSubmit);

  // Export History
  el.exportHistoryBtn.addEventListener('click', exportConversationsHistory);
}

function setupTextareaAutoGrow() {
  el.chatTextarea.addEventListener('input', () => {
    el.chatTextarea.style.height = 'auto';
    el.chatTextarea.style.height = `${el.chatTextarea.scrollHeight}px`;
  });
}

// --- CONVERSATION LOGIC ---

async function fetchConversations() {
  try {
    const response = await fetch('/api/conversations');
    state.conversations = await response.json();
    renderConversationHistoryList();
  } catch (err) {
    console.error('Error fetching conversations:', err);
    el.conversationList.innerHTML = '<div style="padding: 10px; font-size:0.8rem; color: var(--text-muted);">Failed to load history</div>';
  }
}

function renderConversationHistoryList() {
  if (state.conversations.length === 0) {
    el.conversationList.innerHTML = '<div style="padding: 12px; font-size:0.82rem; color: var(--text-muted); text-align: center;">No local histories</div>';
    return;
  }

  el.conversationList.innerHTML = '';
  
  state.conversations.forEach(c => {
    const isActive = c.id === state.activeConversationId;
    const config = PERSONA_CONFIGS[c.persona] || PERSONA_CONFIGS.aether;

    const convItem = document.createElement('div');
    convItem.className = `conv-item ${isActive ? 'active' : ''}`;
    convItem.innerHTML = `
      <div class="conv-item-left" onclick="loadConversation('${c.id}')">
        <i data-lucide="${config.icon}"></i>
        <span class="conv-title-span">${escapeHtml(c.title)}</span>
      </div>
      <div class="conv-item-actions">
        <button class="conv-action-btn rename-btn" onclick="renameConversation(event, '${c.id}')" title="Rename">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="conv-action-btn delete-btn" onclick="deleteConversation(event, '${c.id}')" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    
    el.conversationList.appendChild(convItem);
  });
  
  lucide.createIcons();
}

async function loadConversation(id) {
  try {
    state.activeConversationId = id;
    
    // Fetch details
    const response = await fetch(`/api/conversations/${id}`);
    const conversation = await response.json();
    
    state.messages = conversation.messages;
    state.activePersona = conversation.persona || 'aether';
    
    // Update visuals
    updatePersonaVisuals(state.activePersona);
    renderConversationHistoryList();
    
    // Clear viewport and render all messages
    el.welcomeContainer.style.display = 'none';
    const messageContainer = document.getElementById('chat-history-container');
    
    // Keep only welcome container if we need to reload it, else clear everything except welcome
    // Simply empty other dynamic messages
    document.querySelectorAll('.message-wrapper').forEach(el => el.remove());
    
    state.messages.forEach(msg => {
      appendMessageBubble(msg.role, msg.content, false);
    });

    scrollToBottom();
    
    if (window.innerWidth <= 768) {
      el.sidebar.classList.remove('open');
    }
  } catch (err) {
    console.error('Error loading conversation details:', err);
  }
}

// Global hooks for dynamic actions
window.loadConversation = loadConversation;

window.renameConversation = async (event, id) => {
  event.stopPropagation();
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;

  const newTitle = prompt('Enter a new name for this conversation:', conv.title);
  if (newTitle === null) return;
  const trimmed = newTitle.trim();
  if (!trimmed) return;

  try {
    // Fetch detailed messages first to update
    const res = await fetch(`/api/conversations/${id}`);
    const details = await res.json();
    
    details.title = trimmed;

    // Save
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    
    await fetchConversations();
    if (state.activeConversationId === id) {
      renderConversationHistoryList();
    }
  } catch (err) {
    console.error('Failed to rename conversation:', err);
  }
};

window.deleteConversation = async (event, id) => {
  event.stopPropagation();
  if (!confirm('Are you sure you want to delete this conversation?')) return;

  try {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    await fetchConversations();
    
    if (state.activeConversationId === id) {
      startNewChat();
    }
  } catch (err) {
    console.error('Failed to delete conversation:', err);
  }
};

function startNewChat() {
  state.activeConversationId = null;
  state.messages = [];
  
  // Clear any dynamic bubble elements
  document.querySelectorAll('.message-wrapper').forEach(el => el.remove());
  
  // Render welcome screen
  showWelcomeScreen();
  renderConversationHistoryList();
}

function showWelcomeScreen() {
  el.welcomeContainer.style.display = 'block';
  updatePersonaVisuals(state.activePersona);
}

// --- SENDING / RECEIVING CHAT LOGIC ---

async function handleFormSubmit(e) {
  e.preventDefault();
  const userText = el.chatTextarea.value.trim();
  if (!userText) return;

  // Clear text area & reset height
  el.chatTextarea.value = '';
  el.chatTextarea.style.height = 'auto';

  // 1. If this is a new chat, setup active ID
  if (!state.activeConversationId) {
    state.activeConversationId = `conv-${Date.now()}`;
    el.welcomeContainer.style.display = 'none';
  }

  // 2. Append User message
  appendMessageBubble('user', userText);
  state.messages.push({ role: 'user', content: userText });

  // 3. Create bot bubble with typing indicator immediately (no pre-save blocking)
  const botMessageId = `bot-msg-${Date.now()}`;
  appendBotBubbleWithIndicator(botMessageId);
  scrollToBottom();

  // 4. Send to Server API
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: state.messages,
        persona: state.activePersona,
        apiKey: state.apiKey,
        temperature: state.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    // Handle Streaming Response (Server Sent Events)
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let botReply = '';

    // Remove typing bubble and render text area
    const botBubble = document.getElementById(botMessageId);
    const bubbleContent = botBubble.querySelector('.msg-content');
    
    // Clear dots
    bubbleContent.innerHTML = '';
    
    // Debounced rendering — only re-render at most every 80ms
    let renderScheduled = false;
    function scheduleRender() {
      if (renderScheduled) return;
      renderScheduled = true;
      requestAnimationFrame(() => {
        bubbleContent.innerHTML = marked.parse(botReply);
        scrollToBottom();
        renderScheduled = false;
      });
    }
    
    // Setup buffer parsing
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Save last line in case it is incomplete
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.substring(6).trim();
        if (dataStr === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            bubbleContent.innerHTML += `<div style="color: #ef4444; font-weight:500;">${escapeHtml(parsed.error)}</div>`;
            botReply += `\nError: ${parsed.error}`;
          } else if (parsed.text) {
            botReply += parsed.text;
            scheduleRender();
          }
        } catch (e) {
          // JSON parsing failure, skip or accumulate
        }
      }
    }

    // Final render pass — full markdown + syntax highlight + icons
    bubbleContent.innerHTML = marked.parse(botReply);
    bubbleContent.querySelectorAll('pre code').forEach((block) => {
      Prism.highlightElement(block);
    });
    lucide.createIcons();
    scrollToBottom();

    // Speech Output if enabled
    if (state.isSpeechOutputEnabled && botReply) {
      speakText(botReply);
    }

    // Save final response in state (fire-and-forget, non-blocking)
    state.messages.push({ role: 'assistant', content: botReply });
    saveConversationState().then(() => fetchConversations());

  } catch (err) {
    console.error('API Chat request failed:', err);
    const botBubble = document.getElementById(botMessageId);
    const bubbleContent = botBubble.querySelector('.msg-content');
    bubbleContent.innerHTML = `<div style="color: #ef4444;">Failed to connect to local server. Check server.js log.</div>`;
  }
}

async function saveConversationState() {
  try {
    // Auto title using first user query truncated
    const title = state.messages[0]?.content?.substring(0, 30) + (state.messages[0]?.content?.length > 30 ? '...' : '') || 'New Chat';
    
    await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: state.activeConversationId,
        title: title,
        persona: state.activePersona,
        messages: state.messages
      })
    });
  } catch (err) {
    console.error('Failed to sync conversation state to server:', err);
  }
}

// --- MESSAGE RENDERING ---

function appendMessageBubble(role, content, shouldSpeak = false) {
  const isUser = role === 'user';
  const config = PERSONA_CONFIGS[state.activePersona] || PERSONA_CONFIGS.aether;
  
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper ${isUser ? 'user' : `assistant p-${state.activePersona}`}`;
  
  const avatarHtml = isUser 
    ? `<div class="msg-avatar"><i data-lucide="user"></i></div>` 
    : `<div class="msg-avatar ${config.themeClass}"><i data-lucide="${config.icon}"></i></div>`;

  const parsedContent = isUser ? escapeHtml(content) : marked.parse(content);
  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const readAloudButton = isUser 
    ? '' 
    : `<button class="msg-speak-btn" onclick="speakMessageBubble(this)" title="Read Aloud"><i data-lucide="volume-2"></i><span>Listen</span></button>`;

  msgWrapper.innerHTML = `
    ${avatarHtml}
    <div class="message-bubble">
      <div class="msg-content">${parsedContent}</div>
      <div class="msg-meta">
        <span>${formattedTime}</span>
        ${readAloudButton}
      </div>
    </div>
  `;

  el.chatHistoryContainer.appendChild(msgWrapper);
  
  // Highlight code syntax if any inside newly created bot message
  if (!isUser) {
    msgWrapper.querySelectorAll('pre code').forEach((block) => {
      Prism.highlightElement(block);
    });
  }

  lucide.createIcons();

  if (shouldSpeak && !isUser) {
    speakText(content);
  }
}

function appendBotBubbleWithIndicator(messageId) {
  const config = PERSONA_CONFIGS[state.activePersona] || PERSONA_CONFIGS.aether;
  
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper assistant p-${state.activePersona}`;
  msgWrapper.id = messageId;
  
  const avatarHtml = `<div class="msg-avatar ${config.themeClass}"><i data-lucide="${config.icon}"></i></div>`;
  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgWrapper.innerHTML = `
    ${avatarHtml}
    <div class="message-bubble">
      <div class="msg-content typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
      <div class="msg-meta">
        <span>${formattedTime}</span>
      </div>
    </div>
  `;

  el.chatHistoryContainer.appendChild(msgWrapper);
  lucide.createIcons();
}

function scrollToBottom() {
  el.chatHistoryContainer.scrollTop = el.chatHistoryContainer.scrollHeight;
}

// --- VOICE (STT & TTS) SYSTEMS ---

let speechRecognition = null;

function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('Voice input (Speech Recognition) is not supported by your current browser. Try Chrome or Edge.');
    return;
  }

  if (state.isRecording) {
    speechRecognition.stop();
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = 'en-US';

  speechRecognition.onstart = () => {
    state.isRecording = true;
    el.toggleSpeechInput.classList.add('active');
    el.chatTextarea.placeholder = 'Listening to your voice...';
    el.micIcon.setAttribute('data-lucide', 'mic-off');
    lucide.createIcons();
  };

  speechRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e);
    stopRecordingVisuals();
  };

  speechRecognition.onend = () => {
    stopRecordingVisuals();
  };

  speechRecognition.onresult = (e) => {
    const resultText = e.results[0][0].transcript;
    if (resultText) {
      el.chatTextarea.value += (el.chatTextarea.value ? ' ' : '') + resultText;
      el.chatTextarea.style.height = 'auto';
      el.chatTextarea.style.height = `${el.chatTextarea.scrollHeight}px`;
    }
  };

  speechRecognition.start();
}

function stopRecordingVisuals() {
  state.isRecording = false;
  el.toggleSpeechInput.classList.remove('active');
  el.chatTextarea.placeholder = 'Message ChatVibe...';
  el.micIcon.setAttribute('data-lucide', 'mic');
  lucide.createIcons();
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  
  // Stop existing speech synthesis
  window.speechSynthesis.cancel();

  // Strip Markdown markers so it reads clearly
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, '[Code snippet omitted]') // omit large code blocks for speech comfort
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#\-~]/g, '')
    .trim();

  if (!cleanedText) return;

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  // Map personas to different standard voice pitches/rates
  if (state.activePersona === 'sophia') {
    utterance.pitch = 0.85; // deep
    utterance.rate = 0.88; // reflective, slightly slower
  } else if (state.activePersona === 'spark') {
    utterance.pitch = 1.15; // energetic
    utterance.rate = 1.05; // slightly faster
  } else if (state.activePersona === 'codex') {
    utterance.pitch = 0.95;
    utterance.rate = 0.95;
  } else {
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
  }

  window.speechSynthesis.speak(utterance);
}

window.speakMessageBubble = (buttonElement) => {
  const bubble = buttonElement.closest('.message-bubble');
  if (!bubble) return;
  const contentEl = bubble.querySelector('.msg-content');
  if (contentEl) {
    // Read the text content of the message bubble
    speakText(contentEl.textContent);
  }
};

// --- DATA UTILS ---

function exportConversationsHistory() {
  if (state.conversations.length === 0) {
    alert('No chat history available to export.');
    return;
  }

  // Fetch all conversation detailed data to download full logs
  // To keep it simple and reliable, export the conversations metadata
  // Or fetch details for everything. Let's make an export from what is in state.conversations
  // Let's generate a JSON download of the conversation file from the server
  // Redirect to an API download endpoint, or fetch and download
  fetch('/api/conversations')
    .then(res => res.json())
    .then(data => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `chatvibe-history-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    })
    .catch(err => {
      console.error('Failed to export history:', err);
    });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
