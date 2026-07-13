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
              <template v-if="headerRows.length > 0">
                <tr v-for="(row, rowIdx) in headerRows" :key="rowIdx">
                  <th class="row-label-col">{{ row[0]?.label || '-' }}</th>
                  <th
                    v-for="(cell, colIdx) in row.slice(1)"
                    :key="colIdx"
                    class="product-col"
                    :class="{ selected: selectedProductIds.includes(getProductIdByCol(colIdx)) }"
                    @click="handleProductToggleByCol(colIdx)"
                  >
                    {{ cell.value || '-' }}
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
          <!-- 卡片：由 summary/line/default 分组产生 -->
          <div
            v-for="(card, cardIdx) in chartCards"
            :key="'card-' + cardIdx"
            class="chart-card"
          >
            <h3 class="chart-card-title">{{ card.title }}</h3>
            <div
              v-for="(row, rowIdx) in card.rows"
              :key="'row-' + cardIdx + '-' + rowIdx"
              class="chart-row"
            >
              <div class="row-legend">
                <div class="legend-container">
                  <div
                    v-for="product in selectedProducts"
                    :key="product.id"
                    class="legend-item"
                    :class="{ inactive: rowHiddenIds['card-' + cardIdx + '-' + rowIdx]?.includes(product.id) }"
                    @click="handleLegendToggle('card-' + cardIdx + '-' + rowIdx, product)"
                  >
                    <span class="legend-color" :style="{ backgroundColor: rowHiddenIds['card-' + cardIdx + '-' + rowIdx]?.includes(product.id) ? '#ccc' : getProductColor(product) }"></span>
                    <span class="legend-text">{{ getModelName(product) }}</span>
                  </div>
                </div>
              </div>
              <div class="row-charts" :class="{ 'row-charts--single': card.type === 'summary' }">
                <div v-for="config in row" :key="config.order" class="chart-wrapper" :class="{ 'chart-empty-wrapper': isConfigNull(config) }">
                  <template v-if="!isConfigNull(config)">
                    <div class="chart-header">
                      <h4 class="scenario-name">{{ config.scenario }}</h4>
                      <div v-if="getTestConclusion(config, 'card-' + cardIdx + '-' + rowIdx)" class="test-conclusion">
                        测试结论：{{ getTestConclusion(config, 'card-' + cardIdx + '-' + rowIdx) }}
                      </div>
                    </div>
                    <div :id="`chart-${config.order}`" class="chart-content"></div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <transition name="fade">
      <button v-if="showBackToTop" class="back-to-top" @click="scrollToTop">╱╲</button>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue';
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
const rowHiddenIds = reactive<Record<string, number[]>>({});
const headerRows = ref<HeaderCell[][]>([]);

const chartColors = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A',
  '#F4A261', '#264653', '#6A4C93', '#1982C4',
  '#8AC926', '#FF595E', '#FFCA3A', '#6A0572',
  '#AB83A1', '#36827F', '#D4A373', '#588157',
];

// 颜色绑定映射：productId -> color（页面生命周期内持久化，退出页面后重置）
const productColorMap = reactive<Record<number, string>>({});
// 已被占用的颜色索引集合
const usedColorIndices = reactive<Set<number>>(new Set());

// 为产品分配颜色（从未被占用的颜色中按顺序取第一个）
const assignProductColor = (productId: number) => {
  if (productColorMap[productId]) return productColorMap[productId];
  for (let i = 0; i < chartColors.length; i++) {
    if (!usedColorIndices.has(i)) {
      usedColorIndices.add(i);
      productColorMap[productId] = chartColors[i];
      return chartColors[i];
    }
  }
  // 颜色池用尽，循环复用
  const fallback = chartColors[Object.keys(productColorMap).length % chartColors.length];
  productColorMap[productId] = fallback;
  return fallback;
};

const getUnitLabel = () => {
  if (chartConfigs.value.length > 0) {
    const configWithUnit = chartConfigs.value.find(c => c.unit && c.unit.trim());
    if (configWithUnit) {
      return configWithUnit.unit.trim();
    }
  }
  if (headerRows.value.length > 0) {
    const unitRow = headerRows.value.find(row => {
      const label = row[0]?.label || '';
      return label === '单位' || label.includes('单位') || label.startsWith('单位：');
    });
    if (unitRow) {
      for (let i = 1; i < unitRow.length; i++) {
        if (unitRow[i]?.value && unitRow[i].value.trim()) {
          return unitRow[i].value.trim();
        }
      }
    }
  }
  return '';
};

