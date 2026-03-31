import { API_BASE_URL } from "@/config/api.config";

export interface Notification {
  id: number;
  titre: string; 
  message: string;
  creer_le: string;
  modifie_le: string;
  status: 'lu' | 'non lu';
  priorite: number;
  channel: string;
  active: boolean;
  type_notification: string;
  utilisateur: number;
}

class NotificationService {
  private API_URL = `${API_BASE_URL}/notification`;

  async getNotifications(): Promise<Notification[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(this.API_URL + '/', {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des notifications');
    }

    const data = await response.json();
    return data.data;
  }

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => n.status === 'non lu').length;
  }
}

export const notificationService = new NotificationService();