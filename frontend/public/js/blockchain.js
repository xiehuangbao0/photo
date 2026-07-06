var USER_STORAGE_KEY = 'photography_user';

class UserBlockchain {
    constructor(account) {
        this.account = account;
        this.chain = [];
        this.pendingTransactions = [];
        this.difficulty = 4;
        this.initGenesisBlock();
        this.loadFromStorage();
    }

    initGenesisBlock() {
        if (this.chain.length === 0) {
            const genesisBlock = {
                index: 0,
                timestamp: new Date('2026-01-01').getTime(),
                transactions: [],
                nonce: 0,
                hash: '0000000000000000000000000000000000000000000000000000000000000000',
                previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
                merkleRoot: '0000000000000000000000000000000000000000000000000000000000000000'
            };
            this.chain.push(genesisBlock);
        }
    }

    generateHash(data) {
        const json = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            hash = ((hash << 5) - hash) + json.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    calculateMerkleRoot(transactions) {
        if (transactions.length === 0) return '0000000000000000000000000000000000000000000000000000000000000000';
        let hashes = transactions.map(t => this.generateHash(t));
        while (hashes.length > 1) {
            const newHashes = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const hash1 = hashes[i];
                const hash2 = hashes[i + 1] || hashes[i];
                newHashes.push(this.generateHash(hash1 + hash2));
            }
            hashes = newHashes;
        }
        return hashes[0];
    }



    addTransaction(sender, recipient, type, data) {
        const transaction = {
            hash: this.generateHash({ sender, recipient, type, data, timestamp: Date.now() }),
            sender,
            recipient,
            type,
            data,
            timestamp: Date.now()
        };
        this.pendingTransactions.push(transaction);
        this.saveToStorage();
        return transaction;
    }

    getBlockByHeight(height) {
        return this.chain.find(b => b.index === height);
    }

    getBlockByHash(hash) {
        return this.chain.find(b => b.hash === hash);
    }

    getTransactionsByAddress(address) {
        const allTransactions = [];
        this.chain.forEach(block => {
            block.transactions.forEach(tx => {
                if (tx.sender === address || tx.recipient === address) {
                    allTransactions.push({ ...tx, blockHeight: block.index });
                }
            });
        });
        return allTransactions;
    }

    saveToStorage() {
        localStorage.setItem(`photography_blockchain_${this.account}`, JSON.stringify({
            chain: this.chain,
            pendingTransactions: this.pendingTransactions
        }));
    }

    loadFromStorage() {
        const data = localStorage.getItem(`photography_blockchain_${this.account}`);
        if (data) {
            const parsed = JSON.parse(data);
            this.chain = parsed.chain || this.chain;
            this.pendingTransactions = parsed.pendingTransactions || [];
        }

        // 自动同步：如果作品列表中存在已上链作品但本地链中没有该交易，则自动为其补齐区块
        if (typeof photographyWorkList !== 'undefined' && Array.isArray(photographyWorkList)) {
            let chainUpdated = false;
            photographyWorkList.forEach(work => {
                if (work.onChain && work.txHash) {
                    let txExists = false;
                    for (const block of this.chain) {
                        if (block.transactions && block.transactions.some(tx => tx.hash === work.txHash)) {
                            txExists = true;
                            break;
                        }
                    }
                    
                    if (!txExists) {
                        const mockBlockNumber = this.chain.length;
                        const tx = {
                            sender: work.walletAddress || "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
                            recipient: "0x0000000000000000000000000000000000000000",
                            type: "certify",
                            data: {
                                workName: work.workName,
                                hash: work.hash || `0x${Math.random().toString(16).substring(2, 34)}`,
                                category: work.category,
                                author: work.walletAddress
                            },
                            timestamp: work.chainTime ? new Date(work.chainTime).getTime() : Date.now(),
                            hash: work.txHash
                        };
                        
                        const newBlock = {
                            index: mockBlockNumber,
                            timestamp: tx.timestamp,
                            transactions: [tx],
                            nonce: Math.floor(Math.random() * 100000),
                            previousHash: this.chain[this.chain.length - 1] ? this.chain[this.chain.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000',
                            merkleRoot: this.calculateMerkleRoot([tx])
                        };
                        newBlock.hash = this.generateHash(newBlock);
                        
                        this.chain.push(newBlock);
                        work.blockHeight = mockBlockNumber;
                        chainUpdated = true;
                    }
                }
            });
            
            if (chainUpdated) {
                this.saveToStorage();
                localStorage.setItem('photographyWorks', JSON.stringify(photographyWorkList));
            }
        }
    }

    getStats() {
        let validCount = 0;
        let txCount = 0;
        
        this.chain.forEach(block => {
            txCount += block.transactions.length;
            block.transactions.forEach(tx => {
                if (tx.type === 'certify') validCount++;
            });
        });

        return {
            account: this.account,
            blockCount: this.chain.length,
            validCount,
            pendingCount: this.pendingTransactions.filter(t => t.type === 'certify').length,
            txCount
        };
    }

    isValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            if (currentBlock.previousHash !== previousBlock.hash) return false;
            
            const hash = this.generateHash({
                index: currentBlock.index,
                timestamp: currentBlock.timestamp,
                transactions: currentBlock.transactions,
                nonce: currentBlock.nonce,
                previousHash: currentBlock.previousHash,
                merkleRoot: currentBlock.merkleRoot
            });
            
            if (currentBlock.hash !== hash) return false;
            
            if (!hash.startsWith('0'.repeat(this.difficulty))) return false;
        }
        return true;
    }
}

