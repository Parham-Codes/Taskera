import { api } from './client.js';

export const telegramApi = {
  /**
   * Fetch current user's telegram settings
   */
  getSettings: async () => {
    const response = await api.get('/telegram/settings');
    return response.data?.data?.settings ?? response.data?.settings;
  },

  /**
   * Update telegram settings
   */
  updateSettings: async (settingsData) => {
    const response = await api.put('/telegram/settings', settingsData);
    return response.data?.data?.settings ?? response.data?.settings;
  },

  /**
   * Dispatch a test telegram notification
   */
  testNotification: async ({ botToken, chatId }) => {
    const response = await api.post('/telegram/test', { botToken, chatId });
    return response.data;
  },
};
