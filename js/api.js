/**
 * api.js - API integration for ShlangeAI
 * Handles communication with backend API
 * 
 * Dependencies: Storage (from storage.js)
 * Note: This file must be loaded after storage.js
 */

// Validate dependencies are loaded
if (typeof Storage === 'undefined') {
    throw new Error('Storage is not defined. Ensure storage.js is loaded before api.js');
}

// Backend URL configuration - auto-detects environment
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Local development
    : 'https://shlangeai-backend.onrender.com/api';  // Production (Render deployment)

// Azure Function proxy URL (replace with your deployed Azure Function URL)
const AZURE_PROXY_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:7071/api'  // Local Azure Functions development
    : 'https://your-function-app.azurewebsites.net/api';  // Production Azure Function (TODO: Update this with your actual Azure Function URL!)

// Proxy selection - set to true to use Azure Function, false to use Render backend
const USE_AZURE_PROXY = false;

// Active proxy URL based on configuration
const ACTIVE_PROXY_URL = USE_AZURE_PROXY ? AZURE_PROXY_URL : BACKEND_URL;

console.log('[API] Active proxy URL configured:', ACTIVE_PROXY_URL);
console.log('[API] Using Azure proxy:', USE_AZURE_PROXY);

// Default model for all personas
const DEFAULT_MODEL = 'sonar';

const API = {
    // Persona configurations
    personas: {
        companion: {
            name: 'Companion',
            icon: '💬',
            description: 'Your friendly AI companion for general conversations',
            model: DEFAULT_MODEL
        },
        code: {
            name: 'Code Buddy',
            icon: 'fucer',
            description: 'Your expert programming assistant for coding help',
            model: DEFAULT_MODEL
        },
        study: {
            name: 'Study Helper',
            icon: 'idiot',
            description: 'Your knowledgeable tutor for learning and studying',
            model: DEFAULT_MODEL
        }
    },

    /**
     * Get persona configuration
     * @param {string} persona - Persona identifier (companion, code, or study)
     * @returns {Object} Persona configuration object
     */
    getPersonaConfig(persona) {
        const config = this.personas[persona];
        if (!config) {
            console.warn(`[API] Unknown persona: ${persona}, using companion as fallback`);
            return this.personas.companion;
        }
        return config;
    },

    /**
     * Get AI response for a given persona and message
     * @param {string} persona - Persona identifier
     * @param {string} userMessage - User's message
     * @returns {Promise<{response: string}>} AI response object
     */
    async getResponse(persona, userMessage) {
        console.log(`[API] Getting response for persona: ${persona}`);
        
        try {
            // Get persona configuration
            const personaConfig = this.getPersonaConfig(persona);
            const personaData = Storage.getPersona(persona);
            
            // Build messages array with system prompt and user message
            const messages = [
                {
                    role: 'system',
                    content: personaData.systemPrompt || Storage.DEFAULT_PROMPTS[persona] || Storage.DEFAULT_PROMPTS.companion
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ];

            // Make API request to backend
            console.log(`[API] Sending request to: ${ACTIVE_PROXY_URL}/chat`);
            const response = await fetch(`${ACTIVE_PROXY_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: personaConfig.model,
                    messages: messages
                })
            });

            console.log(`[API] Response status: ${response.status}`);

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = `API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error('[API] Error response:', errorData);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    console.error('[API] Could not parse error response:', e);
                }
                throw new Error(errorMessage);
            }

            // Parse successful response
            const data = await response.json();
            console.log('[API] Response received successfully');

            // Extract message from Perplexity API response format
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                const aiResponse = data.choices[0].message.content;
                return { response: aiResponse };
            } else {
                console.error('[API] Unexpected response format:', data);
                throw new Error('Unexpected response format from API');
            }

        } catch (error) {
            console.error('[API] Error getting response:', error);
            
            // Network errors - TypeError is thrown for network failures
            if (error instanceof TypeError && !error.message.startsWith('API request failed')) {
                throw new Error('Unable to connect to backend. Please check your internet connection.');
            }
            
            // Re-throw other errors with context
            throw new Error(error.message || 'Failed to get AI response');
        }
    }
};

// Make API available globally
window.API = API;
