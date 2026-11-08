import { api, setAuthToken } from './api';

let currentUser = null;
const authListeners = new Set();

export const authState = {
  getUser: () => currentUser,
  isLoggedIn: () => !!currentUser,
  isOwner: () => currentUser?.role === 'owner',

  subscribe: (listener) => {
    authListeners.add(listener);
    return () => authListeners.delete(listener);
  },

  notify: () => {
    authListeners.forEach((fn) => fn(currentUser));
  },

  async login(email, password) {
    const res = await api.login({ email, password });
    currentUser = res.user;
    setAuthToken(res.token);
    this.notify();
    return currentUser;
  },

  async register(name, email, password, role = 'driver', phone = '') {
    const res = await api.register({ name, email, password, role, phone });
    currentUser = res.user;
    setAuthToken(res.token);
    this.notify();
    return currentUser;
  },

  logout() {
    currentUser = null;
    setAuthToken(null);
    this.notify();
  },
};
