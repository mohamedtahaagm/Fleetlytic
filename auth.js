// Import required variables and functions
import { API_URL } from './script.js';

// Save initializeUserInterface function for later use
let initializeUICallback = null;

// Set the initialize user interface callback
export function setInitializeUICallback(callback) {
    initializeUICallback = callback;
}

// Check login status
export function checkLoginStatus() {
    // Check for token in localStorage
    const token = localStorage.getItem('fleetToken');
    
    // Ensure login screen is shown first
    showLoginScreen();

    // If token exists, validate it
    if (token) {
        validateToken(token);
    }
}

// Validate the token
export function validateToken(token) {
    const params = new URLSearchParams();
    params.append('action', 'validateToken');
    params.append('token', token);

    fetch(`${API_URL}?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && initializeUICallback) {
                initializeUICallback(data.data);
            } else {
                showLoginScreen();
            }
        })
        .catch(error => {
            console.error("Token validation error:", error);
            showLoginScreen();
        });
}

// Show login screen
export function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    
    if (loginContainer && mainContainer) {
        loginContainer.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
}

// Login function
export function login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    // Check if required data is entered
    if (!email || !password) {
        showLoginError("Please enter email and password");
        return;
    }

    // Disable login button and change text
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    // Hide previous error messages
    if (loginError) {
        loginError.style.display = 'none';
    }

    // Send login data
    const params = new URLSearchParams();
    params.append('action', 'login');
    params.append('email', email);
    params.append('password', password);

    fetch(`${API_URL}?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            // Re-enable login button and reset text
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }

            if (data.status === 'success' && initializeUICallback) {
                localStorage.setItem('fleetToken', data.data.token);
                initializeUICallback(data.data);
            } else {
                showLoginError(data.message || "Login failed");
            }
        })
        .catch(error => {
            console.error("Login error:", error);
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
            showLoginError("Error connecting to server");
        });
}

// Show login error message
export function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Logout function
export function logout() {
    localStorage.removeItem('fleetToken');
    showLoginScreen();
}
