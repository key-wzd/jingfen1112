<template>
  <div class="power-consumption-page">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/compare">产品对比</a>
          <a href="/power-consumption" class="active">功耗对比</a>
        </nav>
      </div>
    </header>

    <!-- 主要内容 -->
    <main class="container">
      <h2 class="page-title">手机功耗对比</h2>

      <!-- 产品选择表格 -->
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
              <tr v-for="product in allProducts" :key="product.id">
                <td>
                  <input 
                    type="checkbox" 
                    :checked="selectedProductIds.includes(product.id)"
                    @change="handleProductToggle(product.id)"
                  />
                </td>
                <td>{{ product.brand }}</td>
                <td>{{ product.model }}</td>
                <td>{{ product.batteryCapacity }}</td>
                <td>{{ product.processor }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 功耗场景数据图 -->
      <section class="charts-section">
        <h3>功耗场景对比</h3>
        
        <!-- 视频播放功耗 -->
        <div class="chart-container">
          <h4>视频播放功耗 (mW)</h4>
          <div ref="videoChartRef" class="chart"></div>
        </div>

        <!-- 游戏功耗 -->
        <div class="chart-container">
          <h4>游戏功耗 (mW)</h4>
          <div ref="gameChartRef" class="chart"></div>
        </div>

        <!-- 待机功耗 -->
        <div class="chart-container">
          <h4>待机功耗 (mW)</h4>
          <div ref="standbyChartRef" class="chart"></div>
        </div>

        <!-- 浏览网页功耗 -->
        <div class="chart-container">
          <h4>浏览网页功耗 (mW)</h4>
          <div ref="browserChartRef" class="chart"></div>
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
              <li><a href="/power-consumption">功耗对比</a></li>
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
import { ref, computed, onMounted, watch } from 'vue';
import * as echarts from 'echarts';
import { useProductStore } from '#/store/product';

// 初始化产品store
const productStore = useProductStore();

// 所有产品数据
const allProducts = [
  { id: 1, brand: 'Apple', model: 'iPhone 15', batteryCapacity: '4000mAh', processor: 'A16' },
  { id: 2, brand: 'Samsung', model: 'Galaxy S24', batteryCapacity: '4000mAh', processor: 'Snapdragon 8 Gen 3' },
  { id: 3, brand: 'Xiaomi', model: '14 Pro', batteryCapacity: '4820mAh', processor: 'Snapdragon 8 Gen 3' },
  { id: 4, brand: 'Huawei', model: 'Mate 60 Pro', batteryCapacity: '5000mAh', processor: '麒麟9000S' },
  { id: 5, brand: 'OPPO', model: 'Find X7', batteryCapacity: '5000mAh', processor: 'Snapdragon 8 Gen 3' },
  { id: 6, brand: 'vivo', model: 'X100 Pro', batteryCapacity: '5400mAh', processor: '天玑9300' }
];

// 计算属性：从store获取选择的产品ID
const selectedProductIds = computed(() => {
  return productStore.selectedProductIds;
});

// 计算属性：选择的产品
const selectedProducts = computed(() => {
  return productStore.selectedProducts;
});

// 功耗数据
const powerConsumptionData = {
  video: [
    { productId: 1, value: 2500 },
    { productId: 2, value: 2800 },
    { productId: 3, value: 2600 },
    { productId: 4, value: 2700 },
    { productId: 5, value: 2650 },
    { productId: 6, value: 2550 }
  ],
  game: [
    { productId: 1, value: 4500 },
    { productId: 2, value: 4800 },
    { productId: 3, value: 4700 },
    { productId: 4, value: 4600 },
    { productId: 5, value: 4650 },
    { productId: 6, value: 4550 }
  ],
  standby: [
    { productId: 1, value: 50 },
    { productId: 2, value: 60 },
    { productId: 3, value: 55 },
    { productId: 4, value: 52 },
    { productId: 5, value: 58 },
    { productId: 6, value: 53 }
  ],
  browser: [
    { productId: 1, value: 1800 },
    { productId: 2, value: 2000 },
    { productId: 3, value: 1900 },
    { productId: 4, value: 1950 },
    { productId: 5, value: 1850 },
    { productId: 6, value: 1820 }
  ]
};

// 图表引用
const videoChartRef = ref<HTMLElement>();
const gameChartRef = ref<HTMLElement>();
const standbyChartRef = ref<HTMLElement>();
const browserChartRef = ref<HTMLElement>();

// 图表实例
let videoChart: echarts.ECharts | null = null;
let gameChart: echarts.ECharts | null = null;
let standbyChart: echarts.ECharts | null = null;
let browserChart: echarts.ECharts | null = null;

// 处理产品选择切换
const handleProductToggle = (productId: number) => {
  const index = selectedProductIds.value.indexOf(productId);
  if (index > -1) {
    // 至少保留一个产品
    if (selectedProductIds.value.length > 1) {
      productStore.removeProduct(productId);
    }
  } else {
    // 找到对应的产品信息
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      productStore.addProduct(product);
    }
  }
};

