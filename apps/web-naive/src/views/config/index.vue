<template>
  <div class="config-page">
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/">首页</a>
          <a href="/power-consumption">旗舰手机功耗</a>
          <a href="/mid-low-phone-power">中低端手机功耗</a>
          <a href="/mouse-power">鼠标功耗</a>
          <a href="/keyboard-power">键盘功耗</a>
          <a href="/remote-control-power">遥控器功耗</a>
          <a href="/config" class="active">数据管理</a>
        </nav>
      </div>
    </header>

    <main class="container">
      <h2 class="page-title">数据管理</h2>

      <section class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="tab-btn"
          :class="{ active: currentCategory === cat.key }"
          @click="switchCategory(cat.key)"
        >
          {{ cat.name }}
        </button>
      </section>

      <section class="upload-section">
        <h3>导入Excel数据 - {{ currentCategoryName }}</h3>
        <div class="upload-area">
          <div class="upload-box" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              @change="handleFileChange"
              style="display: none"
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>点击或拖拽Excel文件到此处上传</p>
            <p class="hint">支持 .xlsx, .xls 格式</p>
          </div>
          <div class="upload-actions">
            <button class="btn btn-primary" @click="downloadTemplate">
              下载{{ currentCategoryName }}模板
            </button>
          </div>
        </div>
        <div v-if="importResult" class="import-result" :class="{ success: importResult.success, error: !importResult.success }">
          {{ importResult.message }}
        </div>
      </section>

      <section class="data-section">
        <div class="section-header">
          <h3>{{ currentCategoryName }}数据列表</h3>
          <button class="btn btn-primary" @click="showAddModal">添加{{ currentCategoryName }}</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>品牌</th>
                <th>型号</th>
                <th v-if="isPhoneCategory">处理器</th>
                <th v-if="isPhoneCategory">内存</th>
                <th v-if="isPhoneCategory">存储</th>
                <th v-if="isPhoneCategory">电池容量</th>
                <th v-if="isPhoneCategory">价格</th>
                <th v-if="!isPhoneCategory">睡眠功耗</th>
                <th v-if="!isPhoneCategory">休眠功耗</th>
                <th v-if="!isPhoneCategory">使用功耗</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="tableColCount" class="loading-cell">加载中...</td>
              </tr>
              <tr v-else-if="items.length === 0">
                <td :colspan="tableColCount" class="empty-cell">暂无数据</td>
              </tr>
              <tr v-else v-for="item in items" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.brand }}</td>
                <td>{{ item.model }}</td>
                <td v-if="isPhoneCategory">{{ item.processor }}</td>
                <td v-if="isPhoneCategory">{{ item.ram }}</td>
                <td v-if="isPhoneCategory">{{ item.storage }}</td>
                <td v-if="isPhoneCategory">{{ item.battery_capacity }}mAh</td>
                <td v-if="isPhoneCategory">{{ item.price }}</td>
                <td v-if="!isPhoneCategory">{{ item.sleep_power }}mW</td>
                <td v-if="!isPhoneCategory">{{ item.dormancy_power }}mW</td>
                <td v-if="!isPhoneCategory">{{ item.usage_power }}mW</td>
                <td class="actions">
                  <button class="btn btn-small btn-info" @click="showEditModal(item)">编辑</button>
                  <button class="btn btn-small btn-danger" @click="deleteItem(item)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑' : '添加' }}{{ currentCategoryName }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveItem">
            <div class="form-row">
              <div class="form-group">
                <label>品牌 *</label>
                <input v-model="formData.brand" type="text" required placeholder="如: Apple" />
              </div>
              <div class="form-group">
                <label>型号 *</label>
                <input v-model="formData.model" type="text" required placeholder="如: iPhone 15" />
              </div>
            </div>

            <template v-if="isPhoneCategory">
              <div class="form-row">
                <div class="form-group">
                  <label>屏幕</label>
                  <input v-model="formData.screen" type="text" placeholder="如: 6.1英寸 OLED" />
                </div>
                <div class="form-group">
                  <label>处理器</label>
                  <input v-model="formData.processor" type="text" placeholder="如: A16 仿生芯片" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>内存</label>
                  <input v-model="formData.ram" type="text" placeholder="如: 6GB" />
                </div>
                <div class="form-group">
                  <label>存储</label>
                  <input v-model="formData.storage" type="text" placeholder="如: 128GB" />
                </div>
              </div>
              <div class="form-group">
                <label>摄像头</label>
                <input v-model="formData.camera" type="text" placeholder="如: 4800万像素主摄" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>电池</label>
                  <input v-model="formData.battery" type="text" placeholder="如: 4000mAh" />
                </div>
                <div class="form-group">
                  <label>电池容量</label>
                  <input v-model="formData.battery_capacity" type="text" placeholder="如: 4000" />
                </div>
              </div>
              <div class="form-group">
                <label>价格</label>
                <input v-model="formData.price" type="text" placeholder="如: ¥5999起" />
              </div>
              <div class="form-section-title">功耗数据</div>
              <div class="form-row">
                <div class="form-group">
                  <label>视频播放功耗</label>
                  <input v-model.number="formData.video_power" type="number" placeholder="单位: mW" />
                </div>
                <div class="form-group">
                  <label>游戏功耗</label>
                  <input v-model.number="formData.game_power" type="number" placeholder="单位: mW" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>待机功耗</label>
                  <input v-model.number="formData.standby_power" type="number" placeholder="单位: mW" />
                </div>
                <div class="form-group">
                  <label>浏览网页功耗</label>
                  <input v-model.number="formData.browser_power" type="number" placeholder="单位: mW" />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="form-section-title">功耗数据</div>
              <div class="form-row">
                <div class="form-group">
                  <label>睡眠功耗</label>
                  <input v-model.number="formData.sleep_power" type="number" placeholder="单位: mW" />
                </div>
                <div class="form-group">
                  <label>休眠功耗</label>
                  <input v-model.number="formData.dormancy_power" type="number" placeholder="单位: mW" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>使用功耗</label>
                  <input v-model.number="formData.usage_power" type="number" placeholder="单位: mW" />
                </div>
              </div>
            </template>

            <div class="form-actions">
              <button type="button" class="btn btn-default" @click="closeModal">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="container">
        <div class="footer-bottom">
          <p>&copy; {{ new Date().getFullYear() }} TechCompare. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { dbApi, type CategoryInfo } from '#/api/db';

