const API_BASE_URL = "http://localhost:5000/api";

export function clearAuthStorage(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");
}

/**
 * API Fetch Wrapper - อัตโนมัติเพิ่ม Authorization header
 * @param endpoint - เส้น API ไม่รวม base URL (เช่น /organization/departments)
 * @param options - Fetch options (method, body, headers เพิ่มเติม)
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 🚨 อัปเดตส่วนนี้: เพื่อดึงข้อความ Error จาก Backend มาแสดงผล
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        // พยายามแกะ JSON ที่ Backend ส่งมา (เช่น { message: "รหัสผ่านผิด" })
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // ถ้า Backend ไม่ได้ส่ง JSON กลับมา ก็ปล่อยเป็น error status ไป
        console.error("Failed to parse error response");
      }

      const isAuthFailure =
        response.status === 401 ||
        (response.status === 403 && /token\s*(หมดอายุ|ไม่ถูกต้อง)|ยืนยันตัวตน/i.test(errorMessage));

      if (isAuthFailure) {
        // Clear only when session is truly invalid, not when user lacks permission.
        clearAuthStorage();
      }

      throw new Error(errorMessage); // โยน Error ข้อความภาษาไทยออกไป
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * GET Request
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "GET" });
}

/**
 * POST Request
 */
export function apiPost<T>(
  endpoint: string,
  data: Record<string, unknown>
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT Request
 */
export function apiPut<T>(
  endpoint: string,
  data: Record<string, unknown>
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE Request
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "DELETE" });
}

/**
 * DELETE Request with body payload
 */
export function apiDeleteWithBody<T>(
  endpoint: string,
  data: Record<string, unknown>
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}

/**
 * Logout - ลบ token จาก localStorage
 */
export function logout(): void {
  clearAuthStorage();
  window.location.href = "/login";
}