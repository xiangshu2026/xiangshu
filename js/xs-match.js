// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-match.js —— 「我和二次元角色」相性合盘（象数工坊 · 娱乐向）
 *
 * 【方法】按传统合盘（合婚/合盘）规则做双方八字比对：
 *   日主五行生克 · 日支六合/三合/六冲 · 日干五合 · 日柱天克地冲 ·
 *   喜用神互补 · 五行互补（我缺是否对方旺）· 年支六合/六冲
 * 角色若只给了属性（元素/五行）而没给生日，则降级为「五行简盘」，并在结果里写明。
 * 分数只是规则的透明汇总，等级由分数区间固定（公式公开）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./xs-data.js'), require('./xs-bazi.js'), require('./lunar.js')); }
  else { root.XS = root.XS || {}; root.XS.Match = factory(root.XS.Data, root.XS.Bazi, { Solar: root.Solar, Lunar: root.Lunar }); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, BZ, LU) {
  'use strict';

  var WX = ['木', '火', '土', '金', '水'];
  // 游戏常见属性（元素）→ 五行：依八卦类象换算
  // 巽为风→木、震为雷→木、草木同气→木；坎为水/隐伏→水；离为火/电/明→火；艮为山→土；乾兑为金
  var ELEMENT_WX = {
    风:'木', 雷:'木', 草:'木', 木:'木', 电:'木', 雷属性:'木',
    水:'水', 冰:'水', 暗:'水', 烈霜:'水', 玄墨:'水', 量子:'水',
    火:'火', 光:'火', 流明:'火',
    土:'土', 岩:'土', 砂:'土', 以太:'土', 虚数:'土', 盾:'土',
    物理:'金', 金:'金', 凛刃:'金'
  };
  var ELEMENT_NOTE = {
    风:'巽为风，巽属木', 雷:'震为雷，震属木', 草:'草木同气，属木', 电:'震为雷动，归木',
    冰:'寒凝之象，属水', 暗:'坎为隐伏，属水', 烈霜:'寒凝之极，属水',
    玄墨:'墨色近黑，坎为黑，属水（本软件约定）', 量子:'微观流动之象，属水（本软件约定）',
    光:'离为火为明，属火', 流明:'流明为光束，属火（本软件约定）',
    岩:'艮为山，属土', 砂:'土类', 以太:'虚空承载之象，属土（本软件约定）',
    虚数:'虚数不可见，归土（本软件约定）', 盾:'护持之象，属土',
    物理:'刚硬直取之象，属金（本软件约定）', 凛刃:'刃属金，属金（本软件约定）'
  };
  // 天干五合：甲己合土 乙庚合金 丙辛合水 丁壬合木 戊癸合火
  var GAN_HE = { 甲:'己', 己:'甲', 乙:'庚', 庚:'乙', 丙:'辛', 辛:'丙', 丁:'壬', 壬:'丁', 戊:'癸', 癸:'戊' };
  var GAN_HE_WX = { 甲:'土', 己:'土', 乙:'金', 庚:'金', 丙:'水', 辛:'水', 丁:'木', 壬:'木', 戊:'火', 癸:'火' };
  var LEVELS = [
    { min: 88, name: '天作之合', color: 'gold' },
    { min: 76, name: '相得益彰', color: 'green' },
    { min: 62, name: '平顺相处', color: '' },
    { min: 46, name: '需要磨合', color: 'red' },
    { min: 0,  name: '八字相冲', color: 'red' }
  ];
  function levelOf(score) { for (var i = 0; i < LEVELS.length; i++) { if (score >= LEVELS[i].min) return LEVELS[i]; } return LEVELS[LEVELS.length - 1]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* 各档位的理论可达区间（各项上限/下限相加，见 说明 页公示）
   * 只有按各自区间归一，五档等级在各档位下才是同一把尺子。 */
  var BOUNDS = {
    full:  { max: 92, min: -60 },   // 日主20+日支16+日干14+喜用20+互补16+年支6 / 日主-18+日支-22+天克地冲-12+年支-8
    month: { max: 31, min: -28 },   // 日主10+月令合10+喜用6+补缺5 / 日主-9+月令冲-14+忌-5
    wx:    { max: 38, min: -26 }    // 日主20+喜用10+补缺8 / 日主-18+忌-8
  };
  /* 信息完整度封顶：100 分只留给资料最全的完整盘。
   * 月令盘缺年柱/日柱（少日支合冲、日干五合、五行互补），简盘只有属性（连月令都没有），
   * 所以它们的上限按信息量打折——不是"算不准"，而是"能判断的维度本来就少"。
   * 这样"天作之合"在三种档位下都要求同样强的证据，不会因为选项少就虚高。 */
  var CEIL = { full: 100, month: 88, wx: 80 };
  // 50 = 中性（各项合计 0）；100 = 完整盘满分；各档按 CEIL 封顶
  function scoreOf(sum, mode) {
    var b = BOUNDS[mode] || BOUNDS.wx;
    var r = sum >= 0 ? (b.max > 0 ? sum / b.max : 0) : (b.min < 0 ? sum / Math.abs(b.min) : 0);
    var hi = CEIL[mode] || 80;
    var raw = sum >= 0 ? 50 + r * (hi - 50) : 50 + r * 50;
    return Math.round(clamp(raw, 0, hi));
  }
  function rel(a, b) {
    if (a === b) return '同';
    if (D.WX_SHENG[b] === a) return '他生我';
    if (D.WX_SHENG[a] === b) return '我生他';
    if (D.WX_KE[b] === a) return '他克我';
    if (D.WX_KE[a] === b) return '我克他';
    return '';
  }

  function paipanOrNull(birth) {
    if (!birth || !birth.y) return null;
    try { return BZ.paipan({ y: +birth.y, m: +birth.m, d: +birth.d, h: +(birth.h || 12), mi: +(birth.mi || 0), gender: (birth.gender === 0 || birth.gender === '0') ? 0 : 1 }); }
    catch (e) { return null; }
  }

  function compare(me, other, opts) {
    opts = opts || {};
    var parts = [];
    var sum = 0;
    function add(pts, name, detail, doctrine) {
      parts.push({ name: name, detail: detail, pts: pts, doctrine: doctrine });
      sum += pts;
    }
    var meWx = me.dayMaster.wuXing, meGan = me.dayMaster.gan, meZhi = me.pillars[2].zhi;
    var otherWx = other.dayMaster.wuXing, otherGan = other.dayMaster.gan, otherZhi = other.pillars[2].zhi;
    var r = rel(meWx, otherWx);
    var rMap = {
      '他生我': [20, '对方的' + otherWx + '生你的' + meWx + '：对方天然滋养你，你在他身边容易放松、补气'],
      '我生他': [14, '你的' + meWx + '生对方的' + otherWx + '：你愿意为他付出，相处里你更像照顾的一方'],
      '同':    [10, '双方日主同属' + meWx + '：同气相求，好沟通，但也容易同进同退、一起上头'],
      '我克他': [-10, '你的' + meWx + '克对方的' + otherWx + '：你会不自觉地想管着他，久了容易累'],
      '他克我': [-18, '对方的' + otherWx + '克你的' + meWx + '：他容易压到你，你在他面前会紧张、容易内耗']
    }[r] || [0, '双方日主关系平平'];
    add(rMap[0], '日主五行', '你' + meWx + ' × 他' + otherWx + '（' + r + '）', rMap[1]);

    // 日支：六合/三合/六冲/相同
    var zhiRel = '';
    if (D.ZHI_HE[meZhi] === otherZhi) zhiRel = '六合';
    else if (D.ZHI_CHONG[meZhi] === otherZhi) zhiRel = '六冲';
    else if (D.ZHI_SANHE[meZhi] && D.ZHI_SANHE[meZhi].indexOf(otherZhi) >= 0) zhiRel = '三合';
    else if (meZhi === otherZhi) zhiRel = '同支';
    var zhiPts = { '六合': 16, '三合': 12, '同支': 6, '六冲': -22, '': 0 }[zhiRel] || 0;
    add(zhiPts, '日支（夫妻宫）', '你' + meZhi + ' × 他' + otherZhi + (zhiRel ? '（' + zhiRel + '）' : '（无合无冲）'),
      zhiRel === '六合' ? '日支六合：最亲的一组，主相处融洽、有默契'
      : zhiRel === '三合' ? '日支三合：同一局的人，志趣相近'
      : zhiRel === '六冲' ? '日支六冲：夫妻宫相冲，主聚少离多、容易拌嘴'
      : zhiRel === '同支' ? '日支同支：步调一致，但也容易一起钻牛角尖'
      : '日支无合无冲，相处平和但少些火花');

    // 日干五合
    if (GAN_HE[meGan] === otherGan) {
      add(14, '日干五合', '你' + meGan + ' × 他' + otherGan + '（合化' + GAN_HE_WX[meGan] + '）', '日干五合：天干相合，主彼此吸引、有缘分');
    } else if (meGan === otherGan) {
      add(6, '日干相同', '你' + meGan + ' × 他' + otherGan, '日干相同：脾性相近，容易一见如故');
    } else {
      add(0, '日干五合', '你' + meGan + ' × 他' + otherGan + '（无合）', '日干不相合，属平常');
    }

    // 日柱天克地冲
    var ganKe = D.WX_KE[meWx] === otherWx || D.WX_KE[otherWx] === meWx;
    if (ganKe && zhiRel === '六冲') add(-12, '天克地冲', '日干相克 ＋ 日支相冲', '日柱天克地冲，传统合盘里的重忌，主相处消耗大');

    // 喜用互补
    var meYong = (me.strength.yongHint.favor || []), otherYong = (other.strength.yongHint.favor || []);
    if (meYong.indexOf(otherWx) >= 0) add(10, '喜用互补（他补你）', '你的喜用是' + meYong.join('、') + '，他是' + otherWx, '对方日主正是你的喜用，等于"人对了"');
    if (otherYong.indexOf(meWx) >= 0) add(10, '喜用互补（你补他）', '他的喜用是' + otherYong.join('、') + '，你是' + meWx, '你正是他的喜用，他会觉得你顺眼、对你上心');

    // 五行互补：我缺的他旺
    var lack = WX.filter(function (k) { return me.wuXing.score[k] < 0.35; });
    var rich = WX.slice().sort(function (x, y) { return other.wuXing.score[y] - other.wuXing.score[x]; }).slice(0, 2);
    var filled = lack.filter(function (k) { return rich.indexOf(k) >= 0; });
    if (filled.length) add(Math.min(16, filled.length * 8), '五行互补', '你缺' + lack.join('、') + '，他旺' + rich.join('、'), '他身上的五行正好补你的缺，相处会舒服、少耗');
    else if (lack.length) add(0, '五行互补', '你缺' + lack.join('、') + '，他旺' + rich.join('、') + '（补不上）', '没补到你的缺，属平常');

    // 年支（根基）
    var meYear = me.pillars[0].zhi, otherYear = other.pillars[0].zhi;
    if (opts.skipYearZhi) {
      parts.push({ name: '年支关系', detail: '年份为假定（' + (opts.assumedYear || '') + ' 年），所有角色同一年', pts: 0,
        doctrine: '假定年份时年柱全部相同，年支合冲没有区分度，所以这一项不计分' });
    } else if (D.ZHI_HE[meYear] === otherYear) add(6, '年支关系', meYear + ' × ' + otherYear + '（六合）', '年支六合，主两家缘分、根基相合');
    else if (D.ZHI_CHONG[meYear] === otherYear) add(-8, '年支关系', meYear + ' × ' + otherYear + '（六冲）', '年支相冲，主理念底色有差异');

    // 【2026-10-20 第三方复核修复】原来这里是裸加 clamp(50+sum)，但返回的 bounds 却是 BOUNDS.full(-60~92)。
    // BOUNDS.full 是为归一化设计的区间：sum 到 60 裸加就满分(100)，而归一化应为 83 —— 等级线整体偏移。
    // 月令盘(286行)、五行简盘(208行)都走 scoreOf()，只有完整盘裸加 = 三处里两处归一化、一处裸加（路径分裂）。
    var score = scoreOf(sum, 'full');
    return { parts: parts, sum: sum, score: score, level: levelOf(score), bounds: BOUNDS.full };
  }

  // 五行类象（性格/气质），传统取象
  var WX_XIANG = {
    木: '巽/震（风雷）之象：灵巧、有生长力、想法多，喜动不喜静',
    火: '离（火）之象：热情外放、直接、爱表现，来得快去得也快',
    土: '艮/坤（山/地）之象：稳、慢热、包容，认准了就难改',
    金: '乾/兑（天/泽）之象：有原则、话直、重面子，锋利也干脆',
    水: '坎（水）之象：深藏、敏感、心思流动，外冷内热'
  };
  // 十神关系（以你的日干视角看对方五行）
  var SHISHEN_OF = {
    '同': '比劫——同类、朋友感，也带一点竞争',
    '我生他': '食伤——你付出、你照顾他，你也更容易累',
    '我克他': '财——你想拥有、想掌控他',
    '他克我': '官杀——他压你，你对他又敬又怕',
    '他生我': '印——他护你，你也容易依赖他'
  };

  function wxOnly(me, otherWx, wxRaw) {
    var parts = [], sum = 0;
    var meWx = me.dayMaster.wuXing;
    var r = rel(meWx, otherWx);
    var map = {
      '他生我': [20, '对方的' + otherWx + '生你的' + meWx + '：他的属性天然滋养你'],
      '我生他': [14, '你的' + meWx + '生对方的' + otherWx + '：你更主动、更愿意付出'],
      '同':    [10, '双方同属' + meWx + '：同气相求，相处轻松'],
      '我克他': [-10, '你的' + meWx + '克对方的' + otherWx + '：你会想管着他'],
      '他克我': [-18, '对方的' + otherWx + '克你的' + meWx + '：他容易压到你']
    }[r] || [0, '关系平平'];
    parts.push({ name: '日主 × 角色属性', detail: '你' + meWx + ' × 他' + otherWx + '（' + r + '）', pts: map[0], doctrine: map[1] });
    sum += map[0];

    // 十神关系（解读项，不重复计分）
    parts.push({ name: '十神关系', detail: '以你的' + me.dayMaster.gan + '日主看角色' + otherWx, pts: 0,
      doctrine: (SHISHEN_OF[r] || '关系平平') + '（这是关系性质，不额外计分）' });

    // 属性类象
    parts.push({ name: '属性类象', detail: otherWx + (wxRaw && wxRaw !== otherWx ? '（' + wxRaw + ' 换算）' : ''), pts: 0,
      doctrine: WX_XIANG[otherWx] || '' });

    // 喜用 / 忌神
    var favor = me.strength.yongHint.favor || [];
    if (favor.indexOf(otherWx) >= 0) {
      parts.push({ name: '喜用', detail: '他是' + otherWx + '，正是你的喜用（' + favor.join('、') + '）', pts: 10, doctrine: '属性正合你的喜用，投缘、相处省力' });
      sum += 10;
    } else if (favor.length) {
      parts.push({ name: '忌神', detail: '你的喜用是' + favor.join('、') + '，他不在其中', pts: -8, doctrine: '不在喜用之列（偏忌）：相处要多让一步，别硬碰' });
      sum -= 8;
    }

    // 五行补缺
    if (me.wuXing.score[otherWx] < 0.35) {
      parts.push({ name: '五行补缺', detail: '你八字缺' + otherWx + '，他的属性正好补上', pts: 8, doctrine: '他补你的缺，相处舒服、少内耗' });
      sum += 8;
    }

    var score = scoreOf(sum, 'wx');
    return { parts: parts, sum: sum, score: score, level: levelOf(score), bounds: BOUNDS.wx, confidence: 'low' };
  }

  /* ---------- 只知道月/日：用节气月（月令）代替 ---------- */
  var ZHI_WX = { 子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火', 午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水' };
  var ZHI_SEASON = { 寅:'初春', 卯:'仲春', 辰:'暮春', 巳:'初夏', 午:'仲夏', 未:'暮夏', 申:'初秋', 酉:'仲秋', 戌:'暮秋', 亥:'初冬', 子:'仲冬', 丑:'暮冬' };
  var ZHI_XIANG = {
    子:'水旺之月：沉静、思虑多', 丑:'土旺之月：厚实、能忍', 寅:'木旺之月：有生机、爱起步', 卯:'木旺之月：柔中带韧',
    辰:'土旺之月：稳、爱兜底', 巳:'火旺之月：外柔内烈', 午:'火旺之月：热烈、直给', 未:'土旺之月：温吞、恋旧',
    申:'金旺之月：干脆、有锋芒', 酉:'金旺之月：讲究、重细节', 戌:'土旺之月：讲义气、固执', 亥:'水旺之月：随和、心思深'
  };
  // 用多个年份取样：年份只影响节气交界前后 1 天
  function monthZhiOf(m, d) {
    var cnt = {}, order = [];
    var years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
    for (var i = 0; i < years.length; i++) {
      try {
        var l = LU.Solar.fromYmdHms(years[i], m, d, 12, 0, 0).getLunar();
        var z = l.getMonthZhiExact ? l.getMonthZhiExact() : (l.getMonthZhi ? l.getMonthZhi() : '');
        if (!z) continue;
        if (!cnt[z]) { cnt[z] = 0; order.push(z); }
        cnt[z]++;
      } catch (e) {}
    }
    order.sort(function (a, b) { return cnt[b] - cnt[a]; });
    return { zhi: order[0] || null, all: order, ambiguous: order.length > 1, counts: cnt };
  }

  function monthOnly(me, moon, wxRaw) {
    var parts = [], sum = 0;
    var otherWx = ZHI_WX[moon.zhi];
    var meWx = me.dayMaster.wuXing;
    var r = rel(meWx, otherWx);
    var baseMap = {
      '他生我': [10, '角色月令' + otherWx + '生你的' + meWx + '：季节之气助你，相处省力'],
      '我生他': [7,  '你的' + meWx + '生角色月令' + otherWx + '：你更主动、更愿意为他花心思'],
      '同':    [5,  '双方同属' + meWx + '之气：同气，聊得来'],
      '我克他': [-5, '你的' + meWx + '克角色月令' + otherWx + '：你会想管着他'],
      '他克我': [-9, '角色月令' + otherWx + '克你的' + meWx + '：他容易让你紧张']
    }[r] || [0, '关系平平'];
    parts.push({ name: '日主 × 角色月令', detail: '你' + meWx + ' × 他' + moon.zhi + '月（' + otherWx + '，' + r + '）', pts: baseMap[0],
      doctrine: baseMap[1] + '。没有年份时，八字里最重的一层「月令」还能用——它代表先天气质与家庭底色。' });
    sum += baseMap[0];

    // 我的月支 × 角色月支
    var meZhi = me.pillars[1].zhi;
    var zr = '';
    if (D.ZHI_HE[meZhi] === moon.zhi) zr = '六合';
    else if (D.ZHI_CHONG[meZhi] === moon.zhi) zr = '六冲';
    else if (D.ZHI_SANHE[meZhi] && D.ZHI_SANHE[meZhi].indexOf(moon.zhi) >= 0) zr = '三合';
    else if (meZhi === moon.zhi) zr = '同支';
    var zp = { '六合': 10, '三合': 8, '同支': 4, '六冲': -14, '': 0 }[zr] || 0;
    parts.push({ name: '月令相合（我月支 × 他月令）', detail: '你' + meZhi + '月 × 他' + moon.zhi + '月' + (zr ? '（' + zr + '）' : '（无合无冲）'), pts: zp,
      doctrine: zr === '六合' ? '月令六合：季节之气相合，节奏接近' : zr === '三合' ? '月令三合：同局之人，想法容易一致'
        : zr === '六冲' ? '月令六冲：季节之气对冲，生活节奏差异明显' : zr === '同支' ? '同一个月令：脾性底色相似' : '月令无合无冲，属平常' });
    sum += zp;

    // 季节之气（类象，信息项）
    parts.push({ name: '季节类象', detail: moon.zhi + '月 · ' + (ZHI_SEASON[moon.zhi] || ''), pts: 0,
      doctrine: ZHI_XIANG[moon.zhi] || '' });

    // 喜用 / 忌神
    var favor = me.strength.yongHint.favor || [];
    if (favor.indexOf(otherWx) >= 0) {
      parts.push({ name: '喜用', detail: '他的月令之气' + otherWx + '正是你的喜用（' + favor.join('、') + '）', pts: 6, doctrine: '季节之气合你的喜用，投缘' }); sum += 6;
    } else if (favor.length) {
      parts.push({ name: '忌神', detail: '你的喜用是' + favor.join('、') + '，他的月令之气不在其中', pts: -5, doctrine: '不在喜用之列（偏忌），相处要多让一步' }); sum -= 5;
    }
    // 补缺
    if (me.wuXing.score[otherWx] < 0.35) {
      parts.push({ name: '五行补缺', detail: '你缺' + otherWx + '，他的月令正是' + otherWx + '气', pts: 5, doctrine: '他补你的缺' }); sum += 5;
    }
    // 节气交界提示
    if (moon.ambiguous) {
      parts.push({ name: '节气交界提醒', detail: '这两天可能落在' + moon.all.join(' 或 ') + '月', pts: 0,
        doctrine: '生日紧贴节气交界，年份不同会差一天、月令就变了；这条结论请打个折。' });
    }
    var score = scoreOf(sum, 'month');
    return { parts: parts, sum: sum, score: score, level: levelOf(score), bounds: BOUNDS.month, confidence: 'mid' };
  }

  function match(opt) {
    opt = opt || {};
    var meBazi = paipanOrNull(opt.me);
    if (!meBazi) return { ok: false, error: '请先填你的出生日期与时间' };
    var name = (opt.other && opt.other.name ? String(opt.other.name) : '').trim().slice(0, 20) || '这位角色';
    var otherBazi = paipanOrNull(opt.other && opt.other.birth);
    var wxRaw = opt.other && opt.other.wx ? String(opt.other.wx).trim() : '';
    var otherWx = ELEMENT_WX[wxRaw] || wxRaw;   // 风→木 等，五行则原样

    var moonInfo = null;
    var md = opt.other && opt.other.monthday;
    if (!otherBazi && md && +md.m >= 1 && +md.m <= 12 && +md.d >= 1 && +md.d <= 31) {
      moonInfo = monthZhiOf(+md.m, +md.d);
    }

    // 假定年份：角色只知道月/日时，按指定年份（默认 2026）排出完整八字
    var assumedYear = (opt.other && opt.other.assumedYear) ? +opt.other.assumedYear : 0;
    if (!otherBazi && assumedYear && md && +md.m >= 1 && +md.m <= 12 && +md.d >= 1 && +md.d <= 31) {
      try {
        otherBazi = BZ.paipan({ y: assumedYear, m: +md.m, d: +md.d, h: 12, mi: 0, gender: 1 });
        otherBazi.__assumedYear = assumedYear;
      } catch (e) { otherBazi = null; }
    }

    var mode, core;
    if (otherBazi) {
      mode = 'full';
      core = compare(meBazi, otherBazi, otherBazi.__assumedYear ? { skipYearZhi: true, assumedYear: otherBazi.__assumedYear } : null);
      core.confidence = otherBazi.__assumedYear ? 'assumed' : 'high';
    }
    else if (moonInfo && moonInfo.zhi) { mode = 'month'; core = monthOnly(meBazi, moonInfo, wxRaw); }
    else if (otherWx && WX.indexOf(otherWx) >= 0) { mode = 'wx'; core = wxOnly(meBazi, otherWx, wxRaw); }
    else return { ok: false, error: '角色信息不足：填完整生日（有年份）＞知道月/日（走月令盘）＞只选属性（走五行简盘），至少给一样' };

    var advice;
    if (core.level.name === '天作之合') advice = '这一组很难得：日主相生、宫位有合，传统合盘里算上上。相处上顺其自然就好，别过度用力。';
    else if (core.level.name === '相得益彰') advice = '整体顺，有互补也有默契；小摩擦属于正常，好好说话就过去了。';
    else if (core.level.name === '平顺相处') advice = '不冲不合，属于"普通好朋友"盘：合得来但不强绑定，长久要靠共同话题。';
    else if (core.level.name === '需要磨合') advice = '有克有冲，说明节奏差异大：要么多让一步，要么保持距离反而更稳。';
    else advice = '冲克偏重，传统上属"不适合深交"的组合。喜欢归喜欢，别把盘当判决书——现实里的相处比盘重要。';

    return {
      ok: true,
      mode: mode, confidence: core.confidence || 'high',
      assumedYear: (otherBazi && otherBazi.__assumedYear) || null,
      modeText: mode === 'full' ? ((otherBazi && otherBazi.__assumedYear) ? '完整合盘（按假定年份 ' + otherBazi.__assumedYear + ' 排出）' : '完整合盘（双方八字）')
        : mode === 'month' ? '月令盘（只知道月/日，用节气月代替）'
        : '五行简盘（只按角色属性，信息最少）',
      monthZhi: moonInfo ? moonInfo.zhi : null,
      monthAmbiguous: moonInfo ? moonInfo.ambiguous : false,
      monthAll: moonInfo ? moonInfo.all : null,
      account: (opt.account || '').toString().trim().slice(0, 24),
      other: { name: name, wx: otherBazi ? otherBazi.dayMaster.wuXing : (moonInfo && moonInfo.zhi ? ZHI_WX[moonInfo.zhi] : otherWx),
               wxRaw: wxRaw, wxFromRaw: !!(wxRaw && ELEMENT_WX[wxRaw] && ELEMENT_WX[wxRaw] !== wxRaw),
               wxNote: ELEMENT_NOTE[wxRaw] || '',
               bazi: otherBazi ? otherBazi.pillars.map(function (p) { return p.ganZhi; }) : null },
      me: { bazi: meBazi.pillars.map(function (p) { return p.ganZhi; }), dayMaster: meBazi.dayMaster, dm: meBazi.dayMaster },
      score: core.score, level: core.level, sum: core.sum, parts: core.parts,
      rawSum: core.sum, bounds: core.bounds,
      formula: '相性分 = 50 ＋ 各项合计 ' + (core.sum >= 0 ? '+' : '') + core.sum + ' ×（50 ÷ 本档上限），'
        + '本档理论区间 ' + core.bounds.min + '~+' + core.bounds.max + '，2 分项合计 0 = 50 分中性；'
        + (mode === 'full' ? (otherBazi && otherBazi.__assumedYear ? '假定年份盘：年支不计分，满分按剩余项目算。' : '完整盘满分 100。') : mode === 'month' ? '月令盘缺年柱/日柱，满分封顶 88。' : '简盘只有属性，满分封顶 80。'),
      advice: advice,
      note: (otherBazi && otherBazi.__assumedYear)
        ? '这位角色只有月/日、没有真实年份，本盘按你指定的「假定年份 ' + otherBazi.__assumedYear + '」排出完整八字。年柱与年支因此是假设的（全体角色同一年，已不计分），日柱/月柱也随这个假定而变——所以这一盘是"如果 TA 生在这一年"的对照玩法，不是历史事实。'
        : mode === 'wx' ? '只给了属性，所以只按「五行 + 十神 + 喜忌 + 补缺」算，日支六合六冲、日干五合这些必须双方都有日柱，算不了。知道月/日可以走月令盘，知道完整生日（含年份）才能走完整合盘。'
        : mode === 'month' ? '只给了月/日，没有年份：这一盘用「节气月（月令）」代替角色日主。月令是八字里最重的一层（代表先天气质与底色），但年柱、日柱缺失，所以比完整盘少几项，结论请按"中等可信"看待。'
        : '',
      disclaimer: '合盘是传统术数里的"看两个人合不合"的方法，娱乐为主；角色是虚构的，真正影响你心情的是你自己的选择。'
    };
  }

  function report(r) {
    if (!r.ok) return '相性算不出来：' + r.error;
    var L = [];
    L.push('【二次元相性】' + (r.account ? '账号：' + r.account + '　' : '') + '我 × ' + r.other.name);
    L.push('方式：' + r.modeText);
    L.push('我的八字：' + r.me.bazi.join(' '));
    if (r.other.bazi) L.push('角色八字：' + r.other.bazi.join(' ') + (r.assumedYear ? '　【假定年份 ' + r.assumedYear + '】' : ''));
    else if (r.mode === 'month') L.push('角色月令：' + r.monthZhi + '月（' + r.other.wx + '）' + (r.monthAmbiguous ? '　注意：紧贴节气交界' : ''));
    else L.push('角色属性：' + (r.other.wxRaw || '') + (r.other.wxFromRaw ? '（五行属' + r.other.wx + '）' : '') + (r.other.wxNote ? '　' + r.other.wxNote : ''));
    L.push('');
    L.push('相性分：' + r.score + ' / 100　→　' + r.level.name);
    L.push(r.formula);
    L.push('');
    L.push('依据：');
    r.parts.forEach(function (p) {
      L.push('  ' + (p.pts >= 0 ? '+' : '') + p.pts + '　' + p.name + '：' + p.detail);
      L.push('        ' + p.doctrine);
    });
    L.push('');
    L.push('相处建议：' + r.advice);
    if (r.note) L.push('提示：' + r.note);
    L.push('');
    L.push(r.disclaimer);
    return L.join('\n');
  }

  return { match: match, report: report, LEVELS: LEVELS, levelOf: levelOf, GAN_HE: GAN_HE, rel: rel, BOUNDS: BOUNDS, CEIL: CEIL, scoreOf: scoreOf };
});
