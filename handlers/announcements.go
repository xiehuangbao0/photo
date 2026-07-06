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
// Announcements 模块管理系统公告发布。
// 1. 获取公告列表 (ListAnnouncements)：供前端首页顶部滚动通知横幅调用。
// 2. 发布公告 (CreateAnnouncement)：限管理员发布。发布后自动更新数据库，支持撤销删除公告。

// ListAnnouncements 获取所有公告
func ListAnnouncements(c *gin.Context) {
	s := store.GetStore()
	s.SaveAnnouncements()
	c.JSON(http.StatusOK, s.Announcements)
}

// CreateAnnouncement 发布新公告 (管理员)
func CreateAnnouncement(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作，仅限管理员"})
		return
	}

	var req struct {
		Title   string `json:"title" binding:"required"`
		Type    string `json:"type" binding:"required"` // winner, tournament, system, feature
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
		return
	}

	s := store.GetStore()
	newID := 1
	if len(s.Announcements) > 0 {
		newID = s.Announcements[len(s.Announcements)-1].ID + 1
	}

	newAnn := models.Announcement{
		ID:      newID,
		Title:   req.Title,
		Time:    time.Now().Format("2006-01-02"),
		Type:    req.Type,
		Content: req.Content,
	}

	s.Announcements = append(s.Announcements, newAnn)
	s.SaveAnnouncements()

	c.JSON(http.StatusOK, gin.H{
		"message":      "公告发布成功",
		"announcement": newAnn,
	})
}

// DeleteAnnouncement 删除公告
func DeleteAnnouncement(c *gin.Context) {
	user, exists := GetCurrentUser(c)
	if !exists || user.Role != "admin" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无权操作"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的公告ID"})
		return
	}

	s := store.GetStore()
	idx := -1
	for i, a := range s.Announcements {
		if a.ID == id {
			idx = i
			break
		}
	}

	if idx == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "公告不存在"})
		return
	}

	s.Announcements = append(s.Announcements[:idx], s.Announcements[idx+1:]...)
	s.SaveAnnouncements()

	c.JSON(http.StatusOK, gin.H{"message": "公告删除成功"})
}
