export interface Notification {
    id: string;
    message: string;
    titre: string;
    creer_le: string;
    modifie_le: string;
    utilisateur: string | number | null;
    status: string;
    channel: string;
    active: boolean;
    type_notification: string;
    priorite: number | string;
}