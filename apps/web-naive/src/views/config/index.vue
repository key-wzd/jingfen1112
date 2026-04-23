<template>
  <div class="config-page">
    <div class="page-inner">
      <div class="page-header">
        <h2 class="page-title">数据管理</h2>
        <p class="page-desc">管理产品数据，支持Excel导入和模板下载</p>
      </div>

      <section class="import-section">
        <h3>数据导入</h3>
        <div class="import-area">
          <div class="template-download">
            <p>请使用标准模板填写数据后上传：</p>
            <button class="btn btn-outline" @click="downloadTemplate">
              下载模板 (gh.xlsx)
            </button>
          </div>
          <div class="file-upload">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleFileChange"
            />
            <button class="btn btn-primary" @click="($refs.fileInput as HTMLInputElement).click()">
              选择Excel文件
            </button>
            <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
            <button
              v-if="selectedFile"
              class="btn btn-success"
              :disabled="uploading"
              @click="handleUpload"
            >
              {{ uploading ? '上传中...' : '确认导入' }}
            </button>
          </div>
        </div>
        <div v-if="uploadResult" class="upload-result" :class="uploadResult.success ? 'success' : 'error'">
          {{ uploadResult.message }}
        </div>
      </section>

      <section class="data-section">
        <h3>数据概览</h3>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="categories.length === 0" class="empty">暂无数据</div>
        <div v-else class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.key"
            class="tab-btn"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            {{ cat.name }}
          </button>
        </div>

        <div v-if="activeCategoryData" class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in activeCategoryData.displayColumns" :key="col.key">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in activeCategoryData.data" :key="i">
                <td v-for="col in activeCategoryData.displayColumns" :key="col.key">
                  {{ row[col.key] ?? '-' }}
                </td>
              </tr>
              <tr v-if="activeCategoryData.data.length === 0">
                <td :colspan="activeCategoryData.displayColumns.length" class="center-cell">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { dbApi, type CategoryInfo, type AllDataResponse } from '#/api/db';

const loading = ref(false);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const categories = ref<CategoryInfo[]>([]);
const allData = ref<AllDataResponse>({});
const activeCategory = ref('');

const activeCategoryData = computed(() => {
  if (!activeCategory.value || !allData.value[activeCategory.value]) return null;
  return allData.value[activeCategory.value];
});

const loadData = async () => {
  loading.value = true;
  const [catResult, dataResult] = await Promise.all([
    dbApi.getCategories(),
    dbApi.getAllData(),
  ]);

  if (catResult.success && catResult.data) {
    categories.value = catResult.data;
    if (categories.value.length > 0 && !activeCategory.value) {
      activeCategory.value = categories.value[0].key;
    }
  }

  if (dataResult.success && dataResult.data) {
    allData.value = dataResult.data;
  }

  loading.value = false;
};

const downloadTemplate = () => {
  dbApi.downloadAllTemplate();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
    uploadResult.value = null;
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  uploading.value = true;
  uploadResult.value = null;

  const result = await dbApi.importAllSheets(selectedFile.value);

  uploading.value = false;

  if (result.success) {
    uploadResult.value = {
      success: true,
      message: `导入成功！成功 ${result.successCount || 0} 条，失败 ${result.failCount || 0} 条`,
    };
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    await loadData();
  } else {
    uploadResult.value = {
      success: false,
      message: result.message || '导入失败，请检查文件格式',
    };
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.config-page {
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

.import-section,
.data-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.import-section h3,
.data-section h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
}

.import-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-download {
  display: flex;
  align-items: center;
  gap: 12px;
}

.template-download p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.file-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-size: 0.9rem;
  color: #333;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover {
  background: #f0f2ff;
}

.btn-success {
  background: #28a745;
  color: white;
  border: none;
}

.btn-success:hover {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-result {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.upload-result.success {
  background: #d4edda;
  color: #155724;
}

.upload-result.error {
  background: #f8d7da;
  color: #721c24;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.3s;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.data-table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #eee;
  color: #333;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.center-cell {
  text-align: center;
  color: #999;
}
</style>
