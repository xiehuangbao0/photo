var USER_STORAGE_KEY = 'photography_user';
const LOGIN_USER_KEY = 'photography_login_user';

function getLoginUser() {
    return JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || 'null');
}

function setLoginUser(user) {
    localStorage.setItem(LOGIN_USER_KEY, JSON.stringify(user));
}

function logout() {
    localStorage.removeItem(LOGIN_USER_KEY);
    window.location.href = "login.html";
}

$(document).ready(function() {
    $('#logoutBtn').click(logout);
    
    $('#registerForm').submit(async function(e) {
        e.preventDefault();
        await register();
    });
    
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        login();
    });

    $('.role-tab').click(function() {
        $('.role-tab').removeClass('active');
        $(this).addClass('active');
        
        const role = $(this).data('role');
        $('#role').val(role);
    });

    $('#account').blur(function() {
        validateAccount();
    });

    $('#pwd').blur(function() {
        validatePassword();
    });

    $('#confirmPwd').blur(function() {
        validateConfirmPassword();
    });

    $('#nick').blur(function() {
        validateNick();
    });

    $('#pwd, #confirmPwd').keyup(function() {
        validateConfirmPassword();
    });
});

function validateAccount() {
    const account = $('#account').val().trim();
    const errorEl = $('#accountError');
    
    if (!account) {
        errorEl.text('账号不能为空');
        return false;
    }
    if (account.length < 3) {
        errorEl.text('账号至少需要3个字符');
        return false;
    }
    if (localStorage.getItem(`${USER_STORAGE_KEY}_${account}`)) {
        errorEl.text('该账号已被注册');
        return false;
    }
    errorEl.text('');
    return true;
}

function validatePassword() {
    const password = $('#pwd').val().trim();
    const errorEl = $('#pwdError');
    
    if (!password) {
        errorEl.text('密码不能为空');
        return false;
    }
    if (password.length < 6) {
        errorEl.text('密码至少需要6位');
        return false;
    }
    errorEl.text('');
    return true;
}

function validateConfirmPassword() {
    const password = $('#pwd').val().trim();
    const confirmPwd = $('#confirmPwd').val().trim();
    const errorEl = $('#confirmPwdError');
    
    if (!confirmPwd) {
        errorEl.text('请输入确认密码');
        return false;
    }
    if (password !== confirmPwd) {
        errorEl.text('两次密码不一致');
        return false;
    }
    errorEl.text('');
    return true;
}

function validateNick() {
    const nick = $('#nick').val().trim();
    const errorEl = $('#nickError');
    
    if (!nick) {
        errorEl.text('昵称不能为空');
        return false;
    }
    if (nick.length < 2) {
        errorEl.text('昵称至少需要2个字符');
        return false;
    }
    errorEl.text('');
    return true;
}

async function register() {
    const accountValid = validateAccount();
    const pwdValid = validatePassword();
    const confirmValid = validateConfirmPassword();
    const role = $("#role").val();
    const nickValid = validateNick();
    
    if (!accountValid || !pwdValid || !confirmValid || !nickValid) {
        return;
    }

    let account = $("#account").val().trim();
    let password = $("#pwd").val().trim();
    let nickName = $("#nick").val().trim();

    const chars = '0123456789abcdef';
    let walletAddress = '0x';
    for (let i = 0; i < 40; i++) {
        walletAddress += chars[Math.floor(Math.random() * chars.length)];
    }

    const userInfo = {
        account,
        password,
        nickName,
        role: role || "user",
        phone: "",
        walletAddress,
        ethBalance: 0.005,
        cnyBalance: 1000,
        registerTime: new Date().toLocaleString(),
        status: "normal"
    };
    
    localStorage.setItem(`${USER_STORAGE_KEY}_${account}`, JSON.stringify(userInfo));
    
    const roleText = role === "photographer" ? "摄影师" : "普通投票用户";
    alert(`注册成功！\n\n您已注册为${roleText}。\n\n💡 提示：进入个人中心后系统将自动生成您的专属ETH钱包地址，版权交易自动结算。`);
    window.location.href = "login.html";
}

