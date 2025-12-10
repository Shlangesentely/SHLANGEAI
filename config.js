/**
 * config.js - Configuration file for ShlangeAI
 * Backend handles all API key management - no API keys in frontend
 */

const Config = {
    /**
     * Get admin code for local development
     * @returns {string} Admin code
     */
    getAdminCode() {
        // Default admin code for local development
        return 'admin123';
    }
};

// Make Config available globally
window.Config = Config;
