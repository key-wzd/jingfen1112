<template>
  <div class="compare-page">
    <div class="page-inner">
      <div class="page-header">
        <h2 class="page-title">{{ categoryName }}参数对比</h2>
        <p class="page-desc">选择产品进行参数对比，对比完成后可进入功耗对比</p>
      </div>

      <section class="product-selection">
        <h3>选择对比产品</h3>
        <div class="selection-grid">
          <div
            v-for="(product, index) in products"
            :key="index"
            class="product-selector"
          >
            <div class="selector-header">
              <label>产品 {{ index + 1 }}</label>
              <button
                v-if="products.length > 2"
                class="remove-btn"
                @click="removeProduct(index)"
              >✕</button>
            </div>
            <div class="selector-field">
              <label>品牌</label>
              <select
                :value="product.brand"
                @change="handleBrandChange(index, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">选择品牌</option>
                <option v-for="brand in brands" :key="brand" :value="brand">{{ brand }}</option>
              </select>
            </div>
            <div class="selector-field">
              <label>型号</label>
              <select
                :value="product.model"
                @change="handleModelChange(index, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">选择型号</option>
                <option v-for="model in getModelsByBrand(product.brand)" :key="model" :value="model">{{ model }}</option>
              </select>
            </div>
          </div>
          <div v-if="products.length < 4" class="add-product" @click="addProduct">
            <span class="add-icon">+</span>
            <p>添加产品</p>
          </div>
        </div>
      </section>

      <section v-if="hasSelectedProducts" class="product-comparison">
        <h3>参数对比结果</h3>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="param-col">参数</th>
                <th v-for="(p, i) in selectedProducts" :key="i">
                  <div class="product-header">
                    <img v-if="p.image" :src="getImageUrl(p.image)" class="product-thumb" />
                    <span>{{ p.brand }} {{ p.model }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in displayFields" :key="field.key">
                <td class="param-col">{{ field.label }}</td>
                <td v-for="(p, i) in selectedProducts" :key="i">
                  <template v-if="field.key === 'image'">
                    <img v-if="p.image" :src="getImageUrl(p.image)" class="compare-image" />
                    <span v-else>-</span>
                  </template>
                  <template v-else>
                    {{ p[field.key] || '-' }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="power-btn-wrap">
          <button class="power-btn" @click="goToPowerCompare">
            进入功耗对比 →
          </button>
        </div>
      </section>

      <section v-else class="no-products">
        <div class="empty-state">
          <p>请至少选择两款产品进行参数对比</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { dbApi, getImageUrl } from '#/api/db';

const router = useRouter();
const route = useRoute();

const category = computed(() => route.params.category as string);

const categoryName = ref('');
const displayFields = ref<{ key: string; label: string; type?: string }[]>([]);

const brands = ref<string[]>([]);
const allData = ref<any[]>([]);
const brandModels = ref<Map<string, string[]>>(new Map());

const products = ref([
  { brand: '', model: '' },
  { brand: '', model: '' },
]);

const selectedProducts = computed(() => {
  return products.value
    .filter(p => p.brand && p.model)
    .map(p => {
      const item = allData.value.find(d => d.brand === p.brand && d.model === p.model);
      return item || p;
    });
});

const hasSelectedProducts = computed(() => selectedProducts.value.length >= 2);

const loadCategoryConfig = async () => {
  const result = await dbApi.getCategories();
  if (result.success && result.data) {
    const catInfo = result.data.find((c: any) => c.key === category.value);
    if (catInfo) {
      categoryName.value = catInfo.name;
      const fields: string[] = catInfo.info?.fields || [];
      const cnFields: string[] = catInfo.info?.cnFields || [];
      displayFields.value = fields
        .filter((f: string) => f !== 'brand' && f !== 'model')
        .map((f: string) => {
          const fieldIndex = fields.indexOf(f);
          return { key: f, label: cnFields[fieldIndex] || f, type: f === 'image' ? 'image' : undefined };
        });
    }
  }
};

const loadData = async () => {
  const result = await dbApi.getInfoList(category.value);
  if (result.success && result.data) {
    allData.value = result.data;
    const modelMap = new Map<string, string[]>();
    const brandSet = new Set<string>();

    result.data.forEach((item: any) => {
      brandSet.add(item.brand);
      if (!modelMap.has(item.brand)) {
        modelMap.set(item.brand, []);
      }
      modelMap.get(item.brand)!.push(item.model);
    });

    brands.value = Array.from(brandSet);
    brandModels.value = modelMap;
  }
};

const getModelsByBrand = (brand: string) => {
  if (!brand) return [];
  return brandModels.value.get(brand) || [];
};

const handleBrandChange = (index: number, brand: string) => {
  products.value[index] = { ...products.value[index], brand, model: '' };
};

const handleModelChange = (index: number, model: string) => {
  products.value[index] = { brand: products.value[index]?.brand || '', model };
};

const addProduct = () => {
  if (products.value.length < 4) {
    products.value.push({ brand: '', model: '' });
  }
};

const removeProduct = (index: number) => {
  if (products.value.length > 2) {
    products.value.splice(index, 1);
  }
};

const goToPowerCompare = () => {
  const selected = selectedProducts.value.map(p => `${p.brand}::${p.model}`).join(',');
  router.push(`/power/${category.value}?selected=${encodeURIComponent(selected)}`);
};

watch(category, () => {
  products.value = [{ brand: '', model: '' }, { brand: '', model: '' }];
  categoryName.value = '';
  displayFields.value = [];
  loadCategoryConfig();
  loadData();
});

onMounted(() => {
  loadCategoryConfig();
  loadData();
});
</script>

<style scoped>
.compare-page {
  padding: 32px 24px;
}

.page-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 1.8rem;
  color: #333;
  margin: 0 0 8px;
}

.page-desc {
  color: #999;
  margin: 0;
  font-size: 0.95rem;
}

.product-selection {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.product-selection h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
}

.selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.product-selector {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selector-header label {
  font-weight: 500;
  color: #333;
}

.remove-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 6px;
}

.selector-field {
  margin-bottom: 12px;
}

.selector-field label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 4px;
}

.selector-field select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  color: #333;
}

.selector-field select option {
  color: #333;
  background: white;
}

.selector-field select:focus {
  outline: none;
  border-color: #667eea;
}

.add-product {
  background: #f0f2ff;
  border: 2px dashed #c5caff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 140px;
}

.add-product:hover {
  border-color: #667eea;
  background: #e8ebff;
}

.add-icon {
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 4px;
}

.add-product p {
  color: #667eea;
  margin: 0;
  font-size: 0.9rem;
}

.product-comparison {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.product-comparison h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
}

.comparison-table-wrap {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
  color: #333;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.param-col {
  width: 120px;
  color: #666;
  font-weight: 500;
}

.product-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}

.compare-image {
  max-width: 120px;
  max-height: 80px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #eee;
}

.power-btn-wrap {
  text-align: center;
  margin-top: 24px;
}

.power-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.power-btn:hover {
  opacity: 0.9;
}

.no-products {
  background: white;
  border-radius: 12px;
  padding: 60px 24px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.empty-state p {
  color: #999;
  font-size: 1rem;
  margin: 0;
}

@media (max-width: 768px) {
  .selection-grid {
    grid-template-columns: 1fr;
  }
}
</style>
