<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <div class="section-header" style="margin-bottom: 25px;">
      <h2>💰 版权集市 (Copyright Market)</h2>
      <p>所有上架商品已通过国家以太坊智能合约存证审核，受版权确权司法链终生保护。买家购买后可自动获得该作品的商用使用授权。</p>
    </div>

    <!-- 过滤器选项 -->
    <div class="row" style="margin-bottom: 20px;">
      <div class="col-md-12">
        <div class="btn-group btn-group-sm">
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'all' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'all'"
          >
            显示全部
          </button>
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'available' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'available'"
          >
            🛒 可购授权
          </button>
          <button 
            type="button" 
            class="btn" 
            :class="filter === 'purchased' ? 'btn-primary' : 'btn-default'"
            @click="filter = 'purchased'"
          >
            🔒 已售授权
          </button>
        </div>
      </div>
    </div>

    <!-- 商品网格展示 -->
    <div class="row">
      <div 
        v-for="(work, idx) in filteredWorks" 
        :key="work.id" 
        class="col-md-3 col-sm-6"
        style="margin-bottom: 30px;"
      >
        <div class="card photo-card" style="box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; border: 1px solid #eee; background: white; transition: transform 0.2s;">
          <div class="photo-container" style="position: relative; overflow: hidden; height: 180px;">
            <img 
              :src="work.img" 
              class="img-responsive" 
              style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
              @click="previewImage(idx)"
            />
            <span 
              class="label" 
              :class="work.isPurchased ? 'label-default' : 'label-success'"
              style="position: absolute; top: 10px; right: 10px; padding: 4px 8px;"
            >
              {{ work.isPurchased ? '🔒 已售罄' : '🛒 在售中' }}
            </span>
          </div>
          <div class="card-body" style="padding: 15px;">
            <h4 style="margin: 0 0 10px; font-weight: bold; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              <router-link :to="'/work-detail?id=' + work.id" style="color: #333;">{{ work.workName }}</router-link>
            </h4>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
              <div>👤 <strong>摄影师:</strong> {{ work.authorNick }}</div>
              <div style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" :title="work.walletAddress">
                🔑 <strong>链上钱包:</strong> {{ formatAddress(work.walletAddress) }}
              </div>
            </div>

            <hr style="margin: 10px 0;" />

            <!-- 价格与购买按钮 -->
            <div class="row">
              <div class="col-xs-6" style="padding-top: 5px;">
                <div style="font-size: 11px; color: #999;">商用授权价</div>
                <div style="font-size: 16px; font-weight: bold; color: #dc2626;">&yen; {{ work.price }}</div>
                <div style="font-size: 10px; color: #999;">&asymp; {{ (work.price / 2000).toFixed(3) }} ETH</div>
              </div>
              <div class="col-xs-6 text-right" style="padding-top: 10px;">
                <button 
                  v-if="!work.onChain"
                  disabled 
                  class="btn btn-sm btn-default"
                  style="padding: 6px 12px; opacity: 0.6;"
                >
                  待存证
                </button>
                <button 
                  v-else-if="!work.isPurchased"
                  class="btn btn-sm btn-danger"
                  style="font-weight: bold; padding: 6px 12px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none;"
                  @click="handlePurchase(work)"
                  :disabled="buyingId === work.id"
                >
                  {{ buyingId === work.id ? '交易中...' : '购买版权' }}
                </button>
                <button 
                  v-else 
                  disabled 
                  class="btn btn-sm btn-default"
                  style="padding: 6px 12px;"
                >
                  已售出
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <div v-if="filteredWorks.length === 0" class="col-xs-12 text-center text-secondary" style="padding: 60px;">
        📢 暂无匹配当前条件的作品。
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'Market',
  setup() {
    const router = useRouter()
    const works = ref([])
    const filter = ref('all') // 'all' | 'available' | 'purchased'
    const buyingId = ref(null)

    // 思考过程 (Chinese Thinking Process):
    // 1. 版权集市只展示已经上链存证的作品 (`onChain == true`)。
    // 2. 购买时分为两种环境对接：
    //    - 真实以太坊节点环境：读取 `store.ganacheConnected`。
    //      若连接正常，直接使用 `store.contract.methods.purchase(certId).send({ from: buyerAddress, value: priceInWei })`。
    //      这会在 Ganache 上转移真实的 ETH（买家转给卖家）。一旦哈希产生，通知 Go 后端 `/api/works/:id/purchase`，完成多账户人民币划转并出库。
    //    - 降级模拟链环境：未连接 Ganache 时，直接调用后端 `/api/works/:id/purchase`，后端直接生成模拟交易并利用“模拟挖矿”存盘入库。
    // 3. 拦截判断：不能购买自己的版权、需要登录等逻辑全部在前端进行友好阻断。

    const loadWorks = async () => {
      try {
        const res = await fetch('/api/works?status=online')
        if (res.ok) {
          works.value = await res.json()
        }
      } catch (err) {
        console.error('加载市场数据失败:', err)
      }
    }

    const filteredWorks = computed(() => {
      let list = works.value
      if (filter.value === 'available') {
        list = works.value.filter(w => !w.isPurchased)
      } else if (filter.value === 'purchased') {
        list = works.value.filter(w => w.isPurchased)
      }
      return list
    })

    const formatAddress = (addr) => {
      if (!addr) return '0x'
      return addr.substring(0, 8) + '...' + addr.substring(addr.length - 6)
    }

    const handlePurchase = async (work) => {
      if (!store.user) {
        alert('请先登录再进行交易！')
        router.push('/login')
        return
      }

      if (store.user.account === work.authorAccount) {
        alert('抱歉，您不能购买自己发表的作品版权！')
        return
      }

      // 人民币汇率转换
      const ethPrice = work.price / 2000.0 // 1 ETH = 2000 CNY
      if (store.user.cnyBalance < work.price) {
        alert(`您的余额不足！\n当前所需: ￥${work.price} 元\n您的模拟钱包余额: ￥${store.user.cnyBalance} 元\n请先前往个人中心充值人民币。`)
        return
      }

      const confirmMsg = `确定购买作品《${work.workName}》的商用使用授权吗？\n\n💰 价格：￥${work.price} CNY (≈ ${ethPrice.toFixed(3)} ETH)\n\n💡 提示：本交易将生成唯一的以太坊版权转移智能合约记录。`
      if (!confirm(confirmMsg)) return

      buyingId.value = work.id
      try {
        let txHash = ''
        
        // 1. 如果连接了真实 Ganache，在链上支付 ETH
        if (store.ganacheConnected) {
          const web3 = store.web3
          const contract = store.contract
          const buyerAddr = store.user.walletAddress
          const priceInWei = web3.utils.toWei(ethPrice.toFixed(6), 'ether')
          
          try {
            console.log(`正在调起智能合约购买，买家: ${buyerAddr}, 证书ID: ${work.certId}`)
            const result = await contract.methods.purchase(work.certId).send({
              from: buyerAddr,
              value: priceInWei,
              gas: 6721975
            })
            txHash = result.transactionHash
            console.log(`智能合约购买成功，交易哈希: ${txHash}`)
          } catch (blockchainErr) {
            console.error('智能合约执行失败，降级模拟支付:', blockchainErr.message)
            alert('链上合约支付失败，系统将尝试降级本地模拟模式完成结算。' + blockchainErr.message)
            txHash = '0x_mock_purchase_' + Date.now() + Math.random().toString(16).substring(2, 6)
          }
        } else {
          // 未连接 Ganache，使用降级模拟交易哈希
          txHash = '0x_mock_purchase_' + Date.now() + Math.random().toString(16).substring(2, 6)
        }

        // 2. 将交易哈希同步给 Go 后端，后端执行最终人民币扣除、出库和写盘
        const res = await fetch(`/api/works/${work.id}/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Account': store.user.account
          },
          body: JSON.stringify({
            txHash: txHash,
            price: work.price.toString()
          })
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '版权交易结算失败')
          return
        }

        // 更新本地 user 余额
        const profileRes = await fetch('/api/user/profile', {
          headers: { 'X-User-Account': store.user.account }
        })
        if (profileRes.ok) {
          const updatedUser = await profileRes.json()
          store.setUser(updatedUser)
        }

        alert(`恭喜您！作品《${work.workName}》商用使用授权购买成功！\n\n交易哈希：${txHash}\n已经从您的模拟余额扣减 ￥${work.price} 元。您可以前往个人中心查看已购作品凭证。`)
        
        // 重新拉取
        loadWorks()
      } catch (err) {
        alert('购买结算发生异常: ' + err.message)
      } finally {
        buyingId.value = null
      }
    }

    const previewImage = (idx) => {
      const list = filteredWorks.value.map(w => ({
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
      store,
      filter,
      filteredWorks,
      buyingId,
      formatAddress,
      handlePurchase,
      previewImage
    }
  }
}
</script>
