<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="panel panel-default">
      <div class="panel-heading text-center" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important; color: white;">
        <h2 style="margin: 10px 0; font-weight: bold;">🏆 获奖展厅</h2>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">陈列历届结束赛事的优秀获奖作品与奖项设定</p>
      </div>
      <div class="panel-body" style="padding: 20px;">
        <!-- 赛事切换 Tab 按钮 -->
        <div class="text-center" style="margin-bottom: 25px;">
          <div class="btn-group">
            <button 
              v-for="t in endedTournaments" 
              :key="t.id"
              type="button" 
              class="btn" 
              :class="selectedTournamentId === t.id ? 'btn-primary active' : 'btn-default'"
              @click="selectedTournamentId = t.id"
            >
              {{ t.name }}
            </button>
          </div>
          <div v-if="endedTournaments.length === 0" class="text-center text-secondary py-5">
            暂无已结束的赛事
          </div>
        </div>

        <!-- 获奖作品展示 -->
        <div v-if="selectedTournament" class="row">
          <div 
            v-for="winner in getWinners(selectedTournament)" 
            :key="winner.workId" 
            class="col-md-3 mb-4"
          >
            <div class="card ranking-card" :class="getRankClass(winner.rank)" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
              <div class="card-body" style="padding: 15px;">
                <div class="ranking-badge" style="margin-bottom: 10px; font-weight: bold; font-size: 14px; text-align: center; color: white; padding: 4px; border-radius: 4px;">
                  {{ getRankBadge(winner.rank) }}
                </div>
                <img 
                  :src="winner.workImg" 
                  class="img-responsive rounded" 
                  style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; cursor: pointer;"
                  @click="previewImage(winner)"
                />
                <h5 class="text-center text-white" style="margin-top: 15px; font-weight: bold; font-size: 16px;">
                  {{ winner.workName }}
                </h5>
                <p class="text-center text-white-50" style="font-size: 13px; margin-bottom: 5px;">
                  👤 作者：{{ winner.author }}
                </p>
                <p class="text-center text-white" style="font-weight: bold; font-size: 16px; margin-bottom: 15px;">
                  🔥 得票数：{{ winner.voteCount }} 票
                </p>
                <router-link 
                  :to="'/work-detail?id=' + winner.workId" 
                  class="btn btn-sm btn-light btn-block text-center" 
                  style="font-weight: bold; background: white; color: #333; display: block;"
                >
                  查看详情
                </router-link>
              </div>
            </div>
          </div>
          
          <div v-if="!selectedTournament.winners || selectedTournament.winners.length === 0" class="col-xs-12 text-center text-secondary py-5" style="padding: 40px;">
            📢 该赛事暂无获奖作品数据
          </div>
        </div>

        <!-- 奖金奖项表 -->
        <div v-if="selectedTournament && selectedTournament.prizes && selectedTournament.prizes.length > 0" class="mt-6" style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 30px;">
          <h3 class="text-center" style="margin-bottom: 20px; font-weight: bold;">🎁 赛事奖项与奖品设置</h3>
          <table class="table table-striped table-hover">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="width: 30%;">🏆 奖项级别</th>
                <th>🎁 奖品内容</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, index) in selectedTournament.prizes" :key="index">
                <td style="font-weight: bold; color: #4f46e5;">{{ p.rank }}</td>
                <td>{{ p.prize }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store/user'

export default {
  name: 'Winners',
  setup() {
    const tournaments = ref([])
    const works = ref([])
    const selectedTournamentId = ref(null)

    // 思考过程 (Chinese Thinking Process):
    // 1. 获奖展厅需要过滤获取所有已结束 (ended) 的赛事。
    // 2. 选择不同赛事时，通过 `selectedTournamentId` 动态获取获奖作品和奖项明细。
    // 3. 获奖作品与作品列表进行关联（从 API 获取），以呈现最准确的票数和图片。
    // 4. 重构了原本的大图预览和详情页路由链接。

    const endedTournaments = computed(() => {
      return tournaments.value.filter(t => t.status === 'ended')
    })

    const selectedTournament = computed(() => {
      if (selectedTournamentId.value === null) return null
      return tournaments.value.find(t => t.id === selectedTournamentId.value)
    })

    const loadData = async () => {
      try {
        const [tRes, wRes] = await Promise.all([
          fetch('/api/tournaments'),
          fetch('/api/works')
        ])

        if (tRes.ok) tournaments.value = await tRes.json()
        if (wRes.ok) works.value = await wRes.json()

        // 默认选中第一个结束的赛事
        const ended = endedTournaments.value
        if (ended.length > 0) {
          selectedTournamentId.value = ended[0].id
        }
      } catch (err) {
        console.error('加载获奖数据异常:', err)
      }
    }

    const getWinners = (tournament) => {
      if (!tournament || !tournament.winners) return []
      return tournament.winners.map(winner => {
        const w = works.value.find(item => item.id === winner.workId)
        return {
          ...winner,
          workImg: w ? w.img : winner.img,
          workName: w ? w.workName : winner.workName,
          voteCount: w ? w.voteCount : 0,
          author: w ? w.authorNick : winner.author
        }
      })
    }

    const getRankClass = (rank) => {
      if (rank.includes('一等奖')) return 'gold'
      if (rank.includes('二等奖')) return 'silver'
      if (rank.includes('三等奖')) return 'bronze'
      return 'general'
    }

    const getRankBadge = (rank) => {
      if (rank.includes('一等奖')) return '🥇 一等奖'
      if (rank.includes('二等奖')) return '🥈 二等奖'
      if (rank.includes('三等奖')) return '🥉 三等奖'
      return `🏅 ${rank}`
    }

    const previewImage = (winner) => {
      // 触发全局大图浏览
      store.lightbox.show([{ src: winner.workImg, title: winner.workName, author: winner.author }], 0)
    }

    onMounted(() => {
      loadData()
    })

    return {
      tournaments,
      selectedTournamentId,
      endedTournaments,
      selectedTournament,
      getWinners,
      getRankClass,
      getRankBadge,
      previewImage
    }
  }
}
</script>
