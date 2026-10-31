// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-records.js —— 抽卡记录 / 连歪计数器 / 保底进度 / 每日待办提醒（象数工坊 · 娱乐向）
 * 纯逻辑，存储通过 store 注入（浏览器用 localStorage，测试可传假存储）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./xs-games.js')); }
  else { root.XS = root.XS || {}; root.XS.Records = factory(root.XS.Games); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Games) {
  'use strict';

  var KEY = 'xiangshu.gacha.records';
  var OUTCOME_TEXT = { up: '出了 UP', off: '歪了（非 UP）', none: '没出货' };

  function defStore() {
    try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }
  }
  function load(store) {
    store = store || defStore();
    if (!store) return [];
    try { return JSON.parse(store.getItem(KEY) || '[]') || []; } catch (e) { return []; }
  }
  function save(store, list) {
    store = store || defStore();
    if (!store) return;
    try { store.setItem(KEY, JSON.stringify(list || [])); } catch (e) {}
  }
  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function add(list, rec) {
    var list2 = (list || []).slice();
    list2.push({
      id: uid(), ts: Date.now(),
      date: rec.date || todayStr(),
      gameId: rec.gameId || 'generic',
      pulls: Math.max(1, parseInt(rec.pulls, 10) || 1),
      outcome: ['up', 'off', 'none'].indexOf(rec.outcome) >= 0 ? rec.outcome : 'none',
      account: (rec.account || '').toString().trim().slice(0, 24),
      note: (rec.note || '').slice(0, 60)
    });
    return list2;
  }
  function removeById(list, id) { return (list || []).filter(function (r) { return r.id !== id; }); }

  function sortAsc(list) {
    return (list || []).slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.ts || 0) - (b.ts || 0);
    });
  }

  /* 单游戏（或不限游戏）统计：computeStats 接收已筛好的记录 */
  function computeStats(rows, game) {
    var totalPulls = 0, outs = 0, ups = 0, offs = 0;
    rows.forEach(function (r) {
      totalPulls += r.pulls;
      if (r.outcome === 'up') { ups++; outs++; }
      else if (r.outcome === 'off') { offs++; outs++; }
    });
    var lastOutIdx = -1;
    for (var i = rows.length - 1; i >= 0; i--) { if (rows[i].outcome !== 'none') { lastOutIdx = i; break; } }
    var sinceLast = 0;
    if (lastOutIdx >= 0) { for (var j = lastOutIdx + 1; j < rows.length; j++) sinceLast += rows[j].pulls; }
    else { rows.forEach(function (r) { sinceLast += r.pulls; }); }
    var consecutiveOff = 0, consecutiveUp = 0;
    for (var k = rows.length - 1; k >= 0; k--) {
      var o = rows[k].outcome;
      if (o === 'none') continue;
      if (o === 'off') { if (consecutiveUp > 0) break; consecutiveOff++; }
      else if (o === 'up') { if (consecutiveOff > 0) break; consecutiveUp++; }
    }
    var t = todayStr(), todayPulls = 0;
    rows.forEach(function (r) { if (r.date === t) todayPulls += r.pulls; });
    var pity = game ? game.pity : 90;
    return {
      gameId: game ? game.id : '', gameName: game ? game.name : '全部',
      totalPulls: totalPulls, outs: outs, ups: ups, offs: offs,
      rate: totalPulls ? outs / totalPulls : 0,
      upRate: totalPulls ? ups / totalPulls : 0,
      offRate: outs ? offs / outs : 0,
      sinceLast: sinceLast, pity: pity,
      pityRemain: pity > 0 ? Math.max(0, pity - sinceLast) : null,
      consecutiveOff: consecutiveOff, consecutiveUp: consecutiveUp,
      records: rows, count: rows.length, todayPulls: todayPulls,
      lastOutDate: lastOutIdx >= 0 ? rows[lastOutIdx].date : ''
    };
  }

  function stats(list, gameId) {
    var rows = sortAsc((list || []).filter(function (r) { return !gameId || r.gameId === gameId; }));
    return computeStats(rows, gameId ? Games.byId(gameId) : null);
  }
  function overall(list) { return stats(list, ''); }
  // 已从收录列表移除的游戏（如早期的原神/星铁），记录并入「其他游戏」，不丢数据
  function perGame(list) {
    var known = {};
    Games.GAMES.forEach(function (g) { known[g.id] = true; });
    var res = [];
    Games.GAMES.forEach(function (g) {
      var rows = (list || []).filter(function (r) {
        return r.gameId === g.id || (g.id === 'generic' && !known[r.gameId]);
      });
      if (rows.length) res.push(computeStats(sortAsc(rows), g));
    });
    return res;
  }

  /* 每日一句待办式提醒（数据驱动；档位来自规则判定，不按分数阈值） */
  function dailyReminder(o) {
    o = o || {};
    var st = o.stats || { consecutiveOff: 0, pityRemain: null, todayPulls: 0, sinceLast: 0, pity: 0 };
    if (o.done) return { icon: '✅', kind: 'done', text: '今日待办已完成，收工——明天再来看新的一句。' };
    var hourTxt = (o.bestHour && o.bestHour.name) ? (o.bestHour.name + '时（' + o.bestHour.range + '）') : '';
    if (st.consecutiveOff >= 3) {
      return { icon: '🔥', kind: 'urgent', text: '连歪 ' + st.consecutiveOff + ' 次了：今天先别上头，做完日常就撤，不要开新池。' };
    }
    if (st.pityRemain !== null && st.pityRemain <= 10 && st.pityRemain > 0) {
      return { icon: '🎯', kind: 'urgent', text: '保底就在眼前（还差 ' + st.pityRemain + ' 抽）：今天补完最划算，但先确认这个池你真的要。' };
    }
    if (o.level === '大吉') {
      return { icon: '✨', kind: 'good', text: '今日按规则判为大吉：吉时 ' + (hourTxt || '见页面') + '，想抽就挑那会儿，见好就收。' };
    }
    if (o.level === '吉') {
      return { icon: '🌤', kind: 'good', text: '今日判为吉：可抽，但只按计划抽，吉时 ' + (hourTxt || '见页面') + '。' };
    }
    if (o.level === '凶' || o.level === '大凶') {
      return { icon: '🧊', kind: 'cold', text: '今日按规则判为「' + o.level + '」：只做日常攒票，别开新池——把票留给吉日。' };
    }
    if (st.todayPulls > 0) {
      return { icon: '📌', kind: 'normal', text: '今天已经抽了 ' + st.todayPulls + ' 抽：见好就收，别再"最后一抽"。' };
    }
    return { icon: '📌', kind: 'normal', text: '今日判为平：按计划抽，抽够保底就收；下手前先确认这个池你要不要。' };
  }

  return { KEY: KEY, load: load, save: save, add: add, removeById: removeById,
           stats: stats, overall: overall, perGame: perGame,
           dailyReminder: dailyReminder, todayStr: todayStr, sortAsc: sortAsc,
           OUTCOME_TEXT: OUTCOME_TEXT };
});
