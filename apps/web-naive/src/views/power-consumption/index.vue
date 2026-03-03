<template>
  <div class="power-consumption-page">
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/compare">产品对比</a>
          <a href="/power-consumption" class="active">功耗对比</a>
          <a href="/config">数据管理</a>
        </nav>
      </div>
    </header>

    <main class="container">
      <h2 class="page-title">手机功耗对比</h2>

      <section class="product-table-section">
        <h3>选择对比产品</h3>
        <div class="product-table">
          <table>
            <thead>
              <tr>
                <th>选择</th>
                <th>品牌</th>
                <th>型号</th>
                <th>电池容量</th>
                <th>处理器</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="loading-cell">加载中...</td>
              </tr>
              <tr v-else-if="allProducts.length === 0">
                <td colspan="5" class="empty-cell">暂无数据，请先在数据管理页面添加手机数据</td>
              </tr>
              <tr v-else v-for="product in allProducts" :key="product.id">
                <td>
                  <input 
                    type="checkbox" 
                    :checked="selectedProductIds.includes(product.id)"
                    @change="handleProductToggle(product)"
                  />
                </td>
                <td>{{ product.brand }}</td>
                <td>{{ product.model }}</td>
                <td>{{ product.battery_capacity ? product.battery_capacity + 'mAh' : '-' }}</td>
                <td>{{ product.processor || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="charts-section" v-if="selectedProducts.length > 0">
        <h3>功耗场景对比</h3>
        
        <div class="chart-container">
          <h4>视频播放功耗 (mW)</h4>
          <div ref="videoChartRef" class="chart"></div>
        </div>

        <div class="chart-container">
          <h4>游戏功耗 (mW)</h4>
          <div ref="gameChartRef" class="chart"></div>
        </div>

        <div class="chart-container">
          <h4>待机功耗 (mW)</h4>
          <div ref="standbyChartRef" class="chart"></div>
        </div>

        <div class="chart-container">
          <h4>浏览网页功耗 (mW)</h4>
          <div ref="browserChartRef" class="chart"></div>
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
          <p>勾选上方的产品进行功耗对比</p>
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
              <li><a href="/compare">产品对比</a></li>
              <li><a href="/power-consumption">功耗对比</a></li>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { dbApi, type Phone } from '#/api/db';

const loading = ref(false);
const allProducts = ref<Phone[]>([]);
const selectedProductIds = ref<number[]>([]);

const videoChartRef = ref<HTMLElement>();
const gameChartRef = ref<HTMLElement>();
const standbyChartRef = ref<HTMLElement>();
const browserChartRef = ref<HTMLElement>();

let videoChart: echarts.ECharts | null = null;
let gameChart: echarts.ECharts | null = null;
let standbyChart: echarts.ECharts | null = null;
let browserChart: echarts.ECharts | null = null;

const selectedProducts = computed(() => {
  return allProducts.value.filter(p => selectedProductIds.value.includes(p.id));
});

const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

const loadPhones = async () => {
  loading.value = true;
  const result = await dbApi.getPhones();
  if (result.success && result.data) {
    allProducts.value = result.data;
    if (result.data.length >= 2) {
      selectedProductIds.value = [result.data[0].id, result.data[1].id];
    }
  }
  loading.value = false;
};

const handleProductToggle = (product: Phone) => {
  const index = selectedProductIds.value.indexOf(product.id);
  if (index > -1) {
    if (selectedProductIds.value.length > 1) {
      selectedProductIds.value = selectedProductIds.value.filter(id => id !== product.id);
    }
  } else {
    selectedProductIds.value = [...selectedProductIds.value, product.id];
  }
};

const initCharts = async () => {
  await nextTick();
  
  if (videoChartRef.value) {
    videoChart = echarts.init(videoChartRef.value);
  }
  if (gameChartRef.value) {
    gameChart = echarts.init(gameChartRef.value);
  }
  if (standbyChartRef.value) {
    standbyChart = echarts.init(standbyChartRef.value);
  }
  if (browserChartRef.value) {
    browserChart = echarts.init(browserChartRef.value);
  }
  
  updateAllCharts();
};

const createChartOption = (title: string, dataKey: keyof Phone) => {
  const productNames = selectedProducts.value.map(p => `${p.brand} ${p.model}`);
  const data = selectedProducts.value.map(p => (p as any)[dataKey] || 0);
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['功耗']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: productNames,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '功耗 (mW)'
    },
    series: [
      {
        name: '功耗',
        type: 'bar',
        data: data,
        itemStyle: {
          color: (params: any) => colors[params.dataIndex % colors.length]
        }
      }
    ]
  };
};

const updateAllCharts = () => {
  if (selectedProducts.value.length === 0) return;
  
  videoChart?.setOption(createChartOption('视频播放功耗', 'video_power'));
  gameChart?.setOption(createChartOption('游戏功耗', 'game_power'));
  standbyChart?.setOption(createChartOption('待机功耗', 'standby_power'));
  browserChart?.setOption(createChartOption('浏览网页功耗', 'browser_power'));
};

const handleResize = () => {
  videoChart?.resize();
  gameChart?.resize();
  standbyChart?.resize();
  browserChart?.resize();
};

watch(selectedProductIds, () => {
  updateAllCharts();
}, { deep: true });

onMounted(async () => {
  await loadPhones();
  await initCharts();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  videoChart?.dispose();
  gameChart?.dispose();
  standbyChart?.dispose();
  browserChart?.dispose();
});
</script>

<style scoped>
.power-consumption-page {
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

.page-title {
  font-size: 2rem;
  margin: 40px 0 30px;
  color: #333;
}

.product-table-section {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.product-table-section h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
}

.product-table {
  overflow-x: auto;
}

.product-table table {
  width: 100%;
  border-collapse: collapse;
}

.product-table th,
.product-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
  color: #000;
}

.product-table th {
  background-color: #f9f9f9;
  font-weight: 600;
  color: #000;
}

.product-table tr:hover {
  background-color: #f5f5f5;
}

.loading-cell, .empty-cell {
  text-align: center;
  color: #999;
  padding: 40px;
}

.charts-section {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.charts-section h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
}

.chart-container {
  margin-bottom: 40px;
}

.chart-container h4 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #555;
}

.chart {
  width: 100%;
  height: 400px;
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

  .chart {
    height: 300px;
  }

  .footer-content {
    flex-direction: column;
    gap: 30px;
  }
}
</style>
