/**
 * API client for interacting with xworkmate-bridge via Next.js proxy
 */

const BASE_URL = '/api/ai-workspace';

export interface DashboardData {
  tasks: any[];
  insights: any;
}

export const xworkmateApi = {
  /**
   * Retrieves dashboard overview data
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${BASE_URL}/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Retrieves a specific conversation by ID
   */
  async getConversation(id: string) {
    const response = await fetch(`${BASE_URL}/conversations/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Sends a message to a conversation
   */
  async sendMessage(id: string, text: string) {
    const response = await fetch(`${BASE_URL}/conversations/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    return response.json();
  }
};