// 判断是否为分割线（line 与 null 来源一致，都是 scenario 字段的特殊值）
const isLine = (config: ChartConfigItem) => {
  return !!config.scenario && config.scenario.toLowerCase() === 'line';
};

// 判断是否为总结分割线
const isSummary = (config: ChartConfigItem) => {
  return !!config.scenario && config.scenario.toLowerCase() === 'summary';
};

// 卡片分组：遇到 line/summary 分割线则开新卡片，下一行作为标题
interface ChartCard {
  type: 'summary' | 'line' | 'default';
  title: string;
  rows: ChartConfigItem[][];
}

const chartCards = computed(() => {
  const cards: ChartCard[] = [];
  let currentType: 'summary' | 'line' | 'default' = 'default';
  let currentTitle = '选择对比产品';
  let currentItems: ChartConfigItem[] = [];
  let nextIsTitle = false;
  let pendingType: 'summary' | 'line' | null = null;

  for (const item of chartConfigs.value) {
    // null 空配置跳过
    if (!item.scenario || item.scenario.toLowerCase() === 'null') continue;
    
    // summary 分割线：标记下一行是标题，记录类型
    if (isSummary(item)) {
      if (currentItems.length > 0) {
        const rows = groupItems(currentItems, currentType);
        cards.push({ type: currentType, title: currentTitle, rows });
      }
      pendingType = 'summary';
      nextIsTitle = true;
      currentItems = [];
      continue;
    }
    
    // line 分割线：标记下一行是标题，记录类型
    if (isLine(item)) {
      if (currentItems.length > 0) {
        const rows = groupItems(currentItems, currentType);
        cards.push({ type: currentType, title: currentTitle, rows });
      }
      pendingType = 'line';
      nextIsTitle = true;
      currentItems = [];
      continue;
    }
    
    // 标题行（分割线后的下一行）
    if (nextIsTitle) {
      currentTitle = item.scenario;
      currentType = pendingType || 'default';
      nextIsTitle = false;
      pendingType = null;
      continue;
    }
    
    // 普通场景
    currentItems.push(item);
  }
  
  // 最后一批
  if (currentItems.length > 0) {
    const rows = groupItems(currentItems, currentType);
    cards.push({ type: currentType, title: currentTitle, rows });
  }

  return cards;
});

// 按类型分组为行
const groupItems = (items: ChartConfigItem[], type: 'summary' | 'line' | 'default') => {
  const rows: ChartConfigItem[][] = [];
  const chunkSize = type === 'summary' ? 1 : 2;
  for (let i = 0; i < items.length; i += chunkSize) {
    rows.push(items.slice(i, i + chunkSize));
  }
  return rows;
};

// 所有渲染行（用于 createCharts 遍历）
const allChartRows = computed(() => {
  const rows: { key: string; items: ChartConfigItem[] }[] = [];

  chartCards.value.forEach((card, cardIdx) => {
    card.rows.forEach((rowItems, rowIdx) => {
      rows.push({ key: `card-${cardIdx}-${rowIdx}`, items: rowItems });
    });
  });

  return rows;
});

const selectedProducts = computed(() => {
  return allProducts.value.filter(p => selectedProductIds.value.includes(p.id));
});

const isConfigNull = (config: ChartConfigItem) => {
  if (!config.scenario || config.scenario.toLowerCase() === 'null') return true;
  if (!config.fields || config.fields.length === 0) return true;
  if (selectedProducts.value.length === 0) return true;
  for (const product of selectedProducts.value) {
    for (const field of config.fields) {
      const val = product[field];
      if (val !== undefined && val !== null && val !== '' && val !== 0) {
        return false;
      }
    }
  }
  return true;
};

const getProductIdByCol = (colIdx: number) => {
  if (headerRows.value.length >= 2) {
    const modelCell = headerRows.value[1]?.[colIdx + 1];
    if (modelCell) {
      const qModel = String(modelCell.value || '').trim();
      const found = allProducts.value.find(p => String(p.model || '').trim() === qModel);
      if (found) return found.id;
    }
  }
  return allProducts.value[colIdx]?.id ?? -1;
};

const handleProductToggleByCol = (colIdx: number) => {
  const productId = getProductIdByCol(colIdx);
  const product = allProducts.value.find(p => p.id === productId);
  if (product) {
    handleProductToggle(product);
  }
};

