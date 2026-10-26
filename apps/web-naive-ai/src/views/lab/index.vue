<template>
  <div class="lab-page">
    <div class="lab-inner">
      <div class="lab-hero">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span>TECHCOMPARE · LAB INTELLIGENCE</div>
          <h1>实验工作台<span>让每个结论都有证据。</span></h1>
          <p>从数据质量、异常记录到分析方案，集中查看当前测试数据的可信度与下一步动作。</p>
        </div>
        <button class="refresh-button" :disabled="loading" @click="loadSummary">
          <span>{{ loading ? '读取中…' : '刷新工作台' }}</span><b>↻</b>
        </button>
      </div>

      <div v-if="error" class="state-card error" role="alert">
        <strong>工作台暂时无法读取</strong><span>{{ error }}</span><button @click="loadSummary">重试</button>
      </div>

      <template v-else-if="summary">
        <section class="metric-grid" aria-label="实验数据概览">
          <article class="metric-card metric-primary"><span>数据质量</span><strong>{{ summary.totals.qualityScore }}<small>/100</small></strong><p>{{ qualityLabel }}</p></article>
          <article class="metric-card"><span>功耗记录</span><strong>{{ summary.totals.records.toLocaleString() }}</strong><p>{{ summary.totals.categories }} 个测试品类</p></article>
          <article class="metric-card metric-warning"><span>待复核异常</span><strong>{{ summary.totals.anomalies }}</strong><p>基于当前场景的统计规则</p></article>
          <article class="metric-card"><span>缺测单元格</span><strong>{{ summary.totals.missing }}</strong><p>{{ Math.round(summary.totals.missingRate * 100) }}% 的测量字段</p></article>
        </section>

        <div class="work-grid">
          <section class="panel assistant-panel">
            <div class="panel-head"><div><div class="panel-kicker">READ-ONLY COPILOT</div><h2>分析助手</h2></div><span class="status-chip"><i></i>仅分析，不修改数据</span></div>
            <p class="panel-intro">询问综合功耗排名，或指定一个场景找出最省电、最耗电的测试对象。回答只来自当前账号可访问的数据。</p>
            <div class="prompt-list">
              <button v-for="prompt in prompts" :key="prompt" :disabled="assistantLoading" @click="ask(prompt)">{{ prompt }}</button>
            </div>
            <form class="ask-form" @submit.prevent="ask(question)">
              <input v-model="question" maxlength="500" placeholder="例如：旗舰手机综合功耗谁更高？或按待机功耗谁最好？" aria-label="向分析助手提问" />
              <button :disabled="assistantLoading || !question.trim()">{{ assistantLoading ? '分析中…' : '询问' }} <span>→</span></button>
            </form>
            <div v-if="assistantAnswer" class="answer-card" aria-live="polite">
              <div class="answer-label">分析结果 · {{ assistantAnswer.mode === 'local-readonly-analysis' ? '本地确定性分析' : assistantAnswer.mode }}</div><p>{{ assistantAnswer.answer }}</p>
              <div v-if="assistantAnswer.citations.length" class="citation-list">
                <span v-for="(citation, index) in assistantAnswer.citations" :key="`${citation.category}-${citation.recordId}-${index}`">证据 {{ index + 1 }} · {{ citation.category }} #{{ citation.recordId }}</span>
              </div>
            </div>
          </section>

          <section class="panel quality-panel">
            <div class="panel-head"><div><div class="panel-kicker">DATA QUALITY</div><h2>品类健康度</h2></div><router-link to="/config" class="panel-link">管理数据 →</router-link></div>
            <div class="quality-list">
              <button v-for="category in sortedCategories" :key="category.key" class="quality-row" @click="router.push(`/power/${category.key}`)">
                <span class="quality-icon" :class="qualityClass(category.qualityScore)">{{ category.name.slice(0, 1) }}</span>
                <span class="quality-main"><strong>{{ category.name }}</strong><small>{{ category.records }} 条记录 · 缺测 {{ category.missing }}</small></span>
                <span class="quality-score" :class="qualityClass(category.qualityScore)">{{ category.qualityScore }}<small>分</small></span><b>↗</b>
              </button>
              <div v-if="!sortedCategories.length" class="empty-state">导入功耗数据后，这里会显示品类健康度。</div>
            </div>
          </section>
        </div>

        <div class="work-grid lower-grid">
          <section class="panel anomaly-panel">
            <div class="panel-head"><div><div class="panel-kicker">REVIEW QUEUE</div><h2>异常记录</h2></div><span class="panel-caption">IQR 统计规则 · 样本不足时不判定</span></div>
            <div v-if="summary.anomalies.length" class="anomaly-list">
              <button v-for="item in summary.anomalies.slice(0, 8)" :key="`${item.category}-${item.recordId}-${item.field}`" class="anomaly-row" @click="router.push(`/power/${item.category}`)">
                <span class="anomaly-mark">!</span><span class="anomaly-main"><strong>{{ item.categoryName }} · {{ item.brand }} {{ item.model }}</strong><small>{{ item.label }} · 记录 #{{ item.recordId }}</small></span><span class="anomaly-value">{{ item.value }}<small v-if="item.deviation !== null">{{ item.deviation > 0 ? '+' : '' }}{{ item.deviation.toFixed(1) }}%</small></span><b>查看 →</b>
              </button>
            </div>
            <div v-else class="empty-state">当前没有需要优先复核的异常记录。</div>
          </section>

          <section class="panel batch-panel">
            <div class="panel-head"><div><div class="panel-kicker">DATA LINEAGE</div><h2>最近数据批次</h2></div><span class="panel-caption">可追溯导入记录</span></div>
            <div v-if="summary.datasets.length" class="batch-list">
              <div v-for="batch in summary.datasets.slice(0, 6)" :key="batch.batch_id" class="batch-row"><span class="batch-id">{{ batch.batch_id }}</span><span class="batch-main"><strong>{{ batch.file_name }}</strong><small>{{ formatDate(batch.created_at) }} · {{ batch.total_records }} 条记录</small></span><span class="batch-status">已登记</span></div>
            </div>
            <div v-else class="empty-state">完成一次管理员导入后，这里会记录文件、批次和记录数。</div>
          </section>
        </div>
      </template>
      <div v-else class="state-card">正在读取实验数据…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { dbApi, type AssistantAnswer, type LabSummary } from '#/api/db';

