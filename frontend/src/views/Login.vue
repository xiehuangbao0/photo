<template>
  <div class="container main-content" style="max-width: 450px; margin-top: 50px; margin-bottom: 80px;">
    <div class="panel panel-default">
      <div class="panel-heading text-center" style="font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important; color: white;">
        ✨ 用户登录
      </div>
      <div class="panel-body">
        <form @submit.prevent="handleLogin">
          <!-- 角色选择 Tab -->
          <div class="form-group">
            <label>请选择登录角色</label>
            <div class="role-tabs">
              <div 
                class="role-tab" 
                :class="{ active: role === 'user' }" 
                @click="role = 'user'"
              >
                普通投票用户
              </div>
              <div 
                class="role-tab" 
                :class="{ active: role === 'photographer' }" 
                @click="role = 'photographer'"
              >
                摄影师
              </div>
              <div 
                class="role-tab" 
                :class="{ active: role === 'admin' }" 
                @click="role = 'admin'"
              >
                管理员
              </div>
            </div>
          </div>

          <!-- 账号 -->
          <div class="form-group">
            <label for="account">账号</label>
            <input 
              type="text" 
              class="form-control" 
              id="account" 
              v-model="account" 
              placeholder="请输入用户名" 
              required
            />
          </div>

          <!-- 密码 -->
          <div class="form-group">
            <label for="pwd">密码</label>
            <input 
              type="password" 
              class="form-control" 
              id="pwd" 
              v-model="password" 
              placeholder="请输入密码" 
              required
            />
          </div>

          <!-- 提示与跳转 -->
          <div class="form-group text-right">
            <router-link to="/register">还没有账号？立即注册 →</router-link>
          </div>

          <!-- 提交 -->
          <button type="submit" class="btn btn-primary btn-block" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none; padding: 10px; font-size: 16px;">
            立即登录
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store/user'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const role = ref('user')
    const account = ref('')
    const password = ref('')

    // 思考过程 (Chinese Thinking Process):
    // 1. 登录界面通过 Vue 数据绑定 (v-model) 彻底替代了 jQuery 复杂的表单选择操作。
    // 2. 将选中的角色 role、账户名 account、密码 password 作为 JSON 请求体，异步调用后端 Go 的 `/api/login` 接口。
    // 3. 登录成功后，调用全局 store.setUser() 缓存会话，激活链上钱包并重定向至个人中心或后台页面。

    const handleLogin = async () => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            account: account.value.trim(),
            password: password.value.trim(),
            role: role.value
          })
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '登录失败')
          return
        }

        // 成功登录，设置 Store 状态
        store.setUser(data.user)
        
        // 尝试激活以太坊 Web3
        await store.initWeb3()

        const roleNames = {
          admin: '管理员',
          photographer: '摄影师',
          user: '普通投票用户'
        }
        
        alert(`登录成功！欢迎回来，${data.user.nickName}（${roleNames[role.value]}）`)

        // 页面跳转
        if (role.value === 'admin') {
          router.push('/admin')
        } else {
          router.push('/')
        }
      } catch (err) {
        alert('登录发生异常: ' + err.message)
      }
    }

    onMounted(() => {
      // 若已登录，直接跳转首页
      if (store.user) {
        router.push('/')
      }
    })

    return {
      role,
      account,
      password,
      handleLogin
    }
  }
}
</script>
