
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

/**
 * Backend URL is configured in app.json under expo.extra.backendUrl
 * It is set automatically when the backend is deployed
 */
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || "";

/**
 * Check if backend is properly configured
 */
export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

/**
 * Get bearer token from Better Auth session
 * Retrieves the access token from the Better Auth session
 *
 * @returns Bearer token or null if not found
 */
export const getBearerToken = async (): Promise<string | null> => {
  try {
    // Import authClient dynamically to avoid circular dependencies
    const { authClient } = await import("@/lib/auth");
    
    // Get the session from Better Auth
    const session = await authClient.getSession();
    
    if (session?.data?.session?.token) {
      console.log("[API] Retrieved token from Better Auth session");
      return session.data.session.token;
    }
    
    console.log("[API] No token found in Better Auth session");
    return null;
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

/**
 * Validate fixtureId parameter
 * Throws an error if fixtureId is undefined, null, or 'undefined' string
 * 
 * @param fixtureId - The fixture ID to validate
 * @param context - Context for error message (e.g., 'match-state', 'squads')
 * @throws Error if fixtureId is invalid
 */
const validateFixtureId = (fixtureId: string | undefined, context: string): void => {
  if (!fixtureId || fixtureId === 'undefined' || fixtureId === 'null') {
    const error = new Error(`[API] Invalid fixtureId for ${context}: fixtureId is ${fixtureId}. Cannot make API request.`);
    console.error(error.message);
    throw error;
  }
};

/**
 * Generic API call helper with error handling
 *
 * @param endpoint - API endpoint path (e.g., '/users', '/auth/login')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if backend is not configured or request fails
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  // Validate fixtureId in endpoint if present
  const fixtureIdMatch = endpoint.match(/\/fixtures\/([^\/]+)\//);
  if (fixtureIdMatch) {
    const fixtureId = fixtureIdMatch[1];
    const context = endpoint.split('/').pop() || 'unknown';
    validateFixtureId(fixtureId, context);
  }

  const method = options?.method || "GET";
  const url = `${BACKEND_URL}${endpoint}`;
  
  console.log(`[API] ${method} ${url}`);
  if (options?.body) {
    console.log("[API] Request body:", options.body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    console.log(`[API] ${method} ${url} → ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      console.error(`[API] ${method} ${url} failed:`, response.status, errorText);
      
      const error = new Error(`API error: ${response.status} - ${errorText}`);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      throw error;
    }

    const data = await response.json();
    console.log(`[API] ${method} ${url} success`);
    return data;
  } catch (error: any) {
    console.error(`[API] ${method} ${url} exception:`, error?.message);
    throw error;
  }
};

/**
 * GET request helper
 */
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

/**
 * POST request helper
 */
export const apiPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * PATCH request helper
 */
export const apiPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const apiDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated API call helper
 * Automatically retrieves bearer token from storage and adds to Authorization header
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if token not found or request fails
 */
export const authenticatedApiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Authenticated GET request
 */
export const authenticatedGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, { method: "GET" });
};

/**
 * Authenticated POST request
 */
export const authenticatedPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PUT request
 */
export const authenticatedPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PATCH request
 */
export const authenticatedPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated DELETE request
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const authenticatedDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated multipart file upload
 * Handles image uploads with proper authentication
 * 
 * @param endpoint - API endpoint path (e.g., '/upload/image')
 * @param file - File object with uri, name, and type
 * @param fieldName - Form field name (default: 'image')
 * @returns Upload response with url
 * @throws Error if token not found, upload fails, or session expired
 */
export const authenticatedUpload = async <T = any>(
  endpoint: string,
  file: { uri: string; name: string; type: string },
  fieldName: string = 'image'
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  const token = await getBearerToken();

  if (!token) {
    const error = new Error("Authentication token not found. Please sign in.");
    (error as any).code = 'AUTH_TOKEN_MISSING';
    throw error;
  }

  const url = `${BACKEND_URL}${endpoint}`;
  console.log("[API] Uploading file to:", url);
  console.log("[API] File:", file.name, file.type);

  try {
    const formData = new FormData();
    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: Do NOT set Content-Type for multipart/form-data
        // The browser/fetch will set it automatically with the boundary
      },
    });

    console.log("[API] Upload response status:", response.status);

    if (response.status === 401 || response.status === 403) {
      console.error("[API] Upload authentication failed:", response.status);
      const error = new Error("Session expired. Please log in again.");
      (error as any).code = 'AUTH_EXPIRED';
      (error as any).status = response.status;
      throw error;
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      console.error("[API] Upload error response:", response.status, errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[API] Upload success:", data);
    return data;
  } catch (error: any) {
    console.error("[API] Upload request failed:", error);
    console.error("[API] Error message:", error?.message);
    console.error("[API] Error code:", error?.code);
    throw error;
  }
};
