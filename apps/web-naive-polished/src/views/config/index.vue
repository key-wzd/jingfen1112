<template>
  <div class="config-page">
    <div class="page-inner">
      <div class="breadcrumb">
        <button @click="router.push('/home')">首页</button><span>/</span
        ><b>数据管理</b>
      </div>
      <div class="page-header">
        <div>
          <div class="page-kicker">CONTROL CENTER · 03</div>
          <h2 class="page-title">数据管理</h2>
          <p class="page-desc">
            维护内部测试对象与场景功耗记录，导入前校验，确认后切换数据版本。
          </p>
        </div>
        <div class="admin-badge"><span>●</span> ADMIN ONLY</div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span>品类</span
          ><strong>{{ hasLoaded ? categories.length : '—' }}</strong
          ><small>已接入数据集</small>
        </div>
        <div class="stat-card">
          <span>产品信息</span
          ><strong>{{ hasLoaded ? totalInfoCount : '—' }}</strong
          ><small>可用于参数对比</small>
        </div>
        <div class="stat-card">
          <span>功耗记录</span
          ><strong>{{ hasLoaded ? totalPowerCount : '—' }}</strong
          ><small>可用于图表分析</small>
        </div>
        <div class="stat-card stat-card-accent">
          <span>数据状态</span
          ><strong>{{
            loading ? '获取中' : loadError ? '连接失败' : '已获取'
          }}</strong
          ><small>{{
            lastLoaded ? '最近获取 ' + lastLoaded : '尚未获取数据'
          }}</small>
        </div>
      </div>

      <section class="import-section panel">
        <div class="panel-heading">
          <div>
            <div class="panel-kicker">IMPORT WORKFLOW</div>
            <h3>导入一份完整数据</h3>
            <p>校验工作表和数值，核对预览清单后确认导入。</p>
          </div>
          <button class="btn btn-outline" @click="downloadTemplate">
            下载模板 <span>↓</span>
          </button>
        </div>
        <div class="import-area">
          <button
            class="drop-zone"
            :disabled="uploading || checking"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="openFilePicker"
          >
            <span class="drop-icon">↑</span
            ><strong>{{
              selectedFile ? selectedFile.name : '选择 Excel 文件'
            }}</strong
            ><small>{{
              selectedFile
                ? '文件已选择，请先校验并预览'
                : '支持点击选择或拖入 .xlsx / .xls，最大 20 MB'
            }}</small>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            class="hidden-input"
            @change="handleFileChange"
          />
          <button
            v-if="selectedFile"
            class="btn btn-outline"
            :disabled="uploading || checking"
            @click="previewImport"
          >
            {{ checking ? '校验中…' : '校验并预览' }}
          </button>
        </div>
        <div v-if="importPreview" class="import-preview">
          <h4>导入预览</h4>
          <p class="lab-help">{{ importPreview.message }}</p>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>工作表</th>
                  <th>品类</th>
                  <th>记录数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sheet in importPreview.sheets" :key="sheet.name">
                  <td>{{ sheet.name }}</td>
                  <td>{{ sheet.category }}</td>
                  <td>{{ sheet.rows }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="lab-help">
            确认后更新以上数据表。旧表与恢复记录会保留，未列出的数据类型保持原样。
          </p>
          <button
            class="btn btn-success"
            :disabled="uploading || checking"
            @click="handleUpload"
          >
            {{ uploading ? '正在导入…' : '确认导入以上数据' }}
          </button>
        </div>
        <div
          v-if="uploadResult"
          class="upload-result"
          :class="uploadResult.success ? 'success' : 'error'"
        >
          <span>{{ uploadResult.success ? '✓' : '!' }}</span
          >{{ uploadResult.message }}
        </div>
      </section>

      <section class="data-section panel">
        <div class="panel-heading">
          <div>
            <div class="panel-kicker">DATA EXPLORER</div>
            <h3>数据概览</h3>
            <p>按品类查看、预览和维护当前数据。</p>
          </div>
          <span class="data-hint"
            >共 {{ hasLoaded ? categories.length : '—' }} 个品类</span
          >
        </div>
        <div v-if="loadError" class="lab-status error" role="alert">
          <span>{{ loadError }}</span
          ><button @click="loadData">重试</button>
        </div>
        <div v-else-if="loading" class="loading">加载中...</div>
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

          <div
            v-if="activeSubTab === 'info' && activeCategoryInfoData"
            class="data-table-wrap"
          >
            <table class="data-table">
              <thead>
                <tr>
                  <th
                    v-for="col in activeCategoryInfoData.displayColumns"
                    :key="col.key"
                  >
                    {{ col.label }}
                  </th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in activeCategoryInfoData!.data" :key="i">
                  <td
                    v-for="col in activeCategoryInfoData!.displayColumns"
                    :key="col.key"
                  >
                    <template v-if="col.type === 'image'">
                      <div class="image-cell">
                        <img
                          v-if="row[col.key]"
                          :src="getImageUrl(row[col.key])"
                          class="data-image"
                          :alt="`${row.brand || ''} ${row.model || '设备图片'}`"
                          @click="previewImage(getImageUrl(row[col.key]))"
                        />
                        <label v-else class="upload-label">
                          <input
                            type="file"
                            accept="image/*"
                            style="display: none"
                            @change="
                              handleImageUpload(
                                activeCategory,
                                row.id,
                                ($event.target as HTMLInputElement).files?.[0]!,
                              )
                            "
                          />
                          <span class="upload-placeholder">+上传</span>
                        </label>
                        <label
                          v-if="row[col.key]"
                          class="upload-label replace-label"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            style="display: none"
                            @change="
                              handleImageUpload(
                                activeCategory,
                                row.id,
                                ($event.target as HTMLInputElement).files?.[0]!,
                              )
                            "
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
                    <button
                      class="btn-delete"
                      @click="handleDeleteInfo(activeCategory, row.id)"
                    >
                      删除
                    </button>
                  </td>
                </tr>
                <tr v-if="activeCategoryInfoData!.data.length === 0">
                  <td
                    :colspan="activeCategoryInfoData!.displayColumns.length + 1"
                    class="center-cell"
                  >
                    暂无数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="activeSubTab === 'power' && activeCategoryPowerData"
            class="data-table-wrap"
          >
            <table class="data-table">
              <thead>
                <tr>
                  <th
                    v-for="col in activeCategoryPowerData.displayColumns"
                    :key="col.key"
                  >
                    {{ col.label }}
                  </th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in activeCategoryPowerData.data" :key="i">
                  <td
                    v-for="col in activeCategoryPowerData.displayColumns"
                    :key="col.key"
                  >
                    {{ row[col.key] ?? '-' }}
                  </td>
                  <td class="action-col">
                    <button
                      class="btn-delete"
                      @click="handleDeletePower(activeCategory, row.id)"
                    >
                      删除
                    </button>
                  </td>
                </tr>
                <tr v-if="activeCategoryPowerData.data.length === 0">
                  <td
                    :colspan="activeCategoryPowerData.displayColumns.length + 1"
                    class="center-cell"
                  >
                    暂无数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>

    <div
      v-if="previewVisible"
      class="image-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="设备图片预览"
      @click="previewVisible = false"
    >
      <div class="image-preview-content">
        <img :src="previewImageUrl" class="preview-img" alt="设备图片预览" />
        <p class="preview-close">点击关闭</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  dbApi,
  getImageUrl,
  type CategoryInfo,
  type AllDataResponse,
  type ImportPreview,
} from '#/api/db';

