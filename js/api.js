// js/api.js
/**
 * api.js - API integration for ShlangeAI
 * Handles communication with external AI API
 *
 * Dependencies: Storage (from storage.js)
 * Note: This file must be loaded after storage.js
 */

// Validate dependencies are loaded
if (typeof Storage === 'undefined') {
    throw new Error('Storage is not defined. Ensure storage.js is loaded before api.js');
}

// IMPORTANT: Hardcoding API keys in frontend code is generally NOT recommended for production environments.
// This is done here as per user request. For production, consider secure backend proxying.
const PERPLEXITY_API_KEY = 'eak_goL3JgmBBbxUyKavJsRBeXxJssafbvlGqCQCB2TVv75hVOOy';
const PERPLEXITY_API_ENDPOINT = 'https://api.perplexity.ai/chat/completions';

// Original backend proxy configuration (commented out as direct API call is requested)
// const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
//     ? 'http://localhost:3000/api'  // Local development
//     : 'https://shlangeai-backend.onrender.com/api';  // Production (Render deployment)

// const AZURE_PROXY_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
//     ? 'http://localhost:7071/api'  // Local Azure Functions development
//     : 'https://your-function-app.azurewebsites.net/api';  // Production Azure Function (TODO: Update this with your actual Azure Function URL!)

// const USE_AZURE_PROXY = false; // Set to true to use Azure Function, false to use Render backend
// const ACTIVE_PROXY_URL = USE_AZURE_PROXY ? AZURE_PROXY_URL : BACKEND_URL;

console.log('[API] Using direct Perplexity AI API endpoint.');

// Default model for all personas
const DEFAULT_MODEL = 'sonar'; // Perplexity AI supports models like 'sonar-small-chat', 'sonar-medium-chat'

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
            icon: '💻', // Changed from 'fucer' to a more appropriate icon for Code Buddy
            description: 'Your expert programming assistant for coding help',
            model: DEFAULT_MODEL
        },
        study: {
            name: 'Study Helper',
            icon: '📚', // Changed from 'idiot' to a more appropriate icon for Study Helper
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
            // Get persona configuration and data
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

            // Make API request directly to Perplexity AI
            console.log(`[API] Sending request to Perplexity AI: ${PERPLEXITY_API_ENDPOINT}`);
            const response = await fetch(PERPLEXITY_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}` // Hardcoded API key
                },
                body: JSON.stringify({
                    model: personaConfig.model,
                    messages: messages
                })
            });

            console.log(`[API] Perplexity AI Response status: ${response.status}`);

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = `Perplexity AI API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error('[API] Error response from Perplexity AI:', errorData);
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                } catch (e) {
                    console.error('[API] Could not parse error response from Perplexity AI:', e);
                }
                throw new Error(errorMessage);
            }

            // Parse successful response
            const data = await response.json();
            console.log('[API] Response received successfully from Perplexity AI');

            // Extract message from Perplexity API response format
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                const aiResponse = data.choices[0].message.content;
                return { response: aiResponse };
            } else {
                console.error('[API] Unexpected response format from Perplexity AI:', data);
                throw new Error('Unexpected response format from Perplexity AI');
            }

        } catch (error) {
            console.error('[API] Error getting response from Perplexity AI:', error);

            // Network errors - TypeError is thrown for network failures
            if (error instanceof TypeError && !error.message.startsWith('Perplexity AI API request failed')) {
                throw new Error('Unable to connect to Perplexity AI. Please check your internet connection.');
            }

            // Re-throw other errors with context
            throw new Error(error.message || 'Failed to get AI response from Perplexity AI');
        }
    }
};

// Make API available globally
window.API = API;
