<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  dbApi,
  type ChartConfigItem,
  type CategoryInfo,
  type HeaderCell,
} from '#/api/db';
import PowerChart, { type ChartSample } from '#/components/PowerChart.vue';
import {
  csvCell,
  deviceKey,
  displayValue,
  loadSelection,
  readSelection,
  saveSelection,
  toMeasurement,
  type DeviceIdentity,
} from '#/utils/measurements';

interface Product extends DeviceIdentity {
  id: number;
  unit?: string;
  [key: string]: unknown;
}
interface ChartRow {
  key: string;
  items: ChartConfigItem[];
}
interface ChartCard {
  title: string;
  summary: boolean;
  rows: ChartRow[];
}
interface AnalysisPlan {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  selectedIds: number[];
  baselineId: number | null;
}
const route = useRoute(),
  router = useRouter();
const category = computed(() => String(route.params.category || ''));
const categories = ref<CategoryInfo[]>([]);
const categoryName = ref('');
const configs = ref<ChartConfigItem[]>([]);
const allProducts = ref<Product[]>([]);
const headerRows = ref<HeaderCell[][]>([]);
const selectedIds = ref<number[]>([]);
const hiddenByRow = ref<Record<string, number[]>>({});
const loading = ref(false),
  error = ref(''),
  search = ref('');
