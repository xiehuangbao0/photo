<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <!-- 头部看板 (Dashboard) -->
    <div class="row" style="margin-bottom: 30px;">
      <div class="col-md-3 col-sm-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important; padding: 20px; border-radius: 8px; color: white; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);">
          <div style="font-size: 30px; margin-bottom: 10px;">📦</div>
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">{{ stats.blockCount }}</div>
          <div style="font-size: 13px; opacity: 0.8;">区块高度 (Blocks)</div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; padding: 20px; border-radius: 8px; color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);">
          <div style="font-size: 30px; margin-bottom: 10px;">🏷️</div>
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">{{ stats.validCount }}</div>
          <div style="font-size: 13px; opacity: 0.8;">已存证证书 (Certificates)</div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important; padding: 20px; border-radius: 8px; color: white; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);">
          <div style="font-size: 30px; margin-bottom: 10px;">💸</div>
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">{{ stats.txCount }}</div>
          <div style="font-size: 13px; opacity: 0.8;">总交易数 (Transactions)</div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important; padding: 20px; border-radius: 8px; color: white; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);">
          <div style="font-size: 30px; margin-bottom: 10px;">⏳</div>
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">{{ stats.pendingCount }}</div>
          <div style="font-size: 13px; opacity: 0.8;">待存证投稿 (Pending)</div>
        </div>
      </div>
    </div>

    <!-- 搜索功能 -->
    <div class="panel panel-default" style="margin-bottom: 30px;">
      <div class="panel-body">
        <div class="input-group">
          <input 
            type="text" 
            class="form-control input-lg" 
            v-model="searchQuery" 
            placeholder="输入区块高度、哈希或交易发送方/接收方地址查询..."
          />
          <span class="input-group-btn">
            <button class="btn btn-primary btn-lg" style="background: #4f46e5; border-color: #4f46e5; font-weight: bold;" type="button">
              🔍 查询
            </button>
          </span>
        </div>
        <p class="help-block" style="margin-top: 10px; margin-bottom: 0;">
          💡 状态提醒：{{ store.ganacheConnected ? '🟢 已成功连接本地 Ganache 区块链网络 (http://127.0.0.1:7545)' : '🟡 未连接 Ganache，当前无缝降级为 Go 后端本地模拟区块链' }}
        </p>
      </div>
    </div>

    <!-- 数据展示区 -->
    <div class="row">
      <!-- 块列表 -->
      <div class="col-md-6">
        <div class="panel panel-default" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold; font-size: 16px;">📦 最新区块 (Blocks)</div>
          <table class="table table-striped table-hover" style="margin-bottom: 0;">
            <thead>
              <tr>
                <th>高度</th>
                <th>区块哈希 (Hash)</th>
                <th>交易数</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in filteredBlocks" :key="b.index">
                <td style="font-weight: bold; color: #4f46e5;">#{{ b.index }}</td>
                <td>
                  <code class="text-primary" style="background: none; padding: 0;">
                    {{ formatHash(b.hash) }}
                  </code>
                </td>
                <td><span class="label label-info">{{ b.transactions ? b.transactions.length : 0 }}</span></td>
                <td style="font-size: 12px;">{{ formatTime(b.timestamp) }}</td>
              </tr>
              <tr v-if="filteredBlocks.length === 0">
                <td colspan="4" class="text-center text-secondary" style="padding: 30px;">暂无区块数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 交易列表 -->
      <div class="col-md-6">
        <div class="panel panel-default" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div class="panel-heading" style="font-weight: bold; font-size: 16px;">💸 最近交易 (Transactions)</div>
          <table class="table table-striped table-hover" style="margin-bottom: 0;">
            <thead>
              <tr>
                <th>哈希 (Hash)</th>
                <th>类型</th>
                <th>发送方</th>
                <th>金额 (Value)</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in filteredTxs" :key="tx.hash">
                <td>
                  <code class="text-primary" style="background: none; padding: 0;" :title="tx.hash">
                    {{ formatHash(tx.hash) }}
                  </code>
                </td>
                <td>
                  <span 
                    class="label" 
                    :class="tx.type === 'certify' ? 'label-success' : tx.type === 'purchase' ? 'label-primary' : 'label-default'"
                  >
                    {{ tx.type === 'certify' ? '存证上链' : tx.type === 'purchase' ? '版权交易' : '常规交易' }}
                  </span>
                </td>
                <td>
                  <code style="background: none; padding: 0;" :title="tx.sender">
                    {{ formatAddress(tx.sender) }}
                  </code>
                </td>
                <td style="font-weight: bold;">{{ tx.value }} ETH</td>
                <td style="font-size: 12px;">{{ formatTime(tx.timestamp) }}</td>
              </tr>
              <tr v-if="filteredTxs.length === 0">
                <td colspan="5" class="text-center text-secondary" style="padding: 30px;">暂无交易数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store/user'