const loading = ref(false);
const hasLoaded = ref(false);
const lastLoaded = ref('');
const loadError = ref('');
const checking = ref(false);
const importPreview = ref<ImportPreview | null>(null);
const router = useRouter();
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

const totalInfoCount = computed(() =>
  Object.values(allData.value).reduce(
    (sum, item) => sum + (item.info?.data?.length || 0),
    0,
  ),
);
const totalPowerCount = computed(() =>
  Object.values(allData.value).reduce(
    (sum, item) => sum + (item.power?.data?.length || 0),
    0,
  ),
);

const activeCategoryInfoData = computed(() => {
  if (!activeCategory.value || !allData.value[activeCategory.value])
    return null;
  return allData.value[activeCategory.value]!.info;
});

const activeCategoryPowerData = computed(() => {
  if (!activeCategory.value || !allData.value[activeCategory.value])
    return null;
  return allData.value[activeCategory.value]!.power;
});

const loadData = async () => {
  loading.value = true;
  loadError.value = '';
  const result = await dbApi.getAllData();
  if (result.success && result.data) {
    allData.value = result.data;
    hasLoaded.value = true;
    lastLoaded.value = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
    });
    const cats = Object.entries(result.data).map(([key, val]) => ({
      key,
      name: val.name,
      info: { table: val.info.table, displayColumns: val.info.displayColumns },
      power: {
        table: val.power.table,
        displayColumns: val.power.displayColumns,
      },
    })) as CategoryInfo[];
    categories.value = cats;
    if (cats.length > 0 && !activeCategory.value) {
      activeCategory.value = cats[0]!.key;
    }
  } else {
    loadError.value = result.message || '数据获取失败。';
    hasLoaded.value = false;
    allData.value = {};
    categories.value = [];
  }
  loading.value = false;
};

