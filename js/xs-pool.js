/*!
 * xs-pool.js —— 「我这期卡池的抽卡运气」
 *
 * 【算的是什么】不是角色跟你合不合，而是：这期卡池的档期里，你哪几天手气好、整体运气如何。
 *   ① 档期内逐日按传统择日判档（值神黄道/黑道 → 建除十二神 → 吉神凶煞 → 日干十神/喜用/日支冲合）
 *   ② 统计吉日占比与平均气势分 → 给出这期池的整体运气档
 *   ③ 排出最宜抽的几天（含当天最好时辰）与最忌的几天
 *   ④ 明确提醒：抽卡概率与运气无关（十连概率另算）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./xs-daily.js'));
  } else {
    root.XS = root.XS || {};
    root.XS.Pool = factory(root.XS.Daily);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DL) {
  'use strict';

  var LEVEL_NAMES = ['大凶', '凶', '平', '吉', '大吉'];
  function parseDate(s) {
    if (s instanceof Date) return s;
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function luck(opt) {
    opt = opt || {};
    var me = DL.prep(opt.birth);
    if (!me || !me.ok) return { ok: false, error: (me && me.error) || '请先填出生日期' };
    if (!opt.start || !opt.end) return { ok: false, error: '请填卡池起止日期' };

    var s = parseDate(opt.start), e = parseDate(opt.end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return { ok: false, error: '日期格式不对' };
    if (e < s) return { ok: false, error: '结束日期不能早于开始日期' };

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var from = s < today ? new Date(today.getTime()) : s;
    if (from > e) return { ok: false, error: '这期卡池已经结束了' };

    var cap = opt.maxDays || 90;
    var days = [], cur = new Date(from.getTime());
    while (cur <= e && days.length < cap) {
      var r = DL.daily({ y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate(), me: me });
      if (r.ok) {
        days.push({
          date: r.date.text, week: r.date.week, ganZhi: r.day.ganZhi,
          level: r.level, grade: r.grade, score: r.score,
          tianShen: r.day.tianShen, tianShenType: r.day.tianShenType, zhiXing: r.day.zhiXing,
          bestHour: r.hours.best.zhi + '时 ' + r.hours.best.range,
          worstHour: r.hours.worst.zhi + '时 ' + r.hours.worst.range,
          bestHourName: r.hours.best.tianShen
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (!days.length) return { ok: false, error: '档期内没有可算的日子' };

    var dist = {}; LEVEL_NAMES.forEach(function (n) { dist[n] = 0; });
    days.forEach(function (d) { dist[d.level] = (dist[d.level] || 0) + 1; });
    var avg = Math.round(days.reduce(function (a, d) { return a + d.score; }, 0) / days.length);
    var goodDays = days.filter(function (d) { return d.level === '大吉' || d.level === '吉'; }).length;
    var badDays = days.filter(function (d) { return d.level === '大凶' || d.level === '凶'; }).length;
    var goodRatio = goodDays / days.length;

    var overall, overallRule;
    if (goodRatio >= 0.45 && avg >= 65) { overall = '大吉'; overallRule = '吉日占比 ' + Math.round(goodRatio * 100) + '%（≥45%）＋ 平均气势分 ' + avg; }
    else if (goodRatio >= 0.30 || avg >= 60) { overall = '吉'; overallRule = '吉日占比 ' + Math.round(goodRatio * 100) + '% ／ 平均气势分 ' + avg; }
    else if (goodRatio >= 0.15 || avg >= 48) { overall = '平'; overallRule = '吉日占比 ' + Math.round(goodRatio * 100) + '% ／ 平均气势分 ' + avg; }
    else if (badDays / days.length >= 0.5) { overall = '大凶'; overallRule = '凶日占比 ' + Math.round(badDays / days.length * 100) + '%（≥50%）'; }
    else { overall = '凶'; overallRule = '吉日占比仅 ' + Math.round(goodRatio * 100) + '%，平均气势分 ' + avg; }

    var sorted = days.slice().sort(function (a, b) { return b.score - a.score; });
    var best = sorted.slice(0, Math.min(3, days.length));
    var worst = sorted.slice(-Math.min(2, days.length)).reverse().filter(function (d) {
      return !best.some(function (b) { return b.date === d.date; });
    });

    var advice;
    if (overall === '大吉') advice = '这期池的档期对你很友好：' + goodDays + '/' + days.length + ' 天是吉日。想抽就挑最好的那几天。';
    else if (overall === '吉') advice = '这期池整体偏顺：' + goodDays + ' 天吉日。按预算抽，优先挑吉日，避开凶日。';
    else if (overall === '平') advice = '这期池平平：吉日 ' + goodDays + ' 天、凶日 ' + badDays + ' 天。抽就挑吉日，别在凶日上头。';
    else if (overall === '凶') advice = '这期池对你偏冷：只有 ' + goodDays + ' 天吉日。建议少抽、挑吉日抽，或者等下一期。';
    else advice = '这期池凶日占多数：不是非要不可的话，建议少投入，把钱留给更好的档期。';

    var notes = [];
    notes.push('这里的"运气"说的是日子本身的气场（择日判档），不是出货概率——出货概率由游戏保底机制决定，和日期无关。');
    if (best.length) notes.push('最宜抽：' + best.map(function (d) { return d.date + '（' + d.level + ' ' + d.score + '分，最好时辰 ' + d.bestHour + '）'; }).join('；') + '。');
    if (worst.length) notes.push('最忌抽：' + worst.map(function (d) { return d.date + '（' + d.level + ' ' + d.score + '分）'; }).join('；') + '。');
    if (!me.hourKnown) notes.push('你没填出生时间，只按年月日三柱比对，结论略粗。');

    return {
      ok: true,
      window: { start: ymd(from), end: ymd(e), days: days.length, capped: days.length >= cap },
      me: { dayMaster: me.dayMaster, yongShen: me.yongShen, hourKnown: me.hourKnown },
      overall: overall, overallRule: overallRule, avgScore: avg, goodDays: goodDays, badDays: badDays,
      goodRatio: goodRatio, dist: dist, days: days, best: best, worst: worst,
      advice: advice, notes: notes,
      disclaimer: '择日看的是"日子本身的气"，不是"你能不能抽到"。抽卡概率见抽卡页的十连概率（纯数学，与运势无关）。'
    };
  }

  function report(r) {
    if (!r.ok) return '算不出来：' + r.error;
    var L = [];
    L.push('【我这期卡池的抽卡运气】' + r.window.start + ' ~ ' + r.window.end + '（' + r.window.days + ' 天可算）');
    L.push('命主：日主 ' + r.me.dayMaster + '　喜用 ' + (r.me.yongShen.join('、') || '—'));
    L.push('');
    L.push('整体运气：' + r.overall + '（' + r.overallRule + '）');
    L.push('档位分布：' + LEVEL_NAMES.slice().reverse().map(function (k) { return k + ' ' + (r.dist[k] || 0); }).join('　'));
    L.push('吉日 ' + r.goodDays + ' 天 / 凶日 ' + r.badDays + ' 天，平均气势分 ' + r.avgScore);
    L.push('');
    L.push('结论：' + r.advice);
    if (r.best.length) { L.push(''); L.push('最宜抽：'); r.best.forEach(function (d) { L.push('  ' + d.date + ' ' + d.week + ' ' + d.ganZhi + '　' + d.level + ' ' + d.score + '分　最好时辰 ' + d.bestHour); }); }
    if (r.worst.length) { L.push(''); L.push('最忌抽：'); r.worst.forEach(function (d) { L.push('  ' + d.date + ' ' + d.week + ' ' + d.ganZhi + '　' + d.level + ' ' + d.score + '分'); }); }
    if (r.notes.length) { L.push(''); r.notes.forEach(function (n) { L.push('· ' + n); }); }
    L.push('');
    L.push(r.disclaimer);
    return L.join('\n');
  }

  return { luck: luck, report: report, LEVEL_NAMES: LEVEL_NAMES };
});
