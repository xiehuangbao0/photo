<template>
  <div :class="{ 'dark-mode-active': isDarkMode }">
    <!-- 主题切换按钮 -->
    <button class="theme-toggle" id="themeToggle" @click="toggleTheme" title="切换深色/浅色模式">
      {{ isDarkMode ? '🔆' : '🌙' }}
    </button>
    
    <!-- 返回顶部按钮 -->
    <button v-show="showBackToTop" class="back-to-top" id="backToTop" @click="scrollToTop" title="返回顶部">
      ⬆
    </button>
    
    <!-- 共享大图预览组件 (Lightbox) -->
    <div v-if="store.lightbox.visible" class="lightbox" id="lightbox" style="display: flex;">
      <span class="lightbox-close" id="lightboxClose" @click="store.lightbox.hide()">&times;</span>
      <span class="lightbox-nav lightbox-prev" id="lightboxPrev" @click="prevLightbox">&lt;</span>
      <span class="lightbox-nav lightbox-next" id="lightboxNext" @click="nextLightbox">&gt;</span>
      <img class="lightbox-img" id="lightboxImg" :src="currentLightboxImg.src" />
      <div class="lightbox-info" id="lightboxInfo">
        <strong>{{ currentLightboxImg.title }}</strong> by {{ currentLightboxImg.author }}
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="navbar navbar-inverse">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#navbar" @click="toggleCollapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <router-link class="navbar-brand" :to="isAdminPage ? '/admin' : '/'">
            <span class="logo-icon">{{ isAdminPage ? '🛡️' : '✨' }}</span>
            <span class="logo-text">{{ isAdminPage ? '管理员后台' : '光影存证' }}</span>
          </router-link>
        </div>
        <div class="collapse navbar-collapse" :class="{ in: !isNavbarCollapsed }" id="navbar">
          <ul class="nav navbar-nav">
            <li><router-link to="/" @click="closeNavbar">首页</router-link></li>
            <li><router-link to="/ranking" @click="closeNavbar">人气榜</router-link></li>
            <li><router-link to="/winners" @click="closeNavbar">获奖展厅</router-link></li>
            <li><router-link to="/market" @click="closeNavbar">版权集市</router-link></li>
            <li v-if="store.user?.role === 'photographer'"><router-link to="/publish" @click="closeNavbar">我要投稿</router-link></li>
            <li><router-link to="/blockchain" @click="closeNavbar">链上查询</router-link></li>
            <li><router-link to="/about" @click="closeNavbar">平台介绍</router-link></li>
          </ul>
          
          <!-- 未登录菜单 -->
          <ul v-if="!store.user" class="nav navbar-nav navbar-right" id="guestMenu">
            <li><router-link to="/login" class="login-btn" @click="closeNavbar">登录</router-link></li>
            <li><router-link to="/register" class="register-btn" @click="closeNavbar">注册</router-link></li>
          </ul>
          
          <!-- 已登录菜单 -->
          <ul v-else class="nav navbar-nav navbar-right" id="loginMenu">
            <li><span class="navbar-text text-white">欢迎：<span id="showNick">{{ store.user.nickName || store.user.account }}</span></span></li>
            <li v-if="store.user.role === 'admin'"><router-link to="/admin" @click="closeNavbar">系统管理</router-link></li>
            <li><router-link to="/person-info" @click="closeNavbar">个人中心</router-link></li>
            <li><button class="btn btn-danger btn-xs navbar-btn" id="logoutBtn" style="margin-top: 13px;" @click="handleLogout">退出登录</button></li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- 通知横幅 (跑马灯) -->
    <div class="notification-banner">
      <div class="notification-scroll" id="notificationContent">
        <span 
          v-for="(ann, index) in sortedAnnouncements" 
          :key="ann.id" 
          class="notify-item" 
          style="cursor:pointer;" 
          @click="showAnnouncementDetail(ann)"
        >
          <span class="notify-icon">{{ getAnnIcon(ann.type) }}</span>
          <span>{{ ann.title }}</span>
        </span>
        <span v-if="sortedAnnouncements.length === 0" class="notify-item">
          <span class="notify-icon">📢</span><span>暂无通知</span>
        </span>
      </div>
    </div>

    <!-- 路由主页面 -->
    <router-view></router-view>

    <!-- 底部栏 -->
    <footer class="site-footer">
      <div class="container">
        <p>2026光影存证 · 摄影作品投票存证平台 让每一束光都有据可查</p>
      </div>
    </footer>

    <!-- 公告详情模态框 -->
    <div v-if="activeAnnouncement" class="modal fade in" style="display: block; background: rgba(0, 0, 0, 0.5);" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" @click="activeAnnouncement = null">&times;</button>
            <h4 class="modal-title">{{ getAnnIcon(activeAnnouncement.type) }} 公告详情</h4>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>公告标题</label>
              <input type="text" class="form-control" :value="activeAnnouncement.title" readonly>
            </div>
            <div class="form-group">
              <label>公告内容</label>
              <textarea class="form-control" rows="5" readonly>{{ activeAnnouncement.content }}</textarea>
            </div>
            <div class="form-group">
              <label>发布时间</label>
              <input type="text" class="form-control" :value="activeAnnouncement.time" readonly>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="activeAnnouncement = null">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { store } from './store/user'

