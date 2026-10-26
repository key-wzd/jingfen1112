<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { dbApi, type AnalysisPlan, type PlanList } from '#/api/db';

const props = defineProps<{
  category: string;
  selectedIds: number[];
  baselineId: number | null;
  hiddenByRow: Record<string, number[]>;
  datasetVersion: string;
}>();
const emit = defineEmits<{ restore: [plan: AnalysisPlan] }>();
const plans = ref<AnalysisPlan[]>([]);
const viewer = ref<PlanList['viewer'] | null>(null);
const name = ref('');
const chosenId = ref('');
const loading = ref(false),
  saving = ref(false),
  restoring = ref(false),
  deleting = ref(false);
const feedback = ref(''),
  error = ref('');
let generation = 0;
let observedToken = localStorage.getItem('tc_token');
const privatePlans = computed(() =>
  plans.value.filter((plan) => plan.visibility === 'private'),
);
const sharedPlans = computed(() =>
  plans.value.filter((plan) => plan.visibility === 'shared'),
);
const selectedPlan = computed(() =>
  plans.value.find((plan) => plan.id === chosenId.value),
);
const isAdmin = computed(() => viewer.value?.role === 'admin');
const busy = computed(
  () => loading.value || saving.value || restoring.value || deleting.value,
);
const changedDataset = computed(
  () =>
    selectedPlan.value &&
    selectedPlan.value.definition.datasetVersion !== props.datasetVersion,
);

async function loadPlans() {
  const current = ++generation;
  observedToken = localStorage.getItem('tc_token');
  plans.value = [];
  viewer.value = null;
  chosenId.value = '';
  feedback.value = '';
  error.value = '';
  loading.value = true;
  const result = await dbApi.getAnalysisPlans(props.category);
  if (current !== generation) return;
  loading.value = false;
  if (!result.success || !result.data) {
    error.value = result.message || '方案列表加载失败。';
    return;
  }
  viewer.value = result.data.viewer;
  localStorage.setItem('tc_account_id', result.data.viewer.accountId);
  plans.value = result.data.plans;
}
async function save() {
  if (
    busy.value ||
    !viewer.value ||
    !props.selectedIds.length ||
    !props.datasetVersion
  )
    return;
  const planName = name.value.trim();
  if (!planName) {
    error.value = '请填写分析方案名称。';
    return;
  }
  const current = generation;
  error.value = '';
  feedback.value = '';
  saving.value = true;
  const result = await dbApi.saveAnalysisPlan({
    category: props.category,
    name: planName,
    datasetVersion: props.datasetVersion,
    selectedIds: [...props.selectedIds],
    baselineId: props.baselineId,
    hiddenByRow: props.hiddenByRow,
  });
  saving.value = false;
  if (current !== generation) return;
  if (!result.success || !result.data) {
    error.value = result.message || '方案保存失败。';
    return;
  }
  plans.value = [
    result.data,
    ...plans.value.filter((plan) => plan.id !== result.data!.id),
  ];
  chosenId.value = result.data.id;
  name.value = '';
  feedback.value = result.message || '方案已保存。';
}
async function restore() {
  if (!chosenId.value || busy.value) return;
  const current = generation;
  restoring.value = true;
  error.value = '';
  feedback.value = '';
  // Recheck ownership on the server, even when a list was already loaded.
  const result = await dbApi.getAnalysisPlan(chosenId.value);
  restoring.value = false;
  if (current !== generation) return;
  if (!result.success || !result.data) {
    error.value = result.message || '方案无法恢复。';
    return;
  }
  if (result.data.definition.datasetVersion !== props.datasetVersion) {
    error.value =
      '该方案属于其他数据版本。为避免选择到重用编号的记录，请根据当前数据重新保存方案。';
    return;
  }
  emit('restore', result.data);
}
async function remove() {
  if (!selectedPlan.value?.canManage || busy.value) return;
  if (
    !window.confirm(
      `删除方案“${selectedPlan.value.name}”？${selectedPlan.value.visibility === 'shared' ? '此共享方案将对所有账号移除。' : ''}`,
    )
  )
    return;
  const id = selectedPlan.value.id,
    current = generation;
  deleting.value = true;
  error.value = '';
  feedback.value = '';
  const result = await dbApi.deleteAnalysisPlan(id);
  deleting.value = false;
  if (current !== generation) return;
  if (!result.success) {
    error.value = result.message || '方案删除失败。';
    return;
  }
  plans.value = plans.value.filter((plan) => plan.id !== id);
  chosenId.value = '';
  feedback.value = '方案已删除。';
}
function checkSession() {
  if (observedToken !== localStorage.getItem('tc_token')) {
    saving.value = false;
    restoring.value = false;
    deleting.value = false;
    void loadPlans();
  }
}
watch(() => props.category, loadPlans, { immediate: true });
onMounted(() => {
  window.addEventListener('storage', checkSession);
  window.addEventListener('focus', checkSession);
});
onBeforeUnmount(() => {
  ++generation;
  window.removeEventListener('storage', checkSession);
  window.removeEventListener('focus', checkSession);
});
</script>

