import { getApiUrl } from '../config';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  // --- Health Check ---
  async checkHealth() {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  // --- Authentication ---
  async register(data) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    const result = await res.json();
    if (result.token) setAuthToken(result.token);
    return result;
  },

  async login(credentials) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const result = await res.json();
    if (result.token) setAuthToken(result.token);
    return result;
  },

  async getMe() {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/me`);
    if (!res.ok) throw new Error('Not authenticated');
    return await res.json();
  },

  async forgotPassword(email) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not process forgot password request');
    }
    return await res.json();
  },

  async resetPassword(email, code, newPassword) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        new_password: newPassword,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not reset password');
    }
    return await res.json();
  },

  async changePassword(currentPassword, newPassword) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not change password');
    }
    return await res.json();
  },

  // --- Parking Spots ---
  async getSpots(params = {}) {
    const baseUrl = getApiUrl();
    const queryParts = [];
    if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.spot_type) queryParts.push(`spot_type=${encodeURIComponent(params.spot_type)}`);
    if (params.is_covered !== undefined && params.is_covered !== null) {
      queryParts.push(`is_covered=${params.is_covered}`);
    }
    if (params.user_lat !== undefined && params.user_lat !== null) {
      queryParts.push(`user_lat=${params.user_lat}`);
    }
    if (params.user_lon !== undefined && params.user_lon !== null) {
      queryParts.push(`user_lon=${params.user_lon}`);
    }
    if (params.user_area) {
      queryParts.push(`user_area=${encodeURIComponent(params.user_area)}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await fetchWithTimeout(`${baseUrl}/api/spots/${queryString}`);
    if (!res.ok) throw new Error(`Failed to load spots: HTTP ${res.status}`);
    return await res.json();
  },

  // --- Bookings ---
  async createBooking(bookingData) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/bookings/`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not complete booking');
    }
    return await res.json();
  },

  async getBookings() {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/bookings/`);
    if (!res.ok) throw new Error(`Failed to load bookings: HTTP ${res.status}`);
    return await res.json();
  },

  async cancelBooking(bookingId) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not cancel booking');
    }
    return await res.json();
  },

  // --- Owner Admin Controls ---
  async getOwnerSpots() {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/owner/spots`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not fetch owner spots');
    }
    return await res.json();
  },

  async updateSpotPricing(spotId, pricingData) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/owner/spots/${spotId}/pricing`, {
      method: 'PUT',
      body: JSON.stringify(pricingData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not update pricing');
    }
    return await res.json();
  },

  async getOwnerBookings() {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/owner/bookings`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not fetch owner bookings');
    }
    return await res.json();
  },

  async createOwnerSpot(spotData) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/owner/spots`, {
      method: 'POST',
      body: JSON.stringify(spotData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not create parking spot');
    }
    return await res.json();
  },

  // --- AI Gemini ---
  async getAIRecommendations(criteria) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/ai/recommend`, {
      method: 'POST',
      body: JSON.stringify(criteria),
    }, 15000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'AI recommendation failed');
    }
    return await res.json();
  },

  async chatWithAI(message) {
    const baseUrl = getApiUrl();
    const res = await fetchWithTimeout(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }, 15000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'AI chat request failed');
    }
    return await res.json();
  },
};
