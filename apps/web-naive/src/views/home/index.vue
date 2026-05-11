<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">电子产品功耗对比平台</h1>
        <p class="hero-desc">全面对比各类电子产品参数与功耗，帮助您做出明智选择</p>
      </div>
    </section>

    <section class="category-section">
      <div class="section-inner">
        <h2 class="section-title">选择产品类别</h2>
        <p class="section-subtitle">点击进入对应类别的参数对比页面</p>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.key"
            class="category-card"
            @click="goToCompare(cat.key)"
          >
            <div class="category-icon">{{ cat.icon }}</div>
            <h3 class="category-name">{{ cat.name }}</h3>
            <p class="category-desc">对比{{ cat.name }}的参数与功耗表现</p>
            <span class="category-link">查看对比 →</span>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <p>&copy; {{ new Date().getFullYear() }} TechCompare. 保留所有权利。</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { dbApi } from '#/api/db';

const router = useRouter();

const iconMap: Record<string, string> = {
  'phones': '📱',
  'mid_low_phones': '📲',
  'keyboards': '⌨️',
  'mice': '🖱️',
  'remote_controls': '🎮',
  'tablets': '📟',
  'laptops': '💻',
  'monitors': '🖥️',
  'headphones': '🎧',
  'speakers': '🔊',
  'watches': '⌚',
  'cameras': '📷',
  'routers': '📡',
  'printers': '🖨️',
  'chargers': '🔌',
};

const categories = ref<{ key: string; name: string; icon: string }[]>([]);

const loadCategories = async () => {
  const result = await dbApi.getCategories();
  if (result.success && result.data) {
    categories.value = result.data.map((c: any) => ({
      key: c.key,
      name: c.name,
      icon: iconMap[c.key] || '📦',
    }));
  }
};

const goToCompare = (category: string) => {
  router.push(`/compare/${category}`);
};

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.home-page {
  min-height: 100%;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 24px;
  text-align: center;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
}

.hero-desc {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.category-section {
  padding: 60px 24px;
}

.section-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2rem;
  text-align: center;
  color: #333;
  margin: 0 0 8px;
}

.section-subtitle {
  text-align: center;
  color: #999;
  margin: 0 0 40px;
  font-size: 1rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.category-card {
  background: white;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.category-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.category-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.category-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.category-desc {
  font-size: 0.9rem;
  color: #999;
  margin: 0 0 16px;
  line-height: 1.5;
}

.category-link {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 500;
}

.footer {
  background-color: #333;
  color: #ccc;
  text-align: center;
  padding: 24px;
}

.footer p {
  margin: 0;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 1.8rem;
  }

  .hero-desc {
    font-size: 1rem;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>