<template>
  <section class="analysis-plans" aria-label="分析方案">
    <div class="plan-heading">
      <div>
        <h2>分析方案</h2>
        <p>
          {{
            viewer
              ? isAdmin
                ? '管理员保存的方案全员可见，普通用户可恢复使用。'
                : '个人方案仅当前账号可见；也可使用管理员共享方案。'
              : '正在确认账号与方案权限…'
          }}
        </p>
      </div>
      <span v-if="viewer" class="scope-badge" :class="{ shared: isAdmin }">{{
        isAdmin ? '保存为全员共享' : '保存为个人私有'
      }}</span>
    </div>
    <div class="plan-controls">
      <label class="plan-name"
        ><span>方案名称</span
        ><input
          v-model="name"
          maxlength="80"
          placeholder="例如：待机功耗复测"
          aria-label="分析方案名称"
          @keyup.enter="save"
      /></label>
      <button
        class="lab-button save-plan"
        :disabled="busy || !viewer || !selectedIds.length || !datasetVersion"
        @click="save"
      >
        {{ saving ? '保存中…' : '保存方案' }}
      </button>
      <label class="plan-picker"
        ><span>可用方案</span
        ><select v-model="chosenId" aria-label="选择分析方案" :disabled="busy">
          <option value="">
            {{ loading ? '加载方案中…' : '选择要恢复的方案' }}
          </option>
          <optgroup v-if="privatePlans.length" label="我的个人方案">
            <option
              v-for="plan in privatePlans"
              :key="plan.id"
              :value="plan.id"
            >
              {{ plan.name }}
            </option>
          </optgroup>
          <optgroup v-if="sharedPlans.length" label="管理员共享方案">
            <option v-for="plan in sharedPlans" :key="plan.id" :value="plan.id">
              {{ plan.name }} · {{ plan.ownerName }}
            </option>
          </optgroup>
        </select></label
      >
      <button
        class="lab-button restore-plan"
        :disabled="busy || !selectedPlan || !datasetVersion || !!changedDataset"
        @click="restore"
      >
        {{ restoring ? '恢复中…' : '恢复方案' }}
      </button>
      <button
        v-if="selectedPlan?.canManage"
        class="lab-button delete-plan"
        :disabled="busy"
        @click="remove"
      >
        {{ deleting ? '删除中…' : '删除方案' }}
      </button>
      <button class="lab-button" :disabled="busy" @click="loadPlans">
        刷新方案
      </button>
    </div>
    <p v-if="viewer" class="plan-caption">
      当前账号：{{ viewer.accountId }} ·
      {{ plans.length }} 个可见方案。同一账号、同一品类的同名方案会更新。
    </p>
    <p v-if="changedDataset" class="plan-warning" role="status">
      所选方案的数据版本已变化，请核对当前测试记录并重新保存。
    </p>
    <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
    <p v-if="feedback" class="plan-success" role="status">{{ feedback }}</p>
  </section>
</template>

<style scoped>
.analysis-plans {
  margin: 0 0 22px;
  padding: 22px 24px;
  border: 1px solid #dfe6ef;
  border-radius: 16px;
  background: #fff;
}
.plan-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
h2 {
  font-size: 18px;
  font-weight: 650;
  color: #203451;
  margin: 0;
}
.plan-heading p {
  font-size: 13px;
  line-height: 1.7;
  color: #52637c;
  margin: 6px 0 0;
}
.scope-badge {
  flex-shrink: 0;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  color: #087f70;
  background: #e8f6f2;
}
.scope-badge.shared {
  color: #4938ba;
  background: #f1edff;
}
.plan-controls {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
}
.plan-controls label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.plan-controls label > span {
  font-size: 12px;
  color: #52637c;
  font-weight: 600;
}
.plan-controls input,
.plan-controls select {
  width: 100%;
  border: 1px solid #d2d9e7;
  border-radius: 9px;
  padding: 10px 12px;
  background: #fff;
  color: #203451;
  font-size: 14px;
  min-height: 42px;
  box-sizing: border-box;
}
.plan-name {
  flex: 1 1 200px;
}
.plan-picker {
  flex: 1.3 1 230px;
}
.plan-caption,
.plan-warning,
.plan-error,
.plan-success {
  font-size: 13px;
  line-height: 1.7;
  margin: 13px 0 0;
}
.plan-caption {
  color: #52637c;
}
.plan-warning {
  color: #8a5b10;
}
.plan-error {
  color: #a53950;
}
.plan-success {
  color: #087f70;
}
.delete-plan {
  color: #a53950 !important;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 650px) {
  .analysis-plans {
    padding: 18px;
  }
  .plan-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .plan-name,
  .plan-picker {
    flex-basis: 100%;
  }
  .plan-controls button {
    min-height: 42px;
  }
}
</style>
