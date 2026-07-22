// ============================================================
// API Client - Axios instance for backend communication
// ============================================================
import axios from "axios";
import type {
  ApiResponse,
  Lead,
  Deal,
  DashboardStats,
  ScorePredictionRequest,
  ScorePredictionResponse,
} from "@/types/crm";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================================
// Lead API Methods
// ============================================================

/**
 * Fetch all leads with optional filters
 */
export async function getLeads(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Lead[]>> {
  const response = await apiClient.get("/leads", { params });
  return response.data;
}

/**
 * Fetch single lead by ID
 */
export async function getLead(id: string): Promise<ApiResponse<Lead>> {
  const response = await apiClient.get(`/leads/${id}`);
  return response.data;
}

/**
 * Create new lead
 */
export async function createLead(
  lead: Partial<Lead>
): Promise<ApiResponse<Lead>> {
  const response = await apiClient.post("/leads", lead);
  return response.data;
}

/**
 * Update lead details
 */
export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<ApiResponse<Lead>> {
  const response = await apiClient.put(`/leads/${id}`, updates);
  return response.data;
}

/**
 * Update lead status (for Kanban drag-drop)
 */
export async function updateLeadStatus(
  id: string,
  status: string
): Promise<ApiResponse<Lead>> {
  const response = await apiClient.patch(`/leads/${id}/status`, { status });
  return response.data;
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string): Promise<ApiResponse<void>> {
  const response = await apiClient.delete(`/leads/${id}`);
  return response.data;
}

// ============================================================
// Deals API Methods
// ============================================================

/**
 * Fetch all deals for Kanban board
 */
export async function getDeals(): Promise<ApiResponse<Deal[]>> {
  const response = await apiClient.get("/deals");
  return response.data;
}

/**
 * Update deal stage (Kanban drag-drop)
 */
export async function updateDealStage(
  id: string,
  stage: string
): Promise<ApiResponse<Deal>> {
  const response = await apiClient.patch(`/deals/${id}/stage`, { stage });
  return response.data;
}

// ============================================================
// ML Scoring API Methods
// ============================================================

/**
 * Request AI lead score prediction
 */
export async function predictLeadScore(
  request: ScorePredictionRequest
): Promise<ApiResponse<ScorePredictionResponse>> {
  const response = await apiClient.post("/leads/score", request);
  return response.data;
}

/**
 * Batch score multiple leads
 */
export async function batchScoreLeads(
  leadIds: string[]
): Promise<ApiResponse<ScorePredictionResponse[]>> {
  const response = await apiClient.post("/leads/score/batch", { leadIds });
  return response.data;
}

// ============================================================
// Dashboard API Methods
// ============================================================

/**
 * Fetch dashboard statistics
 */
export async function getDashboardStats(): Promise<
  ApiResponse<DashboardStats>
> {
  const response = await apiClient.get("/dashboard/stats");
  return response.data;
}

export default apiClient;
