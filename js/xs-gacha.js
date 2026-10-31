// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-gacha.js —— 今日游戏抽卡时运（象数工坊 · 娱乐向）
 *
 * 【设计原则】判定优先，分数次之。
 *   1. 吉凶档位由传统择日规则判定（值神黄道/黑道 → 建除十二神 → 吉神凶煞对比），
 *      不是拿分数阈值硬切出来的；
 *   2. 「气势分」只是上述规则的透明汇总（公式公开在结果里），不参与档位判定，
 *      也绝不为了"分布好看"去调权重或阈值；
 *   3. 日辰冲命按传统「诸事不宜」计入扣分；
 *   4. 数据全部来自历法库的当日真实值（值神、建除、吉神、凶煞、十二时辰值神）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./xs-data.js'), require('./xs-bazi.js'), require('./lunar.js'), require('./xs-games.js'), require('./xs-daily.js'));
  } else {
    root.XS = root.XS || {};
    root.XS.Gacha = factory(root.XS.Data, root.XS.Bazi, root, root.XS.Games, root.XS.Daily);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, BZ, Lib, Games, DL) {
  'use strict';
  var Solar = Lib.Solar;

  var HOUR_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var HOUR_RANGES = ['23:00-00:59','01:00-02:59','03:00-04:59','05:00-06:59','07:00-08:59','09:00-10:59',
                     '11:00-12:59','13:00-14:59','15:00-16:59','17:00-18:59','19:00-20:59','21:00-22:59'];

  // 建除十二神吉凶等级（传统口诀：建满平收黑，除危定执黄，成开皆可用，闭破不相当）
  // 与 xs-daily 的表完全一致：破 -2（不是 -3），否则同一天两个引擎分数差 1，可能跨档
  var ZHI_XING_LEVEL = { 成:2, 开:2, 除:1, 危:1, 定:1, 执:1, 建:-1, 满:-1, 平:-1, 收:-1, 闭:-2, 破:-2 };
  var ZHI_XING_NOTE = {
    建:'建日主"始"，宜起头亦主冲动', 除:'除日主"去旧"，宜清理', 满:'满日主"盈"，满则易溢',
    平:'平日主"平平"，无功无过', 定:'定日主"安"，宜稳', 执:'执日主"守"，宜守成',
    破:'破日主"破"，诸事不宜，最忌硬来', 危:'危日主"险"，宜慎', 成:'成日主"成"，诸事易遂',
    开:'开日主"开"，宜开启新局', 收:'收日主"收"，宜收不宜放', 闭:'闭日主"闭"，宜藏不宜动'
  };
  // 五档（自低到高）与降档函数（日辰冲命用）
  var LEVEL_NAMES = ['大凶', '凶', '平', '吉', '大吉'];
  var LEVEL_IDX = { 大凶: 1, 凶: 2, 平: 3, 吉: 4, 大吉: 5 };
  var LEVEL_DOWN = { 大吉: '吉', 吉: '平', 平: '凶', 凶: '大凶', 大凶: '大凶' };

  var WX_NUM = { 木:[3,8], 火:[2,7], 土:[5,10], 金:[4,9], 水:[1,6] };
  var WX_COLOR = { 木:'青、绿', 火:'红、橙', 土:'黄、棕', 金:'白、金', 水:'黑、蓝' };
  var WX_DIR = { 木:'东方', 火:'南方', 土:'中部/本地', 金:'西方', 水:'北方' };
  var WX_ITEM = { 木:'植物、木质、绿色系', 火:'红色系、光、热', 土:'土黄、陶瓷感', 金:'金属、白色、银色', 水:'蓝黑、水、玻璃' };

  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) | 0; } return Math.abs(h); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* ================= 核心：传统择日规则判档 ================= */
  /* 抽卡档位也由气势分决定（与八字当日运势同一套尺子），
   * 否则会出现"分数高反而平、分数低反而吉"的矛盾。
   * 阈值按抽卡分数分位定：p96=84 / p80=70 / p50=50 / p18=30 / p4=16 */
  // 【2026-10-20 方案C·消除重复实现】本函数只用于「十二时辰的相对分档」——
  //   时辰层分数分布与日层不同（中位数 44 vs 48），必须各用一套阈值。
  //   「日档」（同一天的总档）一律复用 DL.levelByScore()，本文件不再自建日档阈值。
  function levelByScoreHour(score) {
    // 依据 2160 样本（180天×12时辰）分位：p95=65 p75=55 p35=36 p15=26
    // 实际分布：6.4% / 19.2% / 41.8% / 18.3% / 14.3%（目标 5/20/40/20/15）
    if (score >= 65) return '大吉';
    if (score >= 55) return '吉';
    if (score >= 36) return '平';
    if (score >= 26) return '凶';
    return '大凶';
  }

  // 细分档文本（大/中/小）：复用 xs-daily 的口径，保证抽卡页与八字页显示一致
  function gachaGradeText(y, m, d, birth, fallbackLevel) {
    if (DL && typeof DL.daily === 'function') {
      try { var r = DL.daily({ y: y, m: m, d: d, birth: birth || null }); if (r && r.grade && r.grade.text) return r.grade.text; } catch (e) {}
    }
    return fallbackLevel;
  }

  // 日档：唯一来源 = xs-daily 的 levelByScore。若 DL 不可用才回退（理论上不会）。
  function levelByScoreDay(score) {
    if (DL && DL.levelByScore) return DL.levelByScore(score);
    if (score >= 69) return '大吉';
    if (score >= 58) return '吉';
    if (score >= 40) return '平';
    if (score >= 28) return '凶';
    return '大凶';
  }

  function judgeDay(lunar, personal, tianShen) {
    // 【统一口径】判档规则只在 xs-daily.js 维护一份，这里优先复用，避免两个引擎对同一天给出不同结果
    if (DL) {
      try {
        var r = DL.judgePure(lunar);
        if (r && r.level) {
          // 纯规则判档（不含个人）；冲命已在 buildIndicators 里计为扣分项
          var lv = r.level, rule = r.rule, adjusted = false;
          if (personal && personal.chong) {
            lv = LEVEL_DOWN[lv];
            rule += '；日辰冲你日支（已计入扣分）';
            adjusted = true;
          }
          return { level: lv, baseLevel: r.level, adjusted: adjusted, rule: rule };
        }
      } catch (e) {}
    }
    var huang = lunar.tianShenType === '黄道';
    var zx = lunar.zhiXing;
    var zxLv = ZHI_XING_LEVEL[zx]; if (zxLv === undefined) zxLv = 0;
    var ji = lunar.jiShen.length, xiong = lunar.xiongSha.length;
    var level, rule;

    if (huang && (zx === '成' || zx === '开') && ji >= xiong) {
      level = '大吉';
      rule = '值神「' + tianShen + '」黄道 ＋ 建除「' + zx + '」属「成开皆可用」 ＋ 吉神(' + ji + ')不少于凶煞(' + xiong + ')';
    } else if (huang && zxLv > 0) {
      level = '吉';
      rule = '值神「' + tianShen + '」黄道 ＋ 建除「' + zx + '」属「除危定执黄」';
    } else if (huang && ji > xiong) {
      level = '吉';
      rule = '值神「' + tianShen + '」黄道 ＋ 吉神(' + ji + ')多于凶煞(' + xiong + ')';
    } else if (huang) {
      level = '平';
      rule = '值神「' + tianShen + '」黄道，但建除「' + zx + '」与吉凶煞无明显助力，故只作平看';
    } else if (zx === '破' || zx === '闭') {
      level = '大凶';
      rule = '值神「' + tianShen + '」黑道 ＋ 建除「' + zx + '」属「闭破不相当」，两凶相叠';
    } else if (zxLv < 0 || xiong > ji) {
      level = '凶';
      rule = '值神「' + tianShen + '」黑道，且' + (zxLv < 0 ? '建除「' + zx + '」属黑道' : '凶煞(' + xiong + ')多于吉神(' + ji + ')');
    } else {
      level = '平';
      rule = '值神黑道，但建除「' + zx + '」尚可、吉煞相抵，故不判凶';
    }

    // 建除破/闭对档位的封顶（破日诸事不宜，不因黄道而升为大吉/吉）
    if (zx === '破' && (level === '大吉' || level === '吉' || level === '平')) { level = '凶'; rule += '；但「破日」为诸事不宜，封顶为凶'; }
    if (zx === '闭' && (level === '大吉' || level === '吉')) { level = '平'; rule += '；但「闭日」宜藏不宜动，封顶为平'; }

    var baseLevel = level, adjusted = false;
    if (personal && personal.chong) { level = LEVEL_DOWN[level]; adjusted = true; }

    return { level: level, baseLevel: baseLevel, rule: rule, adjusted: adjusted, huang: huang, zxLv: zxLv, ji: ji, xiong: xiong };
  }

  /* ================= 气势分：规则的可追溯汇总（不参与判档） ================= */
  function buildIndicators(lunar, tianShen, personal, dayGan, dayZhi) {
    var parts = [];
    var huang = lunar.tianShenType === '黄道';
    parts.push({ name: '值神（黄道/黑道）', value: tianShen + '·' + lunar.tianShenType, pts: huang ? 3 : -3, doctrine: '十二值神：青龙明堂金匮天德玉堂司命为黄道，余六为黑道' });
    var zxLv = ZHI_XING_LEVEL[lunar.zhiXing] || 0;
    parts.push({ name: '建除十二神', value: lunar.zhiXing + '日', pts: zxLv, doctrine: '「建满平收黑，除危定执黄，成开皆可用，闭破不相当」' });
    var jp = lunar.jiShen.length > lunar.xiongSha.length ? 2 : (lunar.jiShen.length === lunar.xiongSha.length ? 0 : -2);
    parts.push({ name: '吉神／凶煞', value: '吉神 ' + lunar.jiShen.length + ' · 凶煞 ' + lunar.xiongSha.length, pts: jp, doctrine: '吉神多则吉，凶煞多则凶' });
    if (personal) {
      // 【第十八轮·边界表回归扫描】日层按与时辰层相同的边界表重写。
      // 铁律 B（同一事实只计一次）：「日干十神」与「今日之气」起点都是「日干五行」，
      //   十神是「五行对日主的关系」的另一种说法 → 合并为一条，取十神（信息量更大）。
      var ssPts = { 正印:3, 偏印:2, 食神:2, 比肩:1, 劫财:0, 正财:0, 偏财:0, 伤官:-1, 正官:-2, 七杀:-3 }[personal.shiShen] || 0;
      parts.push({
        name: '日干对你（十神）',
        value: dayGan + '(' + D.GAN_WX[dayGan] + ')＝' + personal.shiShen + (personal.yongShen.indexOf(D.GAN_WX[dayGan]) >= 0 ? '，该五行合喜用' : ''),
        pts: ssPts,
        doctrine: '日干五行对日主：印比食为助、官杀为压、财为耗。（「合不合喜用」已含在十神判断里，不另计）'
      });

      // 【边界表·宫位级+五行级】日支与命局四支的关系，走与时辰层相同的矩阵
      var dY = personal.myYearZhi, dM = personal.myMonthZhi, dD = personal.myZhi, dH = personal.myHourZhi;
      var dPOS = { day: dD, month: dM, hour: dH, year: dY };
      var dPOS_NAME = { year: '年支', month: '月支', day: '日支', hour: '时支' };
      var dPOS_COEF = { day: 1.0, month: 0.6, hour: 0.5, year: 0.4 };
      var dLEV = { chong: 6, xing: 3, hai: 2, po: 1, he: 2, fuyin: 1.5 };
      var dREL = { chong: '冲', xing: '刑', hai: '害', po: '破', he: '合', fuyin: '伏吟' };
      var dYong = personal.yongShen || [];
      var dGuirenUsed = {};
      var dGList = personal.guirenZhis || [];
      function dHasXing(z, t2) { return D.ZHI_XING && (D.ZHI_XING[z] || []).indexOf(t2) >= 0; }

      ['day', 'month', 'hour', 'year'].forEach(function (pos) {
        var tgt = dPOS[pos];
        if (!tgt) return;
        var cands = [];
        if (D.ZHI_CHONG[dayZhi] === tgt) cands.push('chong');
        if (dHasXing(dayZhi, tgt)) cands.push('xing');
        if (D.ZHI_HAI && D.ZHI_HAI[dayZhi] === tgt) cands.push('hai');
        if (D.ZHI_PO && D.ZHI_PO[dayZhi] === tgt) cands.push('po');
        if (D.ZHI_HE[dayZhi] === tgt) cands.push('he');
        if (dayZhi === tgt) cands.push('fuyin');
        if (!cands.length) return;
        cands.sort(function (a, b) { return dLEV[b] - dLEV[a]; });
        var rel = cands[0];
        var coex = cands.length > 1 ? '（与' + cands.slice(1).map(function (c) { return dREL[c]; }).join('、') + '并见，取重者）' : '';
        var tgtIsGuiren = dGList.indexOf(tgt) >= 0;
        var posPts = 0;
        if (tgtIsGuiren && !dGuirenUsed[tgt] && rel === 'he') { dGuirenUsed[tgt] = true; posPts = 3; }

        var elemPts = 0, why = '';
        if (rel === 'chong' || rel === 'xing' || rel === 'hai' || rel === 'po') {
          elemPts = -(dLEV[rel] * dPOS_COEF[pos]);
          why = '宫位受' + dREL[rel];
        } else if (rel === 'fuyin') {
          var fw = D.ZHI_WX[dayZhi];
          var fav = dYong.indexOf(fw) >= 0;
          if (dGList.indexOf(dayZhi) >= 0 && dayZhi === tgt) { elemPts = 0; why = ''; }
          else { elemPts = (dLEV.fuyin * dPOS_COEF[pos]) * (fav ? 1 : -1); why = '伏吟加强' + fw + '，' + fw + (fav ? '为喜用' : '为忌神'); }
        } else if (rel === 'he') {
          if (posPts === 0) { elemPts = dLEV.he * dPOS_COEF[pos]; why = '六合得助（普通宫位，不判化气）'; }
          else why = '';
        }
        elemPts = +elemPts.toFixed(1);
        var tot = posPts + elemPts;
        if (Math.abs(tot) < 0.05) return;
        var label = dREL[rel] + dPOS_NAME[pos] + '「' + tgt + '」';
        var desc = [];
        if (posPts !== 0) desc.push('合到天乙贵人宫+3');
        if (Math.abs(elemPts) >= 0.05) desc.push(why + ' ' + (elemPts > 0 ? '+' : '') + elemPts);
        parts.push({ name: label, value: desc.join('；') + coex, pts: +tot.toFixed(1), doctrine: '与时辰层同一矩阵：烈度×宫位系数；冲刑害破恒负，合/伏吟按五行喜忌' });
      });

      // 【边界表·五行级】日支本身的藏干加权（与时辰层同口径，原来完全没算）
      (function () {
        var hides = D.ZHI_HIDE[dayZhi] || [D.ZHI_WX[dayZhi]];
        var HW = hides.length === 1 ? [1.0] : (hides.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1]);
        var wxs = 0, det = [];
        hides.forEach(function (g2, gi) {
          var gw = D.GAN_WX[g2], ww = HW[gi] !== undefined ? HW[gi] : 0.1;
          var fav2 = dYong.indexOf(gw) >= 0;
          wxs += (fav2 ? ww : -ww);
          det.push(g2 + gw + (fav2 ? '喜' : '忌') + ww);
        });
        var pts = +(wxs * 3).toFixed(1);
        if (Math.abs(pts) >= 0.05) {
          parts.push({ name: '今日日支藏干（对你）', value: '「' + dayZhi + '」藏 ' + det.join(' / '), pts: pts,
            doctrine: '地支藏干加权（本气0.6/中气0.3/余气0.1），与时辰层同口径' });
        }
      })();

      // 时支/日支本身坐贵人（若未被上面某条关系消费）
      // 日支即命主日支本身，此处只处理「当日日支是否为贵人宫」——它是宫位事实，独立计
      if (dGList.indexOf(dayZhi) >= 0 && !dGuirenUsed[dayZhi]) {
        dGuirenUsed[dayZhi] = true;
        parts.push({ name: '当日日支坐贵人', value: '「' + dayZhi + '」即天乙贵人本气', pts: 3, doctrine: '宫位级：日支落贵人宫' });
      }
    }
    var sum = parts.reduce(function (a, p) { return a + p.pts; }, 0);
    var score = Math.round(clamp(50 + sum * 3.0, 0, 100));
    return { parts: parts, sum: sum, score: score, formula: '气势分 = 50 ＋ 合计 × 3.0（合计 ' + (sum >= 0 ? '+' : '') + sum + '）' };
  }

  /* ================= 多日扫描：生辰只算一次，逐日只判档（快） ================= */
  function prep(birth) {
    if (!birth || !birth.y) return null;
    try {
      var br = BZ.paipan({ y: +birth.y, m: +birth.m, d: +birth.d, h: +(birth.h || 12), mi: +(birth.mi || 0),
                           gender: (birth.gender === 0 || birth.gender === '0') ? 0 : 1 });
      return { dayMaster: br.dayMaster.gan + br.dayMaster.wuXing, meGan: br.dayMaster.gan,
               yongShen: (br.strength.yongHint.favor || []).slice(), myZhi: br.pillars[2].zhi,
               myYearZhi: br.pillars[0].zhi, myMonthZhi: br.pillars[1].zhi, myHourZhi: br.pillars[3].zhi,
               shenSha: br.shenSha || [],
               strength: br.strength.level, pillars: br.pillars.map(function (p) { return p.ganZhi; }) };
    } catch (e) { return null; }
  }
  function makePersonal(me, dayGan, dayZhi) {
    if (!me) return null;
    return { dayMaster: me.dayMaster, shiShen: BZ.shiShen(me.meGan, dayGan), yongShen: me.yongShen,
             myZhi: me.myZhi, myYearZhi: me.myYearZhi, myMonthZhi: me.myMonthZhi, myHourZhi: me.myHourZhi,
             dayZhi: dayZhi,
             // 天乙贵人落宫：按日干查（甲戊庚→丑未；乙己→子申；丙丁→亥酉；壬癸→巳卯；辛→午寅）
             // 【第十二轮修正】贵人有 2 个宫位，不能只看年支。返回完整列表供各宫位判定。
             guirenZhis: (function () {
               var TB = { 甲: ['丑','未'], 戊: ['丑','未'], 庚: ['丑','未'], 乙: ['子','申'], 己: ['子','申'],
                          丙: ['亥','酉'], 丁: ['亥','酉'], 壬: ['巳','卯'], 癸: ['巳','卯'], 辛: ['午','寅'] };
               return TB[(me.meGan || '')] || [];
             })(),
             chong: D.ZHI_CHONG[dayZhi] === me.myZhi, he: D.ZHI_HE[dayZhi] === me.myZhi,
             strength: me.strength, pillars: me.pillars };
  }
  function dayCore(y, m, d) {
    var solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
    var lunar = solar.getLunar();
    var tianShen = lunar.getDayTianShen();
    var info = {
      dayGZ: lunar.getDayInGanZhi(), dayGan: lunar.getDayGan(), dayZhi: lunar.getDayZhi(),
      yearGZ: lunar.getYearInGanZhi(), monthGZ: lunar.getMonthInGanZhi(), xunKong: lunar.getDayXunKong(),
      tianShen: tianShen, tianShenType: lunar.getDayTianShenType(), tianShenLuck: lunar.getDayTianShenLuck(),
      zhiXing: lunar.getZhiXing(), zhiXingNote: ZHI_XING_NOTE[lunar.getZhiXing()] || '',
      sha: lunar.getSha(), jiShen: lunar.getDayJiShen() || [], xiongSha: lunar.getDayXiongSha() || [],
      lunarText: lunar.toString()
    };
    return { solar: solar, lunar: lunar, tianShen: tianShen, info: info };
  }
  // 单日速判（不含十二时辰，供一周走势与卡池区间扫描）
  function dayBrief(y, m, d, me) {
    var c = dayCore(y, m, d);
    var personal = makePersonal(me, c.info.dayGan, c.info.dayZhi);
    var judgeRule = judgeDay(c.info, personal, c.tianShen);
    var ind = buildIndicators(c.info, c.tianShen, personal, c.info.dayGan, c.info.dayZhi);
    // 与 todayLuck 同口径：档位由分数定，避免同一天两个函数给出不同档位
    // 细分档（大/中/小）：复用 xs-daily 的口径，保证与八字页显示一致
    var gradeText = '平';
    if (DL && typeof DL.daily === 'function') {
      try { gradeText = DL.daily({ y: y, m: m, d: d, birth: opt.birth || null }).grade.text; } catch (e2) { gradeText = levelByScoreDay(ind.score); }
    } else { gradeText = levelByScoreDay(ind.score); }
    var judge = { level: levelByScoreDay(ind.score), baseLevel: levelByScoreDay(ind.score),
                  adjusted: !!judgeRule.adjusted, rule: judgeRule.rule };
    return {
      y: y, m: m, d: d, date: c.solar.toYmd(), week: c.solar.getWeekInChinese(),
      dayGZ: c.info.dayGZ, tianShen: c.info.tianShen, tianShenType: c.info.tianShenType, zhiXing: c.info.zhiXing,
      level: judge.level, levelIdx: LEVEL_IDX[judge.level], baseLevel: judge.baseLevel,
      grade: { text: judge.gradeText || judge.level },
      grade: { text: gradeText }, adjusted: judge.adjusted,
      rule: judge.rule, score: ind.score, sum: ind.sum, personal: personal
    };
  }
  function addDays(dt, n) { var x = new Date(dt.getTime()); x.setDate(x.getDate() + n); return x; }
  function ymdOf(dt) { return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }; }
  function scanRange(opt, startDate, endDate, maxDays) {
    var me = prep(opt && opt.birth);
    var out = [], cur = new Date(startDate.getTime()), end = new Date(endDate.getTime());
    var guard = 0, cap = maxDays || 400;
    while (cur <= end && guard++ < cap) {
      var p = ymdOf(cur);
      out.push(dayBrief(p.y, p.m, p.d, me));
      cur = addDays(cur, 1);
    }
    return out;
  }
  function rankDays(briefs) {
    return (briefs || []).slice().sort(function (a, b) {
      if (b.levelIdx !== a.levelIdx) return b.levelIdx - a.levelIdx;
      if (b.score !== a.score) return b.score - a.score;
      return a.date < b.date ? -1 : 1;
    });
  }
  // 最近 N 天里最宜 / 次选 / 最差
  function nextBest(opt, days) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var list = scanRange(opt, t, addDays(t, (days || 30) - 1), (days || 30) + 5);
    var ranked = rankDays(list);
    return { list: list, best: ranked[0] || null, top: ranked.slice(0, 3), worst: ranked[ranked.length - 1] || null, days: days || 30 };
  }
  // 一周走势（今天起 N 天）
  function weekTrend(opt, n) {
    n = n || 7;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return scanRange(opt, t, addDays(t, n - 1), n + 2);
  }

  function todayLuck(opt) {
    opt = opt || {};
    var now = new Date();
    var y = opt.y || now.getFullYear(), m = opt.m || (now.getMonth() + 1), d = opt.d || now.getDate();
    var solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
    var lunar = solar.getLunar();
    var dayGanZhi = lunar.getDayInGanZhi(), dayGan = lunar.getDayGan(), dayZhi = lunar.getDayZhi();
    var tianShen = lunar.getDayTianShen();
    var info = {
      dayGZ: dayGanZhi, dayGan: dayGan, dayZhi: dayZhi,
      yearGZ: lunar.getYearInGanZhi(), monthGZ: lunar.getMonthInGanZhi(),
      xunKong: lunar.getDayXunKong(),
      tianShen: tianShen, tianShenType: lunar.getDayTianShenType(), tianShenLuck: lunar.getDayTianShenLuck(),
      zhiXing: lunar.getZhiXing(), zhiXingNote: ZHI_XING_NOTE[lunar.getZhiXing()] || '',
      sha: lunar.getSha(),
      jiShen: lunar.getDayJiShen() || [], xiongSha: lunar.getDayXiongSha() || [],
      lunarText: lunar.toString()
    };

    // 个人因素（可选）
    var meInfo = prep(opt.birth);
    var personal = makePersonal(meInfo, dayGan, dayZhi);

    var ind = buildIndicators(info, tianShen, personal, dayGan, dayZhi);
    var judgeRule = judgeDay(info, personal, tianShen);   // 规则判档只取 rule 文字
    var lvByScore = levelByScoreDay(ind.score);           // 日档复用 xs-daily 的唯一来源
    // 细分档（大/中/小）：此处 opt.birth 在作用域内，直接取 xs-daily 的 grade
    var gradeText = lvByScore;
    if (DL && typeof DL.daily === 'function') {
      try { var dr = DL.daily({ y: y, m: m, d: d, birth: opt.birth || null }); if (dr && dr.grade && dr.grade.text) gradeText = dr.grade.text; } catch (e) {}
    }
    var judge = {
      level: lvByScore,
      baseLevel: lvByScore,
      gradeText: gradeText,
      adjusted: !!judgeRule.adjusted,
      rule: judgeRule.rule
    };

    // —— 十二时辰：多维度综合计分（不能只看时值神黄道/黑道）
    // 五个维度，与日层同样思路：
    //   ① 时值神黄道/黑道      ±3
    //   ② 时干十神（对你）      ±3（印比助身，官杀克身）
    //   ③ 时支五行合喜用        ±3
    //   ④ 时支与命局四支的冲合  冲日支 -4（最忌）/ 冲月支时支 -2 / 合贵人 +3 / 合日支 +2 / 伏吟 +1
    //   ⑤ 时支与当日日支关系    冲 -2 / 合 +2
    // 系数 3.0，与日层同款（50 + 合计×3）。
    var hours = [];
    for (var i = 0; i < 12; i++) {
      var hSolar = Solar.fromYmdHms(y, m, d, i * 2, 30, 0);
      var hLunar = hSolar.getLunar();
      var t = hLunar.getTime();
      var hType = t.getTianShenType(), hName = HOUR_NAMES[i], hWx = D.ZHI_WX[hName];
      var hGan = hLunar.getTimeGan ? hLunar.getTimeGan() : (hLunar.getTimeInGanZhi ? hLunar.getTimeInGanZhi().charAt(0) : '');
      var hGZ = hLunar.getTimeInGanZhi ? hLunar.getTimeInGanZhi() : '';
      var hs = 0, notes = [];

      // ══════════════════════════════════════════════════════════════════
      // 【第二十四轮·唯一计分入口】所有地支关系计分必须经过 addRel()。
      // 设计目标（对方建议）：让「不走统一公式」这件事在代码结构上不可能发生。
      //   签名：addRel(relType, posKey, opts)
      //     relType: chong|xing|hai|po|he|fuyin|banhe|gonghe|chengju
      //     posKey : day|month|hour|year|today（today = 当日日支，系数固定 0.5）
      //     opts   : { ju: 合局五行, hasZhong: bool, isFav: bool }
      //   内部统一：烈度 × 宫位系数 × 符号，一处算完。
      // ══════════════════════════════════════════════════════════════════
      // 【烈度表】次序依据：冲(最重) > 成局 > 刑 > 合/半合/害 > 伏吟 > 破。
      //   · 「冲 > 刑 > 害 > 破」有传统通说依据；
      //   · 「成局」介于冲与刑之间（4）：三支成局是强结构，但破坏力不及直接相冲；
      //   · 具体比值是估定的，非古籍原文（见文档【数值来源声明】）。
      var REL_LEV = { chong: 6, chengju: 4, xing: 3, hai: 2, he: 2, banhe: 2, fuyin: 1.5, po: 1, gonghe: 1 };
      var REL_COEF_FIX = { today: 0.5 };
      function addRel(relType, posKey, opts) {
        opts = opts || {};
        var coef = (opts.coef !== undefined) ? opts.coef
                 : (REL_COEF_FIX[posKey] !== undefined ? REL_COEF_FIX[posKey] : (POS_COEF[posKey] || 1));
        var lev = REL_LEV[relType];
        var sign;
        if (relType === 'chong' || relType === 'xing' || relType === 'hai' || relType === 'po') {
          sign = -1;                                    // 冲击类恒负
        } else if (relType === 'fuyin') {
          sign = opts.isFav ? 1 : -1;                   // 伏吟按加强五行喜忌
        } else {
          sign = opts.isFav ? 1 : -1;                   // 合类按合出五行喜忌
        }
        var w = +(lev * coef * sign).toFixed(1);
        if (Math.abs(w) >= 0.05) hs += w;
        return w;
      }

      // ① 时值神（传统「时家黄道」，分量低于命盘因素——扶抑优先）
      hs += (hType === '黄道' ? 2 : -2);
      notes.push('时值神「' + t.getTianShen() + '」' + hType + (hType === '黄道' ? ' +2' : ' −2'));

      if (personal) {
        // ② 时干十神
        var hSS = BZ.shiShen(personal.dayMaster ? personal.dayMaster.charAt(0) : '庚', hGan);
        var hSSPts = { 正印: 3, 偏印: 2, 食神: 2, 比肩: 1, 劫财: 0, 正财: 0, 偏财: 0, 伤官: -1, 正官: -2, 七杀: -3 }[hSS] || 0;
        hs += hSSPts;
        if (hSS) notes.push('时干' + hGan + '＝' + hSS + (hSSPts >= 0 ? ' +' : ' ') + hSSPts);

        // ③ 时支五行 —— 按藏干加权（与八字引擎同口径，不再只看本气）
        //   权重：本气 0.6 / 中气 0.3 / 余气 0.1（地支独气者 1.0）
        if (personal.yongShen && personal.yongShen.length) {
          var hides = D.ZHI_HIDE[hName] || [D.ZHI_WX[hName]];
          var HW = hides.length === 1 ? [1.0] : (hides.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1]);
          var wxScore = 0, wxDetail = [];
          hides.forEach(function (g, gi) {
            var gw = D.GAN_WX[g];
            var ww = HW[gi] !== undefined ? HW[gi] : 0.1;
            var fav = personal.yongShen.indexOf(gw) >= 0;
            wxScore += (fav ? ww : -ww);
            wxDetail.push(g + gw + (fav ? '喜' : '忌') + ww);
          });
          var wxPts = +(wxScore * 3).toFixed(1);
          hs += wxPts;
          notes.push('时支' + hName + '藏干加权：' + wxDetail.join(' / ') + ' → ' + (wxPts >= 0 ? '+' : '') + wxPts);
        }

        // ④ 与命局四支：按「边界表」计分（第十四轮重构）
        //
        // 【边界表·所有地支关系的计分裁决依据】
        //   ┌──────────────┬────────────────────────┬──────────┐
        //   │ 层            │ 判什么                  │ 独立计分  │
        //   ├──────────────┼────────────────────────┼──────────┤
        //   │ ① 关系成立    │ 有没有冲/合/刑/害/破/伏吟 │ ❌ 前提    │
        //   │ ② 宫位级      │ 作用到哪一宫（贵人/日支…）│ ✅ 独立    │
        //   │ ③ 五行级      │ 汇入/加强什么五行        │ ✅ 独立    │
        //   └──────────────┴────────────────────────┴──────────┘
        //
        // 【去重三铁律】
        //   A. 同一对地支的多个关系 → 取烈度最高一条（丑未既冲又刑，只记冲）
        //   B. 同一事实的多种说法   → 只计一次（时支未=年支未=同一个贵人宫，不重复）
        //   C. 关系成立本身不计分   → 它只是②③的前提（午时合贵人+3 之后，不再另加「有合」分）
        var Y = personal.myYearZhi, M = personal.myMonthZhi, Dd = personal.myZhi, H = personal.myHourZhi;
        var POS = { day: Dd, month: M, hour: H, year: Y };
        var POS_NAME = { year: '年支', month: '月支', day: '日支', hour: '时支' };
        var POS_COEF = { day: 1.0, month: 0.6, hour: 0.5, year: 0.4 };
        var LEV = { chong: 6, xing: 3, hai: 2, po: 1, he: 2, fuyin: 1.5 };
        var REL_CN = { chong: '冲', xing: '刑', hai: '害', po: '破', he: '合', fuyin: '伏吟' };
        var yong = personal.yongShen || [];
        var gList = personal.guirenZhis || [];
        function hasXingT(z, target) { return D.ZHI_XING && (D.ZHI_XING[z] || []).indexOf(target) >= 0; }

        // ── 宫位级：时支本身坐在贵人宫上（独立计，但若该宫位已被下面某条关系消费，则不再重复）
        var hourIsGuiren = gList.indexOf(hName) >= 0;
        var guirenUsed = {};   // 记录「哪个贵人宫」已被关系消费（按宫位名，不是布尔）

        ['day', 'month', 'hour', 'year'].forEach(function (pos) {
          var tgt = POS[pos];
          if (!tgt) return;
          var cands = [];
          if (D.ZHI_CHONG[hName] === tgt) cands.push('chong');
          if (hasXingT(hName, tgt)) cands.push('xing');
          if (D.ZHI_HAI && D.ZHI_HAI[hName] === tgt) cands.push('hai');
          if (D.ZHI_PO && D.ZHI_PO[hName] === tgt) cands.push('po');
          if (D.ZHI_HE[hName] === tgt) cands.push('he');
          if (hName === tgt) cands.push('fuyin');
          if (!cands.length) return;
          cands.sort(function (a, b) { return LEV[b] - LEV[a]; });
          var rel = cands[0];
          var coexisting = cands.length > 1 ? cands.slice(1) : [];
          var tgtIsGuiren = gList.indexOf(tgt) >= 0;

          // ② 宫位级（只判「作用到贵人宫」这一件事；冲/合都可触发，但同一贵人宫只计一次）
          // 【第十六轮修正·铁律 C 的正确适用】
          // 宫位级加分只有在「它是一个独立事实」时才计。
          // 若贵人宫 = 被作用的那个宫位本身（年支未既是「年支」又是「贵人宫」），
          // 那「冲贵人宫」与「冲年支」就是同一个事件的两种叫法 → 只计一次，不叠加。
          var posBonus = 0;
          if (tgtIsGuiren && !guirenUsed[tgt] && rel === 'he') {
            // 合到贵人宫：「得贵人相助」是独立于「有合」的宫位事实 → 计 +3（替代关系分）
            guirenUsed[tgt] = true;
            posBonus = +3;
          }
          // 冲贵人宫：与「冲该宫位」是同一事件，不再单独扣（由下方冲击分承担）

          // ③ 五行级 / 冲击级
          var elemPts = 0, elemWhy = '';
          if (rel === 'chong' || rel === 'xing' || rel === 'hai' || rel === 'po') {
            elemPts = -(LEV[rel] * POS_COEF[pos]);          // 冲击恒负，不看五行
            elemWhy = '宫位受' + REL_CN[rel] + '（' + POS_NAME[pos] + '受冲击）';
          } else if (rel === 'fuyin') {
            // 去重铁律 B：时支与目标支同字、且该字为贵人宫时，「时支即贵人 +3」已涵盖宫位级，
            // 此处仅保留「五行加强」这一层（不与贵人宫位分重复）
            var fw = D.ZHI_WX[hName];
            var fav = yong.indexOf(fw) >= 0;
            if (hourIsGuiren && hName === tgt) {
              elemPts = 0;
              elemWhy = '';
            } else {
              elemPts = (LEV['fuyin'] * POS_COEF[pos]) * (fav ? 1 : -1);
              elemWhy = '伏吟加强' + fw + '，' + fw + (fav ? '为喜用' : '为忌神');
            }
          } else if (rel === 'he') {
            // 【边界表 C】「有合」本身不计分（它只是宫位级的前提）。
            // 若未命中贵人宫，按「普通宫位得助」给一个小的关系分；命中贵人宫则已有 +3，不再叠加。
            if (posBonus === 0) {
              elemPts = (LEV['he'] * POS_COEF[pos]) * 1;
              elemWhy = '六合得助（普通宫位，只作关系分，不判化气）';
            } else {
              elemWhy = '六合已计入贵人宫位分，不再叠加关系分';
            }
          }

          // 【第二十四轮】elemPts 统一走 addRel；宫位级 posBonus 是独立事实（贵人宫），单独加
          var relKey = (rel === 'chong' || rel === 'xing' || rel === 'hai' || rel === 'po') ? rel
                     : (rel === 'fuyin' ? 'fuyin' : 'he');
          // 边界表 C：命中贵人宫时，「有合」的关系分不再叠加（贵人宫分已代表该宫被合）
          var skipElem = (posBonus > 0 && rel === 'he');
          // 去重铁律 B：时支与目标支同字且为贵人宫时，伏吟不另计
          var skipFuyin = (rel === 'fuyin' && hourIsGuiren && hName === tgt);
          if (!skipElem && !skipFuyin) {
            elemPts = addRel(relKey, pos, { isFav: (rel === 'fuyin' ? (yong.indexOf(D.ZHI_WX[hName]) >= 0) : true) });
          } else {
            elemPts = 0;
          }
          var total = posBonus + elemPts;
          if (Math.abs(total) < 0.05) return;
          if (Math.abs(posBonus) >= 0.05) hs += posBonus;

          if (posBonus !== 0) {
            notes.push((posBonus > 0 ? '合到' : '⚠ 冲到') + '天乙贵人宫「' + tgt + '」（宫位级）'
              + (posBonus > 0 ? '+' : '') + posBonus);
          }
          if (Math.abs(elemPts) >= 0.05) {
            var txt = REL_CN[rel] + '你的' + POS_NAME[pos] + '「' + tgt + '」' + elemWhy;
            if (coexisting.length) txt += '（与' + coexisting.map(function (c) { return REL_CN[c]; }).join('、') + '并见，取重者）';
            notes.push(txt + ' ' + (elemPts > 0 ? '+' : '') + elemPts);
          }
        });

        // ── 宫位级：时支本身坐在贵人宫上（若上面已因关系消费过该贵人宫，则不重复——去重铁律 B）
        if (hourIsGuiren && !guirenUsed[hName]) {
          hs += 3;
          notes.push('时支「' + hName + '」即天乙贵人本气（宫位级）+3');
        } else if (hourIsGuiren && guirenUsed[hName]) {
          notes.push('时支「' + hName + '」即天乙贵人本气，但该宫位已计入上方宫位分，不重复');
        }

        // ④b 三合 / 半合 / 拱合
        // 【第二十二轮重构·架构修正】不再「按关系类型各写一个分支」（那样每加一类就可能漏乘系数），
        // 改为统一公式：分值 = 烈度基准 × 宫位系数 × 喜忌符号。所有关系类型走同一行代码。
        var SANHE_JU = { 申: '水', 子: '水', 辰: '水', 亥: '木', 卯: '木', 未: '木', 寅: '火', 午: '火', 戌: '火', 巳: '金', 酉: '金', 丑: '金' };
        var SANHE_GROUP = { 水: ['申','子','辰'], 木: ['亥','卯','未'], 火: ['寅','午','戌'], 金: ['巳','酉','丑'] };
        var ZHONGSHEN = ['子', '午', '卯', '酉'];
        var myZhis = [Y, M, Dd, H].filter(Boolean);
        var formed = {};
        Object.keys(SANHE_GROUP).forEach(function (ju) {
          var need = SANHE_GROUP[ju];
          if (need.indexOf(hName) < 0) return;
          var others = need.filter(function (z) { return z !== hName; });
          // 记录「哪两个宫位」参与了成局——系数要按参与宫位算，不能凭空取日支
          var hitPos = [];
          others.forEach(function (z) {
            ['year', 'month', 'day', 'hour'].forEach(function (pk) {
              if (POS[pk] === z) hitPos.push(pk);
            });
          });
          if (hitPos.length === 2) formed[ju] = hitPos;
        });

        // 【第二十六轮·彻底消除第二条路径】juScore 已删除。
        // 三合/半合/拱合/成局 全部直接调用 addRel()——不再有第二份「lev*coef*sign」公式。
        // 检查法：grep 'hs +=' 应只出现在 addRel 内部 + 非地支关系维度（值神/十神/藏干/贵人宫）

        Object.keys(formed).forEach(function (ju) {
          var isFav = yong.indexOf(ju) >= 0;
          // 【第二十八轮·规则依据修正】成局是「时支 + 命局两支」三支共同构成的事件，
          // 不是某一个宫位的事。系数取「三个参与宫位系数的平均值」：
          //   例：卯时成木局 = 时支(0.5) + 年支(0.4) + 月支(0.6) → 平均 0.5
          // 这是本轮唯一一次「改规则本身」而非「修实现」——原先是硬编码 day 的 1.0，无依据。
          var hitPos = formed[ju] || [];
          var coefs = [POS_COEF['hour']].concat(hitPos.map(function (pk) { return POS_COEF[pk]; }));
          var avgCoef = coefs.reduce(function (a, b) { return a + b; }, 0) / coefs.length;
          var w = addRel('chengju', 'custom', { isFav: isFav, coef: avgCoef });
          var posNames = ['时支'].concat(hitPos.map(function (pk) { return POS_NAME[pk]; }));
          notes.push('与你命局成「' + ju + '局」（' + SANHE_GROUP[ju].join('') + ' 三支全齐，合类中力量最强；'
            + '参与宫位 ' + posNames.join('+') + '，系数取平均 ' + avgCoef.toFixed(2) + '），'
            + ju + (isFav ? '为喜用 +' + w : '为忌神 ' + w + '（身弱者最忌成局）'));
        });

        ['month', 'day', 'hour', 'year'].forEach(function (pos) {
          var tgt = POS[pos];
          if (!tgt || tgt === hName) return;
          if (SANHE_JU[hName] && SANHE_JU[hName] === SANHE_JU[tgt]) {
            var ju = SANHE_JU[hName];
            if (formed[ju]) return;
            var hasZhong = ZHONGSHEN.indexOf(hName) >= 0 || ZHONGSHEN.indexOf(tgt) >= 0;
            var levBase = hasZhong ? 2 : 1;
            var isFav2 = yong.indexOf(ju) >= 0;
            // 【第三十轮】半合/拱合同样是「两支共同构成」，系数取「时支 + 该命局宫位」的平均
            var avgHalf = (POS_COEF['hour'] + POS_COEF[pos]) / 2;
            var w2 = addRel(hasZhong ? 'banhe' : 'gonghe', 'custom', { isFav: isFav2, coef: avgHalf });
            if (Math.abs(w2) >= 0.05) {
              notes.push((hasZhong ? '半合' : '拱合') + '你的' + POS_NAME[pos] + '「' + tgt + '」成' + ju + '局（'
                + (hasZhong ? '含中神，力强' : '缺中神，力弱') + '），' + ju
                + (isFav2 ? '为喜用 +' + w2 : '为忌神 ' + w2));
            }
          }
        });

        // ⑤ 与当日日支 —— 全部关系（冲/刑/害/破/六合/半合/拱合）统一走 addRel()
        var dayZ = personal.dayZhi || '';
        if (dayZ) {
          var dRelCands = [];
          if (D.ZHI_CHONG[hName] === dayZ) dRelCands.push('chong');
          if (hasXingT(hName, dayZ)) dRelCands.push('xing');
          if (D.ZHI_HAI && D.ZHI_HAI[hName] === dayZ) dRelCands.push('hai');
          if (D.ZHI_PO && D.ZHI_PO[hName] === dayZ) dRelCands.push('po');
          if (D.ZHI_HE[hName] === dayZ) dRelCands.push('he');
          if (dRelCands.length) {
            dRelCands.sort(function (a, b) { return REL_LEV[b] - REL_LEV[a]; });
            var dRel = dRelCands[0];
            var dCoex = dRelCands.length > 1 ? '（与' + dRelCands.slice(1).map(function (c) { return REL_CN[c]; }).join('、') + '并见，取重者）' : '';
            // 六合 = 得当日之气相助（符号为正）；其余冲击类恒负。全部经 addRel 统一算。
            var dPts = addRel(dRel, 'today', { isFav: dRel === 'he' });
            if (Math.abs(dPts) >= 0.05) {
              notes.push('与当日日支「' + dayZ + '」' + REL_CN[dRel] + ' ' + (dPts > 0 ? '+' : '') + dPts + dCoex);
            }
          }
          // 三合/半合/拱合：同样走 addRel()
          if (SANHE_JU[hName] && SANHE_JU[hName] === SANHE_JU[dayZ] && hName !== dayZ) {
            var dJu = SANHE_JU[hName];
            var hasZ2 = ZHONGSHEN.indexOf(hName) >= 0 || ZHONGSHEN.indexOf(dayZ) >= 0;
            var isFav3 = yong.indexOf(dJu) >= 0;
            var w3 = addRel(hasZ2 ? 'banhe' : 'gonghe', 'today', { isFav: isFav3 });
            if (Math.abs(w3) >= 0.05) {
              notes.push('与当日日支「' + dayZ + '」' + (hasZ2 ? '半合' : '拱合') + dJu + '局（'
                + (hasZ2 ? '含中神，力强' : '缺中神，力弱') + '），' + dJu
                + (isFav3 ? '为喜用 +' + w3 : '为忌神 ' + w3));
            }
          }
        }
      }

      var hScore = Math.round(clamp(50 + hs * 3.0, 0, 100));
      hours.push({
        name: hName, range: HOUR_RANGES[i], ganZhi: hGZ, gan: hGan,
        tianShen: t.getTianShen(), type: hType, luck: t.getTianShenLuck(),
        level: levelByScoreHour(hScore),
        score: hScore, sum: hs, notes: notes
      });
    }
    // 最佳时辰按「综合分」取前三（不再只看时值神黄道——时辰已是多维度综合计分）
    var bestHours = hours.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    var worstHour = hours.slice().sort(function (a, b) { return a.score - b.score; })[0];
    // 明确的抽卡时间建议（最好 / 最差），供界面与文本直接写明
    var timeAdvice = {
      best: bestHours.map(function (h) { return { name: h.name, range: h.range, tianShen: h.tianShen, score: h.score }; }),
      worst: { name: worstHour.name, range: worstHour.range, tianShen: worstHour.tianShen, score: worstHour.score },
      text: '今天最好在 ' + bestHours[0].name + '时（' + bestHours[0].range + '）抽；最差是 ' + worstHour.name + '时（' + worstHour.range + '），尽量避开。若最差时段正值游戏维护/无法登录，可忽略。',
      bestText: bestHours.map(function (h) { return h.name + '时 ' + h.range; }).join('、'),
      worstText: worstHour.name + '时 ' + worstHour.range
    };

    // —— 幸运项（取喜用神；未填生辰取今日日支五行）——
    var luckyWx = (personal && personal.yongShen.length) ? personal.yongShen[0] : D.ZHI_WX[dayZhi];
    var lucky = { wx: luckyWx, numbers: WX_NUM[luckyWx], colors: WX_COLOR[luckyWx], dir: WX_DIR[luckyWx], item: WX_ITEM[luckyWx],
                  from: (personal && personal.yongShen.length) ? '取你的喜用神五行' : '取今日日支五行' };

    // —— 签文：游戏专属签池 × 当日档位 × 确定性 hash ——
    var gameId = opt.gameId || 'generic';
    var gameInfo = Games.byId(gameId);
    var gameName = opt.gameName || (gameId === 'generic' ? (opt.game || '') : gameInfo.name);
    var account = (opt.account || '').toString().trim().slice(0, 24);
    // 签文按「日期＋干支＋游戏＋账号＋日主」定，同一账号同一天固定；换账号或换游戏会换签
    var hv = hash([y, m, d, dayGanZhi, gameId, gameName, account, personal ? personal.dayMaster : ''].join('|'));
    var raw = Games.pickSlip(gameId, judge.level, hv);
    var slip = { level: judge.level, title: raw.t, verse: raw.v, note: raw.n };

    // —— 宜忌（按档位，规则化）——
    var doList = [], dontList = [];
    var hourTxt = bestHours.map(function (h) { return h.name + '时'; }).join('、');
    if (judge.level === '大吉') {
      doList.push('宜十连：今日值神黄道且建除成开，属诸事可用之日');
      doList.push('宜在最佳时辰出手：' + hourTxt);
    } else if (judge.level === '吉') {
      doList.push('宜按计划抽，或先单抽试水');
      doList.push('宜选吉时：' + hourTxt);
    } else if (judge.level === '平') {
      doList.push('宜按计划抽、抽够保底就收；今日无功无过');
      doList.push('宜做日常攒资源');
    } else if (judge.level === '凶') {
      doList.push('宜攒票：今日值神黑道或建除不吉，不宜开新池');
      doList.push('宜先做任务，把资源留到吉日');
    } else {
      doList.push('宜免战：今日凶煞相叠，不抽为上');
      doList.push('宜做日常、宜攒票、宜看别人抽');
    }
    if (judge.adjusted) dontList.push('忌开新池：今日日支冲你的日支（日辰冲命，传统谓诸事不宜），分数已按冲命扣减');
    if (info.zhiXing === '破' || info.zhiXing === '闭') dontList.push('忌动：建除为「' + info.zhiXing + '」日，闭破不相当');
    dontList.push('忌在' + worstHour.name + '时（' + worstHour.range + '）抽：今日最弱时辰');
    dontList.push('忌为"时运"超额消费：抽卡概率由官方算法决定，任何术数都改不了它');

    var advice = {
      '大吉': '今日诸事可用，想抽就抽，见好就收。',
      '吉': '今日偏顺，按计划抽，抽够就停。',
      '平': '今日无功无过，按计划抽、抽够保底就收。',
      '凶': '今日不宜开新池，攒票等吉日更划算。',
      '大凶': '今日凶煞相叠，抽卡多半白给，建议免战。'
    }[judge.level];

    return {
      ok: true,
      date: { y: y, m: m, d: d, text: solar.toYmd(), week: solar.getWeekInChinese() },
      lunar: info,
      account: account,
      game: gameName,
      gameInfo: { id: gameId, name: gameInfo.name, unit: gameInfo.unit, currency: gameInfo.currency, pity: gameInfo.pity, pityNote: gameInfo.pityNote },
      personal: personal,
      level: judge.level, levelIdx: LEVEL_IDX[judge.level], baseLevel: judge.baseLevel,
      grade: { text: judge.gradeText || judge.level },
      levelRule: judge.rule, levelAdjusted: judge.adjusted,
      score: ind.score, scoreSum: ind.sum, scoreFormula: ind.formula,
      indicators: ind.parts, basis: ind.parts.map(function (p) { return { delta: p.pts, text: p.name + '：' + p.value + '　（' + p.doctrine + '）' }; }),
      hours: hours, bestHours: bestHours, worstHour: worstHour, timeAdvice: timeAdvice,
      slip: slip, lucky: lucky, doList: doList, dontList: dontList, advice: advice,
      disclaimer: '抽卡结果由游戏官方概率决定，本功能是娱乐与仪式感，不构成任何"提高出货率"的承诺；请设定预算、量力而行。'
    };
  }

  function report(r) {
    var L = [];
    L.push('【今日抽卡时运】' + r.date.text + '（' + r.date.week + '）' + (r.account ? '　账号：' + r.account : '') + (r.game ? ' · ' + r.game : ''));
    L.push('农历 ' + r.lunar.lunarText + '　' + r.lunar.dayGZ + '日');
    L.push('值神 ' + r.lunar.tianShen + '（' + r.lunar.tianShenType + '）　建除 ' + r.lunar.zhiXing + '日　煞' + r.lunar.sha);
    if (r.gameInfo) L.push('游戏：' + r.gameInfo.name + '（最高稀有 ' + r.gameInfo.unit + '；保底参考：' + r.gameInfo.pityNote + '）');
    if (r.personal) L.push('日主 ' + r.personal.dayMaster + '（' + r.personal.strength + '）　今日对其为「' + r.personal.shiShen + '」　喜用：' + (r.personal.yongShen.join('、') || '—'));
    L.push('');
    L.push('今日总评：' + r.level + '　' + r.score + ' 分（气势分决定档位）');
    L.push('判定规则：' + r.levelRule);
    L.push('气势分：' + r.score + ' / 100　' + r.scoreFormula + '（此分仅为规则汇总，不参与判档）');
    L.push('一句话：' + r.advice);
    L.push('今日签：' + r.slip.title + '（' + r.slip.level + '）—— ' + r.slip.verse);
    L.push('        注解：' + r.slip.note);
    L.push('');
    L.push('【抽卡时间建议】');
    L.push('  最好在：' + r.bestHours.map(function (h) { return h.name + '时（' + h.range + '·' + h.tianShen + h.type + '）'; }).join('、'));
    L.push('  最差在：' + r.worstHour.name + '时（' + r.worstHour.range + '·' + r.worstHour.tianShen + r.worstHour.type + '），尽量避开');
    L.push('幸运五行：' + r.lucky.wx + '　数字：' + r.lucky.numbers.join('/') + '　颜色：' + r.lucky.colors + '　方位：' + r.lucky.dir);
    L.push('');
    L.push('宜：'); r.doList.forEach(function (x) { L.push('  · ' + x); });
    L.push('忌：'); r.dontList.forEach(function (x) { L.push('  · ' + x); });
    L.push('');
    L.push('气势分依据（合计 ' + (r.scoreSum >= 0 ? '+' : '') + r.scoreSum + '）：');
    r.indicators.forEach(function (p) { L.push('  ' + (p.pts >= 0 ? '+' : '') + p.pts + '　' + p.name + '：' + p.value + '（' + p.doctrine + '）'); });
    L.push('');
    L.push(r.disclaimer);
    return L.join('\n');
  }

  return { todayLuck: todayLuck, report: report, judgeDay: judgeDay, LEVEL_NAMES: LEVEL_NAMES, LEVEL_IDX: LEVEL_IDX, LEVEL_DOWN: LEVEL_DOWN,
           dayBrief: dayBrief, scanRange: scanRange, rankDays: rankDays, nextBest: nextBest, weekTrend: weekTrend, prep: prep, addDays: addDays,
           ZHI_XING_LEVEL: ZHI_XING_LEVEL, HOUR_NAMES: HOUR_NAMES, HOUR_RANGES: HOUR_RANGES, WX_NUM: WX_NUM };
});
