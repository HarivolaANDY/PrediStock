import api from '@/config/axios';

export interface ChatResponse {
  success: boolean;
  data: any;
  message?: string;
  error?: string;
}

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  try {
    const response = await api.post('/forecasting/chat/', { message });
    const raw = response.data;

    // L'endpoint retourne { success, data, message }
    // data peut contenir { recommendation, user_friendly_response }
    const payload = raw?.data ?? raw;

    let displayContent = payload;
    if (payload?.user_friendly_response) {
      displayContent = payload.user_friendly_response;
    } else if (typeof payload === 'object') {
      displayContent = JSON.stringify(payload, null, 2);
    }

    return {
      success: true,
      data: displayContent,
      message: raw?.message,
    };
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Une erreur est survenue';
    return { success: false, error: msg, data: null };
  }
};