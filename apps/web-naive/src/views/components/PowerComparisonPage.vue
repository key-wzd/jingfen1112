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
        <div class="footer-content">
          <div class="footer-info">
            <h3>TechCompare</h3>
            <p>专业的电子产品功耗对比平台</p>
          </div>
          <div class="footer-links">
            <h4>快速导航</h4>
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
  displayColumns: Array<{
    key: string;
    label: string;
    suffix?: string;
  }>;
}>();

const allProducts = ref<Product[]>([]);
const loading = ref(false);
const selectedProductIds = ref<number[]>([]);

const selectedProducts = computed(() => {
  return allProducts.value.filter(product => selectedProductIds.value.includes(product.id));
});

const loadProducts = async () => {
  loading.value = true;
  const result = await dbApi.getList(props.category);
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
    if (chartDom) {
      const chart = echarts.init(chartDom);
      
      const isSingleField = config.fields.length === 1;
      
      if (isSingleField) {
        const field = config.fields[0];
        const data = selectedProducts.value.map(product => ({
          name: `${product.brand} ${product.model}`,
          value: product[field] || 0
        }));
        
        const option = {
          title: {
            text: config.scenario,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: data.map(item => item.name),
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            name: '功耗 (mW)',
            min: 0
          },
          series: [{
            name: config.labels[0],
            type: config.chartType,
            data: data.map(item => item.value),
            smooth: true,
            emphasis: {
              focus: 'series'
            }
          }]
        };
        
        chart.setOption(option);
      } else {
        const series = selectedProducts.value.map(product => {
          const seriesData = config.fields.map(field => product[field] || 0);
          return {
            name: `${product.brand} ${product.model}`,
            type: config.chartType,
            data: seriesData,
            smooth: true,
            emphasis: {
              focus: 'series'
            }
          };
        });

        const option = {
          title: {
            text: config.scenario,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          legend: {
            data: selectedProducts.value.map(product => `${product.brand} ${product.model}`),
            bottom: 0
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: config.labels,
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            name: '功耗 (mW)',
            min: 0
          },
          series
        };

        chart.setOption(option);
      }
      
      window.addEventListener('resize', () => {
        chart.resize();
      });
    }
  });
};

watch(selectedProducts, () => {
  if (selectedProducts.value.length > 0) {
    setTimeout(() => {
      createCharts();
    }, 100);
  }
}, { deep: true });

onMounted(() => {
  loadProducts();
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
  max-width: 1400px;
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

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f9f9f9;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

th:first-child, td:first-child {
  width: 80px;
  text-align: center;
}

td {
  color: #333;
}

tr:hover {
  background-color: #f5f5f5;
}

.loading-cell, .empty-cell {
  text-align: center;
  padding: 40px;
  color: #999;
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

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.chart {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
}

.chart h4 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #333;
  text-align: center;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
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
