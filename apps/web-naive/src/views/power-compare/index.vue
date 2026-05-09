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
              <template v-if="tableRowDefs.length > 0">
                <tr v-for="(rowDef, rowIdx) in tableRowDefs" :key="rowIdx">
                  <th class="row-label-col">{{ rowDef.label }}</th>
                  <th
                    v-for="product in allProducts"
                    :key="product.id"
                    class="product-col"
                    :class="{ selected: selectedProductIds.includes(product.id) }"
                    @click="handleProductToggle(product)"
                  >
                    {{ product[rowDef.fieldKey] || '-' }}
                  </th>
                </tr>
              </template>
              <template v-else>
                <tr>
                  <th class="row-label-col">品牌</th>
                  <th
                    v-for="product in allProducts"
                    :key="product.id"
                    class="product-col"
                    :class="{ selected: selectedProductIds.includes(product.id) }"
                    @click="handleProductToggle(product)"
                  >
                    {{ product.brand }}
                  </th>
                </tr>
                <tr>
                  <th class="row-label-col">型号</th>
                  <th
                    v-for="product in allProducts"
                    :key="product.id"
                    class="product-col"
                    :class="{ selected: selectedProductIds.includes(product.id) }"
                    @click="handleProductToggle(product)"
                  >
                    {{ product.model }}
                  </th>
                </tr>
              </template>
            </thead>
          </table>
        </div>
      </section>

      <section v-if="selectedProducts.length > 0" class="charts-section">
        <div class="charts-grid">
          <div v-for="(row, rowIndex) in chartRows" :key="rowIndex" class="chart-row">
            <div class="row-legend">
              <div class="legend-container">
                <div
                  v-for="product in selectedProducts"
                  :key="product.id"
                  class="legend-item"
                  @click="handleProductToggle(product)"
                >
                  <span class="legend-color" :style="{ backgroundColor: getProductColor(product) }"></span>
                  <span class="legend-text">{{ product.brand }} {{ product.model }}</span>
                </div>
              </div>
            </div>
            <div class="row-charts">
              <div v-for="config in row" :key="config.scenario" class="chart-wrapper">
                <div class="chart-header">
                  <h4 class="scenario-name">{{ config.scenario }}</h4>
                  <div class="unit-label">{{ unitLabel }}</div>
                </div>
                <div :id="`chart-${config.scenario}`" class="chart-content"></div>
              </div>
            </div>
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
  unit?: string;
  [key: string]: any;
}

interface HeaderCell {
  label: string;
  value: string;
  fieldKey: string;
}

const router = useRouter();
const route = useRoute();

const category = computed(() => route.params.category as string);
const categoryName = ref('');
const chartConfigs = ref<ChartConfigItem[]>([]);
const allProducts = ref<Product[]>([]);
const loading = ref(false);
const selectedProductIds = ref<number[]>([]);
const headerRows = ref<HeaderCell[][]>([]);

const chartColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a8edea', '#fed6e3'];

const unitLabel = computed(() => {
  if (selectedProducts.value.length > 0) {
    return selectedProducts.value[0]?.unit || 'mW';
  }
  return 'mW';
});

const tableRowDefs = computed(() => {
  if (headerRows.value.length > 0) {
    return headerRows.value.map(row => ({
      label: row[0]?.label || '',
      fieldKey: row[0]?.fieldKey || '',
    }));
  }
  return [
    { label: '品牌', fieldKey: 'brand' },
    { label: '型号', fieldKey: 'model' },
  ];
});

const chartRows = computed(() => {
  const rows = [];
  for (let i = 0; i < chartConfigs.value.length; i += 2) {
    rows.push(chartConfigs.value.slice(i, i + 2));
  }
  return rows;
});

const selectedProducts = computed(() => {
  return allProducts.value.filter(p => selectedProductIds.value.includes(p.id));
});

const getProductColor = (product: Product) => {
  const index = allProducts.value.findIndex(p => p.id === product.id);
  return chartColors[index % chartColors.length];
};

const loadCategoryConfig = async () => {
  const result = await dbApi.getCategories();
  if (result.success && result.data) {
    const catInfo = result.data.find((c: any) => c.key === category.value);
    if (catInfo) {
      categoryName.value = catInfo.name;
      chartConfigs.value = catInfo.power?.chartConfig || [];
    }
  }
};

const loadProducts = async () => {
  loading.value = true;
  const result = await dbApi.getPowerList(category.value);
  if (result.success && result.data) {
    allProducts.value = result.data;
    headerRows.value = (result as any).headerRows || [];
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
      if (found) ids.push(found.id);
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
  chartConfigs.value.forEach((config) => {
    const chartDom = document.getElementById(`chart-${config.scenario}`);
    if (!chartDom) return;
    const existingChart = echarts.getInstanceByDom(chartDom);
    if (existingChart) existingChart.dispose();
    const chart = echarts.init(chartDom);
    const isHorizontal = config.chartType === 'barH';
    const isLine = config.chartType === 'line';

    const series = selectedProducts.value.map((product) => {
      const colorIndex = allProducts.value.findIndex(p => p.id === product.id);
      const data = config.fields.map(field => {
        const val = product[field];
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });

      if (isLine) {
        return {
          name: `${product.brand} ${product.model}`,
          type: 'line' as const,
          data,
          smooth: true,
          itemStyle: { color: chartColors[colorIndex % chartColors.length] },
        };
      }
      return {
        name: `${product.brand} ${product.model}`,
        type: 'bar' as const,
        data,
        itemStyle: { color: chartColors[colorIndex % chartColors.length] },
      };
    });

    const axisData = config.labels;

    if (isHorizontal) {
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { show: false },
        yAxis: { type: 'category', data: axisData },
        xAxis: { type: 'value', name: unitLabel.value },
        series,
      });
    } else {
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: isLine ? 'line' : 'shadow' } },
        legend: { show: false },
        xAxis: { type: 'category', data: axisData },
        yAxis: { type: 'value', name: unitLabel.value },
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

watch(category, () => {
  selectedProductIds.value = [];
  categoryName.value = '';
  chartConfigs.value = [];
  headerRows.value = [];
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
  max-width: 1400px;
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
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.back-btn:hover {
  border-color: #667eea;
  color: #667eea;
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

.loading-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.product-select-table-wrap {
  overflow-x: auto;
}

.product-select-table {
  width: 100%;
  border-collapse: collapse;
}

.product-select-table th {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #eee;
  color: #333;
  font-weight: 600;
}

.row-label-col {
  width: 80px;
  text-align: left;
  font-weight: 500;
  color: #666;
  background: #f8f9fa;
}

.product-col {
  cursor: pointer;
  transition: background 0.2s;
  min-width: 120px;
  background: white;
}

.product-col:hover {
  background: #f0f2ff;
}

.product-col.selected {
  background: #e8ebff;
}

.charts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.charts-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.chart-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-legend {
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.legend-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.legend-item:hover {
  background: #f0f2ff;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-text {
  color: #333;
  font-size: 0.9rem;
}

.chart-row .row-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.chart-wrapper {
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

.scenario-name {
  font-size: 1rem;
  margin: 0 0 4px;
  color: #333;
  font-weight: 600;
}

.unit-label {
  font-size: 0.85rem;
  color: #666;
}

.chart-content {
  width: 100%;
  height: 300px;
}

@media (max-width: 768px) {
  .chart-row .row-charts {
    grid-template-columns: 1fr;
  }
}
</style>
