<template>
  <div class="compare-page">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/compare" class="active">产品对比</a>
        </nav>
      </div>
    </header>

    <!-- 主要内容 -->
    <main class="container">
      <h2 class="page-title">产品对比</h2>
      
      <!-- 产品选择区域 -->
      <section class="product-selection">
        <h3>选择产品</h3>
        <div class="selection-grid">
          <div 
            v-for="(product, index) in products" 
            :key="index" 
            class="product-selector"
          >
            <div class="selector-header">
              <label>产品 {{ index + 1 }}</label>
              <button 
                v-if="products.length > 2" 
                class="remove-btn"
                @click="removeProduct(index)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <!-- 品牌选择 -->
            <div class="brand-selector">
              <label>品牌</label>
              <select 
                :value="product.brand" 
                @change="handleBrandChange(index, $event.target.value)"
              >
                <option value="">选择品牌</option>
                <option v-for="brand in brands" :key="brand" :value="brand">
                  {{ brand }}
                </option>
              </select>
            </div>
            
            <!-- 产品选择 -->
            <div class="model-selector">
              <label>型号</label>
              <select 
                :value="product.model" 
                @change="handleModelChange(index, $event.target.value)"
              >
                <option value="">选择型号</option>
                <option v-for="model in getModelsByBrand(product.brand)" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>
          </div>
          
          <!-- 添加产品按钮 -->
          <div class="add-product" @click="addProduct">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <p>添加产品</p>
          </div>
        </div>
      </section>

      <!-- 产品对比区域 -->
      <section class="product-comparison" v-if="hasSelectedProducts">
        <h3>产品对比</h3>
        <div class="comparison-grid">
          <div 
            v-for="(product, index) in products" 
            :key="index" 
            class="product-card"
            v-if="product && product.brand && product.model"
          >
            <div class="product-header">
              <h4>{{ product.brand }} {{ product.model }}</h4>
            </div>
            <div class="product-image">
              <div class="placeholder-image">
                <div class="image-placeholder"></div>
                <p>{{ product.brand }}</p>
              </div>
            </div>
            <div class="product-specs">
              <div class="spec-item">
                <span class="spec-label">屏幕</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).screen }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">处理器</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).processor }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">内存</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).ram }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">存储</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).storage }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">摄像头</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).camera }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">电池</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).battery }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">价格</span>
                <span class="spec-value">{{ getProductSpecs(product.brand, product.model).price }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 未选择产品提示 -->
      <section class="no-products" v-else>
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <h3>请选择要对比的产品</h3>
          <p>至少选择两款产品进行对比</p>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-info">
            <h3>TechCompare</h3>
            <p>专业的数码产品对比平台</p>
          </div>
          <div class="footer-links">
            <h4>快速链接</h4>
            <ul>
              <li><a href="/">首页</a></li>
              <li><a href="/compare">产品对比</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; {{ new Date().getFullYear() }} TechCompare. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 品牌列表
const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OPPO', 'vivo'];

// 品牌对应的产品型号
const brandModels = {
  Apple: ['iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 14'],
  Samsung: ['Galaxy S24', 'Galaxy S24 Ultra', 'Galaxy Z Fold 5', 'Galaxy A54'],
  Xiaomi: ['14 Pro', '14 Ultra', 'Redmi Note 13 Pro', 'Xiaomi 13'],
  Huawei: ['Mate 60 Pro', 'Pura 70 Pro', 'Nova 12', 'Mate X5'],
  OPPO: ['Find X7', 'Reno 10 Pro+', 'A98', 'Find N3 Flip'],
  vivo: ['X100 Pro', 'iQOO 12', 'Y36', 'X90 Pro+']
};

// 产品规格数据
const productData = {
  'Apple iPhone 15': {
    specs: {
      screen: '6.1英寸 OLED',
      processor: 'A16 仿生芯片',
      ram: '6GB',
      storage: '128GB',
      camera: '4800万像素主摄',
      battery: '4000mAh',
      price: '¥5999起'
    }
  },
  'Apple iPhone 15 Pro': {
    specs: {
      screen: '6.1英寸 ProMotion OLED',
      processor: 'A17 Pro 芯片',
      ram: '8GB',
      storage: '256GB',
      camera: '4800万像素主摄 + 1200万像素超广角 + 1200万像素长焦',
      battery: '4000mAh',
      price: '¥7999起'
    }
  },
  'Samsung Galaxy S24': {
    specs: {
      screen: '6.2英寸 Dynamic AMOLED 2X',
      processor: 'Snapdragon 8 Gen 3',
      ram: '8GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 1200万像素超广角 + 1000万像素长焦',
      battery: '4000mAh',
      price: '¥5999起'
    }
  },
  'Samsung Galaxy S24 Ultra': {
    specs: {
      screen: '6.8英寸 Dynamic AMOLED 2X',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '512GB',
      camera: '20000万像素主摄 + 5000万像素超广角 + 5000万像素长焦 + 5000万像素长焦',
      battery: '5000mAh',
      price: '¥9999起'
    }
  },
  'Xiaomi 14 Pro': {
    specs: {
      screen: '6.73英寸 2K AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素徕卡主摄 + 5000万像素超广角 + 5000万像素长焦',
      battery: '4820mAh',
      price: '¥4999起'
    }
  },
  'Xiaomi 14 Ultra': {
    specs: {
      screen: '6.73英寸 2K AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      ram: '16GB',
      storage: '512GB',
      camera: '5000万像素徕卡主摄 + 5000万像素超广角 + 5000万像素长焦 + 5000万像素潜望长焦',
      battery: '5500mAh',
      price: '¥6499起'
    }
  },
  'Huawei Mate 60 Pro': {
    specs: {
      screen: '6.8英寸 OLED',
      processor: '麒麟9000S',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 1300万像素超广角 + 4800万像素长焦',
      battery: '5000mAh',
      price: '¥6999起'
    }
  },
  'Huawei Pura 70 Pro': {
    specs: {
      screen: '6.67英寸 OLED',
      processor: '麒麟9000S',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 1300万像素超广角 + 4000万像素长焦',
      battery: '4800mAh',
      price: '¥5999起'
    }
  },
  'OPPO Find X7': {
    specs: {
      screen: '6.74英寸 AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 5000万像素超广角 + 5000万像素长焦',
      battery: '5000mAh',
      price: '¥4999起'
    }
  },
  'OPPO Reno 10 Pro+': {
    specs: {
      screen: '6.7英寸 AMOLED',
      processor: 'Snapdragon 8+ Gen 1',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 800万像素超广角 + 6400万像素长焦',
      battery: '4700mAh',
      price: '¥3999起'
    }
  },
  'vivo X100 Pro': {
    specs: {
      screen: '6.78英寸 AMOLED',
      processor: '天玑9300',
      ram: '12GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 5000万像素超广角 + 6400万像素长焦',
      battery: '5400mAh',
      price: '¥4999起'
    }
  },
  'vivo iQOO 12': {
    specs: {
      screen: '6.78英寸 AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      ram: '16GB',
      storage: '256GB',
      camera: '5000万像素主摄 + 5000万像素超广角 + 6400万像素长焦',
      battery: '5000mAh',
      price: '¥3999起'
    }
  }
};

// 产品列表
const products = ref([
  { brand: 'Apple', model: 'iPhone 15' },
  { brand: 'Samsung', model: 'Galaxy S24' },
  { brand: '', model: '' }
]);

// 计算属性：是否有选择的产品（至少两个）
const hasSelectedProducts = computed(() => {
  const selectedProducts = products.value.filter(product => product && product.brand && product.model);
  return selectedProducts.length >= 2;
});

// 根据品牌获取产品型号
const getModelsByBrand = (brand: string) => {
  if (!brand) return [];
  return brandModels[brand as keyof typeof brandModels] || [];
};

// 获取产品规格
const getProductSpecs = (brand: string, model: string) => {
  if (!brand || !model) {
    return {
      screen: '-',
      processor: '-',
      ram: '-',
      storage: '-',
      camera: '-',
      battery: '-',
      price: '-'
    };
  }
  const key = `${brand} ${model}`;
  return productData[key as keyof typeof productData]?.specs || {
    screen: '-',
    processor: '-',
    ram: '-',
    storage: '-',
    camera: '-',
    battery: '-',
    price: '-'
  };
};

// 添加产品
const addProduct = () => {
  if (products.value.length < 4) { // 最多4个产品对比
    products.value.push({ brand: '', model: '' });
  }
};

// 处理品牌选择变化
const handleBrandChange = (index: number, brand: string) => {
  // 使用展开运算符确保响应式更新
  products.value[index] = {
    ...products.value[index],
    brand,
    model: '' // 重置型号
  };
};

// 处理型号选择变化
const handleModelChange = (index: number, model: string) => {
  // 使用展开运算符确保响应式更新
  products.value[index] = {
    ...products.value[index],
    model
  };
};

// 移除产品
const removeProduct = (index: number) => {
  if (products.value.length > 2) { // 至少保留2个产品
    products.value.splice(index, 1);
  }
};
</script>

<style scoped>
.compare-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 导航栏 */
.navbar {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80px;
}

.logo h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover,
.nav-links a.active {
  color: #007bff;
}

/* 页面标题 */
.page-title {
  font-size: 2rem;
  margin: 40px 0 30px;
  color: #333;
}

/* 产品选择区域 */
.product-selection {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.product-selection h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
}

.selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.product-selector {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  position: relative;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.selector-header label {
  font-weight: 500;
  color: #333;
}

.remove-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.remove-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

.brand-selector,
.model-selector {
  margin-bottom: 15px;
}

.brand-selector label,
.model-selector label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #666;
}

.brand-selector select,
.model-selector select {
  width: 100%;
  padding: 10px 15px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.brand-selector select:hover,
.model-selector select:hover {
  border-color: #007bff;
}

/* 添加产品按钮 */
.add-product {
  background-color: #f0f0f0;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.add-product:hover {
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.05);
}

.add-product svg {
  font-size: 2rem;
  color: #999;
  margin-bottom: 10px;
}

.add-product p {
  color: #666;
  margin: 0;
}

/* 产品对比区域 */
.product-comparison {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.product-comparison h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-header {
  background-color: #007bff;
  color: white;
  padding: 15px;
  text-align: center;
}

.product-header h4 {
  margin: 0;
  font-size: 1.1rem;
}

.product-image {
  padding: 40px 20px;
  text-align: center;
  background-color: white;
}

.placeholder-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.image-placeholder {
  width: 120px;
  height: 200px;
  background-color: #f0f0f0;
  border-radius: 8px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
}

.image-placeholder::after {
  content: '📱';
  font-size: 48px;
}

.product-specs {
  padding: 20px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-label {
  color: #666;
  font-size: 0.9rem;
}

.spec-value {
  color: #333;
  font-weight: 500;
}

/* 未选择产品提示 */
.no-products {
  background-color: white;
  border-radius: 8px;
  padding: 60px 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.empty-state svg {
  color: #6c757d;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: #333;
}

.empty-state p {
  color: #666;
  margin: 0;
}

/* 页脚 */
.footer {
  background-color: #333;
  color: white;
  padding: 40px 0;
  margin-top: 60px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.footer-info h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.footer-info p {
  color: #ccc;
}

.footer-links h4 {
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.footer-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 10px;
}

.footer-links a {
  color: #ccc;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid #444;
  padding-top: 20px;
  text-align: center;
  color: #ccc;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar .container {
    flex-direction: column;
    height: auto;
    padding: 20px 0;
  }

  .nav-links {
    margin-top: 15px;
  }

  .selection-grid {
    grid-template-columns: 1fr;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .footer-content {
    flex-direction: column;
    gap: 30px;
  }
}
</style>
