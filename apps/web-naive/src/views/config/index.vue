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
            <button class="btn btn-outline" @click="downloadTemplate">下载模板</button>
          </div>
          <div class="file-upload">
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleFileChange"
            />
            <button class="btn btn-primary" @click="($refs.fileInputRef as HTMLInputElement).click()">选择Excel文件</button>
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
        <template v-else>
          <div class="category-tabs">
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

          <div class="sub-tabs">
            <button
              class="sub-tab-btn"
              :class="{ active: activeSubTab === 'info' }"
              @click="activeSubTab = 'info'"
            >
              产品信息
            </button>
            <button
              class="sub-tab-btn"
              :class="{ active: activeSubTab === 'power' }"
              @click="activeSubTab = 'power'"
            >
              功耗数据
            </button>
          </div>

          <div v-if="activeSubTab === 'info' && activeCategoryInfoData" class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="col in activeCategoryInfoData.displayColumns" :key="col.key">{{ col.label }}</th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in activeCategoryInfoData!.data" :key="i">
                  <td v-for="col in activeCategoryInfoData!.displayColumns" :key="col.key">
                    <template v-if="col.type === 'image'">
                      <div class="image-cell">
                        <img
                          v-if="row[col.key]"
                          :src="getImageUrl(row[col.key])"
                          class="data-image"
                          @click="previewImage(getImageUrl(row[col.key]))"
                        />
                        <label v-else class="upload-label">
                          <input
                            type="file"
                            accept="image/*"
                            style="display: none"
                            @change="handleImageUpload(activeCategory, row.id, ($event.target as HTMLInputElement).files?.[0]!)"
                          />
                          <span class="upload-placeholder">+上传</span>
                        </label>
                        <label v-if="row[col.key]" class="upload-label replace-label">
                          <input
                            type="file"
                            accept="image/*"
                            style="display: none"
                            @change="handleImageUpload(activeCategory, row.id, ($event.target as HTMLInputElement).files?.[0]!)"
                          />
                          <span class="replace-btn">替换</span>
                        </label>
                      </div>
                    </template>
                    <template v-else>
                      {{ row[col.key] ?? '-' }}
                    </template>
                  </td>
                  <td class="action-col">
                    <button class="btn-delete" @click="handleDeleteInfo(activeCategory, row.id)">删除</button>
                  </td>
                </tr>
                <tr v-if="activeCategoryInfoData!.data.length === 0">
                  <td :colspan="activeCategoryInfoData!.displayColumns.length + 1" class="center-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="activeSubTab === 'power' && activeCategoryPowerData" class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="col in activeCategoryPowerData.displayColumns" :key="col.key">{{ col.label }}</th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in activeCategoryPowerData.data" :key="i">
                  <td v-for="col in activeCategoryPowerData.displayColumns" :key="col.key">
                    {{ row[col.key] ?? '-' }}
                  </td>
                  <td class="action-col">
                    <button class="btn-delete" @click="handleDeletePower(activeCategory, row.id)">删除</button>
                  </td>
                </tr>
                <tr v-if="activeCategoryPowerData.data.length === 0">
                  <td :colspan="activeCategoryPowerData.displayColumns.length + 1" class="center-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>

    <div v-if="previewVisible" class="image-preview-overlay" @click="previewVisible = false">
      <div class="image-preview-content">
        <img :src="previewImageUrl" class="preview-img" />
        <p class="preview-close">点击关闭</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  dbApi,
  getImageUrl,
  type CategoryInfo,
  type AllDataResponse,
} from '#/api/db';

const loading = ref(false);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const categories = ref<CategoryInfo[]>([]);
const allData = ref<AllDataResponse>({});
const activeCategory = ref('');
const activeSubTab = ref<'info' | 'power'>('info');

const previewVisible = ref(false);
const previewImageUrl = ref('');

const activeCategoryInfoData = computed(() => {
  if (!activeCategory.value || !allData.value[activeCategory.value]) return null;
  return allData.value[activeCategory.value]!.info;
});

