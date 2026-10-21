const DB_SERVER_URL = (import.meta.env.VITE_DB_API_URL || '').replace(
  /\/$/,
  '',
);

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
  order: number;
  fields: string[];
  labels: string[];
  conclusion?: string;
  renderType?: string;
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

export interface HeaderCell {
  label: string;
  value: string;
  fieldKey: string;
}
export interface OverviewData {
  categories: {
    key: string;
    name: string;
    infoCount: number;
    powerCount: number;
  }[];
  infoCount: number;
  powerCount: number;
}
export interface SessionData {
  token: string;
  accountId: string;
  username: string;
  role: 'admin' | 'user';
}
export interface ImportPreview {
  token: string;
  sheets: { name: string; rows: number; category: string; type: string }[];
  message: string;
}

export interface ApiResponse<T = any> {
  status?: number;
  datasetVersion?: string;
  headerRows?: HeaderCell[][];
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

export interface PlanDefinition {
  schemaVersion: 1;
  datasetVersion: string;
  selectedRecords: { id: number; brand: string; model: string }[];
  baselineId: number | null;
  hiddenByRow: Record<string, number[]>;
}
export interface AnalysisPlan {
  id: string;
  name: string;
  category: string;
  ownerAccount: string;
  ownerName: string;
  visibility: 'private' | 'shared';
  definition: PlanDefinition;
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
}
export interface PlanList {
  plans: AnalysisPlan[];
  viewer: { accountId: string; displayName: string; role: 'admin' | 'user' };
}
export interface SavePlanInput {
  name: string;
  category: string;
  datasetVersion: string;
  selectedIds: number[];
  baselineId: number | null;
  hiddenByRow: Record<string, number[]>;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    const token = localStorage.getItem('tc_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${DB_SERVER_URL}${url}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null);
    if (
      response.status === 401 &&
      url !== '/api/auth/login' &&
      token === localStorage.getItem('tc_token')
    ) {
      localStorage.removeItem('tc_token');
      localStorage.removeItem('tc_account_id');
      window.dispatchEvent(new Event('tc-session-expired'));
    }
    if (!response.ok)
      return {
        success: false,
        status: response.status,
        message: data?.message || `请求失败（${response.status}）`,
      };
    if (!data || typeof data.success !== 'boolean')
      return {
        success: false,
        message: '服务返回格式不正确，请检查接口地址。',
      };
    return data;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof DOMException && error.name === 'TimeoutError'
          ? '请求超时，请稍后重试。'
          : '无法连接数据服务，请检查服务状态后重试。',
    };
  }
}

export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${DB_SERVER_URL}${imagePath}`;
}

export const dbApi = {
  getAnalysisPlans(category: string): Promise<ApiResponse<PlanList>> {
    return request(
      `/api/analysis-plans?category=${encodeURIComponent(category)}`,
    );
  },
  getAnalysisPlan(id: string): Promise<ApiResponse<AnalysisPlan>> {
    return request(`/api/analysis-plans/${encodeURIComponent(id)}`);
  },
  saveAnalysisPlan(plan: SavePlanInput): Promise<ApiResponse<AnalysisPlan>> {
    return request('/api/analysis-plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },
  deleteAnalysisPlan(id: string): Promise<ApiResponse> {
    return request(`/api/analysis-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  login(username: string, password: string): Promise<ApiResponse<SessionData>> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  logout(): Promise<ApiResponse> {
    return request('/api/auth/logout', { method: 'POST' });
  },
  getOverview(): Promise<ApiResponse<OverviewData>> {
    return request('/api/overview');
  },
  previewImport(file: File): Promise<ApiResponse<ImportPreview>> {
    const body = new FormData();
    body.append('file', file);
    return request('/api/import-preview', { method: 'POST', body });
  },
  async getCategories(): Promise<ApiResponse<CategoryInfo[]>> {
    return request<CategoryInfo[]>('/api/categories');
  },

  async getCategoryChartConfig(
    category: string,
  ): Promise<ApiResponse<ChartConfigItem[]>> {
    return request<ChartConfigItem[]>(
      `/api/categories/${category}/chart-config`,
    );
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

  async importAllSheets(
    file: File,
    previewToken: string,
  ): Promise<ApiResponse> {
    const body = new FormData();
    body.append('file', file);
    body.append('previewToken', previewToken);
    return request('/api/import-all', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(120000),
    });
  },

  async downloadAllTemplate(): Promise<void> {
    const response = await fetch(`${DB_SERVER_URL}/api/template/download-all`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('tc_token') || ''}`,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error('模板下载失败，请检查登录状态和服务连接。');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = '功耗测试数据模板.xlsx';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async getBrands(): Promise<ApiResponse<string[]>> {
    return request<string[]>('/api/brands');
  },

  async getModels(brand: string): Promise<ApiResponse<string[]>> {
    return request<string[]>(`/api/models/${encodeURIComponent(brand)}`);
  },

  async uploadImage(
    category: string,
    id: number,
    file: File,
  ): Promise<ApiResponse<{ image: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    return request(`/api/${category}/info/${id}/image`, {
      method: 'POST',
      body: formData,
    });
  },

  async updateInfo(
    category: string,
    id: number,
    updates: Record<string, any>,
  ): Promise<ApiResponse> {
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

  async updatePower(
    category: string,
    id: number,
    updates: Record<string, any>,
  ): Promise<ApiResponse> {
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
