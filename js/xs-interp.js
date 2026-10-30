/*!
 * xs-interp.js —— 白话解读引擎（象数工坊）
 * 把排盘结果翻译成普通人能看懂的话：一句话结论 + 分段解读 + 行动建议 + 术语提示
 * 纯数据层，与界面无关，可单独测试。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./xs-data.js')); }
  else { root.XS = root.XS || {}; root.XS.Interp = factory(root.XS.Data); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';

  /* ==================== 词条表 ==================== */
  // 十天干日主性格（传统说法）
  var GAN_CHAR = {
    甲: '像大树，正直向上、有担当，不喜欢被压着，认准的事会一直长上去',
    乙: '像藤蔓花草，柔韧灵活、会借力，能屈能伸，适应力强',
    丙: '像太阳，热情外放、光明磊落，来得快也去得快，藏不住话',
    丁: '像灯烛，细腻温暖、内敛持久，重感情，认人',
    戊: '像大山厚土，稳重能承载，讲信用，但偏保守、有时固执',
    己: '像田园之土，包容细致、会照顾人，心思多、想得远',
    庚: '像刀剑钢铁，刚毅果决、讲义气重原则，直来直去不绕弯',
    辛: '像珠玉首饰，精致敏锐、重体面，讲究细节，有点挑剔',
    壬: '像江海大河，眼界开阔、机动灵活，喜欢变化和闯荡',
    癸: '像雨露泉水，心思细密、直觉强，含蓄内敛，情绪丰富'
  };
  // 十神白话
  var SHI_SHEN = {
    比肩: '自立、讲义气，同辈往来多；好处是能靠自己，坏处是容易与人分夺、暗暗较劲',
    劫财: '朋友合伙的事多、场面开销大；机会常从人脉来，但破财也常从人脉来，合作先立规矩',
    食神: '才艺、口福、心情舒展，属于"温和地输出"；利名声、利副业、利养身',
    伤官: '聪明外露、表现欲强、不服约束；适合靠才华和表达吃饭，但要防恃才傲物、顶撞人',
    偏财: '活钱、外快、偏门机会与应酬；出手大方、交际广，钱来得快去得也快',
    正财: '稳定的进项、务实经营；肯干肯攒，利置产储蓄、利成家',
    七杀: '压力、魄力、竞争与权威；事急事重、被推着往前走，制化得好是担当，制不住就是焦虑',
    正官: '规矩、名分、责任与考试文书；适合走正规路径，宜守规矩、忌走偏门',
    偏印: '偏门学问、敏感多想；学东西快而杂，但容易孤僻少动、思虑过重',
    正印: '学习、长辈庇荫、文书证件；读书考试、拜师求人这一类事顺，宜进修'
  };
  // 十神在大运/流年上的运势白话
  var SHI_SHEN_WHITE = {
    比肩: '同辈往来与竞争同时变多，靠自己最稳，合作要分明',
    劫财: '人脉热闹但容易破财，合伙借钱的事要谨慎',
    食神: '心情舒展、才艺有处使，利名声、副业、身体调养',
    伤官: '想法多、想换环境、想表达；忌冲动辞职、忌口舌之争',
    偏财: '偏门机会与外快增多，应酬也多，见好就收',
    正财: '进项转稳、宜务实经营，是攒钱置产的时段',
    七杀: '压力大、事急事重、竞争激烈，宜借势，也要防被压',
    正官: '名分与责任加身，考试、职务、文书之事宜求正途',
    偏印: '思虑多、易钻牛角尖，适合闭门学东西，注意作息与情绪',
    正印: '学习进修、长辈贵人、文书证件顺利，宜拜师求人'
  };
  // 五行生活化调理（传统说法）
  var WX_TIPS = {
    木: { dir:'东方', color:'青、绿', life:'多接触树木绿地、早起活动；文教、园艺、木材、中医药一类的事更顺手', season:'春季' },
    火: { dir:'南方', color:'红、紫、橙', life:'多晒太阳、保持热度和社交；电子、能源、餐饮、传媒一类的事更顺手', season:'夏季' },
    土: { dir:'本地或中部', color:'黄、棕、卡其', life:'作息规律、脚踏实地、常回老家；建筑、地产、农业、仓储一类的事更顺手', season:'辰未戌丑月' },
    金: { dir:'西方', color:'白、金、银', life:'做事果断、多与器械金属打交道；机械、金融、军警、五金一类的事更顺手', season:'秋季' },
    水: { dir:'北方', color:'黑、蓝、灰', life:'多近水、多走动、常换环境；贸易、物流、水产、旅游一类的事更顺手', season:'冬季' }
  };
  // 六宫浓缩白话
  var GONG_WHITE = {
    大安: '稳。事情多半不动、平稳、能守住',
    留连: '拖。事情黏着、反复、一时半会儿没结果',
    速喜: '快。消息来得快、喜事近、宜抓紧',
    赤口: '争。口舌是非、争执、容易起冲突',
    小吉: '顺。和合顺利、有人帮、宜商量',
    空亡: '空。容易落空、白费力气、宜重新打算'
  };

  function wn(gan) { return D.GAN_WX[gan] || ''; }
  function rel(aWx, bWx) {
    if (aWx === bWx) return '比和';
    if (D.WX_SHENG[bWx] === aWx) return '生我';
    if (D.WX_SHENG[aWx] === bWx) return '我生';
    if (D.WX_KE[bWx] === aWx) return '克我';
    if (D.WX_KE[aWx] === bWx) return '我克';
    return '';
  }
  function relWhite(r2, me) {
    return ({ '比和':'同气，顺中有争', '生我':'来帮我，是助力', '我生':'要花力气去养它，是付出', '克我':'来压我，是压力也是机会', '我克':'我能掌控，是财路也是担子' })[r2] || '';
  }
  function num2cn(n) { return ['零','一','二','三','四','五','六','七','八','九','十'][n] || String(n); }

  /* ==================== 一、八字解读 ==================== */
  function bazi(r) {
    var L = [], head, tips = [], sections = [];
    var dayGan = r.dayMaster.gan, dayWx = r.dayMaster.wuXing;
    var monthZhi = r.pillars[1].zhi, monthHide = r.pillars[1].hideGan;
    var ge = monthHide.length ? monthHide[0].shiShen : '';

    // 一句话
    head = '日主是「' + dayGan + dayWx + '」，生在' + monthZhi + '月，'
      + (r.strength.deLing ? '得月令之气，底子有力' : '不得月令之气')
      + '；整体' + r.strength.level + '。' + (ge ? '月上以「' + ge + '」为主，是这一局最显眼的主题。' : '');

    // 性格
    var s1 = '你的日主是' + dayGan + '（' + dayWx + '）：' + GAN_CHAR[dayGan] + '。';
    // 统计十神轻重
    var cnt = {};
    function add(k, w) { if (!k || k === '日主') return; cnt[k] = (cnt[k] || 0) + w; }
    r.pillars.forEach(function (p, i) {
      if (i !== 2) add(p.ganShiShen, 2);
      p.hideGan.forEach(function (h, j) {
        var w = (i === 1 && j === 0) ? 3 : (j === 0 ? 1.2 : 0.6);
        add(h.shiShen, w);
      });
    });
    var ranked = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 3);
    if (ranked.length) {
      s1 += '命局里最重的是' + ranked.map(function (k) { return '「' + k + '」'; }).join('、') + '。'
        + ranked.map(function (k) { return k + '——' + SHI_SHEN[k] + '。'; }).join('');
    }
    sections.push({ h: '一、性格与做事风格', p: s1 });

    // 五行与调理
    var WX = ['木', '火', '土', '金', '水'];
    var maxK = WX[0], minK = WX[0];
    WX.forEach(function (k) {
      if (r.wuXing.score[k] > r.wuXing.score[maxK]) maxK = k;
      if (r.wuXing.score[k] < r.wuXing.score[minK]) minK = k;
    });
    var s2 = '五行分布：' + WX.map(function (k) { return k + r.wuXing.score[k].toFixed(2); }).join('、') + '。'
      + '其中' + maxK + '最旺（' + r.wuXing.score[maxK].toFixed(2) + '），' + minK + '最少（' + r.wuXing.score[minK].toFixed(2) + '）'
      + (r.wuXing.missing.length ? '，' + r.wuXing.missing.join('、') + '基本不见（计分＜0.35）' : '，五行大体不缺') + '。';
    s2 += r.strength.yongHint.text + '。';
    var favor = r.strength.yongHint.favor || [];
    if (favor.length) {
      var ft = favor.filter(function (k) { return WX_TIPS[k]; })[0];
      if (ft) s2 += '传统上偏向用「' + favor.join('、') + '」：方位取' + WX_TIPS[ft].dir + '，颜色宜' + WX_TIPS[ft].color
        + '，' + WX_TIPS[ft].life + '（这一类属民俗调理说法，信不信由你，别当医嘱）。';
    }
    sections.push({ h: '二、五行旺衰与调理方向', p: s2 });

    // 大运
    var yunLines = [];
    var cur = r.yun.current;
    if (cur) {
      var g = cur.gan, z = cur.zhi, sg = cur.shiShen;
      var rr = rel(dayWx, wn(g));
      yunLines.push('你现在走的是' + cur.ganZhi + '大运（' + cur.startAge + '～' + cur.endAge + '岁，' + cur.startYear + '～' + cur.endYear + '年）。'
        + '这一步的天干是' + g + wn(g) + '，对你是「' + sg + '」——' + (SHI_SHEN_WHITE[sg] || '') + '；'
        + '与日主是「' + rr + '」关系，' + relWhite(rr, dayWx) + '。');
    } else {
      yunLines.push('目前尚未进入第一步大运（起运前），此段以原局与流年论。');
    }
    var idx = r.yun.daYun.indexOf(cur);
    var next = [];
    for (var i = idx + 1; i < r.yun.daYun.length && next.length < 2; i++) { if (r.yun.daYun[i] && r.yun.daYun[i].ganZhi) next.push(r.yun.daYun[i]); }
    if (next.length) {
      yunLines.push('接下来：' + next.map(function (d) {
        return d.ganZhi + '运（' + d.startAge + '岁起）主题是「' + d.shiShen + '」——' + (SHI_SHEN_WHITE[d.shiShen] || '');
      }).join('；') + '。');
    }
    // 流年
    var nowYear = new Date().getFullYear(), ln = null;
    r.yun.daYun.forEach(function (d) { (d.liuNian || []).forEach(function (n) { if (n.year === nowYear) ln = n; }); });
    if (ln) {
      yunLines.push('今年' + ln.year + '是' + ln.ganZhi + '年，对你是「' + ln.shiShen + '」——' + (SHI_SHEN_WHITE[ln.shiShen] || '') + '。这正是眼下最贴身的一条提示。');
    }
    sections.push({ h: '三、大运与流年（走势）', p: yunLines });

    // 神煞
    var KEY_SS = {
      '天乙贵人': '贵人星，遇难有人搭手',
      '文昌贵人': '读书文书聪明，利考试',
      '禄神': '有衣禄根本，靠本事吃饭',
      '羊刃': '性子刚烈、敢拼，但忌冲动与争狠',
      '驿马': '一生走动多，离乡、出差、搬迁常见',
      '桃花(咸池)': '人缘情缘旺，异性缘好，也易惹是非',
      '将星': '有主事掌权之象，能带队',
      '华盖': '孤高清雅，亲近艺术、玄学、宗教',
      '魁罡': '性刚果断，认死理，忌被人激'
    };
    var picked = r.shenSha.filter(function (s) { return KEY_SS[s.name]; }).slice(0, 6);
    if (picked.length) {
      sections.push({ h: '四、命里的几个明显标记', p: picked.map(function (s) {
        return s.name + '落在' + s.zhi + '（' + s.ref + '）：' + KEY_SS[s.name] + '。';
      }).join('') });
    } else {
      sections.push({ h: '四、命里的几个明显标记', p: '本局常见神煞没有明显落点，说明命局特征不靠这些标记体现，主要看上面的旺衰与十神。' });
    }

    tips.push('上面是"盘面说了什么"，不是判决书——同一张盘，取舍不同、活法不同，结果差得远。');
    tips.push('旺衰与用神用的是扶抑简法（同党/异党比值），只作倾向参考；真要定喜用，还得看调候与格局。');
    tips.push('大运流年提示的是"这段时间的主题词"，具体到某件事，还是要看你自己怎么选。');
    return { headline: head, sections: sections, tips: tips };
  }

  /* ==================== 二、梅花易数解读 ==================== */
  function meihua(r) {
    if (!r || r.ok === false) return null;
    var j = r.judge;
    var head = '问的事得到「' + r.ben.name + '」，' + r.ben.meaning + '；'
      + ['初','二','三','四','五','上'][r.moving - 1] + '爻动，变成「' + r.bian.name + '」。体用关系是「' + j.rel + '」，' + j.level + '——' + j.text;
    var sections = [], tips = [];
    sections.push({ h: '一、眼前的处境（本卦 · 体用）', p:
      '体卦「' + r.tiYong.ti.name + '（' + r.tiYong.ti.wx + '）」代表你自己（主方），'
      + '用卦「' + r.tiYong.yong.name + '（' + r.tiYong.yong.wx + '）」代表你所问的这件事（对方）。'
      + '两者是「' + j.rel + '」：' + j.text
      + ' 本卦讲的是事情的起因与当前样子——' + r.ben.meaning + '。' });
    sections.push({ h: '二、中间会经历什么（互卦）', p:
      '互卦是「' + r.hu.name + '」（' + r.hu.meaning + '）。互卦管的是过程：事情走到中间，多半会出现这样的局面。'
      + '如果互卦之象对体卦有利，说明过程顺；不利，就要有中间出波折的心理准备。' });
    sections.push({ h: '三、最后会怎样（变卦）', p:
      '第' + r.moving + '爻动，用卦由「' + r.tiYong.yong.name + '」变成「' + (r.moving <= 3 ? r.bian.lower.name : r.bian.upper.name) + '」，'
      + '结果之象为「' + r.bian.name + '」（' + r.bian.meaning + '），与体卦是「' + r.judgeBian.rel + '」——' + r.judgeBian.text });
    if (r.wangShuai) {
      sections.push({ h: '四、眼下这个时间点帮不帮你', p:
        '起卦在' + r.wangShuai.monthZhi + '月，' + r.wangShuai.monthWx + '当令。体卦' + r.tiYong.ti.wx + '处「' + r.wangShuai.ti + '」：'
        + ({ '旺':'得时令之助，你现在有底气，扛得住', '相':'气势次旺，也算得力', '休':'不旺不衰，全看自己使不使劲', '囚':'被时令压着，有力使不出，宜等', '死':'时令全不帮你，硬来只会更累，宜缓宜守' })[r.wangShuai.ti] + '。' });
    }
    // 建议
    var adv = {
      '大吉': ['方向对了，趁势推进，别拖。', '该主动就主动，多找人商量反而更顺。'],
      '吉': ['事可成，但要自己动手、花些力气。', '基调是顺的，稳着做就能到。'],
      '中': ['体用不偏不倚：成败一半在自己，别赌运气，做两手准备。', '宜先小步试探，看清楚再加大投入。'],
      '中平': ['成败一半在自己：别赌运气，做两手准备。', '宜先小步试探，看清楚再加大投入。'],
      '小凶': ['这是"你在往外掏"的象，容易费力不讨好。', '量力而行，别硬撑面子。'],
      '凶': ['眼下受制明显，不建议硬上。', '缓一缓、换个时间或换个做法再问。']
    }[j.level] || [];
    tips = tips.concat(adv);
    if (r.xiangHint && r.xiangHint.length) {
      tips.push('取象参考：' + r.xiangHint.map(function (x) { return x.split('：')[1]; }).filter(Boolean).join('；') + '——断卦时常拿这些物象去"对号入座"，看事情会以什么人、什么物、什么方向出现。');
    }
    if (r.yingQi) tips.push('应期（什么时候应验）：' + r.yingQi.byNum + '。' + r.yingQi.byWx + '。事小按日、事大按月年自己掂量。');
    return { headline: head, sections: sections, tips: tips, overall: r.overall };
  }

  /* ==================== 三、六爻解读 ==================== */
  function liuyao(r, yong) {
    var sections = [], tips = [];
    var head = '本卦「' + r.ben.name + '」（' + r.ben.palace + '宫·' + r.ben.kind + '）'
      + (r.bian ? '，变「' + r.bian.name + '」' : '，六爻安静没有变卦')
      + '；月建' + r.time.monthGanZhi + '、日辰' + r.time.dayGanZhi + '，旬空' + r.time.xunKong + '。';
    if (yong && yong.found) head += '所问之事取「' + yong.subject + '」为用神：' + (yong.target ? ('临' + yong.target.posName + '（' + yong.target.liuQin + yong.target.ganZhi + '）') : '伏藏') + '。';

    // 世应
    var shi = r.yao[r.ben.shi - 1], ying = r.yao[r.ben.ying - 1];
    var sr = rel(shi.wx, ying.wx);
    sections.push({ h: '一、你与对方（世应）', p:
      '「世」代表你自己，落在' + shi.posName + '，是' + shi.liuQin + shi.ganZhi + '；'
      + '「应」代表对方或环境，落在' + ying.posName + '，是' + ying.liuQin + ying.ganZhi + '。'
      + '两者是「' + sr + '」关系：' + ({ '生我':'对方来助你，可借力', '我生':'你在为对方付出，容易破财费力', '克我':'对方压着你，宜防受制', '我克':'你压得住局面，主动权在你', '比和':'两边同气，好商量、也好讲话' })[sr] + '。' });

    // 用神
    if (yong && yong.found) {
      var p = yong.text.split('\n').filter(function (x) { return x; }).map(function (x) { return x; }).join(' ');
      sections.push({ h: '二、所问之事的关键（用神）', p: p });
    } else if (yong && !yong.found) {
      sections.push({ h: '二、所问之事的关键（用神）', p: yong.text });
    } else {
      sections.push({ h: '二、所问之事的关键（用神）', p:
        '你还没在「所占之事」里选项目，所以工具没有替你定用神。六爻断卦第一步就是取用神：'
        + '求财看妻财、事业官讼看官鬼、考试文书房屋看父母、子女平安看子孙、兄弟竞争看兄弟。'
        + '在上面选一个，解读会立刻跟着变。' });
    }

    // 动爻与变化
    var dong = r.yao.filter(function (y) { return y.moving; });
    if (!dong.length) {
      sections.push({ h: '三、变化在哪里', p: '六爻安静、没有动爻，说明事情目前"不动"：多半维持现状、没什么大变化。这种情况看卦象、世应与日月生克就够了，别急着行动。' });
    } else {
      sections.push({ h: '三、变化在哪里', p:
        '有' + dong.length + '个爻在动：' + dong.map(function (y) { return y.posName + '（' + y.liuQin + y.ganZhi + '）'; }).join('、') + '。'
        + (dong.length >= 4 ? '动爻太多，说明事情头绪乱、牵涉面广，宜先理主线，别眉毛胡子一把抓。' : '动爻是事情的枢机，事情会从这些爻位上起变化。')
        + (r.bian ? ' 变卦为「' + r.bian.name + '」（' + r.bian.meaning + '），是变化之后的样子。' : '') });
    }

    // 卦体气象
    var qi = [];
    if (r.ben.chongGua) qi.push('本卦是六冲卦：主"散"与"快"——急事反而有利，久拖的事容易散掉，人心也难聚。');
    if (r.ben.heGua) qi.push('本卦是六合卦：主"合"与"缓"——事情多半能成，但节奏慢，且容易被牵住脱不开身。');
    if (r.fanYin.length) qi.push(r.fanYin.join('、') + '：主反复颠倒，同一件事容易来回翻烧饼。');
    if (r.fuYin.length) qi.push(r.fuYin.join('、') + '：主原地踏步、反复呻吟，事情卡着不动。');
    if (r.missing.length) qi.push('本卦不见' + r.missing.join('、') + '，已从本宫首卦取伏神：这类事不是明面上摆着的，藏在下面，要等时机或有人来"引"才浮出水面。');
    sections.push({ h: '四、这一卦的气象', p: qi.length ? qi.join('') : '卦体本身没有六冲、六合、反吟、伏吟这些特殊格局，是一卦"平常卦"，按日月生克与用神旺衰论即可。' });

    // 建议（按用神旺衰给）
    var levelScore = 0;
    if (yong && yong.found && yong.target) {
      var t = yong.target;
      if (t.moving) levelScore += 0;
      if (t.kong) levelScore -= 1;
      var mrel = rel(t.wx, D.ZHI_WX[r.time.monthGanZhi.charAt(1)]);
      var drel = rel(t.wx, D.ZHI_WX[r.time.dayGanZhi.charAt(1)]);
      [mrel, drel].forEach(function (x) { if (x === '生我') levelScore += 1; if (x === '克我') levelScore -= 1; if (x === '我生') levelScore -= 0.5; });
    }
    if (levelScore >= 1.5) tips.push('用神得日月生扶、又不落空，是有力的象：这件事可以往前进，抓住当下的时间窗口。');
    else if (levelScore <= -1.5) tips.push('用神被日月克制、或落空亡：眼下不宜硬推，先养着、等一个"出空"或"得生"的时机再动。');
    else tips.push('用神力量中平：事情不温不火，成与不成取决于你自己投入多少，宜稳扎稳打。');
    if (yong && yong.found && yong.target && yong.target.kong) tips.push('用神落在旬空上：不是"没有"，是"时候还没到"——等出空（逢冲或填实之日）再看，事情多半在那前后见分晓。');
    tips.push('日辰代表"当下"，月建代表"这一个月的大势"，旬空代表"暂时虚着、时候没到"——这三样是六爻判断的尺子。');
    tips.push('断卦要看整体：用神、原神、忌神谁旺谁动，世应谁生谁克，别只盯一个爻。');
    return { headline: head, sections: sections, tips: tips };
  }

  /* ==================== 四、小六壬解读 ==================== */
  function xiaoliuren(r) {
    var g = r.gong;
    var head = '三数落宫到「' + g.name + '」——' + GONG_WHITE[g.name] + '。五行属' + g.wx + '，配' + g.shen + '，方位在' + g.dir + '，传统判为' + g.jiXiong + '。';
    var sections = [], tips = [];
    if (r.steps && r.steps.length === 3) {
      sections.push({ h: '一、三步怎么数过来的', p:
        r.steps.map(function (s) { return s.label + '：数 ' + s.count + ' 落到' + s.to; }).join('；') + '。'
        + ' 传统上这三步可以分开看：第一步' + r.steps[0].to + '看事情的起因，第二步' + r.steps[1].to + '看当下的处境，第三步' + r.steps[2].to + '看最后的结果。' });
    }
    sections.push({ h: '二、落宫「' + g.name + '」是什么意思', p: g.jie + g.shi });
    sections.push({ h: '三、分项看事', p: ['求财','疾病','行人','失物'].map(function (k) {
      return k + '：' + (r.aspects[k] || ''); }).join(' ') });
    tips.push('小六壬讲究"一事一占"：同一件事反复起课，第一课最准，后起的会乱——传统说法，信不信由你。');
    tips.push('方位与应期参考：' + g.dir + '方向；' + g.name + '属' + g.wx + '，'
      + ({ 木:'春（寅卯月）', 火:'夏（巳午月）', 土:'辰未戌丑月', 金:'秋（申酉月）', 水:'冬（亥子月）' })[g.wx] + '为其得令之时。');
    tips.push('落宫吉凶只是"势"，具体还得看你自己的选择与行动。');
    return { headline: head, sections: sections, tips: tips };
  }

  /* ==================== 五、今日抽卡时运解读 ==================== */
  function gacha(r) {
    var head = '今天抽卡时运判为「' + r.level + '」——' + r.advice
      + '（气势分 ' + r.score + '，此分只是规则的汇总，不参与判档）今日签是「' + r.slip.title + '」：' + r.slip.verse + '。';
    var secs = [], tips = [];

    secs.push({ h: '一、这一档是怎么判出来的', p:
      '不是拿分数切出来的，是按传统择日的三层规则合看：' + r.levelRule + '。'
      + (r.levelAdjusted ? '另外，今日日支冲你的日支，按「日辰冲命，诸事不宜」的传统已在气势分里扣减。' : '')
      + ' 当日数据：' + r.lunar.dayGZ + '日、值神' + r.lunar.tianShen + '（' + r.lunar.tianShenType + '）、建除「' + r.lunar.zhiXing + '」日、吉神 ' + r.lunar.jiShen.length + ' 位、凶煞 ' + r.lunar.xiongSha.length + ' 位。' });

    if (r.personal) {
      var p = r.personal;
      secs.push({ h: '二、加上你自己的因素', p:
        '你的日主是' + p.dayMaster + '（' + p.strength + '），喜用偏「' + (p.yongShen.join('、') || '—') + '」，今日日干对你为「' + p.shiShen + '」。'
        + (p.chong ? '今日日支冲你的日支「' + p.myZhi + '」，这是本次判档唯一的降档因素——传统上日辰冲命诸事不宜。'
                   : p.he ? '今日日支与你日支「' + p.myZhi + '」六合，心态顺，不构成降档。'
                   : '今日日支与你的日支无明显冲合，判档完全按通用规则走。') });
    } else {
      secs.push({ h: '二、加上你自己的因素', p: '这次没填生辰，所以只有通用规则判档。填上出生日期时间后，会多出「日辰冲命降一档」这一条，也会把十神与喜用神计入气势分。' });
    }

    secs.push({ h: '三、今天最好和最差的抽卡时间', p:
      r.timeAdvice.text + ' 具体说：最好在 ' + r.bestHours.map(function (h) { return h.name + '时（' + h.range + '，' + h.tianShen + '·黄道）'; }).join('、') + '；'
      + '最差是 ' + r.worstHour.name + '时（' + r.worstHour.range + '，' + r.worstHour.tianShen + '·' + r.worstHour.type + '）。'
      + ' 道理在于十二时辰各有一位值神当值，黄道为吉、黑道为凶，这是传统黄历的算法；它只跟当天的日子有关，跟你玩哪个游戏无关。' });

    secs.push({ h: '四、签文怎么解', p: '「' + r.slip.title + '」（' + r.slip.level + '）：' + r.slip.verse + '。' + r.slip.note });

    tips.push('档位是规则判的，阿尔法没有为了让"分布好看"调过任何权重或阈值——凶日多、大吉少，本来就是传统择日的常态。');
    tips.push('气势分（50 ＋ 合计 × 3.0，映射到 0~100）是各项计分的汇总，档位就是由它决定的，但它不是出货率预测。');
    tips.push('抽卡概率由游戏官方算法决定，任何术数都改不了它；这个功能真正能帮你的只有两件事：挑个吉时给点仪式感，以及提醒你别上头。');
    tips.push('同一天同一输入，档位与签文固定不变（不是刷新重新抽），所以别反复刷。');
    return { headline: head, sections: secs, tips: tips };
  }

  /* ==================== 六、二次元相性解读 ==================== */
  function match(r) {
    var head = '你 × ' + r.other.name + ' 的相性分是 ' + r.score + ' 分，判为「' + r.level.name + '」——' + r.advice;
    var secs = [], tips = [];
    secs.push({ h: '一、这是怎么算的', p:
      '不是随便打分，是按传统合盘的路子：先看双方日主五行的生克（相处的基调），再看日支——那是传统里的"夫妻宫"，六合最亲、六冲最忌；'
      + '然后看日干有没有五合（有没有缘分感）、喜用神是否互补（是不是"人对了"）、五行能否互补（他旺的是不是你缺的）。'
      + '本次是' + r.modeText + '，' + (r.mode === 'full' ? '双方都有八字，项目齐。' : '只知角色属性，所以只比了五行生克，信息量少一半。') });
    var sorted = r.parts.slice().sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); });
    var key3 = sorted.slice(0, 3).filter(function (p) { return p.pts !== 0; });
    secs.push({ h: '二、影响最大的几条', p: key3.length
      ? key3.map(function (p) { return '【' + p.name + '】' + p.detail + '——' + p.doctrine; }).join(' ')
      : '各项都是平盘，没有特别加分或扣分的项，属于"不冷不热"的组合。' });
    secs.push({ h: '三、怎么相处', p:
      r.advice + ' 传统合盘的用法是"知道差异在哪、提前避坑"，不是给关系定性：冲的地方少较劲，合的地方多用。' });
    tips.push('合盘是传统术数里看两个人合不合的方法，娱乐与参考为主；角色是虚构的，真正影响你心情的是你自己的选择。');
    tips.push('只填了属性时结论最弱；补上角色生日（官方设定生日）才能走完整合盘——日支六合六冲、日干五合这些要双方都有日柱才能算。');
    tips.push('分数高别得意、分数低也别当真：盘只说明"气场结构"，具体怎么相处还是看人。');
    return { headline: head, sections: secs, tips: tips };
  }

  /* ==================== 七、当日运势解读 ==================== */
  function daily(r) {
    var head = '这一天判「' + r.level + '」（气势分 ' + r.score + '）——' + r.day.ganZhi + '日，' + r.day.tianShen + '当值' + r.day.tianShenType + '，建除' + r.day.zhiXing + '日。';
    var secs = [], tips = [];
    secs.push({ h: '一、这天对你是什么性质', p:
      r.rule + '。简单说：' + (r.level === '大吉' ? '这是一年里也排得上号的好日子，要紧的事可以挑这天办。'
        : r.level === '吉' ? '整体顺，适合推进正事，不用特意避。'
        : r.level === '平' ? '不好不坏，办常规事没问题，大事建议再挑挑。'
        : r.level === '凶' ? '不太顺，能推的事推一推，必须办的尽量选吉时。'
        : '这天不宜办要紧事，能改期就改期。') });
    var ps = r.parts.slice().sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); }).slice(0, 3).filter(function (p) { return p.pts !== 0; });
    secs.push({ h: '二、影响最大的几条', p: ps.length
      ? ps.map(function (p) { return '【' + p.name + '】' + p.value + '——' + p.doctrine; }).join(' ')
      : '各项都平，没有特别加力或扣力的因素。' });
    if (r.hours && r.hours.best) {
      secs.push({ h: '三、挑时辰', p: '这天吉时有 ' + r.hours.bestHours.length + ' 个（' + r.hours.bestHours.join('、') + '）。'
        + '最好的是' + r.hours.best.zhi + '时（' + r.hours.best.range + '，' + r.hours.best.tianShen + '当值）；'
        + '最该避开' + r.hours.worst.zhi + '时（' + r.hours.worst.range + '，' + r.hours.worst.tianShen + '当值）。' });
    }
    if (r.yi.length) tips.push('黄历当日宜：' + r.yi.slice(0, 5).join('、') + '。');
    if (r.ji.length) tips.push('黄历当日忌：' + r.ji.slice(0, 5).join('、') + '。');
    tips.push('判档是规则式的（值神→建除→吉煞→个人冲合），不是分数拍脑袋；气势分只作参考。');
    if (!r.me.hourKnown) tips.push('你没填出生时间，所以只按年月日三柱比对，结论略粗。');
    return { headline: head, sections: secs, tips: tips };
  }

  return { bazi: bazi, meihua: meihua, liuyao: liuyao, xiaoliuren: xiaoliuren, gacha: gacha, match: match, daily: daily,
           GAN_CHAR: GAN_CHAR, SHI_SHEN: SHI_SHEN, SHI_SHEN_WHITE: SHI_SHEN_WHITE,
           WX_TIPS: WX_TIPS, GONG_WHITE: GONG_WHITE };
});