const activeCategoryPowerData = computed(() => {
  if (!activeCategory.value || !allData.value[activeCategory.value]) return null;
  return allData.value[activeCategory.value]!.power;
});

const loadData = async () => {
  loading.value = true;
  const result = await dbApi.getAllData();
  if (result.success && result.data) {
    allData.value = result.data;
    const cats = Object.entries(result.data).map(([key, val]) => ({
      key,
      name: val.name,
      info: { table: val.info.table, displayColumns: val.info.displayColumns },
      power: { table: val.power.table, displayColumns: val.power.displayColumns },
    })) as CategoryInfo[];
    categories.value = cats;
    if (cats.length > 0 && !activeCategory.value) {
      activeCategory.value = cats[0]!.key;
    }
  }
  loading.value = false;
};

const downloadTemplate = () => {
  dbApi.downloadAllTemplate();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files![0]!;
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
    uploadResult.value = { success: true, message: result.message || '导入成功' };
    selectedFile.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
    await loadData();
  } else {
    uploadResult.value = { success: false, message: result.message || '导入失败' };
  }
};

const handleImageUpload = async (category: string, id: number, file: File | undefined) => {
  if (!file) return;
  const result = await dbApi.uploadImage(category, id, file);
  if (result.success) {
    await loadData();
  } else {
    alert(result.message || '图片上传失败');
  }
};

const handleDeleteInfo = async (category: string, id: number) => {
  if (!confirm('确定删除该产品信息？')) return;
  const result = await dbApi.deleteInfo(category, id);
  if (result.success) {
    await loadData();
  } else {
    alert(result.message || '删除失败');
  }
};

const handleDeletePower = async (category: string, id: number) => {
  if (!confirm('确定删除该功耗数据？')) return;
  const result = await dbApi.deletePower(category, id);
  if (result.success) {
    await loadData();
  } else {
    alert(result.message || '删除失败');
  }
};

const previewImage = (url: string) => {
  previewImageUrl.value = url;
  previewVisible.value = true;
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

.import-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.import-section h3 {
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
  flex-wrap: wrap;
}

.file-name {
  color: #333;
  font-size: 0.9rem;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.btn-outline {
  background: white;
  border: 1px solid #667eea;
  color: #667eea;
}

.btn-outline:hover {
  background: #f0f2ff;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd6;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-success:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.upload-result {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.upload-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.upload-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.data-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.data-section h3 {
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #333;
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
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #666;
  cursor: pointer;
  font-size: 0.9rem;
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

.sub-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid #eee;
}

.sub-tab-btn {
  padding: 10px 24px;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  font-size: 0.9rem;
  position: relative;
  transition: all 0.3s;
}

.sub-tab-btn:hover {
  color: #667eea;
}

.sub-tab-btn.active {
  color: #667eea;
  font-weight: 600;
}

.sub-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #667eea;
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
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
  color: #333;
  font-size: 0.9rem;
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
  padding: 40px;
}

.action-col {
  width: 80px;
  text-align: center;
}

.btn-delete {
  padding: 4px 12px;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background: white;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}

.btn-delete:hover {
  background: #dc3545;
  color: white;
}

.image-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-image {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: transform 0.2s;
}

.data-image:hover {
  transform: scale(1.1);
}

.upload-label {
  cursor: pointer;
}

.upload-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  color: #999;
  font-size: 0.8rem;
  transition: all 0.3s;
}

.upload-placeholder:hover {
  border-color: #667eea;
  color: #667eea;
}

.replace-label {
  display: inline-flex;
}

.replace-btn {
  padding: 2px 8px;
  border: 1px solid #667eea;
  border-radius: 3px;
  color: #667eea;
  font-size: 0.75rem;
  transition: all 0.3s;
}

.replace-btn:hover {
  background: #667eea;
  color: white;
}

.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.image-preview-content {
  text-align: center;
}

.preview-img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-close {
  color: white;
  margin-top: 16px;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .template-download {
    flex-direction: column;
    align-items: flex-start;
  }
  .file-upload {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
