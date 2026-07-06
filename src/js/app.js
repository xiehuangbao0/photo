// 全局变量
var USER_STORAGE_KEY = 'photography_user';
let photographyWorkList = [];
let tournamentList = [];
let announcementList = [];
const MAX_DAILY_VOTES = 1;
const ITEMS_PER_PAGE = 12;
const ETH_RATE = 2000; // ETH兑人民币汇率
let currentPage = 1;
let currentRankingType = "total";
let lightboxImages = [];
let currentLightboxIndex = 0;
let currentCategory = "all";

// 加载数据
async function loadData() {
    try {
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]+$/, '/');
        console.log('数据加载路径:', baseUrl);
        
        const [worksRes, tourRes, annRes] = await Promise.all([
            fetch(baseUrl + "photography.json"),
            fetch(baseUrl + "tournaments.json"),
            fetch(baseUrl + "announcements.json")
        ]);
        
        console.log('响应状态:', worksRes.status, tourRes.status, annRes.status);
        
        if (!worksRes.ok || !tourRes.ok || !annRes.ok) {
            throw new Error('加载数据失败');
        }
        
        const worksFromJson = await worksRes.json();
        const toursFromJson = await tourRes.json();
        const annFromJson = await annRes.json();

        photographyWorkList = worksFromJson;
        console.log('从JSON加载作品数:', photographyWorkList.length);
        
        const toursFromStorage = localStorage.getItem("tournamentList");
        if (toursFromStorage) {
            const storageTours = JSON.parse(toursFromStorage);
            console.log(`=== 赛事数据加载 ===`);
            console.log(`localStorage中有${storageTours.length}个赛事，优先使用`);
            storageTours.forEach(t => {
                console.log(`赛事: ${t.name}`);
                console.log(`  状态: ${t.status}`);
                console.log(`  投稿时间: ${t.startTime} ~ ${t.endTime}`);
                console.log(`  投票时间: ${t.voteStart} ~ ${t.voteEnd}`);
            });
            tournamentList = storageTours;
        } else {
            console.log(`localStorage中没有赛事数据，使用JSON默认数据`);
            tournamentList = toursFromJson;
            localStorage.setItem("tournamentList", JSON.stringify(tournamentList));
        }
        
        const announcementsFromStorage = localStorage.getItem("announcementList");
        if (announcementsFromStorage) {
            const storageAnn = JSON.parse(announcementsFromStorage);
            console.log(`=== 公告数据加载 ===`);
            console.log(`localStorage中有${storageAnn.length}条公告，优先使用`);
            storageAnn.forEach(a => {
                console.log(`公告: ${a.title}`);
            });
            announcementList = storageAnn;
        } else {
            console.log(`localStorage中没有公告数据，使用JSON默认数据`);
            announcementList = annFromJson;
            localStorage.setItem("announcementList", JSON.stringify(announcementList));
        }
        
        const worksFromStorage = localStorage.getItem("photographyWorks");
        if (worksFromStorage) {
            const storageWorks = JSON.parse(worksFromStorage);
            console.log('从localStorage加载作品数:', storageWorks.length);
            
            const purchasedInStorage = storageWorks.filter(w => w.isPurchased && w.purchaseTime);
            console.log('localStorage中已购买作品数:', purchasedInStorage.length);
            purchasedInStorage.forEach(w => {
                console.log(`作品: ${w.workName}, isPurchased: ${w.isPurchased}, purchaseTime: ${w.purchaseTime}`);
            });
            
            const jsonIds = new Set(worksFromJson.map(w => w.id));
            storageWorks.forEach(work => {
                const existingWork = photographyWorkList.find(w => w.id === work.id);
                if (existingWork) {
                    const originalImg = existingWork.img;
                    Object.assign(existingWork, work);
                    existingWork.img = originalImg;
                } else {
                    photographyWorkList.push(work);
                }
            });
            
            const purchasedAfterMerge = photographyWorkList.filter(w => w.isPurchased && w.purchaseTime);
            console.log('合并后已购买作品数:', purchasedAfterMerge.length);
        }
        
        localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
        console.log('合并后作品总数:', photographyWorkList.length);
    } catch (error) {
        console.error('加载数据失败:', error);
        
        const worksFromStorage = localStorage.getItem("photographyWorks");
        if (worksFromStorage) {
            photographyWorkList = JSON.parse(worksFromStorage);
            console.log('从localStorage恢复作品数:', photographyWorkList.length);
        }
    }
    
    if (!tournamentList || tournamentList.length === 0) {
        tournamentList = [];
    }
    
    tournamentList.forEach(tournament => {
        tournament.worksCount = photographyWorkList.filter(work => 
            work.tournamentId === tournament.id && work.status === "online"
        ).length;
    });
    
    // 初始化默认管理员账号
    const defaultAdmin = {
        account: "admin",
        password: "admin123",
        nickName: "系统管理员",
        role: "admin",
        walletAddress: "",
        registerTime: new Date().toLocaleString(),
        status: "normal"
    };
    
    if (!localStorage.getItem(`photography_user_admin`)) {
        localStorage.setItem(`photography_user_admin`, JSON.stringify(defaultAdmin));
    }
}

// 生成哈希
function generateHash() {
    return "0x" + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join("");
}

// 计算MD5
function calculateMD5(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (typeof CryptoJS !== 'undefined') {
                const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                const md5 = CryptoJS.MD5(wordArray).toString();
                resolve(md5);
            } else {
                resolve(generateHash());
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// 收藏相关函数
function isCollected(workId) {
    const user = getLoginUser();
    if (!user) return false;
    const collections = JSON.parse(localStorage.getItem(`collections_${user.account}`) || '[]');
    return collections.includes(workId);
}

function getCollections() {
    const user = getLoginUser();
    if (!user) return [];
    return JSON.parse(localStorage.getItem(`collections_${user.account}`) || '[]');
}

function toggleCollection(workId) {
    const user = getLoginUser();
    if (!user) return false;
    const collections = JSON.parse(localStorage.getItem(`collections_${user.account}`) || '[]');
    const index = collections.indexOf(workId);
    let added = false;
    if (index > -1) {
        collections.splice(index, 1);
        added = false;
    } else {
        collections.push(workId);
        added = true;
    }
    localStorage.setItem(`collections_${user.account}`, JSON.stringify(collections));
    return added;
}

// 投票相关函数
function getTodayVoteCount() {
    const user = getLoginUser();
    if (!user) return 0;
    const today = new Date().toISOString().split('T')[0];
    const voteRecords = JSON.parse(localStorage.getItem(`voteRecords_${user.account}`) || '[]');
    return voteRecords.filter(r => r.date === today).length;
}

function hasVotedToday(workId) {
    const user = getLoginUser();
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    const voteRecords = JSON.parse(localStorage.getItem(`voteRecords_${user.account}`) || '[]');
    return voteRecords.some(r => r.date === today && r.workId === workId);
}

function addVoteRecord(workId) {
    const user = getLoginUser();
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const voteRecords = JSON.parse(localStorage.getItem(`voteRecords_${user.account}`) || '[]');
    voteRecords.push({ date: today, workId, time: new Date().toLocaleString() });
    localStorage.setItem(`voteRecords_${user.account}`, JSON.stringify(voteRecords));
}

function getVoteRecords() {
    const user = getLoginUser();
    if (!user) return [];
    return JSON.parse(localStorage.getItem(`voteRecords_${user.account}`) || '[]');
}

// 主题切换
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
        $("body").addClass("dark-mode");
        $("#themeToggle").text("🔆");
    }
    
    $("#themeToggle").click(function() {
        $("body").toggleClass("dark-mode");
        $("body").addClass("theme-transition");
        
        const isDark = $("body").hasClass("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        $(this).text(isDark ? "🔆" : "🌙");
        
        // 移除转场类
        setTimeout(() => {
            $("body").removeClass("theme-transition");
        }, 300);
    });
}

// 生成赛博风格粒子
function initCyberParticles() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;
    
    // 创建粒子容器
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    heroSection.appendChild(particleContainer);
    
    // 生成数据流粒子
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particleContainer.appendChild(particle);
    }
    
    // 生成散景光晕
    const bokehColors = ['#2288ff', '#9944ff', '#ff9922'];
    for (let i = 0; i < 8; i++) {
        const bokeh = document.createElement('div');
        bokeh.className = 'bokeh';
        const size = 30 + Math.random() * 50;
        bokeh.style.width = size + 'px';
        bokeh.style.height = size + 'px';
        bokeh.style.left = Math.random() * 100 + '%';
        bokeh.style.top = Math.random() * 100 + '%';
        bokeh.style.background = bokehColors[Math.floor(Math.random() * bokehColors.length)];
        bokeh.style.animationDelay = Math.random() * 15 + 's';
        heroSection.appendChild(bokeh);
    }
}

// 返回顶部按钮
function initBackToTop() {
    $(window).scroll(function() {
        if ($(this).scrollTop() > 300) {
            $("#backToTop").addClass("show");
        } else {
            $("#backToTop").removeClass("show");
        }
    });
    
    $("#backToTop").click(function() {
        $("html, body").animate({ scrollTop: 0 }, 500);
    });
}

// 图片懒加载
function initLazyLoad() {
    const images = document.querySelectorAll('.lazy-img');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// 灯箱功能
let lightboxScale = 1;
let lightboxOffsetX = 0;
let lightboxOffsetY = 0;
let isLightboxDragging = false;
let lightboxDragStartX = 0;
let lightboxDragStartY = 0;

function resetLightboxZoom() {
    lightboxScale = 1;
    lightboxOffsetX = 0;
    lightboxOffsetY = 0;
    $("#lightboxImg").removeClass("zoomed").css("transform", "");
    $("#lightboxZoomHint").show();
}

function applyLightboxTransform() {
    $("#lightboxImg").css("transform", `translate(${lightboxOffsetX}px, ${lightboxOffsetY}px) scale(${lightboxScale})`);
}

function initLightbox() {
    // 打开灯箱
    $(document).on("click", ".lightbox-trigger", function() {
        const imgSrc = $(this).data("src");
        const imgInfo = $(this).data("info");
        const imgIndex = $(this).data("index");
        
        currentLightboxIndex = imgIndex;
        $("#lightboxImg").attr("src", imgSrc);
        $("#lightboxInfo").html(imgInfo);
        $("#lightbox").addClass("active");
        resetLightboxZoom();
        
        // 禁止右键
        $("#lightboxImg").on("contextmenu", function(e) {
            e.preventDefault();
            alert("图片受版权保护，禁止下载或复制");
        });
    });
    
    // 关闭灯箱
    $("#lightboxClose").click(function() {
        $("#lightbox").removeClass("active");
        resetLightboxZoom();
    });
    
    // 上一张
    $("#lightboxPrev").click(function() {
        if (currentLightboxIndex > 0) {
            currentLightboxIndex--;
            updateLightboxImage();
            resetLightboxZoom();
        }
    });
    
    // 下一张
    $("#lightboxNext").click(function() {
        if (currentLightboxIndex < lightboxImages.length - 1) {
            currentLightboxIndex++;
            updateLightboxImage();
            resetLightboxZoom();
        }
    });
    
    // 点击图片放大/缩小
    $(document).on("click", "#lightboxImg", function(e) {
        if (isLightboxDragging) return;
        
        if (lightboxScale === 1) {
            lightboxScale = 2.5;
            $("#lightboxImg").addClass("zoomed");
            $("#lightboxZoomHint").hide();
        } else {
            resetLightboxZoom();
        }
        applyLightboxTransform();
    });
    
    // 滚轮缩放
    $(document).on("wheel", "#lightbox", function(e) {
        if (!$("#lightbox").hasClass("active")) return;
        e.preventDefault();
        
        const delta = e.originalEvent.deltaY > 0 ? -0.2 : 0.2;
        lightboxScale = Math.max(1, Math.min(5, lightboxScale + delta));
        
        if (lightboxScale > 1) {
            $("#lightboxImg").addClass("zoomed");
            $("#lightboxZoomHint").hide();
        } else {
            resetLightboxZoom();
        }
        applyLightboxTransform();
    });
    
    // 拖动平移
    $(document).on("mousedown", "#lightboxImg", function(e) {
        if (lightboxScale <= 1) return;
        isLightboxDragging = false;
        lightboxDragStartX = e.clientX - lightboxOffsetX;
        lightboxDragStartY = e.clientY - lightboxOffsetY;
        
        $(document).on("mousemove.lightboxDrag", function(e) {
            isLightboxDragging = true;
            lightboxOffsetX = e.clientX - lightboxDragStartX;
            lightboxOffsetY = e.clientY - lightboxDragStartY;
            applyLightboxTransform();
        });
        
        $(document).on("mouseup.lightboxDrag", function() {
            setTimeout(() => { isLightboxDragging = false; }, 50);
            $(document).off("mousemove.lightboxDrag mouseup.lightboxDrag");
        });
    });
    
    // ESC关闭
    $(document).keydown(function(e) {
        if (e.key === "Escape") {
            $("#lightbox").removeClass("active");
            resetLightboxZoom();
        }
        if ($("#lightbox").hasClass("active") && lightboxScale === 1) {
            if (e.key === "ArrowLeft") {
                $("#lightboxPrev").click();
            }
            if (e.key === "ArrowRight") {
                $("#lightboxNext").click();
            }
        }
    });
}

function updateLightboxImage() {
    const img = lightboxImages[currentLightboxIndex];
    $("#lightboxImg").attr("src", img.src);
    $("#lightboxInfo").html(img.info);
}

// 分页组件
function renderPagination(totalItems, pageNum) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
        $("#paginationWrapper").html("");
        return;
    }
    
    let html = '<ul class="pagination">';
    
    // 上一页
    html += `<li class="${pageNum === 1 ? 'disabled' : ''}">
        <a href="#" onclick="goToPage(${pageNum - 1});return false;">上一页</a>
    </li>`;
    
    // 页码
    const startPage = Math.max(1, pageNum - 2);
    const endPage = Math.min(totalPages, pageNum + 2);
    
    if (startPage > 1) {
        html += `<li><a href="#" onclick="goToPage(1);return false;">1</a></li>`;
        if (startPage > 2) {
            html += '<li class="disabled"><span>...</span></li>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="${i === pageNum ? 'active' : ''}">
            <a href="#" onclick="goToPage(${i});return false;">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<li class="disabled"><span>...</span></li>';
        }
        html += `<li><a href="#" onclick="goToPage(${totalPages});return false;">${totalPages}</a></li>`;
    }
    
    // 下一页
    html += `<li class="${pageNum === totalPages ? 'disabled' : ''}">
        <a href="#" onclick="goToPage(${pageNum + 1});return false;">下一页</a>
    </li>`;
    
    html += '</ul>';
    $("#paginationWrapper").html(html);
}

function goToPage(page) {
    const path = window.location.pathname;
    let totalItems = 0;
    
    if (path.includes("ranking.html")) {
        let works = photographyWorkList.filter(w => w.status === "online");
        const tournamentId = $("#tournamentSelect").val();
        const category = $("#categoryFilter").val();
        
        switch(currentRankingType) {
            case "tournament":
                if (tournamentId) {
                    works = works.filter(w => w.tournamentId === Number(tournamentId));
                }
                break;
            case "ended":
                const endedTournaments = tournamentList.filter(t => t.status === "ended").map(t => t.id);
                if (tournamentId) {
                    works = works.filter(w => w.tournamentId === Number(tournamentId));
                } else {
                    works = works.filter(w => endedTournaments.includes(w.tournamentId));
                }
                break;
            default:
                break;
        }
        
        if (category) {
            works = works.filter(w => w.category === category);
        }
        totalItems = works.length;
    } else {
        totalItems = photographyWorkList.filter(w => w.status === "online").length;
    }
    
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        if (path.includes("ranking.html")) {
            renderFullRanking(currentRankingType);
        } else {
            applyFilters();
        }
    }
}

// 高级筛选
function applyFilters() {
    const category = currentCategory;
    const timeFilter = $("#timeFilter").val() || "all";
    const minVotes = $("#minVotes").val() || 0;
    const sort = $("#sortFilter").val() || "default";
    const searchKey = $("#searchInput").length ? $("#searchInput").val().trim() : "";

    let works = photographyWorkList.filter(w => w.status === "online");

    // 分类筛选
    if (category !== "all") {
        works = works.filter(w => w.category === category);
    }
    
    // 时间筛选
    if (timeFilter !== "all") {
        const now = new Date();
        works = works.filter(w => {
            const createTime = new Date(w.createTime);
            switch(timeFilter) {
                case "today":
                    return createTime.toDateString() === now.toDateString();
                case "week":
                    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    return createTime >= weekAgo;
                case "month":
                    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    return createTime >= monthAgo;
                case "year":
                    const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
                    return createTime >= yearAgo;
                default:
                    return true;
            }
        });
    }
    
    // 票数筛选
    if (minVotes > 0) {
        works = works.filter(w => w.voteCount >= minVotes);
    }
    
    // 关键词搜索
    if (searchKey) {
        works = works.filter(w => w.workName.includes(searchKey) || w.authorNick.includes(searchKey));
    }
    
    // 排序
    switch(sort) {
        case "vote-desc":
            works.sort((a, b) => b.voteCount - a.voteCount);
            break;
        case "vote-asc":
            works.sort((a, b) => a.voteCount - b.voteCount);
            break;
        case "time-desc":
            works.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
            break;
        case "time-asc":
            works.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
            break;
        default:
            break;
    }
    
    // 分页
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageWorks = works.slice(startIndex, endIndex);
    
    // 显示空状态
    if (works.length === 0) {
        $("#workContainer").html("");
        $("#emptyState").show();
        $("#paginationWrapper").html("");
    } else {
        $("#emptyState").hide();
        renderWorkList(pageWorks);
        renderPagination(works.length, currentPage);
    }
    
    // 更新面包屑
    if (category !== "all") {
        $(".breadcrumb .active").text(category);
    } else {
        $(".breadcrumb .active").text("全部作品");
    }
}

// 快速标签筛选
function initFilterTags() {
    $(".filter-tag").click(function() {
        $(".filter-tag").removeClass("active");
        $(this).addClass("active");
        currentCategory = $(this).data("category") || "all";
        currentPage = 1;
        applyFilters();
    });
    
    $("#sortFilter").change(function() {
        currentPage = 1;
        applyFilters();
    });
}

// 重置筛选
function resetFilters() {
    currentCategory = "all";
    $("#timeFilter").val("all");
    $("#minVotes").val("");
    $("#sortFilter").val("default");
    $("#searchInput").val("");
    $(".filter-tag").removeClass("active");
    $(".filter-tag[data-category='all']").addClass("active");
    currentPage = 1;
    applyFilters();
}

