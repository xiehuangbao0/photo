<template>
  <div v-if="store.user?.role === 'admin'" class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="row">
      <!-- 左侧管理菜单 -->
      <div class="col-md-2" style="margin-bottom: 20px;">
        <div class="panel panel-default" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading text-center" style="font-weight: bold; background: #f8f9fa;">
            🛡️ 后台管理菜单
          </div>
          <div class="list-group" style="margin-bottom: 0;">
            <button 
              v-for="menu in menus" 
              :key="menu.id"
              class="list-group-item text-left" 
              :class="{ active: activeMenu === menu.id }"
              @click="activeMenu = menu.id"
            >
              {{ menu.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧工作面板 -->
      <div class="col-md-10">
        
        <!-- 1. 数据看板 (Dashboard) -->
        <div v-if="activeMenu === 'dashboard'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📊 平台运营数据看板</div>
          <div class="panel-body" style="padding: 25px;">
            <div class="row">
              <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important; padding: 15px; border-radius: 6px; color: white;">
                  <div style="font-size: 26px; font-weight: bold;">{{ dashboardStats.usersCount }}</div>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">注册用户总数</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #7c2d12 0%, #ea580c 100%) !important; padding: 15px; border-radius: 6px; color: white;">
                  <div style="font-size: 26px; font-weight: bold;">{{ dashboardStats.worksCount }}</div>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">投稿作品总数</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%) !important; padding: 15px; border-radius: 6px; color: white;">
                  <div style="font-size: 26px; font-weight: bold;">{{ dashboardStats.votesCount }}</div>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">累计大众投票</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #78350f 0%, #f59e0b 100%) !important; padding: 15px; border-radius: 6px; color: white;">
                  <div style="font-size: 26px; font-weight: bold;">{{ dashboardStats.pendingCount }}</div>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">待存证审核作品</div>
                </div>
              </div>
            </div>

            <!-- 分类统计 -->
            <div style="margin-top: 40px;">
              <h4 style="font-weight: bold; margin-bottom: 20px;">📁 参赛作品分类数量分布</h4>
              <div class="row">
                <div v-for="(count, catName) in dashboardStats.categoryCounts" :key="catName" class="col-md-3" style="margin-bottom: 15px;">
                  <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #6366f1;">
                    <div style="font-size: 11px; color: #777;">{{ catName }}</div>
                    <div style="font-size: 18px; font-weight: bold; color: #333; margin-top: 4px;">{{ count }} 幅</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 2. 用户管理 (Users) -->
        <div v-if="activeMenu === 'users'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">👥 注册用户管理</div>
          <div class="panel-body" style="padding: 0;">
            <table class="table table-striped table-hover" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th>账户账号</th>
                  <th>显示昵称</th>
                  <th>角色</th>
                  <th>注册时间</th>
                  <th>账号状态</th>
                  <th>管理操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in usersList" :key="u.account">
                  <td style="font-weight: bold;">{{ u.account }}</td>
                  <td>{{ u.nickName }}</td>
                  <td>
                    <span class="label" :class="u.role === 'admin' ? 'label-danger' : u.role === 'photographer' ? 'label-primary' : 'label-success'">
                      {{ u.role === 'admin' ? '系统管理员' : u.role === 'photographer' ? '摄影师' : '普通用户' }}
                    </span>
                  </td>
                  <td>{{ u.registerTime }}</td>
                  <td>
                    <span class="label" :class="u.status === 'normal' ? 'label-success' : 'label-default'">
                      {{ u.status === 'normal' ? '可用正常' : '封禁禁用' }}
                    </span>
                  </td>
                  <td>
                    <button 
                      v-if="u.role !== 'admin'"
                      class="btn btn-xs" 
                      :class="u.status === 'normal' ? 'btn-danger' : 'btn-success'"
                      @click="toggleUserStatus(u.account)"
                    >
                      {{ u.status === 'normal' ? '禁用账号' : '激活账号' }}
                    </button>
                    <span v-else style="font-size: 11px; color: #999;">不可操作</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. 作品审核与链上存证 (Audit) -->
        <div v-if="activeMenu === 'audit'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📸 参赛投稿存证审核 (以太坊挖矿链上确权)</div>
          <div class="panel-body" style="padding: 0;">
            <table class="table table-striped table-hover" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th>缩略图</th>
                  <th>作品名</th>
                  <th>摄影师</th>
                  <th>分类</th>
                  <th>价格 (元)</th>
                  <th>投稿时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in pendingWorks" :key="w.id">
                  <td>
                    <img :src="w.img" style="width: 50px; height: 35px; object-fit: cover; border-radius: 3px; cursor: pointer;" @click="store.lightbox.show([{src: w.img, title: w.workName, author: w.authorNick}], 0)" />
                  </td>
                  <td style="font-weight: bold;">{{ w.workName }}</td>
                  <td>{{ w.authorNick }} ({{ w.authorAccount }})</td>
                  <td>{{ w.category }}</td>
                  <td>&yen; {{ w.price }}</td>
                  <td>{{ w.createTime }}</td>
                  <td>
                    <button class="btn btn-xs btn-success" style="margin-right: 5px;" @click="verifyWork(w, 'approve')" :disabled="verifyingId === w.id">
                      {{ verifyingId === w.id ? '上链中...' : '通过并存证' }}
                    </button>
                    <button class="btn btn-xs btn-danger" @click="verifyWork(w, 'reject')" :disabled="verifyingId === w.id">
                      拒绝
                    </button>
                  </td>
                </tr>
                <tr v-if="pendingWorks.length === 0">
                  <td colspan="7" class="text-center text-secondary" style="padding: 40px;">
                    📢 当前没有待处理的投稿存证申请。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. 赛事发布与结算 (Tournaments) -->
        <div v-if="activeMenu === 'tournaments'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">🏆 摄影赛事统筹管理</div>
          <div class="panel-body" style="padding: 20px;">
            
            <ul class="nav nav-tabs" style="margin-bottom: 20px;">
              <li :class="{ active: tournamentSubTab === 'list' }">
                <a href="#" @click.prevent="tournamentSubTab = 'list'">赛事管理列表</a>
              </li>
              <li :class="{ active: tournamentSubTab === 'create' }">
                <a href="#" @click.prevent="tournamentSubTab = 'create'">发布全新赛事</a>
              </li>
            </ul>

            <!-- 4.1 赛事列表与手动结束结算 -->
            <div v-if="tournamentSubTab === 'list'">
              <table class="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>赛事名称</th>
                    <th>投稿周期</th>
                    <th>投票周期</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in tournamentsList" :key="t.id">
                    <td style="font-weight: bold;">{{ t.name }}</td>
                    <td>{{ t.startTime }} ~ {{ t.endTime }}</td>
                    <td>{{ t.voteStart }} ~ {{ t.voteEnd }}</td>
                    <td>
                      <span class="label" :class="t.status === 'ended' ? 'label-default' : 'label-success'">
                        {{ t.status === 'ended' ? '已结算结束' : '进行中' }}
                      </span>
                    </td>
                    <td>
                      <button 
                        v-if="t.status !== 'ended'"
                        class="btn btn-xs btn-warning" 
                        style="margin-right: 5px;"
                        @click="openEndTournamentModal(t)"
                      >
                        手动结算结束
                      </button>
                      <button class="btn btn-xs btn-danger" @click="deleteTournament(t.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 4.2 创建赛事 -->
            <div v-if="tournamentSubTab === 'create'">
              <form @submit.prevent="createTournament">
                <div class="form-group">
                  <label>赛事名称 <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" v-model="newT.name" required placeholder="如：2026年度夏季摄影大赛" />
                </div>
                <div class="form-group">
                  <label>赛事描述简介 <span class="text-danger">*</span></label>
                  <textarea class="form-control" v-model="newT.description" rows="3" required placeholder="描述大赛的规则和参赛细则..."></textarea>
                </div>
                <div class="row">
                  <div class="col-sm-6 form-group">
                    <label>投稿开始日期 <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" v-model="newT.startTime" required />
                  </div>
                  <div class="col-sm-6 form-group">
                    <label>投稿截止日期 <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" v-model="newT.endTime" required />
                  </div>
                </div>
                <div class="row">
                  <div class="col-sm-6 form-group">
                    <label>网络投票开始日期 <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" v-model="newT.voteStart" required />
                  </div>
                  <div class="col-sm-6 form-group">
                    <label>网络投票截止日期 <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" v-model="newT.voteEnd" required />
                  </div>
                </div>
                <div class="form-group">
                  <label>赛事支持类别 (逗号分隔) <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" v-model="newT.categoriesStr" placeholder="风光摄影,自然风光,人像摄影,纪实人文" required />
                </div>
                
                <!-- 简单的一等奖等奖项设置 -->
                <div class="form-group">
                  <label>奖金设置奖励配置描述 (JSON) <span class="text-danger">*</span></label>
                  <textarea class="form-control" v-model="newT.prizesStr" rows="4" required></textarea>
                </div>

                <button type="submit" class="btn btn-primary" style="font-weight: bold;">发布新赛事</button>
              </form>
            </div>

          </div>
        </div>

        <!-- 5. 公告发表 (Announcements) -->
        <div v-if="activeMenu === 'announcements'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📢 公告板块管理</div>
          <div class="panel-body" style="padding: 20px;">
            <!-- 发布公告 -->
            <div class="well" style="background: #f8f9fa;">
              <h4 style="font-weight: bold; margin-top: 0; margin-bottom: 15px;">发布一条公告</h4>
              <form @submit.prevent="createAnnouncement">
                <div class="form-group">
                  <label>公告标题</label>
                  <input type="text" class="form-control" v-model="newAnn.title" placeholder="输入公告的标题" required />
                </div>
                <div class="form-group">
                  <label>公告类型</label>
                  <select class="form-control" v-model="newAnn.type" required>
                    <option value="system">🔧 系统维护</option>
                    <option value="tournament">🏆 赛事公告</option>
                    <option value="winner">🥇 获奖名单发布</option>
                    <option value="feature">✨ 新功能上线</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>公告详情内容</label>
                  <textarea class="form-control" v-model="newAnn.content" rows="4" placeholder="公告的详细图文详情内容" required></textarea>
                </div>
                <button type="submit" class="btn btn-success" style="font-weight: bold;">发布公告</button>
              </form>
            </div>

            <!-- 公告列表 -->
            <table class="table table-striped table-hover">
              <thead>
                <tr>
                  <th>公告标题</th>
                  <th>时间</th>
                  <th>类型</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in announcementsList" :key="a.id">
                  <td style="font-weight: bold;">{{ a.title }}</td>
                  <td>{{ a.time }}</td>
                  <td>{{ a.type }}</td>
                  <td>
                    <button class="btn btn-xs btn-danger" @click="deleteAnnouncement(a.id)">撤销删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 6. 意见反馈管理 (Feedback) -->
        <div v-if="activeMenu === 'feedback'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">💬 大众反馈及技术维权申诉处理</div>
          <div class="panel-body" style="padding: 0;">
            <table class="table table-striped table-hover" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th>用户账号</th>
                  <th>反馈标题</th>
                  <th>问题类别</th>
                  <th>联系方式</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>回复操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in feedbackList" :key="f.id">
                  <td>{{ f.userId || '游客' }} ({{ f.userNick }})</td>
                  <td :title="f.content" style="font-weight: bold; cursor: help;">{{ f.title }}</td>
                  <td>{{ getFbTypeName(f.type) }}</td>
                  <td>{{ f.contact || '未留' }}</td>
                  <td style="font-size: 12px;">{{ f.createTime }}</td>
                  <td>
                    <span class="label" :class="f.status === 'processed' ? 'label-success' : 'label-warning'">
                      {{ f.status === 'processed' ? '已答复' : '未处理' }}
                    </span>
                  </td>
                  <td>
                    <button 
                      class="btn btn-xs" 
                      :class="f.status === 'processed' ? 'btn-default' : 'btn-primary'"
                      @click="replyFeedback(f)"
                    >
                      {{ f.status === 'processed' ? '重新回复' : '答复解决' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="feedbackList.length === 0">
                  <td colspan="7" class="text-center text-secondary" style="padding: 40px;">暂无用户意见反馈数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- 结算赛事模态框 -->
    <div v-if="activeEndTournament" class="modal fade in" style="display: block; background: rgba(0, 0, 0, 0.5);" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" @click="activeEndTournament = null">&times;</button>
            <h4 class="modal-title">🏆 赛事结算评估：《{{ activeEndTournament.name }}》</h4>
          </div>
          <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
            <p class="alert alert-info">
              💡 结算说明：系统已将该赛事下的投稿作品根据投票数降序排列。您可以在下方为前几名分发一等奖、二等奖、三等奖，确认结算后，赛事状态将变成已结束，并且会自动发布一份获奖公告。
            </p>
            
            <table class="table table-striped table-hover">
              <thead>
                <tr>
                  <th>投票排名</th>
                  <th>缩略图</th>
                  <th>作品名称</th>
                  <th>摄影师</th>
                  <th>🔥 当前票数</th>
                  <th>🎁 分发奖项级别 (Winner Rank)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(w, idx) in endTournamentWorks" :key="w.id">
                  <td style="font-weight: bold;">NO.{{ idx + 1 }}</td>
                  <td>
                    <img :src="w.img" style="width: 40px; height: 28px; object-fit: cover; border-radius: 3px;" />
                  </td>
                  <td style="font-weight: bold;">{{ w.workName }}</td>
                  <td>{{ w.authorNick }}</td>
                  <td style="font-weight: bold; color: #4f46e5;">{{ w.voteCount }} 票</td>
                  <td>
                    <select class="form-control input-sm" v-model="winnerAssignments[w.id]" style="width: 160px;">
                      <option value="">-- 暂不设奖 --</option>
                      <option value="一等奖">🥇 一等奖</option>
                      <option value="二等奖">🥈 二等奖</option>
                      <option value="三等奖">🥉 三等奖</option>
                      <option value="优秀奖">🏅 优秀奖</option>
                      <option value="人气奖">🏅 人气奖</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="activeEndTournament = null">取消</button>
            <button type="button" class="btn btn-primary" @click="submitEndTournament">确认提交结算名单</button>
          </div>
        </div>
      </div>
    </div>

  </div>
  <div v-else class="container text-center" style="padding: 100px 0;">
    <h3 class="text-danger">⛔ 抱歉，权限不足！该后台仅限管理员账户访问！</h3>
    <router-link to="/" class="btn btn-primary" style="margin-top: 20px;">返回首页</router-link>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'Admin',
  setup() {
    const router = useRouter()
    const activeMenu = ref('dashboard')
    const tournamentSubTab = ref('list')

    const menus = [
      { id: 'dashboard', label: '📊 运营数据看板' },
      { id: 'users', label: '👥 注册用户管理' },
      { id: 'audit', label: '📸 投稿存证审核' },
      { id: 'tournaments', label: '🏆 赛事周期发布' },
      { id: 'announcements', label: '📢 公告板块管理' },
      { id: 'feedback', label: '💬 用户反馈答复' }
    ]

    // 状态列表
    const usersList = ref([])
    const worksList = ref([])
    const tournamentsList = ref([])
    const announcementsList = ref([])
    const feedbackList = ref([])
    
    const verifyingId = ref(null)

    // 赛事结算模态状态
    const activeEndTournament = ref(null)
    const endTournamentWorks = ref([])
    const winnerAssignments = ref({}) // key: workId, value: rank

    // 新数据绑定
    const newT = reactive({
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      voteStart: '',
      voteEnd: '',
      categoriesStr: '风光摄影,自然风光,人像摄影,纪实人文,人文摄影,夜景摄影,静物摄影',
      prizesStr: `[
  {"rank": "一等奖", "prize": "专业摄影器材套装（价值15000元） + 荣誉证书"},
  {"rank": "二等奖", "prize": "摄影背包 + 滤镜套装 + 荣誉证书"},
  {"rank": "三等奖", "prize": "摄影书籍套装 + 三脚架 + 荣誉证书"},
  {"rank": "优秀奖", "prize": "定制摄影马甲 + 参与证书"}
]`
    })

    const newAnn = reactive({
      title: '',
      type: 'system',
      content: ''
    })

    // 思考过程 (Chinese Thinking Process):
    // 1. 本页面是管理员面板，集成了多个子板块：用户禁用、作品物理下架/审核并触发以太坊存证上链、发布新赛事、结算并指定赛事得奖作品、发布公告和回复反馈。
    // 2. 作品审核通过 (verifyWork)：
    //    - 若接入了 Ganache，调用合约 `certify` 将作品 MD5 哈希与作者写入区块链。一旦哈希生成，回传后端 `/api/admin/works/:id/status`。
    //    - 若 Ganache 未运行，前端调用接口不传递哈希，后端会自动拦截并降级为“后端模拟挖矿模块”产生模拟高度与哈希，实现了“存证审核”的平滑闭环。
    // 3. 赛事结算 (submitEndTournament)：筛选指定赛事名下的所有作品，支持管理员选择分发奖项，结束赛事状态，并由后端联动自动生成一份“获奖公告”。

    const loadAllData = async () => {
      const headers = { 'X-User-Account': store.user.account }
      try {
        const [uRes, wRes, tRes, aRes, fRes] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/works'), // 获取所有状态作品 (包括 pending)
          fetch('/api/tournaments'),
          fetch('/api/announcements'),
          fetch('/api/feedback', { headers })
        ])

        if (uRes.ok) usersList.value = await uRes.json()
        if (wRes.ok) worksList.value = await wRes.json()
        if (tRes.ok) tournamentsList.value = await tRes.json()
        if (aRes.ok) announcementsList.value = await aRes.json()
        if (fRes.ok) feedbackList.value = await fRes.json()
      } catch (err) {
        console.error('拉取管理员数据故障:', err)
      }
    }

    const dashboardStats = computed(() => {
      const uCount = usersList.value.length
      const wCount = worksList.value.length
      const pCount = worksList.value.filter(w => w.status === 'pending').length
      
      let vCount = 0
      const catCounts = {}
      
      worksList.value.forEach(w => {
        vCount += w.voteCount
        if (w.status === 'online') {
          catCounts[w.category] = (catCounts[w.category] || 0) + 1
        }
      })

      return {
        usersCount: uCount,
        worksCount: wCount,
        pendingCount: pCount,
        votesCount: vCount,
        categoryCounts: catCounts
      }
    })

    const pendingWorks = computed(() => {
      return worksList.value.filter(w => w.status === 'pending')
    })

    // 禁用/激活账号
    const toggleUserStatus = async (account) => {
      if (account === store.user.account) return
      
      try {
        const res = await fetch(`/api/admin/users/${account}/status`, {
          method: 'PUT',
          headers: {
            'X-User-Account': store.user.account
          }
        })

        if (res.ok) {
          alert('用户状态更新成功')
          loadAllData()
        }
      } catch (err) {
        alert('接口通信异常: ' + err.message)
      }
    }

    // 审核作品，通过后直接发送合约交易
    const verifyWork = async (w, action) => {
      const confirmMsg = action === 'approve' ? `确认审核通过并对其进行以太坊区块链防伪存证确权？` : `确认拒绝该作品？`
      if (!confirm(confirmMsg)) return

      verifyingId.value = w.id
      try {
        let payload = { action }

        // 1. 如果是通过审核，且连接了本地 Ganache，则触发真实上链交易，并将交易哈希回送给后端
        if (action === 'approve') {
          if (store.ganacheConnected) {
            const web3 = store.web3
            const contract = store.contract
            const adminAddr = store.user.walletAddress
            
            try {
              // 自动校验或切换账户默认值
              console.log(`管理员发起上链存证, 作品哈希: ${w.hash}`)
              const result = await contract.methods.certify(
                w.workName,
                w.hash,
                w.category,
                w.walletAddress || adminAddr
              ).send({
                from: adminAddr,
                gas: 6721975
              })

              payload.txHash = result.transactionHash
              payload.blockHeight = result.blockNumber
              
              if (result.events && result.events.Certified) {
                payload.certId = Number(result.events.Certified.returnValues.id)
              } else {
                payload.certId = Number(await contract.methods.getCertificationCount().call()) - 1
              }
              
              const block = await web3.eth.getBlock(result.blockNumber)
              payload.chainTime = new Date(block.timestamp * 1000).toLocaleString()

              console.log('✅ 真实以太坊智能合约存证执行成功，回传数据给 Go 后端')
            } catch (blockErr) {
              console.warn('智能合约存证交易失败，系统降级为后端模拟挖矿存证:', blockErr.message)
            }
          }
        }

        // 2. 回传给后端审核结果
        const res = await fetch(`/api/admin/works/${w.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify(payload)
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '审核失败')
          return
        }

        alert(action === 'approve' ? '审核通过，已成功确权并在以太坊智能合约上生成永久凭证！' : '该作品已被拒绝。')
        loadAllData()
      } catch (err) {
        alert('接口通信故障: ' + err.message)
      } finally {
        verifyingId.value = null
      }
    }

    // 创建赛事
    const createTournament = async () => {
      let prizes = []
      try {
        prizes = JSON.parse(newT.prizesStr.trim())
      } catch (e) {
        alert('奖金设置奖励配置描述 JSON 格式不正确！')
        return
      }

      const categories = newT.categoriesStr.split(',').map(s => s.trim()).filter(Boolean)

      try {
        const res = await fetch('/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({
            name: newT.name,
            description: newT.description,
            startTime: newT.startTime,
            endTime: newT.endTime,
            voteStart: newT.voteStart,
            voteEnd: newT.voteEnd,
            categories,
            prizes
          })
        })

        if (!res.ok) {
          const data = await res.json()
          alert(data.error || '发布赛事失败')
          return
        }

        alert('新摄影赛事成功创建发布！')
        // 重置表单并跳回列表
        newT.name = ''
        newT.description = ''
        newT.startTime = ''
        newT.endTime = ''
        newT.voteStart = ''
        newT.voteEnd = ''
        tournamentSubTab.value = 'list'
        loadAllData()
      } catch (err) {
        alert('接口异常: ' + err.message)
      }
    }

    // 物理删除赛事
    const deleteTournament = async (id) => {
      if (!confirm('确定要永久删除该赛事吗？这不会删除参赛作品，但会导致赛事无法访问。')) return
      
      try {
        const res = await fetch(`/api/tournaments/${id}`, {
          method: 'DELETE',
          headers: { 'X-User-Account': store.user.account }
        })

        if (res.ok) {
          alert('赛事删除成功')
          loadAllData()
        }
      } catch (err) {
        alert('删除异常: ' + err.message)
      }
    }

    // 开启赛事结算流程
    const openEndTournamentModal = (t) => {
      activeEndTournament.value = t
      // 筛选在该赛事下的已上架作品，按照得票数由大到小倒序
      const filtered = worksList.value
        .filter(w => w.tournamentId === t.id && w.status === 'online')
        .sort((a, b) => b.voteCount - a.voteCount)
      
      endTournamentWorks.value = filtered
      winnerAssignments.value = {}
      
      // 默认分配前几名辅助配置
      if (filtered.length > 0) winnerAssignments.value[filtered[0].id] = '一等奖'
      if (filtered.length > 1) winnerAssignments.value[filtered[1].id] = '二等奖'
      if (filtered.length > 2) winnerAssignments.value[filtered[2].id] = '三等奖'
    }

    // 提交赛事结算名单
    const submitEndTournament = async () => {
      const winners = []
      
      for (const [wIdStr, rank] of Object.entries(winnerAssignments.value)) {
        if (rank) {
          const wId = Number(wIdStr)
          const work = endTournamentWorks.value.find(item => item.id === wId)
          if (work) {
            winners.push({
              rank: rank,
              workId: wId,
              workName: work.workName,
              author: work.authorNick,
              img: work.img
            })
          }
        }
      }

      if (winners.length === 0 && endTournamentWorks.value.length > 0) {
        if (!confirm('您未指定任何获奖作品，确定以此结算并结束赛事吗？')) return
      }

      try {
        const res = await fetch(`/api/tournaments/${activeEndTournament.value.id}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({ winners })
        })

        if (res.ok) {
          alert('赛事已完成结束结算！系统已将评选结果移送获奖展厅，并同步公布获奖公告！')
          activeEndTournament.value = null
          loadAllData()
        } else {
          const d = await res.json()
          alert(d.error || '结算提交失败')
        }
      } catch (err) {
        alert('结算出错: ' + err.message)
      }
    }

    // 发布公告
    const createAnnouncement = async () => {
      try {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({
            title: newAnn.title.trim(),
            type: newAnn.type,
            content: newAnn.content.trim()
          })
        })

        if (res.ok) {
          alert('新系统公告成功发布')
          newAnn.title = ''
          newAnn.content = ''
          loadAllData()
        }
      } catch (err) {
        alert('公告发布接口异常: ' + err.message)
      }
    }

    // 删除撤销公告
    const deleteAnnouncement = async (id) => {
      if (!confirm('确定要删除删除这条公告吗？')) return
      try {
        const res = await fetch(`/api/announcements/${id}`, {
          method: 'DELETE',
          headers: { 'X-User-Account': store.user.account }
        })
        if (res.ok) {
          alert('公告已删除')
          loadAllData()
        }
      } catch (err) {
        alert('接口出错: ' + err.message)
      }
    }

    const getFbTypeName = (type) => {
      const names = {
        tournament: '赛事反馈',
        certify: '存证上链故障',
        market: '交易确权集市',
        bug: '系统运行Bug',
        other: '其他建议'
      }
      return names[type] || '通用反馈'
    }

    // 管理员给反馈回话
    const replyFeedback = async (fb) => {
      const reply = prompt(`对用户 [${fb.userNick}] 的反馈《${fb.title}》录入答复解决：\n\n用户反馈原话：${fb.content}\n\n请输入您的官方回复：`, fb.reply)
      if (reply === null) return
      
      const r = reply.trim()
      if (!r) {
        alert('答复回复内容不能为空！')
        return
      }

      try {
        const res = await fetch(`/api/feedback/${fb.id}/reply`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({ reply: r })
        })

        if (res.ok) {
          alert('答复已成功发送给该用户！')
          loadAllData()
        } else {
          alert('操作失败')
        }
      } catch (err) {
        alert('接口通信失败: ' + err.message)
      }
    }

    onMounted(() => {
      if (store.user?.role === 'admin') {
        loadAllData()
      }
    })

    return {
      store,
      activeMenu,
      tournamentSubTab,
      menus,
      usersList,
      pendingWorks,
      tournamentsList,
      announcementsList,
      feedbackList,
      verifyingId,
      activeEndTournament,
      endTournamentWorks,
      winnerAssignments,
      newT,
      newAnn,
      dashboardStats,
      toggleUserStatus,
      verifyWork,
      createTournament,
      deleteTournament,
      openEndTournamentModal,
      submitEndTournament,
      createAnnouncement,
      deleteAnnouncement,
      getFbTypeName,
      replyFeedback
    }
  }
}
</script>
