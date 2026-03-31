// import { getAuthHeaders } from '@/lib/auth';

const API_URL = 'http://localhost:8000/api/recommandation/chat/';

export const sendChatMessage = async (message: string) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${localStorage.getItem("token")}`,
        // ...getAuthHeaders(),
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    console.log('Response from server:', data); // Pour le débogage

    if (!response.ok) {
      throw new Error(data.message || 'Erreur du serveur');
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    };
  } catch (error) {
    console.error('Error details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
      data: null
    };
  }
};