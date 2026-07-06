<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="section-header" style="margin-bottom: 25px;">
      <h2>🏆 赛事中心</h2>
      <p>探索并参与各项精彩的主题摄影赛事，用镜头决出胜负</p>
    </div>

    <!-- 过滤器选项 -->
    <div class="row" style="margin-bottom: 20px;">
      <div class="col-md-12 text-center">
        <div class="btn-group">
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'all' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'all'"
          >
            全部赛事
          </button>
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'active' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'active'"
          >
            进行中
          </button>
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'ended' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'ended'"
          >
            已结束
          </button>
        </div>
      </div>
    </div>

    <!-- 赛事卡片列表 -->
    <div class="row">
      <div 
        v-for="t in filteredTournaments" 
        :key="t.id" 
        class="col-md-4"
        style="margin-bottom: 30px;"
      >
        <div class="card tournament-card" style="box-shadow: 0 4px 15px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; border: 1px solid #eee;">
          <div class="card-body" style="padding: 20px;">
            <div class="clearfix">
              <span 
                class="label pull-right" 
                :class="t.status === 'ended' ? 'label-default' : 'label-success'"
                style="padding: 4px 8px; font-size: 11px;"
              >
                {{ t.status === 'ended' ? '已结束' : '进行中' }}
              </span>
              <h3 style="margin-top: 0; font-size: 18px; font-weight: bold; line-height: 1.4; max-width: 80%; color: #4f46e5;">
                {{ t.name }}
              </h3>
            </div>
            
            <p class="text-secondary" style="height: 60px; overflow: hidden; margin-top: 10px; font-size: 13px; line-height: 1.6;">
              {{ t.description }}
            </p>

            <hr style="margin: 15px 0;" />

            <div style="font-size: 12px; line-height: 1.8; color: #555;">
              <div>📅 <strong>投稿时间:</strong> {{ t.startTime }} ~ {{ t.endTime }}</div>
              <div>🗳️ <strong>投票时间:</strong> {{ t.voteStart }} ~ {{ t.voteEnd }}</div>
              <div v-if="t.prizes && t.prizes.length > 0" style="margin-top: 5px; color: #d97706; font-weight: bold;">
                🎁 一等奖: {{ t.prizes[0].prize }}
              </div>
            </div>

            <div style="margin-top: 20px;">
              <router-link 
                :to="'/tournament-detail?id=' + t.id" 
                class="btn btn-primary btn-block"
                style="border-radius: 4px; padding: 8px; font-weight: bold; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none;"
              >
                进入赛事页面 →
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredTournaments.length === 0" class="col-xs-12 text-center text-secondary" style="padding: 60px;">
        📢 暂无匹配该过滤条件的赛事数据
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'TournamentList',
  setup() {
    const tournaments = ref([])
    const filter = ref('all')

    // 思考过程 (Chinese Thinking Process):
    // 1. 赛事列表页面从后端 Go API `/api/tournaments` 获取所有赛事数据。
    // 2. 提供单选切换过滤（全部、进行中、已结束）。
    // 3. 用户点击“进入赛事”将跳转至赛事详情页 `TournamentDetail.vue`。

    const loadTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments')
        if (res.ok) {
          tournaments.value = await res.json()
        }
      } catch (err) {
        console.error('获取赛事异常:', err)
      }
    }

    const filteredTournaments = computed(() => {
      if (filter.value === 'all') return tournaments.value
      return tournaments.value.filter(t => t.status === filter.value)
    })

    onMounted(() => {
      loadTournaments()
    })

    return {
      filter,
      filteredTournaments
    }
  }
}
</script>
