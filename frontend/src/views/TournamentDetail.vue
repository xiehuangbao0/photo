<template>
  <div v-if="tournament" class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <!-- 赛事看板 (Hero Block) -->
    <div class="panel panel-default" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 30px;">
      <div class="panel-body" style="padding: 30px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 8px;">
        <div class="row">
          <div class="col-md-9">
            <span class="label label-success" style="font-size: 12px; padding: 4px 8px;">
              {{ tournament.status === 'ended' ? '已结束' : '进行中' }}
            </span>
            <h1 style="margin-top: 15px; font-weight: bold; font-size: 28px;">{{ tournament.name }}</h1>
            <p style="font-size: 15px; opacity: 0.9; margin-top: 15px; line-height: 1.6; max-width: 90%;">
              {{ tournament.description }}
            </p>
            <div style="margin-top: 25px; font-size: 13px; opacity: 0.8; line-height: 1.8;">
              <div>📅 <strong>作品投稿时间:</strong> {{ tournament.startTime }} 至 {{ tournament.endTime }}</div>
              <div>🗳️ <strong>网络投票时间:</strong> {{ tournament.voteStart }} 至 {{ tournament.voteEnd }}</div>
            </div>
          </div>
          <div class="col-md-3 text-right" style="margin-top: 20px;">
            <router-link 
              v-if="store.user?.role === 'photographer' && tournament.status !== 'ended'"
              :to="'/publish?tournamentId=' + tournament.id" 
              class="btn btn-warning btn-lg" 
              style="font-weight: bold; border: none; padding: 12px 25px;"
            >
              我要投稿参赛 →
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 主展示区 -->
    <div class="row">
      <!-- 类别过滤器与排序 -->
      <div class="col-xs-12" style="margin-bottom: 25px;">
        <div class="clearfix" style="border-bottom: 1px solid #eee; padding-bottom: 15px;">
          <div class="pull-left">
            <span style="font-weight: bold; margin-right: 15px; color: #555;">分类筛选：</span>
            <div class="btn-group btn-group-sm">
              <button 
                type="button" 
                class="btn" 
                :class="categoryFilter === 'all' ? 'btn-primary' : 'btn-default'"
                @click="categoryFilter = 'all'"
              >
                全部
              </button>
              <button 
                v-for="cat in tournament.categories" 
                :key="cat"
                type="button" 
                class="btn" 
                :class="categoryFilter === cat ? 'btn-primary' : 'btn-default'"
                @click="categoryFilter = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>
          <div class="pull-right">
            <span style="font-weight: bold; margin-right: 15px; color: #555;">排序方式：</span>
            <div class="btn-group btn-group-sm">
              <button 
                type="button" 
                class="btn" 
                :class="sortBy === 'votes' ? 'btn-primary' : 'btn-default'"
                @click="sortBy = 'votes'"
              >
                🔥 最多得票
              </button>
              <button 
                type="button" 
                class="btn" 
                :class="sortBy === 'recent' ? 'btn-primary' : 'btn-default'"
                @click="sortBy = 'recent'"
              >
                ⏰ 最新投稿
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 作品画廊展示 -->
      <div 
        v-for="(work, index) in sortedWorks" 
        :key="work.id" 
        class="col-md-3 col-sm-6"
        style="margin-bottom: 30px;"
      >
        <div class="card photo-card" style="box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; border: 1px solid #eee; background: white; transition: transform 0.2s;">
          <div class="photo-container" style="position: relative; overflow: hidden; height: 180px;">
            <img 
              :src="work.img" 
              class="img-responsive" 
              style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.3s;"
              @click="previewImage(index)"
            />
            <span 
              class="label" 
              :class="work.onChain ? 'label-success' : 'label-warning'"
              style="position: absolute; top: 10px; right: 10px; padding: 4px 8px;"
            >
              {{ work.onChain ? '⛓️ 已存证' : '模拟链' }}
            </span>
          </div>
          <div class="card-body" style="padding: 15px;">
            <h4 style="margin: 0 0 10px; font-weight: bold; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              <router-link :to="'/work-detail?id=' + work.id" style="color: #333;">{{ work.workName }}</router-link>
            </h4>
            <div class="clearfix" style="font-size: 12px; color: #666; margin-bottom: 15px;">
              <span class="pull-left">👤 {{ work.authorNick }}</span>
              <span class="pull-right">📅 {{ work.createTime }}</span>
            </div>

            <!-- 投票模块 -->
            <div class="row">
              <div class="col-xs-6" style="line-height: 30px;">
                <span style="font-size: 16px; font-weight: bold; color: #4f46e5;">🔥 {{ work.voteCount }}</span> 票
              </div>
              <div class="col-xs-6 text-right">
                <button 
                  v-if="tournament.status !== 'ended'"
                  class="btn btn-sm btn-primary"
                  style="font-weight: bold; padding: 4px 12px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none;"
                  @click="handleVote(work.id)"
                >
                  👍 投票
                </button>
                <button 
                  v-else 
                  disabled 
                  class="btn btn-sm btn-default"
                >
                  已截止
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空数据提示 -->
      <div v-if="sortedWorks.length === 0" class="col-xs-12 text-center text-secondary" style="padding: 60px;">
        📢 暂无符合当前筛选条件的参赛作品。
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'TournamentDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const tournament = ref(null)
    const works = ref([])

    const categoryFilter = ref('all')
    const sortBy = ref('votes') // 'votes' | 'recent'

    // 思考过程 (Chinese Thinking Process):
    // 1. 赛事详情页加载指定赛事，并抓取后端关联该赛事的摄影作品列表 (`tournamentId`)。
    // 2. 对作品进行分类过滤（动态过滤分类标签，由赛事自带配置动态驱动）与多重排序（得票数最多、最新发表）。
    // 3. 实现交互式投票 (handleVote)：直接调用后端的投票 API，通过 `X-User-Account` 头判断登录状态以及每日一票防刷机制。
    //    若投票成功，直接前端响应式更新该作品的 `voteCount`。
    // 4. 重构原本的大图暗房展示 (store.lightbox.show)。

    const loadData = async () => {
      const tID = Number(route.query.id)
      if (!tID) {
        router.push('/')
        return
      }

      try {
        const [tRes, wRes] = await Promise.all([
          fetch(`/api/tournaments/${tID}`),
          fetch(`/api/works?tournamentId=${tID}&status=online`) // 赛事下只展示审核通过的在线作品
        ])

        if (!tRes.ok) {
          router.push('/')
          return
        }

        tournament.value = await tRes.json()
        works.value = await wRes.json()
      } catch (err) {
        console.error('加载赛事详情异常:', err)
      }
    }

    const filteredWorks = computed(() => {
      if (categoryFilter.value === 'all') return works.value
      return works.value.filter(w => w.category === categoryFilter.value)
    })

    const sortedWorks = computed(() => {
      const list = [...filteredWorks.value]
      if (sortBy.value === 'votes') {
        return list.sort((a, b) => b.voteCount - a.voteCount)
      } else {
        return list.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      }
    })

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
        
        // 响应式增加票数，避免重新刷库
        const wIdx = works.value.findIndex(item => item.id === workID)
        if (wIdx !== -1) {
          works.value[wIdx].voteCount++
        }
      } catch (err) {
        alert('投票接口出错: ' + err.message)
      }
    }

    // 触发全局 Lightbox 预览
    const previewImage = (index) => {
      const imagesList = sortedWorks.value.map(w => ({
        src: w.img,
        title: w.workName,
        author: w.authorNick
      }))
      store.lightbox.show(imagesList, index)
    }

    onMounted(() => {
      loadData()
    })

    return {
      store,
      tournament,
      categoryFilter,
      sortBy,
      sortedWorks,
      handleVote,
      previewImage
    }
  }
}
</script>