// 渲染作品卡片
function renderWorkCard(work, index) {
    lightboxImages.push({
        src: work.img,
        info: `<h4>${work.workName}</h4><p>作者：${work.authorNick} | 票数：${work.voteCount}</p>`
    });
    
    const user = getLoginUser();
    const isAdmin = user && user.role === "admin";
    
    let voteBtnHtml = "";
    if (!isAdmin) {
        const hasVoted = hasVotedToday(work.id);
        const votesUsed = getTodayVoteCount();
        const tournament = work.tournamentId ? tournamentList.find(t => t.id === work.tournamentId) : null;
        const tournamentEnded = tournament && tournament.status === "ended";
        
        if (work.status !== "online") {
            voteBtnHtml = '<button class="btn btn-sm btn-secondary" disabled style="margin-left:5px;">不可点赞</button>';
        } else if (tournamentEnded) {
            voteBtnHtml = '<button class="btn btn-sm btn-secondary" disabled style="margin-left:5px;">赛事已结束</button>';
        } else if (votesUsed >= MAX_DAILY_VOTES) {
            voteBtnHtml = '<button class="btn btn-sm btn-secondary" disabled style="margin-left:5px;">今日票数已用完</button>';
        } else if (hasVoted) {
            voteBtnHtml = '<button class="btn btn-sm btn-secondary" disabled style="margin-left:5px;">👍 已投票</button>';
        } else {
            voteBtnHtml = '<button class="btn btn-sm btn-success voteBtn" data-id="' + work.id + '" style="margin-left:5px;">👍 投票</button>';
        }
    }
    
    return `
    <div class="col-md-3 mb-4">
        <div class="card shadow">
            <div class="card-body p-0">
                <img src="${work.img}" 
                     class="w-100 lazy-img lightbox-trigger" 
                     style="height:240px;object-fit:cover;"
                     data-src="${work.img}"
                     data-index="${lightboxImages.length - 1}"
                     data-info="<h4>${work.workName}</h4><p>作者：${work.authorNick} | 票数：${work.voteCount}</p>"
                     oncontextmenu="event.preventDefault(); alert('图片受版权保护，禁止下载');">
            </div>
            <div class="card-footer">
                <h5 class="card-title mb-2">📸 ${work.workName}</h5>
                <p class="text-secondary small mb-1">📷 分类：${work.category}</p>
                <p class="text-secondary small mb-1">👤 作者：${work.authorNick}</p>
                <p class="text-danger font-bold">🔥 票数：${work.voteCount}</p>
                <div class="mt-3">
                    <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">👁️ 查看详情</button>
                    ${voteBtnHtml}
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderWorkList(works) {
    lightboxImages = [];
    let htmlStr = "";
    if (works.length === 0) {
        htmlStr = '<div class="col-12 text-center text-secondary">暂无作品</div>';
    } else {
        works.forEach((work, index) => {
            htmlStr += renderWorkCard(work, index);
        });
    }
    $("#workContainer").html(htmlStr);
    
    // 绑定事件
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });

    $(".voteBtn").click(function() {
        const user = getLoginUser();
        if (!user) {
            alert("登录账号后才能投票！");
            window.location.href = "login.html";
            return;
        }
        const workId = $(this).data("id");
        submitVote(workId);
    });
    
    // 初始化懒加载
    initLazyLoad();
}

// 投票
function submitVote(targetWorkId) {
    const user = getLoginUser();
    if (!user) return;

    if (getTodayVoteCount() >= MAX_DAILY_VOTES) {
        alert(`今日投票次数已用完（每个账号每天只能投${MAX_DAILY_VOTES}次）`);
        return;
    }

    const targetWork = photographyWorkList.find(w => w.id === targetWorkId);
    
    if (hasVotedToday(targetWorkId)) {
        alert(`您今天已经给「${targetWork?.workName || '该作品'}」投过票了`);
        return;
    }

    if (targetWork) {
        if (targetWork.status !== "online") {
            alert(`「${targetWork.workName}」处于审核中或已下架，暂无法进行投票！`);
            return;
        }
        targetWork.voteCount += 1;
        addVoteRecord(targetWorkId);
        localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
        alert(`投票成功！您已为「${targetWork.workName}」投票，当前票数：${targetWork.voteCount}`);
        applyFilters();
    }
}

// 渲染赛事卡片
function renderTournamentCard(tournament) {
    const statusClass = tournament.status === "active" ? "label label-success" : "label label-default";
    return `
    <div class="col-md-6 mb-4">
        <div class="card tournament-card">
            <div class="shutter-icon">📸</div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title">${tournament.name}</h5>
                    <span class="${statusClass}">${tournament.status === "active" ? "⚡ 进行中" : "🏁 已结束"}</span>
                </div>
                <p class="card-text mt-3">${tournament.description}</p>
                <div class="mt-4">
                    <p>投稿时间：${tournament.startTime} ~ ${tournament.endTime}</p>
                    <p>投票时间：${tournament.voteStart} ~ ${tournament.voteEnd}</p>
                </div>
                <button class="btn btn-light mt-3" onclick="window.location.href='tournament-detail.html?id=${tournament.id}'">查看详情 →</button>
            </div>
        </div>
    </div>
    `;
}

function renderTournaments() {
    let htmlStr = "";
    tournamentList.forEach(t => {
        htmlStr += renderTournamentCard(t);
    });
    $("#tournamentContainer").html(htmlStr);
}

function loadTournamentListPage() {
    loadData().then(() => {
        renderAllTournaments("active");
        
        $("#tabActive").click(() => {
            renderAllTournaments("active");
            $("#tabActive").addClass("btn-primary").removeClass("btn-default");
            $("#tabEnded").addClass("btn-default").removeClass("btn-primary");
            $("#tabAll").addClass("btn-default").removeClass("btn-primary");
        });
        
        $("#tabEnded").click(() => {
            renderAllTournaments("ended");
            $("#tabEnded").addClass("btn-primary").removeClass("btn-default");
            $("#tabActive").addClass("btn-default").removeClass("btn-primary");
            $("#tabAll").addClass("btn-default").removeClass("btn-primary");
        });
        
        $("#tabAll").click(() => {
            renderAllTournaments("all");
            $("#tabAll").addClass("btn-primary").removeClass("btn-default");
            $("#tabActive").addClass("btn-default").removeClass("btn-primary");
            $("#tabEnded").addClass("btn-default").removeClass("btn-primary");
        });
    });
}

function renderAllTournaments(filter) {
    let filteredList = tournamentList;
    if (filter !== "all") {
        filteredList = tournamentList.filter(t => t.status === filter);
    }
    
    if (filteredList.length === 0) {
        $("#tournamentListContainer").html("");
        $("#tournamentEmpty").show();
        return;
    }
    
    $("#tournamentEmpty").hide();
    let htmlStr = "";
    filteredList.forEach(t => {
        htmlStr += renderTournamentCard(t);
    });
    $("#tournamentListContainer").html(htmlStr);
}

// 渲染榜单
function renderRanking() {
    const works = photographyWorkList
        .filter(w => w.status === "online")
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 10);
    
    let htmlStr = "";
    works.forEach((work, index) => {
        const rankClass = index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : "";
        const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
        
        const user = getLoginUser();
        const isAdmin = user && user.role === "admin";
        
        let voteBtnHtml = "";
        if (!isAdmin) {
            const hasVoted = hasVotedToday(work.id);
            const votesUsed = getTodayVoteCount();
            const tournament = work.tournamentId ? tournamentList.find(t => t.id === work.tournamentId) : null;
            const tournamentEnded = tournament && tournament.status === "ended";
            
            if (work.status !== "online") {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>不可投票</button>';
            } else if (tournamentEnded) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>赛事已结束</button>';
            } else if (votesUsed >= MAX_DAILY_VOTES) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>今日票数已用完</button>';
            } else if (hasVoted) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>👍 已投票</button>';
            } else {
                voteBtnHtml = `<button class="btn btn-sm btn-success flex-1 rankingVoteBtn" data-id="${work.id}">👍 投票</button>`;
            }
        }
        
        htmlStr += `
        <div class="col-md-3 mb-3">
            <div class="card ranking-card ${rankClass}">
                <div class="card-body p-3">
                    <div class="ranking-badge">${rankBadge}</div>
                    <img src="${work.img}" class="w-100 rounded" style="height:140px;object-fit:cover;">
                    <p class="text-center text-white mt-2 font-bold">${work.workName}</p>
                    <p class="text-center text-white-50 small">👤 ${work.authorNick}</p>
                    <p class="text-center text-white font-bold">🔥 ${work.voteCount}票</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-light flex-1 detailBtn" data-id="${work.id}">查看详情</button>
                        ${voteBtnHtml}
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    $("#rankingContainer").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
    
    $(".rankingVoteBtn").click(function() {
        const workId = $(this).data("id");
        submitVote(workId);
        renderRanking();
    });
}

// 渲染公告
function renderAnnouncements() {
    const texts = announcementList.map(a => `【${a.title}】${a.content}`).join(" | ");
    $("#announcementText").text(texts);
}

// 渲染通知横幅
function renderNotifications() {
    let html = "";
    
    const sortedAnnouncements = [...announcementList].sort((a, b) => {
        return new Date(b.time) - new Date(a.time);
    });
    
    sortedAnnouncements.forEach((ann, index) => {
        const icon = ann.type === "tournament" ? "🏆" : ann.type === "winner" ? "🥇" : ann.type === "system" ? "🔧" : "✨";
        html += `<span class="notify-item" style="cursor:pointer;" onclick="showAnnouncementDetail(${index})"><span class="notify-icon">${icon}</span><span>${ann.title}</span></span>`;
    });
    
    if (!html) {
        html = `<span class="notify-item"><span class="notify-icon">📢</span><span>暂无通知</span></span>`;
    }
    
    $("#notificationContent").html(html);
}

// 显示公告详情弹窗
function showAnnouncementDetail(index) {
    const announcement = announcementList[index];
    if (!announcement) return;
    
    const icon = announcement.type === "tournament" ? "🏆" : announcement.type === "winner" ? "🥇" : announcement.type === "system" ? "🔧" : "✨";
    
    const modalHtml = `
    <div class="modal fade" id="announcementDetailModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">${icon} 公告详情</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>公告标题</label>
                        <input type="text" class="form-control" value="${announcement.title}" readonly>
                    </div>
                    <div class="form-group">
                        <label>公告内容</label>
                        <textarea class="form-control" rows="4" readonly>${announcement.content}</textarea>
                    </div>
                    <div class="form-group">
                        <label>发布时间</label>
                        <input type="text" class="form-control" value="${announcement.time}" readonly>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("body").append(modalHtml);
    $("#announcementDetailModal").modal("show");
    
    $("#announcementDetailModal").on("hidden.bs.modal", function() {
        $(this).remove();
    });
}

// 加载首页
async function loadHomePage() {
    await loadData();
    renderNotifications();
    renderTournaments();
    applyFilters();
    renderRanking();
    
    initTheme();
    initBackToTop();
    initLightbox();
    initFilterTags();
    initCyberParticles();
    
    const user = getLoginUser();
    
    $("#resetEmptyBtn").click(resetFilters);
    
    $("#publishBtn").click(function() {
        const user = getLoginUser();
        if (!user) {
            alert("登录后才能投稿！");
            window.location.href = "login.html";
            return;
        }
        window.location.href = "publish.html";
    });
}

// 加载获奖展厅页面
async function loadWinnersPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
    
    const endedTournaments = tournamentList.filter(t => t.status === "ended" && t.winners && t.winners.length > 0);
    
    if (endedTournaments.length === 0) {
        $("#winnersContent").html(`<div class="col-12 text-center text-secondary py-5">暂无已结束赛事的获奖作品</div>`);
        return;
    }
    
    endedTournaments.forEach((tournament, index) => {
        const activeClass = index === 0 ? "btn-primary active" : "btn-default";
        $("#tournamentTabs").append(`<button class="btn ${activeClass}" data-tid="${tournament.id}">${tournament.name}</button>`);
    });
    
    renderWinners(endedTournaments[0].id);
    
    $("#tournamentTabs button").click(function() {
        $("#tournamentTabs button").removeClass("btn-primary active").addClass("btn-default");
        $(this).removeClass("btn-default").addClass("btn-primary active");
        const tid = $(this).data("tid");
        renderWinners(tid);
    });
}

function renderWinners(tournamentId) {
    const tournament = tournamentList.find(t => t.id === tournamentId);
    if (!tournament || !tournament.winners || tournament.winners.length === 0) {
        $("#winnersContent").html(`<div class="col-12 text-center text-secondary py-5">该赛事暂无获奖作品</div>`);
        return;
    }
    
    let htmlStr = "";
    tournament.winners.forEach((winner, index) => {
        const work = photographyWorkList.find(w => w.id === winner.workId);
        if (!work) return;
        
        const rankClass = winner.rank.includes("一等奖") ? "gold" : winner.rank.includes("二等奖") ? "silver" : winner.rank.includes("三等奖") ? "bronze" : "";
        const rankBadge = winner.rank.includes("一等奖") ? "🥇 一等奖" : winner.rank.includes("二等奖") ? "🥈 二等奖" : winner.rank.includes("三等奖") ? "🥉 三等奖" : `🏅 ${winner.rank}`;
        
        htmlStr += `
        <div class="col-md-3 mb-4">
            <div class="card ranking-card ${rankClass}">
                <div class="card-body p-3">
                    <div class="ranking-badge">${rankBadge}</div>
                    <img src="${work.img}" class="w-100 rounded" style="height:180px;object-fit:cover;">
                    <h5 class="text-center text-white mt-3 font-bold">${work.workName}</h5>
                    <p class="text-center text-white-50 small">👤 ${work.authorNick}</p>
                    <p class="text-center text-white font-bold fs-4">🔥 ${work.voteCount}票</p>
                    <button class="btn btn-sm btn-light btn-block detailBtn" data-id="${work.id}">查看详情</button>
                </div>
            </div>
        </div>
        `;
    });
    
    $("#winnersContent").html(htmlStr);
    
    if (tournament.prizes && tournament.prizes.length > 0) {
        let prizesHtml = `<div class="mt-6">`;
        prizesHtml += `<h4 class="text-center mb-3">🎁 奖项设置</h4>`;
        prizesHtml += `<table class="table table-striped">`;
        prizesHtml += `<thead><tr><th>奖项</th><th>奖品</th></tr></thead>`;
        prizesHtml += `<tbody>`;
        tournament.prizes.forEach(p => {
            prizesHtml += `<tr><td>${p.rank}</td><td>${p.prize}</td></tr>`;
        });
        prizesHtml += `</tbody></table></div>`;
        $("#prizesContent").html(prizesHtml);
    } else {
        $("#prizesContent").html("");
    }
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

// 加载版权集市页面
async function loadMarketPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
    
    const categories = [...new Set(photographyWorkList.map(w => w.category))];
    categories.forEach(category => {
        $("#marketCategory").append(`<option value="${category}">${category}</option>`);
    });
    
    renderMarket();
    
    $("#marketCategory, #marketType, #marketSort").change(function() {
        marketCurrentPage = 1;
        renderMarket();
    });
}

let marketCurrentPage = 1;

function renderMarket() {
    let works = photographyWorkList.filter(w => w.status === "online");
    
    const category = $("#marketCategory").val();
    const sort = $("#marketSort").val();
    
    if (category) {
        works = works.filter(w => w.category === category);
    }
    
    switch(sort) {
        case "price_asc":
            works.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case "price_desc":
            works.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        default:
            works.sort((a, b) => b.voteCount - a.voteCount);
            break;
    }
    
    const totalPages = Math.ceil(works.length / ITEMS_PER_PAGE);
    const startIndex = (marketCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageWorks = works.slice(startIndex, endIndex);
    
    if (pageWorks.length === 0) {
        $("#marketContent").html(`<div class="col-12 text-center text-secondary py-5">暂无符合条件的作品</div>`);
        $("#marketPagination").html("");
        return;
    }
    
    let htmlStr = "";
    pageWorks.forEach((work, index) => {
        const user = getLoginUser();
        const isPurchased = user && work.buyerAccount === user.account;
        const isAdmin = user && user.role === "admin";
        const isPhotographer = user && user.role === "photographer";
        
        let purchaseBtn = '';
        const isSold = work.buyerAccount && work.buyerAccount !== '';
        
        if (!user) {
            purchaseBtn = '<button class="btn btn-sm btn-success btn-block mt-2" onclick="window.location.href=\'login.html\'">登录购买</button>';
        } else if (isAdmin || isPhotographer) {
            purchaseBtn = '';
        } else if (work.onChain !== true) {
            purchaseBtn = '<button class="btn btn-sm btn-secondary btn-block mt-2" disabled>待存证</button>';
        } else if (isSold) {
            purchaseBtn = '<button class="btn btn-sm btn-danger btn-block mt-2" disabled>已售出</button>';
        } else if (isPurchased) {
            purchaseBtn = '<button class="btn btn-sm btn-info btn-block mt-2" disabled>已购买</button>';
        } else {
            purchaseBtn = `<button class="btn btn-sm btn-success btn-block mt-2" onclick="purchaseWork(${work.id})">立即购买</button>`;
        }
        
        htmlStr += `
        <div class="col-md-3 mb-4">
            <div class="card ranking-card">
                <div class="card-body p-3">
                    <div class="ranking-badge">💰 ¥${work.price}</div>
                    <img src="${work.img}" class="w-100 rounded" style="height:180px;object-fit:cover;">
                    <h5 class="text-center text-white mt-3 font-bold">${work.workName}</h5>
                    <p class="text-center text-white-50 small">👤 ${work.authorNick}</p>
                    <p class="text-center text-white font-bold fs-4">🔥 ${work.voteCount}票</p>
                    <button class="btn btn-sm btn-light btn-block detailBtn" data-id="${work.id}">查看详情</button>
                    ${purchaseBtn}
                </div>
            </div>
        </div>
        `;
    });
    
    $("#marketContent").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
    
    if (totalPages > 1) {
        let paginationHtml = `<nav><ul class="pagination">`;
        paginationHtml += `<li class="${marketCurrentPage === 1 ? 'disabled' : ''}">`;
        paginationHtml += `<a href="#" onclick="marketCurrentPage=${marketCurrentPage-1};renderMarket();return false;">上一页</a></li>`;
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<li class="${marketCurrentPage === i ? 'active' : ''}">`;
            paginationHtml += `<a href="#" onclick="marketCurrentPage=${i};renderMarket();return false;">${i}</a></li>`;
        }
        
        paginationHtml += `<li class="${marketCurrentPage === totalPages ? 'disabled' : ''}">`;
        paginationHtml += `<a href="#" onclick="marketCurrentPage=${marketCurrentPage+1};renderMarket();return false;">下一页</a></li>`;
        paginationHtml += `</ul></nav>`;
        
        $("#marketPagination").html(paginationHtml);
    } else {
        $("#marketPagination").html("");
    }
}

