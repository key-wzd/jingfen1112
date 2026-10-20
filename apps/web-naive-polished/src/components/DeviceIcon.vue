<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ category: string }>();
const kind = computed(() => {
  if (['phones', 'mid_low_phones'].includes(props.category)) return 'phone';
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
    <g v-if="kind === 'phone'">
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