const getProductColor = (product: Product) => {
  // 优先从已绑定映射中取（页面内颜色记忆）
  if (productColorMap[product.id]) return productColorMap[product.id];
  // 未绑定的产品（理论上不应出现，兜底按 id 分配）
  return chartColors[product.id % chartColors.length];
};

const getModelName = (product: Product) => {
  if (headerRows.value.length >= 2 && headerRows.value[1]) {
    const modelFieldKey = headerRows.value[1][0]?.fieldKey;
    if (modelFieldKey && product[modelFieldKey]) {
      return product[modelFieldKey];
    }
  }
  return product.model || `${product.brand} ${product.model}`;
};

const getTestConclusion = (config: ChartConfigItem, rowKey: string) => {
  if (config.conclusion && config.conclusion.trim()) {
    return config.conclusion.trim();
  }

  if (!config.fields || config.fields.length === 0) return '';
  if (selectedProducts.value.length <= 1) return '';

  const hiddenIds = rowHiddenIds[rowKey] || [];
  const isLine = config.chartType === 'line';

  const productsWithPower = selectedProducts.value
    .filter(p => !hiddenIds.includes(p.id))
    .map(product => {
      const values = config.fields.map(field => {
        const val = product[field];
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });
      const totalPower = values.reduce((sum, v) => sum + v, 0);
      const avgPower = isLine ? totalPower / values.length : totalPower;
      return { product, powerValue: avgPower };
    })
    .filter(item => item.powerValue > 0)
    .sort((a, b) => a.powerValue - b.powerValue)
    .slice(0, 8);

  if (productsWithPower.length <= 1) return '';

  return productsWithPower.map(item => getModelName(item.product)).join(' < ');
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
  if (!selectedParam || allProducts.value.length === 0) return;

  const pairs = decodeURIComponent(selectedParam).split(',');
  const ids: number[] = [];

  for (const pair of pairs) {
    const [brand, model] = pair.split('::');
    const qModel = (model || '').trim();
    if (!qModel) continue;

    const found = allProducts.value.find(p => String(p.model || '').trim() === qModel);
    if (found) ids.push(found.id);
  }

  selectedProductIds.value = ids;
  // 为初始化选中的产品分配颜色
  ids.forEach(id => assignProductColor(id));
};

const handleProductToggle = (product: Product) => {
  const index = selectedProductIds.value.indexOf(product.id);
  if (index > -1) {
    // 取消选择：保留颜色绑定（页面内记忆），仅移除选中状态
    selectedProductIds.value.splice(index, 1);
    for (const key of Object.keys(rowHiddenIds)) {
      const hi = rowHiddenIds[key].indexOf(product.id);
      if (hi > -1) rowHiddenIds[key].splice(hi, 1);
    }
  } else {
    // 新选择：分配颜色（若未绑定过）
    assignProductColor(product.id);
    selectedProductIds.value.push(product.id);
  }
};

const handleLegendToggle = (rowKey: string, product: Product) => {
  if (!rowHiddenIds[rowKey]) rowHiddenIds[rowKey] = [];
  const index = rowHiddenIds[rowKey].indexOf(product.id);
  if (index > -1) {
    rowHiddenIds[rowKey].splice(index, 1);
  } else {
    rowHiddenIds[rowKey].push(product.id);
  }
  createCharts();
};

