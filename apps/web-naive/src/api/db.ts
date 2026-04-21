const DB_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

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

export interface Peripheral {
  id: number;
  brand: string;
  model: string;
  sleep_power: number;
  dormancy_power: number;
  usage_power: number;
  created_at: string;
  updated_at: string;
}

export interface ChartConfigItem {
  scenario: string;
  chartType: 'bar' | 'line';
  fields: string[];
  labels: string[];
}

export interface DisplayColumn {
  key: string;
  label: string;
  suffix?: string;
}

export interface CategoryInfo {
  key: string;
  name: string;
  table: string;
  chartConfig: ChartConfigItem[];
  displayColumns: DisplayColumn[];
  fields: string[];
  cnFields: string[];
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
  async getCategories(): Promise<ApiResponse<CategoryInfo[]>> {
    return request<CategoryInfo[]>('/api/categories');
  },

  async getCategoryChartConfig(category: string): Promise<ApiResponse<ChartConfigItem[]>> {
    return request<ChartConfigItem[]>(`/api/categories/${category}/chart-config`);
  },

  async getList(category: string): Promise<ApiResponse<any[]>> {
    return request<any[]>(`/api/${category}`);
  },

  async getItem(category: string, id: number): Promise<ApiResponse<any>> {
    return request<any>(`/api/${category}/${id}`);
  },

  async addItem(category: string, item: Record<string, any>): Promise<ApiResponse> {
    return request(`/api/${category}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateItem(category: string, id: number, item: Record<string, any>): Promise<ApiResponse> {
    return request(`/api/${category}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  async deleteItem(category: string, id: number): Promise<ApiResponse> {
    return request(`/api/${category}/${id}`, {
      method: 'DELETE',
    });
  },

  async importExcel(category: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${DB_SERVER_URL}/api/${category}/import`, {
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

  async downloadTemplate(category: string = 'phones'): Promise<void> {
    window.open(`${DB_SERVER_URL}/api/template/download?category=${category}`, '_blank');
  },

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

  async importPhoneExcel(file: File): Promise<ApiResponse> {
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

  async getBrands(): Promise<ApiResponse<string[]>> {
    return request<string[]>('/api/brands');
  },

  async getModels(brand: string): Promise<ApiResponse<string[]>> {
    return request<string[]>(`/api/models/${encodeURIComponent(brand)}`);
  },
};
