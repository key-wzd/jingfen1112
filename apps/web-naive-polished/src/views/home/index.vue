<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-glow hero-glow-one"></div>
      <div class="hero-glow hero-glow-two"></div>
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot"></span>TECHCOMPARE · INTERNAL LAB
          </div>
          <h1 class="hero-title">
            功耗数据可视化<br /><span>场景差异，一目了然。</span>
          </h1>
          <p class="hero-desc">
            面向内部测试与研发人员，集中查看设备功耗记录，按场景进行横向对比与数据核对。
          </p>
          <div class="hero-actions">
            <button class="primary-action" @click="scrollToCategories">
              进入分析 <span>↗</span>
            </button>
            <button
              class="ghost-action"
              @click="router.push('/compare/phones')"
            >
              查看设备参数
            </button>
          </div>
          <div class="hero-note">
            <span>●</span> 内部分析工作台 · 按测试场景对比
          </div>
        </div>

        <div class="hero-dashboard" aria-label="数据概览">
          <div class="dashboard-topline">
            <span>数据概览</span><span>{{ statusLabel }}</span>
          </div>
          <div class="dashboard-main-value">
            {{ overview ? totalPowerRecords.toLocaleString() : '—'
            }}<small> 条</small>
          </div>
          <p>已收录功耗记录</p>
          <dl class="overview-details">
            <div>
              <dt>设备信息</dt>
              <dd>{{ overview ? totalProducts : '—' }} 条</dd>
            </div>
            <div>
              <dt>测试品类</dt>
              <dd>{{ overview ? categories.length : '—' }} 类</dd>
            </div>
          </dl>
          <div class="dashboard-foot">
            <span>最近获取</span
            ><strong>{{ refreshedAt || '尚未获取' }}</strong>
          </div>
        </div>
      </div>
    </section>

    <PowerCarousel :overview="overview" />

    <section class="metrics-strip">
      <div class="metrics-inner">
        <div class="metric-item">
          <strong>{{ overview ? categories.length : '—' }}</strong
          ><span>测试品类</span>
        </div>
        <div class="metric-item">
          <strong>{{ overview ? totalProducts.toLocaleString() : '—' }}</strong
          ><span>设备信息</span>
        </div>
        <div class="metric-item">
          <strong>{{
            overview ? totalPowerRecords.toLocaleString() : '—'
          }}</strong
          ><span>功耗记录</span>
        </div>
        <div class="metric-item metric-highlight">
          <span class="live-dot" :class="{ offline: !overview }"></span
          ><strong>{{ statusLabel }}</strong
          ><span>数据状态</span>
        </div>
      </div>
    </section>

    <section id="categories" class="category-section">
      <div class="section-heading">
        <div>
          <div class="section-kicker">测试品类</div>
          <h2 class="section-title">选择设备品类，进入功耗分析</h2>
          <p class="section-subtitle">
            直接查看已有测试数据，选择对比对象，核对各场景的功耗差异。
          </p>
        </div>
        <button class="section-link" @click="router.push('/compare/phones')">
          设备参数对照 <span>→</span>
        </button>
      </div>

      <div v-if="loading" class="category-loading">
        <span></span><span></span><span></span>
      </div>
      <div v-else-if="!error" class="category-grid">
        <button
          v-for="(cat, index) in categories"
          :key="cat.key"
          class="category-card"
          :class="`accent-${index % 4}`"
          @click="goToCompare(cat.key)"
        >
          <div class="category-card-top">
            <span class="category-icon"><DeviceIcon :category="cat.key" /></span
            ><span class="card-arrow">↗</span>
          </div>
          <div class="category-index">
            {{ String(index + 1).padStart(2, '0') }}
          </div>
          <h3>{{ cat.name }}</h3>
          <p>
            {{ cat.powerCount }} 条功耗记录 · {{ cat.infoCount }} 条设备信息
          </p>
          <div class="category-card-bottom">
            <span>功耗分析</span><span class="card-line"></span>
          </div>
        </button>
      </div>
      <div v-if="error" class="lab-status error" role="alert">
        <span>{{ error }}</span
        ><button @click="loadCategories">重新获取</button>
      </div>
      <div
        v-else-if="!loading && categories.length === 0"
        class="empty-categories"
      >
        <strong>暂无测试数据</strong
        ><span>导入测试记录后，品类与统计信息将在这里显示。</span>
      </div>
    </section>

    <section class="how-section">
      <div class="how-inner">
        <div class="how-copy">
          <div class="section-kicker">分析流程</div>
          <h2>从测试记录<br /><span>到可视化对比。</span></h2>
          <p>
            按品类定位测试记录，在相同场景与单位下核对数值；缺测项单独标识，不参与数值比较。
          </p>
        </div>
        <div class="steps">
          <div class="step">
            <b>01</b>
            <div>
              <strong>定位测试数据</strong>
              <p>按手机、鼠标、键盘等设备品类进入分析。</p>
            </div>
          </div>
          <div class="step">
            <b>02</b>
            <div>
              <strong>指定对比对象</strong>
              <p>按品牌与型号选择测试对象，支持多设备横向观察。</p>
            </div>
          </div>
          <div class="step">
            <b>03</b>
            <div>
              <strong>核对场景差异</strong>
              <p>结合图表、原始数值及导入备注，检查功耗差异。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div><span>TC</span> TechCompare</div>
      <p>内部测试与研发 · 功耗数据可视化平台</p>
      <small>© {{ new Date().getFullYear() }} TechCompare</small>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { dbApi, type OverviewData } from '#/api/db';