function getUserBlockchain(account) {
    return new UserBlockchain(account);
}

function getAllBlockchains() {
    const chains = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('photography_blockchain_')) {
            const account = key.replace('photography_blockchain_', '');
            chains.push(getUserBlockchain(account));
        }
    }
    return chains;
}

function generateWalletAddress() {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
        address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
}

async function certifyWork(workId) {
    const work = photographyWorkList.find(w => w.id == workId);
    if (!work) return { success: false, message: '作品不存在' };
    if (work.onChain) return { success: false, message: '作品已上链' };
    
    const user = getLoginUser();
    if (!user) return { success: false, message: '请先登录' };
    
    try {
        let fromAddress = user.walletAddress;
        let result;
        let contentHash = work.hash || `0x${Math.random().toString(16).substring(2, 34)}`;
        let authorAddress = work.walletAddress || fromAddress;
        let isSimulation = false;
        
        try {
            if (!web3) await initWeb3();
            if (!photoCertContract) await initContract();
            fromAddress = fromAddress || (await getBlockchainAccounts())[0];
            authorAddress = work.walletAddress || fromAddress;
            
            // 自动在链上注册当前用户（特别是管理员权限激活）
            if (user && user.role === 'admin') {
                try {
                    const existingUser = await photoCertContract.methods.getUser(fromAddress).call();
                    if (!existingUser.registered) {
                        console.log(`检测到管理员在链上未注册，正在自动注册: ${user.account}`);
                        await registerOnChain(user.account, user.nickName, fromAddress);
                    }
                } catch (regError) {
                    console.error('智能合约自动注册管理员失败:', regError);
                }
            }
            
            console.log(`作品上链使用钱包地址: ${fromAddress}`);
            result = await certifyOnChain(work.workName, contentHash, work.category, fromAddress, authorAddress);
        } catch (blockchainError) {
            console.warn('无法连接区块链或上链出错，自动启用本地模拟上链模式:', blockchainError);
            isSimulation = true;
            
            fromAddress = fromAddress || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
            authorAddress = work.walletAddress || fromAddress;
            
            const localChain = getUserBlockchain(user.account || 'admin');
            const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
            const mockBlockNumber = localChain.chain.length;
            
            const tx = {
                sender: fromAddress,
                recipient: "0x0000000000000000000000000000000000000000",
                type: "certify",
                data: {
                    workName: work.workName,
                    hash: contentHash,
                    category: work.category,
                    author: authorAddress
                },
                timestamp: Date.now(),
                hash: mockTxHash
            };
            
            const newBlock = {
                index: mockBlockNumber,
                timestamp: Date.now(),
                transactions: [tx],
                nonce: Math.floor(Math.random() * 100000),
                previousHash: localChain.chain[localChain.chain.length - 1] ? localChain.chain[localChain.chain.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000',
                merkleRoot: localChain.calculateMerkleRoot([tx])
            };
            newBlock.hash = localChain.generateHash(newBlock);
            
            localChain.chain.push(newBlock);
            localChain.saveToStorage();
            
            result = {
                transactionHash: mockTxHash,
                blockNumber: mockBlockNumber,
                certId: Math.floor(Math.random() * 1000000) + 1,
                timestamp: Math.floor(Date.now() / 1000)
            };
        }
        
        work.onChain = true;
        work.txHash = result.transactionHash;
        work.blockHeight = result.blockNumber;
        work.hash = contentHash;
        work.certId = parseInt(result.certId);
        const timestampMs = result.timestamp > 10000000000 ? result.timestamp : result.timestamp * 1000;
        work.chainTime = new Date(timestampMs).toLocaleString();
        work.walletAddress = authorAddress;
        
        localStorage.setItem('photographyWorks', JSON.stringify(photographyWorkList));
        
        if (!user.walletAddress) {
            user.walletAddress = fromAddress;
            localStorage.setItem(`${USER_STORAGE_KEY}_${user.account}`, JSON.stringify(user));
        }
        
        return { 
            success: true, 
            message: isSimulation ? '作品已成功模拟上链（本地模拟模式）！' : '作品已成功上链！', 
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            walletAddress: fromAddress,
            certId: work.certId
        };
    } catch (error) {
        console.error('上链失败:', error);
        return { success: false, message: '上链失败：' + error.message };
    }
}

let blockchainRefreshInterval;

async function initBlockchainPage() {
    try {
        if (!web3) await initWeb3();
        if (!photoCertContract) await initContract();
        console.log('✅ 已成功连接到 Ganache 区块链！');
    } catch (error) {
        console.log('连接 Ganache 失败，使用本地模拟模式');
    }
    
    await renderBlockStats();
    await renderBlockList();
    await renderTransactionList();
    
    $("#blockSearch").on("input", debounce(searchBlockchain, 300));
    $("#searchBtn").click(searchBlockchain);
    
    if (blockchainRefreshInterval) {
        clearInterval(blockchainRefreshInterval);
    }
    blockchainRefreshInterval = setInterval(async () => {
        await renderBlockStats();
        await renderBlockList();
        await renderTransactionList();
    }, 3000);
}

async function renderBlockStats() {
    try {
        console.log(`=== 开始刷新区块链统计 ===`);
        
        if (!web3) await initWeb3();
        console.log(`✅ Web3连接成功`);
        
        const blockNumber = await getBlockNumber();
        const totalBlocks = blockNumber + 1;
        console.log(`区块高度: ${blockNumber}, 总区块数: ${totalBlocks}`);
        
        let certCount = 0;
        try {
            if (!photoCertContract) {
                console.log(`正在初始化合约...`);
                await initContract();
                console.log(`✅ 合约初始化成功`);
            }
            certCount = await getCertificationCount();
            console.log(`✅ 认证数量: ${certCount}`);
        } catch (e) {
            console.error('❌ 合约调用失败:', e.message);
            
            const works = JSON.parse(localStorage.getItem("photographyWorks") || "[]");
            const onChainWorks = works.filter(w => w.onChain);
            certCount = onChainWorks.length;
            console.log(`从localStorage获取已上链作品数: ${certCount}`);
        }
        
        let totalTxCount = 0;
        for (let i = 0; i <= blockNumber; i++) {
            const block = await web3.eth.getBlock(i);
            if (block) {
                totalTxCount += block.transactions.length;
            }
        }
        console.log(`交易总数: ${totalTxCount}`);
        
        $("#blockCount").text(totalBlocks);
        $("#validCount").text(certCount);
        $("#txCount").text(totalTxCount);
        
        let pendingCount = 0;
        photographyWorkList.forEach(w => {
            if (!w.onChain && w.pendingOnChain) pendingCount++;
        });
        $("#pendingCount").text(pendingCount);
        
        console.log(`待上链: ${pendingCount}`);
    } catch (error) {
        console.error('❌ 获取链上数据失败:', error);
        $("#blockCount").text('0');
        $("#txCount").text('0');
        $("#validCount").text('0');
        $("#pendingCount").text('0');
    }
}

async function renderBlockList() {
    try {
        if (!web3) await initWeb3();
        
        const blockNumber = await getBlockNumber();
        const latestBlocks = [];
        
        for (let i = blockNumber; i >= Math.max(0, blockNumber - 19); i--) {
            const block = await web3.eth.getBlock(i);
            if (block) {
                latestBlocks.push(block);
            }
        }
        
        let htmlStr = "";
        if (latestBlocks.length === 0) {
            htmlStr = '<tr><td colspan="5" class="text-center text-secondary">暂无区块数据</td></tr>';
        } else {
            latestBlocks.forEach(block => {
                htmlStr += `
                    <tr>
                        <td>Ganache</td>
                        <td>${block.number}</td>
                        <td><code class="text-primary">${block.hash.substring(0, 16)}...</code></td>
                        <td>${block.transactions.length}</td>
                        <td>${new Date(block.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                `;
            });
        }
        
        $("#blockList").html(htmlStr);
    } catch (error) {
        console.error('获取区块列表失败:', error);
        $("#blockList").html('<tr><td colspan="5" class="text-center text-secondary">加载区块数据失败</td></tr>');
    }
}

async function renderTransactionList() {
    try {
        if (!web3) await initWeb3();
        
        const blockNumber = await getBlockNumber();
        const allTransactions = [];
        
        for (let i = blockNumber; i >= Math.max(0, blockNumber - 50); i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions.length > 0) {
                block.transactions.forEach(tx => {
                    allTransactions.push({
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        blockNumber: i,
                        timestamp: block.timestamp,
                        value: web3.utils.fromWei(tx.value, 'ether')
                    });
                });
            }
        }
        
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        let htmlStr = "";
        if (allTransactions.length === 0) {
            htmlStr = '<tr><td colspan="5" class="text-center text-secondary">暂无交易数据</td></tr>';
        } else {
            allTransactions.slice(0, 20).forEach(tx => {
                const isContractTx = tx.to === CONTRACT_ADDRESS.toLowerCase();
                const typeLabel = isContractTx ? '<span class="label label-success">合约调用</span>' : '<span class="label label-default">转账</span>';
                htmlStr += `
                    <tr>
                        <td><code>${tx.from.substring(0, 12)}...</code></td>
                        <td><code class="text-primary">${tx.hash.substring(0, 16)}...</code></td>
                        <td>${typeLabel}</td>
                        <td>${tx.value} ETH</td>
                        <td>${new Date(tx.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                `;
            });
        }
        
        $("#transactionList").html(htmlStr);
    } catch (error) {
        console.error('获取交易列表失败:', error);
        $("#transactionList").html('<tr><td colspan="5" class="text-center text-secondary">加载交易数据失败</td></tr>');
    }
}