export default {
  name: 'App',
  setup() {
    const route = useRoute()
    const isDarkMode = ref(localStorage.getItem('theme') === 'dark')
    const showBackToTop = ref(false)
    const isNavbarCollapsed = ref(true)
    const announcements = ref([])
    const activeAnnouncement = ref(null)

    // 思考过程 (Chinese Thinking Process):
    // 1. 本组件是 SPA 的根，承载了所有的公共全局逻辑：主题切换、返回顶部、跑马灯公告、全局 Web3 自动联调等。
    // 2. 模态框重构：我们不再使用 jQuery 动态向 DOM 尾部 append 模态框，
    //    而是将模态框组件声明在 template 中，通过响应式变量 `activeAnnouncement` 控制其渲染和数据绑定，做到了 100% 的纯 Vue 驱动。
    // 3. 原生 Bootstrap 与 photo-style 完美融合：继续在 HTML 结构里使用 bootstrap 的 row, container, modal 等 Class 名，
    //    由于我们在 main.js 中引入了原项目 CSS，这使得页面在无 jQuery 运行时的渲染完全一致。

    const isAdminPage = computed(() => {
      return route.path === '/admin'
    })

    const sortedAnnouncements = computed(() => {
      return [...announcements.value].sort((a, b) => new Date(b.time) - new Date(a.time))
    })

    const currentLightboxImg = computed(() => {
      const idx = store.lightbox.index
      const list = store.lightbox.images
      if (list && list.length > idx) {
        return list[idx]
      }
      return { src: '', title: '', author: '' }
    })

    // 初始化主题
    const initTheme = () => {
      if (isDarkMode.value) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
    }

    const toggleTheme = () => {
      isDarkMode.value = !isDarkMode.value
      document.body.classList.add('theme-transition')
      if (isDarkMode.value) {
        document.body.classList.add('dark-mode')
        localStorage.setItem('theme', 'dark')
      } else {
        document.body.classList.remove('dark-mode')
        localStorage.setItem('theme', 'light')
      }
      setTimeout(() => {
        document.body.classList.remove('theme-transition')
      }, 300)
    }

    // 滚动条事件监听 (返回顶部按钮的显示隐藏)
    const handleScroll = () => {
      showBackToTop.value = window.scrollY > 300
    }

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // 大图预览翻页逻辑
    const prevLightbox = () => {
      const list = store.lightbox.images
      if (list.length > 0) {
        store.lightbox.index = (store.lightbox.index - 1 + list.length) % list.length
      }
    }

    const nextLightbox = () => {
      const list = store.lightbox.images
      if (list.length > 0) {
        store.lightbox.index = (store.lightbox.index + 1) % list.length
      }
    }

    // 公告列表加载
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements')
        if (res.ok) {
          announcements.value = await res.json()
        }
      } catch (err) {
        console.error('加载公告失败:', err)
      }
    }

    const showAnnouncementDetail = (ann) => {
      activeAnnouncement.value = ann
    }

    const getAnnIcon = (type) => {
      return type === 'tournament' ? '🏆' : type === 'winner' ? '🥇' : type === 'system' ? '🔧' : '✨'
    }

    const toggleCollapse = () => {
      isNavbarCollapsed.value = !isNavbarCollapsed.value
    }

    const closeNavbar = () => {
      isNavbarCollapsed.value = true
    }

    const handleLogout = () => {
      if (confirm('确定要退出登录吗？')) {
        closeNavbar()
        store.logout()
      }
    }

    onMounted(async () => {
      initTheme()
      window.addEventListener('scroll', handleScroll)
      // 开启 API 获取公告跑马灯
      fetchAnnouncements()
      // 全局异步加载以太坊连接
      store.initWeb3()
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
    })

    return {
      store,
      isDarkMode,
      showBackToTop,
      isNavbarCollapsed,
      isAdminPage,
      sortedAnnouncements,
      currentLightboxImg,
      activeAnnouncement,
      toggleTheme,
      scrollToTop,
      prevLightbox,
      nextLightbox,
      getAnnIcon,
      showAnnouncementDetail,
      toggleCollapse,
      closeNavbar,
      handleLogout
    }
  }
}
</script>
