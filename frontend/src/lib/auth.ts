// ============================================================
// Auth API Helper - Communicates with backend auth endpoints
// ============================================================
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Create axios instance with credentials
const authClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  manager_id?: string;
  phone?: string;
  department?: string;
  designation?: string;
  status: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  manager?: { id: string; name: string; email: string } | null;
}

export interface AuthResponse {
  success: boolean;
  data?: { user: User; token: string; refreshToken: string };
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

// ============================================================
// Auth API Functions
// ============================================================

/**
 * Login with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await authClient.post("/auth/login", { email, password });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Login failed. Please try again.",
    };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  try {
    const response = await authClient.get("/auth/me");
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to fetch user",
    };
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    await authClient.post("/auth/logout");
    return { success: true };
  } catch {
    return { success: true }; // Always clear local state
  }
}

/**
 * Refresh token
 */
export async function refreshAuthToken(): Promise<AuthResponse> {
  try {
    const response = await authClient.post("/auth/refresh");
    return response.data;
  } catch (error: any) {
    return { success: false, error: "Token refresh failed" };
  }
}

// ============================================================
// Generic API Client (attaches auth token)
// ============================================================

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Add auth token from cookie if available (for client-side)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Token is in httpOnly cookie, no need to attach manually
  }
  return config;
});

// Handle 401 responses globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh
      try {
        const refreshResult = await refreshAuthToken();
        if (refreshResult.success) {
          return apiClient(error.config); // Retry original request
        }
      } catch {
        // Refresh failed
      }
      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default authClient;
