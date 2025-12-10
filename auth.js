/**
 * auth.js - Admin authentication logic for ShlangeAI
 * Handles passcode verification and admin panel access
 * 
 * Dependencies: Storage (from storage.js), AuthAPI (from api.js)
 * Note: This file must be loaded after storage.js and api.js
 */

// Validate dependencies are loaded
if (typeof Storage === 'undefined') {
    throw new Error('Storage is not defined. Ensure storage.js is loaded before auth.js');
}

if (typeof AuthAPI === 'undefined') {
    throw new Error('AuthAPI is not defined. Ensure api.js is loaded before auth.js');
}

const Auth = {
    // Authentication state
    isAuthenticated: false,

    /**
     * Initialize Auth and set up event listeners
     */
    init() {
        this.setupEventListeners();
        
        // Check if already authenticated from session
        if (Storage.isAdminAuthenticated()) {
            this.isAuthenticated = true;
        }
    },

    /**
     * Set up event listeners for admin controls
     */
    setupEventListeners() {
        // Admin unlock button
        const unlockBtn = document.getElementById('admin-unlock-btn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => this.unlockAdmin());
        }

        // Admin code input - Enter key
        const codeInput = document.getElementById('admin-code-input');
        if (codeInput) {
            codeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.unlockAdmin();
                }
            });
        }

        // Admin logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logoutAdmin());
        }

        // Tone range slider - update value display
        const toneSlider = document.getElementById('companion-tone');
        const toneValue = document.getElementById('tone-value');
        if (toneSlider && toneValue) {
            toneSlider.addEventListener('input', (e) => {
                toneValue.textContent = e.target.value;
            });
        }
    },

    /**
     * Unlock admin panel with code verification using JWT
     */
    async unlockAdmin() {
        const codeInput = document.getElementById('admin-code-input');
        const message = document.getElementById('admin-message');
        const unlockSection = document.getElementById('admin-unlock-section');
        const adminFeatures = document.getElementById('admin-features');

        if (!codeInput || !message || !unlockSection || !adminFeatures) {
            console.error('Required admin elements not found');
            return;
        }

        const inputCode = codeInput.value.trim();

        // Validate input
        if (!inputCode) {
            message.textContent = '✗ Please enter an admin code';
            message.className = 'message error';
            
            setTimeout(() => {
                message.textContent = '';
                message.className = 'message';
            }, 3000);
            return;
        }

        try {
            // Show loading state
            message.textContent = 'Authenticating...';
            message.className = 'message';

            // Login with JWT
            const result = await AuthAPI.login(inputCode);

            // Successful login
            this.isAuthenticated = true;
            Storage.setAdminAuth(true);

            // Show success message
            message.textContent = `✓ Admin unlocked! Session expires ${new Date(result.expiresAt).toLocaleString()}`;
            message.className = 'message success';

            // Hide unlock section, show admin features
            setTimeout(async () => {
                unlockSection.style.display = 'none';
                adminFeatures.style.display = 'block';
                
                // Load persona settings with proper error handling
                try {
                    await this.loadPersonaSettings();
                } catch (error) {
                    console.error('[Auth] Error loading persona settings:', error);
                    // Admin panel still displays even if settings fail to load
                }
            }, 1000);

            // Clear input
            codeInput.value = '';

            // Clear success message after 5 seconds
            setTimeout(() => {
                message.textContent = '';
                message.className = 'message';
            }, 5000);

        } catch (error) {
            // Login failed
            console.error('[Auth] Login failed:', error);
            message.textContent = `✗ ${error.message || 'Authentication failed'}`;
            message.className = 'message error';
            codeInput.value = '';
            codeInput.focus();

            // Clear error message after 5 seconds
            setTimeout(() => {
                message.textContent = '';
                message.className = 'message';
            }, 5000);
        }
    },

    /**
     * Logout from admin panel
     */
    logoutAdmin() {
        this.isAuthenticated = false;
        Storage.setAdminAuth(false);
        
        // Clear JWT token
        AuthAPI.logout();

        // Get elements
        const unlockSection = document.getElementById('admin-unlock-section');
        const adminFeatures = document.getElementById('admin-features');
        const codeInput = document.getElementById('admin-code-input');
        const message = document.getElementById('admin-message');

        if (unlockSection && adminFeatures) {
            adminFeatures.style.display = 'none';
            unlockSection.style.display = 'block';
        }

        // Clear input and message
        if (codeInput) {
            codeInput.value = '';
        }
        if (message) {
            message.textContent = '';
            message.className = 'message';
        }

        console.log('[Auth] Logged out and cleared JWT token');
    },

    /**
     * Get backend URL for API calls
     * @returns {string} Backend API URL
     */
    getBackendUrl() {
        // Auto-detect environment similar to api.js
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal
            ? 'http://localhost:3000/api'
            : 'https://shlangeai-backend.onrender.com/api';
        return baseUrl;
    },

    /**
     * Make authenticated request to backend API with JWT token
     * @param {string} endpoint - API endpoint path (e.g., '/personas' or '/personas/1')
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     * @throws {Error} If authentication fails or request fails
     */
    async makeAuthenticatedRequest(endpoint, options = {}) {
        const backendUrl = this.getBackendUrl();
        
        // Get auth header from AuthAPI
        const authHeader = AuthAPI.getAuthHeader();
        
        if (!authHeader) {
            throw new Error('No valid authentication token available. Please login again.');
        }

        const url = `${backendUrl}${endpoint}`;
        const fetchOptions = {
            ...options,
            headers: {
                ...options.headers,
                ...authHeader
            }
        };

        console.log(`[Auth] Making authenticated request to ${url}`);

        const response = await fetch(url, fetchOptions);

        // Handle authentication errors
        if (response.status === 401) {
            console.error('[Auth] Unauthorized - token expired or invalid');
            // Clear expired token
            AuthAPI.logout();
            Storage.setAdminAuth(false);
            throw new Error('Session expired. Please login again.');
        }

        if (response.status === 403) {
            console.error('[Auth] Forbidden - insufficient permissions');
            throw new Error('Insufficient permissions');
        }

        return response;
    },

    /**
     * Load persona settings into form fields
     * Tries to fetch from backend API if authenticated, falls back to localStorage
     * 
     * Note: Backend fetch is currently for future integration. The backend personas
     * use a different schema (companion_name vs name, system_prompt vs systemPrompt)
     * and are stored in PostgreSQL. For now, we fall back to localStorage which is
     * the active data source for the frontend.
     * 
     * @returns {Promise<void>} Completes successfully or exits early if persona not found
     */
    async loadPersonaSettings() {
        // Try to fetch from backend if we have authentication
        // This prepares for future backend integration when persona sync is implemented
        if (this.isAuthenticated) {
            try {
                const backendPersonas = await this.fetchPersonasFromBackend();
                // TODO: In future, sync backend personas with localStorage
                // For now, we just validate the endpoint is accessible
                console.log('[Auth] Backend persona endpoint is accessible');
            } catch (error) {
                // Log backend failure without propagating error
                console.warn('[Auth] Failed to fetch personas from backend, using localStorage:', error.message || error);
            }
        }

        try {
            // Get companion persona from storage (currently from localStorage)
            const companionPersona = Storage.getPersona('companion');

            // Check if persona exists
            if (!companionPersona) {
                console.error('[Auth] Failed to load companion persona from localStorage');
                return;
            }

            // Populate form fields
            const nameInput = document.getElementById('companion-name');
            const personalityInput = document.getElementById('companion-personality');
            const toneInput = document.getElementById('companion-tone');
            const toneValue = document.getElementById('tone-value');
            const promptInput = document.getElementById('companion-prompt');

            if (nameInput && companionPersona.name) {
                nameInput.value = companionPersona.name;
            }

            if (personalityInput && companionPersona.personality) {
                personalityInput.value = companionPersona.personality;
            }

            if (toneInput && toneValue && companionPersona.tone !== undefined) {
                const tone = companionPersona.tone;
                toneInput.value = tone;
                toneValue.textContent = tone;
            }

            if (promptInput && companionPersona.systemPrompt) {
                promptInput.value = companionPersona.systemPrompt;
            }

            console.log('[Auth] Successfully loaded persona settings');
        } catch (error) {
            // Catch any errors from localStorage access or DOM manipulation
            console.error('[Auth] Error loading persona settings from localStorage:', error);
            // Don't throw - allow admin panel to display even if settings fail to load
        }
    },

    /**
     * Fetch personas from backend API with admin authentication
     * @returns {Promise<Array>} Array of persona objects from backend
     * @throws {Error} Re-throws any error encountered during the API request
     */
    async fetchPersonasFromBackend() {
        try {
            const response = await this.makeAuthenticatedRequest('/personas', {
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || `Failed to fetch personas: ${response.status}`;
                console.error('[Auth] Failed to fetch personas:', response.status, errorData);
                throw new Error(errorMessage);
            }

            const personas = await response.json();
            console.log(`[Auth] Successfully fetched ${personas.length} personas from backend`);
            
            return personas;
        } catch (error) {
            // Log the error with context
            console.error('[Auth] Error in fetchPersonasFromBackend:', error.message || error);
            // Re-throw to allow caller to handle
            throw error;
        }
    },

    /**
     * Fetch a specific persona from backend API by ID with admin authentication
     * @param {number} personaId - The ID of the persona to fetch
     * @returns {Promise<Object>} Persona object from backend
     */
    async fetchPersonaById(personaId) {
        const response = await this.makeAuthenticatedRequest(`/personas/${personaId}`, {
            method: 'GET'
        });

        if (response.status === 404) {
            console.error(`[Auth] Persona ${personaId} not found`);
            throw new Error(`Persona with ID ${personaId} not found`);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Auth] Failed to fetch persona:', response.status, errorData);
            throw new Error(errorData.message || `Failed to fetch persona: ${response.status}`);
        }

        const persona = await response.json();
        console.log(`[Auth] Successfully fetched persona ${personaId} from backend`);
        
        return persona;
    },

    /**
     * Check if admin is currently unlocked
     * @returns {boolean} Authentication status
     */
    isUnlocked() {
        return Storage.isAdminAuthenticated();
    },

    /**
     * Verify admin passcode (legacy method for backward compatibility)
     * @param {string} inputPasscode - User input passcode
     * @returns {boolean} Verification result
     */
    verifyPasscode(inputPasscode) {
        const correctPasscode = Storage.getAdminCode();
        this.isAuthenticated = (inputPasscode === correctPasscode);
        
        // Update sessionStorage authentication status
        if (this.isAuthenticated) {
            Storage.setAdminAuth(true);
        }
        
        return this.isAuthenticated;
    },

    /**
     * Change admin passcode (legacy method for backward compatibility)
     * @param {string} currentPasscode - Current passcode for verification
     * @param {string} newPasscode - New passcode to set
     * @returns {Object} Result object with success status and message
     */
    changePasscode(currentPasscode, newPasscode) {
        if (!this.isAuthenticated) {
            return {
                success: false,
                message: 'Not authenticated. Please verify your current passcode first.'
            };
        }

        if (!newPasscode || newPasscode.trim().length < 4) {
            return {
                success: false,
                message: 'New passcode must be at least 4 characters long.'
            };
        }

        const success = Storage.setAdminCode(newPasscode.trim());
        
        if (success) {
            return {
                success: true,
                message: 'Passcode updated successfully!'
            };
        } else {
            return {
                success: false,
                message: 'Failed to update passcode. Please try again.'
            };
        }
    },

    /**
     * Logout from admin panel (legacy method for backward compatibility)
     */
    logout() {
        this.logoutAdmin();
    },

    /**
     * Check if user is authenticated (legacy method for backward compatibility)
     * @returns {boolean} Authentication status
     */
    checkAuth() {
        // Check sessionStorage as source of truth
        const sessionAuth = Storage.isAdminAuthenticated();
        this.isAuthenticated = sessionAuth;
        return this.isAuthenticated;
    }
};

// Initialize Auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}

// Make Auth available globally
window.Auth = Auth;
