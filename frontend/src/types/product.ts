export interface CriticalProduct {
    id: number;
    name: string;
    stock: number;
    current_stock: number;
    stock_threshold: number;
    critical: number;
    status: "critical" | "warning" | "low" | "ok" | "good";
    days: number;
    product_img?: string | null;
}

export interface ProductResponse {
    success: boolean;
    data: CriticalProduct[];
    message?: string;
}