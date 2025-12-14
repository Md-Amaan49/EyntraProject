/**
 * TypeScript type definitions for the application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'owner' | 'veterinarian' | 'admin';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Cattle {
  id: string;
  breed: string;
  age: number;
  identification_number: string;
  gender: 'male' | 'female';
  weight?: number;
  metadata?: Record<string, any>;
  health_status: 'healthy' | 'sick' | 'under_treatment';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

export interface SymptomEntry {
  id: string;
  cattle: string;
  cattle_name: string;
  cattle_id_number: string;
  symptoms: string;
  observed_date: string;
  severity: 'mild' | 'moderate' | 'severe';
  additional_notes?: string;
  images: HealthImage[];
  created_at: string;
  created_by_name: string;
}

export interface HealthImage {
  id: string;
  cattle: string;
  image: string;
  image_url: string;
  image_type: 'lesion' | 'wound' | 'discharge' | 'general';
  upload_date: string;
  uploaded_by_name: string;
}

export interface DiseasePrediction {
  diseaseName: string;
  confidenceScore: number;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  commonSymptoms?: string[];
  riskFactors?: string[];
}

export interface Treatment {
  name: string;
  description: string;
  ingredients?: string[];
  dosage: string;
  administration_method?: string;
  administration?: string;
  frequency: string;
  duration: string;
  preparation_method?: string;
  precautions: string[];
  side_effects: string[];
  effectiveness?: string;
  requires_prescription?: boolean;
  estimated_cost?: string;
  availability?: string;
}

export interface TreatmentRecommendations {
  disease_info?: {
    name: string;
    description: string;
    severity?: string;
  };
  traditional: Treatment[];
  allopathic: Treatment[];
  protocols?: any[];
  prevention?: string;
  care_instructions?: string;
  general_care: string[];
  disclaimer: string;
  confidence_note?: string;
  veterinary_consultation: {
    recommended: boolean;
    urgency: 'routine' | 'urgent' | 'emergency';
    reasons: string[];
    message: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface PredictionResponse {
  predictions: DiseasePrediction[];
  confidence: number;
  processing_time: number;
}