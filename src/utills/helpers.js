import {store} from '../store';
import {login, logout} from '../store/slices/authSlice';

/**
 * Build API URL
 * @param {string} endpoint - API endpoint (e.g., 'jobs')
 * @param {string|number} [id] - Optional resource ID
 * @returns {string} - Full API URL
 */
export function buildApiUrl(endpoint, id = null) {
    // Use environment variable or fallback to production URL
    //const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://demosmartvendorapi.architanz.com/api';
    const baseUrl = '';
    
    // Ensure baseUrl ends with '/'
    const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    return id ? `${formattedBaseUrl}${endpoint}/${id}` : `${formattedBaseUrl}${endpoint}`;
}

// Refresh token function
export async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    //const token = store.getState().auth.authToken;
    const response = await fetch(buildApiUrl('auth/refresh-token'), {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            //'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('Failed to refresh token');
    const {data: {email, token, role}} = await response.json();
    store.dispatch(login({ user: email, token, role }));
    if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data.accessToken;
}

// Refresh token function
export async function getRefreshAccessToken(refreshToken) {
    //const token = store.getState().auth.authToken;
    const response = await fetch(buildApiUrl('auth/refresh-token'), {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            //'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('Failed to refresh token');
    const {email, token, role} = await response.json();
    store.dispatch(login({ user: email, token, role })); 
    
}

/**
 * Generic API call function with automatic token refresh and retry
 */
export async function apiCall(url, method = 'GET', body = null, headers = {}) {
    let token = store.getState().auth.authToken;
    console.log("Current auth token:", store.getState());
    let options = {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        let response = await fetch(url, options);
        if (response.status === 401) {
            // Try to refresh token and retry once
            try {
                const newToken = await refreshAccessToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, options);
            } catch (refreshErr) {
                store.dispatch(logout());
                localStorage.removeItem('refreshToken');
                throw new Error('Session expired. Please login again.');
            }
        }
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}