async function purchaseWork(workId) {
    const user = getLoginUser();
    if (!user) {
        alert("请先登录！");
        window.location.href = "login.html";
        return;
    }
    
    const work = photographyWorkList.find(w => w.id === workId);
    if (!work) {
        alert("作品不存在！");
        return;
    }
    
    if (work.onChain !== true) {
        alert("作品尚未存证上链，无法购买！");
        return;
    }
    
    if (work.buyerAccount && work.buyerAccount !== '') {
        if (work.buyerAccount === user.account) {
            alert("您已经购买了该作品！");
        } else {
            alert("该作品已经被其他用户购买！");
        }
        return;
    }
    
    const price = work.price || Math.floor(Math.random() * 500) + 100;
    const ethPrice = price / ETH_RATE;
    
    let paymentMethod = '';
    const cnyBalance = parseFloat(user.cnyBalance || 0);
    
    let ethBalance = parseFloat(user.ethBalance || 0);
    try {
        if (!web3) await initWeb3();
        ethBalance = parseFloat(await getAccountBalance(user.walletAddress));
    } catch (e) {
        console.log('获取链上余额失败，使用本地余额');
    }
    
    const paymentOptions = [];
    if (cnyBalance >= price) {
        paymentOptions.push('1. 人民币余额支付');
    }
    if (ethBalance >= ethPrice && user.walletAddress) {
        paymentOptions.push('2. ETH链上支付');
    }
    
    if (paymentOptions.length === 0) {
        alert(`余额不足！\n作品价格：¥${price}（${ethPrice.toFixed(4)} ETH）\n您的人民币余额：¥${cnyBalance.toFixed(2)}\n您的ETH余额：${ethBalance.toFixed(4)} ETH\n请先充值后再购买！`);
        return;
    }
    
    const choice = prompt(`请选择支付方式：\n${paymentOptions.join('\n')}\n\n输入数字 1 或 2`);
    if (!choice) return;
    
    if (choice === '1') {
        if (cnyBalance < price) {
            alert("人民币余额不足！");
            return;
        }
        paymentMethod = 'cny';
    } else if (choice === '2') {
        if (!user.walletAddress) {
            alert("您没有绑定钱包地址！");
            return;
        }
        paymentMethod = 'eth';
    } else {
        alert("无效的选择！");
        return;
    }
    
    if (!confirm(`确定购买 "${work.workName}" 的商业授权吗？\n价格：¥${price}\n支付方式：${paymentMethod === 'cny' ? '人民币余额支付' : 'ETH链上支付'}`)) {
        return;
    }
    
    try {
        let fromAddress = user.walletAddress;
        let result = null;
        
        if (paymentMethod === 'eth') {
            try {
                if (!web3) await initWeb3();
                
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
                
                let buyerAccountIndex;
                if (accountIndexMap[user.account] !== undefined) {
                    buyerAccountIndex = accountIndexMap[user.account];
                } else {
                    let hash = 0;
                    for (let i = 0; i < user.account.length; i++) {
                        hash = user.account.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    buyerAccountIndex = Math.abs(hash) % accounts.length;
                    if (buyerAccountIndex === 0 && accounts.length > 1) {
                        buyerAccountIndex = 1;
                    }
                }
                
                fromAddress = accounts[buyerAccountIndex];
                user.walletAddress = fromAddress;
                localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
                setLoginUser(user);
                
                let sellerAccountIndex;
                if (work.authorAccount && accountIndexMap[work.authorAccount] !== undefined) {
                    sellerAccountIndex = accountIndexMap[work.authorAccount];
                } else {
                    let hash = 0;
                    const authorAcc = work.authorAccount || "";
                    for (let i = 0; i < authorAcc.length; i++) {
                        hash = authorAcc.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    sellerAccountIndex = Math.abs(hash) % accounts.length;
                    if (sellerAccountIndex === 0 && accounts.length > 1) {
                        sellerAccountIndex = 1; // 避免与默认管理员地址 0 冲突
                    }
                }
                
                const sellerAddress = accounts[sellerAccountIndex];
                if (work.authorAccount) {
                    const authorUser = getUserInfo(work.authorAccount);
                    if (authorUser) {
                        authorUser.walletAddress = sellerAddress;
                        localStorage.setItem(`photography_user_${authorUser.account}`, JSON.stringify(authorUser));
                    }
                }
                
                const weiPrice = web3.utils.toWei(ethPrice.toString(), 'ether');
                
                console.log(`=== 链上转账 ===`);
                console.log(`买家: ${fromAddress} (索引: ${buyerAccountIndex})`);
                console.log(`卖家: ${sellerAddress} (索引: ${sellerAccountIndex})`);
                console.log(`金额: ${ethPrice} ETH (${weiPrice} Wei)`);
                
                result = await web3.eth.sendTransaction({
                    from: fromAddress,
                    to: sellerAddress,
                    value: weiPrice,
                    gas: 21000
                });
                
                const newBuyerBalance = await getAccountBalance(fromAddress);
                user.ethBalance = parseFloat(newBuyerBalance);
                localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
                setLoginUser(user);
                
                if (work.authorAccount && work.authorAccount !== user.account) {
                    const newSellerBalance = await getAccountBalance(sellerAddress);
                    const authorUser = getUserInfo(work.authorAccount);
                    if (authorUser) {
                        authorUser.ethBalance = parseFloat(newSellerBalance);
                        localStorage.setItem(`photography_user_${authorUser.account}`, JSON.stringify(authorUser));
                    }
                }
                
                console.log(`✅ 链上转账成功: ${result.transactionHash}`);
                console.log(`买家新余额: ${newBuyerBalance} ETH`);
                
            } catch (txError) {
                console.error('链上转账失败:', txError.message);
                throw new Error('链上转账失败: ' + txError.message);
            }
        } else {
            user.cnyBalance = cnyBalance - price;
            localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
            setLoginUser(user);
            
            if (work.authorAccount && work.authorAccount !== user.account) {
                const authorUser = getUserInfo(work.authorAccount);
                if (authorUser) {
                    authorUser.cnyBalance = parseFloat(authorUser.cnyBalance || 0) + price;
                    localStorage.setItem(`photography_user_${authorUser.account}`, JSON.stringify(authorUser));
                }
            }
            
            result = {
                transactionHash: '0x' + Array.from({ length: 64 }, () => 
                    Math.floor(Math.random() * 16).toString(16)
                ).join(''),
                blockNumber: Math.floor(Math.random() * 10000) + 1000,
                purchaseId: Math.floor(Math.random() * 1000),
                timestamp: Date.now(),
                buyerAddress: user.walletAddress || 'N/A',
                sellerAddress: work.walletAddress || 'N/A',
                price: price
            };
        }
        
        work.buyerAccount = user.account;
        work.buyerNick = user.nickName;
        work.buyerAddress = fromAddress || user.walletAddress;
        work.purchaseTime = new Date().toLocaleString();
        work.purchaseTxHash = result.transactionHash;
        work.isPurchased = true;
        work.paymentMethod = paymentMethod;
        work.purchasePrice = ethPrice;
        
        console.log(`=== 购买完成 ===`);
        console.log(`作品: ${work.workName}`);
        console.log(`isPurchased: ${work.isPurchased}`);
        console.log(`purchaseTime: ${work.purchaseTime}`);
        console.log(`purchasePrice: ${work.purchasePrice}`);
        
        localStorage.setItem('photographyWorks', JSON.stringify(photographyWorkList));
        
        const savedData = JSON.parse(localStorage.getItem('photographyWorks'));
        const savedWork = savedData.find(w => w.id === work.id);
        console.log(`=== localStorage验证 ===`);
        console.log(`isPurchased: ${savedWork.isPurchased}`);
        console.log(`purchaseTime: ${savedWork.purchaseTime}`);
        console.log(`purchasePrice: ${savedWork.purchasePrice}`);
        
        if (!user.walletAddress && fromAddress) {
            user.walletAddress = fromAddress;
            localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
            setLoginUser(user);
        }
        
        const purchaseRecord = {
            workId: work.id,
            workName: work.workName,
            price: price,
            paymentMethod: paymentMethod,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            purchaseTime: work.purchaseTime,
            img: work.img
        };
        
        const purchaseHistory = JSON.parse(localStorage.getItem(`purchase_history_${user.account}`) || '[]');
        purchaseHistory.unshift(purchaseRecord);
        localStorage.setItem(`purchase_history_${user.account}`, JSON.stringify(purchaseHistory));
        
        addFundsFlowRecord(
            user.account,
            'purchase',
            paymentMethod === 'eth' ? ethPrice : 0,
            price,
            '版权购买',
            `购买作品: ${work.workName} (${paymentMethod === 'cny' ? '人民币支付' : 'ETH支付'})`,
            result.transactionHash
        );
        
        if (work.authorAccount && work.authorAccount !== user.account) {
            const authorUser = getUserInfo(work.authorAccount);
            if (authorUser) {
                addFundsFlowRecord(
                    authorUser.account,
                    'receive',
                    paymentMethod === 'eth' ? ethPrice : 0,
                    price,
                    '版权销售收入',
                    `销售作品: ${work.workName}`,
                    result.transactionHash
                );
            }
        }
        
        alert(`✅ 购买成功！\n作品：${work.workName}\n价格：¥${price}\n支付方式：${paymentMethod === 'cny' ? '人民币余额支付' : 'ETH链上支付'}\n交易哈希：${result.transactionHash}\n区块高度：${result.blockNumber}`);
        
        if (window.location.pathname.includes('work-detail')) {
            window.location.reload();
        }
        
        if (window.location.pathname.includes('person-info')) {
            await updateWalletBalances(user);
            const records = JSON.parse(localStorage.getItem(`funds_flow_${user.account}`) || '[]');
            let htmlStr = "";
            if (records.length === 0) {
                htmlStr = '<div style="text-align: center; padding: 40px; color: #95a5a6;"><div style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;">📊</div><div style="font-size: 14px;">暂无资产流水记录</div></div>';
            } else {
                records.forEach(record => {
                    const icon = record.type === 'purchase' ? '🛒' :
                                 record.type === 'receive' ? '📬' :
                                 record.type === 'register_bonus' ? '🎁' : '💳';
                    const isIncome = record.type === 'receive' || record.type === 'register_bonus';
                    const amountStr = isIncome ? `+¥${record.amountCny.toFixed(2)}` : `-¥${record.amountCny.toFixed(2)}`;
                    const amountColor = isIncome ? '#27ae60' : '#e74c3c';

                    htmlStr += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center;">
                            <div style="font-size: 24px; margin-right: 12px;">${icon}</div>
                            <div>
                                <div style="font-size: 14px; font-weight: 500; color: #212529;">${record.description}</div>
                                <div style="font-size: 11px; color: #6c757d;">${record.time}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace; color: ${amountColor};">${amountStr}</div>
                            ${record.txHash ? `<div style="font-size: 10px; color: #6c757d; font-family: 'Courier New', monospace; margin-top: 2px;">${record.txHash}</div>` : ''}
                        </div>
                    </div>
                    `;
                });
            }
            $("#walletFlowList").html(htmlStr);
        }
        
        renderMarket();
        
        if (paymentMethod === 'eth') {
            try {
                await initWeb3();
                const newBalance = await getAccountBalance(user.walletAddress);
                user.ethBalance = parseFloat(newBalance);
                localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
                setLoginUser(user);
                
                if ($("#walletEthBalance").length > 0) {
                    $("#walletEthBalance").text(`${user.ethBalance.toFixed(4)} ETH`);
                    const ethToCny = user.ethBalance * ETH_RATE;
                    const cnyBalance = parseFloat(user.cnyBalance || 1000);
                    $("#walletTotalAsset").text(`¥${(ethToCny + cnyBalance).toFixed(2)}`);
                }
            } catch (e) {
                console.log('刷新余额失败:', e.message);
            }
        }
    } catch (error) {
        console.error('购买失败:', error);
        alert('购买失败：' + error.message);
    }
}

// 加载榜单页面
async function loadRankingPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
    
    // 填充赛事选择下拉框
    tournamentList.forEach(tournament => {
        const status = tournament.status === 'ended' ? ' [已结束]' : '';
        $("#tournamentSelect").append(`<option value="${tournament.id}">${tournament.name}${status}</option>`);
    });
    
    // 填充类别筛选下拉框
    const categories = [...new Set(photographyWorkList.map(w => w.category))];
    categories.forEach(category => {
        $("#categoryFilter").append(`<option value="${category}">${category}</option>`);
    });
    
    renderFullRanking("total");
    
    $("#tabTotal, #tabTournament, #tabEnded").click(function() {
        $("#tabTotal, #tabTournament, #tabEnded").removeClass("btn-primary").addClass("btn-default");
        $(this).removeClass("btn-default").addClass("btn-primary");
        
        const type = $(this).attr("id").replace("tab", "").toLowerCase();
        currentRankingType = type;
        currentPage = 1;
        
        // 动态过滤并填充选择赛事下拉框
        $("#tournamentSelect").html('<option value="">全部赛事</option>');
        tournamentList.forEach(tournament => {
            if (type === "ended" && tournament.status !== "ended") {
                return; // 已结束的赛事分类下，只展现已结束的赛事
            }
            if (type === "tournament" && tournament.status === "ended") {
                return; // 单赛事分类下，只展现进行中的赛事
            }
            const status = tournament.status === 'ended' ? ' [已结束]' : '';
            $("#tournamentSelect").append(`<option value="${tournament.id}">${tournament.name}${status}</option>`);
        });
        
        // 显示/隐藏筛选器
        if (type === "tournament" || type === "ended") {
            $("#tournamentFilter").show();
        } else {
            $("#tournamentFilter").hide();
        }
        
        renderFullRanking(type);
    });
    
    // 筛选器变化时重新渲染
    $("#tournamentSelect, #categoryFilter").change(function() {
        currentPage = 1;
        renderFullRanking(currentRankingType);
    });
}

function renderFullRanking(type) {
    let works = photographyWorkList.filter(w => w.status === "online");
    
    // 获取筛选条件
    const tournamentId = $("#tournamentSelect").val();
    const category = $("#categoryFilter").val();
    
    // 根据榜单类型筛选
    const now = new Date();
    switch(type) {
        case "week":
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            works = works.filter(w => new Date(w.createTime) >= weekAgo);
            break;
        case "month":
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            works = works.filter(w => new Date(w.createTime) >= monthAgo);
            break;
        case "tournament":
            // 只显示进行中赛事的作品
            const activeTournaments = tournamentList.filter(t => t.status === "active").map(t => t.id);
            if (tournamentId) {
                works = works.filter(w => w.tournamentId === Number(tournamentId));
            } else {
                works = works.filter(w => activeTournaments.includes(w.tournamentId));
            }
            break;
        case "ended":
            // 筛选已结束赛事的作品
            const endedTournaments = tournamentList.filter(t => t.status === "ended").map(t => t.id);
            if (tournamentId) {
                works = works.filter(w => w.tournamentId === Number(tournamentId));
            } else {
                works = works.filter(w => endedTournaments.includes(w.tournamentId));
            }
            break;
        default:
            break;
    }
    
    // 类别筛选
    if (category) {
        works = works.filter(w => w.category === category);
    }
    
    // 按票数排序
    works.sort((a, b) => b.voteCount - a.voteCount);
    
    // 分页
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageWorks = works.slice(startIndex, endIndex);
    
    let htmlStr = "";
    pageWorks.forEach((work, index) => {
        const globalIndex = startIndex + index;
        const rankClass = globalIndex === 0 ? "gold" : globalIndex === 1 ? "silver" : globalIndex === 2 ? "bronze" : "";
        const rankBadge = globalIndex === 0 ? "🥇 冠军" : globalIndex === 1 ? "🥈 亚军" : globalIndex === 2 ? "🥉 季军" : `第${globalIndex + 1}名`;
        
        const user = getLoginUser();
        const isAdmin = user && user.role === "admin";
        
        let voteBtnHtml = "";
        if (!isAdmin) {
            const hasVoted = hasVotedToday(work.id);
            const votesUsed = getTodayVoteCount();
            const tournament = work.tournamentId ? tournamentList.find(t => t.id === work.tournamentId) : null;
            const tournamentEnded = tournament && tournament.status === "ended";
            
            if (work.status !== "online") {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>不可投票</button>';
            } else if (tournamentEnded) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>赛事已结束</button>';
            } else if (votesUsed >= MAX_DAILY_VOTES) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>今日票数已用完</button>';
            } else if (hasVoted) {
                voteBtnHtml = '<button class="btn btn-sm btn-secondary flex-1" disabled>👍 已投票</button>';
            } else {
                voteBtnHtml = `<button class="btn btn-sm btn-success flex-1 rankingVoteBtn" data-id="${work.id}">👍 投票</button>`;
            }
        }
        
        htmlStr += `
        <div class="col-md-3 mb-4">
            <div class="card ranking-card ${rankClass}">
                <div class="card-body p-3">
                    <div class="ranking-badge">${rankBadge}</div>
                    <img src="${work.img}" class="w-100 rounded" style="height:180px;object-fit:cover;">
                    <h5 class="text-center text-white mt-3 font-bold">${work.workName}</h5>
                    <p class="text-center text-white-50 small">👤 ${work.authorNick}</p>
                    <p class="text-center text-white font-bold fs-4">🔥 ${work.voteCount}票</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-light flex-1 detailBtn" data-id="${work.id}">查看详情</button>
                        ${voteBtnHtml}
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    if (works.length === 0) {
        htmlStr = '<div class="col-12 text-center text-secondary py-5">暂无上榜作品</div>';
    }
    
    $("#rankingList").html(htmlStr);
    renderPagination(works.length, currentPage);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
    
    $(".rankingVoteBtn").click(function() {
        const workId = $(this).data("id");
        submitVote(workId);
        renderFullRanking(type);
    });
}

// 加载作品详情
async function loadWorkDetail() {
    try {
        await loadData();
        renderNotifications();
        initTheme();
        initBackToTop();
        initLightbox();
        
        console.log('=== 加载作品详情 ===');
        console.log('作品列表长度:', photographyWorkList.length);
        
        const urlParam = new URLSearchParams(window.location.search);
        const targetId = Number(urlParam.get("id"));
        console.log('目标作品ID:', targetId);
        
        const work = photographyWorkList.find(w => w.id === targetId);
        console.log('找到作品:', work);

        if (!work) {
            console.error('作品未找到，ID:', targetId);
            $("#detailBox").html('<div class="text-center text-danger py-5"><h3>作品未找到</h3><p>请返回上一页查看其他作品</p><button class="btn btn-primary mt-3" onclick="history.back()">返回</button></div>');
            return;
        }

        // 更新面包屑
        $(".breadcrumb").html(`
            <li><a href="index.html">首页</a></li>
            <li><a href="index.html?category=${work.category}">${work.category}</a></li>
            <li class="active">${work.workName}</li>
        `);

        const user = getLoginUser();
        const isAuthor = user && user.account === work.authorAccount;
        const isAdmin = user && user.role === "admin";
        const isPhotographer = user && user.role === "photographer";
        const canCertify = isAdmin && !work.onChain;
        
        const collected = !isAdmin && isCollected(work.id);
        
        const tournament = work.tournamentId ? tournamentList.find(t => t.id === work.tournamentId) : null;
        const tournamentEnded = tournament && tournament.status === "ended";
        
        const canVote = work.status === "online" && !hasVotedToday(work.id) && getTodayVoteCount() < MAX_DAILY_VOTES && !tournamentEnded;
        
        let voteBtnText = "👍 投票";
        let voteBtnDisabled = !canVote;
        
        if (work.status !== "online") {
            voteBtnDisabled = true;
            voteBtnText = work.status === "pending" ? "审核中（不可投票）" : "已下架（不可投票）";
        } else if (tournamentEnded) {
            voteBtnDisabled = true;
            voteBtnText = "赛事已结束（不可投票）";
        } else if (getTodayVoteCount() >= MAX_DAILY_VOTES) {
            voteBtnDisabled = true;
            voteBtnText = "今日票数已用完";
        } else if (hasVotedToday(work.id)) {
            voteBtnDisabled = true;
            voteBtnText = "👍 已投票";
        }
        
        const onChainStatus = work.onChain 
            ? '<span class="label label-success">✅ 已上链</span>' 
            : work.pendingOnChain 
                ? '<span class="label label-warning">⏳ 待上链</span>' 
                : '<span class="label label-danger">❌ 未存证</span>';
        
        const detailHtml = `
        <div class="row work-detail-row">
            <div class="col-lg-7 work-image-col">
                <div class="work-image-wrapper">
                    <img src="${work.img}" class="work-detail-img lightbox-trigger" 
                         data-src="${work.img}"
                         data-info="<h4>${work.workName}</h4><p>作者：${work.authorNick}</p>"
                         oncontextmenu="event.preventDefault(); alert('图片受版权保护，禁止下载');"
                         title="点击图片查看大图">
                    <div class="zoom-hint">🔍 点击放大</div>
                </div>
            </div>
            <div class="col-lg-5 work-info-col">
                <h2>${work.workName}</h2>
                <div class="mb-2">${onChainStatus}</div>
                <p><strong>作品分类：</strong>${work.category}</p>
                <p><strong>作者昵称：</strong><a href="person-info.html?author=${work.authorAccount}">${work.authorNick}</a></p>
                <p><strong>拍摄器材：</strong>${work.equipment || "未填写"}</p>
                <p><strong>当前票数：</strong><span class="text-danger fs-3">${work.voteCount}</span></p>
                <p><strong>创作时间：</strong>${work.createTime}</p>
                ${work.price ? `<p><strong>版权价格：</strong><span class="text-success fs-3">¥${work.price}</span></p>` : ''}
                <hr>
                <div class="bg-light p-3 rounded mb-3">
                    <h5>📋 链上存证信息</h5>
                    <p><strong>图片哈希：</strong><span class="font-mono text-primary small">${work.hash || "待生成"}</span></p>
                    <p><strong>交易哈希：</strong><span class="font-mono text-primary small">${work.txHash || "待上链"}</span></p>
                    <p><strong>区块高度：</strong><span class="text-secondary">${work.blockHeight || "-"}</span></p>
                    <p><strong>上链时间：</strong><span class="text-secondary">${work.chainTime || "-"}</span></p>
                </div>
                ${work.isPurchased ? `
                <div class="bg-success text-white p-3 rounded mb-3">
                    <h5>✅ 版权已购买</h5>
                    <p><strong>购买者：</strong>${work.buyerNick}</p>
                    <p><strong>购买时间：</strong>${work.purchaseTime}</p>
                    <p><strong>交易哈希：</strong><span class="font-mono text-xs">${work.purchaseTxHash}</span></p>
                </div>` : ''}
                <p><strong>作品简介：</strong>${work.desc}</p>
                <div class="mt-4 d-flex gap-3">
                    ${!isAdmin ? `<button class="btn btn-success" id="detailVoteBtn" ${voteBtnDisabled ? "disabled" : ""}>${voteBtnText}</button>` : ""}
                    ${!isAdmin ? `<button class="btn btn-info" id="detailCollectBtn">${collected ? "已收藏" : "收藏作品"}</button>` : ""}
                    ${canCertify ? `<button class="btn btn-warning" id="detailCertifyBtn">${work.pendingOnChain ? "⏳ 待确认" : "🔗 存证上链"}</button>` : ""}
                    ${!isAdmin && !isPhotographer && !work.buyerAccount && work.onChain === true ? `<button class="btn btn-primary" id="detailPurchaseBtn">💰 购买版权 (¥${work.price || 0})</button>` : ''}
                    <button class="btn btn-secondary" onclick="history.back()">返回</button>
                </div>
            </div>
        </div>
        `;
        $("#detailBox").html(detailHtml);

        $("#detailVoteBtn").click(function() {
            const user = getLoginUser();
            if (!user) {
                alert("登录后才能投票！");
                window.location.href = "login.html";
                return;
            }
            submitVote(targetId);
            loadWorkDetail();
        });

        $("#detailCollectBtn").click(function() {
            const user = getLoginUser();
            if (!user) {
                alert("登录后才能收藏！");
                window.location.href = "login.html";
                return;
            }
            const added = toggleCollection(targetId);
            if (added) {
                alert("收藏成功！");
            } else {
                alert("已取消收藏！");
            }
            loadWorkDetail();
        });

        $("#detailCertifyBtn").click(async function() {
            if (typeof certifyWork === 'function') {
                const result = await certifyWork(targetId);
                if (result.success) {
                    alert(`✅ ${result.message}\n交易哈希：${result.transactionHash}\n区块高度：${result.blockNumber}\n钱包地址：${result.walletAddress}`);
                    loadWorkDetail();
                } else {
                    alert(`❌ ${result.message}`);
                }
            } else {
                alert("区块链模块未加载，请刷新页面重试");
            }
        });

        $("#detailPurchaseBtn").click(async function() {
            await purchaseWork(targetId);
            loadWorkDetail();
        });

        if (isAdmin) {
            $("#commentInputArea").hide();
        } else {
            $("#commentInputArea").show();
        }

        renderComments(work);
    } catch (error) {
        console.error('加载作品详情失败:', error);
        $("#detailBox").html('<div class="text-center text-danger py-5"><h3>加载失败</h3><p>出现错误，请刷新页面重试</p><button onclick="window.location.reload()" class="btn btn-primary mt-3">刷新页面</button></div>');
    }
}

function renderComments(work) {
    let htmlStr = "";
    if (!work.comments || work.comments.length === 0) {
        htmlStr = '<div class="text-center text-secondary py-4">暂无评论，快来发表第一条评论吧</div>';
    } else {
        work.comments.forEach(comment => {
            let replyHtml = "";
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    const isOwnReply = getLoginUser() && (getLoginUser().account === reply.userId || getLoginUser().nickName === reply.userNick);
                    replyHtml += `
                    <div class="ml-4 mt-2 p-2 bg-light rounded d-flex justify-content-between align-items-center">
                        <small><strong>${reply.userNick}</strong>：${reply.content}</small>
                        ${isOwnReply ? `<button class="btn btn-link btn-xs text-danger deleteReplyBtn" data-comment-id="${comment.id}" data-reply-id="${reply.id}" style="padding:0;margin-left:10px;text-decoration:none;">删除</button>` : ""}
                    </div>
                    `;
                });
            }
            
            const isAuthor = getLoginUser() && getLoginUser().account === work.authorAccount;
            const isOwnComment = getLoginUser() && (getLoginUser().account === comment.userId || getLoginUser().nickName === comment.userNick);
            
            htmlStr += `
            <div class="card comment-card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <a href="person-info.html?author=${comment.userId}" class="font-bold text-primary">👤 ${comment.userNick}</a>
                        <span class="text-secondary small">🕐 ${comment.time}</span>
                    </div>
                    <p class="mt-2 mb-2">${comment.content}</p>
                    ${replyHtml}
                    <div class="mt-3">
                        ${isAuthor ? `<button class="btn btn-sm btn-primary replyBtn" data-comment-id="${comment.id}">💬 回复</button>` : ""}
                        ${isOwnComment ? `<button class="btn btn-sm btn-danger deleteCommentBtn" data-comment-id="${comment.id}">🗑️ 删除</button>` : ""}
                    </div>
                </div>
            </div>
            `;
        });
    }
    $("#commentList").html(htmlStr);
    
    $(".deleteCommentBtn").click(function() {
        const commentId = $(this).data("comment-id");
        if (confirm("确定要删除这条评论吗？")) {
            const commentIndex = work.comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                work.comments.splice(commentIndex, 1);
                localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                alert("评论已删除！");
                renderComments(work);
            }
        }
    });

    $(".deleteReplyBtn").click(function() {
        const commentId = $(this).data("comment-id");
        const replyId = $(this).data("reply-id");
        if (confirm("确定要删除这条回复吗？")) {
            const comment = work.comments.find(c => c.id === commentId);
            if (comment && comment.replies) {
                const replyIndex = comment.replies.findIndex(r => r.id === replyId);
                if (replyIndex !== -1) {
                    comment.replies.splice(replyIndex, 1);
                    localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                    alert("回复已删除！");
                    renderComments(work);
                }
            }
        }
    });

    $(".replyBtn").click(function() {
        const commentId = $(this).data("comment-id");
        const replyContent = prompt("请输入回复内容：");
        if (replyContent === null) return; // 取消输入
        const content = replyContent.trim();
        if (!content) {
            alert("回复内容不能为空！");
            return;
        }
        
        const comment = work.comments.find(c => c.id === commentId);
        if (comment) {
            if (!comment.replies) {
                comment.replies = [];
            }
            const user = getLoginUser();
            const replyId = comment.replies.length > 0 ? Math.max(...comment.replies.map(r => r.id)) + 1 : 1;
            comment.replies.push({
                id: replyId,
                userId: user.account,
                userNick: user.nickName || user.account,
                content: content,
                time: new Date().toLocaleString()
            });
            localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
            alert("回复成功！");
            renderComments(work);
        }
    });
}

function submitComment() {
    const user = getLoginUser();
    if (!user) {
        alert("登录后才能评论！");
        window.location.href = "login.html";
        return;
    }
    const content = $("#commentInput").val().trim();
    if (!content) {
        alert("请输入评论内容");
        return;
    }
    const urlParam = new URLSearchParams(window.location.search);
    const workId = Number(urlParam.get("id"));
    const work = photographyWorkList.find(w => w.id === workId);
    
    if (!work.comments) work.comments = [];
    work.comments.push({
        id: Date.now(),
        userId: user.account,
        userNick: user.nickName,
        content,
        time: new Date().toLocaleString(),
        replies: []
    });
    localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));

    $("#commentInput").val("");
    renderComments(work);
}

// 加载赛事详情页
async function loadTournamentDetail() {
    await loadData();
    renderNotifications();
    initTheme();
    
    const urlParam = new URLSearchParams(window.location.search);
    const tournamentId = Number(urlParam.get("id"));
    const tournament = tournamentList.find(t => t.id === tournamentId);
    
    if (!tournament) {
        window.location.href = "404.html";
        return;
    }
    
    const user = getLoginUser();
    
    const statusBadge = tournament.status === "active" 
        ? '<span class="label label-success">⚡ 进行中</span>' 
        : '<span class="label label-default">🏁 已结束</span>';
    
    const categoriesHtml = tournament.categories && tournament.categories.length > 0 
        ? `<div class="category-tags">${tournament.categories.map(c => `<span class="category-tag">${c}</span>`).join('')}</div>` 
        : '';
    
    const prizesHtml = tournament.prizes && tournament.prizes.length > 0 
        ? `<div class="mt-4">
            <h4>🏅 奖项设置</h4>
            <ul class="prize-list">
                ${tournament.prizes.map(p => `<li><strong>${p.rank}：</strong>${p.prize}</li>`).join('')}
            </ul>
           </div>` 
        : '';
    
    const detailHtml = `
    <div class="tournament-detail-wrapper">
        <div class="tournament-header">
            <div class="tournament-icon">🏆</div>
            <div class="tournament-title-section">
                <h1>${tournament.name}</h1>
                ${categoriesHtml}
            </div>
            <div class="tournament-status-badge">${statusBadge}</div>
        </div>
        
        <div class="tournament-content">
            <div class="tournament-description">
                ${tournament.description}
            </div>
            
            <div class="tournament-info-grid">
                <div class="info-item">
                    <div class="info-icon">📅</div>
                    <div class="info-label">投稿时间</div>
                    <div class="info-value">${tournament.startTime} ~ ${tournament.endTime}</div>
                </div>
                <div class="info-item">
                    <div class="info-icon">🗳️</div>
                    <div class="info-label">投票时间</div>
                    <div class="info-value">${tournament.voteStart} ~ ${tournament.voteEnd}</div>
                </div>
                <div class="info-item">
                    <div class="info-icon">📊</div>
                    <div class="info-label">赛事状态</div>
                    <div class="info-value">${tournament.status === "active" ? "进行中" : "已结束"}</div>
                </div>
                <div class="info-item stat-highlight">
                    <div class="info-icon">🎞️</div>
                    <div class="info-label">参赛作品数</div>
                    <div class="info-value">${tournament.worksCount || 0}</div>
                </div>
            </div>
            
            ${prizesHtml}
            
            <div class="tournament-actions">
                <button class="btn btn-secondary" onclick="history.back()">返回</button>
                ${tournament.status === "active" && user?.role !== "admin" ? '<button class="btn btn-success" id="tournamentPublishBtn">立即投稿</button>' : ''}
            </div>
        </div>
    </div>
    `;
    $("#tournamentDetail").html(detailHtml);
    
    // 加载该赛事的作品
    const works = photographyWorkList.filter(w => w.tournamentId === tournamentId && w.status === "online");
    let worksHtml = "";
    if (works.length === 0) {
        worksHtml = '<div class="col-12 text-center text-secondary">暂无参赛作品</div>';
    } else {
        works.forEach(work => {
            worksHtml += `
            <div class="col-md-3 mb-4">
                <div class="card shadow">
                    <div class="card-body p-0">
                        <img src="${work.img}" class="w-100" style="height:200px;object-fit:cover;">
                    </div>
                    <div class="card-footer">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">👤 ${work.authorNick}</p>
                        <p class="text-danger font-bold">🔥 ${work.voteCount}票</p>
                        <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                    </div>
                </div>
            </div>
            `;
        });
    }
    $("#tournamentWorksList").html(worksHtml);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
    
    $("#tournamentPublishBtn").click(function() {
        const user = getLoginUser();
        if (!user) {
            alert("登录后才能投稿！");
            window.location.href = "login.html";
            return;
        }
        window.location.href = `publish.html?tournament=${tournamentId}`;
    });
    
    // 获奖榜单（取前3名）
    if (tournament.status === "active") {
        $("#tournamentWinners").hide();
    } else {
        $("#tournamentWinners").show();
        const winners = works.sort((a, b) => b.voteCount - a.voteCount).slice(0, 3);
        let winnerHtml = "";
        if (winners.length === 0) {
            winnerHtml = '<div class="col-12 text-center text-secondary">暂无获奖作品</div>';
        } else {
            winners.forEach((work, index) => {
                const rankBadge = index === 0 ? "🥇 冠军" : index === 1 ? "🥈 亚军" : "🥉 季军";
                winnerHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card ranking-card ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}">
                        <div class="card-body p-3 text-center">
                            <div class="ranking-badge">${rankBadge}</div>
                            <img src="${work.img}" class="w-100 rounded" style="height:150px;object-fit:cover;">
                            <h5 class="text-white mt-2">${work.workName}</h5>
                            <p class="text-white font-bold">🔥 ${work.voteCount}票</p>
                            <button class="btn btn-sm btn-light detailBtn" data-id="${work.id}">查看详情</button>
                        </div>
                    </div>
                </div>
                `;
            });
        }
        $("#winnerList").html(winnerHtml);
    }
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

// 加载投稿页面
async function loadPublishPage() {
    await loadData();
    renderNotifications();
    initTheme();
    
    const user = getLoginUser();
    if (!user) {
        alert("请先登录后再投稿");
        window.location.href = "login.html";
        return;
    }
    
    if (user.role !== "photographer") {
        $("#publishContent").hide();
        $("#noPermissionContent").show();
        return;
    }
    
    const urlParam = new URLSearchParams(window.location.search);
    const preSelectedTournament = urlParam.get("tournament");
    
    const activeTournaments = tournamentList.filter(t => t.status === "active");
    let options = '<option value="">请选择赛事</option>';
    activeTournaments.forEach(t => {
        const selected = preSelectedTournament && Number(preSelectedTournament) === t.id ? 'selected' : '';
        options += `<option value="${t.id}" ${selected}>${t.name}</option>`;
    });
    $("#tournament").html(options);
    
    // 图片预览
    $("#imgInput").change(function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                $("#previewImg").attr("src", evt.target.result).show();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 表单提交
    $("#publishForm").submit(async function(e) {
        e.preventDefault();
        try {
            await submitWork();
        } catch (error) {
            console.error('投稿失败:', error);
            alert('投稿失败：' + error.message);
        }
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImage(base64, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.onerror = reject;
        img.src = base64;
    });
}

async function submitWork() {
    const user = getLoginUser();
    if (!user) {
        throw new Error("请先登录");
    }
    
    const workName = $("#workName").val().trim();
    const category = $("#category").val();
    const equipment = $("#equipment").val().trim();
    const priceInput = $("#price").val();
    const price = priceInput !== "" ? Number(priceInput) : 0;
    const tournamentId = $("#tournament").val();
    const desc = $("#desc").val().trim();
    const imgFile = $("#imgInput")[0].files[0];
    
    if (isNaN(price) || price < 0) {
        throw new Error("请输入有效的版权价格（必须大于或等于0）");
    }
    
    if (!workName || !desc || !imgFile || !tournamentId) {
        throw new Error("请填写作品名称、简介、选择赛事并上传图片");
    }
    
    const tournament = tournamentList.find(t => t.id === Number(tournamentId));
    if (!tournament) {
        throw new Error("选择的赛事不存在");
    }
    if (tournament.status === "ended") {
        throw new Error("该赛事已结束，无法投稿");
    }
    
    let imgBase64 = await readFileAsBase64(imgFile);
    
    // 降低压缩阈值到 500KB，并自动进行适当压缩以节省 LocalStorage 空间
    if (imgBase64.length > 500 * 1024) {
        console.log('图片较大，自动压缩中...');
        imgBase64 = await compressImage(imgBase64, 1000, 0.7);
        console.log('压缩后大小:', (imgBase64.length / 1024).toFixed(2), 'KB');
    }
    
    if (imgBase64.length > 1.5 * 1024 * 1024) {
        throw new Error("图片体积过大（即使压缩后仍超过 1.5MB 限制），请选择分辨率较低的图片或手动压缩后再上传");
    }
    
    const hash = generateHash();
    const txHash = generateHash();
    
    const newWork = {
        id: Date.now(),
        workName,
        img: imgBase64,
        authorAccount: user.account,
        authorNick: user.nickName,
        category,
        desc,
        voteCount: 0,
        status: "pending",
        equipment,
        price,
        walletAddress: user.walletAddress || "",
        createTime: new Date().toISOString().split("T")[0],
        hash,
        txHash,
        tournamentId: Number(tournamentId),
        comments: [],
        collectedBy: []
    };
    
    photographyWorkList.push(newWork);
    
    try {
        localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            const myWorksCount = photographyWorkList.filter(w => w.authorAccount === user.account).length;
            if (myWorksCount <= 1) { // 包含刚刚 push 进去的这一个
                throw new Error("投稿失败：图片数据过大导致浏览器存储空间不足，请尝试上传更小尺寸的图片或清除浏览器缓存后再试");
            }
            throw new Error("投稿失败：存储空间已满，请删除一些旧作品后再投稿");
        }
        throw new Error("保存作品失败：" + e.message);
    }

    $("#imageHash").text(hash);
    $("#txHash").text(txHash);
    $("#blockchainInfo").show();

    alert("投稿成功！作品已提交审核");
    window.location.href = "index.html";
}

// ========== 个人中心相关函数 ==========

function renderPersonInfo() {
    const user = getLoginUser();
    if (!user) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
    }

    if (!user.walletAddress) {
        const chars = '0123456789abcdef';
        user.walletAddress = '0x' + Array.from({ length: 40 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        user.walletPrivateKey = '0x' + Array.from({ length: 64 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
        localStorage.setItem(`wallet_${user.account}`, JSON.stringify({
            address: user.walletAddress,
            privateKey: user.walletPrivateKey,
            createdAt: new Date().toISOString()
        }));
    }

    $("#account").val(user.account);
    $("#nickName").val(user.nickName);
    $("#phone").val(user.phone || "");
    $("#bio").val(user.bio || "");

    $("#menuAdmin").show();
}

function addFundsFlowRecord(account, type, amountEth, amountCny, title, description, txHash) {
    const records = JSON.parse(localStorage.getItem(`funds_flow_${account}`) || '[]');
    records.unshift({
        type: type,
        amountEth: amountEth || 0,
        amountCny: amountCny || 0,
        title: title,
        description: description,
        txHash: txHash,
        time: new Date().toLocaleString()
    });
    localStorage.setItem(`funds_flow_${account}`, JSON.stringify(records));
}

let walletRefreshInterval = null;

async function renderWalletPage() {
    const user = getLoginUser();
    if (!user) {
        alert("请先登录！");
        window.location.href = "login.html";
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
        if (accountIndexMap[user.account] !== undefined) {
            accountIndex = accountIndexMap[user.account];
        } else {
            let hash = 0;
            for (let i = 0; i < user.account.length; i++) {
                hash = user.account.charCodeAt(i) + ((hash << 5) - hash);
            }
            accountIndex = Math.abs(hash) % accounts.length;
            if (accountIndex === 0 && accounts.length > 1) {
                accountIndex = 1; // 避免与默认管理员地址 0 冲突
            }
        }
        const ganacheAddress = accounts[accountIndex];
        
        console.log(`=== 账号映射 ===`);
        console.log(`用户账号: ${user.account}`);
        console.log(`Ganache账户索引: ${accountIndex}`);
        console.log(`Ganache地址: ${ganacheAddress}`);
        console.log(`所有Ganache账户:`, accounts);
        console.log(`当前钱包地址: ${user.walletAddress}`);
        
        if (ganacheAddress && user.walletAddress !== ganacheAddress) {
            console.log(`钱包地址更新: ${user.walletAddress} -> ${ganacheAddress}`);
            user.walletAddress = ganacheAddress;
            localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
            setLoginUser(user);
        }
    } catch (error) {
        console.log('连接Ganache失败，使用随机生成地址:', error.message);
        const chars = '0123456789abcdef';
        user.walletAddress = '0x' + Array.from({ length: 40 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        user.walletPrivateKey = '0x' + Array.from({ length: 64 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
        setLoginUser(user);
    }

    await updateWalletBalances(user);
    
    if (walletRefreshInterval) {
        clearInterval(walletRefreshInterval);
    }
    walletRefreshInterval = setInterval(async () => {
        const currentUser = getLoginUser();
        if (currentUser && currentUser.walletAddress) {
            await updateWalletBalances(currentUser);
        }
    }, 3000);
    
    let records = JSON.parse(localStorage.getItem(`funds_flow_${user.account}`) || '[]');
    
    if (user.role === "photographer") {
        records = records.filter(r => r.type !== 'purchase');
    }
    
    let htmlStr = "";
    if (records.length === 0) {
        htmlStr = '<div style="text-align: center; padding: 40px; color: #95a5a6;"><div style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;">📊</div><div style="font-size: 14px;">暂无资产流水记录</div></div>';
    } else {
        records.forEach(record => {
            const icon = record.type === 'purchase' ? '🛒' :
                         record.type === 'receive' ? '📬' :
                         record.type === 'register_bonus' ? '🎁' : '💳';
            const isIncome = record.type === 'receive' || record.type === 'register_bonus';
            const amountStr = isIncome ? `+¥${record.amountCny.toFixed(2)}` : `-¥${record.amountCny.toFixed(2)}`;
            const amountColor = isIncome ? '#27ae60' : '#e74c3c';

            htmlStr += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    <div style="font-size: 24px; margin-right: 12px;">${icon}</div>
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: #212529;">${record.description}</div>
                        <div style="font-size: 11px; color: #6c757d;">${record.time}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace; color: ${amountColor};">${amountStr}</div>
                    ${record.txHash ? `<div style="font-size: 10px; color: #6c757d; font-family: 'Courier New', monospace; margin-top: 2px;">${record.txHash}</div>` : ''}
                </div>
            </div>
            `;
        });
    }
    $("#walletFlowList").html(htmlStr);
    
    if (user.role === "photographer") {
        $("#copyrightTradeSection").hide();
    } else {
        $("#copyrightTradeSection").show();
    }
}

async function updateWalletBalances(user, forceLocal = false) {
    let ethBalance = parseFloat(user.ethBalance || 0);
    
    console.log(`=== 更新钱包余额 ===`);
    console.log(`用户: ${user.account}`);
    console.log(`钱包地址: ${user.walletAddress}`);
    console.log(`强制本地模式: ${forceLocal}`);
    
    let connectionStatus = 'unknown';
    let connectionMessage = '';
    
    try {
        await initWeb3();
        const realBalance = await getAccountBalance(user.walletAddress);
        const realEthBalance = parseFloat(realBalance);
        
        connectionStatus = 'connected';
        connectionMessage = `✅ 已连接 Ganache`;
        console.log(`链上实际余额: ${realBalance} ETH`);
        
        ethBalance = realEthBalance;
        user.ethBalance = ethBalance;
        localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
        setLoginUser(user);
        
    } catch (error) {
        connectionStatus = 'failed';
        connectionMessage = `❌ 连接失败: ${error.message}`;
        console.error('获取链上余额失败:', error.message);
        console.log('使用本地存储的余额:', ethBalance);
    }

    const cnyBalance = parseFloat(user.cnyBalance || 1000);
    const ethToCny = ethBalance * ETH_RATE;
    const totalAsset = ethToCny + cnyBalance;

    console.log(`显示余额: ¥${cnyBalance.toFixed(2)} / ${ethBalance.toFixed(4)} ETH / ¥${totalAsset.toFixed(2)}`);
    
    $("#walletCnyBalance").text(`¥${cnyBalance.toFixed(2)}`);
    $("#walletEthBalance").text(`${ethBalance.toFixed(4)} ETH`);
    $("#walletTotalAsset").text(`¥${totalAsset.toFixed(2)}`);
    $("#walletAddressInput").val(user.walletAddress);
    
    if ($("#ganacheStatus").length > 0) {
        const statusColor = connectionStatus === 'connected' ? '#27ae60' : '#e74c3c';
        $("#ganacheStatus").html(`<span style="color: ${statusColor}; font-weight: bold;">${connectionMessage}</span>`);
    }
    
    return ethBalance;
}

function copyWalletAddress() {
    const address = $("#walletAddressInput").val();
    if (address) {
        navigator.clipboard.writeText(address).then(() => {
            alert("✅ 钱包地址已复制到剪贴板！");
        }).catch(() => {
            alert("复制失败，请手动复制");
        });
    }
}

async function testGanacheConnection() {
    const statusDiv = $("#ganacheStatus");
    statusDiv.html(`<span style="color: #f39c12;">⏳ 正在测试连接...</span>`);
    
    try {
        await initWeb3();
        
        const blockNumber = await web3.eth.getBlockNumber();
        const accounts = await web3.eth.getAccounts();
        
        const user = getLoginUser();
        let userBalance = 'N/A';
        if (user && user.walletAddress) {
            userBalance = await getAccountBalance(user.walletAddress);
        }
        
        let accountList = '';
        accounts.forEach((acc, idx) => {
            accountList += `${idx}. ${acc.substring(0, 10)}...${acc.substring(38)}\n`;
        });
        
        const message = `✅ Ganache连接成功！\n\n当前区块: ${blockNumber}\n账户数量: ${accounts.length}\n\n您的余额: ${userBalance} ETH\n\n所有Ganache账户:\n${accountList}`;
        
        statusDiv.html(`<span style="color: #27ae60; font-weight: bold;">✅ 已连接 Ganache (区块: ${blockNumber})</span>`);
        alert(message);
        
    } catch (error) {
        statusDiv.html(`<span style="color: #e74c3c; font-weight: bold;">❌ 连接失败: ${error.message}</span>`);
        alert(`❌ Ganache连接失败！\n\n错误信息: ${error.message}\n\n请确保:\n1. Ganache已启动\n2. RPC地址为 http://127.0.0.1:7545\n3. 防火墙未阻止连接`);
    }
}

function exportPrivateKey() {
    const user = getLoginUser();
    if (!user || !user.walletPrivateKey) {
        alert("您还没有钱包地址！");
        return;
    }

    if (!confirm("⚠️ 警告：私钥是您钱包的唯一凭证，请务必妥善保管！\n\n确定要导出私钥吗？")) {
        return;
    }

    navigator.clipboard.writeText(user.walletPrivateKey).then(() => {
        alert("✅ 私钥已复制到剪贴板！\n\n请立即保存到安全位置！");
    }).catch(() => {
        alert("私钥：" + user.walletPrivateKey + "\n\n请手动复制并保存！");
    });
}

async function resetWalletAddress() {
    if (!confirm("确定要重置钱包地址吗？\n\n这将重新绑定到新的Ganache账户，原有余额将被新账户余额替换。")) {
        return;
    }
    
    const user = getLoginUser();
    if (!user) {
        alert("请先登录！");
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
        if (accountIndexMap[user.account] !== undefined) {
            accountIndex = accountIndexMap[user.account];
        } else {
            let hash = 0;
            for (let i = 0; i < user.account.length; i++) {
                hash = user.account.charCodeAt(i) + ((hash << 5) - hash);
            }
            accountIndex = Math.abs(hash) % accounts.length;
            if (accountIndex === 0 && accounts.length > 1) {
                accountIndex = 1;
            }
        }
        
        const newAddress = accounts[accountIndex];
        const newBalance = await getAccountBalance(newAddress);
        
        user.walletAddress = newAddress;
        user.ethBalance = parseFloat(newBalance);
        
        localStorage.setItem(`photography_user_${user.account}`, JSON.stringify(user));
        setLoginUser(user);
        
        await updateWalletBalances(user);
        
        alert(`✅ 钱包地址重置成功！\n\n新地址：${newAddress}\n新余额：${newBalance} ETH`);
    } catch (error) {
        console.error('重置钱包失败:', error);
        alert('重置钱包失败：' + error.message);
    }
}

function verifyChainAssets() {
    const user = getLoginUser();
    if (!user || !user.walletAddress) {
        alert("您还没有钱包地址！");
        return;
    }

    alert(`🔍 正在核验链上资产...\n\n钱包地址：${user.walletAddress}\n\n当前余额：${parseFloat(user.ethBalance || 0).toFixed(4)} ETH\n\n交易记录：正在查询...`);
}

function viewWalletCert() {
    const user = getLoginUser();
    if (!user || !user.walletAddress) {
        alert("您还没有钱包地址！");
        return;
    }

    alert(`📄 钱包存证信息\n\n钱包地址：${user.walletAddress}\n创建时间：${localStorage.getItem(`wallet_${user.account}`) ? JSON.parse(localStorage.getItem(`wallet_${user.account}`)).createdAt : '未知'}\n状态：已激活\n\n版权交易自动结算：已开启`);
}

function viewBuyableWorks() {
    window.location.href = "market.html";
}

function viewMyOrders() {
    $("#menuPurchases").click();
}

function copyTxHash(txHash) {
    navigator.clipboard.writeText(txHash).then(() => {
        alert('交易哈希已复制到剪贴板');
    }).catch(() => {
        alert('复制失败，请手动复制');
    });
}

async function switchMenu(menuId) {
    $(".list-group-item").removeClass("active");
    $(`#${menuId}`).addClass("active");
    
    if (menuId === "menuFeedback") {
        showFeedbackModal();
        return;
    }
    
    $("#contentProfile, #contentWallet, #contentMyWorks, #contentCollections, #contentVotes, #contentMyComments, #contentEarnings, #contentProfilePage").hide();
    $(`#content${menuId.replace("menu", "")}`).show();
    
    if (menuId === "menuWallet") {
        await renderWalletPage();
    } else if (menuId === "menuMyWorks") {
        $("#tabPending, #tabOffline").removeClass("btn-primary").addClass("btn-default");
        $("#tabOnline").removeClass("btn-default").addClass("btn-primary");
        renderMyWorks("online");
    } else if (menuId === "menuCollections") {
        renderCollections();
    } else if (menuId === "menuVotes") {
        renderVoteRecords();
    } else if (menuId === "menuMyComments") {
        renderMyComments();
    } else if (menuId === "menuEarnings") {
        renderEarnings();
    } else if (menuId === "menuProfilePage") {
        renderProfilePage();
    } else if (menuId === "menuFeedback") {
        showFeedbackModal();
    } else if (menuId === "menuAdmin") {
        window.location.href = "admin.html";
    }
}

let feedbackList = [];

function loadFeedbackList() {
    const stored = localStorage.getItem("feedbackList");
    if (stored) {
        feedbackList = JSON.parse(stored);
    } else {
        feedbackList = [];
    }
}

function saveFeedbackList() {
    localStorage.setItem("feedbackList", JSON.stringify(feedbackList));
}

function showFeedbackModal() {
    const user = getLoginUser();
    
    loadFeedbackList();
    const myFeedbacks = feedbackList.filter(f => f.userId === (user ? (user.id || user.account) : ""));
    
    const modalHtml = `
    <div class="modal fade" id="feedbackModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">📝 意见反馈</h4>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs">
                        <li class="active"><a data-toggle="tab" href="#tabSubmit">提交新反馈</a></li>
                        <li><a data-toggle="tab" href="#tabHistory">我的反馈记录</a></li>
                    </ul>
                    <div class="tab-content mt-3">
                        <div id="tabSubmit" class="tab-pane fade in active">
                            <div class="form-group">
                                <label>反馈标题 <span style="color:red;">*</span></label>
                                <input type="text" id="feedbackTitle" class="form-control" placeholder="请输入反馈标题">
                            </div>
                            <div class="form-group">
                                <label>反馈类型 <span style="color:red;">*</span></label>
                                <select id="feedbackType" class="form-control">
                                    <option value="">请选择反馈类型</option>
                                    <option value="tournament">🏆 赛事建议</option>
                                    <option value="certify">⛓️ 存证功能问题</option>
                                    <option value="market">💰 版权集市</option>
                                    <option value="bug">🐛 系统bug</option>
                                    <option value="other">💡 其他建议</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>详细建议内容 <span style="color:red;">*</span></label>
                                <textarea id="feedbackContent" class="form-control" rows="5" placeholder="请详细描述您的建议或问题..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>联系方式（选填）</label>
                                <input type="text" id="feedbackContact" class="form-control" placeholder="手机号或账号，方便我们联系您">
                            </div>
                        </div>
                        <div id="tabHistory" class="tab-pane fade">
                            ${renderFeedbackHistory(myFeedbacks)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">关闭</button>
                    <button type="button" class="btn btn-primary" id="submitFeedbackBtn">提交反馈</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("body").append(modalHtml);
    $("#feedbackModal").modal("show");
    
    $("#submitFeedbackBtn").click(function() {
        const title = $("#feedbackTitle").val().trim();
        const type = $("#feedbackType").val();
        const content = $("#feedbackContent").val().trim();
        const contact = $("#feedbackContact").val().trim();
        
        if (!title) {
            alert("请输入反馈标题");
            return;
        }
        if (!type) {
            alert("请选择反馈类型");
            return;
        }
        if (!content) {
            alert("请输入详细建议内容");
            return;
        }
        
        loadFeedbackList();
        const feedback = {
            id: Date.now(),
            userId: user ? (user.id || user.account) : "",
            userName: user ? (user.nickName || user.account) : "匿名用户",
            userRole: user ? user.role : "guest",
            title: title,
            type: type,
            content: content,
            contact: contact,
            time: new Date().toLocaleString(),
            status: "unread",
            reply: ""
        };
        
        feedbackList.unshift(feedback);
        saveFeedbackList();
        
        $("#feedbackModal").modal("hide");
        alert("反馈提交成功！感谢您的建议，我们会尽快处理。");
    });
    
    $("#feedbackModal").on("hidden.bs.modal", function() {
        $(this).remove();
    });
}

function renderFeedbackHistory(feedbacks) {
    if (feedbacks.length === 0) {
        return '<div class="text-center text-secondary" style="padding: 40px;">暂无反馈记录</div>';
    }
    
    const typeLabels = {
        "tournament": "🏆 赛事建议",
        "certify": "⛓️ 存证功能问题",
        "market": "💰 版权集市",
        "bug": "🐛 系统bug",
        "other": "💡 其他建议"
    };
    
    let html = "";
    feedbacks.forEach(feedback => {
        html += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title">${feedback.title}</h5>
                    <span class="label ${feedback.status === 'unread' ? 'label-warning' : 'label-success'}">
                        ${feedback.status === 'unread' ? '未回复' : '已回复'}
                    </span>
                </div>
                <p class="text-secondary small mt-1">
                    ${typeLabels[feedback.type]} | ${feedback.time}
                </p>
                <p class="card-text mt-2">${feedback.content}</p>
                ${feedback.reply ? `
                <div class="mt-3 p-3 bg-success-light rounded">
                    <p class="text-success small font-weight-bold">管理员回复:</p>
                    <p>${feedback.reply}</p>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    });
    
    return html;
}