async function searchBlockchain() {
    const keyword = $("#blockSearch").val().trim().toLowerCase();
    if (!keyword) {
        await renderBlockList();
        await renderTransactionList();
        return;
    }
    
    try {
        if (!web3) await initWeb3();
        
        const blockNumber = await getBlockNumber();
        const matchedBlocks = [];
        const matchedTx = [];
        
        const searchRange = 50;
        for (let i = blockNumber; i >= Math.max(0, blockNumber - searchRange); i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block) {
                if (block.hash.toLowerCase().includes(keyword) ||
                    block.number.toString().includes(keyword)) {
                    matchedBlocks.push(block);
                }
                
                if (block.transactions.length > 0) {
                    block.transactions.forEach(tx => {
                        if (tx.hash.toLowerCase().includes(keyword) ||
                            tx.from.toLowerCase().includes(keyword) ||
                            tx.to.toLowerCase().includes(keyword)) {
                            matchedTx.push({
                                hash: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                blockNumber: i,
                                timestamp: block.timestamp,
                                value: web3.utils.fromWei(tx.value, 'ether')
                            });
                        }
                    });
                }
            }
        }
        
        let blockHtml = "";
        if (matchedBlocks.length === 0) {
            blockHtml = '<tr><td colspan="5" class="text-center text-secondary">未找到匹配的区块</td></tr>';
        } else {
            matchedBlocks.forEach(block => {
                blockHtml += `
                    <tr>
                        <td>Ganache</td>
                        <td>${block.number}</td>
                        <td><code class="text-primary">${block.hash.substring(0, 16)}...</code></td>
                        <td>${block.transactions.length}</td>
                        <td>${new Date(block.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                `;
            });
        }
        
        let txHtml = "";
        if (matchedTx.length === 0) {
            txHtml = '<tr><td colspan="5" class="text-center text-secondary">未找到匹配的交易</td></tr>';
        } else {
            matchedTx.forEach(tx => {
                const isContractTx = tx.to === CONTRACT_ADDRESS.toLowerCase();
                const typeLabel = isContractTx ? '<span class="label label-success">合约调用</span>' : '<span class="label label-default">转账</span>';
                txHtml += `
                    <tr>
                        <td><code>${tx.from.substring(0, 12)}...</code></td>
                        <td><code class="text-primary">${tx.hash.substring(0, 16)}...</code></td>
                        <td>${typeLabel}</td>
                        <td>${tx.value} ETH</td>
                        <td>${new Date(tx.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                `;
            });
        }
        
        $("#blockList").html(blockHtml);
        $("#transactionList").html(txHtml);
    } catch (error) {
        console.error('搜索失败:', error);
        $("#blockList").html('<tr><td colspan="5" class="text-center text-secondary">搜索失败</td></tr>');
        $("#transactionList").html('<tr><td colspan="5" class="text-center text-secondary">搜索失败</td></tr>');
    }
}



function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

$(function() {
    const path = window.location.pathname;
    if (path.includes("blockchain.html")) {
        initBlockchainPage();
    }
});
