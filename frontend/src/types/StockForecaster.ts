export interface ModelMetrics {
    RMSE: number;
    MAE: number;
    MAPE: number;
    score_pondere: number;
}

export interface ModelInfo {
    name: string;
    type: string;
    status: 'idle' | 'training' | 'paused' | 'completed';
    accuracy: number;
    lastTraining: string | null;
    predictions: number[];
    metrics: ModelMetrics | null;
}

export interface ModelConfig {
    general: {
        epochs: number;
        batchSize: number;
        learningRate: number;
    };
    individual: Record<string, {
        epochs: number;
        batchSize: number;
        learningRate: number;
    }>;
}

export interface StockForecaster {
    models: ModelInfo[];
    config: ModelConfig;
    startTraining: (modelName?: string) => Promise<void>;
    pauseTraining: (modelName: string) => Promise<void>;
    resumeTraining: (modelName: string) => Promise<void>;
    getModelStatus: (modelName: string) => Promise<string>;
    getPredictions: (modelName: string) => Promise<number[]>;
    updateConfig: (config: Partial<ModelConfig>) => Promise<void>;
    updateModelConfig: (modelName: string, config: Partial<ModelConfig['individual'][string]>) => Promise<void>;
}
