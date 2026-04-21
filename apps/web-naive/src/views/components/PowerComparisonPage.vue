<template>
  <div class="power-comparison-page">
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/power-consumption" :class="{ active: category === 'phones' }">旗舰手机功耗</a>
          <a href="/mid-low-phone-power" :class="{ active: category === 'mid_low_phones' }">中低端手机功耗</a>
          <a href="/mouse-power" :class="{ active: category === 'mice' }">鼠标功耗</a>
          <a href="/keyboard-power" :class="{ active: category === 'keyboards' }">键盘功耗</a>
          <a href="/remote-control-power" :class="{ active: category === 'remote_controls' }">遥控器功耗</a>
          <a href="/config">数据管理</a>
        </nav>
      </div>
    </header>

    <main class="container">
      <h2 class="page-title">{{ pageTitle }}</h2>

      <section class="product-table-section">
        <h3>选择对比产品</h3>
        <div class="product-table">
          <table>
            <thead>
              <tr>
                <th>选择</th>
                <th v-for="col in displayColumns" :key="col.key">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="displayColumns.length + 1" class="loading-cell">加载中...</td>
              </tr>
              <tr v-else-if="allProducts.length === 0">
                <td :colspan="displayColumns.length + 1" class="empty-cell">暂无数据，请先在数据管理页面添加{{ categoryName }}数据</td>
              </tr>
              <tr v-else v-for="product in allProducts" :key="product.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedProductIds.includes(product.id)"
                    @change="handleProductToggle(product)"
                  />
                </td>
                <td v-for="col in displayColumns" :key="col.key">
                  {{ product[col.key] ? (col.suffix ? product[col.key] + col.suffix : product[col.key]) : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="charts-section" v-if="selectedProducts.length > 0">
        <h3>功耗场景对比</h3>

        <div v-for="(chartGroup, groupIndex) in chartConfigs" :key="groupIndex" class="chart-group">
          <h4 class="chart-group-title">{{ chartGroup.scenario }}场景</h4>

          <div v-for="(field, fieldIndex) in chartGroup.fields" :key="fieldIndex" class="chart-container">
            <h4>{{ chartGroup.labels[fieldIndex] }} (mW)</h4>
            <div :ref="el => setChartRef(groupIndex, fieldIndex, el)" class="chart"></div>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { dbApi, type ChartConfigItem, type DisplayColumn } from '#/api/db';

const props = defineProps<{
  category: string;
  pageTitle: string;
  categoryName: string;
  chartConfigs: ChartConfigItem[];
  displayColumns: DisplayColumn[];
}>();

const loading = ref(false);
const allProducts = ref<any[]>([]);
const selectedProductIds = ref<number[]>([]);

const chartRefs = ref<Map<string, HTMLElement>>(new Map());
const chartInstances = ref<Map<string, echarts.ECharts>>(new Map());

const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

const selectedProducts = computed(() => {
  return allProducts.value.filter(p => selectedProductIds.value.includes(p.id));
});

const setChartRef = (groupIndex: number, fieldIndex: number, el: any) => {
  if (el) {
    chartRefs.value.set(`${groupIndex}-${fieldIndex}`, el);
  }
};

const loadProducts = async () => {
  loading.value = true;
  const result = await dbApi.getList(props.category);
  if (result.success && result.data) {
    allProducts.value = result.data;
    if (result.data.length >= 2) {
      selectedProductIds.value = [result.data[0].id, result.data[1].id];
    }
  }
  loading.value = false;
};

const handleProductToggle = (product: any) => {
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

  chartRefs.value.forEach((el, key) => {
    if (el && !chartInstances.value.has(key)) {
      chartInstances.value.set(key, echarts.init(el));
    }
  });

  updateAllCharts();
};

const createBarChartOption = (title: string, dataKey: string) => {
  const productNames = selectedProducts.value.map(p => `${p.brand} ${p.model}`);
  const data = selectedProducts.value.map(p => p[dataKey] || 0);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: { data: ['功耗'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: productNames,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: '功耗 (mW)',
    },
    series: [
      {
        name: '功耗',
        type: 'bar',
        data: data,
        itemStyle: {
          color: (params: any) => colors[params.dataIndex % colors.length],
        },
      },
    ],
  };
};

const createLineChartOption = (title: string, dataKey: string) => {
  const productNames = selectedProducts.value.map(p => `${p.brand} ${p.model}`);
  const data = selectedProducts.value.map(p => p[dataKey] || 0);

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: { data: ['功耗'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: productNames,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: '功耗 (mW)',
    },
    series: [
      {
        name: '功耗',
        type: 'line',
        data: data,
        smooth: true,
        itemStyle: {
          color: '#5470c6',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
            { offset: 1, color: 'rgba(84, 112, 198, 0.05)' },
          ]),
        },
      },
    ],
  };
};

const updateAllCharts = () => {
  if (selectedProducts.value.length === 0) return;

  props.chartConfigs.forEach((chartGroup, groupIndex) => {
    chartGroup.fields.forEach((field, fieldIndex) => {
      const key = `${groupIndex}-${fieldIndex}`;
      const chart = chartInstances.value.get(key);
      if (chart) {
        const option = chartGroup.chartType === 'bar'
          ? createBarChartOption(chartGroup.labels[fieldIndex], field)
          : createLineChartOption(chartGroup.labels[fieldIndex], field);
        chart.setOption(option, true);
      }
    });
  });
};

const handleResize = () => {
  chartInstances.value.forEach(chart => chart?.resize());
};

watch(selectedProductIds, () => {
  updateAllCharts();
}, { deep: true });

onMounted(async () => {
  await loadProducts();
  await initCharts();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstances.value.forEach(chart => chart?.dispose());
  chartInstances.value.clear();
  chartRefs.value.clear();
});
</script>

<style scoped>
.power-comparison-page {
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

.chart-group {
  margin-bottom: 30px;
}

.chart-group-title {
  font-size: 1.3rem;
  margin-bottom: 15px;
  color: #007bff;
  padding-bottom: 8px;
  border-bottom: 2px solid #007bff;
  display: inline-block;
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
