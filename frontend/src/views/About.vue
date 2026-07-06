<template>
  <div class="container main-content" style="margin-top: 30px; margin-bottom: 50px;">
    <!-- 头部卡片 -->
    <div class="about-section">
      <h2 style="border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📋 平台简介</h2>
      <div class="about-card" style="padding: 30px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; margin-top: 20px;">
        <p style="font-size: 16px; line-height: 1.8;">
          <strong>光影存证</strong> 是一个基于以太坊区块链技术的专业摄影赛事与版权确权交易平台。
          <br />致力于解决摄影师原创作品被盗用、数字版权维权困难、赛事管理线上化不透明等行业痛点。
          <br />我们将区块链的“不可篡改、时间戳可信”特性与摄影赛事流程深度融合，
          <br />为每一幅参赛及商用摄影作品生成专属的数字凭证，让光影的记录者得到尊重，让原创价值永流传。
        </p>
        <p style="font-size: 16px; line-height: 1.8; margin-top: 15px;">
          无论是专业摄影师还是摄影爱好者，都可以在这里参加各类丰富赛道的主题摄影赛事，获得大奖认证；
          <br />同时，平台提供链上智能合约结算的版权交易集市，帮助创作者快捷实现版权的商业价值转化。
        </p>
      </div>
    </div>

    <!-- 核心功能 -->
    <div class="about-section" style="margin-top: 40px;">
      <h2 style="border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">🚀 核心功能</h2>
      <div class="row" style="margin-top: 20px;">
        <div class="col-md-6">
          <div class="about-card" style="margin-bottom: 20px; padding: 20px; min-height: 220px; border-radius: 8px;">
            <div class="icon" style="font-size: 32px; margin-bottom: 10px;">📸</div>
            <h3>线上摄影赛事</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
              <li>丰富多样的主题赛事分类，涵盖风光摄影、人像、纪实人文等</li>
              <li>完备的投稿流程与拍摄器材（EXIF信息）录入</li>
              <li>每日限投一票的大众大众评审投票机制</li>
              <li>赛事结束自动结算并由管理员评选出卓越获奖作品</li>
            </ul>
          </div>
        </div>

        <div class="col-md-6">
          <div class="about-card" style="margin-bottom: 20px; padding: 20px; min-height: 220px; border-radius: 8px;">
            <div class="icon" style="font-size: 32px; margin-bottom: 10px;">⛓️</div>
            <h3>区块链版权存证</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
              <li>作品投稿/审核通过后，哈希与原创信息自动写入以太坊智能合约</li>
              <li>区块链全网记账，生成独一无二的交易哈希和高度</li>
              <li>区块链凭证终身可查，为摄影维权提供铁证</li>
              <li>内置轻量级“模拟链”系统，在未接入 Ganache 时依然可以完整模拟</li>
            </ul>
          </div>
        </div>

        <div class="col-md-6">
          <div class="about-card" style="margin-bottom: 20px; padding: 20px; min-height: 220px; border-radius: 8px;">
            <div class="icon" style="font-size: 32px; margin-bottom: 10px;">💰</div>
            <h3>版权交易集市</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
              <li>透明、合规的摄影作品商用使用授权交易</li>
              <li>智能合约底层控制，购买后资产与款项在卖家/买家钱包原子结算</li>
              <li>详细流转记录：流转资金日志在后台永久记载</li>
              <li>一次购买，区块链终生确认授权，避免二次纠纷</li>
            </ul>
          </div>
        </div>

        <div class="col-md-6">
          <div class="about-card" style="margin-bottom: 20px; padding: 20px; min-height: 220px; border-radius: 8px;">
            <div class="icon" style="font-size: 32px; margin-bottom: 10px;">🏆</div>
            <h3>作品展厅与人气榜</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
              <li>人气热度榜单实时更新，按照得票数、版权价格和最新投稿展示</li>
              <li>往期赛事历史展厅，陈列一等奖、二等奖等获奖摄影作品</li>
              <li>大图光影暗房（Lightbox）交互大图展示，可拖拉式预览</li>
              <li>摄影师个人专栏，集成摄影师发表的完整画廊集</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术与法律 -->
    <div class="about-section" style="margin-top: 40px;">
      <h2 style="border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">🔐 技术与法律双重保障</h2>
      <div class="tech-item" style="margin-top: 20px; padding: 20px; border-left: 4px solid #4f46e5; background: rgba(255,255,255,0.02); border-radius: 0 8px 8px 0;">
        <h4>🔗 智能合约与去中心化确权</h4>
        <p style="line-height: 1.8; margin-top: 10px;">
          本平台部署有以太坊智能合约 `PhotoCertification.sol`。当摄影师的原创作品被管理员审核时，系统将作品的核心像素MD5、标题、作者地址、时间戳融合成存证信息写入区块链节点。这使得任何第三方均无法以伪造的时间或者内容进行抢注。
        </p>
      </div>
      <div class="tech-item" style="margin-top: 20px; padding: 20px; border-left: 4px solid #10b981; background: rgba(255,255,255,0.02); border-radius: 0 8px 8px 0;">
        <h4>⚖️ 国家司法链存证效力保障</h4>
        <p style="line-height: 1.8; margin-top: 10px;">
          依据我国《中华人民共和国电子签名法》、《最高人民法院关于司法公开的六项规定》及相关诉讼证据规则，利用区块链可信时间戳、防篡改哈希算法存证的数字资产信息，在符合技术接入与真实性要求的前提下，可被各级互联网法院及地方法院直接采信为具有排他性的原创归属证据，为合法维权诉讼减负。
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'About'
}
</script>
