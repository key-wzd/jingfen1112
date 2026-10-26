<template>
  <div class="compare-page">
    <div class="page-inner">
      <div class="breadcrumb">
        <button @click="router.push('/home')">首页</button><span>/</span
        ><b>参数对比</b>
      </div>
      <div class="page-header">
        <div>
          <div class="page-kicker">设备参数对照</div>
          <h2 class="page-title">{{ categoryName || '产品' }}参数对比</h2>
          <p class="page-desc">
            选择测试对象，核对设备配置；功耗分析可直接从首页品类进入。
          </p>
        </div>
        <div class="selection-counter">
          <strong>{{ selectedProducts.length }}</strong
          ><span>/ 4<br />已选择</span>
        </div>
      </div>

      <div class="compare-steps">
        <div class="step active"><b>01</b><span>选择对象</span></div>
        <i></i>
        <div class="step" :class="{ active: hasSelectedProducts }">
          <b>02</b><span>对比参数</span>
        </div>
        <i></i>
        <div class="step" :class="{ active: hasSelectedProducts }">
          <b>03</b><span>查看功耗</span>
        </div>
      </div>

      <section class="product-selection panel">
        <div class="panel-heading">
          <div>
            <div class="panel-kicker">测试对象</div>
            <h3>选择测试对象</h3>
          </div>
          <span class="panel-tip">最多对照 4 个测试对象</span>
        </div>
        <div v-if="error" class="lab-status error" role="alert">
          <span>{{ error }}</span
          ><button @click="loadCategory">重试</button>
        </div>
        <div v-else-if="loading" class="lab-status" role="status">
          正在获取设备信息…
        </div>
        <p v-else-if="!allData.length" class="lab-help">
          当前品类暂无设备参数，可从首页进入功耗分析。
        </p>
        <p v-if="selectionError" class="lab-error" role="alert">
          {{ selectionError }}
        </p>
        <div v-if="!error && !loading && allData.length" class="selection-grid">
          <div
            v-for="(product, index) in products"
            :key="index"
            class="product-selector"
            :class="{ filled: product.brand && product.model }"
          >
            <div class="selector-header">
              <span class="selector-number">0{{ index + 1 }}</span
              ><label>对象 {{ index + 1 }}</label
              ><button
                v-if="products.length > 2"
                class="remove-btn"
                aria-label="移除测试对象"
                @click="removeProduct(index)"
              >
                ×
              </button>
            </div>
            <div class="selector-field">
              <label>品牌</label
              ><select
                :value="product.brand"
                @change="
                  handleBrandChange(
                    index,
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="">选择品牌</option>
                <option v-for="brand in brands" :key="brand" :value="brand">
                  {{ brand }}
                </option>
              </select>
            </div>
            <div class="selector-field">
              <label>型号</label
              ><select
                :value="product.model"
                :disabled="!product.brand"
                @change="
                  handleModelChange(
                    index,
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="">
                  {{ product.brand ? '选择型号' : '先选择品牌' }}
                </option>
                <option
                  v-for="model in getModelsByBrand(product.brand)"
                  :key="model"
                  :value="model"
                  :disabled="isTaken(index, product.brand, model)"
                >
                  {{ model }}
                </option>
              </select>
            </div>
            <div v-if="product.brand && product.model" class="selector-ready">
              <span>✓</span> 已加入对比
            </div>
          </div>
          <button
            v-if="products.length < 4"
            class="add-product"
            @click="addProduct"
          >
            <span class="add-icon">+</span><strong>添加对象</strong
            ><small>加入另一个测试对象</small>
          </button>
        </div>
      </section>

      <section v-if="hasSelectedProducts" class="product-comparison panel">
        <div class="panel-heading">
          <div>
            <div class="panel-kicker">设备参数</div>
            <h3>参数对比结果</h3>
          </div>
          <span class="panel-tip"
            >{{ selectedProducts.length }} 个测试对象</span
          >
        </div>
        <label class="difference-filter"
          ><input
            v-model="differencesOnly"
            type="checkbox"
            :disabled="selectedProducts.length < 2"
          />仅显示差异参数</label
        >
        <p v-if="differencesOnly && !visibleFields.length" class="lab-help">
          当前对象的可比较参数一致。
        </p>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="param-col">参数</th>
                <th v-for="(p, i) in selectedProducts" :key="i">
                  <div class="product-header">
                    <img
                      v-if="p.image"
                      :src="getImageUrl(p.image)"
                      class="product-thumb"
                      :alt="`${p.brand} ${p.model}`"
                    />
                    <div>
                      <strong>{{ p.brand }}</strong
                      ><span>{{ p.model }}</span>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in visibleFields" :key="field.key">
                <td class="param-col">{{ field.label }}</td>
                <td v-for="(p, i) in selectedProducts" :key="i">
                  <template v-if="field.key === 'image'"
                    ><img
                      v-if="p.image"
                      :src="getImageUrl(p.image)"
                      class="compare-image"
                      :alt="`${p.brand} ${p.model}`"
                    /><span v-else class="muted-value">暂无图片</span></template
                  ><template v-else
                    ><span>{{ displayValue(p[field.key]) }}</span></template
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="power-btn-wrap">
          <div>
            <strong>查看场景功耗数据</strong
            ><span>保留当前对象，切换至功耗分析。</span>
          </div>
          <button class="power-btn" @click="goToPowerCompare">
            进入功耗对比 <span>↗</span>
          </button>
        </div>
      </section>

      <section v-else-if="!loading && !error" class="no-products panel">
        <div class="empty-orbit">+</div>
        <h3>先选择两个测试对象</h3>
        <p>选择品牌与型号后显示设备参数，数值 0 会如实保留。</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { dbApi, getImageUrl } from '#/api/db';
import {
  deviceKey,
  displayValue,
  loadSelection,
  readSelection,
  saveSelection,
  type DeviceIdentity,
} from '#/utils/measurements';
const router = useRouter();
const route = useRoute();
const category = computed(() => String(route.params.category || ''));
const categoryName = ref('');
const displayFields = ref<{ key: string; label: string }[]>([]);
const allData = ref<Record<string, any>[]>([]);
const products = ref<DeviceIdentity[]>([
  { brand: '', model: '' },
  { brand: '', model: '' },
]);
const loading = ref(false),
  error = ref(''),
  selectionError = ref(''),
  differencesOnly = ref(false);
let requestVersion = 0;
const brands = computed(() =>
  [...new Set(allData.value.map((row) => String(row.brand || '')))].filter(
    Boolean,
  ),
);
const getModelsByBrand = (brand: string) => [
  ...new Set(
    allData.value
      .filter((row) => row.brand === brand)
      .map((row) => String(row.model || '')),
  ),
];
const selectedProducts = computed(() =>
  products.value.flatMap((product) => {
    const matches = allData.value.filter((row) =>
      typeof product.id === 'number'
        ? row.id === product.id
        : row.brand === product.brand && row.model === product.model,
    );
    return matches.length === 1 ? matches : [];
  }),
);
const hasSelectedProducts = computed(() => selectedProducts.value.length > 0);
const visibleFields = computed(() =>
  displayFields.value.filter(
    (field) =>
      !differencesOnly.value ||
      selectedProducts.value.length < 2 ||
      new Set(selectedProducts.value.map((row) => displayValue(row[field.key])))
        .size > 1,
  ),
);
const isTaken = (index: number, brand: string, model: string) =>
  products.value.some(
    (p, i) => i !== index && p.brand === brand && p.model === model,
  );
function remember() {
  saveSelection(
    category.value,
    products.value.filter((p) => p.model),
  );
}
function handleBrandChange(index: number, brand: string) {
  products.value[index] = { brand, model: '' };
  selectionError.value = '';
  remember();
}
function handleModelChange(index: number, model: string) {
  const brand = products.value[index]?.brand || '';
  if (
    allData.value.filter((row) => row.brand === brand && row.model === model)
      .length > 1
  ) {
    selectionError.value =
      '该品牌与型号存在多条参数记录，请到功耗分析中按记录编号选择对象。';
    return;
  }
  if (isTaken(index, brand, model)) {
    selectionError.value = '该测试对象已加入，请选择其他型号。';
    return;
  }
  products.value[index] = { brand, model };
  selectionError.value = '';
  remember();
}
function addProduct() {
  if (products.value.length < 4) products.value.push({ brand: '', model: '' });
}
function removeProduct(index: number) {
  if (products.value.length > 2) products.value.splice(index, 1);
  remember();
}
function goToPowerCompare() {
  remember();
  router.push({
    path: `/power/${category.value}`,
    query: { samples: JSON.stringify(products.value.filter((p) => p.model)) },
  });
}
async function loadCategory() {
  const version = ++requestVersion;
  const key = category.value;
  loading.value = true;
  error.value = '';
  allData.value = [];
  categoryName.value = '';
  displayFields.value = [];
  selectionError.value = '';
  const [config, data] = await Promise.all([
    dbApi.getCategories(),
    dbApi.getInfoList(key),
  ]);
  if (version !== requestVersion) return;
  loading.value = false;
  if (!config.success || !data.success) {
    error.value = config.message || data.message || '设备信息加载失败。';
    return;
  }
  const cat = config.data?.find((c) => c.key === key);
  categoryName.value = cat?.name || key;
  allData.value = data.data || [];
  const fields = cat?.info?.fields || [];
  displayFields.value = fields.flatMap((field, index) =>
    ['brand', 'model'].includes(field)
      ? []
      : [{ key: field, label: cat?.info?.cnFields?.[index] || field }],
  );
  const desired =
    route.query.samples !== undefined
      ? readSelection(route.query.samples)
      : loadSelection(key);
  const valid = desired
    .filter((p) =>
      allData.value.some((row) =>
        typeof p.id === 'number'
          ? row.id === p.id
          : deviceKey({
              brand: String(row.brand || ''),
              model: String(row.model || ''),
            }) === deviceKey(p),
      ),
    )
    .slice(0, 4);
  products.value = [...valid];
  while (products.value.length < 2)
    products.value.push({ brand: '', model: '' });
}
watch(category, loadCategory, { immediate: true });
</script>

<style scoped>
.compare-page {
  min-height: 100%;
  padding: 38px 24px 100px;
  background: #f4f7fb;
}
.page-inner {
  max-width: 1180px;
  margin: 0 auto;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
  color: #9aa6b8;
  font-size: 11px;
}
.breadcrumb button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #718096;
  cursor: pointer;
  font-size: 11px;
}
.page-kicker,
.panel-kicker {
  color: #716bdf;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
.page-title {
  margin: 10px 0 8px;
  color: #19263d;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1;
  letter-spacing: -0.06em;
}
.page-desc {
  margin: 0;
  color: #8d9aab;
  font-size: 13px;
}
.selection-counter {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 15px;
  border: 1px solid #e3e8f1;
  border-radius: 12px;
  background: #fff;
  color: #8d9aab;
  font-size: 10px;
  line-height: 1.4;
  text-align: left;
}
.selection-counter strong {
  color: #4f46e5;
  font-size: 31px;
  letter-spacing: -0.06em;
}
.compare-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  color: #a5b0bf;
  font-size: 11px;
}
.compare-steps i {
  display: block;
  width: 46px;
  height: 1px;
  background: #dfe5ed;
}
.step {
  display: flex;
  align-items: center;
  gap: 7px;
}
.step b {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e8ecf3;
  color: #8390a1;
  font-size: 9px;
}
.step.active {
  color: #4f46e5;
  font-weight: 700;
}
.step.active b {
  background: #4f46e5;
  color: #fff;
}
.panel {
  border: 1px solid #e4eaf2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(31, 52, 84, 0.05);
}
.product-selection {
  padding: 26px;
  margin-bottom: 18px;
}
.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.panel-heading h3 {
  margin: 8px 0 0;
  color: #27364e;
  font-size: 20px;
  letter-spacing: -0.04em;
}
.panel-tip {
  color: #a1adbc;
  font-size: 11px;
}
.selection-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.product-selector {
  min-height: 230px;
  padding: 17px;
  border: 1px solid #e5eaf1;
  border-radius: 14px;
  background: #f8fafc;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}
.product-selector.filled {
  border-color: #bbb7fb;
  background: #f8f7ff;
}
.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 19px;
}
.selector-header label {
  flex: 1;
  color: #31415a;
  font-size: 12px;
  font-weight: 800;
}
.selector-number {
  color: #a1acbd;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.remove-btn {
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: #adb7c4;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}
.remove-btn:hover {
  color: #cc4560;
}
.selector-field {
  margin-bottom: 12px;
}
.selector-field label {
  display: block;
  margin-bottom: 6px;
  color: #8997aa;
  font-size: 10px;
  font-weight: 700;
}
.selector-field select {
  width: 100%;
  padding: 10px 11px;
  border: 1px solid #e1e7ef;
  border-radius: 9px;
  outline: 0;
  background: #fff;
  color: #31415a;
  font-size: 12px;
  cursor: pointer;
}
.selector-field select:focus {
  border-color: #837df0;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
.selector-field select:disabled {
  cursor: not-allowed;
  background: #f1f3f7;
  color: #a6b0bf;
}
.selector-ready {
  color: #139579;
  font-size: 10px;
  font-weight: 800;
}
.selector-ready span {
  margin-right: 5px;
}
.add-product {
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #c7c6f6;
  border-radius: 14px;
  background: #fbfaff;
  color: #544ed1;
  cursor: pointer;
  transition: all 0.2s ease;
}
.add-product:hover {
  border-color: #716bdf;
  background: #f4f2ff;
  transform: translateY(-2px);
}
.add-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eae8ff;
  font-size: 22px;
}
.add-product strong {
  font-size: 12px;
}
.add-product small {
  color: #a09bdc;
  font-size: 10px;
}
.product-comparison {
  padding: 26px;
}
.comparison-table-wrap {
  overflow-x: auto;
}
.comparison-table {
  width: 100%;
  min-width: 660px;
  border-collapse: collapse;
}
.comparison-table th,
.comparison-table td {
  padding: 16px 15px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  color: #506079;
  font-size: 12px;
}
.comparison-table th {
  background: #fafbfc;
  color: #2d3d55;
  font-weight: 700;
}
.comparison-table tbody tr:hover td {
  background: #fbfcff;
}
.param-col {
  width: 150px;
  color: #8491a3 !important;
  font-weight: 700;
}
.product-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 130px;
}
.product-header img {
  flex: 0 0 auto;
}
.product-header div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.product-header strong {
  color: #4f46e5;
  font-size: 10px;
}
.product-header span {
  color: #2d3d55;
  font-weight: 800;
}
.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #e7eaf1;
}
.compare-image {
  width: 60px;
  height: 46px;
  object-fit: contain;
  border: 1px solid #e7eaf1;
  border-radius: 8px;
}
.muted-value {
  color: #bcc4cf;
}
.comparison-table td strong {
  color: #263a59;
}
.power-btn-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
}
.power-btn-wrap > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.power-btn-wrap strong {
  color: #2c3a52;
  font-size: 12px;
}
.power-btn-wrap span {
  color: #98a4b3;
  font-size: 11px;
}
.power-btn {
  padding: 12px 18px;
  border: 0;
  border-radius: 11px;
  background: #4f46e5;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 9px 20px rgba(79, 70, 229, 0.22);
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}
.power-btn span {
  margin-left: 16px;
  color: #fff;
  font-size: 16px;
}
.power-btn:hover {
  background: #3e35c4;
  transform: translateY(-2px);
}
.no-products {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px;
  text-align: center;
}
.empty-orbit {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border: 1px dashed #b3b0f2;
  border-radius: 50%;
  color: #716bdf;
  font-size: 23px;
}
.no-products h3 {
  margin: 0 0 8px;
  color: #2d3d55;
  font-size: 17px;
}
.no-products p {
  margin: 0;
  color: #99a5b4;
  font-size: 12px;
}
@media (max-width: 980px) {
  .selection-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 620px) {
  .compare-page {
    padding: 25px 16px 70px;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .selection-counter {
    align-self: flex-start;
  }
  .compare-steps {
    gap: 7px;
  }
  .compare-steps i {
    width: 20px;
  }
  .product-selection,
  .product-comparison {
    padding: 18px;
  }
  .selection-grid {
    grid-template-columns: 1fr;
  }
  .product-selector,
  .add-product {
    min-height: 0;
  }
  .product-selector {
    padding: 15px;
  }
  .add-product {
    min-height: 130px;
  }
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .power-btn-wrap {
    align-items: flex-start;
    flex-direction: column;
  }
  .power-btn {
    width: 100%;
  }
}

.page-desc,
.selector-field label,
.panel-tip,
.comparison-table th,
.comparison-table td,
.no-products p {
  font-size: 14px;
  color: #52637c;
  line-height: 1.6;
}
.selector-field select {
  font-size: 14px;
}
.difference-filter {
  display: flex;
  gap: 9px;
  margin-bottom: 18px;
  align-items: center;
  font-size: 14px;
  color: #40516b;
}
.param-col {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fafbfc;
}
.selection-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
</style>