async function renderMyWorks(status) {
    const user = getLoginUser();
    if (!user) {
        console.error('renderMyWorks: user is null');
        return;
    }
    
    const storageWorks = JSON.parse(localStorage.getItem("photographyWorks") || "[]");
    console.log('renderMyWorks: storageWorks count:', storageWorks.length);
    console.log('renderMyWorks: user.account:', user.account);
    console.log('renderMyWorks: status:', status);
    
    const works = storageWorks.filter(w => w.authorAccount === user.account && w.status === status);
    console.log('renderMyWorks: filtered works count:', works.length);
    
    let htmlStr = "";
    if (works.length === 0) {
        htmlStr = '<div class="text-center text-secondary">暂无作品</div>';
    } else {
        works.forEach(work => {
            htmlStr += `
            <div class="card mb-3 cursor-pointer" data-id="${work.id}" style="cursor:pointer;">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${work.img}" class="w-100" style="height:100px;object-fit:cover;">
                        </div>
                        <div class="col-md-6">
                            <h5>${work.workName}</h5>
                            <p class="text-secondary small" style="margin-bottom:4px;">分类：${work.category}</p>
                            <p class="text-secondary small" style="margin-bottom:4px;">票数：${work.voteCount}</p>
                            <p class="text-secondary small" style="margin-bottom:4px;">版权价格：<strong class="text-success">¥${work.price || 0}</strong></p>
                            <p class="text-secondary small" style="margin-bottom:4px;">状态：${work.status === "pending" ? "待审核" : work.status === "online" ? "已上线" : "已下架"}</p>
                            ${work.status === "offline" && work.rejectReason ? `<p class="text-danger small" style="margin-bottom:4px;">驳回理由：${work.rejectReason}</p>` : ''}
                        </div>
                        <div class="col-md-3" style="display: flex; flex-direction: column; gap: 6px;">
                            <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                            <button class="btn btn-sm btn-warning editPriceBtn" data-id="${work.id}">修改版权价格</button>
                            ${work.status === "online" ? '<button class="btn btn-sm btn-danger offlineBtn" data-id="' + work.id + '">下架作品</button>' : ""}
                            ${work.status === "offline" ? '<button class="btn btn-sm btn-danger deleteBtn" data-id="' + work.id + '">删除作品</button>' : ""}
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
    }
    $("#myWorksList").html(htmlStr);
    
    $("#myWorksList").off("click", ".card[data-id]");
    $("#myWorksList").on("click", ".card[data-id]", function(e) {
        if ($(e.target).closest(".btn").length === 0) {
            const workId = $(this).data("id");
            openWorkDetailModal(workId);
        }
    });
    
    $("#myWorksList").off("click", ".detailBtn");
    $("#myWorksList").on("click", ".detailBtn", function() {
        const workId = $(this).data("id");
        openWorkDetailModal(workId);
    });

    $("#myWorksList").off("click", ".editPriceBtn");
    $("#myWorksList").on("click", ".editPriceBtn", function() {
        const id = Number($(this).data("id"));
        const work = photographyWorkList.find(w => w.id === id);
        if (work) {
            const newPrice = prompt(`请输入新的版权价格（当前价格：¥${work.price || 0}）:`, work.price || 0);
            if (newPrice !== null) {
                const parsedPrice = Number(newPrice);
                if (isNaN(parsedPrice) || parsedPrice < 0) {
                    alert("请输入有效的版权价格（大于或等于0）");
                    return;
                }
                work.price = parsedPrice;
                localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                alert("版权价格修改成功！");
                renderMyWorks(status);
            }
        }
    });

    $("#myWorksList").off("click", ".offlineBtn");
    $("#myWorksList").on("click", ".offlineBtn", function() {
        const id = Number($(this).data("id"));
        if (confirm("确定要下架该作品吗？")) {
            const work = photographyWorkList.find(w => w.id === id);
            if (work) {
                work.status = "offline";
                localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                alert("作品下架成功！");
                renderMyWorks(status);
            }
        }
    });

    $("#myWorksList").off("click", ".deleteBtn");
    $("#myWorksList").on("click", ".deleteBtn", function() {
        const id = Number($(this).data("id"));
        if (confirm("确定要删除该作品吗？删除后无法恢复！")) {
            const workIndex = photographyWorkList.findIndex(w => w.id === id);
            if (workIndex !== -1) {
                photographyWorkList.splice(workIndex, 1);
                localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                alert("作品删除成功！");
                renderMyWorks(status);
            }
        }
    });
}

function renderMyComments() {
    loadData();
    const user = getLoginUser();
    if (!user) return;
    
    const commentedWorks = photographyWorkList.filter(work => 
        work.comments && work.comments.some(comment => comment.userId === user.account)
    );
    
    let htmlStr = "";
    if (commentedWorks.length === 0) {
        htmlStr = '<div class="text-center text-secondary py-4">暂无评论记录</div>';
    } else {
        commentedWorks.forEach(work => {
            const userComments = work.comments.filter(comment => comment.userId === user.account);
            let commentsHtml = "";
            userComments.forEach(c => {
                commentsHtml += `
                <div style="background:#f8f9fa; padding:10px; border-radius:6px; margin-top:5px; font-size:12px; position:relative;">
                    <p style="margin:0; color:#333;">${c.content}</p>
                    <small class="text-secondary" style="font-size:10px;">评论时间：${c.time}</small>
                </div>
                `;
            });
            
            htmlStr += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${work.img}" class="w-100" style="height:100px;object-fit:cover;border-radius:6px;">
                        </div>
                        <div class="col-md-6">
                            <h5>${work.workName}</h5>
                            <p class="text-secondary small" style="margin-bottom:8px;">作者：${work.authorNick}</p>
                            <div>
                                <strong style="font-size:12px;">我的评论：</strong>
                                ${commentsHtml}
                            </div>
                        </div>
                        <div class="col-md-3" style="display:flex; align-items:center; justify-content:center;">
                            <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看作品详情</button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
    }
    $("#myCommentsList").html(htmlStr);
    
    $("#myCommentsList .detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

async function renderCollections() {
    await loadData();
    const collectionIds = getCollections();
    const works = photographyWorkList.filter(w => collectionIds.includes(w.id));
    
    let htmlStr = "";
    if (works.length === 0) {
        htmlStr = '<div class="text-center text-secondary">暂无收藏</div>';
    } else {
        works.forEach(work => {
            htmlStr += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${work.img}" class="w-100" style="height:100px;object-fit:cover;">
                        </div>
                        <div class="col-md-6">
                            <h5>${work.workName}</h5>
                            <p class="text-secondary small">作者：${work.authorNick}</p>
                            <p class="text-secondary small">票数：${work.voteCount}</p>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看</button>
                            <button class="btn btn-sm btn-danger uncollectBtn" data-id="${work.id}">取消收藏</button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
    }
    $("#collectionList").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
    
    $(".uncollectBtn").click(function() {
        toggleCollection($(this).data("id"));
        alert("已取消收藏！");
        renderCollections();
    });
}

async function renderVoteRecords() {
    await loadData();
    const records = getVoteRecords();
    const user = getLoginUser();
    const myRecords = records;
    
    let htmlStr = "";
    if (myRecords.length === 0) {
        htmlStr = '<div class="text-center text-secondary">暂无投票记录</div>';
    } else {
        myRecords.forEach(record => {
            const work = photographyWorkList.find(w => w.id === record.workId);
            if (work) {
                htmlStr += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <img src="${work.img}" class="w-100" style="height:80px;object-fit:cover;">
                            </div>
                            <div class="col-md-6">
                                <h5>${work.workName}</h5>
                                <p class="text-secondary small">投票时间：${record.time}</p>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看作品</button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }
        });
    }
    $("#voteList").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

async function renderPurchaseRecords() {
    await loadData();
    const user = getLoginUser();
    const myPurchases = photographyWorkList.filter(w => w.isPurchased && w.buyerAccount === user.account);
    
    let htmlStr = "";
    if (myPurchases.length === 0) {
        htmlStr = '<div class="text-center text-secondary">暂无购买记录</div>';
    } else {
        myPurchases.forEach(work => {
            htmlStr += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${work.img}" class="w-100" style="height:80px;object-fit:cover;">
                        </div>
                        <div class="col-md-6">
                            <h5>${work.workName}</h5>
                            <p class="text-secondary small">作者：${work.authorNick}</p>
                            <p class="text-success small">价格：¥${work.price}</p>
                            <p class="text-secondary small">购买时间：${work.purchaseTime}</p>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看作品</button>
                        </div>
                    </div>
                    ${work.purchaseTxHash ? `<div class="mt-2 p-2 bg-light rounded"><p class="text-xs text-secondary"><strong>交易哈希：</strong><span class="font-mono">${work.purchaseTxHash}</span></p></div>` : ''}
                </div>
            </div>
            `;
        });
    }
    $("#purchaseList").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

async function renderEarnings() {
    await loadData();
    const user = getLoginUser();
    const mySoldWorks = photographyWorkList.filter(w => w.isPurchased && w.authorAccount === user.account);
    
    let htmlStr = "";
    if (mySoldWorks.length === 0) {
        htmlStr = '<div class="text-center text-secondary">暂无版权收益记录</div>';
    } else {
        let totalEarningsCny = 0;
        let totalEarningsEth = 0;
        
        mySoldWorks.forEach(work => {
            const ethAmount = work.purchasePrice || (parseFloat(work.price) / 2000);
            totalEarningsCny += parseFloat(work.price) || 0;
            totalEarningsEth += parseFloat(ethAmount) || 0;
            
            htmlStr += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${work.img}" class="w-100" style="height:80px;object-fit:cover;">
                        </div>
                        <div class="col-md-6">
                            <h5>${work.workName}</h5>
                            <p class="text-secondary small">分类：${work.category}</p>
                            <p class="text-success small">收益：¥${work.price}</p>
                            <p class="text-primary small">ETH：${ethAmount.toFixed(4)}</p>
                            <p class="text-secondary small">购买者：${work.buyerNick}</p>
                            <p class="text-secondary small">购买时间：${work.purchaseTime}</p>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看作品</button>
                        </div>
                    </div>
                    ${work.purchaseTxHash ? `<div class="mt-2 p-2 bg-light rounded"><p class="text-xs text-secondary"><strong>交易哈希：</strong><span class="font-mono">${work.purchaseTxHash}</span></p><p class="text-xs text-secondary"><strong>区块高度：</strong>${work.blockHeight || "-"}</p></div>` : ''}
                </div>
            </div>
            `;
        });
        
        htmlStr = `
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;">
                    <div class="stat-icon">💰</div>
                    <div class="fs-3">¥${totalEarningsCny.toFixed(2)}</div>
                    <div class="text-white opacity-80">累计人民币收益</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;">
                    <div class="stat-icon">🪙</div>
                    <div class="fs-3">${totalEarningsEth.toFixed(4)} ETH</div>
                    <div class="text-white opacity-80">累计ETH收益</div>
                </div>
            </div>
        </div>
        ${htmlStr}`;
    }
    $("#earningsList").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

async function renderProfilePage() {
    await loadData();
    const user = getLoginUser();
    const works = photographyWorkList.filter(w => w.authorAccount === user.account && w.status === "online");
    
    let htmlStr = `
    <div class="text-center mb-4">
        <h3>👤 ${user.nickName} 的摄影主页</h3>
        <p class="text-secondary">${user.bio || "暂无简介"}</p>
        <p>📷 作品数：${works.length}</p>
    </div>
    <div class="row">
    `;
    
    works.forEach(work => {
        htmlStr += `
        <div class="col-md-4 mb-3">
            <div class="card">
                <div class="card-body p-0">
                    <img src="${work.img}" class="w-100" style="height:150px;object-fit:cover;">
                </div>
                <div class="card-footer">
                    <h5>${work.workName}</h5>
                    <p class="text-danger">🔥 ${work.voteCount}票</p>
                    <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                </div>
            </div>
        </div>
        `;
    });
    
    htmlStr += '</div>';
    $("#profilePageContent").html(htmlStr);
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

function saveUserInfo() {
    const user = getLoginUser();
    if (!user) return;
    
    user.nickName = $("#nickName").val().trim();
    user.phone = $("#phone").val().trim();
    user.bio = $("#bio").val().trim();
    
    localStorage.setItem(`${USER_STORAGE_KEY}_${user.account}`, JSON.stringify(user));
    setLoginUser(user);
    alert("个人信息修改成功");
    window.location.reload();
}

function renderPublicProfile(account) {
    const targetUser = getUserInfo(account);
    
    if (!targetUser) {
        $("#userContent").html('<div class="text-center text-danger py-5"><h3>用户不存在</h3><p><button class="btn btn-primary mt-3" onclick="history.back()">返回</button></p></div>');
        return;
    }
    
    const userWorks = photographyWorkList.filter(w => w.authorAccount === account && w.status === "online");
    
    let worksHtml = "";
    if (userWorks.length === 0) {
        worksHtml = '<div class="text-center text-secondary py-4">暂无作品</div>';
    } else {
        userWorks.forEach(work => {
            worksHtml += `
            <div class="col-md-4 mb-4">
                <div class="card">
                    <img src="${work.img}" class="card-img-top w-100" style="height:200px;object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">分类：${work.category}</p>
                        <p class="text-danger font-bold">🔥 ${work.voteCount}票</p>
                        <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                    </div>
                </div>
            </div>
            `;
        });
    }
    
    const roleText = targetUser.role === "photographer" ? "📸 摄影师" : targetUser.role === "admin" ? "🔧 管理员" : "👤 普通用户";
    
    const loginUser = getLoginUser();
    const isAdmin = loginUser && loginUser.role === "admin";
    const phoneDisplay = isAdmin && targetUser.phone ? `<p><strong>📞 联系电话：</strong>${targetUser.phone}</p>` : '';
    const registerTimeDisplay = isAdmin ? `<p><strong>📅 注册时间：</strong>${targetUser.registerTime || "-"}</p>` : '';
    
    const collections = JSON.parse(localStorage.getItem(`collections_${account}`) || '[]');
    const collectionIds = collections.map(Number);
    const collectionWorks = photographyWorkList.filter(w => collectionIds.includes(w.id));
    
    let collectionsHtml = "";
    if (collectionWorks.length === 0) {
        collectionsHtml = '<div class="text-center text-secondary py-4">暂无收藏</div>';
    } else {
        collectionWorks.forEach(work => {
            collectionsHtml += `
            <div class="col-md-4 mb-4">
                <div class="card">
                    <img src="${work.img}" class="card-img-top w-100" style="height:200px;object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">分类：${work.category}</p>
                        <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                    </div>
                </div>
            </div>
            `;
        });
    }
    
    const voteRecords = JSON.parse(localStorage.getItem(`voteRecords_${account}`) || '[]');
    const voteWorkIds = voteRecords.map(r => Number(r.workId));
    const voteWorks = photographyWorkList.filter(w => voteWorkIds.includes(w.id));
    
    let voteHtml = "";
    if (voteWorks.length === 0) {
        voteHtml = '<div class="text-center text-secondary py-4">暂无投票记录</div>';
    } else {
        voteWorks.forEach(work => {
            voteHtml += `
            <div class="col-md-4 mb-4">
                <div class="card">
                    <img src="${work.img}" class="card-img-top w-100" style="height:200px;object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">分类：${work.category}</p>
                        <button class="btn btn-sm btn-primary detailBtn" data-id="${work.id}">查看详情</button>
                    </div>
                </div>
            </div>
            `;
        });
    }
    
    const profileHtml = `
    <div class="panel panel-default">
        <div class="panel-heading">
            <div class="row">
                <div class="col-md-8">
                    <h2>👤 ${targetUser.nickName || targetUser.account}</h2>
                    <span class="label label-info">${roleText}</span>
                </div>
                <div class="col-md-4 text-right">
                    <button class="btn btn-secondary" onclick="history.back()">返回</button>
                </div>
            </div>
        </div>
        <div class="panel-body">
            <div class="row mb-5">
                <div class="col-md-12">
                    <div class="bg-light p-4 rounded">
                        <h4>📝 个人简介</h4>
                        <p>${targetUser.bio || "暂无简介"}</p>
                        <div class="mt-3">
                            ${phoneDisplay}
                            ${registerTimeDisplay}
                            ${targetUser.role !== 'user' ? `<p><strong>📸 作品数量：</strong>${userWorks.length} 件</p>` : ''}
                            <p><strong>❤️ 收藏数量：</strong>${collectionWorks.length} 件</p>
                            <p><strong>👍 投票数量：</strong>${voteWorks.length} 件</p>
                        </div>
                    </div>
                </div>
            </div>
            
            ${targetUser.role !== 'user' ? `
            <div class="row">
                <div class="col-md-12">
                    <h3>🏆 作品展示</h3>
                    <div class="row">${worksHtml}</div>
                </div>
            </div>
            ` : ''}
            
            <div class="row mt-5">
                <div class="col-md-12">
                    <h3>❤️ 收藏作品</h3>
                    <div class="row">${collectionsHtml}</div>
                </div>
            </div>
            
            <div class="row mt-5">
                <div class="col-md-12">
                    <h3>👍 投票记录</h3>
                    <div class="row">${voteHtml}</div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("#userMenu").hide();
    $("#adminMenu").hide();
    $("#adminContent").hide();
    $("#userContent").removeClass("col-md-9").addClass("col-md-10 col-md-offset-1");
    $("#userContent").html(profileHtml);
    $("#userContent").show();
    
    $(".detailBtn").click(function() {
        window.location.href = `work-detail.html?id=${$(this).data("id")}`;
    });
}

// 加载个人中心页面
async function loadPersonInfoPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetAuthor = urlParams.get('author');
    
    const user = getLoginUser();
    
    if (targetAuthor) {
        renderPublicProfile(targetAuthor);
        return;
    }
    
    if (user && user.role === "admin") {
        $("#userMenu").hide();
        $("#userContent").hide();
        $("#adminMenu").show();
        $("#adminContent").show();
        
        $("#menuDashboard").click(() => switchAdminMenu("Dashboard"));
        $("#menuUsers").click(() => switchAdminMenu("Users"));
        $("#menuWorks").click(() => switchAdminMenu("Works"));
        $("#menuCertify").click(() => switchAdminMenu("Certify"));
        $("#menuComments").click(() => switchAdminMenu("Comments"));
        $("#menuTournaments").click(() => switchAdminMenu("Tournaments"));
        $("#menuBlockchain").click(() => switchAdminMenu("Blockchain"));
        $("#menuTransactions").click(() => {
            $(".list-group-item").removeClass("active");
            $("#menuTransactions").addClass("active");
            $("#contentDashboard, #contentUsers, #contentWorks, #contentCertify, #contentComments, #contentTournaments, #contentBlockchain, #contentAnnouncements").hide();
            $("#contentTransactions").show();
            renderTransactionStats("all");
            
            if (txRefreshInterval) clearInterval(txRefreshInterval);
            txRefreshInterval = setInterval(() => {
                if ($("#contentTransactions").is(":visible")) {
                    const filter = $("#txTimeFilter").val();
                    renderTransactionStats(filter);
                }
            }, 3000);
        });
        $("#menuAnnouncements").click(() => switchAdminMenu("Announcements"));
        $("#menuFeedback").click(() => switchAdminMenu("Feedback"));
        
        $("#auditFilter").change(() => renderAuditWorks($("#auditFilter").val()));
        $("#certifyFilter").change(() => renderCertifyWorks($("#certifyFilter").val()));
        $("#certifyAllBtn").click(certifyAllWorks);
        $("#addTournamentBtn").click(addTournament);
        $("#addAnnouncementBtn").click(addAnnouncement);
        $("#filterAllFeedback").click(() => renderFeedbackManagement("all"));
        $("#filterUnreadFeedback").click(() => renderFeedbackManagement("unread"));
        $("#filterReadFeedback").click(() => renderFeedbackManagement("read"));
        $("#chainSearchBtn").click(searchChainData);
        $("#txFilterBtn").click(() => renderTransactionStats($("#txTimeFilter").val()));
        
        $("#modalApproveBtn").off("click").on("click", function() {
            const workId = $(this).data("id");
            if (confirm("确定要通过该作品吗？")) {
                updateWorkStatus(workId, "online");
                $("#workDetailModal").modal("hide");
                renderAuditWorks("pending");
            }
        });
        
        $("#modalRejectBtn").off("click").on("click", function() {
            const workId = $(this).data("id");
            const reason = $("#rejectReasonInput").val().trim();
            
            if (!reason) {
                alert("驳回理由不能为空！");
                return;
            }
            
            if (confirm(`确定要驳回该作品吗？\n驳回理由：${reason}`)) {
                updateWorkStatus(workId, "offline", reason);
                $("#workDetailModal").modal("hide");
                renderAuditWorks("pending");
            }
        });
        
        $("#adminMenu .list-group-item").removeClass("active");
        $("#menuDashboard").addClass("active");
        $("#contentDashboard").show();
        $("#contentUsers").hide();
        $("#contentWorks").hide();
        $("#contentCertify").hide();
        $("#contentComments").hide();
        $("#contentTournaments").hide();
        $("#contentBlockchain").hide();
        $("#contentTransactions").hide();
        $("#contentAnnouncements").hide();
        
        renderDashboard();
    } else if (user) {
        $("#adminMenu").hide();
        $("#adminContent").hide();
        $("#userMenu").show();
        $("#userContent").show();
        
        $("#menuProfile").click(() => switchMenu("menuProfile"));
        $("#menuWallet").click(() => switchMenu("menuWallet"));
        $("#menuMyWorks").click(() => switchMenu("menuMyWorks"));
        $("#menuCollections").click(() => switchMenu("menuCollections"));
        $("#menuVotes").click(() => switchMenu("menuVotes"));
        $("#menuMyComments").click(() => switchMenu("menuMyComments"));
        $("#menuPurchases").click(() => switchMenu("menuPurchases"));
        $("#menuEarnings").click(() => switchMenu("menuEarnings"));
        $("#menuProfilePage").click(() => switchMenu("menuProfilePage"));
        $("#menuUserFeedback").click(() => switchMenu("menuFeedback"));
        
        $("#modalApproveBtn").off("click").on("click", function() {
            $("#workDetailModal").modal("hide");
        });
        
        $("#modalRejectBtn").off("click").on("click", function() {
            $("#workDetailModal").modal("hide");
        });
        
        $("#userMenu .list-group-item").removeClass("active");
        $("#menuProfile").addClass("active");
        $("#contentProfile").show();
        $("#contentWallet").hide();
        $("#contentMyWorks").hide();
        $("#contentCollections").hide();
        $("#contentVotes").hide();
        $("#contentMyComments").hide();
        $("#contentPurchases").hide();
        $("#contentEarnings").hide();
        $("#contentProfilePage").hide();
        
        renderPersonInfo();
        renderWalletPage();
        renderMyWorks();
        renderCollections();
        renderVoteRecords();
        renderMyComments();
        renderPurchaseRecords();
        renderEarnings();
        
        $("#tabPending").click(function() {
            $("#tabOnline, #tabOffline").removeClass("btn-primary").addClass("btn-default");
            $(this).removeClass("btn-default").addClass("btn-primary");
            renderMyWorks("pending");
        });
        $("#tabOnline").click(function() {
            $("#tabPending, #tabOffline").removeClass("btn-primary").addClass("btn-default");
            $(this).removeClass("btn-default").addClass("btn-primary");
            renderMyWorks("online");
        });
        $("#tabOffline").click(function() {
            $("#tabPending, #tabOnline").removeClass("btn-primary").addClass("btn-default");
            $(this).removeClass("btn-default").addClass("btn-primary");
            renderMyWorks("offline");
        });

        if (user.role === 'user') {
            $("#menuMyWorks").hide();
            $("#menuEarnings").hide();
        }

        // 绑定个人信息及钱包/版权操作按钮
        $("#saveInfoBtn").click(saveUserInfo);
        $("#copyWalletBtn").click(copyWalletAddress);
        $("#exportPrivateKeyBtn").click(exportPrivateKey);
        $("#verifyAssetsBtn").click(verifyChainAssets);
        $("#viewWalletCertBtn").click(viewWalletCert);
        $("#viewBuyableWorksBtn").click(viewBuyableWorks);
        $("#viewMyOrdersBtn").click(viewMyOrders);
        $("#testGanacheBtn").click(testGanacheConnection);
        $("#resetWalletBtn").click(resetWalletAddress);
    } else {
        renderPersonInfo();
        $("#userMenu").hide();
        $("#userContent").hide();
        $("#adminMenu").hide();
        $("#adminContent").hide();

        $("#menuProfile").click(() => switchMenu("menuProfile"));
        $("#menuWallet").click(() => switchMenu("menuWallet"));
        $("#menuMyWorks").click(() => switchMenu("menuMyWorks"));
        $("#menuCollections").click(() => switchMenu("menuCollections"));
        $("#menuVotes").click(() => switchMenu("menuVotes"));
        $("#menuMyComments").click(() => switchMenu("menuMyComments"));
        $("#menuPurchases").click(() => switchMenu("menuPurchases"));
        $("#menuProfilePage").click(() => switchMenu("menuProfilePage"));
        $("#menuUserFeedback").click(() => switchMenu("menuFeedback"));

        $("#saveInfoBtn").click(saveUserInfo);

        $("#copyWalletBtn").click(copyWalletAddress);
        $("#exportPrivateKeyBtn").click(exportPrivateKey);
        $("#verifyAssetsBtn").click(verifyChainAssets);
        $("#viewWalletCertBtn").click(viewWalletCert);
        $("#viewBuyableWorksBtn").click(viewBuyableWorks);
        $("#viewMyOrdersBtn").click(viewMyOrders);
        $("#testGanacheBtn").click(testGanacheConnection);
        $("#resetWalletBtn").click(resetWalletAddress);
    }
}

// 加载修改密码页面
async function loadUpdatePwdPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
}

// 加载平台介绍页面
async function loadAboutPage() {
    await loadData();
    renderNotifications();
    initTheme();
    initBackToTop();
}

function updateNavbar() {
    const user = getLoginUser();
    if (user) {
        $("#guestMenu").hide();
        $("#loginMenu").show();
        $("#showNick").text(user.nickName);
        
        $("a[href='ranking.html']").parent().show();
        $("a[href='winners.html']").parent().show();
        $("a[href='market.html']").parent().show();
        $("a[href='blockchain.html']").parent().show();
        
        if (user.role !== "photographer") {
            $("a[href='publish.html']").parent().hide();
        } else {
            $("a[href='publish.html']").parent().show();
        }
    } else {
        $("#guestMenu").show();
        $("#loginMenu").hide();
    }
}

// 初始化
$(function() {
    const path = window.location.pathname;
    
    updateNavbar();
    
    if (path.includes("index.html") || path.endsWith("/") || path === "") {
        loadHomePage();
    } else if (path.includes("ranking.html")) {
        loadRankingPage();
    } else if (path.includes("work-detail.html")) {
        loadWorkDetail();
        $("#submitCommentBtn").click(submitComment);
    } else if (path.includes("tournament-detail.html")) {
        loadTournamentDetail();
    } else if (path.includes("tournament-list.html")) {
        loadTournamentListPage();
    } else if (path.includes("winners.html")) {
        loadWinnersPage();
    } else if (path.includes("market.html")) {
        loadMarketPage();
    } else if (path.includes("publish.html")) {
        loadPublishPage();
    } else if (path.includes("person-info.html")) {
        loadPersonInfoPage();
    } else if (path.includes("updatePwd.html")) {
        loadUpdatePwdPage();
    } else if (path.includes("about.html")) {
        loadAboutPage();
    } else if (path.includes("admin.html")) {
        loadAdminPage();
    } else if (path.includes("login.html") || path.includes("register.html")) {
        loadData().then(() => renderNotifications());
    }
});

// ========== 管理员后台相关函数 ==========

async function loadAdminPage() {
    const user = getLoginUser();
    if (!user || user.role !== "admin") {
        alert("无权访问管理员后台");
        window.location.href = "index.html";
        return;
    }
    
    await loadData();
    renderNotifications();
    initTheme();
    $("#showNick").text(user.nickName);
    
    // 绑定菜单点击事件
    $("#menuDashboard").click(() => switchAdminMenu("Dashboard"));
    $("#menuUsers").click(() => switchAdminMenu("Users"));
    $("#menuWorks").click(() => switchAdminMenu("Works"));
    $("#menuComments").click(() => switchAdminMenu("Comments"));
    $("#menuTournaments").click(() => switchAdminMenu("Tournaments"));
    $("#menuBlockchain").click(() => switchAdminMenu("Blockchain"));
    $("#menuAnnouncements").click(() => switchAdminMenu("Announcements"));
    $("#menuFeedback").click(() => switchAdminMenu("Feedback"));
    
    // 绑定其他按钮事件
    $("#auditFilter").change(() => renderAuditWorks($("#auditFilter").val()));
    $("#certifyFilter").change(() => renderCertifyWorks($("#certifyFilter").val()));
    $("#certifyAllBtn").click(certifyAllWorks);
    $("#chainSearchBtn").click(searchChainData);
    $("#addTournamentBtn").click(addTournament);
    $("#addAnnouncementBtn").click(addAnnouncement);
    $("#filterAllFeedback").click(() => renderFeedbackManagement("all"));
    $("#filterUnreadFeedback").click(() => renderFeedbackManagement("unread"));
    $("#filterReadFeedback").click(() => renderFeedbackManagement("read"));
    
    // 加载默认页面
    renderDashboard();
    if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = setInterval(() => {
        if ($("#contentDashboard").is(":visible")) {
            renderDashboard();
        }
    }, 3000);
}

let txRefreshInterval = null;
let dashboardRefreshInterval = null;

function switchAdminMenu(menuId) {
    $(".list-group-item").removeClass("active");
    $(`#menu${menuId}`).addClass("active");
    
    $(`#contentDashboard, #contentUsers, #contentWorks, #contentCertify, #contentComments, #contentTournaments, #contentBlockchain, #contentTransactions, #contentAnnouncements, #contentFeedback`).hide();
    $(`#content${menuId}`).show();
    
    if (txRefreshInterval) {
        clearInterval(txRefreshInterval);
        txRefreshInterval = null;
    }
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
    
    if (menuId === "Dashboard") {
        renderDashboard();
        dashboardRefreshInterval = setInterval(() => {
            if ($("#contentDashboard").is(":visible")) {
                renderDashboard();
            }
        }, 3000);
    } else if (menuId === "Users") {
        renderUserManagement();
    } else if (menuId === "Works") {
        renderAuditWorks("pending");
    } else if (menuId === "Certify") {
        renderCertifyWorks("notOnChain");
    } else if (menuId === "Comments") {
        renderCommentManagement();
    } else if (menuId === "Tournaments") {
        renderTournamentManagement();
    } else if (menuId === "Blockchain") {
        renderAdminBlockchain();
    } else if (menuId === "Transactions") {
        renderTransactionStats("all");
        txRefreshInterval = setInterval(() => {
            if ($("#contentTransactions").is(":visible")) {
                const filter = $("#txTimeFilter").val();
                renderTransactionStats(filter);
            }
        }, 5000);
    } else if (menuId === "Announcements") {
        renderAnnouncementManagement();
    } else if (menuId === "Feedback") {
        renderFeedbackManagement();
    }
}

function renderDashboard() {
    console.log('renderDashboard 执行');
    
    // 从 localStorage 加载最新的作品列表，以确保票数和作品列表是实时的
    const worksFromStorage = localStorage.getItem("photographyWorks");
    if (worksFromStorage) {
        photographyWorkList = JSON.parse(worksFromStorage);
    }
    console.log('photographyWorkList 长度:', photographyWorkList.length);
    
    const users = getAllUsers();
    console.log('用户列表长度:', users.length);
    
    const pendingWorks = photographyWorkList.filter(w => w.status === "pending");
    
    // 累加所有作品的票数得到系统内的总投票数
    let totalVotes = 0;
    photographyWorkList.forEach(w => {
        totalVotes += (w.voteCount || 0);
    });
    
    console.log('待审核作品数:', pendingWorks.length);
    console.log('总投票数:', totalVotes);
    
    $("#statUsers").text(users.length);
    $("#statWorks").text(photographyWorkList.length);
    $("#statVotes").text(totalVotes);
    $("#statPending").text(pendingWorks.length);
    
    // 分类统计
    const categoryStats = {};
    photographyWorkList.forEach(work => {
        categoryStats[work.category] = (categoryStats[work.category] || 0) + 1;
    });
    
    let htmlStr = "";
    for (const [category, count] of Object.entries(categoryStats)) {
        htmlStr += `
        <div class="col-md-3 mb-3">
            <div class="card">
                <div class="card-body text-center">
                    <h5 class="card-title">${category}</h5>
                    <p class="text-primary fs-4">${count}件</p>
                </div>
            </div>
        </div>
        `;
    }
    $("#categoryStats").html(htmlStr || '<div class="col-12 text-center text-secondary">暂无数据</div>');
}

function renderUserManagement() {
    const users = getAllUsers();
    let htmlStr = "";
    
    users.forEach(user => {
        const statusBadge = user.status === "normal" 
            ? '<span class="label label-success">正常</span>' 
            : '<span class="label label-danger">禁用</span>';
        const roleBadge = user.role === "admin" 
            ? '<span class="label label-danger">管理员</span>' 
            : user.role === "photographer" 
            ? '<span class="label label-info">摄影师</span>' 
            : '<span class="label label-default">普通用户</span>';
        
        htmlStr += `
        <tr>
            <td>${user.account}</td>
            <td>${user.nickName}</td>
            <td>${user.phone || "-"}</td>
            <td>${user.registerTime}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td>
                ${user.role !== "admin" ? `<button class="btn btn-sm btn-warning toggleStatusBtn" data-account="${user.account}">${user.status === "normal" ? "禁用" : "启用"}</button>` : ""}
            </td>
        </tr>
        `;
    });
    
    $("#userTable").html(htmlStr || '<tr><td colspan="7" class="text-center text-secondary">暂无用户</td></tr>');
    
    $(".toggleStatusBtn").click(function() {
        toggleUserStatus($(this).data("account"));
        renderUserManagement();
    });
}

function renderAuditWorks(status) {
    const works = photographyWorkList.filter(w => w.status === status);
    let htmlStr = "";
    
    if (works.length === 0) {
        htmlStr = '<div class="col-12 text-center text-secondary">暂无作品</div>';
    } else {
        works.forEach(work => {
            htmlStr += `
            <div class="col-md-4 mb-3">
                <div class="card cursor-pointer" data-id="${work.id}" style="cursor:pointer;">
                    <div class="card-body p-0">
                        <img src="${work.img}" class="w-100" style="height:150px;object-fit:cover;">
                    </div>
                    <div class="card-footer">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">作者：${work.authorNick}</p>
                        <p class="text-secondary small">分类：${work.category}</p>
                        ${status === "pending" ? `
                        <button class="btn btn-sm btn-success approveBtn" data-id="${work.id}">✅ 通过</button>
                        <button class="btn btn-sm btn-danger rejectBtn" data-id="${work.id}">❌ 拒绝</button>
                        ` : status === "online" ? `
                        <button class="btn btn-sm btn-danger offlineBtn" data-id="${work.id}">📴 下架</button>
                        ` : `
                        <button class="btn btn-sm btn-success onlineBtn" data-id="${work.id}">✅ 重新上线</button>
                        `}
                    </div>
                </div>
            </div>
            `;
        });
    }
    
    $("#auditWorksList").html(htmlStr);
    
    $("#auditWorksList").off("click", ".card[data-id]");
    $("#auditWorksList").on("click", ".card[data-id]", function(e) {
        if ($(e.target).closest(".btn").length === 0) {
            const workId = $(this).data("id");
            openWorkDetailModal(workId);
        }
    });
    
    $("#auditWorksList").off("click", ".approveBtn");
    $("#auditWorksList").on("click", ".approveBtn", function() {
        updateWorkStatus($(this).data("id"), "online");
        renderAuditWorks("pending");
    });
    
    $("#auditWorksList").off("click", ".rejectBtn");
    $("#auditWorksList").on("click", ".rejectBtn", function() {
        const workId = $(this).data("id");
        openWorkDetailModal(workId, true);
    });
    
    $("#auditWorksList").off("click", ".offlineBtn");
    $("#auditWorksList").on("click", ".offlineBtn", function() {
        if (confirm("确定要下架该作品吗？")) {
            updateWorkStatus($(this).data("id"), "offline");
            renderAuditWorks("online");
        }
    });
    
    $("#auditWorksList").off("click", ".onlineBtn");
    $("#auditWorksList").on("click", ".onlineBtn", function() {
        updateWorkStatus($(this).data("id"), "online");
        renderAuditWorks("offline");
    });
}

function openWorkDetailModal(workId, showRejectSection = false) {
    const work = photographyWorkList.find(w => w.id === workId);
    if (!work) return;
    
    const user = getLoginUser();
    const isAdmin = user && user.role === "admin";
    
    $("#modalWorkImg").attr("src", work.img);
    $("#modalWorkName").val(work.workName);
    $("#modalAuthor").val(work.authorNick || work.authorAccount);
    $("#modalCategory").val(work.category);
    $("#modalEquipment").val(work.equipment || "-");
    
    const tournament = tournamentList.find(t => t.id === work.tournamentId);
    $("#modalTournament").val(tournament ? tournament.name : "-");
    
    $("#modalCreateTime").val(work.createTime || "-");
    
    let statusText = "";
    if (work.status === "pending") statusText = "⏳ 待审核";
    else if (work.status === "online") statusText = "✅ 已上线";
    else if (work.status === "offline") statusText = "❌ 已下架";
    $("#modalStatus").val(statusText);
    
    $("#modalDesc").val(work.desc || "-");
    $("#modalHash").val(work.hash || "-");
    $("#modalTxHash").val(work.txHash || "-");
    
    if (work.rejectReason) {
        $("#modalRejectInfo").show();
        $("#modalRejectReason").val(work.rejectReason);
        $("#modalRejectTime").val(work.rejectTime || "-");
    } else {
        $("#modalRejectInfo").hide();
    }
    
    if (isAdmin && (showRejectSection || work.status === "pending")) {
        $("#modalRejectSection").show();
        $("#rejectReasonInput").val(work.rejectReason || "");
        $("#modalApproveBtn").show();
        $("#modalRejectBtn").show();
    } else {
        $("#modalRejectSection").hide();
        $("#modalApproveBtn").hide();
        $("#modalRejectBtn").hide();
    }
    
    $("#modalApproveBtn").data("id", workId);
    $("#modalRejectBtn").data("id", workId);
    
    $("#workDetailModal").modal("show");
}

function updateWorkStatus(workId, status, rejectReason) {
    const work = photographyWorkList.find(w => w.id === workId);
    if (work) {
        work.status = status;
        if (rejectReason) {
            work.rejectReason = rejectReason;
            work.rejectTime = new Date().toLocaleString();
        } else {
            delete work.rejectReason;
            delete work.rejectTime;
        }
        localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
        const statusText = status === "online" ? "已上线" : "已下架";
        const reasonText = rejectReason ? `\n驳回理由：${rejectReason}` : "";
        alert(`操作成功，作品状态已更新为：${statusText}${reasonText}`);
    }
}

function renderCertifyWorks(filter) {
    let works = photographyWorkList;
    if (filter === "notOnChain") {
        works = photographyWorkList.filter(w => !w.onChain);
    } else if (filter === "onChain") {
        works = photographyWorkList.filter(w => w.onChain);
    }
    
    let htmlStr = "";
    
    if (works.length === 0) {
        htmlStr = '<div class="col-12 text-center text-secondary">暂无作品</div>';
    } else {
        works.forEach(work => {
            const onChainStatus = work.onChain 
                ? '<span class="label label-success">✅ 已存证</span>' 
                : '<span class="label label-danger">❌ 未存证</span>';
            htmlStr += `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body p-0">
                        <img src="${work.img}" class="w-100" style="height:150px;object-fit:cover;">
                    </div>
                    <div class="card-footer">
                        <h5 class="card-title">${work.workName}</h5>
                        <p class="text-secondary small">作者：${work.authorNick}</p>
                        <p class="text-secondary small">分类：${work.category}</p>
                        <div class="mb-2">${onChainStatus}</div>
                        ${work.onChain ? `
                        <p class="text-secondary small">交易哈希：<span class="font-mono text-primary">${work.txHash ? work.txHash.substring(0, 16) + '...' : '-'}</span></p>
                        <p class="text-secondary small">区块高度：${work.blockHeight || '-'}</p>
                        <p class="text-secondary small">上链时间：${work.chainTime || '-'}</p>
                        ` : `
                        <button class="btn btn-sm btn-warning certifyBtn" data-id="${work.id}">🔗 存证上链</button>
                        `}
                    </div>
                </div>
            </div>
            `;
        });
    }
    
    $("#certifyWorksList").html(htmlStr);
    
    $(".certifyBtn").click(async function() {
        const user = getLoginUser();
        if (!user || user.role !== "admin") {
            alert("只有管理员可以执行存证上链操作！");
            return;
        }
        const workId = $(this).data("id");
        const btn = $(this);
        btn.text("⏳ 处理中").prop("disabled", true);
        
        if (typeof certifyWork === 'function') {
            const result = await certifyWork(workId);
            if (result.success) {
                alert(`✅ ${result.message}\n交易哈希：${result.transactionHash}\n区块高度：${result.blockNumber}`);
                renderCertifyWorks(filter);
            } else {
                alert(`❌ ${result.message}`);
                btn.text("🔗 存证上链").prop("disabled", false);
            }
        } else {
            alert("区块链模块未加载");
            btn.text("🔗 存证上链").prop("disabled", false);
        }
    });
}

async function certifyAllWorks() {
    const user = getLoginUser();
    if (!user || user.role !== "admin") {
        alert("只有管理员可以执行批量存证上链操作！");
        return;
    }
    const notOnChainWorks = photographyWorkList.filter(w => !w.onChain);
    if (notOnChainWorks.length === 0) {
        alert("所有作品都已存证上链！");
        return;
    }
    
    if (!confirm(`确定要为 ${notOnChainWorks.length} 个作品批量存证上链吗？`)) {
        return;
    }
    
    const btn = $("#certifyAllBtn");
    btn.text("⏳ 处理中...").prop("disabled", true);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const work of notOnChainWorks) {
        if (typeof certifyWork === 'function') {
            const result = await certifyWork(work.id);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        }
    }
    
    btn.text("⚡ 一键全部存证").prop("disabled", false);
    alert(`批量存证完成！\n✅ 成功：${successCount} 个\n❌ 失败：${failCount} 个`);
    renderCertifyWorks("notOnChain");
}

function renderCommentManagement() {
    let htmlStr = "";
    let hasComments = false;
    
    photographyWorkList.forEach(work => {
        if (work.comments && work.comments.length > 0) {
            hasComments = true;
            work.comments.forEach((comment, index) => {
                htmlStr += `
                <div class="comment-card">
                    <div class="row">
                        <div class="col-md-2">
                            <strong>${comment.userNick || comment.userId}</strong>
                        </div>
                        <div class="col-md-5">
                            <a href="work-detail.html?id=${work.id}" class="text-primary small">作品：${work.workName}</a>
                        </div>
                        <div class="col-md-3">
                            ${comment.content}
                        </div>
                        <div class="col-md-2 text-right">
                            <small class="text-secondary">${comment.time}</small>
                            <button class="btn btn-sm btn-danger deleteCommentBtn" data-work="${work.id}" data-index="${index}">🗑️ 删除</button>
                        </div>
                    </div>
                </div>
                `;
            });
        }
    });
    
    $("#commentManageList").html(htmlStr || '<div class="text-center text-secondary">暂无评论</div>');
    
    $(".deleteCommentBtn").click(function() {
        const workId = $(this).data("work");
        const index = $(this).data("index");
        const work = photographyWorkList.find(w => w.id === workId);
        if (work && work.comments) {
            const comment = work.comments[index];
            if (confirm(`确定要删除用户 "${comment.userNick || comment.userId}" 的评论吗？`)) {
                work.comments.splice(index, 1);
                localStorage.setItem("photographyWorks", JSON.stringify(photographyWorkList));
                renderCommentManagement();
            }
        }
    });
}

function renderTournamentManagement() {
    let htmlStr = "";
    
    tournamentList.forEach(tournament => {
        const statusBadge = tournament.status === "active" 
            ? '<span class="label label-success">🔥 进行中</span>' 
            : '<span class="label label-default">🏁 已结束</span>';
        
        htmlStr += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h4 class="card-title">${tournament.name}</h4>
                        <p class="text-secondary">${tournament.description}</p>
                        <p class="text-secondary small">📅 投稿时间：${tournament.startTime} ~ ${tournament.endTime}</p>
                        <p class="text-secondary small">🗳️ 投票时间：${tournament.voteStart} ~ ${tournament.voteEnd}</p>
                    </div>
                    <div class="col-md-4 text-right">
                        ${statusBadge}
                        <button class="btn btn-sm btn-primary editTournamentBtn" data-id="${tournament.id}">✏️ 编辑</button>
                        ${tournament.status === "active" ? `<button class="btn btn-sm btn-danger endTournamentBtn" data-id="${tournament.id}">⏹️ 结束</button>` : ""}
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    $("#tournamentManageList").html(htmlStr || '<div class="text-center text-secondary">暂无赛事</div>');
    
    $(".editTournamentBtn").click(function() {
        const tournament = tournamentList.find(t => t.id === $(this).data("id"));
        if (!tournament) return;
        
        const categoriesHtml = tournament.categories.map(c => `<div class="tag-item">${c} <span class="tag-remove" onclick="removeTournamentCategory(this)">×</span></div>`).join('');
        
        const prizesHtml = tournament.prizes.map((p, idx) => `
            <div class="prize-row">
                <input type="text" class="form-control prize-rank" placeholder="奖项名称" value="${p.rank}" style="width:150px;display:inline-block;">
                <input type="text" class="form-control prize-content" placeholder="奖项内容" value="${p.prize}" style="flex:1;display:inline-block;margin-left:5px;">
                <button class="btn btn-sm btn-danger" onclick="removeTournamentPrize(this)" style="margin-left:5px;">×</button>
            </div>
        `).join('');
        
        const modalHtml = `
        <div class="modal fade" id="tournamentEditModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                        <h4 class="modal-title">编辑赛事：${tournament.name}</h4>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="editTournamentId" value="${tournament.id}">
                        
                        <div class="form-group">
                            <label>赛事名称</label>
                            <input type="text" id="editName" class="form-control" value="${tournament.name}">
                        </div>
                        
                        <div class="form-group">
                            <label>赛事描述</label>
                            <textarea id="editDescription" class="form-control" rows="3">${tournament.description}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>投稿时间</label>
                            <input type="date" id="editStartTime" class="form-control" value="${tournament.startTime}" style="width:48%;display:inline-block;">
                            <span style="display:inline-block;width:4%;text-align:center;">至</span>
                            <input type="date" id="editEndTime" class="form-control" value="${tournament.endTime}" style="width:48%;display:inline-block;">
                        </div>
                        
                        <div class="form-group">
                            <label>投票时间</label>
                            <input type="date" id="editVoteStart" class="form-control" value="${tournament.voteStart}" style="width:48%;display:inline-block;">
                            <span style="display:inline-block;width:4%;text-align:center;">至</span>
                            <input type="date" id="editVoteEnd" class="form-control" value="${tournament.voteEnd}" style="width:48%;display:inline-block;">
                        </div>
                        
                        <div class="form-group">
                            <label>赛事分类</label>
                            <div id="editCategories" class="tag-list">${categoriesHtml}</div>
                            <div class="mt-2">
                                <input type="text" id="newCategory" class="form-control" placeholder="输入分类名称后按回车添加" style="width:250px;display:inline-block;">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>奖项设置</label>
                            <div id="editPrizes">${prizesHtml}</div>
                            <button class="btn btn-sm btn-primary mt-2" onclick="addTournamentPrize()">➕ 添加奖项</button>
                        </div>
                        
                        <div class="form-group">
                            <label>赛事状态</label>
                            <select id="editStatus" class="form-control">
                                <option value="active" ${tournament.status === "active" ? "selected" : ""}>🔥 进行中</option>
                                <option value="ended" ${tournament.status === "ended" ? "selected" : ""}>🏁 已结束</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveTournamentBtn">保存修改</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        $("body").append(modalHtml);
        $("#tournamentEditModal").modal("show");
        
        $("#newCategory").keypress(function(e) {
            if (e.which === 13) {
                const val = $(this).val().trim();
                if (val) {
                    $("#editCategories").append(`<div class="tag-item">${val} <span class="tag-remove" onclick="removeTournamentCategory(this)">×</span></div>`);
                    $(this).val("");
                }
            }
        });
        
        $("#saveTournamentBtn").click(function() {
            const id = $("#editTournamentId").val();
            const tour = tournamentList.find(t => t.id == id);
            if (!tour) return;
            
            const oldStartTime = tour.startTime;
            const oldEndTime = tour.endTime;
            const oldVoteStart = tour.voteStart;
            const oldVoteEnd = tour.voteEnd;
            
            tour.name = $("#editName").val().trim();
            tour.description = $("#editDescription").val().trim();
            tour.startTime = $("#editStartTime").val();
            tour.endTime = $("#editEndTime").val();
            tour.voteStart = $("#editVoteStart").val();
            tour.voteEnd = $("#editVoteEnd").val();
            tour.status = $("#editStatus").val();
            
            tour.categories = [];
            $("#editCategories .tag-item").each(function() {
                tour.categories.push($(this).text().trim().replace(/×$/, ''));
            });
            
            tour.prizes = [];
            $("#editPrizes .prize-row").each(function() {
                const rank = $(this).find(".prize-rank").val().trim();
                const prize = $(this).find(".prize-content").val().trim();
                if (rank && prize) {
                    tour.prizes.push({ rank, prize });
                }
            });
            
            console.log(`=== 保存赛事修改 ===`);
            console.log(`赛事: ${tour.name}`);
            console.log(`  原投稿时间: ${oldStartTime} ~ ${oldEndTime}`);
            console.log(`  新投稿时间: ${tour.startTime} ~ ${tour.endTime}`);
            console.log(`  原投票时间: ${oldVoteStart} ~ ${oldVoteEnd}`);
            console.log(`  新投票时间: ${tour.voteStart} ~ ${tour.voteEnd}`);
            
            localStorage.setItem("tournamentList", JSON.stringify(tournamentList));
            
            const savedList = JSON.parse(localStorage.getItem("tournamentList"));
            const savedTour = savedList.find(t => t.id == id);
            console.log(`保存后验证:`);
            console.log(`  投稿时间: ${savedTour.startTime} ~ ${savedTour.endTime}`);
            console.log(`  投票时间: ${savedTour.voteStart} ~ ${savedTour.voteEnd}`);
            
            $("#tournamentEditModal").modal("hide");
            alert("赛事编辑成功");
            renderTournamentManagement();
        });
        
        $("#tournamentEditModal").on("hidden.bs.modal", function() {
            $(this).remove();
        });
    });
    
    $(".endTournamentBtn").click(function() {
        const tournament = tournamentList.find(t => t.id === $(this).data("id"));
        if (tournament && confirm(`确定要结束赛事 "${tournament.name}" 吗？`)) {
            tournament.status = "ended";
            localStorage.setItem("tournamentList", JSON.stringify(tournamentList));
            alert(`赛事 "${tournament.name}" 已结束`);
            renderTournamentManagement();
        }
    });
}

function removeTournamentCategory(el) {
    $(el).parent().remove();
}

function addTournamentPrize() {
    $("#editPrizes").append(`
        <div class="prize-row">
            <input type="text" class="form-control prize-rank" placeholder="奖项名称" style="width:150px;display:inline-block;">
            <input type="text" class="form-control prize-content" placeholder="奖项内容" style="flex:1;display:inline-block;margin-left:5px;">
            <button class="btn btn-sm btn-danger" onclick="removeTournamentPrize(this)" style="margin-left:5px;">×</button>
        </div>
    `);
}

function removeTournamentPrize(el) {
    $(el).parent().remove();
}

function addTournament() {
    const today = new Date().toISOString().split('T')[0];
    
    const modalHtml = `
    <div class="modal fade" id="tournamentAddModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">新增赛事</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>赛事名称 <span class="text-danger">*</span></label>
                        <input type="text" id="addName" class="form-control" placeholder="请输入赛事名称">
                    </div>
                    
                    <div class="form-group">
                        <label>赛事描述</label>
                        <textarea id="addDescription" class="form-control" rows="3" placeholder="请输入赛事描述"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>投稿时间 <span class="text-danger">*</span></label>
                        <input type="date" id="addStartTime" class="form-control" value="${today}" style="width:48%;display:inline-block;">
                        <span style="display:inline-block;width:4%;text-align:center;">至</span>
                        <input type="date" id="addEndTime" class="form-control" style="width:48%;display:inline-block;">
                    </div>
                    
                    <div class="form-group">
                        <label>投票时间 <span class="text-danger">*</span></label>
                        <input type="date" id="addVoteStart" class="form-control" style="width:48%;display:inline-block;">
                        <span style="display:inline-block;width:4%;text-align:center;">至</span>
                        <input type="date" id="addVoteEnd" class="form-control" style="width:48%;display:inline-block;">
                    </div>
                    
                    <div class="form-group">
                        <label>赛事分类</label>
                        <div id="addCategories" class="tag-list"></div>
                        <div class="mt-2">
                            <input type="text" id="addNewCategory" class="form-control" placeholder="输入分类名称后按回车添加" style="width:250px;display:inline-block;">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>奖项设置</label>
                        <div id="addPrizes">
                            <div class="prize-row">
                                <input type="text" class="form-control prize-rank" placeholder="奖项名称（如：一等奖）" style="width:150px;display:inline-block;">
                                <input type="text" class="form-control prize-content" placeholder="奖项内容（如：专业相机 + 荣誉证书）" style="flex:1;display:inline-block;margin-left:5px;">
                                <button class="btn btn-sm btn-danger" onclick="removeTournamentPrize(this)" style="margin-left:5px;">×</button>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary mt-2" onclick="addTournamentPrize()">➕ 添加奖项</button>
                    </div>
                    
                    <div class="form-group">
                        <label>赛事状态</label>
                        <select id="addStatus" class="form-control">
                            <option value="active" selected>🔥 进行中</option>
                            <option value="ended">🏁 已结束</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" id="saveNewTournamentBtn">创建赛事</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("body").append(modalHtml);
    $("#tournamentAddModal").modal("show");
    
    $("#addNewCategory").keypress(function(e) {
        if (e.which === 13) {
            const val = $(this).val().trim();
            if (val) {
                $("#addCategories").append(`<div class="tag-item">${val} <span class="tag-remove" onclick="removeTournamentCategory(this)">×</span></div>`);
                $(this).val("");
            }
        }
    });
    
    $("#saveNewTournamentBtn").click(function() {
        const name = $("#addName").val().trim();
        const startTime = $("#addStartTime").val();
        const endTime = $("#addEndTime").val();
        const voteStart = $("#addVoteStart").val();
        const voteEnd = $("#addVoteEnd").val();
        
        if (!name) {
            alert("请输入赛事名称");
            return;
        }
        
        if (!startTime || !endTime || !voteStart || !voteEnd) {
            alert("请填写完整的时间信息");
            return;
        }
        
        const categories = [];
        $("#addCategories .tag-item").each(function() {
            categories.push($(this).text().trim().replace(/×$/, ''));
        });
        
        const prizes = [];
        $("#addPrizes .prize-row").each(function() {
            const rank = $(this).find(".prize-rank").val().trim();
            const prize = $(this).find(".prize-content").val().trim();
            if (rank && prize) {
                prizes.push({ rank, prize });
            }
        });
        
        const newTournament = {
            id: Date.now(),
            name,
            description: $("#addDescription").val().trim(),
            startTime,
            endTime,
            voteStart,
            voteEnd,
            status: $("#addStatus").val(),
            categories: categories.length > 0 ? categories : ["综合"],
            prizes: prizes.length > 0 ? prizes : [
                { rank: "一等奖", prize: "荣誉证书" },
                { rank: "二等奖", prize: "荣誉证书" },
                { rank: "三等奖", prize: "荣誉证书" }
            ],
            winners: []
        };
        
        tournamentList.push(newTournament);
        localStorage.setItem("tournamentList", JSON.stringify(tournamentList));
        $("#tournamentAddModal").modal("hide");
        alert("赛事创建成功");
        renderTournamentManagement();
    });
    
    $("#tournamentAddModal").on("hidden.bs.modal", function() {
        $(this).remove();
    });
}

function searchChainData() {
    const keyword = $("#chainSearch").val().trim();
    if (!keyword) {
        alert("请输入查询关键词");
        return;
    }
    
    const results = photographyWorkList.filter(w => 
        w.hash && w.hash.includes(keyword) || 
        w.txHash && w.txHash.includes(keyword)
    );
    
    let htmlStr = "";
    if (results.length === 0) {
        htmlStr = '<div class="alert alert-info" style="border-radius:8px;">⚠️ 未找到匹配的链上数据</div>';
    } else {
        results.forEach(work => {
            htmlStr += `
            <div class="card mb-3">
                <div class="card-body">
                    <h4 class="card-title">${work.workName}</h4>
                    <p><strong>📷 图片哈希：</strong>${work.hash || "无"}</p>
                    <p><strong>🔗 交易哈希：</strong>${work.txHash || "无"}</p>
                    <p><strong>👤 作者：</strong>${work.authorNick}</p>
                    <p><strong>📅 上传时间：</strong>${work.createTime}</p>
                </div>
            </div>
            `;
        });
    }
    
    $("#chainResult").html(htmlStr);
}

async function renderAdminBlockchain() {
    console.log(`=== 开始刷新管理员链上查询 ===`);
    
    // 辅助函数：根据钱包地址获取本系统账号名
    function getAccountByWalletAddress(address) {
        if (!address) return "系统";
        const cleanAddr = address.toLowerCase();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith("photography_user_")) {
                try {
                    const user = JSON.parse(localStorage.getItem(key));
                    if (user && user.walletAddress && user.walletAddress.toLowerCase() === cleanAddr) {
                        return user.account;
                    }
                } catch (e) {}
            }
        }
        return address.substring(0, 8) + "...";
    }

    let blockNumber = 0;
    let certCount = 0;
    let pendingCount = 0;
    let txCount = 0;
    let latestBlocks = [];
    let isSimulation = false;

    try {
        if (!web3) {
            console.log(`正在初始化Web3...`);
            await initWeb3();
            console.log(`✅ Web3初始化成功`);
        }
        
        blockNumber = await getBlockNumber();
        console.log(`✅ 区块高度: ${blockNumber}`);
        
        certCount = 0;
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
        
        txCount = 0;
        for (let i = 0; i <= blockNumber; i++) {
            const block = await web3.eth.getBlock(i);
            if (block) {
                txCount += block.transactions.length;
            }
        }
        console.log(`✅ 交易总数: ${txCount}`);
        
        pendingCount = 0;
        photographyWorkList.forEach(w => {
            if (!w.onChain && w.pendingOnChain) pendingCount++;
        });
        console.log(`待上链: ${pendingCount}`);
        
        for (let i = blockNumber; i >= Math.max(0, blockNumber - 19); i--) {
            const block = await web3.eth.getBlock(i);
            if (block) {
                latestBlocks.push(block);
            }
        }
    } catch (error) {
        console.warn('获取区块链真实数据失败，启用本地模拟链展示:', error);
        isSimulation = true;
        
        const user = getLoginUser();
        const localChain = getUserBlockchain(user ? user.account : 'admin');
        const stats = localChain.getStats();
        
        blockNumber = stats.blockCount - 1;
        if (blockNumber < 0) blockNumber = 0;
        certCount = stats.validCount;
        txCount = stats.txCount;
        pendingCount = stats.pendingCount;
        
        for (let i = localChain.chain.length - 1; i >= Math.max(0, localChain.chain.length - 20); i--) {
            const block = localChain.chain[i];
            if (block) {
                latestBlocks.push({
                    number: block.index,
                    hash: block.hash,
                    previousHash: block.previousHash,
                    timestamp: Math.floor(block.timestamp / 1000),
                    transactions: block.transactions
                });
            }
        }
    }

    $("#adminBlockCount").text(blockNumber);
    $("#adminValidCount").text(certCount);
    $("#adminPendingCount").text(pendingCount);
    $("#adminTxCount").text(txCount);
    
    const tbody = $("#adminBlockList");
    tbody.empty();
    
    for (const block of latestBlocks) {
        let fromAccount = "系统";
        if (block.transactions && block.transactions.length > 0) {
            if (isSimulation) {
                const tx = block.transactions[0];
                fromAccount = tx.sender ? getAccountByWalletAddress(tx.sender) : "系统";
            } else {
                try {
                    const tx = await web3.eth.getTransaction(block.transactions[0]);
                    if (tx && tx.from) {
                        fromAccount = getAccountByWalletAddress(tx.from);
                    }
                } catch (txError) {
                    console.log('获取交易详情失败:', txError);
                }
            }
        }
        
        tbody.append(`
            <tr>
                <td>${fromAccount}</td>
                <td>${block.number}</td>
                <td style="font-family: monospace; font-size: 11px;">${block.hash.substring(0, 16)}...</td>
                <td>${block.transactions.length}</td>
                <td>${new Date(Number(block.timestamp) * 1000).toLocaleString()}</td>
            </tr>
        `);
    }
    
    if (latestBlocks.length === 0) {
        tbody.append('<tr><td colspan="5" class="text-center text-secondary">暂无区块数据</td></tr>');
    }
    
    $("#adminClearChainBtn").off("click").click(() => {
        if (isSimulation) {
            if (confirm("确定要清空本地模拟的链上数据吗？")) {
                const user = getLoginUser();
                const account = user ? user.account : 'admin';
                localStorage.removeItem(`photography_blockchain_${account}`);
                alert("已成功清空本地模拟链数据！");
                renderAdminBlockchain();
            }
        } else {
            alert("提示：当前系统已连接至真实以太坊区块链(Ganache)，区块数据具有不可篡改性，无法通过此按钮清空。\n\n如果您需要重置链上数据，请在Ganache客户端中点击“Reset”或重启Ganache网络项目即可。");
        }
    });
}

function renderAnnouncementManagement() {
    let htmlStr = "";
    
    announcementList.forEach((announcement, index) => {
        htmlStr += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-10">
                        <h5 class="card-title">${announcement.title}</h5>
                        <p class="text-secondary">${announcement.content}</p>
                        <small class="text-secondary">📅 ${announcement.time}</small>
                    </div>
                    <div class="col-md-2 text-right">
                        <button class="btn btn-sm btn-primary editAnnouncementBtn" data-index="${index}" style="margin-right:5px;">✏️ 编辑</button>
                        <button class="btn btn-sm btn-danger deleteAnnouncementBtn" data-index="${index}">🗑️ 删除</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    $("#announcementManageList").html(htmlStr || '<div class="text-center text-secondary">暂无公告</div>');
    
    $(".editAnnouncementBtn").click(function() {
        const index = $(this).data("index");
        const announcement = announcementList[index];
        if (!announcement) return;
        
        const modalHtml = `
        <div class="modal fade" id="editAnnouncementModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                        <h4 class="modal-title">编辑公告</h4>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="editAnnouncementIndex" value="${index}">
                        <div class="form-group">
                            <label>公告标题</label>
                            <input type="text" id="editAnnouncementTitle" class="form-control" value="${announcement.title}">
                        </div>
                        <div class="form-group">
                            <label>公告内容</label>
                            <textarea id="editAnnouncementContent" class="form-control" rows="4">${announcement.content}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveEditAnnouncementBtn">保存修改</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        $("body").append(modalHtml);
        $("#editAnnouncementModal").modal("show");
        
        $("#saveEditAnnouncementBtn").click(function() {
            const idx = $("#editAnnouncementIndex").val();
            const newTitle = $("#editAnnouncementTitle").val().trim();
            const newContent = $("#editAnnouncementContent").val().trim();
            
            console.log(`=== 编辑公告 ===`);
            console.log(`索引: ${idx}`);
            console.log(`原标题: ${announcementList[idx].title}`);
            console.log(`新标题: ${newTitle}`);
            console.log(`原内容: ${announcementList[idx].content}`);
            console.log(`新内容: ${newContent}`);
            
            announcementList[idx].title = newTitle;
            announcementList[idx].content = newContent;
            announcementList[idx].time = new Date().toLocaleString();
            
            localStorage.setItem("announcementList", JSON.stringify(announcementList));
            
            const savedList = JSON.parse(localStorage.getItem("announcementList"));
            console.log(`保存后验证:`);
            console.log(`标题: ${savedList[idx].title}`);
            console.log(`内容: ${savedList[idx].content}`);
            
            $("#editAnnouncementModal").modal("hide");
            alert("公告修改成功");
            renderAnnouncementManagement();
            renderNotifications();
        });
        
        $("#editAnnouncementModal").on("hidden.bs.modal", function() {
            $(this).remove();
        });
    });
    
    $(".deleteAnnouncementBtn").click(function() {
        const index = $(this).data("index");
        if (confirm(`确定要删除公告 "${announcementList[index].title}" 吗？`)) {
            announcementList.splice(index, 1);
            localStorage.setItem("announcementList", JSON.stringify(announcementList));
            alert("公告删除成功");
            renderAnnouncementManagement();
            renderNotifications();
        }
    });
}

function addAnnouncement() {
    const modalHtml = `
    <div class="modal fade" id="addAnnouncementModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">发布公告</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>公告标题 <span class="text-danger">*</span></label>
                        <input type="text" id="addAnnouncementTitle" class="form-control" placeholder="请输入公告标题">
                    </div>
                    <div class="form-group">
                        <label>公告内容 <span class="text-danger">*</span></label>
                        <textarea id="addAnnouncementContent" class="form-control" rows="4" placeholder="请输入公告内容"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" id="saveNewAnnouncementBtn">发布公告</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("body").append(modalHtml);
    $("#addAnnouncementModal").modal("show");
    
    $("#saveNewAnnouncementBtn").click(function() {
        const title = $("#addAnnouncementTitle").val().trim();
        const content = $("#addAnnouncementContent").val().trim();
        
        if (!title) {
            alert("请输入公告标题");
            return;
        }
        
        if (!content) {
            alert("请输入公告内容");
            return;
        }
        
        announcementList.unshift({
            title,
            content,
            time: new Date().toLocaleString()
        });
        
        localStorage.setItem("announcementList", JSON.stringify(announcementList));
        $("#addAnnouncementModal").modal("hide");
        alert("公告发布成功");
        renderAnnouncementManagement();
        renderNotifications();
    });
    
    $("#addAnnouncementModal").on("hidden.bs.modal", function() {
        $(this).remove();
    });
}

function renderFeedbackManagement(filter = "all") {
    loadFeedbackList();
    
    let filtered = feedbackList;
    if (filter === "unread") {
        filtered = feedbackList.filter(f => f.status === "unread");
    } else if (filter === "read") {
        filtered = feedbackList.filter(f => f.status === "read");
    }
    
    if (filtered.length === 0) {
        $("#feedbackManageList").html('<div class="text-center text-secondary">暂无反馈记录</div>');
        return;
    }
    
    let html = "";
    filtered.forEach(feedback => {
        const typeLabels = {
            "tournament": "🏆 赛事建议",
            "certify": "⛓️ 存证功能问题",
            "market": "💰 版权集市",
            "bug": "🐛 系统bug",
            "other": "💡 其他建议"
        };
        
        html += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${feedback.title}</h5>
                            <span class="label ${feedback.status === 'unread' ? 'label-warning' : 'label-success'}">
                                ${feedback.status === 'unread' ? '未读' : '已读'}
                            </span>
                        </div>
                        <p class="text-secondary small mt-1">
                            ${typeLabels[feedback.type]} | 用户: ${feedback.userName} (${feedback.userRole}) | ${feedback.time}
                        </p>
                        <p class="card-text mt-2">${feedback.content}</p>
                        ${feedback.contact ? `<p class="text-secondary small">联系方式: ${feedback.contact}</p>` : ''}
                        ${feedback.reply ? `
                        <div class="mt-3 p-3 bg-success-light rounded">
                            <p class="text-success small font-weight-bold">管理员回复:</p>
                            <p>${feedback.reply}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="col-md-4" style="display: flex; flex-direction: column; gap: 6px;">
                        ${feedback.status === 'unread' ? 
                            `<button class="btn btn-sm btn-warning" onclick="markFeedbackRead(${feedback.id})">标记已读</button>` : 
                            `<button class="btn btn-sm btn-default" onclick="markFeedbackUnread(${feedback.id})">标记未读</button>`
                        }
                        <button class="btn btn-sm btn-primary" onclick="showReplyFeedbackModal(${feedback.id})">回复用户</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteFeedback(${feedback.id})">删除</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    $("#feedbackManageList").html(html);
}

function markFeedbackRead(id) {
    loadFeedbackList();
    const feedback = feedbackList.find(f => f.id === id);
    if (feedback) {
        feedback.status = "read";
        saveFeedbackList();
        renderFeedbackManagement();
    }
}

function markFeedbackUnread(id) {
    loadFeedbackList();
    const feedback = feedbackList.find(f => f.id === id);
    if (feedback) {
        feedback.status = "unread";
        saveFeedbackList();
        renderFeedbackManagement();
    }
}

function showReplyFeedbackModal(id) {
    loadFeedbackList();
    const feedback = feedbackList.find(f => f.id === id);
    if (!feedback) return;
    
    const modalHtml = `
    <div class="modal fade" id="replyFeedbackModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">回复反馈: ${feedback.title}</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>反馈内容</label>
                        <textarea class="form-control" rows="3" readonly>${feedback.content}</textarea>
                    </div>
                    <div class="form-group">
                        <label>回复内容 <span style="color:red;">*</span></label>
                        <textarea id="replyContent" class="form-control" rows="5" placeholder="请输入回复内容..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" id="submitReplyBtn">发送回复</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    $("body").append(modalHtml);
    $("#replyFeedbackModal").modal("show");
    
    $("#submitReplyBtn").click(function() {
        const reply = $("#replyContent").val().trim();
        if (!reply) {
            alert("请输入回复内容");
            return;
        }
        
        loadFeedbackList();
        const f = feedbackList.find(item => item.id === id);
        if (f) {
            f.reply = reply;
            f.status = "read";
            saveFeedbackList();
            
            $("#replyFeedbackModal").modal("hide");
            alert("回复成功！");
            renderFeedbackManagement();
        }
    });
    
    $("#replyFeedbackModal").on("hidden.bs.modal", function() {
        $(this).remove();
    });
}

function deleteFeedback(id) {
    if (!confirm("确定要删除这条反馈吗？")) return;
    
    loadFeedbackList();
    feedbackList = feedbackList.filter(f => f.id !== id);
    saveFeedbackList();
    renderFeedbackManagement();
}

function renderTransactionStats(timeFilter) {
    const storageWorks = JSON.parse(localStorage.getItem("photographyWorks") || "[]");
    console.log(`=== 交易统计刷新 ===`);
    console.log(`storageWorks总数: ${storageWorks.length}`);
    
    const purchasedWorks = storageWorks.filter(w => w.isPurchased && w.purchaseTime);
    console.log(`已购买作品数: ${purchasedWorks.length}`);
    purchasedWorks.forEach(w => {
        console.log(`作品: ${w.workName}, isPurchased: ${w.isPurchased}, purchaseTime: ${w.purchaseTime}, purchasePrice: ${w.purchasePrice}`);
    });
    
    let filteredWorks = purchasedWorks;
    
    const now = new Date();
    if (timeFilter === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredWorks = purchasedWorks.filter(w => {
            const purchaseDate = new Date(w.purchaseTime);
            return purchaseDate >= today;
        });
    } else if (timeFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredWorks = purchasedWorks.filter(w => {
            const purchaseDate = new Date(w.purchaseTime);
            return purchaseDate >= weekAgo;
        });
    } else if (timeFilter === "month") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredWorks = purchasedWorks.filter(w => {
            const purchaseDate = new Date(w.purchaseTime);
            return purchaseDate >= monthAgo;
        });
    }
    
    const totalOrders = filteredWorks.length;
    
    let totalEth = 0;
    filteredWorks.forEach(w => {
        if (w.purchasePrice) {
            totalEth += parseFloat(w.purchasePrice);
        } else if (w.price) {
            totalEth += parseFloat(w.price) / 2000;
        }
    });
    
    const ethRate = 2000;
    const totalCny = totalEth * ethRate;
    
    const workTransactionCounts = {};
    const workTransactionAmounts = {};
    const workLastTransactionTimes = {};
    
    filteredWorks.forEach(w => {
        const workId = w.id;
        workTransactionCounts[workId] = (workTransactionCounts[workId] || 0) + 1;
        const amount = w.purchasePrice ? parseFloat(w.purchasePrice) : (parseFloat(w.price) / 2000 || 0);
        workTransactionAmounts[workId] = (workTransactionAmounts[workId] || 0) + amount;
        workLastTransactionTimes[workId] = w.purchaseTime;
    });
    
    const hotWorks = Object.keys(workTransactionCounts)
        .map(workId => {
            const work = storageWorks.find(w => w.id === parseInt(workId));
            return {
                id: parseInt(workId),
                name: work ? work.workName : "未知作品",
                author: work ? work.authorNick : "未知作者",
                count: workTransactionCounts[workId],
                amount: workTransactionAmounts[workId],
                lastTime: workLastTransactionTimes[workId]
            };
        })
        .sort((a, b) => b.count - a.count);
    
    $("#txTotalOrders").text(totalOrders);
    $("#txTotalEth").text(totalEth.toFixed(4) + " ETH");
    $("#txTotalCny").text("¥" + totalCny.toFixed(2));
    $("#txHotWork").text(hotWorks.length);
    
    let hotWorksHtml = "";
    hotWorks.slice(0, 10).forEach((work, index) => {
        hotWorksHtml += `
        <tr>
            <td>${index + 1}</td>
            <td>${work.name}</td>
            <td>${work.author}</td>
            <td>${work.count}</td>
            <td>${work.amount.toFixed(4)} ETH</td>
            <td>${work.lastTime}</td>
        </tr>
        `;
    });
    $("#txHotWorksList").html(hotWorksHtml || '<tr><td colspan="6" class="text-center text-secondary">暂无交易数据</td></tr>');
    
    const recentOrders = filteredWorks
        .map(w => ({
            id: w.purchaseId || w.id,
            name: w.workName,
            buyer: w.buyerNick || "未知买家",
            seller: w.authorNick || "未知卖家",
            amount: w.purchasePrice ? parseFloat(w.purchasePrice) : (parseFloat(w.price) / 2000 || 0),
            time: w.purchaseTime,
            txHash: w.purchaseTxHash || "-"
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);
    
    let recentOrdersHtml = "";
    recentOrders.forEach(order => {
        recentOrdersHtml += `
        <tr>
            <td>${order.id}</td>
            <td>${order.name}</td>
            <td>${order.buyer}</td>
            <td>${order.seller}</td>
            <td>${order.amount.toFixed(4)} ETH</td>
            <td>${order.time}</td>
            <td><span class="text-primary font-mono small">${order.txHash}</span></td>
        </tr>
        `;
    });
    $("#txRecentOrders").html(recentOrdersHtml || '<tr><td colspan="7" class="text-center text-secondary">暂无交易数据</td></tr>');
}