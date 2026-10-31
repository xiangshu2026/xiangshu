// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-liuyao.js —— 六爻（纳甲筮法）装卦与断卦要点引擎（象数工坊）
 * 支持：铜钱摇卦 / 随机摇卦 / 手动指定爻 / 数字起卦
 * 装卦：八宫归属、世应、纳甲干支、六亲、六神、伏神、月建日辰、旬空、变卦、六冲六合、反吟伏吟
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./xs-data.js'), require('./lunar.js')); }
  else { root.XS = root.XS || {}; root.XS.Liuyao = factory(root.XS.Data, root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, Lib) {
  'use strict';
  var Solar = Lib.Solar;
  var BG = D.BAGUA;
  var POS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
  var YAO_TYPE = { 6:'老阴 ✕', 7:'少阳 ▅▅▅', 8:'少阴 ▅ ▅', 9:'老阳 ○' };

  /* ---------------- 八宫表 ---------------- */
  var PALACE = (function () {
    var map = {};
    var kinds = ['六世(本宫)', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
    var shiSeq = [6, 1, 2, 3, 4, 5, 4, 3];
    BG.forEach(function (T, pIdx) {
      var base = T.lines.concat(T.lines);
      var cur = base.slice();
      var arr = [base.slice()];
      for (var i = 0; i < 5; i++) { cur = cur.slice(); cur[i] = cur[i] ? 0 : 1; arr.push(cur.slice()); }
      cur = cur.slice(); cur[3] = cur[3] ? 0 : 1; arr.push(cur.slice());
      cur = cur.slice(); cur[0] = T.lines[0]; cur[1] = T.lines[1]; cur[2] = T.lines[2]; arr.push(cur.slice());
      arr.forEach(function (lines, k) {
        var uIdx = BG.indexOf(D.baguaByLines([lines[3], lines[4], lines[5]]));
        var lIdx = BG.indexOf(D.baguaByLines([lines[0], lines[1], lines[2]]));
        var shi = shiSeq[k];
        var name = D.HEX_NAMES[uIdx][lIdx];
        map[name] = { name: name, palace: T.name, palaceWx: T.wx, kind: kinds[k], shi: shi,
                      ying: shi <= 3 ? shi + 3 : shi - 3, upperIdx: uIdx, lowerIdx: lIdx };
      });
    });
    return map;
  })();

  function palaceOf(upperIdx, lowerIdx) { return PALACE[D.HEX_NAMES[upperIdx][lowerIdx]]; }

  /* ---------------- 六亲 ---------------- */
  function liuQin(meWx, yaoWx) {
    if (meWx === yaoWx) return '兄弟';
    if (D.WX_SHENG[meWx] === yaoWx) return '子孙';
    if (D.WX_SHENG[yaoWx] === meWx) return '父母';
    if (D.WX_KE[meWx] === yaoWx) return '妻财';
    if (D.WX_KE[yaoWx] === meWx) return '官鬼';
    return '';
  }
  function relation(meWx, otherWx) {
    if (meWx === otherWx) return '比和';
    if (D.WX_SHENG[otherWx] === meWx) return '生我';
    if (D.WX_SHENG[meWx] === otherWx) return '我生';
    if (D.WX_KE[otherWx] === meWx) return '克我';
    if (D.WX_KE[meWx] === otherWx) return '我克';
    return '';
  }

  /* ---------------- 纳甲 ---------------- */
  function najiaYao(upperName, lowerName) {
    var arr = [];
    D.NAJIA[lowerName].nei.zhi.forEach(function (z, i) { arr.push({ gan: D.NAJIA[lowerName].nei.gan, zhi: z, pos: i + 1 }); });
    D.NAJIA[upperName].wai.zhi.forEach(function (z, i) { arr.push({ gan: D.NAJIA[upperName].wai.gan, zhi: z, pos: i + 4 }); });
    return arr;
  }

  /* ---------------- 六神 ---------------- */
  function liuShenArr(dayGan) {
    var start = D.LIU_SHEN_START[dayGan];
    var out = [];
    for (var i = 0; i < 6; i++) out.push(D.LIU_SHEN[(start + i) % 6]);
    return out;
  }

  /* ---------------- 卦象工具 ---------------- */
  function linesToNames(lines) {
    var l = D.baguaByLines([lines[0], lines[1], lines[2]]);
    var u = D.baguaByLines([lines[3], lines[4], lines[5]]);
    return { lower: l, upper: u };
  }
  function hexOfLines(lines) {
    var t = linesToNames(lines);
    return { upperIdx: BG.indexOf(t.upper), lowerIdx: BG.indexOf(t.lower), upper: t.upper, lower: t.lower,
             name: D.HEX_NAMES[BG.indexOf(t.upper)][BG.indexOf(t.lower)] };
  }
  // 进神/退神
  var ZHI_ORDER = {}; D.DI_ZHI.forEach(function (z, i) { ZHI_ORDER[z] = i; });
  function jinTui(a, b) {
    if (D.ZHI_WX[a] !== D.ZHI_WX[b]) return '';
    if (a === b) return '';
    var order = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']; // 同类五行内的顺行序
    var gi = order.indexOf(a), gj = order.indexOf(b);
    if (gi < 0 || gj < 0 || gi > 9 || gj > 9) return '';
    if (gj === gi + 1) return '化进神';
    if (gj === gi - 1) return '化退神';
    return '';
  }
  // 墓库
  var MU = { 水:'辰', 土:'辰', 火:'戌', 金:'丑', 木:'未' };
  // 三合局
  function sanHeCheck(zhiList) {
    var res = [];
    [['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']].forEach(function (g) {
      var hit = g.slice(0, 3).filter(function (z) { return zhiList.indexOf(z) >= 0; });
      if (hit.length === 3) res.push('三合' + g[3] + '局（' + g[0] + g[1] + g[2] + '）');
      else if (hit.length === 2) res.push('半合' + g[3] + '（' + hit.join('') + '）');
    });
    return res;
  }

  /* ---------------- 起卦 ---------------- */
  // 三枚铜钱：背面(无字)=3，正面(有字)=2；三背=9老阳，两背=8少阴，一背=7少阳，三正=6老阴
  function coinYao(coins) {
    var sum = coins.reduce(function (a, b) { return a + (b ? 3 : 2); }, 0);
    return sum === 9 ? 9 : sum === 8 ? 8 : sum === 7 ? 7 : 6;
  }
  var YAO_LINES = 6;

  function qiGua(opt) {
    var o = opt || {};
    var lines = [], moving = [], types = [], coinsAll = [];
    if (o.method === 'coins' && o.coins && o.coins.length) {
      o.coins.forEach(function (c, i) {
        var t = coinYao(c);
        types[i] = t; lines[i] = (t === 7 || t === 9) ? 1 : 0; moving[i] = (t === 6 || t === 9);
        coinsAll[i] = c.slice();
      });
    } else if (o.method === 'manual' && o.yaoTypes && o.yaoTypes.length === 6) {
      o.yaoTypes.forEach(function (t, i) {
        t = +t; types[i] = t; lines[i] = (t === 7 || t === 9) ? 1 : 0; moving[i] = (t === 6 || t === 9);
      });
    } else if (o.method === 'numbers') {
      var n1 = Math.abs(parseInt(o.n1, 10) || 0), n2 = Math.abs(parseInt(o.n2, 10) || 0);
      var n3 = (o.n3 === undefined || o.n3 === null || o.n3 === '') ? (n1 + n2) : Math.abs(parseInt(o.n3, 10) || 0);
      var upN = n1 % 8 === 0 ? 8 : n1 % 8, loN = n2 % 8 === 0 ? 8 : n2 % 8, mv = n3 % 6 === 0 ? 6 : n3 % 6;
      var lIdx = BG.filter(function (b) { return b.num === loN; })[0];
      var uIdx = BG.filter(function (b) { return b.num === upN; })[0];
      var lz = BG.indexOf(lIdx), uz = BG.indexOf(uIdx);
      var ls = BG[lz].lines.concat(BG[uz].lines);
      for (var i = 0; i < 6; i++) {
        lines[i] = ls[i]; moving[i] = (i === mv - 1);
        types[i] = ls[i] ? (moving[i] ? 9 : 7) : (moving[i] ? 6 : 8);
      }
    } else { // random / 摇卦
      for (var k = 0; k < 6; k++) {
        var rnd = function () { var g = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) ? (function () { var a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 4294967296; })() : Math.random(); return g < 0.5 ? 0 : 1; };
        var c = [rnd(), rnd(), rnd()];
        var t2 = coinYao(c);
        types[k] = t2; lines[k] = (t2 === 7 || t2 === 9) ? 1 : 0; moving[k] = (t2 === 6 || t2 === 9);
        coinsAll[k] = c;
      }
    }
    return { lines: lines, moving: moving, types: types, coins: coinsAll,
             method: o.method || 'random', methodText: ({ coins:'铜钱摇卦', manual:'手动指定', numbers:'数字起卦', random:'随机摇卦' })[o.method || 'random'] };
  }

  /* ---------------- 排盘 ---------------- */
  function paipan(qi, ctx) {
    ctx = ctx || {};
    var lines = qi.lines, moving = qi.moving;
    var h = hexOfLines(lines);
    var p = palaceOf(h.upperIdx, h.lowerIdx);
    var nj = najiaYao(h.upper.name, h.lower.name);
    // 月建日辰
    var now = new Date();
    var y = ctx.y || now.getFullYear(), m = ctx.m || (now.getMonth() + 1), d = ctx.d || now.getDate();
    var hh = ctx.h === undefined ? now.getHours() : ctx.h, mi = ctx.mi === undefined ? now.getMinutes() : ctx.mi;
    var solar = Solar.fromYmdHms(y, m, d, hh, mi, 0);
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();
    var monthZhi = ec.getMonthZhi(), monthGan = ec.getMonthGan();
    var dayGanZhi = ec.getDay(), dayGan = ec.getDayGan();
    var xunKong = ec.getDayXunKong();
    var shen = liuShenArr(dayGan);
    // 六亲
    var yaoList = [];
    for (var i = 0; i < 6; i++) {
      var zhi = nj[i].zhi, wx = D.ZHI_WX[zhi];
      yaoList.push({
        pos: i + 1, posName: POS[i], yang: lines[i] === 1,
        gan: nj[i].gan, zhi: zhi, ganZhi: nj[i].gan + zhi, wx: wx,
        liuQin: liuQin(p.palaceWx, wx), liuShen: shen[i],
        moving: !!moving[i], type: qi.types[i], typeText: YAO_TYPE[qi.types[i]],
        isShi: p.shi === i + 1, isYing: p.ying === i + 1,
        kong: xunKong.indexOf(zhi) >= 0,
        yueJian: monthZhi === zhi, riChen: dayGanZhi.indexOf(zhi) === 1,
        coins: qi.coins[i] || null
      });
    }
    var present = {}; yaoList.forEach(function (y2) { present[y2.liuQin] = true; });
    var missing = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter(function (k) { return !present[k]; });
    // 伏神：本宫首卦
    if (missing.length) {
      var firstIdx = BG.indexOf(D.baguaByName(p.palace));
      var fnj = najiaYao(p.palace, p.palace);
      for (var f = 0; f < 6; f++) {
        var fwx = D.ZHI_WX[fnj[f].zhi], fq = liuQin(p.palaceWx, fwx);
        if (missing.indexOf(fq) >= 0 && !yaoList[f].fuShen) {
          yaoList[f].fuShen = { ganZhi: fnj[f].gan + fnj[f].zhi, zhi: fnj[f].zhi, wx: fwx, liuQin: fq, kong: xunKong.indexOf(fnj[f].zhi) >= 0,
                                note: '本宫' + p.palace + '首卦第' + (f + 1) + '爻伏于其下' };
        }
      }
    }
    // 变卦
    var bianLines = lines.slice();
    for (var b = 0; b < 6; b++) { if (moving[b]) bianLines[b] = bianLines[b] ? 0 : 1; }
    var hasBian = moving.some(function (x) { return x; });
    var bian = null;
    if (hasBian) {
      var bh = hexOfLines(bianLines);
      var bp = palaceOf(bh.upperIdx, bh.lowerIdx);
      var bnj = najiaYao(bh.upper.name, bh.lower.name);
      bian = { name: bh.name, palace: bp.palace, palaceWx: bp.palaceWx, kind: bp.kind,
               upper: bh.upper, lower: bh.lower, lines: bianLines,
               meaning: D.HEX_MEANING[bh.name] || '',
               yaoAll: bianLines.map(function (L, i) {
                 var z = bnj[i].zhi, wx = D.ZHI_WX[z];
                 return { pos: i + 1, posName: POS[i], yang: L === 1, ganZhi: bnj[i].gan + z, zhi: z, wx: wx, moved: !!moving[i],
                          liuQin: liuQin(bp.palaceWx, wx), liuQinSelf: liuQin(bp.palaceWx, wx), liuQinOfBen: liuQin(p.palaceWx, wx),
                          kong: xunKong.indexOf(z) >= 0 };
               }) };
      bian.yao = bian.yaoAll.map(function (x, i) { return moving[i] ? x : null; });
    }
    // 六冲六合卦
    var benName = h.name;
    var chongGua = D.LIU_CHONG_GUA.indexOf(benName) >= 0;
    var heGua = D.LIU_HE_GUA.indexOf(benName) >= 0;
    // 反吟 / 伏吟（内卦、外卦分别比较地支）
    var fanYin = [], fuYin = [];
    if (bian) {
      [['内卦', 0, 3], ['外卦', 3, 6]].forEach(function (seg) {
        var allChong = true, allSame = true, guaChanged = false;
        for (var i = seg[1]; i < seg[2]; i++) {
          if (D.ZHI_CHONG[yaoList[i].zhi] !== bian.yaoAll[i].zhi) allChong = false;
          if (yaoList[i].zhi !== bian.yaoAll[i].zhi) allSame = false;
          if (lines[i] !== bianLines[i]) guaChanged = true;
        }
        if (allChong && guaChanged) fanYin.push(seg[0] + '反吟');
        if (allSame && guaChanged) fuYin.push(seg[0] + '伏吟');
      });
    }
    // 自动要点
    var notes = [];
    var yueWx = D.ZHI_WX[monthZhi], riWx = D.ZHI_WX[dayGanZhi.charAt(1)];
    notes.push('月建「' + monthGan + monthZhi + '」（' + yueWx + '）、日辰「' + dayGanZhi + '」（' + D.ZHI_WX[dayGanZhi.charAt(1)] + '），旬空「' + xunKong + '」——凡爻得月建日辰生扶者旺，被克泄者衰，落旬空者力减（待填实或冲空）。');
    var dongYao = yaoList.filter(function (y2) { return y2.moving; });
    if (!dongYao.length) notes.push('六爻安静无动，主事情平稳、暂无变动，以卦象、世应与日月生克断之。');
    else notes.push('动爻共 ' + dongYao.length + ' 个：' + dongYao.map(function (y2) { return y2.posName + '（' + y2.liuQin + y2.ganZhi + '）'; }).join('、') + '。' + (dongYao.length > 3 ? '多爻齐动，主事情头绪多、变化大，宜抓用神与世应主线。' : '动爻为事之枢机，以动爻与用神、世应之生克定吉凶。'));
    dongYao.forEach(function (y2) {
      var by = bian.yao[y2.pos - 1];
      var rel = relation(y2.wx, by.wx);
      var extra = [];
      var jt = jinTui(y2.zhi, by.zhi); if (jt) extra.push(jt);
      if (D.ZHI_CHONG[y2.zhi] === by.zhi) extra.push('化冲');
      if (D.ZHI_HE[y2.zhi] === by.zhi) extra.push('化六合');
      if (by.kong) extra.push('化空');
      notes.push(y2.posName + ' ' + y2.liuQin + y2.ganZhi + ' 动 → 化 ' + by.liuQinOfBen + ' ' + by.ganZhi + '（对本宫）+ '
        + by.liuQinSelf + '（对变卦' + bian.palace + '宫）；对本爻为「' + (rel === '生我' ? '回头生' : rel === '我生' ? '泄气' : rel === '克我' ? '回头克' : rel === '我克' ? '我克变爻' : '比和') + '」'
        + (extra.length ? '，' + extra.join('、') : '') + '。');
    });
    var shiYao = yaoList[p.shi - 1], yingYao = yaoList[p.ying - 1];
    var shiYingRel = relation(shiYao.wx, yingYao.wx);
    notes.push('世爻（' + shiYao.posName + ' ' + shiYao.liuQin + shiYao.ganZhi + '）与应爻（' + yingYao.posName + ' ' + yingYao.liuQin + yingYao.ganZhi + '）为「' + shiYingRel + '」：'
      + (shiYingRel === '生我' ? '应生世，得对方助力。' : shiYingRel === '我生' ? '世生应，我方费力付出。' : shiYingRel === '克我' ? '应克世，对方压制，宜防受制。' : shiYingRel === '我克' ? '世克应，我可制彼，主动在我。' : '世应比和，彼此同气、易协商。'));
    if (chongGua) notes.push('本卦为六冲卦：主散、主快、主变动，事多不聚，久事不利，急事宜。');
    if (heGua) notes.push('本卦为六合卦：主合、主缓、主聚，事多能成但节奏偏慢，需防牵绊。');
    if (missing.length) notes.push('本卦不见「' + missing.join('、') + '」，已按「六亲不上卦则于本宫首卦寻之」之例取伏神，伏神须得日月生扶、或逢冲飞神方可出伏值事。');
    if (fanYin.length) notes.push('卦逢' + fanYin.join('、') + '：主反复颠倒、事多翻转，宜静观。');
    if (fuYin.length) notes.push('卦逢' + fuYin.join('、') + '：主呻吟难进、原地踏步，事多不变。');
    var heRes = sanHeCheck(yaoList.filter(function (y2) { return y2.moving; }).map(function (y2) { return y2.zhi; })
      .concat([monthZhi, dayGanZhi.charAt(1)]));
    if (heRes.length) notes.push('三合参考：' + heRes.join('、') + '（动爻与日月所成）。');

    return {
      ok: true, method: qi.method, methodText: qi.methodText,
      time: { solar: solar.toYmdHms(), lunar: lunar.toString(), lunarDetail: ec.getYear() + '年 ' + ec.getMonth() + '月 ' + ec.getDay() + '日 ' + ec.getTime(),
              monthGanZhi: monthGan + monthZhi, dayGanZhi: dayGanZhi, xunKong: xunKong, jieQi: (function () { try { return lunar.getPrevJieQi(true).getName(); } catch (e) { return ''; } })() },
      ben: { name: benName, meaning: D.HEX_MEANING[benName] || '', upper: h.upper, lower: h.lower,
             palace: p.palace, palaceWx: p.palaceWx, kind: p.kind, shi: p.shi, ying: p.ying,
             chongGua: chongGua, heGua: heGua, symbols: h.lower.symbol + h.upper.symbol },
      yao: yaoList, missing: missing, bian: bian, fanYin: fanYin, fuYin: fuYin,
      notes: notes, dongCount: dongYao.length
    };
  }

  /* ---------------- 用神分析 ---------------- */
  var YONG_SHEN_BY_TOPIC = {
    '求财': '妻财', '生意经营': '妻财', '事业功名': '官鬼', '官讼': '官鬼', '疾病': '官鬼',
    '婚姻(男占)': '妻财', '婚姻(女占)': '官鬼', '父母长辈': '父母', '房屋车船': '父母', '文书考试': '父母',
    '子女': '子孙', '平安': '子孙', '僧道': '子孙', '兄弟朋友': '兄弟', '竞争者': '兄弟'
  };
  function yongShenOf(topic) { return YONG_SHEN_BY_TOPIC[topic] || ''; }
  // 用神、原神、忌神、仇神
  function shenGroup(meWx, subject) {
    // subject: 用神六亲
    var rel = { '父母':'生我', '兄弟':'同我', '子孙':'我生', '妻财':'我克', '官鬼':'克我' }[subject];
    var targetWx = rel === '生我' ? D.WX_SHENG_ME[meWx] : rel === '同我' ? meWx : rel === '我生' ? D.WX_SHENG[meWx]
                  : rel === '我克' ? D.WX_KE[meWx] : D.WX_KE_ME[meWx];
    var yuan = D.WX_SHENG_ME[targetWx];   // 生用神者为原神
    var ji = D.WX_KE_ME[targetWx];        // 克用神者为忌神
    var chou = D.WX_KE_ME[yuan];          // 克原神者为仇神
    var qinOf = function (wx) {
      if (wx === targetWx) return subject;
      if (wx === yuan) return liuQin(meWx, wx);
      if (wx === ji) return liuQin(meWx, wx);
      if (wx === chou) return liuQin(meWx, wx);
      return liuQin(meWx, wx);
    };
    return { targetWx: targetWx, yuanWx: yuan, jiWx: ji, chouWx: chou,
             yuanQin: liuQin(meWx, yuan), jiQin: liuQin(meWx, ji), chouQin: liuQin(meWx, chou) };
  }
  function analyzeYongShen(r, topic) {
    var subject = yongShenOf(topic);
    if (!subject) return null;
    var meWx = r.ben.palaceWx;
    var g = shenGroup(meWx, subject);
    var yueWx = D.ZHI_WX[r.time.monthGanZhi.charAt(1)], riWx = D.ZHI_WX[r.time.dayGanZhi.charAt(1)];
    var target = null, isFu = false, fuOwner = null;
    r.yao.forEach(function (y2) { if (y2.liuQin === subject) target = target || y2; });
    if (!target) {
      r.yao.forEach(function (y2) { if (!target && y2.fuShen && y2.fuShen.liuQin === subject) { target = y2.fuShen; isFu = true; fuOwner = y2; } });
    }
    if (!target) return { topic: topic, subject: subject, found: false, text: '用神「' + subject + '」在本卦与本宫首卦中均未寻得，此占难以取用，宜改日再占或换一个问法。' };
    var lines = [];
    lines.push('所占之事「' + topic + '」，取「' + subject + '」为用神。');
    if (isFu) lines.push('用神不上卦，现伏于' + fuOwner.posName + '（' + fuOwner.liuQin + fuOwner.ganZhi + '）之下，伏神为 ' + target.ganZhi + '(' + target.wx + ')' + (target.kong ? '，且落旬空' : '') + '。伏神须得日月生扶、飞神受制方可出伏。');
    else lines.push('用神临' + target.posName + '（' + target.liuQin + target.ganZhi + '，' + target.wx + '）' + (target.moving ? '，为动爻' : '，为静爻') + (target.isShi ? '，且临世爻' : '') + (target.isYing ? '，且临应爻' : '') + '。');
    var mRel = relation(target.wx, yueWx), dRel = relation(target.wx, riWx);
    lines.push('用神与月建：' + (mRel === '生我' ? '月建生用神，得时令之助' : mRel === '我生' ? '用神生月建，泄气' : mRel === '克我' ? '月建克用神，受制' : mRel === '我克' ? '用神克月建，虽制彼亦费力' : '与月建比和，得气') + '；'
      + '与日辰：' + (dRel === '生我' ? '日辰生用神' : dRel === '我生' ? '用神泄于日辰' : dRel === '克我' ? '日辰克用神' : dRel === '我克' ? '用神克日辰' : '与日辰比和') + '。');
    lines.push('原神（' + g.yuanQin + '，' + g.yuanWx + '）生用神，为吉神；忌神（' + g.jiQin + '，' + g.jiWx + '）克用神，为凶神；仇神（' + g.chouQin + '，' + g.chouWx + '）克原神。断卦看原忌二神之旺衰动静：原神旺动则吉，忌神旺动则凶。');
    if (target.kong) lines.push('用神落旬空：主事虚、暂不成、待时而应；出空（逢冲或填实之日）方见分晓。');
    var shiYao = r.yao[r.ben.shi - 1];
    lines.push('用神与世爻（' + shiYao.ganZhi + '，' + shiYao.liuQin + '）关系为「' + relation(shiYao.wx, target.wx) + '」（以世为我）：'
      + ({ '生我':'用神生世，事来就我，吉。', '我生':'世生用神，我方付出，事需用力。', '克我':'用神克世，事来伤我，多有阻。', '我克':'世克用神，我可取之，事在掌握。', '比和':'世用比和，顺遂。' })[relation(shiYao.wx, target.wx)]);
    return { topic: topic, subject: subject, found: true, target: target, group: g, lines: lines,
             yueWx: yueWx, riWx: riWx, text: lines.join('\n') };
  }

  function report(r) {
    var L = [];
    L.push('【六爻排盘】' + r.methodText + '　' + r.time.solar + '　农历' + r.time.lunar);
    L.push('月建 ' + r.time.monthGanZhi + '　日辰 ' + r.time.dayGanZhi + '　旬空 ' + r.time.xunKong);
    L.push('');
    L.push('本卦：' + r.ben.symbols + ' ' + r.ben.name + '（' + r.ben.palace + '宫·' + r.ben.palaceWx + '·' + r.ben.kind + '）' + r.ben.meaning);
    L.push('世爻：' + POS[r.ben.shi - 1] + '　应爻：' + POS[r.ben.ying - 1] + (r.ben.chongGua ? '　【六冲卦】' : '') + (r.ben.heGua ? '　【六合卦】' : ''));
    var bz = r.bian ? (' → 变卦：' + r.bian.name + '（' + r.bian.palace + '宫）' + r.bian.meaning) : '（六爻安静，无变卦）';
    L.push(bz);
    L.push('');
    for (var i = 5; i >= 0; i--) {
      var y2 = r.yao[i];
      L.push('  ' + y2.liuShen + ' ' + y2.posName + ' ' + (y2.isShi ? '世' : y2.isYing ? '应' : '　') + ' '
        + (y2.yang ? '▅▅▅▅▅' : '▅▅　▅▅') + ' ' + y2.liuQin + ' ' + y2.ganZhi + '(' + y2.wx + ')'
        + (y2.moving ? ' ' + y2.typeText + ' 动' : '') + (y2.kong ? ' 空' : '')
        + (y2.fuShen ? ' ｜伏神 ' + y2.fuShen.liuQin + y2.fuShen.ganZhi : '')
        + (r.bian && r.bian.yao[i] ? '　→ ' + (r.bian.yao[i].yang ? '▅▅▅▅▅' : '▅▅　▅▅') + ' ' + r.bian.yao[i].liuQinOfBen + ' ' + r.bian.yao[i].ganZhi : ''));
    }
    L.push('');
    r.notes.forEach(function (n) { L.push('· ' + n); });
    return L.join('\n');
  }

  return { qiGua: qiGua, paipan: paipan, report: report, palaceOf: palaceOf, PALACE: PALACE,
           liuQin: liuQin, najiaYao: najiaYao, liuShenArr: liuShenArr, coinYao: coinYao,
           analyzeYongShen: analyzeYongShen, yongShenOf: yongShenOf, YONG_SHEN_BY_TOPIC: YONG_SHEN_BY_TOPIC,
           shenGroup: shenGroup, POS: POS };
});
