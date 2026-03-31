const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface StockMouvementData {
    id_movement?: number;
    id_product: number;
    quantity: number;
    movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP';
    reason: string;
    notes?: string;
    unit_price?: number;
    product_name?: string;
}

export const stockMouvementService = {
    createStockMouvement: async (data: StockMouvementData) => {
        const response = await fetch(`${API_BASE_URL}/stock/mouvements/`, { // ✅ corrigé
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Erreur lors de la création du mouvement de stock');
            } catch {
                throw new Error(`Erreur serveur (${response.status})`);
            }
        }

        return await response.json();
    },

    updateStockMouvement: async (id: number, data: Partial<StockMouvementData>) => {
        const response = await fetch(`${API_BASE_URL}/stock/mouvements/${id}/`, { // ✅ corrigé
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Erreur lors de la mise à jour du mouvement de stock');
            } catch {
                throw new Error(`Erreur serveur (${response.status})`);
            }
        }

        return await response.json();
    },

    getStockMouvements: async (params?: { search?: string; movement_type?: string }) => {
        let url = `${API_BASE_URL}/stock/mouvements/`; // ✅ corrigé

        if (params) {
            const queryParams = new URLSearchParams();
            if (params.search) queryParams.append('search', params.search);
            if (params.movement_type) queryParams.append('movement_type', params.movement_type);
            if (queryParams.toString()) url += `?${queryParams.toString()}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Erreur lors de la récupération des mouvements de stock');
            } catch {
                throw new Error(`Erreur serveur (${response.status})`);
            }
        }

        return await response.json();
    },

    getStockMouvementById: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/stock/mouvements/${id}/`, { // ✅ corrigé
            headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Erreur lors de la récupération du mouvement de stock');
            } catch {
                throw new Error(`Erreur serveur (${response.status})`);
            }
        }

        return await response.json();
    }
};