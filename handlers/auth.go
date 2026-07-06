package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"photo-backend/models"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// Auth 模块负责处理用户账号相关的接口。
// 1. 注册 (Register)：校验账号是否重复，给新用户分配随机钱包地址、初始余额（0.005 ETH，1000 元 CNY）以模仿原本 jQuery 的业务逻辑。
// 2. 登录 (Login)：校验用户名、密码及角色一致性。同时校验账号是否被管理员禁用。
// 3. 个人资料维护 (Profile)：支持更新电话、简介；支持修改密码。
// 4. 钱包资金流转 (Balance)：存入、取出 CNY/ETH 并模拟钱包余额变动。
// 5. 管理员用户管理 (Admin Users)：提供获取所有用户和禁用/启用用户的接口。
// 6. 鉴权：采用简单的 "X-User-Account" 请求头方式传递已登录的账号，这在本地单机开发场景中最稳定、高效。

func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	account := c.GetHeader("X-User-Account")
	if account == "" {
		return nil, false
	}
	s := store.GetStore()
	s.SaveUsers() // 保证加载最新数据
	user, exists := s.Users[account]
	return &user, exists
}

// Register 处理注册
func Register(c *gin.Context) {
	var req struct {
		Account  string `json:"account" binding:"required"`
		Password string `json:"password" binding:"required"`
		NickName string `json:"nickName" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	s.SaveUsers()

	if _, exists := s.Users[req.Account]; exists {
		c.JSON(http.StatusConflict, gin.H{"error": "该账号已被注册"})
		return
	}

	// 模拟生成以太坊地址和私钥
	walletAddress := "0x"
	chars := "0123456789abcdef"
	for i := 0; i < 40; i++ {
		walletAddress += string(chars[time.Now().UnixNano()%16])
	}
	walletPrivateKey := "0x"
	for i := 0; i < 64; i++ {
		walletPrivateKey += string(chars[time.Now().UnixNano()%16])
	}

	newUser := models.User{
		Account:          req.Account,
		Password:         req.Password,
		NickName:         req.NickName,
		Role:             req.Role,
		Phone:            "",
		Bio:              "",
		WalletAddress:    walletAddress,
		WalletPrivateKey: walletPrivateKey,
		EthBalance:       0.005, // 默认赠送初始值，匹配原 jQuery 逻辑
		CnyBalance:       1000.0,
		RegisterTime:     time.Now().Format("2006-01-02 15:04:05"),
		Status:           "normal",
	}

	s.Users[req.Account] = newUser
	s.SaveUsers()

	c.JSON(http.StatusOK, gin.H{
		"message": "注册成功",
		"user":    newUser,
	})
}

// Login 处理登录
func Login(c *gin.Context) {
	var req struct {
		Account  string `json:"account" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	user, exists := s.Users[req.Account]
	if !exists || user.Password != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "账号或密码错误"})
		return
	}

	if user.Role != req.Role {
		c.JSON(http.StatusForbidden, gin.H{"error": "登录角色与注册角色不匹配"})
		return
	}

	if user.Status == "disabled" {
		c.JSON(http.StatusForbidden, gin.H{"error": "该账号已被禁用，请联系管理员！"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "登录成功",
		"user":    user,
	})
}

// GetProfile 获取个人资料
func GetProfile(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateProfile 更新资料
func UpdateProfile(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var req struct {
		NickName string `json:"nickName"`
		Phone    string `json:"phone"`
		Bio      string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	u := s.Users[user.Account]
	if req.NickName != "" {
		u.NickName = req.NickName
	}
	u.Phone = req.Phone
	u.Bio = req.Bio

	s.Users[user.Account] = u
	s.SaveUsers()

	c.JSON(http.StatusOK, gin.H{
		"message": "保存成功",
		"user":    u,
	})
}

// UpdatePassword 修改密码
func UpdatePassword(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var req struct {
		OldPassword string `json:"oldPassword" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	u := s.Users[user.Account]
	if u.Password != req.OldPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "原密码不正确"})
		return
	}

	u.Password = req.NewPassword
	s.Users[user.Account] = u
	s.SaveUsers()

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}

// UpdateBalance 充值或提现
func UpdateBalance(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var req struct {
		Currency string  `json:"currency" binding:"required"` // "cny" 或 "eth"
		Action   string  `json:"action" binding:"required"`   // "deposit" (充值) 或 "withdraw" (取现)
		Amount   float64 `json:"amount" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的金额参数"})
		return
	}

	s := store.GetStore()
	u := s.Users[user.Account]

	if req.Currency == "cny" {
		if req.Action == "deposit" {
			u.CnyBalance += req.Amount
		} else if req.Action == "withdraw" {
			if u.CnyBalance < req.Amount {
				c.JSON(http.StatusBadRequest, gin.H{"error": "余额不足"})
				return
			}
			u.CnyBalance -= req.Amount
		}
	} else if req.Currency == "eth" {
		if req.Action == "deposit" {
			u.EthBalance += req.Amount
		} else if req.Action == "withdraw" {
			if u.EthBalance < req.Amount {
				c.JSON(http.StatusBadRequest, gin.H{"error": "余额不足"})
				return
			}
			u.EthBalance -= req.Amount
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的货币类型"})
		return
	}

	s.Users[user.Account] = u
	s.SaveUsers()

	c.JSON(http.StatusOK, gin.H{
		"message": "操作成功",
		"user":    u,
	})
}

// AdminGetUsers 管理员获取所有用户
func AdminGetUsers(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权访问，仅限管理员"})
		return
	}

	s := store.GetStore()
	usersList := make([]models.User, 0, len(s.Users))
	for _, u := range s.Users {
		usersList = append(usersList, u)
	}

	c.JSON(http.StatusOK, usersList)
}

// AdminToggleUserStatus 禁用/启用账号
func AdminToggleUserStatus(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权访问"})
		return
	}

	targetAccount := c.Param("account")
	s := store.GetStore()
	targetUser, exists := s.Users[targetAccount]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
		return
	}

	if targetUser.Role == "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法禁用管理员账户"})
		return
	}

	if targetUser.Status == "normal" {
		targetUser.Status = "disabled"
	} else {
		targetUser.Status = "normal"
	}

	s.Users[targetAccount] = targetUser
	s.SaveUsers()

	c.JSON(http.StatusOK, gin.H{
		"message": "操作成功",
		"user":    targetUser,
	})
}

// 辅助格式化函数
func fmtAddress() string {
	return ""
}
