<template>
  <div class="home-page">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="container">
        <div class="logo">
          <h1>TechCompare</h1>
        </div>
        <nav class="nav-links">
          <a href="/" class="active">首页</a>
          <a href="/compare">产品对比</a>
        </nav>
      </div>
    </header>

    <!-- 轮播组件 -->
    <section class="carousel-section">
      <div class="carousel" ref="carouselRef">
        <div class="carousel-inner" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
          <div 
            v-for="(item, index) in carouselItems" 
            :key="index" 
            class="carousel-item"
            @click="goToCompare"
          >
            <img :src="item.image" :alt="item.title" />
            <div class="carousel-caption">
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
              <button class="btn-primary">立即对比</button>
            </div>
          </div>
        </div>
        <div class="carousel-indicators">
          <button 
            v-for="(item, index) in carouselItems" 
            :key="index"
            class="indicator" 
            :class="{ active: currentIndex === index }"
            @click="currentIndex = index"
          ></button>
        </div>
      </div>
    </section>

    <!-- 特色功能 -->
    <section class="features-section">
      <div class="container">
        <h2 class="section-title">为什么选择我们</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
            </div>
            <h3>详细对比</h3>
            <p>全面对比产品参数，帮助您做出明智决策</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3>最新产品</h3>
            <p>实时更新市场上最新的数码产品信息</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path></svg>
            </div>
            <h3>专业分析</h3>
            <p>提供专业的产品分析和购买建议</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门对比 -->
    <section class="popular-section">
      <div class="container">
        <h2 class="section-title">热门对比</h2>
        <div class="popular-grid">
          <div 
            v-for="(item, index) in popularItems" 
            :key="index" 
            class="popular-card"
            @click="goToCompare"
          >
            <img :src="item.image" :alt="item.title" />
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-info">
            <h3>TechCompare</h3>
            <p>专业的数码产品对比平台</p>
          </div>
          <div class="footer-links">
            <h4>快速链接</h4>
            <ul>
              <li><a href="/">首页</a></li>
              <li><a href="/compare">产品对比</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; {{ new Date().getFullYear() }} TechCompare. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const carouselRef = ref<HTMLElement>();
const currentIndex = ref(0);
let carouselInterval: number | undefined;

// 轮播数据
const carouselItems = [
  {
    title: '最新手机对比',
    description: '对比市面上最热门的智能手机',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=latest%20smartphones%20comparison%20banner%20with%20modern%20design&image_size=landscape_16_9'
  },
  {
    title: '笔记本电脑对比',
    description: '找到适合你的理想笔记本',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=laptop%20computers%20comparison%20banner%20modern%20tech%20design&image_size=landscape_16_9'
  },
  {
    title: '平板电脑对比',
    description: '对比不同品牌的平板电脑',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tablet%20devices%20comparison%20banner%20sleek%20modern%20design&image_size=landscape_16_9'
  }
];

// 热门对比数据
const popularItems = [
  {
    title: 'iPhone 15 vs 三星 S24',
    description: '两大旗舰手机详细对比',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=iPhone%2015%20vs%20Samsung%20S24%20comparison%20modern%20tech%20design&image_size=landscape_4_3'
  },
  {
    title: 'MacBook Air vs Surface Laptop',
    description: '轻薄本之间的对决',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=MacBook%20Air%20vs%20Surface%20Laptop%20comparison%20sleek%20design&image_size=landscape_4_3'
  }
];

// 轮播自动播放
const startCarousel = () => {
  carouselInterval = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % carouselItems.length;
  }, 5000);
};

// 跳转到对比页面
const goToCompare = () => {
  router.push('/compare');
};

onMounted(() => {
  startCarousel();
});

onUnmounted(() => {
  if (carouselInterval) {
    clearInterval(carouselInterval);
  }
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 导航栏 */
.navbar {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80px;
}

.logo h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover,
.nav-links a.active {
  color: #007bff;
}

/* 轮播 */
.carousel-section {
  position: relative;
  overflow: hidden;
  margin-bottom: 60px;
}

.carousel {
  position: relative;
  width: 100%;
  height: 500px;
  overflow: hidden;
}

.carousel-inner {
  display: flex;
  transition: transform 0.5s ease;
  height: 100%;
}

.carousel-item {
  flex: 0 0 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
}

.carousel-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
  padding: 60px 40px;
}

.carousel-caption h2 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.carousel-caption p {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary:hover {
  background-color: #0069d9;
}

.carousel-indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.indicator.active {
  background-color: white;
}

/* 特色功能 */
.features-section {
  padding: 60px 0;
  background-color: white;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 40px;
  color: #333;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  background-color: #f9f9f9;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  color: #007bff;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 10px;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* 热门对比 */
.popular-section {
  padding: 60px 0;
  margin-bottom: 60px;
}

.popular-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.popular-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.popular-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.popular-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.popular-card h3 {
  padding: 20px 20px 10px;
  font-size: 1.2rem;
  color: #333;
}

.popular-card p {
  padding: 0 20px 20px;
  color: #666;
  line-height: 1.6;
}

/* 页脚 */
.footer {
  background-color: #333;
  color: white;
  padding: 40px 0;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.footer-info h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.footer-info p {
  color: #ccc;
}

.footer-links h4 {
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.footer-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 10px;
}

.footer-links a {
  color: #ccc;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid #444;
  padding-top: 20px;
  text-align: center;
  color: #ccc;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar .container {
    flex-direction: column;
    height: auto;
    padding: 20px 0;
  }

  .nav-links {
    margin-top: 15px;
  }

  .carousel-caption h2 {
    font-size: 2rem;
  }

  .carousel-caption p {
    font-size: 1rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 30px;
  }
}
</style>
