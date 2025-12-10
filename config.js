/**
 * config.js - Configuration file for ShlangeAI
 * Backend handles all API key management - no API keys in frontend
 */

const Config = {
    /**
     * Get admin code from environment/configuration
     * @returns {string|null} Admin code if configured, null otherwise
     */
    getAdminCode() {
        // No default admin code for security
        // Admin code must be explicitly set by the user
        return null;
    }
};

// Make Config available globally
window.Config = Config;
