// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-daily.js —— 生辰八字 · 结合日期推当天运势
 *
 * 【方法】传统择日（值神黄道/黑道 → 建除十二神 → 吉神凶煞对比）＋ 个人命盘比对
 *        （日干十神、今日之气合喜用、日支冲合、旬空、当日支与命局刑冲）。
 * 判档用规则，不用分数阈值；气势分只作展示（50 + 合计×3.0）。
 * 与「抽卡时运」同一套择日口径，但输出更贴八字：含时辰吉凶、宜忌、逐条依据。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./xs-data.js'), require('./xs-bazi.js'), require('./lunar.js'));
  } else {
    root.XS = root.XS || {};
    root.XS.Daily = factory(root.XS.Data, root.XS.Bazi, { Solar: root.Solar, Lunar: root.Lunar });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, BZ, LU) {
  'use strict';
  var Solar = LU.Solar;

  var LEVELS = ['大凶', '凶', '平', '吉', '大吉'];
  var LEVEL_IDX = { 大凶: 1, 凶: 2, 平: 3, 吉: 4, 大吉: 5 };
  var LEVEL_DOWN = { 大吉: '吉', 吉: '平', 平: '凶', 凶: '大凶', 大凶: '大凶' };
  var ZHI_XING_LEVEL = { 建: -1, 满: -1, 平: -1, 收: -1, 除: 1, 危: 1, 定: 1, 执: 1, 成: 2, 开: 2, 闭: -2, 破: -2 };
  var ZHI_XING_NOTE = {
    建: '建日：万物生育，宜出行求财，忌动土开仓',
    除: '除日：除旧布新，宜治病扫舍，忌求财',
    满: '满日：丰收之象，宜祈福结亲，忌服药栽种',
    平: '平日：平常之日，宜修饰垣墙，忌大事',
    定: '定日：安定之象，宜订盟安床，忌诉讼出行',
    执: '执日：操持之象，宜捕捉造屋，忌开市移徙',
    破: '破日：大耗之象，诸事不宜，最忌嫁娶开市',
    危: '危日：危险之象，宜安床祭祀，忌登高行船',
    成: '成日：成就之象，万事皆宜，尤宜开市嫁娶',
    收: '收日：收成之象，宜纳财进人口，忌出行',
    开: '开日：开通之象，万事皆宜，尤宜开市出行',
    闭: '闭日：闭塞之象，宜筑堤修坟，忌开市出行'
  };
  var HOUR_RANGES = [
    ['子', 0, 1], ['丑', 1, 3], ['寅', 3, 5], ['卯', 5, 7], ['辰', 7, 9], ['巳', 9, 11],
    ['午', 11, 13], ['未', 13, 15], ['申', 15, 17], ['酉', 17, 19], ['戌', 19, 21], ['亥', 21, 23]
  ];
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* 吉凶细分：把五档再按"力度"切三档（大/中/小）
   * 依据：①大吉/大凶本身＝大；②吉/凶按该日的合计强度与是否叠加个人不利项再分；
   * 平＝不带方向，不细分。这样"吉·大"和"吉·小"能区分出差别。 */
  function gradeOf(level, sum) {
    if (level === '大吉' || level === '大凶') return { grade: '大', text: level === '大吉' ? '吉·大' : '凶·大' };
    if (level === '吉') {
      if (sum >= 7) return { grade: '大', text: '吉·大' };
      if (sum >= 3) return { grade: '中', text: '吉·中' };
      return { grade: '小', text: '吉·小' };
    }
    if (level === '凶') {
      if (sum <= -7) return { grade: '大', text: '凶·大' };
      if (sum <= -3) return { grade: '中', text: '凶·中' };
      return { grade: '小', text: '凶·小' };
    }
    return { grade: '', text: '平' };
  }
  function r1(v) { return Math.round(v * 10) / 10; }

  function prep(birth) {
    if (!birth || !birth.y) return null;
    try {
      var opt = { y: +birth.y, m: +birth.m, d: +birth.d, gender: (birth.gender === 0 || birth.gender === '0') ? 0 : 1 };
      // 支持农历输入：转成公历再排盘
      if (birth.calendar === 'lunar') { opt.calendar = 'lunar'; opt.leap = !!birth.leap; }
      if (birth.h !== undefined && birth.h !== null && birth.h !== '') { opt.h = +birth.h; opt.mi = +birth.mi || 0; }
      var br = BZ.paipan(opt);
      return {
        ok: true, dayMaster: br.dayMaster.gan + br.dayMaster.wuXing, meGan: br.dayMaster.gan,
        meWx: br.dayMaster.wuXing, myZhi: br.pillars[2].zhi, myYearZhi: br.pillars[0].zhi, myMonthZhi: br.pillars[1].zhi,
        // 【2026-10-20 第三方复核修复】补 myHourZhi —— 原来缺这个字段，导致日层「伏吟时支」永远触发不了
        myHourZhi: br.pillars[3].zhi,
        yongShen: (br.strength.yongHint.favor || []).slice(), strength: br.strength,
        pillars: br.pillars.map(function (p) { return p.ganZhi; }),
        hourKnown: br.hourKnown, name: br.name, genderText: br.genderText, lunarText: br.lunar.text,
        solarYmd: br.solar.ymd, calendarText: birth.calendar === 'lunar' ? '农历' : '公历'
      };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  function dayCore(y, m, d) {
    var solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
    var lunar = solar.getLunar();
    return {
      solar: solar, lunar: lunar,
      info: {
        dayGZ: lunar.getDayInGanZhi(), dayGan: lunar.getDayGan(), dayZhi: lunar.getDayZhi(),
        yearGZ: lunar.getYearInGanZhi(), monthGZ: lunar.getMonthInGanZhi(), xunKong: lunar.getDayXunKong(),
        tianShen: lunar.getDayTianShen(), tianShenType: lunar.getDayTianShenType(), tianShenLuck: lunar.getDayTianShenLuck(),
        zhiXing: lunar.getZhiXing(), sha: lunar.getSha(),
        jiShen: lunar.getDayJiShen() || [], xiongSha: lunar.getDayXiongSha() || [],
        yi: lunar.getDayYi() || [], ji: lunar.getDayJi() || [],
        lunarText: lunar.toString(), week: solar.getWeekInChinese(), jieQi: lunar.getJieQi()
      }
    };
  }

  /* ---------- 判档（规则式，与抽卡同一套口径） ---------- */
  function judgeDay(info, me) {
    var huang = info.tianShenType === '黄道';
    var zx = info.zhiXing;
    var zxLv = ZHI_XING_LEVEL[zx]; if (zxLv === undefined) zxLv = 0;
    var ji = info.jiShen.length, xiong = info.xiongSha.length;
    var strongGood = (zx === '成' || zx === '开');
    var strongBad = (zx === '破' || zx === '闭');
    var level, rule;
    /* 判档：按「四项吉凶计数」定档（传统择日就是多项共振才成极端）
     * 四项：①值神黄道/黑道 ②建除（成开为吉 / 闭破为凶） ③吉煞差值≥3 ④吉神≥5 或 凶煞≥6
     * net = 吉项数 − 凶项数，范围 -4 ~ +4
     * 大吉只留 net=+4（一年约 6%），大凶只留 net=-4（一年约 2~3%）——极端档必须四项全共振。 */
    var net = 0, goodItems = [], badItems = [];
    if (huang) { net++; goodItems.push('值神「' + info.tianShen + '」黄道'); }
    else { net--; badItems.push('值神「' + info.tianShen + '」黑道'); }
    if (strongGood) { net++; goodItems.push('建除「' + zx + '」成开'); }
    else if (strongBad) { net--; badItems.push('建除「' + zx + '」闭破'); }
    if ((ji - xiong) >= 3) { net++; goodItems.push('吉神(' + ji + ')明显多于凶煞(' + xiong + ')'); }
    else if ((xiong - ji) >= 3) { net--; badItems.push('凶煞(' + xiong + ')明显多于吉神(' + ji + ')'); }
    if (ji >= 5) { net++; goodItems.push('吉神达 ' + ji + ' 位'); }
    else if (xiong >= 6) { net--; badItems.push('凶煞达 ' + xiong + ' 位'); }

    if (net >= 4) {
      level = '大吉'; rule = '四项俱吉：' + goodItems.join(' ＋ ');
    } else if (net === 3) {
      level = '吉'; rule = '三项偏吉（差一项未到"全吉"）：' + goodItems.join(' ＋ ') + (badItems.length ? '；另有 ' + badItems.join('、') : '');
    } else if (net === 2) {
      level = '吉'; rule = '偏吉：' + goodItems.join(' ＋ ') + (badItems.length ? '；但 ' + badItems.join('、') : '');
    } else if (net === 1) {
      level = '平'; rule = '略偏吉但未成局，仍作平看：' + goodItems.join(' ＋ ') + (badItems.length ? '；另有 ' + badItems.join('、') : '');
    } else if (net === 0) {
      level = '平'; rule = '吉凶相抵，属平常日：' + goodItems.concat(badItems).join(' ＋ ');
    } else if (net === -1) {
      level = '平'; rule = '略偏凶但未成局：' + badItems.join(' ＋ ') + (goodItems.length ? '；尚有 ' + goodItems.join('、') : '');
    } else if (net === -2) {
      level = '凶'; rule = '偏凶：' + badItems.join(' ＋ ') + (goodItems.length ? '；仅 ' + goodItems.join('、') : '');
    } else if (net === -3) {
      level = '凶'; rule = '三项偏凶（差一项未到"全凶"）：' + badItems.join(' ＋ ') + (goodItems.length ? '；另有 ' + goodItems.join('、') : '');
    } else {
      level = '大凶'; rule = '四项俱凶：' + badItems.join(' ＋ ');
    }
    var baseLevel = level;
    // 个人：日辰冲命（仅作说明，实际扣分在 buildIndicators）
    if (me && D.ZHI_CHONG[info.dayZhi] === me.myZhi) {
      level = LEVEL_DOWN[level];
      rule += '；日辰「' + info.dayZhi + '」冲你日支「' + me.myZhi + '」（分数已扣）';
    }
    return { level: level, baseLevel: baseLevel, adjusted: level !== baseLevel, rule: rule };
  }

  /* ---------- 逐条依据（含计分，气势分用） ---------- */
  /* 分数 → 档位：档位必须与气势分一致，否则会出现「12 分判平」这种自相矛盾。
   * 阈值按 365 天分位定（大吉≈5% / 吉≈25% / 平≈40% / 凶≈25% / 大凶≈5%）。 */
  function levelByScore(score) {
    // 【2026-10-20 方案B·分位档】日层单独一套阈值——日层分数整体高于时辰层
    //   （日层指标少、无「冲日支 −6」那种重罚，中位数 50 vs 时辰层 44）
    // 目标：大吉5% / 吉20% / 平40% / 凶20% / 大凶15%
    // 【2026-10-20 二次校准】日层计分项与抽卡对齐后，分布也变了（p95=69 p75=58 p35=40 p15=28）
    // 365 天网格搜索最优；实际分布 6.0% / 20.5% / 40.5% / 19.2% / 13.7%
    if (score >= 69) return '大吉';
    if (score >= 58) return '吉';
    if (score >= 40) return '平';
    if (score >= 28) return '凶';
    return '大凶';
  }

  function buildIndicators(info, me) {
    var parts = [];
    var huang = info.tianShenType === '黄道';
    parts.push({ name: '值神（黄道/黑道）', value: info.tianShen + '·' + info.tianShenType, pts: huang ? 3 : -3,
      doctrine: '十二值神：青龙明堂金匮天德玉堂司命为黄道，余六为黑道' });
    var zxLv = ZHI_XING_LEVEL[info.zhiXing] || 0;
    parts.push({ name: '建除十二神', value: info.zhiXing + '日', pts: zxLv, doctrine: '「建满平收黑，除危定执黄，成开皆可用，闭破不相当」' });
    var jp = info.jiShen.length > info.xiongSha.length ? 2 : (info.jiShen.length === info.xiongSha.length ? 0 : -2);
    parts.push({ name: '吉神／凶煞', value: '吉神 ' + info.jiShen.length + ' · 凶煞 ' + info.xiongSha.length, pts: jp, doctrine: '吉神多则吉，凶煞多则凶' });
    if (me) {
      var ss = BZ.shiShen(me.meGan, info.dayGan);
      // 个人项权重要足够大，否则同一天所有人被共同项（值神/建除/吉煞）拉成同一档
      var ssPts = { 正印: 3, 偏印: 2, 食神: 2, 比肩: 1, 劫财: 0, 正财: 0, 偏财: 0, 伤官: -1, 正官: -2, 七杀: -3 }[ss] || 0;
      parts.push({ name: '日干十神（对你）', value: ss, pts: ssPts, doctrine: '印、食、比为助；官杀为压；财看身强弱' });
      // 【2026-10-20 第三方复核修复】「今日之气」改为与抽卡引擎一致的「日支藏干加权」。
      //   原来用日干五行（甲=木→−3）与抽卡的藏干加权（戌藏戊辛丁→+2.4）口径不同，
      //   两个模块算的是两件不同的事却共用同一个项目名 → 同一天两处给出不同分数。
      //   日干十神那条已经覆盖「日干对日主」的判断，此处应判「日支之气」。
      (function () {
        var dz = info.dayZhi;
        var hides = D.ZHI_HIDE[dz] || [D.ZHI_WX[dz]];
        var HW = hides.length === 1 ? [1.0] : (hides.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1]);
        var wxs = 0, det = [];
        hides.forEach(function (g, gi) {
          var gw = D.GAN_WX[g], ww = HW[gi] !== undefined ? HW[gi] : 0.1;
          var fav = me.yongShen.indexOf(gw) >= 0;
          wxs += (fav ? ww : -ww);
          det.push(g + gw + (fav ? '喜' : '忌') + ww);
        });
        var pts = +(wxs * 3).toFixed(1);
        parts.push({ name: '今日日支藏干（对你）', value: '「' + dz + '」藏 ' + det.join(' / '), pts: pts,
          doctrine: '地支藏干加权（本气0.6/中气0.3/余气0.1），与抽卡引擎同口径' });
      })();
      // 【2026-10-20 第三方复核修复】日支与命局四支关系改为「冲/刑/害/破/合/伏吟」全覆盖。
      //   原来只判冲和合 → 抽卡引擎升级后两处口径不同，同一天给出不同档位。
      //   权重与抽卡引擎完全一致：烈度(冲6/刑3/害2/破1/合2/伏吟1.5) × 宫位系数(日1.0/月0.6/时0.5/年0.4)
      (function () {
        var POS = { day: me.myZhi, month: me.myMonthZhi, hour: me.myHourZhi, year: me.myYearZhi };
        var POS_NAME = { year: '年支', month: '月支', day: '日支', hour: '时支' };
        var POS_COEF = { day: 1.0, month: 0.6, hour: 0.5, year: 0.4 };
        var LEV = { chong: 6, xing: 3, hai: 2, po: 1, he: 2, fuyin: 1.5 };
        var REL_CN = { chong: '冲', xing: '刑', hai: '害', po: '破', he: '合', fuyin: '伏吟' };
        var dz = info.dayZhi;
        // 天乙贵人落宫（按日干查：甲戊庚→丑未；乙己→子申；丙丁→亥酉；壬癸→巳卯；辛→午寅）
        var TB = { 甲: ['丑','未'], 戊: ['丑','未'], 庚: ['丑','未'], 乙: ['子','申'], 己: ['子','申'],
                   丙: ['亥','酉'], 丁: ['亥','酉'], 壬: ['巳','卯'], 癸: ['巳','卯'], 辛: ['午','寅'] };
        var guirenZhis = TB[me.meGan] || [];
        var guirenUsed = {};
        function hasXing(z, t) { return D.ZHI_XING && (D.ZHI_XING[z] || []).indexOf(t) >= 0; }
        ['day', 'month', 'hour', 'year'].forEach(function (pk) {
          var tgt = POS[pk];
          if (!tgt) return;
          var cands = [];
          if (D.ZHI_CHONG[dz] === tgt) cands.push('chong');
          if (hasXing(dz, tgt)) cands.push('xing');
          if (D.ZHI_HAI && D.ZHI_HAI[dz] === tgt) cands.push('hai');
          if (D.ZHI_PO && D.ZHI_PO[dz] === tgt) cands.push('po');
          if (D.ZHI_HE[dz] === tgt) cands.push('he');
          if (dz === tgt) cands.push('fuyin');
          if (!cands.length) return;
          cands.sort(function (a, b) { return LEV[b] - LEV[a]; });
          var rel = cands[0];
          var coex = cands.length > 1 ? '（与' + cands.slice(1).map(function (c) { return REL_CN[c]; }).join('、') + '并见，取重者）' : '';
          var pts;
          if (rel === 'chong' || rel === 'xing' || rel === 'hai' || rel === 'po') {
            pts = -(LEV[rel] * POS_COEF[pk]);
          } else if (rel === 'he') {
            pts = LEV.he * POS_COEF[pk];
          } else {
            // 【2026-10-20 第三方复核修复】去重铁律 B：日支与目标支同字且该字为天乙贵人宫时，
            // 「当日日支坐贵人 +3」已覆盖宫位级，伏吟不再另计（与抽卡引擎一致）
            if (guirenZhis.indexOf(dz) >= 0 && dz === tgt) { pts = 0; return; }
            var fw = D.ZHI_WX[dz];
            pts = (LEV.fuyin * POS_COEF[pk]) * (me.yongShen.indexOf(fw) >= 0 ? 1 : -1);
          }
          pts = +pts.toFixed(1);
          // 【2026-10-20 第三方复核修复】补「合到天乙贵人宫」宫位级 +3（与抽卡引擎一致）
          var posBonus = 0;
          if (rel === 'he' && guirenZhis.indexOf(tgt) >= 0 && !guirenUsed[tgt]) {
            guirenUsed[tgt] = true;
            posBonus = 3;
            parts.push({ name: '合到天乙贵人宫「' + tgt + '」', value: '宫位级', pts: 3,
              doctrine: '宫位级：合到贵人宫本身即为得助，与被合宫位互为独立事实' });
          }
          // 命中贵人宫时，「有合」的关系分不再叠加（与抽卡一致）
          if (posBonus > 0) pts = 0;
          if (Math.abs(pts) < 0.05) return;
          parts.push({ name: REL_CN[rel] + POS_NAME[pk] + '「' + tgt + '」', value: coex || REL_CN[rel], pts: pts,
            doctrine: '与抽卡引擎同一矩阵：烈度×宫位系数；冲刑害破恒负，合/伏吟按五行喜忌' });
        });
        // 【2026-10-20 第三方复核修复】当日日支本身坐天乙贵人宫 → 宫位级 +3（与抽卡一致）
        if (guirenZhis.indexOf(dz) >= 0 && !guirenUsed[dz]) {
          guirenUsed[dz] = true;
          parts.push({ name: '当日日支坐贵人', value: '「' + dz + '」即天乙贵人本气', pts: 3,
            doctrine: '宫位级：日支落贵人宫' });
        }
      })();
      // 旬空
      if (info.xunKong && info.xunKong.indexOf(info.dayZhi) >= 0) parts.push({ name: '旬空', value: '日支落空亡（' + info.xunKong + '）', pts: -1, doctrine: '空亡之日诸事易落空、不宜签约' });
    }
    var sum = Math.round(parts.reduce(function (a, p) { return a + p.pts; }, 0) * 10) / 10;
    return { parts: parts, sum: sum, score: Math.round(clamp(50 + sum * 3.0, 0, 100)) };
  }

  /* ---------- 十二时辰吉凶 ---------- */
  function hourAdvice(y, m, d, me) {
    var rows = HOUR_RANGES.map(function (hr) {
      // 取该时辰中点取样（子时 00:30、丑时 02:00…），避免踩到交界
      var midH = hr[1] === 0 ? 0 : hr[1];
      var solar = Solar.fromYmdHms(y, m, d, midH, 30, 0);
      var lunar = solar.getLunar();
      var ts = lunar.getTimeTianShen ? lunar.getTimeTianShen() : '';
      var tst = lunar.getTimeTianShenType ? lunar.getTimeTianShenType() : '';
      var huang = tst === '黄道';
      var startH = hr[1], endH = (hr[1] + 2) % 24;
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      // 时辰内再分优劣：时支冲我日支 −15、六合 +10、冲我年/月支 −5
      var hp = huang ? 70 : 30;
      var hChong = me && D.ZHI_CHONG[hr[0]] === me.myZhi;
      var hHe = me && D.ZHI_HE[hr[0]] === me.myZhi;
      if (me) {
        if (hChong) hp -= 15;
        if (hHe) hp += 10;
        if (D.ZHI_CHONG[hr[0]] === me.myYearZhi || D.ZHI_CHONG[hr[0]] === me.myMonthZhi) hp -= 5;
        if (me.yongShen.indexOf(D.ZHI_WX[hr[0]]) >= 0) hp += 5;
      }
      return { zhi: hr[0], range: pad(startH) + ':00-' + pad(endH) + ':00', start: startH, end: endH,
               tianShen: ts, type: tst, luck: huang ? '吉' : '凶', score: Math.round(clamp(hp, 0, 100)), huang: huang,
               note: (hChong ? '冲你日支' : hHe ? '合你日支' : '') };
    });
    var best = rows.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var worst = rows.slice().sort(function (a, b) { return a.score - b.score; })[0];
    return { rows: rows, best: best, worst: worst, bestHours: rows.filter(function (r) { return r.huang; }).map(function (r) { return r.zhi + '时'; }) };
  }

  /* ---------- 主入口 ---------- */
  function daily(opt) {
    opt = opt || {};
    var me = opt.me || prep(opt.birth);   // 批量算时可传入已排好的命盘，避免重复排盘
    if (!me || !me.ok) return { ok: false, error: (me && me.error) || '请先填出生日期' };
    var y = +opt.y, m = +opt.m, d = +opt.d;
    if (!y || !m || !d) return { ok: false, error: '请选择要看的日期' };
    var core = dayCore(y, m, d);
    var info = core.info;
    var ind = buildIndicators(info, me);
    var judgeRule = judgeDay(info, me);            // 规则判档（只取 rule 文字作依据）
    var levelBySc = levelByScore(ind.score);        // 真正的档位由分数定，保证与气势分一致
    var judge = {
      level: levelBySc,
      baseLevel: levelBySc,
      adjusted: false,                              // 档位由分数决定；冲命影响已体现为分数扣减（下面 notes 会说明）
      rule: judgeRule.rule
    };
    var hours = hourAdvice(y, m, d, me);

    // 宜忌：黄历原有 + 个人修正
    var yi = info.yi.slice(0, 6), ji = info.ji.slice(0, 6);
    var notes = [];
    if (D.ZHI_CHONG[info.dayZhi] === me.myZhi) notes.push('今日冲你的日支「' + me.myZhi + '」：容易急躁、易出意外，重要决定缓一缓。');
    if (me.yongShen.indexOf(D.GAN_WX[info.dayGan]) >= 0) notes.push('今日之气正是你的喜用（' + me.yongShen.join('、') + '）：天时助你，适合推进要紧事。');
    else if (me.yongShen.length) notes.push('今日之气不在你的喜用（' + me.yongShen.join('、') + '）：做事容易费力，宜守不宜攻。');
    if (judge.adjusted) notes.push('这天日辰冲你的日支「' + me.myZhi + '」，分数已按"冲命"扣分（当日运势比不冲时更低）。');
    if (!me.hourKnown) notes.push('你没填出生时间，所以只按年月日三柱比对（时柱不参与），结论略粗一点。');

    return {
      ok: true, date: { y: y, m: m, d: d, text: core.solar.toYmd(), week: info.week, lunar: info.lunarText, jieQi: info.jieQi || null },
      me: { name: me.name, dayMaster: me.dayMaster, pillars: me.pillars, yongShen: me.yongShen, hourKnown: me.hourKnown },
      day: { ganZhi: info.dayGZ, gan: info.dayGan, zhi: info.dayZhi, tianShen: info.tianShen, tianShenType: info.tianShenType,
             zhiXing: info.zhiXing, zhiXingNote: ZHI_XING_NOTE[info.zhiXing] || '', sha: info.sha,
             jiShen: info.jiShen, xiongSha: info.xiongSha, xunKong: info.xunKong },
      level: judge.level, levelIdx: LEVEL_IDX[judge.level], baseLevel: judge.baseLevel, adjusted: judge.adjusted, rule: judge.rule,
      grade: gradeOf(judge.level, ind.sum),
      score: ind.score, sum: ind.sum, parts: ind.parts,
      yi: yi, ji: ji, notes: notes,
      hours: hours,
      formula: '气势分 = 50 ＋ 各项合计 ' + (ind.sum >= 0 ? '+' : '') + ind.sum + ' × 3.0，映射到 0~100（仅展示，判档不用分数）',
      disclaimer: '择日看的是"日子本身的气"，不是命运判决；同一件事不同人做，结果也不同。'
    };
  }

  function report(r) {
    if (!r.ok) return '算不出来：' + r.error;
    var L = [];
    L.push('【当日运势】' + r.date.text + '（' + r.date.week + '）　' + r.date.lunar);
    L.push('命主：' + (r.me.name || '—') + '　日主 ' + r.me.dayMaster + '　喜用 ' + (r.me.yongShen.join('、') || '—'));
    L.push('今日干支：' + r.day.ganZhi + '　值神 ' + r.day.tianShen + '（' + r.day.tianShenType + '）　建除 ' + r.day.zhiXing + '日');
    L.push('');
    L.push('判档：' + r.level + (r.adjusted ? '（原判 ' + r.baseLevel + '，因冲命降档）' : '') + '　气势分 ' + r.score);
    L.push('依据：' + r.rule);
    L.push('');
    L.push('逐条：');
    r.parts.forEach(function (p) { L.push('  ' + (p.pts >= 0 ? '+' : '') + p.pts + '　' + p.name + '：' + p.value); });
    L.push('');
    if (r.yi.length) L.push('宜：' + r.yi.join('、'));
    if (r.ji.length) L.push('忌：' + r.ji.join('、'));
    if (r.notes.length) { L.push(''); r.notes.forEach(function (n) { L.push('· ' + n); }); }
    L.push('');
    L.push('吉时：' + r.hours.bestHours.join('、') + '（最好 ' + r.hours.best.zhi + '时 ' + r.hours.best.range + '，最差 ' + r.hours.worst.zhi + '时 ' + r.hours.worst.range + '）');
    L.push('');
    L.push(r.disclaimer);
    return L.join('\n');
  }

  // 纯规则判档（不掺个人命盘），供抽卡引擎复用，保证两个模块口径一致
  function judgePure(info) {
    var j = judgeDay(info, null);
    return { level: j.level, baseLevel: j.baseLevel, adjusted: j.adjusted, rule: j.rule };
  }

  return { daily: daily, report: report, prep: prep, judgePure: judgePure, levelByScore: levelByScore,
           LEVELS: LEVELS, LEVEL_IDX: LEVEL_IDX, HOUR_RANGES: HOUR_RANGES };
});
