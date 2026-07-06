package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"photo-backend/models"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// Feedback 意见反馈模块。
// 1. 获取反馈列表 (ListFeedback)：如果是管理员，则获取所有意见反馈列表；如果是普通用户/摄影师，则仅获取该账号本人提交的反馈记录。
// 2. 提交反馈 (CreateFeedback)：用户录入标题、反馈类型、内容和联系方式。默认处理状态为 pending。
// 3. 回复/处理反馈 (ReplyFeedback)：仅管理员可用。对用户的意见录入答复，并更新状态为 processed。

// ListFeedback 获取反馈记录
func ListFeedback(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	s := store.GetStore()
	s.SaveFeedback()

	filtered := make([]models.Feedback, 0)
	for _, f := range s.Feedbacks {
		// 管理员可查看全部，用户只能查看自己的
		if user.Role == "admin" || f.UserID == user.Account {
			filtered = append(filtered, f)
		}
	}

	c.JSON(http.StatusOK, filtered)
}

// CreateFeedback 提交反馈
func CreateFeedback(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	// 反馈允许游客提交，但若登录则记录UserID和UserNick
	var uAccount = ""
	var uNick = "游客"
	if exists {
		uAccount = user.Account
		uNick = user.NickName
	}

	var req struct {
		Title   string `json:"title" binding:"required"`
		Type    string `json:"type" binding:"required"` // tournament, certify, market, bug, other
		Content string `json:"content" binding:"required"`
		Contact string `json:"contact"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()

	newFeedback := models.Feedback{
		ID:         time.Now().UnixNano() / 1e6,
		UserID:     uAccount,
		UserNick:   uNick,
		Title:      req.Title,
		Type:       req.Type,
		Content:    req.Content,
		Contact:    req.Contact,
		Status:     "pending",
		Reply:      "",
		CreateTime: time.Now().Format("2006-01-02 15:04:05"),
	}

	s.Feedbacks = append(s.Feedbacks, newFeedback)
	s.SaveFeedback()

	c.JSON(http.StatusOK, gin.H{
		"message":  "反馈提交成功！感谢您的意见与建议！",
		"feedback": newFeedback,
	})
}

// ReplyFeedback 处理/回复反馈 (管理员)
func ReplyFeedback(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作，仅限管理员"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的反馈ID"})
		return
	}

	var req struct {
		Reply string `json:"reply" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "回复内容不能为空"})
		return
	}

	s := store.GetStore()
	idx := -1
	for i, f := range s.Feedbacks {
		if f.ID == id {
			idx = i
			break
		}
	}

	if idx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "意见反馈记录不存在"})
		return
	}

	s.Feedbacks[idx].Reply = req.Reply
	s.Feedbacks[idx].Status = "processed"
	s.SaveFeedback()

	c.JSON(http.StatusOK, gin.H{
		"message":  "已成功回复用户反馈",
		"feedback": s.Feedbacks[idx],
	})
}
