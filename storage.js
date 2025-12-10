/**
 * storage.js - LocalStorage and SessionStorage wrapper for ShlangeAI
 * Handles all data persistence for conversations, personas, settings, and admin configuration
 * 
 * NOTE: This is a temporary client-side storage solution.
 * Future enhancement: Move conversation storage to server-side database for:
 * - Multi-device sync
 * - User accounts with separate conversation history
 * - Parent/teacher access to student conversations
 * - Long-term learning analytics
 * See FUTURE_ENHANCEMENTS.md for migration plan
 */

const Storage = {
    // Default system prompts for each AI type
    DEFAULT_PROMPTS: {
        companion: "You are a friendly and empathetic AI companion. Your goal is to engage in warm, supportive conversations and help users feel heard and understood.",
        code: "You are an expert programming assistant. You provide clear, concise coding help, debugging assistance, and best practices guidance across multiple programming languages.",
        study: "You are a knowledgeable study helper and tutor. You break down complex concepts, provide clear explanations, and help students learn effectively using proven pedagogical techniques."
    },

    /**
     * Get conversations for all AI types
     * @returns {Object} Object with companion, code, and study arrays
     */
    getConversations() {
        try {
            const conversations = localStorage.getItem('conversations');
            const parsed = conversations ? JSON.parse(conversations) : null;
            
            // Ensure all three types exist
            return {
                companion: (parsed && parsed.companion) || [],
                code: (parsed && parsed.code) || [],
                study: (parsed && parsed.study) || []
            };
        } catch (error) {
            console.error('Error reading conversations from localStorage:', error);
            return { companion: [], code: [], study: [] };
        }
    },

    /**
     * Save entire conversation for a specific AI type
     * @param {string} aiType - AI type (companion, code, or study)
     * @param {Array} messages - Array of message objects
     * @returns {boolean} Success status
     */
    saveConversation(aiType, messages) {
        try {
            const conversations = this.getConversations();
            conversations[aiType] = messages;
            localStorage.setItem('conversations', JSON.stringify(conversations));
            return true;
        } catch (error) {
            console.error(`Error saving conversation for ${aiType}:`, error);
            return false;
        }
    },

    /**
     * Add a single message to a conversation
     * @param {string} aiType - AI type (companion, code, or study)
     * @param {Object} message - Message object (must have text property)
     * @returns {boolean} Success status
     */
    addMessage(aiType, message) {
        try {
            const conversations = this.getConversations();
            
            // Add timestamp if not present
            const messageWithTimestamp = {
                ...message,
                timestamp: message.timestamp || new Date().toISOString()
            };
            
            conversations[aiType].push(messageWithTimestamp);
            localStorage.setItem('conversations', JSON.stringify(conversations));
            return true;
        } catch (error) {
            console.error(`Error adding message to ${aiType}:`, error);
            return false;
        }
    },

    /**
     * Get persona configuration for a specific AI type
     * @param {string} aiType - AI type (companion, code, or study)
     * @returns {Object} Persona object with name, personality, tone, and systemPrompt
     */
    getPersona(aiType) {
        try {
            const personas = localStorage.getItem('personas');
            const parsed = personas ? JSON.parse(personas) : {};
            
            // Return existing persona or create default
            if (parsed[aiType]) {
                return parsed[aiType];
            }
            
            // Create default persona
            const defaultPersonas = {
                companion: {
                    name: 'Companion',
                    personality: 'Friendly and empathetic',
                    tone: 5,
                    systemPrompt: this.DEFAULT_PROMPTS.companion
                },
                code: {
                    name: 'Code Buddy',
                    personality: 'Technical and helpful',
                    tone: 5,
                    systemPrompt: this.DEFAULT_PROMPTS.code
                },
                study: {
                    name: 'Study Helper',
                    personality: 'Patient and educational',
                    tone: 5,
                    systemPrompt: this.DEFAULT_PROMPTS.study
                }
            };
            
            return defaultPersonas[aiType] || {
                name: aiType.charAt(0).toUpperCase() + aiType.slice(1),
                personality: 'Helpful',
                tone: 5,
                systemPrompt: this.DEFAULT_PROMPTS[aiType] || ''
            };
        } catch (error) {
            console.error(`Error reading persona for ${aiType}:`, error);
            return {
                name: aiType.charAt(0).toUpperCase() + aiType.slice(1),
                personality: 'Helpful',
                tone: 5,
                systemPrompt: this.DEFAULT_PROMPTS[aiType] || ''
            };
        }
    },

    /**
     * Save persona configuration for a specific AI type
     * @param {string} aiType - AI type (companion, code, or study)
     * @param {Object} persona - Persona object with name, personality, tone, systemPrompt
     * @returns {boolean} Success status
     */
    savePersona(aiType, persona) {
        try {
            const personas = localStorage.getItem('personas');
            const parsed = personas ? JSON.parse(personas) : {};
            
            parsed[aiType] = persona;
            localStorage.setItem('personas', JSON.stringify(parsed));
            return true;
        } catch (error) {
            console.error(`Error saving persona for ${aiType}:`, error);
            return false;
        }
    },

    /**
     * Get API key from localStorage
     * @returns {string|null} API key or null if not set
     */
    getApiKey() {
        try {
            return localStorage.getItem('apiKey');
        } catch (error) {
            console.error('Error reading API key:', error);
            return null;
        }
    },

    /**
     * Save API key to localStorage
     * @param {string} key - API key
     * @returns {boolean} Success status
     */
    saveApiKey(key) {
        try {
            localStorage.setItem('apiKey', key);
            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            return false;
        }
    },

    /**
     * Get admin token from localStorage
     * @returns {string|null} Admin JWT token if set, null otherwise
     */
    getAdminToken() {
        try {
            return localStorage.getItem('adminToken');
        } catch (error) {
            console.error('Error reading admin token:', error);
            return null;
        }
    },

    /**
     * Set admin token in localStorage
     * @param {string} token - JWT token
     * @param {string} expiresAt - ISO timestamp for token expiration
     * @returns {boolean} Success status
     */
    setAdminToken(token, expiresAt) {
        try {
            localStorage.setItem('adminToken', token);
            if (expiresAt) {
                localStorage.setItem('adminTokenExpiry', expiresAt);
            }
            return true;
        } catch (error) {
            console.error('Error setting admin token:', error);
            return false;
        }
    },

    /**
     * Clear admin token from localStorage
     * @returns {boolean} Success status
     */
    clearAdminToken() {
        try {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminTokenExpiry');
            return true;
        } catch (error) {
            console.error('Error clearing admin token:', error);
            return false;
        }
    },

    /**
     * Get admin token expiration time
     * @returns {string|null} ISO timestamp of token expiration
     */
    getAdminTokenExpiry() {
        try {
            return localStorage.getItem('adminTokenExpiry');
        } catch (error) {
            console.error('Error reading admin token expiry:', error);
            return null;
        }
    },

    /**
     * Check if admin token is expired
     * @returns {boolean} True if token is expired or not set
     */
    isAdminTokenExpired() {
        try {
            const expiry = this.getAdminTokenExpiry();
            if (!expiry) {
                return true; // No expiry means no valid token
            }
            return new Date(expiry) <= new Date();
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true; // Assume expired on error
        }
    },

    /**
     * Get admin code from localStorage (legacy - kept for backward compatibility during migration)
     * @returns {string|null} Admin code if set, null otherwise
     */
    getAdminCode() {
        try {
            // Check localStorage for admin code
            const code = localStorage.getItem('adminCode');
            if (code) {
                return code;
            }
            
            // Check Config for admin code (may be injected at build/deploy time)
            if (typeof Config !== 'undefined') {
                const configCode = Config.getAdminCode();
                if (configCode) {
                    return configCode;
                }
            }
            
            // No hardcoded fallback for security
            // Admin code must be explicitly configured
            return null;
        } catch (error) {
            console.error('Error reading admin code:', error);
            return null;
        }
    },

    /**
     * Set admin code in localStorage
     * @param {string} code - New admin code
     * @returns {boolean} Success status
     */
    setAdminCode(code) {
        try {
            localStorage.setItem('adminCode', code);
            return true;
        } catch (error) {
            console.error('Error setting admin code:', error);
            return false;
        }
    },

    /**
     * Check if admin is authenticated (using sessionStorage)
     * @returns {boolean} Authentication status
     */
    isAdminAuthenticated() {
        try {
            return sessionStorage.getItem('adminAuth') === 'true';
        } catch (error) {
            console.error('Error checking admin authentication:', error);
            return false;
        }
    },

    /**
     * Set admin authentication status (using sessionStorage)
     * @param {boolean} isAuthenticated - Authentication status
     * @returns {boolean} Success status
     */
    setAdminAuth(isAuthenticated) {
        try {
            sessionStorage.setItem('adminAuth', isAuthenticated ? 'true' : 'false');
            return true;
        } catch (error) {
            console.error('Error setting admin authentication:', error);
            return false;
        }
    },

    /**
     * Clear all data from localStorage and sessionStorage
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    /**
     * Export all data for backup
     * @returns {Object} Object containing conversations, personas, and export date
     */
    exportData() {
        try {
            return {
                conversations: this.getConversations(),
                personas: {
                    companion: this.getPersona('companion'),
                    code: this.getPersona('code'),
                    study: this.getPersona('study')
                },
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return {
                conversations: { companion: [], code: [], study: [] },
                personas: {},
                exportDate: new Date().toISOString()
            };
        }
    },

    /**
     * Import data from JSON backup
     * @param {Object} data - Data object with conversations and personas
     * @returns {boolean} Success status
     */
    importData(data) {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                console.error('Invalid data format for import');
                return false;
            }

            // Import conversations
            if (data.conversations) {
                localStorage.setItem('conversations', JSON.stringify(data.conversations));
            }

            // Import personas
            if (data.personas) {
                localStorage.setItem('personas', JSON.stringify(data.personas));
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    },

    // Backward compatibility methods for existing UI code

    /**
     * Get chat history for a specific persona (backward compatibility)
     * @param {string} persona - Persona identifier
     * @returns {Array} Array of messages
     */
    getChatHistory(persona) {
        const conversations = this.getConversations();
        return conversations[persona] || [];
    },

    /**
     * Save message to chat history (backward compatibility)
     * @param {string} persona - Persona identifier
     * @param {Object} message - Message object
     * @returns {boolean} Success status
     */
    saveMessage(persona, message) {
        return this.addMessage(persona, message);
    },

    /**
     * Clear chat history for a specific persona (backward compatibility)
     * @param {string} persona - Persona identifier
     * @returns {boolean} Success status
     */
    clearChatHistory(persona) {
        return this.saveConversation(persona, []);
    },

    /**
     * Clear all chat history for all personas (backward compatibility)
     * @returns {boolean} Success status
     */
    clearAllChatHistory() {
        try {
            localStorage.setItem('conversations', JSON.stringify({
                companion: [],
                code: [],
                study: []
            }));
            return true;
        } catch (error) {
            console.error('Error clearing all chat history:', error);
            return false;
        }
    },

    /**
     * Export all chat history (backward compatibility)
     * @returns {Object} All chat history
     */
    exportAllHistory() {
        return this.getConversations();
    },

    /**
     * Get current persona (backward compatibility)
     * @returns {string} Current persona identifier
     */
    getCurrentPersona() {
        try {
            return localStorage.getItem('currentPersona') || 'companion';
        } catch (error) {
            console.error('Error reading current persona:', error);
            return 'companion';
        }
    },

    /**
     * Set current persona (backward compatibility)
     * @param {string} persona - Persona identifier
     * @returns {boolean} Success status
     */
    setCurrentPersona(persona) {
        try {
            localStorage.setItem('currentPersona', persona);
            return true;
        } catch (error) {
            console.error('Error setting current persona:', error);
            return false;
        }
    },

    /**
     * Get all settings (backward compatibility)
     * @returns {Object} Settings object
     */
    getSettings() {
        try {
            const settings = localStorage.getItem('settings');
            return settings ? JSON.parse(settings) : {
                companionName: 'Companion',
                theme: 'blue'
            };
        } catch (error) {
            console.error('Error reading settings:', error);
            return {
                companionName: 'Companion',
                theme: 'blue'
            };
        }
    },

    /**
     * Update settings (backward compatibility)
     * @param {Object} settings - Settings to update
     * @returns {boolean} Success status
     */
    updateSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const newSettings = { ...currentSettings, ...settings };
            localStorage.setItem('settings', JSON.stringify(newSettings));
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }
};

// Make Storage available globally
window.Storage = Storage;
