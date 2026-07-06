let web3;
let photoCertContract;
const CONTRACT_ADDRESS = '0xDE4622eD33DC1BE87f62A21821043C34eB6B7988';

async function initWeb3() {
    try {
        web3 = new Web3('http://127.0.0.1:7545');
        const blockNumber = await web3.eth.getBlockNumber();
        console.log('Web3连接成功，当前区块:', blockNumber);
        const accounts = await web3.eth.getAccounts();
        console.log('Ganache账户:', accounts);
        return accounts;
    } catch (error) {
        console.error('Web3初始化失败:', error);
        throw error;
    }
}

async function initContract() {
    try {
        const response = await fetch('/build/contracts/PhotoCertification.json?' + Date.now());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        photoCertContract = new web3.eth.Contract(json.abi, CONTRACT_ADDRESS);
        return photoCertContract;
    } catch (error) {
        console.error('合约初始化失败:', error);
        throw error;
    }
}

async function getBlockchainAccounts() {
    return await web3.eth.getAccounts();
}

async function getAccountBalance(address) {
    const balance = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balance, 'ether');
}

async function getBlockNumber() {
    return await web3.eth.getBlockNumber();
}

async function certifyOnChain(title, hash, category, fromAddress, author) {
    await initContract();
    
    let accounts = [];
    try {
        accounts = await web3.eth.getAccounts();
    } catch (e) {
        console.log('获取账户列表失败:', e);
    }
    
    const isValidAccount = accounts.includes(fromAddress);
    if (!isValidAccount && accounts.length > 0) {
        console.log(`警告: ${fromAddress} 不是Ganache已知账户，使用第一个账户 ${accounts[0]}`);
        fromAddress = accounts[0];
    }
    
    web3.eth.defaultAccount = fromAddress;
    
    const result = await photoCertContract.methods
        .certify(title, hash, category, author)
        .send({ from: fromAddress, gas: 6721975 });
    
    const tx = await web3.eth.getTransaction(result.transactionHash);
    console.log(`作品上链 - 发送者: ${tx.from}, 区块: ${result.blockNumber}`);
    
    let certId = null;
    let timestamp = null;
    
    if (result.events && result.events.Certified) {
        certId = result.events.Certified.returnValues.id;
        timestamp = result.events.Certified.returnValues.timestamp;
    } else if (result.logs) {
        const certifiedLog = result.logs.find(log => log.event === 'Certified');
        if (certifiedLog) {
            certId = certifiedLog.returnValues.id;
            timestamp = certifiedLog.returnValues.timestamp;
        }
    }
    
    return {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        certId: certId || 'unknown',
        timestamp: timestamp || Math.floor(Date.now() / 1000)
    };
}

async function registerOnChain(account, nickname, fromAddress) {
    if (!photoCertContract) await initContract();
    
    web3.eth.defaultAccount = fromAddress;
    
    const result = await photoCertContract.methods
        .register(account, nickname)
        .send({ from: fromAddress, gas: 6721975 });
    
    const tx = await web3.eth.getTransaction(result.transactionHash);
    console.log(`注册上链 - 发送者: ${tx.from}, 区块: ${result.blockNumber}`);
    
    let userId = null;
    let timestamp = null;
    
    if (result.events && result.events.Registered) {
        userId = result.events.Registered.returnValues.id;
        timestamp = result.events.Registered.returnValues.timestamp;
    } else if (result.logs) {
        const registeredLog = result.logs.find(log => log.event === 'Registered');
        if (registeredLog) {
            userId = registeredLog.returnValues.id;
            timestamp = registeredLog.returnValues.timestamp;
        }
    }
    
    return {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        userId: userId || 'unknown',
        walletAddress: fromAddress,
        timestamp: timestamp || Math.floor(Date.now() / 1000)
    };
}

async function getCertification(certId) {
    if (!photoCertContract) await initContract();
    return await photoCertContract.methods.getCertification(certId).call();
}

async function getAuthorCertifications(authorAddress) {
    if (!photoCertContract) await initContract();
    return await photoCertContract.methods.getAuthorCertifications(authorAddress).call();
}

async function getCertificationCount() {
    if (!photoCertContract) await initContract();
    return await photoCertContract.methods.getCertificationCount().call();
}

async function getBlockTransactions(blockNumber) {
    const block = await web3.eth.getBlock(blockNumber, true);
    return block.transactions || [];
}

async function purchaseCopyright(certId, price, buyerAddress, sellerAddress) {
    await initContract();
    
    let accounts = [];
    try {
        accounts = await web3.eth.getAccounts();
    } catch (e) {
        console.log('获取账户列表失败:', e);
    }
    
    const isValidAccount = accounts.includes(buyerAddress);
    if (!isValidAccount && accounts.length > 0) {
        console.log(`警告: ${buyerAddress} 不是Ganache已知账户，使用第一个账户 ${accounts[0]}`);
        buyerAddress = accounts[0];
    }
    
    web3.eth.defaultAccount = buyerAddress;
    
    const weiPrice = web3.utils.toWei(price.toString(), 'ether');
    
    console.log(`=== 购买版权 ===`);
    console.log(`certId: ${certId}`);
    console.log(`buyerAddress: ${buyerAddress}`);
    console.log(`sellerAddress: ${sellerAddress}`);
    console.log(`price: ${price} ETH (${weiPrice} wei)`);
    console.log(`合约地址: ${CONTRACT_ADDRESS}`);
    
    const result = await photoCertContract.methods
        .purchase(certId)
        .send({ 
            from: buyerAddress, 
            gas: 6721975,
            value: weiPrice
        });
    
    console.log(`=== 购买成功 ===`);
    console.log(`交易哈希: ${result.transactionHash}`);
    console.log(`区块高度: ${result.blockNumber}`);
    
    const tx = await web3.eth.getTransaction(result.transactionHash);
    console.log(`版权购买 - 买家: ${tx.from}, 卖家: ${sellerAddress}, 价格: ${price} ETH`);
    
    let purchaseId = null;
    let timestamp = null;
    
    if (result.events && result.events.Purchased) {
        purchaseId = result.events.Purchased.returnValues.id;
        timestamp = result.events.Purchased.returnValues.timestamp;
    } else if (result.logs) {
        const purchasedLog = result.logs.find(log => log.event === 'Purchased');
        if (purchasedLog) {
            purchaseId = purchasedLog.returnValues.id;
            timestamp = purchasedLog.returnValues.timestamp;
        }
    }
    
    return {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        purchaseId: purchaseId || 'unknown',
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        buyerAddress: buyerAddress,
        sellerAddress: sellerAddress,
        price: price
    };
}