export default {
  name: 'Blockchain',
  setup() {
    const stats = ref({
      blockCount: 0,
      validCount: 0,
      txCount: 0,
      pendingCount: 0
    })
    const blocks = ref([])
    const txs = ref([])
    const searchQuery = ref('')
    let timer = null

    // 思考过程 (Chinese Thinking Process):
    // 1. 本页面展示区块链浏览器。在 Web3 已经连接时，我们可以使用 Web3 库直接查询 Ganache 的块高、块交易并渲染。
    // 2. 但为了保持一致并简化，且方便“在 Ganache 离线时无缝展示后端模拟区块”，我们提供两种模式：
    //    - 如果 `store.ganacheConnected` 为真，则前端直接调用以太坊节点 RPC 数据。
    //    - 如果为假，则向 Go 后端 `/api/blockchain/stats`, `/api/blockchain/blocks`, `/api/blockchain/txs` 抓取统一的本地模拟链数据。
    //    这里由于后端提供了完整的模拟 API，即使 Ganache 连接正常，后端也会做交易同步，因此统一通过 API 访问后端数据非常方便、统一和稳定。
    // 3. 页面配置每 3 秒自动轮询拉取最新数据，并在组件卸载时清除计时器。

    const loadData = async () => {
      try {
        // 直接读取后端统计
        const [statsRes, blocksRes, txsRes] = await Promise.all([
          fetch('/api/blockchain/stats'),
          fetch('/api/blockchain/blocks'),
          fetch('/api/blockchain/txs')
        ])

        if (statsRes.ok) stats.value = await statsRes.json()
        if (blocksRes.ok) blocks.value = await blocksRes.json()
        if (txsRes.ok) txs.value = await txsRes.json()
      } catch (err) {
        console.error('区块链数据轮询异常:', err)
      }
    }

    const formatHash = (hash) => {
      if (!hash) return ''
      if (hash.length <= 16) return hash
      return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8)
    }

    const formatAddress = (addr) => {
      if (!addr) return ''
      if (addr.length <= 12) return addr
      return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4)
    }

    const formatTime = (ts) => {
      if (!ts) return ''
      // 判断是秒级还是毫秒级时间戳
      const ms = ts > 10000000000 ? ts : ts * 1000
      return new Date(ms).toLocaleString()
    }

    // 搜索过滤区块
    const filteredBlocks = computed(() => {
      const q = searchQuery.value.trim().toLowerCase()
      if (!q) return blocks.value

      return blocks.value.filter(b => {
        return (
          b.index.toString() === q ||
          b.hash.toLowerCase().includes(q) ||
          b.previousHash.toLowerCase().includes(q)
        )
      })
    })

    // 搜索过滤交易
    const filteredTxs = computed(() => {
      const q = searchQuery.value.trim().toLowerCase()
      if (!q) return txs.value

      return txs.value.filter(tx => {
        return (
          tx.hash.toLowerCase().includes(q) ||
          tx.sender.toLowerCase().includes(q) ||
          tx.recipient.toLowerCase().includes(q)
        )
      })
    })

    onMounted(() => {
      loadData()
      timer = setInterval(loadData, 3000)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      store,
      stats,
      searchQuery,
      filteredBlocks,
      filteredTxs,
      formatHash,
      formatAddress,
      formatTime
    }
  }
}
</script>