const createCharts = () => {
  const globalUnit = getUnitLabel();

  allChartRows.value.forEach(({ key, items }) => {
    items.forEach((config) => {
      if (isConfigNull(config)) return;

      const chartDom = document.getElementById(`chart-${config.order}`);
      if (!chartDom) return;
      const existingChart = echarts.getInstanceByDom(chartDom);
      if (existingChart) existingChart.dispose();
      const chart = echarts.init(chartDom);
      const isHorizontal = config.chartType === 'barH';
      const isLine = config.chartType === 'line';
      const hiddenIds = rowHiddenIds[key] || [];
      const unit = config.unit || globalUnit;

      const series = selectedProducts.value.map((product) => {
        const isHidden = hiddenIds.includes(product.id);
        const displayColor = isHidden ? '#cccccc' : getProductColor(product);
        const displayOpacity = isHidden ? 0.3 : 1;
        const data = config.fields.map(field => {
          if (isHidden) return null;
          const val = product[field];
          return typeof val === 'number' ? val : parseFloat(val) || 0;
        });

        if (isLine) {
          return {
            name: getModelName(product),
            type: 'line' as const,
            data,
            smooth: true,
            triggerLineEvent: true,
            itemStyle: { color: displayColor, opacity: displayOpacity },
            lineStyle: { color: displayColor, opacity: displayOpacity },
          };
        }
        return {
          name: getModelName(product),
          type: 'bar' as const,
          data,
          itemStyle: { color: displayColor, opacity: displayOpacity },
          label: {
            show: !isHidden,
            position: isHorizontal ? 'right' : 'top',
            formatter: (params: any) => params.value != null ? params.value : '',
            fontSize: 11,
            color: '#666',
          },
        };
      });

      const axisData = config.labels;
      const axisNameStyle = { fontWeight: 'bold' as const, fontSize: 13 };
      const axisLabelStyle = { fontWeight: 'bold' as const };

      const barTooltip = {
        trigger: 'item' as const,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<div style="font-weight:600">${p.seriesName}</div>
            <div>${p.name}: ${p.value != null ? p.value : '-'}${unit ? ' ' + unit : ''}</div>`;
        },
      };

      if (isLine) {
        chart.setOption({
          tooltip: barTooltip,
          legend: { show: false },
          grid: { left: '3%', right: '3%', top: 30, bottom: 10, containLabel: true },
          xAxis: { type: 'category', data: axisData, axisLabel: axisLabelStyle },
          yAxis: { type: 'value', name: unit, nameTextStyle: axisNameStyle },
          series,
        });
      } else if (isHorizontal) {
        chart.setOption({
          tooltip: barTooltip,
          legend: { show: false },
          grid: { left: '3%', right: '60', top: 30, bottom: 10, containLabel: true },
          yAxis: { type: 'category', data: axisData, axisLabel: axisLabelStyle },
          xAxis: { type: 'value', name: unit, nameTextStyle: axisNameStyle },
          series,
        });
      } else {
        chart.setOption({
          tooltip: barTooltip,
          legend: { show: false },
          grid: { left: '3%', right: '3%', top: 30, bottom: 10, containLabel: true },
          xAxis: { type: 'category', data: axisData, axisLabel: axisLabelStyle },
          yAxis: { type: 'value', name: unit, nameTextStyle: axisNameStyle },
          series,
        });
      }
    });
  });
};

const showBackToTop = ref(false);

const handleScroll = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const screenHeight = window.innerHeight;
  showBackToTop.value = scrollTop > screenHeight * 2;
};

const scrollToTop = () => {
  const startPosition = window.scrollY;
  if (startPosition === 0) return;
  const duration = 100;
  const startTime = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startPosition * (1 - progress));
    if (progress >= 1) {
      clearInterval(timer);
    }
  }, 10);
};

watch(selectedProducts, () => {
  if (selectedProducts.value.length > 0) {
    setTimeout(createCharts, 100);
  }
}, { deep: true });

watch(category, () => {
  selectedProductIds.value = [];
  Object.keys(rowHiddenIds).forEach(k => delete rowHiddenIds[k]);
  // 切换分类时重置颜色绑定（下次进入重新分配）
  Object.keys(productColorMap).forEach(k => delete productColorMap[Number(k)]);
  usedColorIndices.clear();
  categoryName.value = '';
  chartConfigs.value = [];
  headerRows.value = [];
  loadCategoryConfig();
  loadProducts();
});

onMounted(() => {
  loadCategoryConfig();
  loadProducts();
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
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
  padding: 0;
}

.charts-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.legend-item.inactive {
  opacity: 0.45;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-text {
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
}

.chart-row .row-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

/* summary 类型：一个图占整行 */
.row-charts--single {
  grid-template-columns: 1fr !important;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chart-card-title {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
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
  margin: 0;
  color: #333;
  font-weight: 600;
}

.test-conclusion {
  font-size: 0.85rem;
  color: #8a8a8aff;
  margin-top: 16px;
  font-weight: 600;
  text-align: center;
}

.chart-content {
  width: 100%;
  height: 300px;
}

.chart-empty-wrapper {
  visibility: hidden;
}

.back-to-top {
  position: fixed;
  right: 500px;
  bottom: 100px;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: #b3b4b6ff;
  color: white;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.4);
  transition: none;
  animation: none;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-to-top:hover {
  background: #5a6fd6;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .chart-row .row-charts {
    grid-template-columns: 1fr;
  }
}
</style>