const downloadTemplate = async () => {
  try {
    await dbApi.downloadAllTemplate();
  } catch (error) {
    uploadResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '下载失败。',
    };
  }
};
const openFilePicker = () => fileInputRef.value?.click();
function selectFile(file: File | undefined) {
  if (uploading.value || checking.value) return;
  importPreview.value = null;
  selectedFile.value = null;
  uploadResult.value = null;
  if (!file) return;
  if (!/\.xlsx?$/i.test(file.name) || file.size > 20 * 1024 * 1024) {
    uploadResult.value = {
      success: false,
      message: '请选择不超过 20 MB 的 .xlsx 或 .xls 文件。',
    };
    return;
  }
  selectedFile.value = file;
}
const handleFileChange = (event: Event) =>
  selectFile((event.target as HTMLInputElement).files?.[0]);
const handleDrop = (event: DragEvent) =>
  selectFile(event.dataTransfer?.files?.[0]);
async function previewImport() {
  if (!selectedFile.value || checking.value || uploading.value) return;
  checking.value = true;
  importPreview.value = null;
  uploadResult.value = null;
  const result = await dbApi.previewImport(selectedFile.value);
  checking.value = false;
  if (result.success && result.data) importPreview.value = result.data;
  else
    uploadResult.value = {
      success: false,
      message: result.message || '校验失败，请检查文件。',
    };
}

const handleUpload = async () => {
  if (!selectedFile.value || !importPreview.value || uploading.value) return;
  uploading.value = true;
  uploadResult.value = null;
  const result = await dbApi.importAllSheets(
    selectedFile.value,
    importPreview.value.token,
  );
  uploading.value = false;
  if (result.success) {
    uploadResult.value = {
      success: true,
      message: result.message || '导入成功',
    };
    selectedFile.value = null;
    importPreview.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
    await loadData();
  } else {
    uploadResult.value = {
      success: false,
      message: result.message || '导入失败',
    };
  }
};

const handleImageUpload = async (
  category: string,
  id: number,
  file: File | undefined,
) => {
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

const closePreviewOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') previewVisible.value = false;
};
onMounted(() => {
  loadData();
  window.addEventListener('keydown', closePreviewOnEscape);
});
onUnmounted(() => window.removeEventListener('keydown', closePreviewOnEscape));
</script>

