<template>
  <div class="container main-content" style="max-width: 500px; margin-top: 40px; margin-bottom: 80px;">
    <div class="panel panel-default">
      <div class="panel-heading text-center" style="font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; color: white;">
        ✨ 用户注册
      </div>
      <div class="panel-body">
        <form @submit.prevent="handleRegister">
          <!-- 角色选择 Tab -->
          <div class="form-group">
            <label>请选择注册角色 <span class="text-danger">*</span></label>
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
            </div>
            <p class="help-block" style="font-size: 12px; margin-top: 5px;">
              💡 提示：普通用户可以欣赏作品、投票和购买版权；摄影师拥有额外投稿参赛作品的权限。
            </p>
          </div>

          <!-- 账号 -->
          <div class="form-group">
            <label for="account">账号 <span class="text-danger">*</span></label>
            <input 
              type="text" 
              class="form-control" 
              id="account" 
              v-model="account" 
              @blur="validateAccount"
              placeholder="至少3个字符，作为登录凭证" 
              required
            />
            <span class="text-danger" style="font-size: 12px;">{{ accountError }}</span>
          </div>

          <!-- 昵称 -->
          <div class="form-group">
            <label for="nick">昵称 <span class="text-danger">*</span></label>
            <input 
              type="text" 
              class="form-control" 
              id="nick" 
              v-model="nick" 
              @blur="validateNick"
              placeholder="请输入您的公开展示昵称" 
              required
            />
            <span class="text-danger" style="font-size: 12px;">{{ nickError }}</span>
          </div>

          <!-- 密码 -->
          <div class="form-group">
            <label for="pwd">密码 <span class="text-danger">*</span></label>
            <input 
              type="password" 
              class="form-control" 
              id="pwd" 
              v-model="password" 
              @blur="validatePassword"
              placeholder="至少6个字符" 
              required
            />
            <span class="text-danger" style="font-size: 12px;">{{ passwordError }}</span>
          </div>

          <!-- 确认密码 -->
          <div class="form-group">
            <label for="confirmPwd">确认密码 <span class="text-danger">*</span></label>
            <input 
              type="password" 
              class="form-control" 
              id="confirmPwd" 
              v-model="confirmPwd" 
              @input="validateConfirmPassword"
              placeholder="请再次输入密码" 
              required
            />
            <span class="text-danger" style="font-size: 12px;">{{ confirmPwdError }}</span>
          </div>

          <!-- 跳转登录 -->
          <div class="form-group text-right">
            <router-link to="/login">已有账号？去登录 →</router-link>
          </div>

          <!-- 提交按钮 -->
          <button type="submit" class="btn btn-success btn-block" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 10px; font-size: 16px;">
            立即注册
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Register',
  setup() {
    const router = useRouter()
    const role = ref('user')
    const account = ref('')
    const nick = ref('')
    const password = ref('')
    const confirmPwd = ref('')

    // 错误信息提示
    const accountError = ref('')
    const nickError = ref('')
    const passwordError = ref('')
    const confirmPwdError = ref('')

    // 思考过程 (Chinese Thinking Process):
    // 1. 注册界面在用户输入时进行表单验证 (account, nickname, password, confirmPassword)。
    // 2. 验证规则与原有 jQuery (user.js) 的校验逻辑保持一致，验证提示直接展示在对应输入框下方。
    // 3. 点击提交时，向 Go 后端发送 `/api/register` 请求。
    // 4. 注册成功后，Go 后端会为用户自动在模拟钱包模块生成一个以太坊地址和私钥，并赋予初始 CNY/ETH 模拟余额。

    const validateAccount = () => {
      const val = account.value.trim()
      if (!val) {
        accountError.value = '账号不能为空'
        return false
      }
      if (val.length < 3) {
        accountError.value = '账号至少需要3个字符'
        return false
      }
      accountError.value = ''
      return true
    }

    const validateNick = () => {
      const val = nick.value.trim()
      if (!val) {
        nickError.value = '昵称不能为空'
        return false
      }
      if (val.length < 2) {
        nickError.value = '昵称至少需要2个字符'
        return false
      }
      nickError.value = ''
      return true
    }

    const validatePassword = () => {
      const val = password.value.trim()
      if (!val) {
        passwordError.value = '密码不能为空'
        return false
      }
      if (val.length < 6) {
        passwordError.value = '密码至少需要6位'
        return false
      }
      passwordError.value = ''
      return true
    }

    const validateConfirmPassword = () => {
      const val = confirmPwd.value.trim()
      if (!val) {
        confirmPwdError.value = '请输入确认密码'
        return false
      }
      if (val !== password.value.trim()) {
        confirmPwdError.value = '两次密码不一致'
        return false
      }
      confirmPwdError.value = ''
      return true
    }

    const handleRegister = async () => {
      const accValid = validateAccount()
      const nickValid = validateNick()
      const pwdValid = validatePassword()
      const confValid = validateConfirmPassword()

      if (!accValid || !nickValid || !pwdValid || !confValid) {
        return
      }

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            account: account.value.trim(),
            password: password.value.trim(),
            nickName: nick.value.trim(),
            role: role.value
          })
        })

        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '注册失败')
          return
        }

        const roleText = role.value === 'photographer' ? '摄影师' : '普通投票用户'
        alert(`注册成功！\n\n您已注册为${roleText}。\n\n💡 提示：进入个人中心后系统将自动生成您的专属ETH钱包地址，版权交易自动结算。`)
        
        router.push('/login')
      } catch (err) {
        alert('注册发生异常: ' + err.message)
      }
    }

    return {
      role,
      account,
      nick,
      password,
      confirmPwd,
      accountError,
      nickError,
      passwordError,
      confirmPwdError,
      validateAccount,
      validateNick,
      validatePassword,
      validateConfirmPassword,
      handleRegister
    }
  }
}
</script>