// 获取产品名称
const getProductName = (productId: number) => {
  const product = allProducts.find(p => p.id === productId);
  return product ? `${product.brand} ${product.model}` : '';
};

// 获取指定场景的功耗数据
const getSceneData = (scene: keyof typeof powerConsumptionData) => {
  return selectedProductIds.value.map(productId => {
    const data = powerConsumptionData[scene].find(item => item.productId === productId);
    return data ? data.value : 0;
  });
};

// 获取产品名称列表
const getProductNames = () => {
  return selectedProductIds.value.map(getProductName);
};

// 颜色列表
const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

// 初始化图表
const initCharts = () => {
  // 视频播放功耗图表
  if (videoChartRef.value) {
    videoChart = echarts.init(videoChartRef.value);
    updateVideoChart();
  }

  // 游戏功耗图表
  if (gameChartRef.value) {
    gameChart = echarts.init(gameChartRef.value);
    updateGameChart();
  }

  // 待机功耗图表
  if (standbyChartRef.value) {
    standbyChart = echarts.init(standbyChartRef.value);
    updateStandbyChart();
  }

  // 浏览网页功耗图表
  if (browserChartRef.value) {
    browserChart = echarts.init(browserChartRef.value);
    updateBrowserChart();
  }
};

// 更新视频播放功耗图表
const updateVideoChart = () => {
  if (!videoChart) return;

  const option = {
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
      data: getProductNames(),
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
        data: getSceneData('video'),
        itemStyle: {
          color: function(params: any) {
            return colors[params.dataIndex % colors.length];
          }
        }
      }
    ]
  };

  videoChart.setOption(option);
};

// 更新游戏功耗图表
const updateGameChart = () => {
  if (!gameChart) return;

  const option = {
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
      data: getProductNames(),
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
        data: getSceneData('game'),
        itemStyle: {
          color: function(params: any) {
            return colors[params.dataIndex % colors.length];
          }
        }
      }
    ]
  };

  gameChart.setOption(option);
};

// 更新待机功耗图表
const updateStandbyChart = () => {
  if (!standbyChart) return;

  const option = {
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
      data: getProductNames(),
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
        data: getSceneData('standby'),
        itemStyle: {
          color: function(params: any) {
            return colors[params.dataIndex % colors.length];
          }
        }
      }
    ]
  };

  standbyChart.setOption(option);
};

// 更新浏览网页功耗图表
const updateBrowserChart = () => {
  if (!browserChart) return;

  const option = {
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
      data: getProductNames(),
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
        data: getSceneData('browser'),
        itemStyle: {
          color: function(params: any) {
            return colors[params.dataIndex % colors.length];
          }
        }
      }
    ]
  };

  browserChart.setOption(option);
};

// 更新所有图表
const updateAllCharts = () => {
  updateVideoChart();
  updateGameChart();
  updateStandbyChart();
  updateBrowserChart();
};

// 监听选择变化
watch(selectedProductIds, () => {
  updateAllCharts();
}, { deep: true });

// 监听窗口大小变化
const handleResize = () => {
  videoChart?.resize();
  gameChart?.resize();
  standbyChart?.resize();
  browserChart?.resize();
};

// 组件挂载
onMounted(() => {
  initCharts();
  window.addEventListener('resize', handleResize);
});
</script>

<style scoped>
.power-consumption-page {
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

/* 产品表格区域 */
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

/* 图表区域 */
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

  .chart {
    height: 300px;
  }

  .footer-content {
    flex-direction: column;
    gap: 30px;
  }
}
</style>