let requestVersion = 0;
const palette = [
  '#4f46e5',
  '#087f8c',
  '#ba581c',
  '#c23960',
  '#527f23',
  '#7c5bbd',
  '#215ca3',
  '#925827',
];
const colorMap = ref<Record<number, string>>({});
const baselineId = ref<number | null>(null);
const analysisName = ref('');
const savedPlans = ref<AnalysisPlan[]>([]);
const selectedProducts = computed(() =>
  allProducts.value.filter((p) => selectedIds.value.includes(p.id)),
);
const filteredProducts = computed(() =>
  allProducts.value.filter((p) =>
    `${p.brand} ${p.model}`
      .toLowerCase()
      .includes(search.value.toLowerCase().trim()),
  ),
);
const cards = computed<ChartCard[]>(() => {
  const output: ChartCard[] = [];
  let title = '测试场景',
    summary = false,
    nextTitle = false,
    items: ChartConfigItem[] = [];
  function flush() {
    if (!items.length) return;
    const rows: ChartRow[] = [];
    const size = summary ? 1 : 2;
    const cardId = output.length;
    for (let i = 0; i < items.length; i += size)
      rows.push({ key: `row-${cardId}-${i}`, items: items.slice(i, i + size) });
    output.push({ title, summary, rows });
    items = [];
  }
  for (const item of configs.value) {
    const marker = item.scenario?.trim().toLowerCase();
    if (marker === 'line' || marker === 'summary') {
      flush();
      summary = marker === 'summary';
      nextTitle = true;
      continue;
    }
    if (nextTitle) {
      title = item.scenario;
      nextTitle = false;
      continue;
    }
    items.push(item);
  }
  flush();
  return output;
});
const plottedConfigs = computed(() =>
  cards.value.flatMap((c) => c.rows.flatMap((r) => r.items)).filter(isPlot),
);
function isPlot(config: ChartConfigItem) {
  return (
    !!config.scenario &&
    config.scenario.trim().toLowerCase() !== 'null' &&
    config.fields?.length > 0
  );
}
const unitOverview = computed(() => {
  const units = [...new Set(plottedConfigs.value.map(resolveUnit))];
  return units.length === 1 ? units[0] || '未标注' : '按图表分别标注';
});
function resolveUnit(config: ChartConfigItem): string {
  if (config.unit?.trim()) return config.unit.trim();
  // Do not borrow a unit from another scenario. Only a unanimous dataset unit is a valid fallback.
  const row = headerRows.value.find((r) => r[0]?.label.includes('单位'));
  const values =
    row
      ?.slice(1)
      .map((c) => String(c.value || '').trim())
      .filter(Boolean) || [];
  const units = [...new Set(values)];
  return units.length === 1 ? units[0] || '' : '';
}
function color(product: Product) {
  return (
    colorMap.value[product.id] ||
    palette[allProducts.value.indexOf(product) % palette.length] ||
    '#4f46e5'
  );
}
function samplesFor(row: ChartRow): ChartSample[] {
  return selectedProducts.value
    .filter((p) => !hiddenByRow.value[row.key]?.includes(p.id))
    .map((p) => ({ ...p, color: color(p) }));
}
function productLabel(product: Product) {
  const duplicateCount = allProducts.value.filter(
    (item) => item.brand === product.brand && item.model === product.model,
  ).length;
  return duplicateCount > 1
    ? `${product.brand} ${product.model} · 记录 #${product.id}`
    : `${product.brand} ${product.model}`;
}
const baselineProduct = computed(
  () =>
    selectedProducts.value.find((product) => product.id === baselineId.value) ||
    null,
);
function deltaFor(field: string, value: number | null) {
  if (!baselineProduct.value || value === null) return null;
  const baselineValue = toMeasurement(baselineProduct.value[field]);
  return baselineValue === null ? null : value - baselineValue;
}
function loadSavedPlans() {
  try {
    const raw = localStorage.getItem('tc-lab-analysis-plans');
    savedPlans.value = raw ? JSON.parse(raw) : [];
  } catch {
    savedPlans.value = [];
  }
}
function saveAnalysisPlan() {
  const name =
    analysisName.value.trim() ||
    `${categoryName.value || category.value} · ${new Date().toLocaleDateString('zh-CN')}`;
  const plan: AnalysisPlan = {
    id: `${Date.now()}`,
    name,
    category: category.value,
    createdAt: new Date().toISOString(),
    selectedIds: [...selectedIds.value],
    baselineId: baselineId.value,
  };
  savedPlans.value = [
    plan,
    ...savedPlans.value.filter((item) => item.name !== name),
  ].slice(0, 20);
  localStorage.setItem(
    'tc-lab-analysis-plans',
    JSON.stringify(savedPlans.value),
  );
  analysisName.value = '';
}
function restoreAnalysisPlan(id: string) {
  const plan = savedPlans.value.find(
    (item) => item.id === id && item.category === category.value,
  );
  if (!plan) return;
  selectedIds.value = allProducts.value
    .filter((product) => plan.selectedIds.includes(product.id))
    .map((product) => product.id);
  baselineId.value =
    plan.baselineId && selectedIds.value.includes(plan.baselineId)
      ? plan.baselineId
      : null;
  remember();
}
function remember() {
  saveSelection(category.value, selectedProducts.value);
}
function toggle(product: Product) {
  const index = selectedIds.value.indexOf(product.id);
  if (index < 0) selectedIds.value.push(product.id);
  else selectedIds.value.splice(index, 1);
  if (!selectedIds.value.includes(baselineId.value || -1))
    baselineId.value = null;
  Object.keys(hiddenByRow.value).forEach(
    (key) =>
      (hiddenByRow.value[key] =
        hiddenByRow.value[key]?.filter((id) => id !== product.id) || []),
  );
  remember();
}
function toggleLegend(key: string, id: number) {
  const hidden = hiddenByRow.value[key] || [];
  hiddenByRow.value[key] = hidden.includes(id)
    ? hidden.filter((value) => value !== id)
    : [...hidden, id];
}
function selectVisible() {
  selectedIds.value = [
    ...new Set([
      ...selectedIds.value,
      ...filteredProducts.value.map((p) => p.id),
    ]),
  ];
  remember();
}
function clearSelection() {
  selectedIds.value = [];
  hiddenByRow.value = {};
  baselineId.value = null;
  remember();
}
function goToParameters() {
  remember();
  router.push({
    path: `/compare/${category.value}`,
    query: {
      samples: JSON.stringify(
        selectedProducts.value.map(({ id, brand, model }) => ({
          id,
          brand,
          model,
        })),
      ),
    },
  });
}
function initializeSelection() {
  let desired: DeviceIdentity[];
  if (route.query.samples !== undefined)
    desired = readSelection(route.query.samples);
  else if (route.query.selected !== undefined)
    desired = readSelection(route.query.selected, true);
  else desired = loadSelection(category.value);
  selectedIds.value = desired.flatMap((item) => {
    if (typeof item.id === 'number')
      return allProducts.value.some((product) => product.id === item.id)
        ? [item.id]
        : [];
    const matches = allProducts.value.filter(
      (p) => deviceKey(item) === deviceKey(p),
    );
    return matches.length === 1 ? [matches[0]!.id] : [];
  });
  baselineId.value = null;
}
watch(
  () => [route.query.samples, route.query.selected],
  () => {
    if (!loading.value) initializeSelection();
  },
);
async function loadCategory() {
  const version = ++requestVersion,
    key = category.value;
  loading.value = true;
  error.value = '';
  allProducts.value = [];
  configs.value = [];
  headerRows.value = [];
  selectedIds.value = [];
  hiddenByRow.value = {};
  baselineId.value = null;
  search.value = '';
  const [categoryResult, data] = await Promise.all([
    dbApi.getCategories(),
    dbApi.getPowerList(key),
  ]);
  if (version !== requestVersion) return;
  loading.value = false;
  if (!categoryResult.success || !data.success) {
    error.value =
      categoryResult.message || data.message || '测试数据获取失败。';
    return;
  }
  categories.value = categoryResult.data || [];
  const config = categories.value.find((c) => c.key === key);
  categoryName.value = config?.name || key;
  configs.value = (config?.power?.chartConfig || []).map((c, index) => ({
    ...c,
    order: c.order ?? index,
  }));
  allProducts.value = (data.data || []).map((p) => ({
    ...p,
    brand: String(p.brand || ''),
    model: String(p.model || ''),
  }));
  headerRows.value = data.headerRows || [];
  colorMap.value = Object.fromEntries(
    allProducts.value.map((p, i) => [
      p.id,
      palette[i % palette.length] || '#4f46e5',
    ]),
  );
  initializeSelection();
}
function exportCsv() {
  const rows: unknown[][] = [
    [
      '品类',
      '记录ID',
      '品牌',
      '型号',
      '场景',
      '指标',
      '数值',
      '基准值',
      '差值',
      '单位',
      '数据状态',
    ],
  ];
  for (const config of plottedConfigs.value) {
    for (const sample of selectedProducts.value) {
      config.fields.forEach((field, index) => {
        const value = toMeasurement(sample[field]);
        const baselineValue = baselineProduct.value
          ? toMeasurement(baselineProduct.value[field])
          : null;
        rows.push([
          categoryName.value,
          sample.id,
          sample.brand,
          sample.model,
          config.scenario,
          config.labels[index] || field,
          value,
          baselineValue,
          deltaFor(field, value),
          resolveUnit(config),
          value === null ? '未测量或无效' : '有效',
        ]);
      });
    }
  }
  const url = URL.createObjectURL(
    new Blob(
      ['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    ),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${category.value}-功耗记录.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
watch(category, loadCategory, { immediate: true });
onMounted(loadSavedPlans);
</script>

<template>
  <div class="power-page">
    <div class="page-inner">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/home">首页</RouterLink><span>/</span><b>功耗分析</b>
      </nav>
      <header class="page-header">
        <div>
          <div class="page-kicker">内部测试 · 场景数据对比</div>
          <h1>{{ categoryName || '设备' }}功耗分析</h1>
          <p>
            选择测试对象，对照同一场景的测量数据。数值高低不自动解释为性能优劣。
          </p>
        </div>
        <button class="lab-button" @click="goToParameters">
          设备参数对照 →
        </button>
      </header>
      <div class="lab-toolbar category-toolbar">
        <label
          >测试品类
          <select
            :value="category"
            @change="
              router.push(
                '/power/' + ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option v-for="cat in categories" :key="cat.key" :value="cat.key">
              {{ cat.name }}
            </option>
          </select></label
        >
        <span>单位：{{ unitOverview }}</span>
        <label class="baseline-control">
          基准对象
          <select
            :value="baselineId ?? ''"
            @change="
              baselineId = ($event.target as HTMLSelectElement).value
                ? Number(($event.target as HTMLSelectElement).value)
                : null
            "
          >
            <option value="">不设置基准</option>
            <option
              v-for="product in selectedProducts"
              :key="product.id"
              :value="product.id"
            >
              {{ productLabel(product) }}
            </option>
          </select>
        </label>
        <div class="plan-controls">
          <input
            v-model="analysisName"
            type="text"
            maxlength="40"
            placeholder="分析方案名称"
            aria-label="分析方案名称"
          />
          <button
            class="lab-button"
            :disabled="!selectedProducts.length"
            @click="saveAnalysisPlan"
          >
            保存方案
          </button>
          <select
            aria-label="恢复分析方案"
            @change="
              restoreAnalysisPlan(($event.target as HTMLSelectElement).value);
              ($event.target as HTMLSelectElement).value = '';
            "
          >
            <option value="">恢复方案</option>
            <option
              v-for="plan in savedPlans.filter(
                (item) => item.category === category,
              )"
              :key="plan.id"
              :value="plan.id"
            >
              {{ plan.name }}
            </option>
          </select>
        </div>
        <button
          class="lab-button"
          :disabled="!selectedProducts.length || !plottedConfigs.length"
          @click="exportCsv"
        >
          导出当前对象 CSV
        </button>
      </div>
      <div v-if="error" class="lab-status error" role="alert">
        <span>{{ error }}</span
        ><button @click="loadCategory">重试</button>
      </div>
      <div v-else-if="loading" class="lab-status" role="status">
        正在获取功耗记录与场景配置…
      </div>
      <template v-else>
        <section class="panel selection-panel" aria-label="测试对象选择">
          <div class="section-heading">
            <div>
              <h2>测试对象</h2>
              <p>
                共 {{ allProducts.length }} 个对象，已选
                {{ selectedProducts.length }} 个。
              </p>
            </div>
            <div class="lab-toolbar">
              <label
                ><span class="visually-hidden">搜索品牌或型号</span
                ><input
                  v-model="search"
                  type="search"
                  placeholder="搜索品牌或型号" /></label
              ><button
                class="lab-button"
                :disabled="!filteredProducts.length"
                @click="selectVisible"
              >
                选择筛选结果</button
              ><button
                class="lab-button"
                :disabled="!selectedIds.length"
                @click="clearSelection"
              >
                清空
              </button>
            </div>
          </div>
          <div v-if="filteredProducts.length" class="sample-grid">
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="sample-button"
              :class="{ selected: selectedIds.includes(product.id) }"
              :aria-pressed="selectedIds.includes(product.id)"
              @click="toggle(product)"
            >
              <span
                class="sample-check"
                :style="{
                  borderColor: color(product),
                  background: selectedIds.includes(product.id)
                    ? color(product)
                    : 'transparent',
                }"
                >{{ selectedIds.includes(product.id) ? '✓' : '' }}</span
              ><span
                ><small>{{ product.brand }}</small
                ><strong>{{ product.model }}</strong>
                <small
                  v-if="
                    allProducts.filter(
                      (p) =>
                        p.brand === product.brand && p.model === product.model,
                    ).length > 1
                  "
                  >记录 #{{ product.id }}</small
                ></span
              >
            </button>
          </div>
          <p v-else class="lab-help">
            {{
              allProducts.length
                ? '没有匹配的测试对象，请调整关键词。'
                : '该品类暂无功耗记录。'
            }}
          </p>
          <p
            v-if="new Set(allProducts.map(deviceKey)).size < allProducts.length"
            class="lab-help"
          >
            存在同品牌、同型号的多条记录；请按记录编号逐条选择。同名记录不会自动恢复选择。
          </p>
          <details v-if="headerRows.length" class="source-headers">
            <summary>查看导入表头信息</summary>
            <div class="table-scroll">
              <table>
                <tbody>
                  <tr v-for="(row, i) in headerRows" :key="i">
                    <th scope="row">{{ row[0]?.label }}</th>
                    <td v-for="(cell, j) in row.slice(1)" :key="j">
                      {{ displayValue(cell.value) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <div v-if="!selectedProducts.length" class="lab-status empty">
          请选择至少一个测试对象，查看对应场景图表。
        </div>
        <div v-else-if="!plottedConfigs.length" class="lab-status empty">
          该品类尚未配置可绘制场景，请检查导入文件中的场景配置。
        </div>
        <section v-else class="charts-section" aria-label="功耗场景图表">
          <div class="analysis-note">
            <span>数据读取规则</span>
            <p>
              保留真实 0
              值；缺失或无效测量值显示为“—”。各场景使用各自标注的单位，导入备注与原始数值独立展示。
            </p>
          </div>
          <section
            v-for="(card, cardIndex) in cards"
            :key="cardIndex"
            class="panel chart-card"
          >
            <h2>{{ card.title }}</h2>
            <div v-for="row in card.rows" :key="row.key" class="chart-row">
              <div class="legend-container" aria-label="显示或隐藏测试对象">
                <button
                  v-for="product in selectedProducts"
                  :key="product.id"
                  class="legend-item"
                  :class="{
                    inactive: hiddenByRow[row.key]?.includes(product.id),
                  }"
                  :aria-pressed="!hiddenByRow[row.key]?.includes(product.id)"
                  @click="toggleLegend(row.key, product.id)"
                >
                  <span
                    class="legend-color"
                    :style="{ background: color(product) }"
                  ></span
                  >{{ productLabel(product) }}
                </button>
              </div>
              <div
                class="row-charts"
                :class="{ 'row-charts--single': card.summary }"
              >
                <template
                  v-for="(config, configIndex) in row.items"
                  :key="configIndex"
                  ><PowerChart
                    v-if="isPlot(config)"
                    :config="config"
                    :samples="samplesFor(row)"
                    :unit="resolveUnit(config)"
                    :baseline-id="baselineId" />
                  <div v-else class="chart-placeholder" aria-hidden="true"></div
                ></template>
              </div>
            </div>
          </section>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.power-page {
  min-height: 100%;
  padding: 32px 24px 72px;
  background: var(--lab-canvas);
  color: var(--lab-ink);
}
.page-inner {
  max-width: 1320px;
  margin: auto;
}
.breadcrumb {
  display: flex;
  gap: 10px;
  color: #52637c;
  font-size: 13px;
  margin-bottom: 26px;
}
.breadcrumb a {
  color: #52637c;
  text-decoration: none;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.page-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #655ad0;
  font-weight: 650;
}
h1 {
  font-size: 36px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  margin: 10px 0;
  font-weight: 650;
}
.page-header p {
  font-size: 14px;
  line-height: 1.7;
  color: #52637c;
  margin: 0;
}
.category-toolbar {
  margin-bottom: 20px;
}
.category-toolbar label {
  font-size: 14px;
  font-weight: 600;
}
.category-toolbar select {
  margin-left: 10px;
  border: 1px solid #d2d9e7;
  border-radius: 9px;
  padding: 10px 14px;
  background: #fff;
  color: #203451;
}
.category-toolbar > span {
  font-size: 13px;
  color: #52637c;
  margin-right: auto;
}
.baseline-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #52637c;
  font-size: 13px;
  white-space: nowrap;
}
.baseline-control select,
.plan-controls select,
.plan-controls input {
  border: 1px solid #d2d9e7;
  border-radius: 9px;
  padding: 9px 10px;
  background: #fff;
  color: #203451;
  font-size: 13px;
  max-width: 220px;
}
.plan-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.panel {
  padding: 24px;
  border: 1px solid var(--lab-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px #233c6407;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}
h2 {
  font-size: 20px;
  font-weight: 650;
  margin: 0;
  color: #203451;
}
.section-heading p {
  margin: 7px 0 0;
  font-size: 14px;
  color: #52637c;
}
.sample-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.sample-button {
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  border: 1px solid #dfe6ef;
  border-radius: 12px;
  background: #fafbfd;
  padding: 16px;
  cursor: pointer;
  color: #203451;
  min-height: 80px;
}
.sample-button.selected {
  border-color: #b4acf7;
  background: #f5f3ff;
}
.sample-button small {
  display: block;
  color: #52637c;
  font-size: 12px;
  margin-bottom: 5px;
}
.sample-button strong {
  display: block;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.sample-check {
  border: 1.5px solid;
  width: 21px;
  height: 21px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 13px;
  color: #fff;
}
.source-headers {
  margin-top: 20px;
  color: #52637c;
  font-size: 13px;
}
.source-headers summary {
  cursor: pointer;
}
.table-scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  min-width: 100%;
  margin-top: 10px;
}
th,
td {
  padding: 10px 14px;
  border-bottom: 1px solid #e6ebf2;
  text-align: left;
  white-space: nowrap;
}
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 24px;
}
.analysis-note {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 2px 4px;
}
.analysis-note > span {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 650;
  color: #4038b5;
}
.analysis-note p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #52637c;
}
.chart-card h2 {
  margin-bottom: 18px;
}
.chart-row + .chart-row {
  margin-top: 24px;
}
.legend-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 14px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe6ef;
  border-radius: 9px;
  background: #fff;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #334963;
}
.legend-item.inactive {
  text-decoration: line-through;
  opacity: 0.55;
}
.legend-color {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
}
.row-charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.row-charts--single {
  grid-template-columns: 1fr;
}
.empty {
  margin-top: 20px;
  min-height: 180px;
  justify-content: center;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 850px) {
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .row-charts {
    grid-template-columns: 1fr;
  }
  .chart-placeholder {
    display: none;
  }
}
@media (max-width: 600px) {
  .power-page {
    padding: 22px 16px 50px;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  h1 {
    font-size: 28px;
  }
  .panel {
    padding: 18px;
  }
  .analysis-note {
    display: block;
  }
  .sample-grid {
    grid-template-columns: 1fr;
  }
  .lab-toolbar input {
    min-width: 0;
    width: 100%;
  }
}
</style>
