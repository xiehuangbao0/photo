<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="panel panel-default">
      <div class="panel-heading text-center" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important; color: white;">
        <h2 style="margin: 10px 0; font-weight: bold;">📸 光影人气热度榜</h2>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">实时排行，客观公平的展现大众大众评审的审美趋势</p>
      </div>
      <div class="panel-body" style="padding: 20px;">
        <!-- 切换 Tab 排序方式 -->
        <div class="text-center" style="margin-bottom: 25px;">
          <div class="btn-group">
            <button 
              type="button" 
              class="btn" 
              :class="rankingType === 'total' ? 'btn-primary' : 'btn-default'"
              @click="rankingType = 'total'"
            >
              🔥 投票数最多
            </button>
            <button 
              type="button" 
              class="btn" 
              :class="rankingType === 'price' ? 'btn-primary' : 'btn-default'"
              @click="rankingType = 'price'"
            >
              💰 版权价格最高
            </button>
            <button 
              type="button" 
              class="btn" 
              :class="rankingType === 'recent' ? 'btn-primary' : 'btn-default'"
              @click="rankingType = 'recent'"
            >
              ⏰ 最新发布投稿
            </button>
          </div>
        </div>

        <!-- 排行榜列表 -->
        <div class="row">
          <div 
            v-for="(work, idx) in sortedWorks" 
            :key="work.id" 
            class="col-md-3"
            style="margin-bottom: 30px;"
          >
            <!-- 排名卡片，给前三名加上特效框 -->
            <div class="card ranking-card" :class="getRankClass(idx)" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 10px;">
              <div class="card-body" style="padding: 15px; position: relative;">
                <!-- 排名数字 Badge -->
                <div class="ranking-badge" style="font-weight: bold; font-size: 13px; text-align: center; color: white; padding: 4px; border-radius: 4px; margin-bottom: 10px;">
                  {{ getRankBadge(idx) }}
                </div>
                
                <img 
                  :src="work.img" 
                  class="img-responsive rounded" 
                  style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; cursor: pointer;"
                  @click="previewImage(idx)"
                />

                <h5 class="text-center text-white" style="margin-top: 15px; font-weight: bold; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {{ work.workName }}
                </h5>
                <p class="text-center text-white-50" style="font-size: 12px; margin-bottom: 5px;">
                  👤 摄影师：{{ work.authorNick }}
                </p>
                <div class="text-center text-white" style="margin-bottom: 15px;">
                  <span v-if="rankingType === 'price'" style="font-size: 16px; font-weight: bold;">￥{{ work.price }} 元</span>
                  <span v-else-if="rankingType === 'recent'" style="font-size: 13px;">📅 发布：{{ work.createTime }}</span>
                  <span v-else style="font-size: 16px; font-weight: bold;">🔥 {{ work.voteCount }} 票</span>
                </div>

                <router-link 
                  :to="'/work-detail?id=' + work.id" 
                  class="btn btn-sm btn-light btn-block text-center" 
                  style="font-weight: bold; background: white; color: #333; display: block;"
                >
                  查看详情
                </router-link>
              </div>
            </div>
          </div>

          <div v-if="sortedWorks.length === 0" class="col-xs-12 text-center text-secondary py-5" style="padding: 50px;">
            📢 暂无作品数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store/user'

export default {
  name: 'Ranking',
  setup() {
    const works = ref([])
    const rankingType = ref('total') // 'total' (投票) | 'price' (版权价格) | 'recent' (发布时间)

    // 思考过程 (Chinese Thinking Process):
    // 1. 排行榜页面抓取后端所有的通过审核作品 (`/api/works?status=online`)。
    // 2. 按照用户选择的 Tab 标签对作品数据做响应式降序排序（如按投票、按版权价、按时间排序）。
    // 3. 对前三名分别赋予特制样式类 (gold, silver, bronze) 渲染闪亮皇冠特效，100% 保持与 jQuery (ranking.html) 版的卡片动画效果一致。
    // 4. 对接 Lightbox 模块。

    const loadWorks = async () => {
      try {
        const res = await fetch('/api/works?status=online')
        if (res.ok) {
          works.value = await res.json()
        }
      } catch (err) {
        console.error('获取排行数据失败:', err)
      }
    }

    const sortedWorks = computed(() => {
      const list = [...works.value]
      if (rankingType.value === 'total') {
        return list.sort((a, b) => b.voteCount - a.voteCount)
      } else if (rankingType.value === 'price') {
        return list.sort((a, b) => b.price - a.price)
      } else {
        return list.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      }
    })

    const getRankClass = (idx) => {
      if (idx === 0) return 'gold'
      if (idx === 1) return 'silver'
      if (idx === 2) return 'bronze'
      return 'general'
    }

    const getRankBadge = (idx) => {
      const num = idx + 1
      if (num === 1) return '🥇 冠军 NO.1'
      if (num === 2) return '🥈 亚军 NO.2'
      if (num === 3) return '🥉 季军 NO.3'
      return `🏅 第 ${num} 名`
    }

    const previewImage = (idx) => {
      const list = sortedWorks.value.map(w => ({
        src: w.img,
        title: w.workName,
        author: w.authorNick
      }))
      store.lightbox.show(list, idx)
    }

    onMounted(() => {
      loadWorks()
    })

    return {
      rankingType,
      sortedWorks,
      getRankClass,
      getRankBadge,
      previewImage
    }
  }
}
</script>
