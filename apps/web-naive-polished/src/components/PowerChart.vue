<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ChartConfigItem } from '#/api/db';
import { displayValue, toMeasurement } from '#/utils/measurements';

export interface ChartSample {
  id: number;
  brand: string;
  model: string;
  color: string;
  [key: string]: unknown;
}
const props = defineProps<{
  config: ChartConfigItem;
  samples: ChartSample[];
  unit: string;
  baselineId?: number | null;
}>();
const host = ref<HTMLElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;
const numericRows = computed(() =>
  props.samples.map((sample) => ({
    sample,
    values: props.config.fields.map((field) => toMeasurement(sample[field])),
  })),
);
const hasValues = computed(() =>
  numericRows.value.some((row) => row.values.some((value) => value !== null)),
);
const missing = computed(() =>
  numericRows.value.reduce(
    (count, row) => count + row.values.filter((v) => v === null).length,
    0,
  ),
);
const supported = computed(() =>
  ['bar', 'barH', 'line'].includes(props.config.chartType),
);
const baseline = computed(
  () => props.samples.find((sample) => sample.id === props.baselineId) || null,
);
const fieldLabel = (index: number) =>
  props.config.labels[index] || props.config.fields[index] || '';
const sampleName = (sample: ChartSample) => {
  const name = [sample.brand, sample.model].filter(Boolean).join(' ');
  const duplicateCount = props.samples.filter(
    (item) => item.brand === sample.brand && item.model === sample.model,
  ).length;
  return duplicateCount > 1 ? `${name} · 记录 #${sample.id}` : name;
};
const deltaFor = (field: string, value: number | null) => {
  if (!baseline.value || value === null) return null;
  const baselineValue = toMeasurement(baseline.value[field]);
  return baselineValue === null ? null : value - baselineValue;
};
const deltaLabel = (value: number | null) => {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
};
function updateChart() {
  if (!host.value) return;
  if (!hasValues.value || !props.samples.length) {
    chart?.dispose();
    chart = undefined;
    return;
  }
  if (!chart) chart = echarts.init(host.value);
  const horizontal = props.config.chartType === 'barH';
  const line = props.config.chartType === 'line';
  const series = numericRows.value.map(({ sample, values }) => ({
    name: sampleName(sample),
    type: line ? 'line' : 'bar',
    data: values,
    connectNulls: false,
    smooth: false,
    symbolSize: 7,
    barMaxWidth: 42,
    itemStyle: {
      color: sample.color,
      borderRadius: line ? 0 : horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0],
    },
    label: {
      show: !line,
      position: horizontal ? 'right' : 'top',
      color: '#52637c',
      fontSize: 12,
      formatter: (p: { value: unknown }) => displayValue(p.value),
    },
    emphasis: { focus: 'series' },
    lineStyle: { width: 2 },
  }));
  const categoryAxis = {
    type: 'category',
    data: props.config.fields.map((_, i) => fieldLabel(i)),
    axisLabel: {
      color: '#52637c',
      fontSize: 12,
      interval: 0,
      overflow: 'truncate',
      width: 120,
    },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#cbd5e1' } },
  };
  const valueAxis = {
    type: 'value',
    name: props.unit || '单位未标注',
    nameTextStyle: { color: '#52637c', fontSize: 12 },
    axisLabel: { color: '#52637c' },
    splitLine: { lineStyle: { color: '#e7edf4' } },
  };
  chart.setOption(
    {
      animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      aria: {
        enabled: true,
        description: `${props.config.scenario}；${props.unit || '单位未标注'}。精确数值可在图表下方展开。`,
      },
      tooltip: {
        trigger: 'axis',
        renderMode: 'richText',
        confine: true,
        valueFormatter: (value: unknown) =>
          value == null ? '未测量' : String(value),
      },
      legend: { show: false },
      grid: {
        top: 40,
        bottom: 28,
        left: 12,
        right: horizontal ? 72 : 28,
        containLabel: true,
      },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series,
    },
    { notMerge: true },
  );
  chart.resize();
}
watch(() => [props.samples, props.config, props.unit], updateChart, {
  deep: true,
  flush: 'post',
});
onMounted(() => {
  updateChart();
  observer = new ResizeObserver(() => {
    if (chart && !chart.isDisposed()) chart.resize();
  });
  if (host.value) observer.observe(host.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>

<template>
  <article class="measurement-chart">
    <div class="chart-heading">
      <h4>{{ config.scenario }}</h4>
      <span>{{ unit || '单位未标注' }}</span>
    </div>
    <p v-if="baseline" class="baseline-note">
      基准：{{ sampleName(baseline) }}；差值 = 当前值 − 基准值
    </p>
    <p v-if="config.conclusion?.trim()" class="import-note">
      导入备注：{{ config.conclusion }}
    </p>
    <p v-if="!supported" class="data-note">该配置以分组柱状图展示原始数值。</p>
    <div
      ref="host"
      class="chart-content"
      :class="{ 'has-no-values': !hasValues }"
      :aria-label="config.scenario"
    ></div>
    <p v-if="!samples.length" class="chart-empty">
      当前图例全部隐藏，请恢复至少一个测试对象。
    </p>
    <p v-else-if="!hasValues" class="chart-empty">当前场景暂无有效测量值。</p>
    <p v-if="missing" class="data-note" role="status">
      {{ missing }} 项缺测或无效数值以“—”标识，不按 0 绘制。
    </p>
    <details class="raw-values">
      <summary>核对原始数值</summary>
      <div class="raw-scroll">
        <table>
          <caption class="visually-hidden">
            {{
              config.scenario
            }}原始测量数据，单位：{{
              unit || '未标注'
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">测试对象</th>
              <th v-for="(field, i) in config.fields" :key="field" scope="col">
                {{ fieldLabel(i) }}<span v-if="baseline"> / Δ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in numericRows" :key="row.sample.id">
              <th scope="row">{{ sampleName(row.sample) }}</th>
              <td v-for="(value, i) in row.values" :key="i">
                {{ value === null ? '—' : displayValue(value) }}
                <small v-if="baseline" class="delta-value">
                  ·
                  {{
                    deltaLabel(deltaFor(config.fields[i] || '', value))
                  }}</small
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </article>
</template>

<style scoped>
.measurement-chart {
  min-width: 0;
  padding: 20px;
  border: 1px solid #e2e8f1;
  border-radius: 14px;
  background: #fcfdff;
}
.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.chart-heading h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: #203451;
}
.chart-heading span {
  font-size: 13px;
  color: #52637c;
}
.chart-content {
  height: 300px;
  width: 100%;
}
.chart-content.has-no-values {
  height: 0;
  visibility: hidden;
}
.chart-empty {
  display: grid;
  place-items: center;
  min-height: 170px;
  font-size: 14px;
  color: #52637c;
  text-align: center;
}
.import-note,
.data-note,
.baseline-note {
  color: #52637c;
  font-size: 13px;
  line-height: 1.6;
  margin: 12px 0;
}
.baseline-note {
  color: #4038b5;
}
.delta-value {
  color: #655ad0;
  font-variant-numeric: tabular-nums;
}
.raw-values {
  border-top: 1px solid #e4eaf2;
  padding-top: 12px;
}
.raw-values summary {
  color: #4038b5;
  cursor: pointer;
  font-size: 13px;
}
.raw-scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 12px;
  font-variant-numeric: tabular-nums;
}
th,
td {
  text-align: left;
  border-bottom: 1px solid #e4eaf2;
  padding: 10px;
  font-size: 13px;
  color: #334963;
}
th {
  font-weight: 600;
  white-space: nowrap;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 600px) {
  .measurement-chart {
    padding: 14px;
  }
  .chart-content {
    height: 270px;
  }
}
</style>
