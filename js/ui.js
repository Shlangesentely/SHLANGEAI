/**
 * ui.js - UI controller for ShlangeAI
 * Handles all DOM manipulation and user interactions
 * 
 * Dependencies: Storage (from storage.js), Auth (from auth.js), API (from api.js)
 * Note: This file must be loaded last after all other modules
 */

// Validate dependencies are loaded
if (typeof Storage === 'undefined') {
    throw new Error('Storage is not defined. Ensure storage.js is loaded before ui.js');
}
if (typeof Auth === 'undefined') {
    throw new Error('Auth is not defined. Ensure auth.js is loaded before ui.js');
}
if (typeof API === 'undefined') {
    throw new Error('API is not defined. Ensure api.js is loaded before ui.js');
}

const UI = {
    // Current state
    currentPersona: 'companion',
    isWaitingForResponse: false,

    // DOM elements (cached)
    elements: {},

    /**
     * Initialize the UI and set up event listeners
     */
    init() {
        // Cache DOM elements
        this.cacheElements();
        
        // Load current persona from storage
        this.currentPersona = Storage.getCurrentPersona();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial state
        this.switchPersona(this.currentPersona);
        
        // Load settings
        this.loadSettings();
        
        console.log('ShlangeAI initialized successfully!');
    },

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Persona buttons
            personaBtns: document.querySelectorAll('.persona-btn'),
            
            // Chat area
            personaTitle: document.getElementById('personaTitle'),
            personaDescription: document.getElementById('personaDescription'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            clearChatBtn: document.getElementById('clearChatBtn'),
            
            // Admin modal
            adminBtn: document.getElementById('adminBtn'),
            adminModal: document.getElementById('adminModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            
            // Admin unlock section (new structure)
            adminUnlockSection: document.getElementById('admin-unlock-section'),
            adminCodeInput: document.getElementById('admin-code-input'),
            adminUnlockBtn: document.getElementById('admin-unlock-btn'),
            adminFeatures: document.getElementById('admin-features'),
            adminLogoutBtn: document.getElementById('admin-logout-btn'),
            
            // Persona settings
            companionName: document.getElementById('companion-name'),
            companionPersonality: document.getElementById('companion-personality'),
            companionTone: document.getElementById('companion-tone'),
            toneValue: document.getElementById('tone-value'),
            companionPrompt: document.getElementById('companion-prompt'),
            
            // Action buttons
            exportHistoryBtn: document.getElementById('exportHistoryBtn'),
            clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            settingsSuccess: document.getElementById('settingsSuccess')
        };
    },

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Persona switching
        this.elements.personaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const persona = btn.dataset.persona;
                this.switchPersona(persona);
            });
        });

        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send message (Shift+Enter for new line)
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = this.elements.messageInput.scrollHeight + 'px';
        });

        // Clear chat
        this.elements.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());

        // Admin modal
        this.elements.adminBtn.addEventListener('click', () => this.openAdminModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeAdminModal());
        
        // Click outside modal to close
        this.elements.adminModal.addEventListener('click', (e) => {
            if (e.target === this.elements.adminModal) {
                this.closeAdminModal();
            }
        });

        // Save settings
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // Export history
        this.elements.exportHistoryBtn.addEventListener('click', () => this.exportHistory());

        // Clear all history
        this.elements.clearAllHistoryBtn.addEventListener('click', () => this.clearAllHistory());
    },

    /**
     * Switch to a different persona
     * @param {string} persona - Persona identifier
     */
    switchPersona(persona) {
        this.currentPersona = persona;
        Storage.setCurrentPersona(persona);

        // Update active button
        this.elements.personaBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.persona === persona);
        });

        // Update header
        const config = API.getPersonaConfig(persona);
        this.elements.personaTitle.textContent = config.name;
        this.elements.personaDescription.textContent = config.description;

        // Load chat history
        this.loadChatHistory();
    },

    /**
     * Load chat history for current persona
     */
    loadChatHistory() {
        const history = Storage.getChatHistory(this.currentPersona);
        this.elements.messagesContainer.innerHTML = '';

        if (history.length === 0) {
            this.showWelcomeMessage();
        } else {
            history.forEach(msg => {
                this.appendMessage(msg.type, msg.text, msg.timestamp, false);
            });
            this.scrollToBottom();
        }
    },

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        const config = API.getPersonaConfig(this.currentPersona);
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>${config.icon} Welcome to ${config.name}!</h3>
                <p>${config.description}</p>
            </div>
        `;
    },

    /**
     * Send a message
     */
    async sendMessage() {
        const text = this.elements.messageInput.value.trim();
        
        if (!text || this.isWaitingForResponse) {
            return;
        }

        // Clear input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';

        // Create message object
        const timestamp = new Date().toISOString();
        const userMessage = {
            type: 'user',
            text: text,
            timestamp: timestamp
        };

        // Save and display user message
        Storage.saveMessage(this.currentPersona, userMessage);
        this.appendMessage('user', text, timestamp);

        // Show typing indicator
        this.isWaitingForResponse = true;
        this.elements.sendBtn.disabled = true;
        this.showTypingIndicator();

        try {
            // Get AI response
            const result = await API.getResponse(this.currentPersona, text);
            const aiResponse = typeof result === 'string' ? result : result.response;
            
            // Remove typing indicator
            this.hideTypingIndicator();

            // Create AI message object
            const aiTimestamp = new Date().toISOString();
            const aiMessage = {
                type: 'ai',
                text: aiResponse,
                timestamp: aiTimestamp
            };

            // Save and display AI message
            Storage.saveMessage(this.currentPersona, aiMessage);
            this.appendMessage('ai', aiResponse, aiTimestamp, true);

        } catch (error) {
            console.error('Error getting AI response:', error);
            this.hideTypingIndicator();
            
            // Display the error message from the API
            // Note: Error messages are NOT saved to storage as they are temporary and session-specific
            const errorMessage = error.message || 'Sorry, I encountered an error. Please try again.';
            this.appendMessage('ai', '❌ ' + errorMessage, new Date().toISOString());
        } finally {
            this.isWaitingForResponse = false;
            this.elements.sendBtn.disabled = false;
            this.elements.messageInput.focus();
        }
    },

    /**
     * Append a message to the chat
     * @param {string} type - Message type ('user' or 'ai')
     * @param {string} text - Message text
     * @param {string} timestamp - ISO timestamp
     * @param {boolean} shouldScroll - Whether to scroll to bottom
     */
    appendMessage(type, text, timestamp, shouldScroll = true) {
        // Remove welcome message if it exists
        const welcomeMsg = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? '👤' : API.getPersonaConfig(this.currentPersona).icon;

        const content = document.createElement('div');
        content.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(timestamp);

        content.appendChild(textDiv);
        content.appendChild(time);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.elements.messagesContainer.appendChild(messageDiv);

        if (shouldScroll) {
            this.scrollToBottom();
        }
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message ai';
        indicator.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = API.getPersonaConfig(this.currentPersona).icon;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        
        content.appendChild(typing);
        indicator.appendChild(avatar);
        indicator.appendChild(content);
        
        this.elements.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    },

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    },

    /**
     * Format timestamp to readable time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    /**
     * Clear current chat
     */
    clearCurrentChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            Storage.clearChatHistory(this.currentPersona);
            this.loadChatHistory();
        }
    },

    /**
     * Open admin modal
     */
    openAdminModal() {
        this.elements.adminModal.classList.add('active');
        
        // Reset modal to unlock screen
        if (this.elements.adminUnlockSection && this.elements.adminFeatures) {
            this.elements.adminUnlockSection.style.display = 'block';
            this.elements.adminFeatures.style.display = 'none';
        }
        
        // Clear admin code input
        if (this.elements.adminCodeInput) {
            this.elements.adminCodeInput.value = '';
            this.elements.adminCodeInput.focus();
        }
        
        // Clear any messages
        const message = document.getElementById('admin-message');
        if (message) {
            message.textContent = '';
            message.className = 'message';
        }
        
        // Logout to reset auth state
        Auth.logoutAdmin();
    },

    /**
     * Close admin modal
     */
    closeAdminModal() {
        this.elements.adminModal.classList.remove('active');
        Auth.logoutAdmin();
    },

    /**
     * Save admin settings
     */
    saveSettings() {
        // Get values from form
        const name = this.elements.companionName ? this.elements.companionName.value.trim() : 'Companion';
        const personality = this.elements.companionPersonality ? this.elements.companionPersonality.value.trim() : 'Friendly and empathetic';
        const tone = this.elements.companionTone ? parseInt(this.elements.companionTone.value) : 5;
        const systemPrompt = this.elements.companionPrompt ? this.elements.companionPrompt.value.trim() : Storage.DEFAULT_PROMPTS.companion;

        // Save companion persona
        const companionPersona = {
            name: name,
            personality: personality,
            tone: tone,
            systemPrompt: systemPrompt
        };
        
        Storage.savePersona('companion', companionPersona);
        
        // Update UI if currently on companion
        if (this.currentPersona === 'companion') {
            API.personas.companion.name = name;
            this.elements.personaTitle.textContent = name;
        }
        
        // Show success message
        this.showSuccessMessage('Settings saved successfully!');
    },

    /**
     * Export chat history
     */
    exportHistory() {
        const data = Storage.exportData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `shlangeai_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showSuccessMessage('Data exported successfully!');
    },

    /**
     * Clear all chat history
     */
    clearAllHistory() {
        if (confirm('Are you sure you want to clear ALL chat history? This cannot be undone!')) {
            Storage.clearAllChatHistory();
            this.loadChatHistory();
            this.showSuccessMessage('All history cleared!');
        }
    },

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccessMessage(message) {
        this.elements.settingsSuccess.textContent = message;
        setTimeout(() => {
            this.elements.settingsSuccess.textContent = '';
        }, 3000);
    },

    /**
     * Load initial settings
     */
    loadSettings() {
        // Load companion persona settings
        const companionPersona = Storage.getPersona('companion');
        if (companionPersona && companionPersona.name) {
            API.personas.companion.name = companionPersona.name;
            if (this.currentPersona === 'companion') {
                this.elements.personaTitle.textContent = companionPersona.name;
            }
        }
    }
};

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}

// Make UI available globally
window.UI = UI;
