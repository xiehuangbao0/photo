<template>
  <div v-if="store.user" class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="row">
      <!-- 左侧个人资料菜单与卡片 -->
      <div class="col-md-3" style="margin-bottom: 20px;">
        <div class="panel panel-default" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading text-center" style="background: #f8f9fa; border-bottom: 1px solid #eee; padding: 20px 15px;">
            <div style="font-size: 50px; margin-bottom: 10px;">👤</div>
            <h4 style="margin: 0; font-weight: bold;">{{ store.user.nickName || store.user.account }}</h4>
            <span class="label" :class="getRoleLabelClass(store.user.role)" style="margin-top: 8px; display: inline-block;">
              {{ getRoleName(store.user.role) }}
            </span>
          </div>
          <div class="list-group" style="margin-bottom: 0;">
            <button 
              v-for="tab in availableTabs" 
              :key="tab.id"
              class="list-group-item text-left" 
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
            <router-link to="/updatePwd" class="list-group-item text-left text-danger">
              🔒 修改登录密码
            </router-link>
          </div>
        </div>
      </div>

      <!-- 右侧主要工作区 -->
      <div class="col-md-9">
        <!-- Tab 1: 个人资料修改 -->
        <div v-if="activeTab === 'profile'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">👤 基础资料设置</div>
          <div class="panel-body" style="padding: 25px;">
            <form @submit.prevent="updateProfile">
              <div class="form-group">
                <label>登录账号 (不可修改)</label>
                <input type="text" class="form-control" :value="store.user.account" readonly disabled />
              </div>
              <div class="form-group">
                <label for="pNick">用户昵称</label>
                <input type="text" class="form-control" id="pNick" v-model="profileForm.nickName" required />
              </div>
              <div class="form-group">
                <label for="pPhone">联系电话</label>
                <input type="text" class="form-control" id="pPhone" v-model="profileForm.phone" placeholder="请输入您的手机号" />
              </div>
              <div class="form-group">
                <label for="pBio">个人简介</label>
                <textarea class="form-control" id="pBio" v-model="profileForm.bio" rows="4" placeholder="写一句简介展示自己..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="font-weight: bold;">保存资料修改</button>
            </form>
          </div>
        </div>

        <!-- Tab 2: 模拟钱包管理 -->
        <div v-if="activeTab === 'wallet'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">💳 链上与本地模拟钱包控制中心</div>
          <div class="panel-body" style="padding: 25px;">
            <div class="row" style="margin-bottom: 25px;">
              <div class="col-sm-6" style="margin-bottom: 15px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981;">
                  <div style="font-size: 12px; color: #777;">人民币模拟账户余额</div>
                  <div style="font-size: 26px; font-weight: bold; color: #10b981; margin-top: 5px;">&yen; {{ store.user.cnyBalance.toFixed(2) }}</div>
                  
                  <!-- 人民币充值/提现操作 -->
                  <div style="margin-top: 15px;" class="input-group input-group-sm">
                    <input type="number" class="form-control" v-model.number="cnyAmount" placeholder="输入人民币金额" min="1" />
                    <span class="input-group-btn">
                      <button class="btn btn-success" @click="handleBalanceChange('cny', 'deposit', cnyAmount)">充值</button>
                      <button class="btn btn-default" @click="handleBalanceChange('cny', 'withdraw', cnyAmount)">提现</button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-sm-6">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #4f46e5;">
                  <div style="font-size: 12px; color: #777;">以太坊链上钱包余额</div>
                  <div style="font-size: 26px; font-weight: bold; color: #4f46e5; margin-top: 5px;">{{ store.user.ethBalance.toFixed(4) }} ETH</div>
                  
                  <!-- ETH充值/提现操作 -->
                  <div style="margin-top: 15px;" class="input-group input-group-sm">
                    <input type="number" class="form-control" v-model.number="ethAmount" step="0.01" placeholder="输入 ETH 金额" min="0.001" />
                    <span class="input-group-btn">
                      <button class="btn btn-primary" @click="handleBalanceChange('eth', 'deposit', ethAmount)">充值</button>
                      <button class="btn btn-default" @click="handleBalanceChange('eth', 'withdraw', ethAmount)">提现</button>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 钱包凭证 -->
            <div style="background: #1e293b; color: #cbd5e1; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.8;">
              <h4 style="color: white; font-weight: bold; margin-top: 0; font-family: sans-serif;">🔒 区块链加密钱包凭证</h4>
              <div style="margin-top: 15px;">
                <strong>链上公钥地址 (Wallet Address):</strong>
                <div style="word-break: break-all; color: #38bdf8; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-top: 5px; position: relative;">
                  {{ store.user.walletAddress }}
                  <button class="btn btn-xs btn-primary" style="position: absolute; right: 8px; top: 6px;" @click="copyText(store.user.walletAddress)">复制</button>
                </div>
              </div>
              <div style="margin-top: 15px;">
                <strong>链上加密私钥 (Private Key):</strong>
                <div style="word-break: break-all; color: #f43f5e; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-top: 5px; position: relative;">
                  {{ showPrivateKey ? store.user.walletPrivateKey || '0x' + 'f'.repeat(64) : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' }}
                  <button class="btn btn-xs btn-default" style="position: absolute; right: 8px; top: 6px; color: #333;" @click="togglePrivateKey">
                    {{ showPrivateKey ? '隐藏' : '显示' }}
                  </button>
                </div>
              </div>
              <p style="margin-top: 15px; font-size: 11px; color: #94a3b8; font-family: sans-serif;">
                💡 风险提示：私钥是管理您数字版权与链上代币资产的唯一加密钥匙，切勿泄露给任何人。
              </p>
            </div>
          </div>
        </div>

        <!-- Tab 3: 我的作品投稿历史 (仅限摄影师) -->
        <div v-if="activeTab === 'works'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📸 投稿作品存证历史记录</div>
          <div class="panel-body" style="padding: 0;">
            <table class="table table-striped table-hover" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th>作品名称</th>
                  <th>类别</th>
                  <th>价格 (元)</th>
                  <th>当前得票</th>
                  <th>存证状态</th>
                  <th>审核操作/凭证</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in myWorks" :key="w.id">
                  <td style="font-weight: bold;">
                    <router-link :to="'/work-detail?id=' + w.id">{{ w.workName }}</router-link>
                  </td>
                  <td>{{ w.category }}</td>
                  <td>&yen; {{ w.price }}</td>
                  <td>🔥 {{ w.voteCount }}</td>
                  <td>
                    <span 
                      class="label" 
                      :class="w.status === 'online' ? 'label-success' : w.status === 'rejected' ? 'label-danger' : 'label-warning'"
                    >
                      {{ w.status === 'online' ? '通过并上架' : w.status === 'rejected' ? '已拒绝' : '待管理员存证审核' }}
                    </span>
                  </td>
                  <td>
                    <span v-if="w.onChain" style="font-size: 11px; color: #10b981;">
                      ⛓️ 已存证 (Cert-{{ w.certId }})
                    </span>
                    <span v-else-if="w.status === 'rejected'" style="font-size: 11px; color: #999;">
                      不予确权
                    </span>
                    <span v-else style="font-size: 11px; color: #f59e0b;">
                      等待链上计算
                    </span>
                  </td>
                </tr>
                <tr v-if="myWorks.length === 0">
                  <td colspan="6" class="text-center text-secondary" style="padding: 40px;">
                    暂无投稿作品，马上 <router-link to="/publish">发表第一篇作品</router-link> 吧！
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 4: 购买订单与我的交易订单 -->
        <div v-if="activeTab === 'orders'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📜 确权版权买卖流转记录</div>
          <div class="panel-body" style="padding: 0;">
            <table class="table table-striped table-hover" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th>作品</th>
                  <th>交易金额</th>
                  <th>我的角色</th>
                  <th>交易对手</th>
                  <th>时间</th>
                  <th>智能合约哈希</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in myOrders" :key="o.id">
                  <td>
                    <router-link :to="'/work-detail?id=' + o.workId">{{ o.workName }}</router-link>
                  </td>
                  <td style="font-weight: bold; color: #dc2626;">&yen; {{ o.price }}</td>
                  <td>
                    <span 
                      class="label" 
                      :class="o.buyerAccount === store.user.account ? 'label-primary' : 'label-success'"
                    >
                      {{ o.buyerAccount === store.user.account ? '买方 (授入)' : '卖方 (授出)' }}
                    </span>
                  </td>
                  <td>{{ o.buyerAccount === store.user.account ? o.sellerAccount : o.buyerAccount }}</td>
                  <td style="font-size: 12px;">{{ o.time }}</td>
                  <td>
                    <code style="font-size: 11px; background: none; padding: 0;" :title="o.txHash">
                      {{ formatTxHash(o.txHash) }}
                    </code>
                  </td>
                </tr>
                <tr v-if="myOrders.length === 0">
                  <td colspan="6" class="text-center text-secondary" style="padding: 40px;">
                    暂无版权流转交易记录
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 5: 反馈意见 -->
        <div v-if="activeTab === 'feedback'" class="panel panel-default" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold;">📝 意见反馈与问题提交</div>
          <div class="panel-body" style="padding: 20px;">
            
            <ul class="nav nav-tabs" style="margin-bottom: 20px;">
              <li :class="{ active: feedbackTab === 'submit' }">
                <a href="#" @click.prevent="feedbackTab = 'submit'">提交新反馈</a>
              </li>
              <li :class="{ active: feedbackTab === 'history' }">
                <a href="#" @click.prevent="feedbackTab = 'history'">我的反馈历史记录</a>
              </li>
            </ul>

            <div class="tab-content">
              <!-- 提交反馈 -->
              <div v-if="feedbackTab === 'submit'">
                <form @submit.prevent="submitFeedback">
                  <div class="form-group">
                    <label>反馈标题 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" v-model="fbForm.title" placeholder="请简要概括您的问题或建议" required />
                  </div>
                  <div class="form-group">
                    <label>反馈类型 <span class="text-danger">*</span></label>
                    <select class="form-control" v-model="fbForm.type" required>
                      <option value="">-- 请选择类型 --</option>
                      <option value="tournament">🏆 赛事流程与投票问题</option>
                      <option value="certify">⛓️ 智能合约存证上链故障</option>
                      <option value="market">💰 版权集市交易及支付结算</option>
                      <option value="bug">🐛 发现系统运行 bug</option>
                      <option value="other">💡 其他优化改善建议</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>详细说明内容 <span class="text-danger">*</span></label>
                    <textarea class="form-control" v-model="fbForm.content" rows="5" placeholder="请在这里详细描述您的问题，以便我们及时为您处理..." required></textarea>
                  </div>
                  <div class="form-group">
                    <label>联系方式 (选填)</label>
                    <input type="text" class="form-control" v-model="fbForm.contact" placeholder="如手机号、QQ等，方便我们联系您反馈进度" />
                  </div>
                  <button type="submit" class="btn btn-primary" style="font-weight: bold;">提交反馈</button>
                </form>
              </div>

              <!-- 反馈历史 -->
              <div v-if="feedbackTab === 'history'">
                <div 
                  v-for="fb in myFeedbacks" 
                  :key="fb.id"
                  style="border: 1px solid #eee; padding: 15px; border-radius: 6px; margin-bottom: 15px;"
                >
                  <div class="clearfix" style="font-size: 12px; color: #666; border-bottom: 1px solid #f9f9f9; padding-bottom: 5px;">
                    <span class="pull-left">
                      <strong>[{{ getFbTypeName(fb.type) }}]</strong> {{ fb.title }}
                    </span>
                    <span class="pull-right">
                      {{ fb.createTime }}
                      <span 
                        class="label" 
                        :class="fb.status === 'processed' ? 'label-success' : 'label-warning'"
                        style="margin-left: 10px;"
                      >
                        {{ fb.status === 'processed' ? '已答复' : '处理中' }}
                      </span>
                    </span>
                  </div>
                  
                  <p style="margin-top: 10px; font-size: 13px; color: #333; line-height: 1.6;">
                    {{ fb.content }}
                  </p>

                  <!-- 管理员回复内容 -->
                  <div 
                    v-if="fb.reply" 
                    style="margin-top: 10px; padding: 10px 12px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 4px; font-size: 12px;"
                  >
                    <strong style="color: #059669;">🛡️ 系统管理员答复：</strong>
                    <div style="margin-top: 5px; color: #333;">{{ fb.reply }}</div>
                  </div>
                </div>

                <div v-if="myFeedbacks.length === 0" class="text-center text-secondary py-4" style="padding: 20px;">
                  暂无反馈记录
                </div>
              </div>
            </div>

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
  name: 'PersonInfo',
  setup() {
    const activeTab = ref('profile')
    const feedbackTab = ref('submit')
    
    // 表单状态
    const profileForm = ref({
      nickName: '',
      phone: '',
      bio: ''
    })

    const cnyAmount = ref('')
    const ethAmount = ref('')
    const showPrivateKey = ref(false)

    // 数据列表
    const myWorks = ref([])
    const myOrders = ref([])
    const myFeedbacks = ref([])

    const fbForm = ref({
      title: '',
      type: '',
      content: '',
      contact: ''
    })

    // 思考过程 (Chinese Thinking Process):
    // 1. 个人中心为多重交互式 Tab 面板：个人资料维护、充值取现、投稿历史列表、版权买卖流转账单、以及意见反馈板块。
    // 2. 钱包管理：支持 CNY 和 ETH 余额的存取（ deposit / withdraw ）。充值/提现操作通过与 Go 后端 `/api/user/balance` 交互，实时刷新 user 全局 store。
    //    钱包地址和私钥信息支持使用 Web Clipboard API 进行一键复制，增强实用度。
    // 3. 数据隔离：获取作品投稿历史 (`/api/works?authorAccount=xxx`)，以及已购订单历史 (`/api/user/orders`)。
    // 4. 反馈模块：提供创建反馈及获取当前用户反馈历史。

    const availableTabs = computed(() => {
      const list = [
        { id: 'profile', label: '👤 个人资料修改' },
        { id: 'wallet', label: '💳 模拟钱包管理' }
      ]
      if (store.user?.role === 'photographer') {
        list.push({ id: 'works', label: '📸 投稿作品历史' })
      }
      list.push({ id: 'orders', label: '📜 授权买卖流水' })
      list.push({ id: 'feedback', label: '📝 反馈意见提交' })
      return list
    })

    const getRoleName = (role) => {
      return role === 'admin' ? '系统管理员' : role === 'photographer' ? '签约摄影师' : '大众大众评审'
    }

    const getRoleLabelClass = (role) => {
      return role === 'admin' ? 'label-danger' : role === 'photographer' ? 'label-primary' : 'label-success'
    }

    const loadProfileData = () => {
      if (store.user) {
        profileForm.value.nickName = store.user.nickName || ''
        profileForm.value.phone = store.user.phone || ''
        profileForm.value.bio = store.user.bio || ''
      }
    }

    // 1. 保存个人资料
    const updateProfile = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify(profileForm.value)
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '保存资料失败')
          return
        }

        store.setUser(data.user)
        alert('个人资料保存成功！')
      } catch (err) {
        alert('保存异常: ' + err.message)
      }
    }

    // 2. 资金账户变动
    const handleBalanceChange = async (currency, action, amount) => {
      if (!amount || amount <= 0) {
        alert('请输入有效的金额！')
        return
      }

      try {
        const res = await fetch('/api/user/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({
            currency,
            action,
            amount
          })
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '操作失败')
          return
        }

        store.setUser(data.user)
        alert('资产更新结算成功！')
        
        // 动作完成后，清空对应的 input 金额
        if (currency === 'cny') cnyAmount.value = ''
        else ethAmount.value = ''
      } catch (err) {
        alert('资产调整结算出错: ' + err.message)
      }
    }

    // 3. 复制文本到剪贴板
    const copyText = (txt) => {
      navigator.clipboard.writeText(txt).then(() => {
        alert('复制成功！')
      }).catch(err => {
        alert('复制失败，请手动选取拷贝。')
      })
    }

    const togglePrivateKey = () => {
      showPrivateKey.value = !showPrivateKey.value
    }

    // 4. 加载特定用户的历史投稿
    const loadMyWorks = async () => {
      if (store.user?.role !== 'photographer') return
      try {
        const res = await fetch(`/api/works?authorAccount=${store.user.account}`)
        if (res.ok) {
          myWorks.value = await res.json()
        }
      } catch (err) {
        console.error('加载我的摄影历史失败:', err)
      }
    }

    // 5. 加载订单流转列表
    const loadMyOrders = async () => {
      try {
        const res = await fetch('/api/user/orders', {
          headers: { 'X-User-Account': store.user.account }
        })
        if (res.ok) {
          myOrders.value = await res.json()
        }
      } catch (err) {
        console.error('加载买卖流转记录失败:', err)
      }
    }

    // 6. 提交意见反馈
    const submitFeedback = async () => {
      const form = fbForm.value
      if (!form.title || !form.type || !form.content) {
        alert('请填写完整的反馈建议和类型！')
        return
      }

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify(form)
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '提交反馈失败')
          return
        }

        alert(data.message || '反馈成功提交，感谢您的信任！')
        
        // 重置
        fbForm.value = { title: '', type: '', content: '', contact: '' }
        feedbackTab.value = 'history'
        
        // 重新拉取列表
        loadMyFeedbacks()
      } catch (err) {
        alert('接口访问异常: ' + err.message)
      }
    }

    // 7. 加载当前用户的意见反馈
    const loadMyFeedbacks = async () => {
      try {
        const res = await fetch('/api/feedback', {
          headers: { 'X-User-Account': store.user.account }
        })
        if (res.ok) {
          myFeedbacks.value = await res.json()
        }
      } catch (err) {
        console.error('加载意见记录失败:', err)
      }
    }

    const formatTxHash = (hash) => {
      if (!hash) return ''
      if (hash.length <= 16) return hash
      return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8)
    }

    const getFbTypeName = (type) => {
      const names = {
        tournament: '赛事建议',
        certify: '存证故障',
        market: '版权集市',
        bug: '发现系统bug',
        other: '其他建议'
      }
      return names[type] || '其他反馈'
    }

    onMounted(() => {
      loadProfileData()
      loadMyWorks()
      loadMyOrders()
      loadMyFeedbacks()
    })

    return {
      store,
      activeTab,
      feedbackTab,
      profileForm,
      cnyAmount,
      ethAmount,
      showPrivateKey,
      myWorks,
      myOrders,
      myFeedbacks,
      fbForm,
      availableTabs,
      getRoleName,
      getRoleLabelClass,
      updateProfile,
      handleBalanceChange,
      copyText,
      togglePrivateKey,
      submitFeedback,
      formatTxHash,
      getFbTypeName
    }
  }
}
</script>
