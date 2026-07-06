package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"photo-backend/store"
)

// 思考过程 (Chinese Thinking Process):
// Blockchain 模块支持降级模式下的“本地模拟链数据读取”。
// 1. 获取统计信息 (GetBlockchainStats)：计算块高、总交易数、认证证书数、以及待处理投稿数，完美适配前端 `blockchain.html` 仪表盘展示。
// 2. 获取区块列表 (GetBlocks)：支持按分页或最近区块（如最近50个）拉取区块明细。
// 3. 获取交易列表 (GetTransactions)：收集并按倒序返回所有区块中的交易历史。

// GetBlockchainStats 模拟链上状态统计
func GetBlockchainStats(c *gin.Context) {
	s := store.GetStore()
	s.SaveBlockchain()

	blockCount := len(s.Chain)
	
	// 计算总交易数与认证上链作品数
	var txCount int
	var certCount int
	for _, block := range s.Chain {
		txCount += len(block.Transactions)
		for _, tx := range block.Transactions {
			if tx.Type == "certify" {
				certCount++
			}
		}
	}

	// 统计待审核投稿数
	var pendingCount int
	for _, w := range s.Works {
		if w.Status == "pending" {
			pendingCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"blockCount":   blockCount,
		"validCount":   certCount,
		"txCount":      txCount,
		"pendingCount": pendingCount,
	})
}

// GetBlocks 获取区块列表
func GetBlocks(c *gin.Context) {
	s := store.GetStore()
	s.SaveBlockchain()

	// 倒序返回区块列表
	reversed := make([]interface{}, len(s.Chain))
	for i := len(s.Chain) - 1; i >= 0; i-- {
		reversed[len(s.Chain)-1-i] = s.Chain[i]
	}

	c.JSON(http.StatusOK, reversed)
}

// GetTransactions 获取所有链上交易记录
func GetTransactions(c *gin.Context) {
	s := store.GetStore()
	s.SaveBlockchain()

	type TxResponse struct {
		Hash        string      `json:"hash"`
		Sender      string      `json:"sender"`
		Recipient   string      `json:"recipient"`
		Type        string      `json:"type"`
		Value       string      `json:"value"`
		Timestamp   int64       `json:"timestamp"`
		BlockNumber int         `json:"blockNumber"`
		Data        interface{} `json:"data"`
	}

	allTxs := make([]TxResponse, 0)
	for _, block := range s.Chain {
		for _, tx := range block.Transactions {
			allTxs = append(allTxs, TxResponse{
				Hash:        tx.Hash,
				Sender:      tx.Sender,
				Recipient:   tx.Recipient,
				Type:        tx.Type,
				Value:       tx.Value,
				Timestamp:   tx.Timestamp,
				BlockNumber: block.Index,
				Data:        tx.Data,
			})
		}
	}

	// 倒序排序交易 (最新的在前面)
	for i, j := 0, len(allTxs)-1; i < j; i, j = i+1, j-1 {
		allTxs[i], allTxs[j] = allTxs[j], allTxs[i]
	}

	c.JSON(http.StatusOK, allTxs)
}