import DeviceIcon from '#/components/DeviceIcon.vue';
import PowerCarousel from '#/layouts/components/PowerCarousel.vue';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const overview = ref<OverviewData | null>(null);
const refreshedAt = ref('');
const categories = computed(() => overview.value?.categories || []);
const totalProducts = computed(() => overview.value?.infoCount || 0);
const totalPowerRecords = computed(() => overview.value?.powerCount || 0);
const statusLabel = computed(() =>
  loading.value ? '获取中' : error.value ? '连接失败' : '已获取',
);

async function loadCategories() {
  loading.value = true;
  error.value = '';
  overview.value = null;
  const result = await dbApi.getOverview();
  if (result.success && result.data) {
    overview.value = result.data;
    refreshedAt.value = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
    });
  } else {
    error.value = result.message || '数据获取失败，请检查服务连接后重试。';
    refreshedAt.value = '';
  }
  loading.value = false;
}
const goToCompare = (category: string) => router.push(`/power/${category}`);
const scrollToCategories = () =>
  document.querySelector('#categories')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });
onMounted(loadCategories);
</script>

<style scoped>
.home-page {
  min-height: 100%;
  overflow: hidden;
  background: #f4f7fb;
  color: #152238;
}
.hero-section {
  position: relative;
  overflow: hidden;
  background: #111a35;
  color: #fff;
}
.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 64px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 92px 32px 86px;
}
.hero-copy {
  max-width: 640px;
}
.eyebrow,
.section-kicker {
  color: #8f9cff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.eyebrow-dot,
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7ee7c3;
  box-shadow: 0 0 0 5px rgba(126, 231, 195, 0.12);
}
.hero-title {
  margin: 22px 0 20px;
  color: #fff;
  font-size: clamp(42px, 6vw, 78px);
  line-height: 0.98;
  letter-spacing: -0.065em;
}
.hero-title span {
  color: #aeb7ff;
}
.hero-desc {
  max-width: 460px;
  margin: 0;
  color: #afb8cf;
  font-size: 16px;
  line-height: 1.8;
}
.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 34px;
}
.primary-action,
.ghost-action {
  padding: 13px 19px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.primary-action {
  border: 0;
  background: #fff;
  color: #26306f;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
}
.primary-action span {
  margin-left: 18px;
  font-size: 16px;
}
.ghost-action {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #e3e7ff;
}
.primary-action:hover,
.ghost-action:hover {
  transform: translateY(-2px);
}
.hero-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 26px;
  color: #7f8aa6;
  font-size: 11px;
}
.hero-note span {
  color: #7ee7c3;
}
.hero-dashboard {
  width: 280px;
  flex: 0 0 280px;
  padding: 23px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  background: linear-gradient(
    155deg,
    rgba(101, 98, 200, 0.28),
    rgba(36, 46, 86, 0.55)
  );
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
}
.dashboard-topline,
.dashboard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #8e9ab7;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.dashboard-topline i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7ee7c3;
}
.dashboard-main-value {
  margin-top: 46px;
  color: #fff;
  font-size: 54px;
  font-weight: 700;
  letter-spacing: -0.07em;
}
.dashboard-main-value small {
  color: #8590ae;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}
.hero-dashboard p {
  margin: 3px 0 26px;
  color: #9ca6c0;
  font-size: 12px;
}
.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 80px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.mini-chart span {
  flex: 1;
  border-radius: 5px 5px 2px 2px;
  background: linear-gradient(180deg, #9ca7ff, #5b5bd9);
  opacity: 0.9;
}
.dashboard-foot {
  margin-top: 16px;
  letter-spacing: 0;
  font-weight: 500;
}
.dashboard-foot strong {
  color: #7ee7c3;
  font-size: 11px;
}
.hero-glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  filter: blur(3px);
  opacity: 0.44;
}
.hero-glow-one {
  top: -260px;
  right: -80px;
  background: radial-gradient(circle, #4643aa, transparent 65%);
}
.hero-glow-two {
  bottom: -320px;
  left: 12%;
  background: radial-gradient(circle, #263d8e, transparent 65%);
}
.metrics-strip {
  background: #fff;
  border-bottom: 1px solid #e8edf5;
}
.metrics-inner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 32px;
}
.metric-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 23px 24px;
  border-right: 1px solid #eef1f6;
  color: #8e9caf;
  font-size: 11px;
}
.metric-item:first-child {
  padding-left: 0;
}
.metric-item:last-child {
  border-right: 0;
}
.metric-item strong {
  color: #25334b;
  font-size: 24px;
  letter-spacing: -0.04em;
}
.metric-highlight strong {
  color: #4f46e5;
  font-size: 13px;
}
.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  box-shadow: none;
}
.category-section {
  max-width: 1240px;
  margin: 0 auto;
  padding: 92px 32px 108px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
}
.section-title {
  margin: 12px 0 9px;
  color: #19263d;
  font-size: 34px;
  letter-spacing: -0.05em;
}
.section-subtitle {
  margin: 0;
  color: #8d9aab;
  font-size: 13px;
}
.section-link {
  border: 0;
  background: transparent;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.section-link span {
  margin-left: 8px;
  font-size: 16px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
.category-card {
  min-height: 238px;
  padding: 22px;
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  color: #19263d;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(32, 52, 84, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}
.category-card:hover {
  transform: translateY(-6px);
  border-color: #cfcaff;
  box-shadow: 0 22px 42px rgba(46, 57, 130, 0.12);
}
.category-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #f0efff;
  color: #4f46e5;
  font-size: 25px;
  font-weight: 700;
}
.accent-1 .category-icon {
  color: #d06b24;
  background: #fff1e7;
}
.accent-2 .category-icon {
  color: #0c9d86;
  background: #e8faf4;
}
.accent-3 .category-icon {
  color: #3e78cf;
  background: #eaf2ff;
}
.card-arrow {
  color: #b4bfd0;
  font-size: 18px;
}
.category-index {
  margin-top: 30px;
  color: #b4bfd0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.category-card h3 {
  margin: 7px 0 5px;
  font-size: 18px;
  letter-spacing: -0.03em;
}
.category-card p {
  margin: 0;
  color: #8b98aa;
  font-size: 12px;
}
.category-card-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 25px;
  color: #4f46e5;
  font-size: 11px;
  font-weight: 800;
}
.card-line {
  display: block;
  width: 40px;
  height: 1px;
  background: #cfccff;
}
.category-loading {
  display: flex;
  gap: 14px;
}
.category-loading span {
  flex: 1;
  height: 220px;
  border-radius: 18px;
  background: linear-gradient(90deg, #edf1f7, #f9fafc, #edf1f7);
  animation: shimmer 1.2s infinite;
}
.empty-categories {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 60px;
  border: 1px dashed #d5ddeb;
  border-radius: 18px;
  text-align: center;
  color: #8e9caf;
}
.empty-categories strong {
  color: #44516a;
}
.how-section {
  background: #fff;
  border-top: 1px solid #e7ecf3;
  border-bottom: 1px solid #e7ecf3;
}
.how-inner {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 90px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 88px 32px;
}
.how-copy h2 {
  margin: 14px 0;
  color: #19263d;
  font-size: 42px;
  line-height: 1.04;
  letter-spacing: -0.06em;
}
.how-copy h2 span {
  color: #5b55db;
}
.how-copy p {
  max-width: 340px;
  color: #8d9aab;
  font-size: 13px;
  line-height: 1.8;
}
.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step {
  display: flex;
  gap: 22px;
  padding: 21px 0;
  border-bottom: 1px solid #edf0f5;
}
.step b {
  color: #aab4c3;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.step strong {
  color: #27364e;
  font-size: 16px;
}
.step p {
  margin: 7px 0 0;
  color: #8d9aab;
  font-size: 12px;
  line-height: 1.6;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 32px;
  color: #8e9caf;
  font-size: 11px;
}
.footer div {
  color: #2b3951;
  font-weight: 800;
}
.footer div span {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-right: 7px;
  border-radius: 7px;
  background: #4f46e5;
  color: #fff;
  font-size: 8px;
}
.footer p {
  margin: 0;
}
.footer small {
  color: #aeb7c5;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}
@media (max-width: 980px) {
  .hero-inner {
    gap: 34px;
  }
  .hero-dashboard {
    width: 240px;
    flex-basis: 240px;
  }
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .how-inner {
    gap: 45px;
  }
}
@media (max-width: 680px) {
  .hero-inner {
    flex-direction: column;
    align-items: stretch;
    padding: 64px 20px 54px;
  }
  .hero-dashboard {
    width: auto;
  }
  .hero-title {
    font-size: 48px;
  }
  .hero-actions {
    flex-direction: column;
  }
  .metrics-inner {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 20px;
  }
  .metric-item,
  .metric-item:first-child {
    padding: 17px 10px;
  }
  .category-section,
  .how-inner,
  .footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .section-title {
    font-size: 29px;
  }
  .category-grid {
    grid-template-columns: 1fr;
  }
  .how-inner {
    grid-template-columns: 1fr;
    gap: 35px;
    padding-top: 64px;
    padding-bottom: 64px;
  }
  .how-copy h2 {
    font-size: 36px;
  }
  .footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Internal analysis workspace: readable labels and actual dataset totals. */
.hero-title {
  font-size: clamp(34px, 4.1vw, 58px);
  line-height: 1.22;
  letter-spacing: -0.035em;
  font-weight: 650;
}
.hero-inner {
  padding-top: 64px;
  padding-bottom: 64px;
}
.hero-note {
  color: #b0bad1;
  font-size: 13px;
}
.overview-details {
  margin: 20px 0;
}
.overview-details div {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.overview-details dt {
  color: #bbc4dc;
  font-size: 13px;
}
.overview-details dd {
  margin: 0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.dashboard-foot,
.dashboard-topline {
  font-size: 12px;
  letter-spacing: 0.03em;
}
.dashboard-foot strong {
  color: #c3cbff;
  font-size: 12px;
}
.category-grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.category-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
}
.category-card {
  min-height: 248px;
}
.category-card h3 {
  font-size: 20px;
  font-weight: 650;
}
.category-card p,
.section-subtitle,
.metric-item,
.how-copy p,
.step p {
  color: #52637c;
  font-size: 14px;
  line-height: 1.7;
}
.section-title {
  font-size: 30px;
  letter-spacing: -0.03em;
}
.category-card-bottom,
.section-link {
  font-size: 14px;
}
.category-section {
  padding-top: 52px;
  padding-bottom: 60px;
  scroll-margin-top: 96px;
}
.section-heading {
  align-items: center;
}
.how-inner {
  padding-top: 46px;
  padding-bottom: 46px;
}
.how-copy h2 {
  font-size: 32px;
  line-height: 1.35;
  letter-spacing: -0.03em;
}
.live-dot.offline {
  background: #c08435;
}
@media (max-width: 680px) {
  .hero-dashboard {
    box-sizing: border-box;
    flex-basis: auto;
  }
  .metric-item {
    flex-wrap: wrap;
  }
  .section-title {
    font-size: 25px;
  }
}
</style>
