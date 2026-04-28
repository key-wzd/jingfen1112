<template>
  <PowerComparisonPage
    category="mid_low_phones"
    pageTitle="中低端手机功耗对比"
    categoryName="中低端手机"
    :chartConfigs="chartConfigs"
    :displayColumns="displayColumns"
  />
</template>

<script setup lang="ts">
import PowerComparisonPage from '#/views/components/PowerComparisonPage.vue';
import type { ChartConfigItem, DisplayColumn } from '#/api/db';

const chartConfigs: ChartConfigItem[] = [
  { scenario: '使用', chartType: 'bar', fields: ['video_power', 'game_power', 'browser_power'], labels: ['视频播放功耗', '游戏功耗', '浏览网页功耗'] },
  { scenario: '未使用', chartType: 'line', fields: ['standby_power'], labels: ['待机功耗'] },
];

const displayColumns: DisplayColumn[] = [
  { key: 'brand', label: '品牌' },
  { key: 'model', label: '型号' },
];
</script>
