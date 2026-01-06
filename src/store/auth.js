import { ref, computed } from 'vue';
import { authAPI, devAPI } from '../services/api.js';

const user = ref(null);
const token = ref(localStorage.getItem('token') || null);

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);
  const isMainUser = computed(() => user.value?.role === 'main_user');
  const isSharedUser = computed(() => user.value?.role === 'shared_user');

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const connectWithCode = async (data) => {
    try {
      const response = await authAPI.connectWithCode(data);
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  };

  const autoLogin = async (username) => {
    try {
      const response = await devAPI.autoLogin(username);
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const loadProfile = async () => {
    try {
      if (!token.value) return;
      const profile = await authAPI.getProfile();
      user.value = profile;
      return profile;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Load user from token on init
  if (token.value) {
    loadProfile().catch(() => {
      logout();
    });
  }

  return {
    user,
    token,
    isAuthenticated,
    isMainUser,
    isSharedUser,
    login,
    register,
    connectWithCode,
    autoLogin,
    logout,
    loadProfile,
  };
}

