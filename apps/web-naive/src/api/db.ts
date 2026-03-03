const DB_SERVER_URL = 'http://localhost:3001';

export interface Phone {
  id: number;
  brand: string;
  model: string;
  screen: string;
  processor: string;
  ram: string;
  storage: string;
  camera: string;
  battery: string;
  price: string;
  battery_capacity: string;
  video_power: number;
  game_power: number;
  standby_power: number;
  browser_power: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  successCount?: number;
  failCount?: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${DB_SERVER_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('请求失败:', error);
    return { success: false, message: '网络请求失败，请确保数据库服务已启动' };
  }
}

export const dbApi = {
  async getPhones(): Promise<ApiResponse<Phone[]>> {
    return request<Phone[]>('/api/phones');
  },

  async getPhone(id: number): Promise<ApiResponse<Phone>> {
    return request<Phone>(`/api/phones/${id}`);
  },

  async addPhone(phone: Partial<Phone>): Promise<ApiResponse> {
    return request('/api/phones', {
      method: 'POST',
      body: JSON.stringify(phone),
    });
  },

  async updatePhone(id: number, phone: Partial<Phone>): Promise<ApiResponse> {
    return request(`/api/phones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(phone),
    });
  },

  async deletePhone(id: number): Promise<ApiResponse> {
    return request(`/api/phones/${id}`, {
      method: 'DELETE',
    });
  },

  async importExcel(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${DB_SERVER_URL}/api/phones/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('导入失败:', error);
      return { success: false, message: '导入失败，请确保数据库服务已启动' };
    }
  },

  async downloadTemplate(): Promise<void> {
    window.open(`${DB_SERVER_URL}/api/template/download`, '_blank');
  },

  async getBrands(): Promise<ApiResponse<string[]>> {
    return request<string[]>('/api/brands');
  },

  async getModels(brand: string): Promise<ApiResponse<string[]>> {
    return request<string[]>(`/api/models/${encodeURIComponent(brand)}`);
  },
};
