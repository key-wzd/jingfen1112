<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ category: string; categoryName?: string }>();
const kind = computed(() => {
  const key = props.category.toLowerCase();
  const name = props.categoryName || '';
  if (['phones', 'flagship_phones'].includes(key) || name.includes('旗舰手机')) {
    return 'flagship_phone';
  }
  if (
    ['mid_low_phones', 'mid-range-phones', 'mid_range_phones'].includes(key) ||
    name.includes('中低端手机')
  ) {
    return 'mid_phone';
  }
  if (
    ['routers', 'router', 'wifi_routers', 'wifi_router'].includes(key) ||
    name.includes('路由器')
  ) {
    return 'router';
  }
  if (
    ['car_keys', 'car_key', 'vehicle_keys', 'vehicle_key'].includes(key) ||
    name.includes('车钥匙')
  ) {
    return 'car_key';
  }
  return props.category;
});
</script>

<template>
  <svg
    class="device-icon"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="kind === 'flagship_phone'">
      <rect
        x="17"
        y="5"
        width="30"
        height="54"
        rx="7"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M25 11h14M27 52h10M17 46h30" />
      <rect x="22" y="17" width="20" height="23" rx="2" stroke-width="1.8" />
      <path d="m26 35 5-6 4 3 5-8" stroke-width="1.8" />
      <circle cx="24" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="28" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="32" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="kind === 'mid_phone'">
      <rect
        x="15"
        y="7"
        width="34"
        height="50"
        rx="5"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M25 12h14M28 51h8" />
      <rect x="19" y="17" width="26" height="27" rx="3" stroke-width="1.8" />
      <path d="M23 39h18M23 35l5-6 4 4 5-7" stroke-width="1.8" />
      <circle cx="42" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="37" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="kind === 'router'">
      <path d="M19 19 13 7M45 19l6-12" />
      <circle cx="13" cy="7" r="2" fill="currentColor" />
      <circle cx="51" cy="7" r="2" fill="currentColor" />
      <rect
        x="8"
        y="19"
        width="48"
        height="29"
        rx="8"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M18 35c3-5 7-7 14-7s11 2 14 7M23 39c2-3 5-4 9-4s7 1 9 4" />
      <circle cx="19" cy="43" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="26" cy="43" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="33" cy="43" r="1.8" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="kind === 'car_key'">
      <path
        d="M32 8c-8 0-14 6-14 14 0 6 3 11 8 13v18c0 2 2 3 4 3h4c2 0 4-1 4-3V35c5-2 8-7 8-13 0-8-6-14-14-14Z"
        fill="currentColor"
        fill-opacity=".07"
      />
      <circle cx="32" cy="20" r="5" />
      <circle cx="32" cy="20" r="1.8" fill="currentColor" stroke="none" />
      <path d="M26 39h12M26 46h12M27 53h4m6 0h1" />
      <path d="M18 31 9 40m0 0 4 4m-4-4 4-4" />
    </g>
    <g v-else-if="kind === 'mice'">
      <path
        d="M32 8c-11 0-18 9-18 21v10c0 12 7 20 18 20s18-8 18-20V29C50 17 43 8 32 8Z"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M32 8V5c0-3 3-4 7-4M15 31h34M32 9v8M32 25v6" />
      <rect
        x="29"
        y="17"
        width="6"
        height="9"
        rx="3"
        fill="currentColor"
        fill-opacity=".3"
      />
    </g>
    <g v-else-if="kind === 'keyboards'">
      <rect
        x="4"
        y="16"
        width="56"
        height="34"
        rx="5"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path
        d="M12 24h3m7 0h3m7 0h3m7 0h3m7 0h1M12 32h3m7 0h3m7 0h3m7 0h3m7 0h1M12 41h3m7 0h23m7 0h1"
        stroke-width="3.4"
      />
      <path d="M32 16v-5h8" stroke-width="2" />
    </g>
    <g v-else-if="kind === 'remote_controls'">
      <rect
        x="20"
        y="4"
        width="24"
        height="56"
        rx="9"
        fill="currentColor"
        fill-opacity=".07"
      />
      <circle cx="32" cy="15" r="3" />
      <circle cx="32" cy="31" r="7" />
      <circle cx="32" cy="31" r="2" />
      <path d="M27 45h1m8 0h1M27 51h1m8 0h1" stroke-width="3" />
    </g>
    <g v-else-if="kind === 'tablets'">
      <rect
        x="10"
        y="5"
        width="44"
        height="54"
        rx="5"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M17 13h30v36H17zM30 54h4" />
    </g>
    <g v-else-if="kind === 'laptops'">
      <rect
        x="12"
        y="12"
        width="40"
        height="30"
        rx="3"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M12 42 4 51h56l-8-9M26 47h12" />
    </g>
    <g v-else-if="kind === 'monitors'">
      <rect
        x="5"
        y="10"
        width="54"
        height="34"
        rx="3"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M32 44v10M21 55h22" />
    </g>
    <g v-else>
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="8"
        fill="currentColor"
        fill-opacity=".07"
      />
      <path d="M18 33h7l5-12 6 23 5-11h6" />
    </g>
  </svg>
</template>

<style scoped>
.device-icon {
  display: block;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
}
</style>