<style scoped>
.config-page {
  min-height: 100%;
  padding: 38px 24px 100px;
  background: #f4f7fb;
}
.page-inner {
  max-width: 1240px;
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
.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
.page-kicker,
.panel-kicker {
  color: #716bdf;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
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
.admin-badge {
  padding: 9px 12px;
  border: 1px solid #e8d5b8;
  border-radius: 10px;
  background: #fffaf2;
  color: #b17a2e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.admin-badge span {
  margin-right: 5px;
  color: #d8a85d;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 19px;
  border: 1px solid #e4eaf2;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 52, 84, 0.04);
}
.stat-card span {
  color: #8d9aab;
  font-size: 10px;
  font-weight: 700;
}
.stat-card strong {
  color: #27364e;
  font-size: 28px;
  letter-spacing: -0.05em;
}
.stat-card small {
  color: #a7b1bf;
  font-size: 10px;
}
.stat-card-accent strong {
  color: #0c9d86;
  font-size: 21px;
}
.panel {
  border: 1px solid #e4eaf2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(31, 52, 84, 0.05);
}
.import-section,
.data-section {
  padding: 25px;
}
.import-section {
  margin-bottom: 18px;
}
.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.panel-heading h3 {
  margin: 8px 0 5px;
  color: #27364e;
  font-size: 20px;
  letter-spacing: -0.04em;
}
.panel-heading p {
  margin: 0;
  color: #98a4b3;
  font-size: 11px;
}
.panel-tip,
.data-hint {
  color: #a1adbc;
  font-size: 11px;
}
.import-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.drop-zone {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 13px;
  padding: 17px 18px;
  border: 1px dashed #c7c6f6;
  border-radius: 13px;
  background: #fbfaff;
  color: #27364e;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}
.drop-zone:hover {
  border-color: #716bdf;
  background: #f4f2ff;
}
.drop-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #eae8ff;
  color: #544ed1;
  font-size: 18px;
}
.drop-zone strong {
  display: block;
  font-size: 12px;
}
.drop-zone small {
  display: block;
  margin-top: 4px;
  color: #9ca7b5;
  font-size: 10px;
}
.hidden-input {
  display: none;
}
.btn {
  padding: 11px 15px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-outline {
  border: 1px solid #c7c6f6;
  background: #fbfaff;
  color: #544ed1;
}
.btn-outline:hover {
  background: #f0efff;
}
.btn span {
  margin-left: 8px;
  font-size: 15px;
}
.btn-success {
  flex: 0 0 auto;
  border: 0;
  background: #139579;
  color: #fff;
  box-shadow: 0 8px 18px rgba(19, 149, 121, 0.2);
}
.btn-success:hover {
  background: #0b7f67;
}
.btn-success:disabled {
  cursor: wait;
  opacity: 0.55;
}
.upload-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 11px;
}
.upload-result span {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 800;
}
.upload-result.success {
  background: #eaf9f4;
  color: #117d68;
}
.upload-result.success span {
  background: #bcebdd;
}
.upload-result.error {
  background: #fff0f2;
  color: #bf3d55;
}
.upload-result.error span {
  background: #ffd2da;
}
.category-tabs {
  display: flex;
  gap: 7px;
  margin-bottom: 17px;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 8px 13px;
  border: 1px solid #e3e8f0;
  border-radius: 9px;
  background: #fff;
  color: #7e8b9d;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}
.tab-btn:hover {
  border-color: #b8b5f5;
  color: #4f46e5;
}
.tab-btn.active {
  border-color: #716bdf;
  background: #716bdf;
  color: #fff;
  box-shadow: 0 7px 16px rgba(113, 107, 223, 0.18);
}
.sub-tabs {
  display: flex;
  gap: 22px;
  margin-bottom: 16px;
  border-bottom: 1px solid #edf0f5;
}
.sub-tab-btn {
  position: relative;
  padding: 10px 0 12px;
  border: 0;
  background: transparent;
  color: #9aa6b4;
  cursor: pointer;
  font-size: 11px;
}
.sub-tab-btn.active {
  color: #4f46e5;
  font-weight: 800;
}
.sub-tab-btn.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 5px;
  background: #716bdf;
}
.loading,
.empty {
  padding: 50px;
  color: #9aa6b4;
  text-align: center;
}
.data-table-wrap {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 13px 12px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  color: #54627a;
  font-size: 11px;
}
.data-table th {
  background: #fafbfc;
  color: #8491a3;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.data-table tbody tr:hover td {
  background: #fbfcff;
}
.center-cell {
  padding: 46px !important;
  color: #aab3bf !important;
  text-align: center !important;
}
.action-col {
  width: 70px;
  text-align: center !important;
}
.btn-delete {
  padding: 5px 9px;
  border: 1px solid #f1c8d0;
  border-radius: 7px;
  background: #fff;
  color: #c64e65;
  cursor: pointer;
  font-size: 10px;
}
.btn-delete:hover {
  border-color: #c64e65;
  background: #fff3f5;
}
.image-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}
.data-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  cursor: pointer;
}
.data-image:hover {
  transform: scale(1.06);
}
.upload-label {
  cursor: pointer;
}
.upload-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px dashed #cbd3df;
  border-radius: 8px;
  color: #9aa6b4;
  font-size: 9px;
}
.replace-btn {
  padding: 3px 6px;
  border: 1px solid #c7c6f6;
  border-radius: 5px;
  color: #716bdf;
  font-size: 9px;
}
.replace-btn:hover {
  background: #f0efff;
}
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 44, 0.78);
  cursor: pointer;
}
.image-preview-content {
  text-align: center;
}
.preview-img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.preview-close {
  margin-top: 12px;
  color: #d8deeb;
  font-size: 11px;
}
@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 620px) {
  .config-page {
    padding: 25px 16px 70px;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  .import-section,
  .data-section {
    padding: 18px;
  }
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .import-area {
    align-items: stretch;
    flex-direction: column;
  }
  .btn-success {
    width: 100%;
  }
  .btn-outline {
    align-self: flex-start;
  }
}

.import-preview {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid #dfe6ef;
  border-radius: 12px;
  background: #fcfdff;
}
.import-preview h4 {
  font-size: 16px;
  margin: 0;
}
.page-desc,
.panel-heading p,
.drop-zone small,
.data-table th,
.data-table td,
.tab-btn,
.sub-tab-btn {
  font-size: 14px;
  line-height: 1.7;
  color: #52637c;
}
.drop-zone {
  flex-wrap: wrap;
}
.stat-card small {
  font-size: 12px;
}
.stat-card span {
  font-size: 13px;
}
.btn {
  font-size: 13px;
}
.drop-zone strong {
  overflow-wrap: anywhere;
}
</style>