async function login() {
    try {
        let account = $("#account").val().trim();
        let password = $("#pwd").val().trim();
        let role = $("#role").val();
        let userJson = localStorage.getItem(`${USER_STORAGE_KEY}_${account}`);
        
        if (!userJson) {
            alert("该账号不存在，请先注册");
            return;
        }
        
        let user = JSON.parse(userJson);
        
        if (user.password !== password) {
            alert("密码错误！");
            return;
        }
        
        if (user.role !== role) {
            const roleText = role === "photographer" ? "摄影师" : role === "admin" ? "管理员" : "普通投票用户";
            alert(`该账号注册的角色不是${roleText}！`);
            return;
        }
        
        if (user.status === "disabled") {
            alert("该账号已被禁用，请联系管理员！");
            return;
        }
        
        try {
            await initWeb3();
            const accounts = await getBlockchainAccounts();
            
            const accountIndexMap = {
                'admin': 0,
                'admin1': 1,
                '111': 2,
                '222': 3,
                '333': 4,
                '444': 5,
                '555': 6
            };
            
            let accountIndex;
            if (accountIndexMap[account] !== undefined) {
                accountIndex = accountIndexMap[account];
            } else {
                let hash = 0;
                for (let i = 0; i < account.length; i++) {
                    hash = account.charCodeAt(i) + ((hash << 5) - hash);
                }
                accountIndex = Math.abs(hash) % accounts.length;
                if (accountIndex === 0 && accounts.length > 1) {
                    accountIndex = 1; // 避免与默认管理员地址 0 冲突
                }
            }
            const ganacheAddress = accounts[accountIndex];
            
            if (ganacheAddress) {
                user.walletAddress = ganacheAddress;
                
                if (!photoCertContract) await initContract();
                
                try {
                    const existingUser = await photoCertContract.methods.getUser(ganacheAddress).call();
                    if (!existingUser.registered) {
                        await registerOnChain(account, user.nickName, ganacheAddress);
                        console.log(`✅ 用户 ${account} 已在链上注册`);
                    } else {
                        console.log(`用户 ${account} 已在链上注册`);
                    }
                } catch (regError) {
                    console.log('链上注册失败:', regError.message);
                }
                
                const ethBalance = await getAccountBalance(ganacheAddress);
                user.ethBalance = parseFloat(ethBalance);
                
                localStorage.setItem(`${USER_STORAGE_KEY}_${account}`, JSON.stringify(user));
                console.log(`✅ 已连接Ganache账号: ${ganacheAddress}, ETH余额: ${ethBalance}`);
            }
        } catch (error) {
            console.log('连接Ganache失败，使用本地存储的钱包地址:', error.message);
            if (!user.walletAddress) {
                const chars = '0123456789abcdef';
                user.walletAddress = '0x' + Array.from({ length: 40 }, () =>
                    chars[Math.floor(Math.random() * chars.length)]
                ).join('');
                localStorage.setItem(`${USER_STORAGE_KEY}_${account}`, JSON.stringify(user));
            }
        }
        
        setLoginUser(user);
        const roleNames = {
            admin: "管理员",
            photographer: "摄影师",
            user: "普通投票用户"
        };
        alert(`登录成功！欢迎回来，${user.nickName}（${roleNames[role] || "用户"}）`);
        
        if (role === "admin") {
            window.location.href = "person-info.html";
        } else {
            window.location.href = "index.html";
        }
    } catch (e) {
        alert("登录异常: " + e.message);
        console.error(e);
    }
}

function getUserInfo(account) {
    return JSON.parse(localStorage.getItem(`${USER_STORAGE_KEY}_${account}`) || 'null');
}

function getAllUsers() {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(USER_STORAGE_KEY + '_')) {
            users.push(JSON.parse(localStorage.getItem(key)));
        }
    }
    return users;
}

function toggleUserStatus(account) {
    const user = getUserInfo(account);
    if (!user) {
        alert('用户不存在');
        return;
    }
    
    if (user.role === "admin") {
        alert('不能禁用管理员账号');
        return;
    }
    
    const newStatus = user.status === "normal" ? "disabled" : "normal";
    const confirmMsg = newStatus === "disabled" ? `确定要禁用用户 "${user.nickName}" 吗？禁用后该用户将无法登录。` : `确定要启用用户 "${user.nickName}" 吗？`;
    
    if (confirm(confirmMsg)) {
        user.status = newStatus;
        localStorage.setItem(`${USER_STORAGE_KEY}_${account}`, JSON.stringify(user));
        
        if (getLoginUser() && getLoginUser().account === account) {
            logout();
        }
        
        alert(`操作成功！用户 "${user.nickName}" 已${newStatus === "disabled" ? "禁用" : "启用"}`);
    }
}

function updateUserInfo(account, updateData) {
    let user = getUserInfo(account);
    if (user) {
        Object.assign(user, updateData);
        localStorage.setItem(`${USER_STORAGE_KEY}_${account}`, JSON.stringify(user));
        if (getLoginUser() && getLoginUser().account === account) {
            setLoginUser(user);
        }
    }
}