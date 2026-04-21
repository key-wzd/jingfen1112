<template>
  <PowerComparisonPage
    category="remote_controls"
    pageTitle="遥控器功耗对比"
    categoryName="遥控器"
    :chartConfigs="chartConfigs"
    :displayColumns="displayColumns"
  />
</template>

<script setup lang="ts">
import PowerComparisonPage from '#/views/components/PowerComparisonPage.vue';
import type { ChartConfigItem, DisplayColumn } from '#/api/db';

const chartConfigs: ChartConfigItem[] = [
  { scenario: '使用', chartType: 'bar', fields: ['dormancy_power', 'sleep_power'], labels: ['休眠功耗', '睡眠功耗'] },
  { scenario: '未使用', chartType: 'line', fields: ['usage_power'], labels: ['使用功耗'] },
];

const displayColumns: DisplayColumn[] = [
  { key: 'brand', label: '品牌' },
  { key: 'model', label: '型号' },
];
</script>
