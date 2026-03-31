// Configuration globale des modèles
export interface ModelSettings {
  maxModels: number
  defaultHorizon: number
  trainingInterval: 'daily' | 'weekly' | 'monthly'
  autoRetrain: boolean
}

// Type de modèle IA
export type ModelType = 'Prophet' | 'ARIMA' | 'Regression'

// Statut du modèle
export type ModelStatus = 'active' | 'inactive' | 'training' | 'error'

// Métriques de performance
export interface ModelMetrics {
  accuracy: number
  mae: number
  rmse: number
  mape: number
}

// Configuration d'un modèle
export interface ModelConfig {
  seasonality: number
  horizon: number
  trainingPeriod: '6months' | '12months' | '24months' | 'all'
}

// Modèle IA complet
export interface AIModel {
  id: string
  name: string
  type: ModelType
  status: ModelStatus
  metrics: ModelMetrics
  config: ModelConfig
  lastTrained: string
  predictions: string
  createdAt: string
  updatedAt: string
}

// Format pour les données de performance
export interface PerformanceData {
  date: string
  mae: number
  rmse: number
  mape: number
}

// Requête pour créer/mettre à jour un modèle
export interface ModelRequest {
  name: string
  type: ModelType
  config: ModelConfig
}

// Réponse de l'API pour un modèle
export interface ModelResponse {
  model: AIModel
  message: string
  success: boolean
}