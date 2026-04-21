<template>
  <div class="compare-page">
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/power-consumption">旗舰手机功耗</a>
          <a href="/mid-low-phone-power">中低端手机功耗</a>
          <a href="/mouse-power">鼠标功耗</a>
          <a href="/keyboard-power">键盘功耗</a>
          <a href="/remote-control-power">遥控器功耗</a>
          <a href="/config">数据管理</a>
        </nav>
      </div>
    </header>

    <main class="container">
      <h2 class="page-title">产品对比</h2>
      
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
            
            <div class="brand-selector">
              <label>品牌</label>
              <select 
                :value="product.brand" 
                @change="handleBrandChange(index, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">选择品牌</option>
                <option v-for="brand in brands" :key="brand" :value="brand">
                  {{ brand }}
                </option>
              </select>
            </div>
            
            <div class="model-selector">
              <label>型号</label>
              <select 
                :value="product.model" 
                @change="handleModelChange(index, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">选择型号</option>
                <option v-for="model in getModelsByBrand(product.brand)" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="add-product" @click="addProduct">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <p>添加产品</p>
          </div>
        </div>
      </section>

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
              <li><a href="/power-consumption">旗舰手机功耗</a></li>
              <li><a href="/mid-low-phone-power">中低端手机功耗</a></li>
              <li><a href="/mouse-power">鼠标功耗</a></li>
              <li><a href="/keyboard-power">键盘功耗</a></li>
              <li><a href="/remote-control-power">遥控器功耗</a></li>
              <li><a href="/config">数据管理</a></li>
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
import { ref, computed, onMounted } from 'vue';
import { dbApi, type Phone } from '#/api/db';

const brands = ref<string[]>([]);
const phoneData = ref<Map<string, Phone>>(new Map());
const brandModels = ref<Map<string, string[]>>(new Map());

const products = ref([
  { brand: '', model: '' },
  { brand: '', model: '' },
]);

const loadData = async () => {
  const [brandsResult, phonesResult] = await Promise.all([
    dbApi.getBrands(),
    dbApi.getPhones(),
  ]);

  if (brandsResult.success && brandsResult.data) {
    brands.value = brandsResult.data;
  }

  if (phonesResult.success && phonesResult.data) {
    const modelMap = new Map<string, string[]>();
    
    phonesResult.data.forEach((phone: Phone) => {
      const key = `${phone.brand} ${phone.model}`;
      phoneData.value.set(key, phone);
      
      if (!modelMap.has(phone.brand)) {
        modelMap.set(phone.brand, []);
      }
      modelMap.get(phone.brand)!.push(phone.model);
    });
    
    brandModels.value = modelMap;
  }
};

const hasSelectedProducts = computed(() => {
  const selectedProducts = products.value.filter(product => product && product.brand && product.model);
  return selectedProducts.length >= 2;
});

const getModelsByBrand = (brand: string) => {
  if (!brand) return [];
  return brandModels.value.get(brand) || [];
};

const getProductSpecs = (brand: string, model: string) => {
  if (!brand || !model) {
    return {
      screen: '-', processor: '-', ram: '-', storage: '-',
      camera: '-', battery: '-', price: '-'
    };
  }
  const key = `${brand} ${model}`;
  const phone = phoneData.value.get(key);
  if (phone) {
    return {
      screen: phone.screen || '-',
      processor: phone.processor || '-',
      ram: phone.ram || '-',
      storage: phone.storage || '-',
      camera: phone.camera || '-',
      battery: phone.battery || '-',
      price: phone.price || '-'
    };
  }
  return {
    screen: '-', processor: '-', ram: '-', storage: '-',
    camera: '-', battery: '-', price: '-'
  };
};

const addProduct = () => {
  if (products.value.length < 4) {
    products.value.push({ brand: '', model: '' });
  }
};

const handleBrandChange = (index: number, brand: string) => {
  products.value[index] = {
    ...products.value[index],
    brand,
    model: ''
  };
};

const handleModelChange = (index: number, model: string) => {
  products.value[index] = {
    ...products.value[index],
    model
  };
};

const removeProduct = (index: number) => {
  if (products.value.length > 2) {
    products.value.splice(index, 1);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.compare-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

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
  gap: 20px;
  flex-wrap: wrap;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.3s;
  white-space: nowrap;
}

.nav-links a:hover,
.nav-links a.active {
  color: #007bff;
}

.page-title {
  font-size: 2rem;
  margin: 40px 0 30px;
  color: #333;
}

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
  color: #000;
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
  color: #000;
  font-size: 0.9rem;
}

.spec-value {
  color: #000;
  font-weight: 500;
}

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
