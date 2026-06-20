import api from '@/config/axios';

export interface ChatResponse {
  success: boolean;
  data: string;
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

    let displayContent = "";
    if (payload?.user_friendly_response) {
      displayContent = String(payload.user_friendly_response);
    } else if (typeof payload === 'object' && payload !== null) {
      displayContent = JSON.stringify(payload, null, 2);
    } else {
      displayContent = String(payload ?? "");
    }

    return {
      success: true,
      data: displayContent,
      message: raw?.message,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    const msg =
      axiosError?.response?.data?.message ||
      axiosError?.response?.data?.error ||
      axiosError?.message ||
      'Une erreur est survenue';
    return { success: false, error: msg, data: "" };
  }
};