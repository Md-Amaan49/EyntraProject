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
  image?: string;
  image_url?: string;
  thumbnail_url?: string;
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

// New types for dashboard features

export interface CattleFormData {
  breed: string;
  age: number;
  identification_number: string;
  gender: 'male' | 'female';
  weight?: number;
  metadata?: Record<string, any>;
  image?: File | null;
}

export interface HealthEvent {
  id: string;
  type: 'symptom' | 'prediction' | 'treatment' | 'consultation';
  date: string;
  title: string;
  description: string;
  severity?: string;
  veterinarian?: string;
  metadata?: Record<string, any>;
}

export interface HealthFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  eventTypes: string[];
  severity?: string[];
}

export interface Veterinarian {
  id: string;
  user: User;
  license_number: string;
  vet_type: 'government' | 'private';
  specializations: string[];
  years_experience: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  service_radius_km: number;
  is_available: boolean;
  is_emergency_available: boolean;
  working_hours: Record<string, any>;
  consultation_fees: {
    chat: number;
    voice: number;
    video: number;
    emergency: {
      chat: number;
      voice: number;
      video: number;
    };
  };
  qualification: string;
  bio?: string;
  profile_image?: string;
  total_consultations: number;
  average_rating: number;
  is_verified: boolean;
  verification_date?: string;
  created_at: string;
  distance_km?: number;
}

export interface VeterinarianFilters {
  specialization?: string;
  availability?: 'available' | 'all';
  rating?: number;
  maxFee?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  search?: string;
  page?: number;
  page_size?: number;
  maxDistance?: number;
  emergencyOnly?: boolean;
  minRating?: number;
}

export interface Consultation {
  id: string;
  userId: string;
  veterinarianId: string;
  cattleId: string;
  type: 'chat' | 'voice' | 'video';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  fee: number;
  isEmergency: boolean;
  caseDescription: string;
  veterinarianNotes?: string;
  prescriptions?: Prescription[];
  followUpDate?: Date;
}

export interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface BookingData {
  veterinarianId: string;
  cattleId: string;
  consultationType: 'chat' | 'voice' | 'video';
  scheduledTime: Date;
  isEmergency: boolean;
  caseDescription: string;
  paymentMethod: string;
}

export interface ConsultationFilters {
  status?: string;
  type?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'system';
  imageUrl?: string;
}

export interface Notification {
  id: string;
  type: 'reminder' | 'alert' | 'message' | 'system';
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  enablePush: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  reminderTypes: string[];
  alertTypes: string[];
}

export interface DashboardStatistics {
  totalCattle: number;
  healthyCattle: number;
  sickCattle: number;
  underTreatment: number;
  recentReports: number;
  upcomingAppointments: number;
}

export interface HealthTrend {
  period: string;
  healthyCount: number;
  sickCount: number;
  treatmentCount: number;
  commonSymptoms: string[];
  treatmentOutcomes: Record<string, number>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  cattleId?: string;
  dateRange: DateRange;
  eventTypes?: string[];
}