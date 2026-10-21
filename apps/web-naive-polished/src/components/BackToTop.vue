<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
const visible = ref(false);
const update = () => {
  visible.value = window.scrollY > 320;
};
function scrollToTop() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  window.scrollTo({ top: 0, left: 0, behavior });
}
onMounted(() => {
  update();
  window.addEventListener('scroll', update, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', update));
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      class="back-to-top-button"
      type="button"
      aria-label="一键置顶，返回页面顶部"
      title="返回顶部"
      @click="scrollToTop"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M5 4h14M12 20V8m-6 6 6-6 6 6" />
      </svg>
      <span>置顶</span>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top-button {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 56px;
  min-height: 60px;
  border: 1px solid #d8d4f7;
  border-radius: 15px;
  background: #fff;
  color: #4f46e5;
  box-shadow: 0 8px 28px #27235421;
  cursor: pointer;
}
.back-to-top-button:hover {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}
.back-to-top-button:focus-visible {
  outline: 3px solid #8b83ef;
  outline-offset: 3px;
}
.back-to-top-button svg {
  width: 22px;
  height: 22px;
}
.back-to-top-button span {
  font-size: 12px;
  font-weight: 600;
}
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition: none;
  }
}
@media (max-width: 600px) {
  .back-to-top-button {
    right: 14px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    width: 48px;
    min-height: 52px;
    border-radius: 12px;
  }
}
</style>
