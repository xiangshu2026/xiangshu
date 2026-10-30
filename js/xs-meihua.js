/*!
 * xs-meihua.js —— 梅花易数起卦与断卦引擎（象数工坊）
 * 起卦法：时间起卦 / 数字起卦 / 文字起卦 / 随机起卦
 * 复盘：本卦、互卦、变卦、体用、五行生克、月令旺衰、卦象类象、应期参考
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./xs-data.js'), require('./lunar.js')); }
  else { root.XS = root.XS || {}; root.XS.Meihua = factory(root.XS.Data, root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, Lib) {
  'use strict';
  var Solar = Lib.Solar, Lunar = Lib.Lunar;
  var BG = D.BAGUA;

  var SEASON_WX = { 春:'木', 夏:'火', 秋:'金', 冬:'水', 四季:'土' };
  var ZHI_SEASON = { 寅:'春',卯:'春',辰:'四季',巳:'夏',午:'夏',未:'四季',申:'秋',酉:'秋',戌:'四季',亥:'冬',子:'冬',丑:'四季' };
  // 旺相休囚死：以月令五行为准
  function wangShuai(monthWx, wx) {
    if (monthWx === wx) return '旺';
    if (D.WX_SHENG[monthWx] === wx) return '相';
    if (D.WX_SHENG[wx] === monthWx) return '休';
    if (D.WX_KE[wx] === monthWx) return '囚';
    if (D.WX_KE[monthWx] === wx) return '死';
    return '';
  }

  function mod8(n) { var r = n % 8; return r === 0 ? 8 : r; }
  function mod6(n) { var r = n % 6; return r === 0 ? 6 : r; }
  function idxOfNum(num) { for (var i = 0; i < BG.length; i++) { if (BG[i].num === num) return i; } return 7; }

  function linesOf(upperIdx, lowerIdx) {
    return BG[lowerIdx].lines.concat(BG[upperIdx].lines); // 自下而上 1-6 爻
  }
  function buildGua(upperIdx, lowerIdx, movingLine) {
    var lines = linesOf(upperIdx, lowerIdx);
    var name = D.HEX_NAMES[upperIdx][lowerIdx];
    // 互卦：下互=2,3,4爻；上互=3,4,5爻
    var huLower = D.baguaByLines([lines[1], lines[2], lines[3]]);
    var huUpper = D.baguaByLines([lines[2], lines[3], lines[4]]);
    var bianLines = lines.slice();
    bianLines[movingLine - 1] = bianLines[movingLine - 1] ? 0 : 1;
    var bLower = D.baguaByLines([bianLines[0], bianLines[1], bianLines[2]]);
    var bUpper = D.baguaByLines([bianLines[3], bianLines[4], bianLines[5]]);
    // 互卦六爻（自下而上）：下互取 2·3·4 爻，上互取 3·4·5 爻
    var huLines = [lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]];
    return {
      name: name, meaning: D.HEX_MEANING[name] || '',
      upper: BG[upperIdx], lower: BG[lowerIdx], upperIdx: upperIdx, lowerIdx: lowerIdx,
      lines: lines, movingLine: movingLine,
      symbols: BG[lowerIdx].symbol + BG[upperIdx].symbol,
      hu: { name: D.HEX_NAMES[BG.indexOf(huUpper)][BG.indexOf(huLower)], upper: huUpper, lower: huLower,
            lines: huLines, symbols: huLower.symbol + huUpper.symbol,
            meaning: D.HEX_MEANING[D.HEX_NAMES[BG.indexOf(huUpper)][BG.indexOf(huLower)]] || '' },
      bian: { name: D.HEX_NAMES[BG.indexOf(bUpper)][BG.indexOf(bLower)], upper: bUpper, lower: bLower,
              lines: bianLines, symbols: bLower.symbol + bUpper.symbol,
              meaning: D.HEX_MEANING[D.HEX_NAMES[BG.indexOf(bUpper)][BG.indexOf(bLower)]] || '' }
    };
  }

  // 动爻 1-3 在下卦（用卦为下卦，体卦为上卦）；4-6 在上卦
  function tiYongOf(g) {
    var inLower = g.movingLine <= 3;
    return {
      yong: inLower ? g.lower : g.upper,
      ti: inLower ? g.upper : g.lower,
      yongPos: inLower ? '下卦' : '上卦',
      tiPos: inLower ? '上卦' : '下卦'
    };
  }
  // 变卦中「用卦」变出的新卦
  function bianYongOf(g) {
    return g.movingLine <= 3 ? g.bian.lower : g.bian.upper;
  }
  // 体用生克判语
  function tiYongJudge(ti, yong) {
    var a = ti.wx, b = yong.wx;
    if (a === b) return { rel:'比和', level:'吉', text:'体用比和，五行同气，事多顺遂、谋为可成。' };
    if (D.WX_SHENG[b] === a) return { rel:'用生体', level:'大吉', text:'用卦生体卦，得外助、有生养之力，凡事顺遂，多有人相帮。' };
    if (D.WX_KE[a] === b) return { rel:'体克用', level:'吉', text:'体卦克用卦，我能制彼，事在掌握之中，惟须费些力气，终可成。' };
    if (D.WX_SHENG[a] === b) return { rel:'体生用', level:'小凶', text:'体卦生用卦，为泄气之象，耗财费力、为人作嫁，宜量力而行。' };
    if (D.WX_KE[b] === a) return { rel:'用克体', level:'凶', text:'用卦克体卦，受制于外，主阻滞、忧疑、被人牵制，所谋多阻。' };
    return { rel:'', level:'中', text:'' };
  }

  /* ---------------- 综合断档（七档） ----------------
   * 梅花易数正统断法不是只看体用生克，而是「体用 + 月令 + 互卦 + 变卦」四层叠加。
   * 只凭体用会大量落"吉/中"，看起来结论都一样——所以这里做加权综合。 */
  var LEVEL_ORDER = ['大凶', '凶', '小凶', '中平', '小吉', '吉', '大吉'];
  var REL_BASE = { '用生体': 3, '比和': 1.5, '体克用': 1, '体生用': -1.5, '用克体': -3 };
  var WS_PTS = { '旺': 2, '相': 1.2, '休': 0, '囚': -1.2, '死': -2 };

  function levelFromScore(s) {
    if (s >= 8.5) return '大吉';
    if (s >= 5.5) return '吉';
    if (s >= 2.5) return '小吉';
    if (s >= -2.0) return '中平';
    if (s >= -4.5) return '小凶';
    if (s >= -7.5) return '凶';
    return '大凶';
  }

  function comboJudge(ty, judgeBase, judgeBian, ws, huRel) {
    var parts = [], sum = 0;
    // ① 体用生克（权重最大）
    var rb = REL_BASE[judgeBase.rel];
    if (rb === undefined) rb = 0;
    sum += rb * 2;
    parts.push({ name: '体用生克', value: judgeBase.rel, pts: +(rb * 2).toFixed(1), why: judgeBase.text });
    // ② 月令旺衰（体卦得时则加分）
    if (ws) {
      var wp = WS_PTS[ws.ti] || 0;
      sum += wp;
      parts.push({ name: '体卦月令', value: ws.ti + '（' + ws.monthZhi + '月·' + ws.monthWx + '当令）', pts: +wp.toFixed(1),
        why: ({ '旺':'体卦得时令之助，气势最足', '相':'体卦次旺，也算有力', '休':'体卦不旺不衰，全看自己使劲', '囚':'体卦被时令压着，有力使不出', '死':'体卦受时令所克，硬来更累' })[ws.ti] || '' });
    }
    // ③ 互卦（过程）
    if (huRel) {
      // 兼容两种写法：'用生体' 全称 或 '生'/'克'/'比和' 简写
      // 兼容各种写法：'用生体'/'生'/'被生'，'用克体'/'克'/'被克'，'比和'
      var huNorm = huRel;
      var HU_MAP = {
        '生': '用生体', '被生': '用生体', '生我': '用生体', '来生': '用生体',
        '克': '用克体', '被克': '用克体', '克我': '用克体', '来克': '用克体',
        '比和': '比和', '同': '比和',
        '我生': '体生用', '我去生': '体生用',
        '我克': '体克用', '我去克': '体克用'
      };
      if (HU_MAP[huRel]) huNorm = HU_MAP[huRel];
      var hp = ({ '用生体': 1.2, '比和': 0.6, '体克用': 0.4, '体生用': -0.6, '用克体': -1.2 })[huNorm] || 0;
      sum += hp;
      parts.push({ name: '互卦（过程）', value: huNorm + '（原判：' + huRel + '）', pts: +hp.toFixed(1),
        why: hp > 0 ? '过程对你有利，中间会顺' : (hp < 0 ? '过程中会有波折、耗力' : '过程平平') });
    }
    // ④ 变卦（结果）
    var bb = REL_BASE[judgeBian.rel];
    if (bb === undefined) bb = 0;
    var bp = bb * 1.4;
    sum += bp;
    parts.push({ name: '变卦（结果）', value: judgeBian.rel, pts: +bp.toFixed(1), why: judgeBian.text });

    var level = levelFromScore(sum);
    return { level: level, sum: +sum.toFixed(1), parts: parts };
  }

  /* ---------------- 各类起卦法 ---------------- */
  function timeQiGua(opt) {
    var solar = Solar.fromYmdHms(+opt.y, +opt.m, +opt.d, +opt.h || 0, +opt.mi || 0, 0);
    var lunar = solar.getLunar();
    var yearZhiNum = lunar.getYearZhiIndex() + 1;     // 子=1 ... 亥=12
    var monthNum = Math.abs(lunar.getMonth());
    var dayNum = lunar.getDay();
    var timeZhiNum = lunar.getTimeZhiIndex() + 1;
    var s1 = yearZhiNum + monthNum + dayNum;
    var s2 = s1 + timeZhiNum;
    var upperNum = mod8(s1), lowerNum = mod8(s2), moving = mod6(s2);
    return {
      method: 'time',
      methodText: '时间起卦（农历）',
      calc: [
        '年支数 ' + yearZhiNum + '（' + lunar.getYearZhi() + '）＋农历月 ' + monthNum + '＋日 ' + dayNum + ' = ' + s1 + ' ÷ 8 余 ' + (s1 % 8),
        '加时支数 ' + timeZhiNum + '（' + lunar.getTimeZhi() + '）共 ' + s2 + ' ÷ 8 余 ' + (s2 % 8) + '，÷ 6 余 ' + (s2 % 6)
      ],
      upperNum: upperNum, lowerNum: lowerNum, moving: moving,
      lunarText: lunar.toString(), lunarDetail: lunar.getYearInGanZhi() + '年 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' ' + lunar.getTimeZhi() + '时',
      solarText: solar.toYmdHms()
    };
  }
  function numberQiGua(opt) {
    var n1 = Math.abs(parseInt(opt.n1, 10) || 0), n2 = Math.abs(parseInt(opt.n2, 10) || 0);
    var n3 = (opt.n3 === undefined || opt.n3 === null || opt.n3 === '') ? null : Math.abs(parseInt(opt.n3, 10) || 0);
    var upperNum = mod8(n1), lowerNum = mod8(n2);
    var moving = (n3 === null) ? mod6(n1 + n2) : mod6(n3);
    return {
      method: 'numbers', methodText: n3 === null ? '数字起卦（两数）' : '数字起卦（三数）',
      calc: [
        '上卦：' + n1 + ' ÷ 8 余 ' + (n1 % 8) + ' → ' + BG[idxOfNum(upperNum)].name,
        '下卦：' + n2 + ' ÷ 8 余 ' + (n2 % 8) + ' → ' + BG[idxOfNum(lowerNum)].name,
        n3 === null ? ('动爻：(' + n1 + '+' + n2 + ')=' + (n1 + n2) + ' ÷ 6 余 ' + ((n1 + n2) % 6))
                    : ('动爻：' + n3 + ' ÷ 6 余 ' + (n3 % 6))
      ],
      upperNum: upperNum, lowerNum: lowerNum, moving: moving
    };
  }
  function textQiGua(opt) {
    var raw = String(opt.text || '');
    var chars = raw.replace(/\s/g, '').split('');
    var total = chars.length;
    if (total < 2) return { error: '文字起卦至少需要 2 个字' };
    var half = Math.floor(total / 2);
    var n1 = half, n2 = total - half;
    var upperNum = mod8(n1), lowerNum = mod8(n2), moving = mod6(total);
    return {
      method: 'text', methodText: '文字起卦（字数）', text: raw,
      calc: [
        '取字 ' + total + ' 个，前半 ' + n1 + ' 字 ÷ 8 余 ' + (n1 % 8) + ' → 上卦',
        '后半 ' + n2 + ' 字 ÷ 8 余 ' + (n2 % 8) + ' → 下卦',
        '总字数 ' + total + ' ÷ 6 余 ' + (total % 6) + ' → 动爻'
      ],
      upperNum: upperNum, lowerNum: lowerNum, moving: moving
    };
  }
  function randomQiGua() {
    var rnd = function (max) {
      var g = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues)
        ? (function () { var a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 4294967296; })()
        : Math.random();
      return Math.floor(g * max) + 1;
    };
    var n1 = rnd(100), n2 = rnd(100), n3 = rnd(100);
    var r = numberQiGua({ n1: n1, n2: n2, n3: n3 });
    r.method = 'random'; r.methodText = '随机起卦';
    r.calc = ['随机数 ' + n1 + ' / ' + n2 + ' / ' + n3].concat(r.calc);
    return r;
  }

  /* ---------------- 主分析 ---------------- */
  function analyze(q, ctx) {
    if (q.error) return { ok: false, error: q.error };
    var upperIdx = idxOfNum(q.upperNum), lowerIdx = idxOfNum(q.lowerNum);
    var g = buildGua(upperIdx, lowerIdx, q.moving);
    var ty = tiYongOf(g);
    var judge = tiYongJudge(ty.ti, ty.yong);
    var bianYong = bianYongOf(g);
    var judgeBian = tiYongJudge(ty.ti, bianYong);
    // 互卦与体卦关系（事之中间过程）
    var huTiUsage = { hu: g.hu, rel: D.wuxingRelation(ty.ti.wx, g.hu.upper.wx === ty.ti.wx ? g.hu.lower.wx : g.hu.upper.wx) };
    // 月令旺衰
    var monthWx = null, monthZhi = null, season = null;
    if (ctx && ctx.y && ctx.m && ctx.d) {
      var lu = Solar.fromYmdHms(+ctx.y, +ctx.m, +ctx.d, +ctx.h || 0, +ctx.mi || 0, 0).getLunar();
      monthZhi = lu.getMonthZhi();
      season = ZHI_SEASON[monthZhi];
      monthWx = SEASON_WX[season];
    }
    var ws = monthWx ? {
      monthZhi: monthZhi, season: season, monthWx: monthWx,
      ti: wangShuai(monthWx, ty.ti.wx), yong: wangShuai(monthWx, ty.yong.wx),
      bian: wangShuai(monthWx, bianYong.wx),
      huUpper: wangShuai(monthWx, g.hu.upper.wx), huLower: wangShuai(monthWx, g.hu.lower.wx)
    } : null;
    // 综合断语（规则式，逐条给依据）
    var reasons = [], level = judge.level;
    reasons.push('【体用】' + ty.yongPos + '为动爻所在，故为「用」；' + ty.tiPos + '为「体」。体' + ty.ti.name + '(' + ty.ti.wx + ')，用' + ty.yong.name + '(' + ty.yong.wx + ')。');
    reasons.push('【生克】' + judge.text);
    if (ws) {
      reasons.push('【月令】起卦在' + monthZhi + '月（' + season + '），' + monthWx + '当令。体卦' + ty.ti.wx + '处「' + ws.ti + '」，用卦' + ty.yong.wx + '处「' + ws.yong + '」。'
        + (ws.ti === '旺' || ws.ti === '相' ? '体旺则我有力，事可撑得住。' : '体衰则力弱，宜借时待势。'));
    }
    reasons.push('【过程】互卦为「' + g.hu.name + '」，' + g.hu.meaning + '；中间过程多由此象体现。');
    reasons.push('【结果】' + q.moving + '爻动，用卦' + ty.yong.name + '变为' + bianYong.name + '，得「' + judgeBian.rel + '」：' + judgeBian.text);
    if (D.LIU_CHONG_GUA.indexOf(g.name) >= 0) reasons.push('【卦体】本卦属六冲卦，主事散、变动快、不易久留。');
    if (D.LIU_HE_GUA.indexOf(g.name) >= 0) reasons.push('【卦体】本卦属六合卦，主事缓而能成、彼此牵合。');
    // 综合断档（七档：体用+月令+互卦+变卦 四层加权）
    var combo = comboJudge(ty, judge, judgeBian, ws, (typeof tiYongHuRel !== 'undefined' ? tiYongHuRel : (huTiUsage && huTiUsage.rel)));
    var overallText = {
      '大吉': '大吉（事可成，且多方助你）',
      '吉': '吉（可行，顺势而为）',
      '小吉': '小吉（有戏，但要主动一点）',
      '中平': '中平（成败参半，看你怎么走）',
      '小凶': '小凶（有阻，别硬推）',
      '凶': '凶（受制明显，宜缓宜守）',
      '大凶': '大凶（阻力很大，宜止宜避）'
    }[combo.level] || '中平';
    var overall = overallText;
    return {
      ok: true,
      method: q.method, methodText: q.methodText, calc: q.calc, text: q.text,
      lunarText: q.lunarText, lunarDetail: q.lunarDetail, solarText: q.solarText,
      upperNum: q.upperNum, lowerNum: q.lowerNum, moving: q.moving,
      ben: g, hu: g.hu, bian: g.bian, tiYong: ty, judge: judge, judgeBian: judgeBian,
      wangShuai: ws, reasons: reasons, overall: overall,
      combo: combo, score: combo.sum,
      tiYongHuRel: huTiUsage.rel,
      // 取象提示
      xiangHint: [
        '体卦' + ty.ti.name + '（' + ty.ti.wx + '）：' + ty.ti.lei.join('、'),
        '用卦' + ty.yong.name + '（' + ty.yong.wx + '）：' + ty.yong.lei.join('、'),
        '变卦' + bianYong.name + '（' + bianYong.wx + '）：' + bianYong.lei.join('、')
      ],
      // 应期参考：以用卦先天数 / 体卦数为参考
      yingQi: {
        byNum: '用卦' + ty.yong.name + '先天数 ' + ty.yong.num + '，动爻第 ' + q.moving + '，可取 ' + ty.yong.num + ' 或 ' + (ty.yong.num + q.moving) + ' 为数（日/月/年视事之大小）',
        byWx: '以用卦五行取时：' + ty.yong.wx + ' 旺于' + ({ 木:'春（寅卯月）', 火:'夏（巳午月）', 金:'秋（申酉月）', 水:'冬（亥子月）', 土:'四季（辰未戌丑月）' })[ty.yong.wx] + '，事发多应于此'
      }
    };
  }

  function qiGua(opt) {
    var o = opt || {};
    var q;
    if (o.method === 'numbers') q = numberQiGua(o);
    else if (o.method === 'text') q = textQiGua(o);
    else if (o.method === 'random') q = randomQiGua();
    else q = timeQiGua(o);
    return analyze(q, o);
  }
  // 直接以卦起（已知卦象时使用）
  function fromGua(upperName, lowerName, moving) {
    var u = D.baguaByName(upperName), l = D.baguaByName(lowerName);
    return analyze({ method: 'manual', methodText: '直接取卦', calc: ['上卦 ' + upperName + '，下卦 ' + lowerName + '，第 ' + moving + ' 爻动'],
      upperNum: u.num, lowerNum: l.num, moving: moving }, null);
  }

  function report(r) {
    if (!r.ok) return '起卦失败：' + r.error;
    var L = [];
    L.push('【梅花易数】' + r.methodText);
    r.calc.forEach(function (c) { L.push('  ' + c); });
    if (r.lunarDetail) L.push('  时间：' + r.solarText + '（农历 ' + r.lunarDetail + '）');
    L.push('');
    L.push('本卦：' + r.ben.symbols + ' ' + r.ben.name + '（上' + r.ben.upper.name + '下' + r.ben.lower.name + '）' + r.ben.meaning);
    L.push('  动爻：第 ' + r.moving + ' 爻');
    L.push('互卦：' + r.hu.name + '（上' + r.hu.upper.name + '下' + r.hu.lower.name + '）' + r.hu.meaning);
    L.push('变卦：' + r.bian.name + '（上' + r.bian.upper.name + '下' + r.bian.lower.name + '）' + r.bian.meaning);
    L.push('体卦：' + r.tiYong.ti.name + '(' + r.tiYong.ti.wx + ')  用卦：' + r.tiYong.yong.name + '(' + r.tiYong.yong.wx + ')  → ' + r.judge.rel);
    if (r.wangShuai) L.push('月令：' + r.wangShuai.monthZhi + '月（' + r.wangShuai.season + '，' + r.wangShuai.monthWx + '当令）体' + r.wangShuai.ti + ' 用' + r.wangShuai.yong);
    L.push('');
    r.reasons.forEach(function (x) { L.push(x); });
    L.push('');
    L.push('综合倾向：' + r.overall);
    L.push('取象：' + r.xiangHint.join('；'));
    return L.join('\n');
  }

  return { qiGua: qiGua, fromGua: fromGua, analyze: analyze, report: report,
           timeQiGua: timeQiGua, numberQiGua: numberQiGua, textQiGua: textQiGua, randomQiGua: randomQiGua,
           wangShuai: wangShuai, tiYongJudge: tiYongJudge };
});