const categories = ref<CategoryInfo[]>([]);
const currentCategory = ref('phones');
const items = ref<any[]>([]);
const loading = ref(false);
const showModal = ref(false);
const isEdit = ref(false);
const importResult = ref<{ success: boolean; message: string } | null>(null);
const fileInputRef = ref<HTMLInputElement>();

const isPhoneCategory = computed(() => {
  return currentCategory.value === 'phones' || currentCategory.value === 'mid_low_phones';
});

const currentCategoryName = computed(() => {
  const cat = categories.value.find(c => c.key === currentCategory.value);
  return cat?.name || '';
});

const tableColCount = computed(() => {
  return isPhoneCategory.value ? 9 : 7;
});

const getPhoneFormData = () => ({
  brand: '', model: '', screen: '', processor: '', ram: '', storage: '',
  camera: '', battery: '', price: '', battery_capacity: '',
  video_power: 0, game_power: 0, standby_power: 0, browser_power: 0,
});

const getPeripheralFormData = () => ({
  brand: '', model: '', sleep_power: 0, dormancy_power: 0, usage_power: 0,
});

const formData = ref<Record<string, any>>(getPhoneFormData());

const loadCategories = async () => {
  const result = await dbApi.getCategories();
  if (result.success && result.data) {
    categories.value = result.data;
  }
};

const loadItems = async () => {
  loading.value = true;
  const result = await dbApi.getList(currentCategory.value);
  if (result.success && result.data) {
    items.value = result.data;
  }
  loading.value = false;
};

const switchCategory = (category: string) => {
  currentCategory.value = category;
  importResult.value = null;
  loadItems();
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await importFile(file);
  }
  target.value = '';
};

const handleDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files[0];
  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
    await importFile(file);
  }
};

const importFile = async (file: File) => {
  importResult.value = null;
  const result = await dbApi.importExcel(currentCategory.value, file);
  importResult.value = { success: result.success, message: result.message || '' };
  if (result.success) {
    await loadItems();
  }
};

const downloadTemplate = () => {
  dbApi.downloadTemplate(currentCategory.value);
};

const showAddModal = () => {
  isEdit.value = false;
  formData.value = isPhoneCategory.value ? getPhoneFormData() : getPeripheralFormData();
  showModal.value = true;
};

const showEditModal = (item: any) => {
  isEdit.value = true;
  formData.value = { ...item };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveItem = async () => {
  if (isEdit.value && formData.value.id) {
    const result = await dbApi.updateItem(currentCategory.value, formData.value.id, formData.value);
    if (result.success) {
      await loadItems();
      closeModal();
    } else {
      alert(result.message || '保存失败');
    }
  } else {
    const result = await dbApi.addItem(currentCategory.value, formData.value);
    if (result.success) {
      await loadItems();
      closeModal();
    } else {
      alert(result.message || '添加失败');
    }
  }
};

const deleteItem = async (item: any) => {
  if (!confirm(`确定要删除 ${item.brand} ${item.model} 吗？`)) {
    return;
  }
  const result = await dbApi.deleteItem(currentCategory.value, item.id);
  if (result.success) {
    await loadItems();
  } else {
    alert(result.message || '删除失败');
  }
};

onMounted(async () => {
  await loadCategories();
  await loadItems();
});
</script>

<style scoped>
.config-page {
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

.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 20px;
  border: 2px solid #ddd;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s;
  color: #333;
}

.tab-btn:hover {
  border-color: #007bff;
  color: #007bff;
}

.tab-btn.active {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.upload-section {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.upload-section h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
}

.upload-area {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.upload-box {
  flex: 1;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-box:hover {
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.05);
}

.upload-box svg {
  color: #999;
  margin-bottom: 15px;
}

.upload-box p {
  margin: 5px 0;
  color: #666;
}

.upload-box .hint {
  font-size: 0.85rem;
  color: #999;
}

.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-result {
  margin-top: 15px;
  padding: 10px 15px;
  border-radius: 4px;
}

.import-result.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.import-result.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.data-section {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 1.5rem;
  color: #333;
  margin: 0;
}

.table-container {
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

td {
  color: #333;
}

tr:hover {
  background-color: #f5f5f5;
}

.loading-cell, .empty-cell {
  text-align: center;
  color: #999;
  padding: 40px;
}

.actions {
  white-space: nowrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-small {
  padding: 5px 10px;
  font-size: 0.8rem;
  margin-right: 5px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-default {
  background-color: #6c757d;
  color: white;
}

.btn-default:hover {
  background-color: #545b62;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #117a8b;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #bd2130;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
}

.form-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 20px 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.footer {
  background-color: #333;
  color: white;
  padding: 20px 0;
  margin-top: 60px;
}

.footer-bottom {
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

  .upload-area {
    flex-direction: column;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
