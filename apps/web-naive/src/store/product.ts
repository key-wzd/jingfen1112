import { defineStore } from 'pinia';

// 产品类型定义
export interface Product {
  id: number;
  brand: string;
  model: string;
}

// 定义产品store
export const useProductStore = defineStore('product', {
  state: () => ({
    // 选择的产品列表
    selectedProducts: [] as Product[],
  }),

  getters: {
    // 获取选择的产品数量
    selectedCount: (state) => state.selectedProducts.length,

    // 获取选择的产品ID列表
    selectedProductIds: (state) => state.selectedProducts.map(product => product.id),
  },

  actions: {
    // 设置选择的产品
    setSelectedProducts(products: Product[]) {
      this.selectedProducts = products;
    },

    // 添加产品
    addProduct(product: Product) {
      if (!this.selectedProducts.find(p => p.id === product.id)) {
        this.selectedProducts.push(product);
      }
    },

    // 移除产品
    removeProduct(productId: number) {
      this.selectedProducts = this.selectedProducts.filter(p => p.id !== productId);
    },

    // 清空选择的产品
    clearSelectedProducts() {
      this.selectedProducts = [];
    },

    // 从品牌和型号获取产品ID
    getProductId(brand: string, model: string) {
      // 简单的ID生成逻辑，实际项目中可能需要从后端获取
      const productMap: Record<string, number> = {
        'Apple iPhone 15': 1,
        'Apple iPhone 15 Pro': 7,
        'Apple iPhone 15 Pro Max': 8,
        'Apple iPhone 14': 9,
        'Samsung Galaxy S24': 2,
        'Samsung Galaxy S24 Ultra': 10,
        'Samsung Galaxy Z Fold 5': 11,
        'Samsung Galaxy A54': 12,
        'Xiaomi 14 Pro': 3,
        'Xiaomi 14 Ultra': 13,
        'Xiaomi Redmi Note 13 Pro': 14,
        'Xiaomi 13': 15,
        'Huawei Mate 60 Pro': 4,
        'Huawei Pura 70 Pro': 16,
        'Huawei Nova 12': 17,
        'Huawei Mate X5': 18,
        'OPPO Find X7': 5,
        'OPPO Reno 10 Pro+': 19,
        'OPPO A98': 20,
        'OPPO Find N3 Flip': 21,
        'vivo X100 Pro': 6,
        'vivo iQOO 12': 22,
        'vivo Y36': 23,
        'vivo X90 Pro+': 24,
      };

      const key = `${brand} ${model}`;
      return productMap[key] || 0;
    },
  },
});
