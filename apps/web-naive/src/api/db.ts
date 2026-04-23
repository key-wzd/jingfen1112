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

export interface CategoryData {
  name: string;
  table: string;
  displayColumns: DisplayColumn[];
  data: any[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  successCount?: number;
  failCount?: number;
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
};
