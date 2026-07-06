<template>
  <div>
    <!-- Hero Banner Area -->
    <section class="hero-section" id="home" style="background: linear-gradient(135deg, #1e1b4b 0%, #111827 100%) !important;">
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 style="font-weight: bold; color: white;">用镜头定格瞬间</h1>
            <h2 style="color: #6366f1; font-weight: bold;">让作品永久存证</h2>
            <p style="font-size: 16px; color: #9ca3af; line-height: 1.8;">
              基于区块链技术的摄影作品投票平台，每一张参赛作品都将拥有不可篡改的存证凭证，让原创得到尊重，让光影永流传。
            </p>
          </div>
          <div class="hero-image">
            <div class="photo-frame">
              <img src="https://picsum.photos/id/10/400/250" alt="摄影作品示例" />
              <div class="frame-info">
                <span>f/2.8 · 1/200s · ISO 200</span>
              </div>
              <div class="frame-author">
                <span>by 光影摄影师</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
      <!-- 赛事中心展示 -->
      <section id="tournaments" style="margin-bottom: 50px;">
        <div class="section-header clearfix" style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 class="pull-left" style="margin: 0; font-weight: bold;">🏆 进行中的赛事</h2>
          <router-link to="/tournament-list" class="view-all pull-right" style="line-height: 30px; font-weight: bold;">
            查看全部 &rarr;
          </router-link>
        </div>
        <div class="row">
          <div 
            v-for="t in activeTournaments.slice(0, 3)" 
            :key="t.id" 
            class="col-md-4"
          >
            <div class="card tournament-card" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">
              <div class="card-body" style="padding: 20px;">
                <h3 style="margin-top: 0; font-size: 16px; font-weight: bold; color: #4f46e5;">{{ t.name }}</h3>
                <p class="text-muted" style="font-size: 12px; height: 40px; overflow: hidden; margin-top: 10px;">
                  {{ t.description }}
                </p>
                <div style="font-size: 11px; margin-top: 15px; color: #555;">
                  <strong>投稿时间:</strong> {{ t.startTime }} ~ {{ t.endTime }}
                </div>
                <div style="margin-top: 15px;">
                  <router-link :to="'/tournament-detail?id=' + t.id" class="btn btn-sm btn-primary btn-block" style="font-weight: bold; border: none; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);">
                    进入赛事
                  </router-link>
                </div>
              </div>
            </div>
          </div>
          <div v-if="activeTournaments.length === 0" class="col-xs-12 text-center text-secondary" style="padding: 20px;">
            暂无进行中的赛事
          </div>
        </div>
      </section>

      <!-- 画廊展示区 -->
      <section id="gallery">
        <div class="section-header" style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-weight: bold;">📸 精选参赛作品</h2>
        </div>

        <!-- 分类过滤栏 -->
        <div class="row" style="margin-bottom: 25px;">
          <div class="col-xs-12">
            <div class="btn-group btn-group-sm">
              <button 
                v-for="cat in categories" 
                :key="cat.value"
                type="button" 
                class="btn" 
                :class="currentCategory === cat.value ? 'btn-primary' : 'btn-default'"
                @click="selectCategory(cat.value)"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 作品画廊网格 -->
        <div class="row">
          <div 
            v-for="(work, idx) in paginatedWorks" 
            :key="work.id" 
            class="col-md-3 col-sm-6"
            style="margin-bottom: 30px;"
          >
            <div class="card photo-card" style="box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; border: 1px solid #eee; background: white;">
              <div class="photo-container" style="position: relative; overflow: hidden; height: 180px;">
                <img 
                  :src="work.img" 
                  class="img-responsive" 
                  style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                  @click="previewImage(idx)"
                />
                <span 
                  class="label" 
                  :class="work.onChain ? 'label-success' : 'label-warning'"
                  style="position: absolute; top: 10px; right: 10px; padding: 4px 8px;"
                >
                  {{ work.onChain ? '⛓️ 已上链' : '模拟链' }}
                </span>
              </div>
              <div class="card-body" style="padding: 15px;">
                <h4 style="margin: 0 0 10px; font-weight: bold; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  <router-link :to="'/work-detail?id=' + work.id" style="color: #333;">{{ work.workName }}</router-link>
                </h4>
                <div class="clearfix" style="font-size: 12px; color: #666; margin-bottom: 15px;">
                  <span class="pull-left">👤 {{ work.authorNick }}</span>
                  <span class="pull-right">📅 {{ work.createTime }}</span>
                </div>

                <div class="row">
                  <div class="col-xs-6" style="line-height: 30px; font-size: 14px;">
                    <span style="font-size: 16px; font-weight: bold; color: #4f46e5;">🔥 {{ work.voteCount }}</span> 票
                  </div>
                  <div class="col-xs-6 text-right">
                    <button 
                      class="btn btn-sm btn-primary"
                      style="font-weight: bold; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none; padding: 4px 12px;"
                      @click="handleVote(work.id)"
                    >
                      👍 投票
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="filteredWorks.length === 0" class="col-xs-12 text-center text-secondary" style="padding: 60px;">
            📢 暂无该分类下的摄影作品
          </div>
        </div>

        <!-- 分页控制 -->
        <div v-if="totalPages > 1" class="row">
          <div class="col-xs-12 text-center" style="margin-top: 20px;">
            <ul class="pagination" style="margin: 0;">
              <li :class="{ disabled: currentPage === 1 }">
                <a href="#" @click.prevent="goToPage(currentPage - 1)">&laquo; 上一页</a>
              </li>
              <li 
                v-for="p in totalPages" 
                :key="p" 
                :class="{ active: currentPage === p }"
              >
                <a href="#" @click.prevent="goToPage(p)">{{ p }}</a>
              </li>
              <li :class="{ disabled: currentPage === totalPages }">
                <a href="#" @click.prevent="goToPage(currentPage + 1)">&raquo; 下一页</a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const tournaments = ref([])
    const works = ref([])
    const currentPage = ref(1)
    const currentCategory = ref('all')
    const itemsPerPage = 12

    const categories = [
      { label: '全部作品', value: 'all' },
      { label: '风光摄影', value: '风光摄影' },
      { label: '自然风光', value: '自然风光' },
      { label: '人像摄影', value: '人像摄影' },
      { label: '纪实人文', value: '纪实人文' },
      { label: '人文摄影', value: '人文摄影' },
      { label: '夜景摄影', value: '夜景摄影' },
      { label: '静物摄影', value: '静物摄影' }
    ]

    // 思考过程 (Chinese Thinking Process):
    // 1. 首页负责拉取正在进行中 (status == active) 的赛事用于顶部横向展示。
    // 2. 加载已经通过审核 (status == online) 的作品列表。
    // 3. 实现响应式分页 (currentPage, totalPages) 与作品分类切换。
    // 4. 重构了投票逻辑：在前端捕获投票事件并发送请求给 `/api/works/:id/vote`。若未登录则跳转登录。

    const loadData = async () => {
      try {
        const [tRes, wRes] = await Promise.all([
          fetch('/api/tournaments'),
          fetch('/api/works?status=online')
        ])

        if (tRes.ok) tournaments.value = await tRes.json()
        if (wRes.ok) works.value = await wRes.json()
      } catch (err) {
        console.error('加载首页数据异常:', err)
      }
    }

    const activeTournaments = computed(() => {
      return tournaments.value.filter(t => t.status === 'active')
    })

    const filteredWorks = computed(() => {
      if (currentCategory.value === 'all') return works.value
      return works.value.filter(w => w.category === currentCategory.value)
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredWorks.value.length / itemsPerPage)
    })

    const paginatedWorks = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return filteredWorks.value.slice(start, end)
    })

    const selectCategory = (catVal) => {
      currentCategory.value = catVal
      currentPage.value = 1 // 重置回第一页
    }

    const goToPage = (page) => {
      if (page < 1 || page > totalPages.value) return
      currentPage.value = page
      window.scrollTo({ top: 300, behavior: 'smooth' })
    }

    // 投票处理
    const handleVote = async (workID) => {
      if (!store.user) {
        alert('登录后才能投票，正在跳转登录页')
        router.push('/login')
        return
      }

      try {
        const res = await fetch(`/api/works/${workID}/vote`, {
          method: 'POST',
          headers: {
            'X-User-Account': store.user.account
          }
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '投票失败')
          return
        }

        alert('投票成功！')
        
        // 增量更新前端，实现无感刷新
        const wIdx = works.value.findIndex(w => w.id === workID)
        if (wIdx !== -1) {
          works.value[wIdx].voteCount++
        }
      } catch (err) {
        alert('投票发生异常: ' + err.message)
      }
    }

    // 触发全局 Lightbox 预览
    const previewImage = (idx) => {
      const list = paginatedWorks.value.map(w => ({
        src: w.img,
        title: w.workName,
        author: w.authorNick
      }))
      store.lightbox.show(list, idx)
    }

    onMounted(() => {
      loadData()
    })

    return {
      store,
      activeTournaments,
      categories,
      currentCategory,
      currentPage,
      totalPages,
      filteredWorks,
      paginatedWorks,
      selectCategory,
      goToPage,
      handleVote,
      previewImage
    }
  }
}
</script>
