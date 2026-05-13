const DB_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

export interface PhoneInfo {
  id: number;
  brand: string;
  model: string;
  image: string;
  screen: string;
  processor: string;
  ram: string;
  storage: string;
  camera: string;
  battery: string;
  price: string;
  battery_capacity: string;
  created_at: string;
  updated_at: string;
}

export interface PhonePower {
  id: number;
  brand: string;
  model: string;
  video_power: number;
  game_power: number;
  standby_power: number;
  browser_power: number;
  created_at: string;
  updated_at: string;
}

export interface PeripheralInfo {
  id: number;
  brand: string;
  model: string;
  image: string;
  battery_capacity: string;
  created_at: string;
  updated_at: string;
}

export interface PeripheralPower {
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
  chartType: 'bar' | 'barH' | 'line' | 'pie' | 'radar';
  unit?: string;
  fields: string[];
  labels: string[];
}

export interface DisplayColumn {
  key: string;
  label: string;
  suffix?: string;
  type?: string;
}

export interface CategoryInfoConfig {
  table: string;
  fields: string[];
  cnFields: string[];
  displayColumns: DisplayColumn[];
}

export interface CategoryPowerConfig {
  table: string;
  fields: string[];
  cnFields: string[];
  chartConfig: ChartConfigItem[];
  displayColumns: DisplayColumn[];
}

export interface CategoryInfo {
  key: string;
  name: string;
  info: CategoryInfoConfig;
  power: CategoryPowerConfig;
}

export interface CategoryInfoData {
  table: string;
  displayColumns: DisplayColumn[];
  data: any[];
}

export interface CategoryPowerData {
  table: string;
  displayColumns: DisplayColumn[];
  chartConfig: ChartConfigItem[];
  data: any[];
}

export interface CategoryData {
  name: string;
  info: CategoryInfoData;
  power: CategoryPowerData;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  successCount?: number;
  failCount?: number;
  totalSuccess?: number;
  totalFail?: number;
}

export interface AllDataResponse {
  [key: string]: CategoryData;
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

export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${DB_SERVER_URL}${imagePath}`;
}

export const dbApi = {
  async getCategories(): Promise<ApiResponse<CategoryInfo[]>> {
    return request<CategoryInfo[]>('/api/categories');
  },

  async getCategoryChartConfig(category: string): Promise<ApiResponse<ChartConfigItem[]>> {
    return request<ChartConfigItem[]>(`/api/categories/${category}/chart-config`);
  },

  async getInfoList(category: string): Promise<ApiResponse<any[]>> {
    return request<any[]>(`/api/${category}/info`);
  },

  async getPowerList(category: string): Promise<ApiResponse<any[]>> {
    return request<any[]>(`/api/${category}/power`);
  },

  async getList(category: string): Promise<ApiResponse<any[]>> {
    return request<any[]>(`/api/${category}`);
  },

  async getAllData(): Promise<ApiResponse<AllDataResponse>> {
    return request<AllDataResponse>('/api/all-data');
  },

  async importAllSheets(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${DB_SERVER_URL}/api/import-all`, {
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

  async downloadAllTemplate(): Promise<void> {
    window.open(`${DB_SERVER_URL}/api/template/download-all`, '_blank');
  },

  async getBrands(): Promise<ApiResponse<string[]>> {
    return request<string[]>('/api/brands');
  },

  async getModels(brand: string): Promise<ApiResponse<string[]>> {
    return request<string[]>(`/api/models/${encodeURIComponent(brand)}`);
  },

  async uploadImage(category: string, id: number, file: File): Promise<ApiResponse<{ image: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${DB_SERVER_URL}/api/${category}/info/${id}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('上传图片失败:', error);
      return { success: false, message: '上传图片失败' };
    }
  },

  async updateInfo(category: string, id: number, updates: Record<string, any>): Promise<ApiResponse> {
    return request(`/api/${category}/info/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteInfo(category: string, id: number): Promise<ApiResponse> {
    return request(`/api/${category}/info/${id}`, {
      method: 'DELETE',
    });
  },

  async updatePower(category: string, id: number, updates: Record<string, any>): Promise<ApiResponse> {
    return request(`/api/${category}/power/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deletePower(category: string, id: number): Promise<ApiResponse> {
    return request(`/api/${category}/power/${id}`, {
      method: 'DELETE',
    });
  },
};
