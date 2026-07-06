import { createRouter, createWebHashHistory } from 'vue-router'
import { store } from '../store/user'

// 思考过程 (Chinese Thinking Process):
// 这里配置前端路由映射。为了兼容性和本地文件打开直接预览或独立后端分发，我们使用 `createWebHashHistory`。
// 各个页面均对应 Vue 单文件组件。
// 我们实现了全局导航守卫 (router.beforeEach)：
// - 拦截未登录用户访问 `/publish`, `/person-info` 等核心交互页面，强制其跳转至 `/login`。
// - 针对管理员后台 `/admin` 进行角色校验，防止非法越权访问。

import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import PersonInfo from '../views/PersonInfo.vue'
import Publish from '../views/Publish.vue'
import Market from '../views/Market.vue'
import Ranking from '../views/Ranking.vue'
import Blockchain from '../views/Blockchain.vue'
import About from '../views/About.vue'
import Admin from '../views/Admin.vue'
import TournamentList from '../views/TournamentList.vue'
import TournamentDetail from '../views/TournamentDetail.vue'
import Winners from '../views/Winners.vue'
import WorkDetail from '../views/WorkDetail.vue'
import UpdatePwd from '../views/UpdatePwd.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/person-info', component: PersonInfo, meta: { requiresAuth: true } },
  { path: '/publish', component: Publish, meta: { requiresAuth: true, role: 'photographer' } },
  { path: '/market', component: Market },
  { path: '/ranking', component: Ranking },
  { path: '/blockchain', component: Blockchain },
  { path: '/about', component: About },
  { path: '/admin', component: Admin, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/tournament-list', component: TournamentList },
  { path: '/tournament-detail', component: TournamentDetail },
  { path: '/winners', component: Winners },
  { path: '/work-detail', component: WorkDetail },
  { path: '/updatePwd', component: UpdatePwd, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' } // 捕获 404 跳转首页
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 } // 跳转路由时页面自动滚动回顶部
  }
})

router.beforeEach((to, from, next) => {
  const isLoggedIn = store.user !== null

  if (to.meta.requiresAuth && !isLoggedIn) {
    alert('请登录后访问该页面！')
    next('/login')
    return
  }

  if (to.meta.role) {
    if (!isLoggedIn) {
      next('/login')
      return
    }
    const userRole = store.user.role
    if (to.meta.role === 'admin' && userRole !== 'admin') {
      alert('权限不足，仅限管理员访问后台')
      next('/')
      return
    }
    if (to.meta.role === 'photographer' && userRole !== 'photographer') {
      alert('投稿功能仅限摄影师角色使用')
      next('/register') // 或者注册
      return
    }
  }

  next()
})

export default router