const router = useRouter();
const summary = ref<LabSummary | null>(null);
const loading = ref(true);
const error = ref('');
const question = ref('');
const assistantLoading = ref(false);
const assistantAnswer = ref<AssistantAnswer | null>(null);
const prompts = ['旗舰手机综合功耗谁更高？', '按待机功耗谁最好？', '按游戏功耗谁最耗电？'];
const sortedCategories = computed(() => [...(summary.value?.categories || [])].sort((a, b) => a.qualityScore - b.qualityScore));
const qualityLabel = computed(() => {
  const score = summary.value?.totals.qualityScore ?? 0;
  return score >= 90 ? '数据状态稳定' : score >= 70 ? '建议抽查缺测项' : '建议先完成数据复核';
});
function qualityClass(score: number) { return score >= 90 ? 'good' : score >= 70 ? 'watch' : 'risk'; }
function formatDate(value: string) { return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
async function loadSummary() {
  loading.value = true; error.value = '';
  const result = await dbApi.getLabSummary();
  if (result.success && result.data) summary.value = result.data;
  else error.value = result.message || '服务暂时不可用。';
  loading.value = false;
}
async function ask(value = question.value) {
  const text = value.trim(); if (!text || assistantLoading.value) return;
  question.value = text; assistantLoading.value = true;
  const result = await dbApi.askAssistant(text);
  if (result.success && result.data) assistantAnswer.value = result.data;
  else assistantAnswer.value = { answer: result.message || '分析助手暂时不可用。', citations: [], generatedAt: new Date().toISOString(), mode: 'error' };
  assistantLoading.value = false;
}
onMounted(loadSummary);
</script>

<style scoped>
.lab-page { min-height: 100%; background: #f4f7fb; color: #152238; }
.lab-inner { max-width: 1480px; margin: 0 auto; padding: 46px 40px 80px; }
.lab-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 30px; }
.eyebrow, .panel-kicker { color: #71829a; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.eyebrow { display: flex; align-items: center; gap: 8px; color: #5366d8; }
.eyebrow-dot, .status-chip i { width: 7px; height: 7px; display: inline-block; border-radius: 50%; background: #29a778; box-shadow: 0 0 0 4px rgba(41,167,120,.12); }
.lab-hero h1 { margin: 14px 0 12px; color: #17253e; font-size: clamp(34px, 5vw, 64px); line-height: 1.03; letter-spacing: -.06em; }
.lab-hero h1 span { display: block; color: #5366d8; }
.lab-hero p { max-width: 650px; margin: 0; color: #71829a; line-height: 1.8; }
.refresh-button { display: inline-flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid #dbe3ee; border-radius: 12px; background: #fff; color: #5366d8; cursor: pointer; box-shadow: 0 8px 24px rgba(36,58,93,.06); }
.refresh-button b { font-size: 20px; font-weight: 500; }
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.metric-card, .panel, .state-card { border: 1px solid #e5ebf3; border-radius: 18px; background: rgba(255,255,255,.94); box-shadow: 0 12px 30px rgba(36,58,93,.05); }
.metric-card { padding: 20px 22px; }
.metric-card > span { color: #8290a5; font-size: 12px; }
.metric-card strong { display: block; margin-top: 10px; color: #1b2a45; font-size: 34px; letter-spacing: -.04em; }
.metric-card strong small { margin-left: 3px; color: #9aa7ba; font-size: 14px; }
.metric-card p { margin: 6px 0 0; color: #8290a5; font-size: 12px; }
.metric-primary strong { color: #5366d8; }.metric-warning strong { color: #c56a31; }
.work-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, .8fr); gap: 20px; margin-bottom: 20px; }
.panel { padding: 24px; }.panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }.panel h2 { margin: 8px 0 0; color: #1b2a45; font-size: 22px; letter-spacing: -.03em; }.panel-intro { margin: 18px 0; color: #7a899d; font-size: 13px; line-height: 1.7; }.status-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 99px; background: #eff9f5; color: #23845f; font-size: 11px; white-space: nowrap; }.prompt-list { display: flex; flex-wrap: wrap; gap: 8px; }.prompt-list button { padding: 8px 11px; border: 1px solid #dce4ef; border-radius: 9px; background: #f8faff; color: #5e6d84; cursor: pointer; font-size: 12px; }.prompt-list button:hover { border-color: #8e9be6; color: #5366d8; }.ask-form { display: flex; gap: 10px; margin-top: 16px; }.ask-form input { min-width: 0; flex: 1; padding: 13px 14px; border: 1px solid #cfd8e5; border-radius: 10px; outline: none; background: #eef1f5; color: #1b2a45; caret-color: #5366d8; } .ask-form input::placeholder { color: #7d8999; opacity: 1; }.ask-form input:focus { border-color: #7788e2; box-shadow: 0 0 0 3px rgba(83,102,216,.12); }.ask-form button { padding: 0 17px; border: 0; border-radius: 10px; background: #5366d8; color: #fff; cursor: pointer; }.ask-form button:disabled { opacity: .55; cursor: not-allowed; }.answer-card { margin-top: 18px; padding: 16px; border-radius: 12px; background: #f5f7ff; border: 1px solid #dbe1ff; }.answer-label { color: #5366d8; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }.answer-card p { margin: 9px 0 0; color: #35445b; line-height: 1.7; font-size: 13px; }.citation-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }.citation-list span { padding: 5px 8px; border-radius: 6px; background: #e8edff; color: #5366d8; font-size: 10px; }
.panel-link { color: #5366d8; font-size: 12px; text-decoration: none; }.panel-caption { color: #9aa7ba; font-size: 11px; }.quality-list, .anomaly-list, .batch-list { margin-top: 17px; }.quality-row, .anomaly-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 0; border: 0; border-bottom: 1px solid #edf1f6; background: transparent; color: inherit; text-align: left; cursor: pointer; }.quality-row:last-child, .anomaly-row:last-child { border-bottom: 0; }.quality-icon { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 10px; font-weight: 800; }.quality-icon.good { background: #e7f7f0; color: #248760; }.quality-icon.watch { background: #fff3df; color: #b76a1e; }.quality-icon.risk { background: #ffebeb; color: #be4c54; }.quality-main, .anomaly-main, .batch-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }.quality-main strong, .anomaly-main strong, .batch-main strong { overflow: hidden; color: #2d3c54; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.quality-main small, .anomaly-main small, .batch-main small { color: #93a0b2; font-size: 11px; }.quality-score { font-size: 17px; font-weight: 800; }.quality-score small { margin-left: 2px; font-size: 10px; font-weight: 500; }.quality-score.good { color: #248760; }.quality-score.watch { color: #b76a1e; }.quality-score.risk { color: #be4c54; }.quality-row > b, .anomaly-row > b { color: #9aa7ba; font-size: 12px; }.anomaly-mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: #fff0e5; color: #c56a31; font-weight: 800; }.anomaly-value { color: #be5f2d; font-size: 16px; font-weight: 800; }.anomaly-value small { display: block; font-size: 10px; font-weight: 500; text-align: right; }.batch-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #edf1f6; }.batch-row:last-child { border-bottom: 0; }.batch-id { padding: 5px 7px; border-radius: 6px; background: #edf1ff; color: #5366d8; font-family: ui-monospace, monospace; font-size: 10px; }.batch-status { color: #2a936d; font-size: 11px; }.empty-state { padding: 24px 0; color: #93a0b2; font-size: 13px; line-height: 1.6; }.state-card { display: flex; gap: 12px; align-items: center; padding: 22px; color: #6f7e94; }.state-card.error { color: #a84d57; }.state-card button { margin-left: auto; padding: 8px 12px; border: 1px solid #efb8bd; border-radius: 8px; background: #fff; color: #a84d57; cursor: pointer; }
@media (max-width: 980px) { .metric-grid { grid-template-columns: repeat(2, 1fr); }.work-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .lab-inner { padding: 28px 16px 56px; }.lab-hero { display: block; }.refresh-button { margin-top: 20px; }.metric-grid { gap: 10px; }.metric-card { padding: 15px; }.metric-card strong { font-size: 27px; }.panel { padding: 18px 15px; }.ask-form { display: block; }.ask-form input { width: 100%; box-sizing: border-box; }.ask-form button { width: 100%; min-height: 43px; margin-top: 8px; }.status-chip { font-size: 10px; }.panel-caption { display: none; } }
</style>

