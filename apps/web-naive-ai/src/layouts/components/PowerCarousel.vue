<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import type { OverviewData } from '#/api/db';

const props = defineProps<{ overview?: OverviewData | null }>();

const activeIndex = ref(0);
const paused = ref(false);
let timer: number | undefined;

const slides = computed(() => [
  {
    eyebrow: '场景总览',
    title: '把多品类测试记录，放到同一张分析桌面。',
    text: '从设备、场景和单位出发，快速定位需要核对的功耗差异。',
    tag: '数据集总览',
  },
  {
    eyebrow: '测试曲线',
    title: '观察从启动到稳定状态的功耗变化。',
    text: '适合展示连续采样、待机恢复和长时间运行等测试过程。',
    tag: '时间序列',
  },
  {
    eyebrow: '对象对照',
    title: '用相同场景，核对不同测试对象的记录。',
    text: '保留原始数值、缺测标记和测试对象身份，减少误读。',
    tag: '横向比较',
  },
]);

const currentSlide = computed(
  () => slides.value[activeIndex.value] || slides.value[0]!,
);

function next() {
  activeIndex.value = (activeIndex.value + 1) % slides.value.length;
}

function previous() {
  activeIndex.value =
    (activeIndex.value - 1 + slides.value.length) % slides.value.length;
}

function startTimer() {
  window.clearInterval(timer);
  timer = window.setInterval(() => {
    if (!paused.value) next();
  }, 6800);
}

function select(index: number) {
  activeIndex.value = index;
  startTimer();
}

