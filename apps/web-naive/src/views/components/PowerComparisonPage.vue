<template>
  <div class="power-comparison-page">
    <header class="navbar">
      <div class="container">
        <div class="logo"><h1>TechCompare</h1></div>
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
        <div class="charts-container">
          <div v-for="config in chartConfigs" :key="config.scenario" class="chart">
            <h4>{{ config.scenario }}</h4>
            <div :id="`chart-${config.scenario}`" class="chart-wrapper"></div>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="container">
        <p>&copy; {{ new Date().getFullYear() }} TechCompare. 保留所有权利。</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import * as echarts from 'echarts';
import { dbApi, type ChartConfigItem } from '#/api/db';

interface Product {
  id: number;
  brand: string;
  model: string;
  [key: string]: any;
}

const props = defineProps<{
  category: string;
  pageTitle: string;
  categoryName: string;
  chartConfigs: ChartConfigItem[];
  displayColumns: Array<{ key: string; label: string; suffix?: string }>;
}>();

const allProducts = ref<Product[]>([]);
const loading = ref(false);
const selectedProductIds = ref<number[]>([]);

const selectedProducts = computed(() => {
  return allProducts.value.filter(product => selectedProductIds.value.includes(product.id));
});

const loadProducts = async () => {
  loading.value = true;
  const result = await dbApi.getPowerList(props.category);
  if (result.success && result.data) {
    allProducts.value = result.data;
  }
  loading.value = false;
};

const handleProductToggle = (product: Product) => {
  const index = selectedProductIds.value.indexOf(product.id);
  if (index > -1) {
    selectedProductIds.value.splice(index, 1);
  } else {
    selectedProductIds.value.push(product.id);
  }
};

const createCharts = () => {
  props.chartConfigs.forEach(config => {
    const chartDom = document.getElementById(`chart-${config.scenario}`);
    if (!chartDom) return;
    const chart = echarts.init(chartDom);
    const isHorizontal = config.chartType === 'barH';
    const isSingleField = config.fields.length === 1;
    const productNames = selectedProducts.value.map(p => `${p.brand} ${p.model}`);

    if (isSingleField) {
      const data = selectedProducts.value.map(p => {
        const field = config.fields[0];
        const val = field ? p[field] : 0;
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: productNames },
        yAxis: { type: 'value', name: 'mW' },
        series: [{
          name: config.labels[0],
          type: 'line',
          data,
          smooth: true,
          itemStyle: { color: '#667eea' },
          areaStyle: { color: 'rgba(102,126,234,0.15)' },
        }],
      });
    } else if (isHorizontal) {
      const series = config.fields.map((field, i) => ({
        name: config.labels[i],
        type: 'bar' as const,
        data: selectedProducts.value.map(p => {
          const val = p[field];
          return typeof val === 'number' ? val : parseFloat(val) || 0;
        }),
      }));
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: config.labels },
        yAxis: { type: 'category', data: productNames },
        xAxis: { type: 'value', name: 'mW' },
        series,
      });
    } else {
      const series = config.fields.map((field, i) => ({
        name: config.labels[i],
        type: 'bar' as const,
        data: selectedProducts.value.map(p => {
          const val = p[field];
          return typeof val === 'number' ? val : parseFloat(val) || 0;
        }),
      }));
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: config.labels },
        xAxis: { type: 'category', data: productNames },
        yAxis: { type: 'value', name: 'mW' },
        series,
      });
    }
  });
};

watch(selectedProducts, () => {
  if (selectedProducts.value.length > 0) {
    setTimeout(createCharts, 100);
  }
}, { deep: true });

onMounted(() => {
  loadProducts();
});
</script>

<style scoped>
.power-comparison-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.navbar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo h1 {
  font-size: 1.3rem;
  margin: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.nav-links a:hover,
.nav-links a.active {
  color: #667eea;
  background: #f0f2ff;
}

.page-title {
  font-size: 1.8rem;
  color: #333;
  margin: 32px 0 24px;
}

.product-table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.product-table-section h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
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
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
  color: #333;
}

.product-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 40px;
  color: #999;
}

.charts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.charts-section h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart h4 {
  font-size: 1rem;
  margin: 0 0 12px;
  color: #555;
}

.chart-wrapper {
  width: 100%;
  height: 300px;
}

.footer {
  margin-top: auto;
  background: #f8f9fa;
  padding: 20px 0;
  text-align: center;
}

.footer p {
  color: #999;
  margin: 0;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .nav-links {
    gap: 8px;
    flex-wrap: wrap;
  }
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
