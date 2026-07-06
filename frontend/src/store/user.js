import { reactive } from 'vue'

// 思考过程 (Chinese Thinking Process):
// 这里实现了一个极简而强大的响应式全局状态管理，使用 Vue 3 的 reactive API，避免了引入额外的 Pinia，
// 这样在本地单机或复杂离线部署时，代码更容易维护。
// 该 Store 主要管理：
// 1. 用户会话状态：获取当前登录用户、缓存并持久化至 localStorage。
// 2. Web3 及 Ganache 区块链连接：封装原 jQuery 项目在 `web3-connector.js` 中的底层 Web3 调用。
//    包含对 Ganache 节点 (http://127.0.0.1:7545) 的连接、获取账户、合约实例化、
//    以及在链上未注册时自动发起链上注册的功能。

const LOGIN_USER_KEY = 'photography_login_user'

export const store = reactive({
  user: JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || 'null'),
  web3: null,
  contract: null,
  ganacheConnected: false,
  accounts: [],
  contractAddress: '0xDE4622eD33DC1BE87f62A21821043C34eB6B7988',

  setUser(userData) {
    this.user = userData
    if (userData) {
      localStorage.setItem(LOGIN_USER_KEY, JSON.stringify(userData))
    } else {
      localStorage.removeItem(LOGIN_USER_KEY)
    }
  },

  logout() {
    this.setUser(null)
    window.location.hash = '#/login' // 跳转到登录页面
  },

  // 初始化 Web3 与智能合约，无缝同步链上与后端用户数据
  async initWeb3() {
    try {
      // 引入原本静态页面中 web3.min.js 定义的 Web3 构造函数（通过 index.html 中引入的 CDN/静态资源）
      if (typeof window.Web3 === 'undefined') {
        console.warn('⚠️ window.Web3 未加载')
        this.ganacheConnected = false
        return false
      }

      const Web3 = window.Web3
      this.web3 = new Web3('http://127.0.0.1:7545')
      
      // 测试连接
      const blockNumber = await this.web3.eth.getBlockNumber()
      console.log('✅ Web3连接成功，当前区块:', blockNumber)
      
      this.accounts = await this.web3.eth.getAccounts()
      console.log('Ganache账户列表:', this.accounts)
      this.ganacheConnected = true

      // 初始化合约
      await this.initContract()
      
      // 自动绑定并激活链上用户钱包
      if (this.user) {
        await this.syncUserWalletOnChain()
      }
      
      return true
    } catch (error) {
      console.warn('❌ Web3/Ganache 初始化失败，降级为本地模拟区块链模式:', error.message)
      this.ganacheConnected = false
      return false
    }
  },

  async initContract() {
    try {
      const response = await fetch('/build/contracts/PhotoCertification.json?' + Date.now())
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const json = await response.json()
      
      // 思考过程 (Chinese Thinking Process):
      // 1. 在初始化合约时，优先通过 Web3 查询当前的以太坊网络 ID (Network ID)。
      // 2. 查阅 json.networks 结构，动态获取 Truffle 实际部署的合约地址。
      // 3. 如果找不到，则回退为默认的硬编码 CONTRACT_ADDRESS (0xDE4622eD33DC1BE87f62A21821043C34eB6B7988)，确保极佳的向下兼容性。
      let address = this.contractAddress
      if (json.networks) {
        try {
          const networkId = await this.web3.eth.net.getId()
          if (json.networks[networkId] && json.networks[networkId].address) {
            address = json.networks[networkId].address
            this.contractAddress = address
            console.log(`📡 动态连接到合约部署地址: ${address} (网络ID: ${networkId})`)
          }
        } catch (netErr) {
          console.warn('获取以太坊网络ID失败，将使用预设硬编码合约地址:', netErr.message)
        }
      }

      this.contract = new this.web3.eth.Contract(json.abi, address)
      console.log('✅ 智能合约初始化成功')
    } catch (e) {
      console.error('❌ 智能合约初始化失败:', e.message)
      throw e
    }
  },

  // 绑定 Ganache 账户并自动在链上注册
  async syncUserWalletOnChain() {
    if (!this.ganacheConnected || !this.user) return

    try {
      // 原 `user.js` 中账户地址映射的哈希散列算法
      const accountIndexMap = {
        'admin': 0,
        'admin1': 1,
        '111': 2,
        '222': 3,
        '333': 4,
        '444': 5,
        '555': 6
      }
      
      let accountIndex
      const account = this.user.account
      if (accountIndexMap[account] !== undefined) {
        accountIndex = accountIndexMap[account]
      } else {
        let hash = 0
        for (let i = 0; i < account.length; i++) {
          hash = account.charCodeAt(i) + ((hash << 5) - hash)
        }
        accountIndex = Math.abs(hash) % this.accounts.length
        if (accountIndex === 0 && this.accounts.length > 1) {
          accountIndex = 1 // 避免与默认管理员地址 0 冲突
        }
      }

      const ganacheAddress = this.accounts[accountIndex]
      if (ganacheAddress) {
        // 更新内存及后端余额
        this.user.walletAddress = ganacheAddress
        
        // 查询链上是否已注册，若未注册，自动发送注册交易
        try {
          const chainUser = await this.contract.methods.getUser(ganacheAddress).call()
          if (!chainUser.registered) {
            console.log(`正在为账户 ${account} 自动注册上链: ${ganacheAddress}`)
            await this.contract.methods.register(account, this.user.nickName || account).send({
              from: ganacheAddress,
              gas: 6721975
            })
            console.log(`✅ 自动上链注册成功`)
          }
        } catch (e) {
          console.warn('智能合约读取或注册报错:', e.message)
        }

        // 读取链上真实的 ETH 余额
        const ethWei = await this.web3.eth.getBalance(ganacheAddress)
        this.user.ethBalance = parseFloat(this.web3.utils.fromWei(ethWei, 'ether'))
        
        // 更新后端保存的数据
        const headers = { 'X-User-Account': this.user.account, 'Content-Type': 'application/json' }
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ nickName: this.user.nickName })
        })
        
        // 同步更新 local
        this.setUser(this.user)
      }
    } catch (err) {
      console.warn('同步链上钱包信息发生错误:', err.message)
    }
  },

  // 共享大图浏览状态
  lightbox: {
    visible: false,
    images: [], // 结构：[{ src: '', title: '', author: '' }]
    index: 0,
    show(images, index) {
      this.images = images
      this.index = index
      this.visible = true
    },
    hide() {
      this.visible = false
    }
  }
})