onMounted(startTimer);
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <section
    class="analysis-carousel"
    aria-roledescription="carousel"
    aria-label="内部功耗分析方式"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div class="carousel-inner">
      <div class="carousel-copy">
        <div class="carousel-kicker">
          <span class="carousel-dot"></span> INTERNAL POWER LAB
        </div>
        <Transition name="carousel-fade" mode="out-in">
          <div :key="activeIndex">
            <p class="carousel-eyebrow">{{ currentSlide.eyebrow }}</p>
            <h2>{{ currentSlide.title }}</h2>
            <p class="carousel-description">{{ currentSlide.text }}</p>
          </div>
        </Transition>
        <div class="carousel-controls">
          <button aria-label="上一张分析视图" @click="previous">←</button>
          <div
            class="carousel-indicators"
            role="tablist"
            aria-label="选择分析视图"
          >
            <button
              v-for="(slide, index) in slides"
              :key="slide.tag"
              role="tab"
              :aria-label="`第 ${index + 1} 张：${slide.tag}`"
              :aria-selected="activeIndex === index"
              :class="{ active: activeIndex === index }"
              @click="select(index)"
            ></button>
          </div>
          <button aria-label="下一张分析视图" @click="next">→</button>
          <span class="carousel-status"
            >{{ String(activeIndex + 1).padStart(2, '0') }} /
            {{ String(slides.length).padStart(2, '0') }}</span
          >
        </div>
      </div>

      <div class="carousel-visual" aria-hidden="true">
        <div class="visual-topline">
          <span>{{ currentSlide.tag }}</span
          ><i></i><small>{{ overview?.powerCount || '—' }} 条记录</small>
        </div>
        <div class="visual-grid"></div>
        <svg
          class="visual-chart"
          viewBox="0 0 520 250"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="power-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#9ca7ff" stop-opacity=".42" />
              <stop offset="1" stop-color="#9ca7ff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            class="chart-area"
            d="M0 188 C48 172 62 110 110 132 S166 178 214 108 S276 82 320 122 S372 180 418 93 S478 72 520 36 V250 H0 Z"
          />
          <path
            class="chart-line"
            d="M0 188 C48 172 62 110 110 132 S166 178 214 108 S276 82 320 122 S372 180 418 93 S478 72 520 36"
          />
          <circle cx="214" cy="108" r="6" />
          <circle cx="418" cy="93" r="6" />
        </svg>
        <div class="visual-bars">
          <span
            v-for="bar in [42, 64, 50, 78, 61, 90, 74, 96]"
            :key="bar"
            :style="{ height: `${bar}%` }"
          ></span>
        </div>
        <div class="visual-footer">
          <strong>mW</strong><span>原始记录 · 场景差异 · 导入备注</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.analysis-carousel {
  position: relative;
  overflow: hidden;
  background: #182447;
  color: #fff;
}
.carousel-inner {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 70px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 56px 32px;
}
.carousel-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.carousel-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #aab5ff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.17em;
}
.carousel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7ee7c3;
  box-shadow: 0 0 0 5px #7ee7c31c;
}
.carousel-eyebrow {
  margin: 34px 0 10px;
  color: #7ee7c3;
  font-size: 13px;
  font-weight: 700;
}
.carousel-copy h2 {
  max-width: 560px;
  margin: 0;
  color: #fff;
  font-size: clamp(26px, 3.2vw, 45px);
  line-height: 1.15;
  letter-spacing: -0.045em;
}
.carousel-description {
  max-width: 480px;
  margin: 17px 0 0;
  color: #bac3db;
  font-size: 14px;
  line-height: 1.8;
}
.carousel-controls {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 35px;
}
.carousel-controls > button {
  width: 34px;
  height: 34px;
  border: 1px solid #ffffff2e;
  border-radius: 10px;
  background: #ffffff0b;
  color: #fff;
  cursor: pointer;
}
.carousel-indicators {
  display: flex;
  gap: 6px;
  align-items: center;
}
.carousel-indicators button {
  width: 18px;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: #ffffff30;
  cursor: pointer;
  transition:
    width 0.2s ease,
    background 0.2s ease;
}
.carousel-indicators button.active {
  width: 36px;
  background: #aab5ff;
}
.carousel-status {
  color: #8d99b7;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.carousel-visual {
  position: relative;
  min-height: 300px;
  padding: 20px 22px;
  border: 1px solid #ffffff1e;
  border-radius: 20px;
  background: linear-gradient(145deg, #2a386d, #1b2750);
  box-shadow: 0 24px 60px #050c241f;
}
.visual-topline,
.visual-footer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ccd3ee;
  font-size: 11px;
}
.visual-topline i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7ee7c3;
}
.visual-topline small {
  margin-left: auto;
  color: #aab6d3;
  font-size: 10px;
}
.visual-grid {
  position: absolute;
  inset: 55px 20px 42px;
  opacity: 0.45;
  background-image:
    linear-gradient(#ffffff12 1px, transparent 1px),
    linear-gradient(90deg, #ffffff12 1px, transparent 1px);
  background-size: 52px 42px;
}
.visual-chart {
  position: absolute;
  right: 24px;
  bottom: 58px;
  left: 24px;
  width: calc(100% - 48px);
  height: 190px;
  overflow: visible;
}
.chart-area {
  fill: url(#power-area);
}
.chart-line {
  fill: none;
  stroke: #aab5ff;
  stroke-width: 3;
}
.visual-chart circle {
  fill: #7ee7c3;
  stroke: #fff;
  stroke-width: 3;
}
.visual-bars {
  position: absolute;
  right: 24px;
  bottom: 48px;
  left: 24px;
  display: flex;
  align-items: end;
  gap: 12px;
  height: 58px;
  opacity: 0.27;
}
.visual-bars span {
  flex: 1;
  border-radius: 5px 5px 0 0;
  background: #aab5ff;
}
.visual-footer {
  position: absolute;
  right: 22px;
  bottom: 19px;
  left: 22px;
  justify-content: space-between;
  color: #8f9bb8;
}
.visual-footer strong {
  color: #7ee7c3;
  font-size: 15px;
}
.carousel-fade-enter-active,
.carousel-fade-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}
.carousel-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.carousel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
@media (max-width: 780px) {
  .carousel-inner {
    grid-template-columns: 1fr;
    gap: 30px;
    padding: 42px 20px;
  }
  .carousel-visual {
    min-height: 250px;
  }
  .carousel-copy h2 {
    font-size: 29px;
  }
  .carousel-controls {
    margin-top: 25px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .carousel-indicators button,
  .carousel-fade-enter-active,
  .carousel-fade-leave-active {
    transition: none;
  }
}
</style>
