<template>
  <div class="power-page">
    <div class="page-inner">
      <div class="page-header">
        <h2 class="page-title">{{ categoryName }}功耗对比</h2>
        <button class="back-btn" @click="router.back()">← 返回参数对比</button>
      </div>

      <section class="product-table-section">
        <h3>选择对比产品</h3>
        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-else-if="allProducts.length === 0" class="loading-state">暂无数据</div>
        <div v-else class="product-select-table-wrap">
          <table class="product-select-table">
            <thead>
              <tr>
                <th class="row-label-col"></th>
                <th
                  v-for="product in allProducts"
                  :key="product.id"
                  class="product-col"
                  :class="{ selected: selectedProductIds.includes(product.id) }"
                  @click="handleProductToggle(product)"
                >
                  <div class="product-col-inner">
                    <span class="check-indicator">{{ selectedProductIds.includes(product.id) ? '☑' : '☐' }}</span>
                    <span>{{ product.brand }} {{ product.model }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="row-label-col">产品型号</td>
                <td
                  v-for="product in allProducts"
                  :key="product.id"
                  class="product-col"
                  :class="{ selected: selectedProductIds.includes(product.id) }"
                  @click="handleProductToggle(product)"
                >
                  {{ product.model || '-' }}
                </td>
              </tr>
              <tr>
                <td class="row-label-col">芯片型号</td>
                <td
                  v-for="product in allProducts"
                  :key="'chip-' + product.id"
                  class="product-col"
                  :class="{ selected: selectedProductIds.includes(product.id) }"
                  @click="handleProductToggle(product)"
                >
                  /
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="selectedProducts.length > 0" class="charts-section">
        <h3>功耗场景对比</h3>
        <div class="charts-container">
          <div v-for="config in chartConfigs" :key="config.scenario" class="chart">
            <h4>{{ config.scenario }}</h4>
            <div :id="`chart-${config.scenario}`" class="chart-wrapper"></div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { dbApi, type ChartConfigItem } from '#/api/db';

interface Product {
  id: number;
  brand: string;
  model: string;
  [key: string]: any;
}

const router = useRouter();
const route = useRoute();

const category = computed(() => route.params.category as string);

const categoryName = ref('');
const chartConfigs = ref<ChartConfigItem[]>([]);

const allProducts = ref<Product[]>([]);
const loading = ref(false);
const selectedProductIds = ref<number[]>([]);

const selectedProducts = computed(() => {
  return allProducts.value.filter(p => selectedProductIds.value.includes(p.id));
});

const loadCategoryConfig = async () => {
  const result = await dbApi.getCategories();
  if (result.success && result.data) {
    const catInfo = result.data.find((c: any) => c.key === category.value);
    if (catInfo) {
      categoryName.value = catInfo.name;
      chartConfigs.value = catInfo.chartConfig || [];
    }
  }
};

const loadProducts = async () => {
  loading.value = true;
  const result = await dbApi.getList(category.value);
  if (result.success && result.data) {
    allProducts.value = result.data;
    initSelectedFromQuery();
  }
  loading.value = false;
};

const initSelectedFromQuery = () => {
  const selectedParam = route.query.selected as string;
  if (selectedParam) {
    const pairs = decodeURIComponent(selectedParam).split(',');
    const ids: number[] = [];
    for (const pair of pairs) {
      const [brand, model] = pair.split('::');
      const found = allProducts.value.find(p => p.brand === brand && p.model === model);
      if (found) {
        ids.push(found.id);
      }
    }
    selectedProductIds.value = ids;
  }
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
  chartConfigs.value.forEach(config => {
    const chartDom = document.getElementById(`chart-${config.scenario}`);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);
    const isHorizontal = config.chartType === 'barH';
    const isSingleField = config.fields.length === 1;

    if (isSingleField) {
      const field = config.fields[0];
      const data = selectedProducts.value.map(p => ({
        name: `${p.brand} ${p.model}`,
        value: p[field] || 0,
      }));

      if (isHorizontal) {
        chart.setOption({
          title: { text: config.scenario, left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
          xAxis: { type: 'value', name: '功耗 (mW)', min: 0 },
          yAxis: { type: 'category', data: data.map(d => d.name) },
          series: [{ name: config.labels[0], type: 'bar', data: data.map(d => d.value) }],
        });
      } else {
        const seriesType = config.chartType === 'line' ? 'line' : 'bar';
        chart.setOption({
          title: { text: config.scenario, left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: seriesType === 'line' ? 'line' : 'shadow' } },
          grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
          xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { rotate: 45 } },
          yAxis: { type: 'value', name: '功耗 (mW)', min: 0 },
          series: [{ name: config.labels[0], type: seriesType, data: data.map(d => d.value), smooth: seriesType === 'line' }],
        });
      }
    } else {
      const seriesType = isHorizontal ? 'bar' : (config.chartType === 'line' ? 'line' : 'bar');
      const series = selectedProducts.value.map(p => ({
        name: `${p.brand} ${p.model}`,
        type: seriesType,
        data: config.fields.map(f => p[f] || 0),
        smooth: seriesType === 'line',
      }));

      if (isHorizontal) {
        chart.setOption({
          title: { text: config.scenario, left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: { data: selectedProducts.value.map(p => `${p.brand} ${p.model}`), bottom: 0 },
          grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
          xAxis: { type: 'value', name: '功耗 (mW)', min: 0 },
          yAxis: { type: 'category', data: config.labels },
          series,
        });
      } else {
        chart.setOption({
          title: { text: config.scenario, left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: seriesType === 'line' ? 'line' : 'shadow' } },
          legend: { data: selectedProducts.value.map(p => `${p.brand} ${p.model}`), bottom: 0 },
          grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
          xAxis: { type: 'category', data: config.labels, axisLabel: { rotate: 45 } },
          yAxis: { type: 'value', name: '功耗 (mW)', min: 0 },
          series,
        });
      }
    }

    window.addEventListener('resize', () => chart.resize());
  });
};

watch(selectedProducts, () => {
  if (selectedProducts.value.length > 0) {
    setTimeout(createCharts, 100);
  }
}, { deep: true });

watch(category, () => {
  selectedProductIds.value = [];
  categoryName.value = '';
  chartConfigs.value = [];
  loadCategoryConfig();
  loadProducts();
});

onMounted(() => {
  loadCategoryConfig();
  loadProducts();
});
</script>

<style scoped>
.power-page {
  padding: 32px 24px;
}

.page-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
}

.back-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: all 0.3s;
}

.back-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.product-table-section,
.charts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.product-table-section h3,
.charts-section h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #333;
}

.product-select-table-wrap {
  overflow-x: auto;
}

.product-select-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.product-select-table th,
.product-select-table td {
  padding: 12px 16px;
  text-align: center;
  border: 1px solid #e8e8e8;
  color: #333;
  font-size: 0.9rem;
}

.row-label-col {
  width: 100px;
  background: #f0f2ff;
  font-weight: 600;
  color: #333;
  text-align: center;
  white-space: nowrap;
}

.product-col {
  cursor: pointer;
  transition: all 0.2s;
  color: #333;
  user-select: none;
}

.product-col:hover {
  background-color: #f0f2ff;
}

.product-col.selected {
  background-color: #e8ebff;
  font-weight: 500;
}

.product-col-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.check-indicator {
  font-size: 1.1rem;
  line-height: 1;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.chart {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.chart h4 {
  font-size: 1.1rem;
  margin: 0 0 16px;
  color: #333;
  text-align: center;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
}
</style>
