// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/* 象数工坊 —— 界面逻辑 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var XS = window.XS;
  var state = { bazi: null, meihua: null, liuyao: null, xlr: null, dayunIdx: 0, lastText: {} };

  /* ==================== 通用 ==================== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowTimeStr(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function nowLocalInput(d) { d = d || new Date(); return todayStr(d) + 'T' + nowTimeStr(d); }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  /* 账号名称（代替人名）：全局一个，存本机，两个页面输入框同步 */
  var ACCT_KEY = 'xiangshu.account';
  function getAcct() { var el = $('acctBazi'); return ((el && el.value) || '').trim().slice(0, 24); }
  function setAcct(v, except) {
    ['acctBazi', 'acctGacha', 'acctMatch'].forEach(function (id) { var el = $(id); if (el && el !== except) el.value = v; });
    try { localStorage.setItem(ACCT_KEY, v); } catch (e) {}
  }
  function wxCls(wx) { return 'wx-' + wx; }
  function splitDateTime(str) {
    if (!str) { var n = new Date(); return { y:n.getFullYear(), m:n.getMonth()+1, d:n.getDate(), h:n.getHours(), mi:n.getMinutes() }; }
    var p = str.split('T'), dp = p[0].split('-'), tp = (p[1] || '00:00').split(':');
    return { y:+dp[0], m:+dp[1], d:+dp[2], h:+tp[0], mi:+tp[1] };
  }
  function copyText(text, label) {
    if (!text) { toast('还没有可复制的结果'); return; }
    var done = function () { toast((label || '已') + '复制到剪贴板'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { legacy(); });
    else legacy();
    function legacy() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = 0;
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
  }
  function downloadText(filename, text) {
    if (!text) { toast('还没有可导出的结果'); return; }
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    toast('已导出 ' + filename);
  }
  function guaLinesHtml(lines, movingLine, cls) {
    var h = '<div class="gua-lines ' + (cls || '') + '">';
    for (var i = 0; i < lines.length; i++) {
      var yang = lines[i] === 1, mv = (movingLine === i + 1);
      h += yang ? '<div class="gl yang' + (mv ? ' moving dong' : '') + '"></div>'
                : '<div class="gl yin' + (mv ? ' moving dong' : '') + '"><i></i><i></i></div>';
    }
    return h + '</div>';
  }

  // 白话解读卡（把计算结果翻译成人话，放在每个结果的最底部）
  function interpCard(d) {
    if (!d) return '';
    var h = '<div class="card interp"><h2>白话解读</h2><p class="interp-head">' + esc(d.headline) + '</p>';
    (d.sections || []).forEach(function (s) {
      h += '<div class="interp-sec"><h3>' + esc(s.h) + '</h3>';
      if (Object.prototype.toString.call(s.p) === '[object Array]') {
        s.p.forEach(function (x) { h += '<p>' + esc(x) + '</p>'; });
      } else { h += '<p>' + esc(s.p) + '</p>'; }
      h += '</div>';
    });
    if (d.tips && d.tips.length) {
      h += '<div class="interp-tips"><h3>怎么用这些结论</h3><ul>' + d.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    return h + '</div>';
  }

  /* ==================== 页签 / 主题 ==================== */
  /* 首页 ←→ 模块 导航 */
  var MODULES = { bazi: '生辰八字', meihua: '梅花易数', liuyao: '六爻纳甲', xlr: '小六壬', gacha: '抽卡时运', match: '二次元相性', about: '说明与口径' };
  state.module = 'home';
  function showHome() {
    state.module = 'home';
    $('homeView').style.display = '';
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    // 清掉抽卡子模块的残留状态，下次进来从子首页开始
    var gsh = $('gachaSubHome');
    if (gsh) {
      gsh.style.display = '';
      document.querySelectorAll('.subview').forEach(function (v) { v.style.display = 'none'; });
    }
    $('moduleBar').style.display = 'none';
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    window.scrollTo({ top: 0 });
  }
  function showModule(tab) {
    if (!MODULES[tab]) return;   // 无效 tab 直接忽略，避免被子卡误触发退回首页
    state.module = tab;
    $('homeView').style.display = 'none';
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + tab); });
    $('moduleBar').style.display = 'flex';
    $('mbTitle').textContent = MODULES[tab];
    if (tab === 'gacha') showGachaSub('home');
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('.home-card[data-tab]').forEach(function (c) {
    c.addEventListener('click', function () { showModule(c.dataset.tab); });
  });
  $('btnHome').addEventListener('click', showHome);
  /* 抽卡时运的子模块导航 */
  var GSUBS = { day: '今日时运', week: '最近最宜 & 一周走势', pool: '卡池档期', record: '抽卡记录 & 十连概率', gloss: '术语小抄' };
  function showGachaSub(sub) {
    var isHome = !sub || sub === 'home' || !GSUBS[sub];
    $('gachaSubHome').style.display = isHome ? '' : 'none';
    Object.keys(GSUBS).forEach(function (k) {
      var el = $('gsub-' + k);
      if (el) el.style.display = (k === sub) ? '' : 'none';
    });
    $('mbTitle').textContent = isHome ? '抽卡时运' : ('抽卡时运 · ' + GSUBS[sub]);
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('[data-sub]').forEach(function (b2) {
    b2.addEventListener('click', function () { showGachaSub(b2.dataset.sub); });
  });
  document.querySelectorAll('.sub-back').forEach(function (b2) {
    b2.addEventListener('click', function () { showGachaSub('home'); });
  });

  (function navInit() {
    var h = (location.hash || '').replace('#', '');
    if (MODULES[h]) showModule(h); else showHome();
  })();
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    $('btnTheme').textContent = (t === 'dark' ? '浅色' : '深色');
    try { localStorage.setItem('xiangshu.theme', t); } catch (e) {}
  }
  $('btnTheme').addEventListener('click', function () {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  try { var savedTheme = localStorage.getItem('xiangshu.theme'); if (savedTheme) setTheme(savedTheme); } catch (e) {}
  (function acctInit() {
    try { var v = localStorage.getItem(ACCT_KEY) || ''; if (v) setAcct(v); } catch (e) {}
    ['acctBazi', 'acctGacha', 'acctMatch'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('input', function () {
        setAcct(el.value, el);
        clearTimeout(el._t);
        el._t = setTimeout(function () { if (typeof gcLastOpt !== 'undefined' && gcLastOpt) gcRefresh(false); }, 350);
      });
    });
  })();

  /* ==================== 历史记录 ==================== */
  var HIS_KEY = 'xiangshu.history';
  function getHistory() { try { return JSON.parse(localStorage.getItem(HIS_KEY) || '[]'); } catch (e) { return []; } }
  function pushHistory(item) {
    var arr = getHistory(); arr.unshift(item); arr = arr.slice(0, 40);
    try { localStorage.setItem(HIS_KEY, JSON.stringify(arr)); } catch (e) {}
    renderHistory();
  }
  function renderHistory() {
    var arr = getHistory(), box = $('historyList');
    if (!arr.length) { box.innerHTML = '<p class="muted">暂无记录。排盘后会自动留存最近 40 条。</p>'; return; }
    box.innerHTML = arr.map(function (it, i) {
      return '<div class="his-item" data-i="' + i + '"><div class="t">' + esc(it.title) + '</div><div class="m">' + esc(it.time) + ' · ' + esc(it.tabName) + '</div></div>';
    }).join('');
    box.querySelectorAll('.his-item').forEach(function (n) {
      n.addEventListener('click', function () {
        var it = getHistory()[+n.dataset.i]; if (!it) return;
        showModule(it.tab);
        if (it.tab === 'gacha') showGachaSub('day');   // 恢复的是「今日时运」结果，须切到该子页
        var resBox = { bazi: 'bzResult', meihua: 'mhResult', liuyao: 'lyResult', xlr: 'xlrResult', gacha: 'gcResult', match: 'mtResult' }[it.tab];
        if (resBox) $(resBox).innerHTML = it.html;
        state.lastText[it.tab] = it.text || '';
        closeDrawer(); toast('已载入历史记录');
      });
    });
  }
  function openDrawer() { $('historyDrawer').classList.add('open'); $('mask').classList.add('open'); }
  function closeDrawer() { $('historyDrawer').classList.remove('open'); $('mask').classList.remove('open'); }
  $('btnHistory').addEventListener('click', function () { renderHistory(); openDrawer(); });
  $('hisClose').addEventListener('click', closeDrawer);
  $('mask').addEventListener('click', closeDrawer);
  $('hisClear').addEventListener('click', function () {
    if (confirm('确定清空全部历史记录？')) { try { localStorage.removeItem(HIS_KEY); } catch (e) {} renderHistory(); toast('已清空'); }
  });
  function saveResult(tab, tabName, title, html, text) {
    state.lastText[tab] = text;
    pushHistory({ tab: tab, tabName: tabName, title: title, time: new Date().toLocaleString('zh-CN'), html: html, text: text });
  }

  /* ============================================================
   *  一、生辰八字
   * ============================================================ */
  /* 示例预设资料：生日 1990-06-15、男；出生时间留空（不记得就不填）
   * 只在输入框为空时填 —— 用户改过就以用户的为准，且不覆盖已存的历史。 */
  var PRESET = { date: '1990-06-15', gender: '1' };
  function applyPreset() {
    if ($('bzDate') && !$('bzDate').value) $('bzDate').value = PRESET.date;
    if ($('bzGender') && !$('bzGender').value) $('bzGender').value = PRESET.gender;
    if ($('bzTime')) $('bzTime').value = '';
    if ($('mtMeDate') && !$('mtMeDate').value) $('mtMeDate').value = PRESET.date;
    if ($('mtMeGender') && !$('mtMeGender').value) $('mtMeGender').value = PRESET.gender;
    if ($('mtMeTime')) $('mtMeTime').value = '';
    if ($('gcBirthDate') && !$('gcBirthDate').value) $('gcBirthDate').value = PRESET.date;
    if ($('gcGender') && !$('gcGender').value) $('gcGender').value = PRESET.gender;
    if ($('gcBirthTime')) $('gcBirthTime').value = '';
  }
  applyPreset();
  /* ---------- 历法切换：农历用「年/月/日」三下拉，公历用日期控件 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function bzIsLunar() { return $('bzCalendar').value === 'lunar'; }
  // 把农历三下拉的变化同步成一个「便于读取」的合成值，并回显对应公历日期
  function bzSyncLunar() {
    var y = +$('bzLYear').value, m = +$('bzLMonth').value, d = +$('bzLDay').value, leap = $('bzLeap').checked;
    var echo = $('bzLunarEcho');
    if (!echo) return;
    try {
      var L = XS.Bazi && XS.Bazi.lunarToSolar ? XS.Bazi.lunarToSolar(y, m, d, leap) : null;
      echo.innerHTML = L ? ('对应公历：<b>' + esc(L) + '</b>' + (leap ? '　（闰' + ['','正','二','三','四','五','六','七','八','九','十','冬','腊'][m] + '月）' : ''))
        : '';
    } catch (e) { echo.textContent = ''; }
  }
  $('bzCalendar').addEventListener('change', function () {
    var lunar = this.value === 'lunar';
    $('bzSolarWrap').style.display = lunar ? 'none' : '';
    $('bzLunarWrap').style.display = lunar ? '' : 'none';
    $('bZLeapWrap').style.display = lunar ? '' : 'none';
    if (lunar) bzSyncLunar();
  });
  ['bzLYear', 'bzLMonth', 'bzLDay', 'bzLeap'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', bzSyncLunar);
  });
  $('bzTrueSolar').addEventListener('change', function () {
    $('bzLngWrap').style.display = this.checked ? '' : 'none';
  });

  /* ---------- 遇凶避灾 ---------- */
  var GRADE_CLS = { '吉·大': 'lv-5', '吉·中': 'lv-4', '吉·小': 'lv-4', '平': 'lv-3', '凶·小': 'lv-2', '凶·中': 'lv-2', '凶·大': 'lv-1' };
  function renderAvoid(r) {
    if (!r.ok) return '<div class="card"><p class="tag red">' + esc(r.error) + '</p></div>';
    var h = '';
    h += '<div class="card"><h2>你的盘面与用神</h2><div class="kv">'
      + '<div><span class="k">八字</span><span class="v">' + esc(r.me.pillars.join(' ')) + (r.me.hourKnown === false ? '（缺时柱）' : '') + '</span></div>'
      + '<div><span class="k">日主</span><span class="v">' + esc(r.me.dayMaster) + '（' + esc(r.me.level) + '·' + esc(r.me.yongType) + '）</span></div>'
      + '<div><span class="k">喜用</span><span class="v">' + esc(r.me.favor.join('、') || '—') + '</span></div>'
      + '<div><span class="k">忌神</span><span class="v">' + esc(r.me.avoid || '—') + '</span></div>'
      + '</div></div>';
    r.sections.forEach(function (s) {
      h += '<div class="card"><h2>' + esc(s.title) + '</h2>'
        + (s.why ? '<p class="muted" style="margin:0 0 8px">' + esc(s.why) + '</p>' : '')
        + '<ul class="plain-list">' + s.actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
    });
    if (r.day) {
      var cls = GRADE_CLS[r.day.grade ? r.day.grade.text : '平'] || 'lv-3';
      h += '<div class="card luck"><h2>具体某天：' + esc(r.day.date) + '（' + esc(r.day.week) + '）</h2>'
        + '<div class="luck-head"><div class="luck-num"><b>' + r.day.score + '</b><span>气势分</span></div>'
        + '<div class="luck-side"><div class="luck-level ' + cls + '">' + esc(r.day.grade ? r.day.grade.text : r.day.level) + '</div>'
        + '<div class="luck-meta">' + esc(r.day.ganZhi) + '日' + (r.day.isChong ? '　·　⚠ 冲你的日支' : '') + '</div></div></div>'
        + '<ul class="plain-list" style="margin-top:10px">' + r.day.acts.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
    }
    h += '<div class="card"><h2>老实说</h2><ul class="plain-list">' + r.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    return h;
  }
  $('avRun').addEventListener('click', function () {
    var b = dlBirth();
    if (!b) { toast('先填出生日期'); return; }
    var dt = $('dlDate') && $('dlDate').value ? $('dlDate').value.split('-') : null;
    try {
      var r = XS.Avoid.analyze({ birth: b, y: dt ? +dt[0] : 0, m: dt ? +dt[1] : 0, d: dt ? +dt[2] : 0 });
      $('avResult').innerHTML = renderAvoid(r);
      if (r.ok) {
        saveResult('bazi', '八字·避灾', '避灾建议 · ' + r.me.dayMaster, $('avResult').innerHTML, XS.Avoid.report(r));
        toast('避灾建议已生成');
      } else { toast(r.error); }
      window.scrollTo({ top: Math.max(0, $('avResult').getBoundingClientRect().top + window.scrollY - 70) });
    } catch (e) { $('avResult').innerHTML = '<div class="card"><p class="tag red">算不出来：' + esc(e.message) + '</p></div>'; }
  });
  $('avCopy').addEventListener('click', function () { copyText(state.lastText['八字·避灾']); });
  $('avSave').addEventListener('click', function () { downloadText('避灾建议.txt', state.lastText['八字·避灾']); });

  /* ---------- 当日运势（结合命盘） ---------- */
  var LV_CLS = { 大吉: 'lv-5', 吉: 'lv-4', 平: 'lv-3', 凶: 'lv-2', 大凶: 'lv-1' };
  function dlBirth() {
    // 必须与 baziOptions() 一致地识别农历；否则农历生日会被忽略，用公历框旧值算 → 不同人算出同样结果
    var lunar = bzIsLunar();
    var y, m, d;
    if (lunar) {
      y = +$('bzLYear').value; m = +$('bzLMonth').value; d = +$('bzLDay').value;
      if (!y || !m || !d) return null;
    } else {
      var dv = $('bzDate').value; if (!dv) return null;
      var p = dv.split('-'); y = +p[0]; m = +p[1]; d = +p[2];
    }
    var o = { y: y, m: m, d: d, gender: +$('bzGender').value, name: getAcct() };
    if (lunar) { o.calendar = 'lunar'; o.leap = $('bzLeap').checked; }
    var tv = $('bzTime').value;
    if (tv) { var t = tv.split(':'); o.h = +t[0]; o.mi = +t[1]; }
    return o;
  }
  function renderDaily(r) {
    if (!r.ok) return '<div class="card"><p class="tag red">' + esc(r.error) + '</p></div>';
    var h = '';
    h += '<div class="card luck"><h2>当日运势 · ' + esc(r.date.text) + '（' + esc(r.date.week) + '）</h2>';
    h += '<div class="luck-head"><div class="luck-num"><b>' + r.score + '</b><span>气势分</span></div>'
      + '<div class="luck-side"><div class="luck-level ' + (LV_CLS[r.level] || '') + '">' + esc(r.grade ? r.grade.text : r.level) + '</div>'
      + '<div class="luck-meta">' + esc(r.day.ganZhi) + '日　·　' + esc(r.date.lunar) + (r.adjusted ? '　·　因冲命降档' : '') + '</div></div></div>';
    h += '<div class="luck-gauge"><div class="gauge-fill ' + (LV_CLS[r.level] || '') + '" style="width:' + r.score + '%"></div></div>';
    h += '<div class="gauge-labels"><span>大凶</span><span>凶</span><span>平</span><span>吉</span><span>大吉</span></div>';
    h += '<p class="slot-sum">' + esc(r.rule) + '</p>';
    h += '<p class="muted">' + esc(r.formula) + '</p></div>';

    // 当日信息
    h += '<div class="card"><h2>这一天</h2><div class="kv">'
      + '<div><span class="k">干支</span><span class="v">' + esc(r.day.ganZhi) + '日（' + esc(r.date.lunar) + '）</span></div>'
      + '<div><span class="k">值神</span><span class="v">' + esc(r.day.tianShen) + '·' + esc(r.day.tianShenType) + '</span></div>'
      + '<div><span class="k">建除</span><span class="v">' + esc(r.day.zhiXing) + '日</span></div>'
      + '<div><span class="k">冲煞</span><span class="v">' + esc(r.day.sha) + '</span></div>'
      + '<div><span class="k">旬空</span><span class="v">' + esc(r.day.xunKong) + '</span></div>'
      + '<div><span class="k">吉神</span><span class="v">' + (r.day.jiShen.length ? esc(r.day.jiShen.slice(0, 6).join('、')) : '—') + '</span></div>'
      + '<div><span class="k">凶煞</span><span class="v">' + (r.day.xiongSha.length ? esc(r.day.xiongSha.slice(0, 6).join('、')) : '—') + '</span></div>'
      + '</div>'
      + (r.day.zhiXingNote ? '<p class="muted" style="margin-top:10px">' + esc(r.day.zhiXingNote) + '</p>' : '')
      + '</div>';

    // 逐条依据
    h += '<div class="card"><h2>凭什么这么判（逐条）</h2><table class="basis-table"><tr><th>项目</th><th>当日</th><th>含义</th><th>计分</th></tr>'
      + r.parts.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.value) + '</td><td class="doc">' + esc(p.doctrine) + '</td>'
          + '<td class="delta ' + (p.pts >= 0 ? 'up' : 'down') + '">' + (p.pts >= 0 ? '+' : '') + p.pts + '</td></tr>';
      }).join('')
      + '<tr class="total"><td colspan="3">合计 → ' + esc(r.formula) + '</td><td class="delta">' + (r.sum >= 0 ? '+' : '') + r.sum + '</td></tr></table></div>';

    // 宜忌
    h += '<div class="card"><h2>宜 / 忌</h2><div class="yi-ji">'
      + '<div><span class="yj-label yi">宜</span>' + (r.yi.length ? r.yi.map(function (x) { return '<span class="yj-item">' + esc(x) + '</span>'; }).join('') : '<span class="muted">—</span>') + '</div>'
      + '<div><span class="yj-label ji">忌</span>' + (r.ji.length ? r.ji.map(function (x) { return '<span class="yj-item">' + esc(x) + '</span>'; }).join('') : '<span class="muted">—</span>') + '</div>'
      + '</div></div>';

    // 个人提示
    if (r.notes.length) {
      h += '<div class="card"><h2>对你说的话</h2><ul class="plain-list">'
        + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
    }

    // 时辰
    h += '<div class="card"><h2>十二时辰吉凶</h2><div class="hour-grid">'
      + r.hours.rows.map(function (x) {
        var cls = x.huang ? 'ok' : 'bad';
        if (x.zhi === r.hours.best.zhi) cls += ' best';
        if (x.zhi === r.hours.worst.zhi) cls += ' worst';
        return '<div class="hour-cell ' + cls + '"><b>' + esc(x.zhi) + '时</b><i>' + esc(x.range) + '</i><span>' + esc(x.tianShen) + '</span>'
          + (x.zhi === r.hours.best.zhi ? '<em>最好</em>' : x.zhi === r.hours.worst.zhi ? '<em>最差</em>' : '') + '</div>';
      }).join('') + '</div>'
      + '<p class="muted">吉时 ' + r.hours.bestHours.length + ' 个：' + esc(r.hours.bestHours.join('、'))
      + '；最好 ' + esc(r.hours.best.zhi) + '时 ' + esc(r.hours.best.range) + '（' + esc(r.hours.best.tianShen) + '）'
      + '，最差 ' + esc(r.hours.worst.zhi) + '时 ' + esc(r.hours.worst.range) + '（' + esc(r.hours.worst.tianShen) + '）</p></div>';

    h += interpCard(XS.Interp.daily ? XS.Interp.daily(r) : { headline: r.level + ' · ' + r.score + ' 分', sections: [], tips: [] });
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    return h;
  }
  function dlShow(r, label) {
    $('dlResult').innerHTML = renderDaily(r);
    if (r.ok) {
      saveResult('bazi', '八字·当日运势', label, $('dlResult').innerHTML, XS.Daily.report(r));
      toast('当日运势：' + r.level + ' · ' + r.score + ' 分');
    } else { toast(r.error); }
  }
  $('dlRun').addEventListener('click', function () {
    var b = dlBirth(); if (!b) { toast('先填出生日期'); return; }
    var d = $('dlDate').value; if (!d) { toast('先选日期'); return; }
    var p = d.split('-');
    try { dlShow(XS.Daily.daily({ y: +p[0], m: +p[1], d: +p[2], birth: b }), d); }
    catch (e) { $('dlResult').innerHTML = '<div class="card"><p class="tag red">算不出来：' + esc(e.message) + '</p></div>'; }
  });
  $('dlToday').addEventListener('click', function () {
    var t = new Date(); $('dlDate').value = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    $('dlRun').click();
  });
  var dlCache = {};   // 日期 → 当日结果缓存（点开详情不用重算）
  function dlRowHtml(r, i, clickable) {
    return '<div class="week-row' + (i === 0 ? ' today' : '') + (clickable ? ' clickable' : '') + '"'
      + (clickable ? ' data-d="' + r.date.text + '"' : '') + '>'
      + '<span class="wk-date">' + esc(r.date.text.slice(5)) + ' ' + esc(r.date.week) + '</span>'
      + '<span class="wk-gz">' + esc(r.day.ganZhi) + '</span>'
      + '<span class="wk-lv ' + (LV_CLS[r.level] || '') + '">' + esc(r.grade ? r.grade.text : r.level) + '</span>'
      + '<span class="wk-score">' + r.score + '</span>'
      + '<span class="wk-rule">' + esc(r.day.tianShen + r.day.tianShenType + ' · ' + r.day.zhiXing + '日') + '</span>'
      + (clickable ? '<span class="wk-go">详情 ›</span>' : '')
      + '</div>';
  }
  function dlWeekHtml(rows, title, note) {
    var best = rows.slice().sort(function (a, b) { return b.score - a.score; })[0];
    return '<div class="card"><h2>' + esc(title) + '</h2>'
      + '<p class="muted" style="margin:0 0 10px">' + esc(note) + '　这几天最好的是 <b>' + esc(best.date.text) + '</b>（' + esc(best.level) + ' ' + best.score + ' 分）</p>'
      + '<div class="week-list">' + rows.map(function (r, i) { return dlRowHtml(r, i, true); }).join('') + '</div></div>';
  }
  function dlRenderList(rows, title, note) {
    rows.forEach(function (r) { dlCache[r.date.text] = r; });
    $('dlResult').innerHTML = dlWeekHtml(rows, title, note);
    var txt = rows.map(function (r) { return r.date.text + ' ' + r.date.week + ' ' + r.day.ganZhi + ' ' + r.level + ' ' + r.score + '分'; }).join('\n');
    saveResult('bazi', '八字·' + title, title, $('dlResult').innerHTML, txt);
    window.scrollTo({ top: Math.max(0, $('dlResult').getBoundingClientRect().top + window.scrollY - 60) });
  }
  $('dlWeek').addEventListener('click', function () {
    var b = dlBirth(); if (!b) { toast('先填出生日期'); return; }
    var me = XS.Daily.prep(b); if (!me || !me.ok) { toast('命盘排不出来'); return; }
    var t = new Date(); var rows = [];
    for (var i = 0; i < 7; i++) {
      var dt = new Date(t.getTime()); dt.setDate(dt.getDate() + i);
      rows.push(XS.Daily.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), me: me }));
    }
    dlRenderList(rows, '未来 7 天运势', '点任意一天看详情。');
    toast('已排出未来 7 天');
  });

  /* ---------- 本月最佳日子 ---------- */
  $('dlMonth').addEventListener('click', function () {
    var b = dlBirth(); if (!b) { toast('先填出生日期'); return; }
    var me = XS.Daily.prep(b); if (!me || !me.ok) { toast('命盘排不出来'); return; }
    var ref = $('dlDate').value ? new Date($('dlDate').value) : new Date();
    var y = ref.getFullYear(), mo = ref.getMonth();
    var days = new Date(y, mo + 1, 0).getDate();
    var rows = [];
    for (var d = 1; d <= days; d++) rows.push(XS.Daily.daily({ y: y, m: mo + 1, d: d, me: me }));
    var sorted = rows.slice().sort(function (a, b2) { return b2.score - a.score; });
    var best = sorted.slice(0, 5), worst = sorted.slice(-3).reverse();
    var dist = {}; rows.forEach(function (r) { dist[r.level] = (dist[r.level] || 0) + 1; });

    var h = '<div class="card"><h2>' + y + ' 年 ' + (mo + 1) + ' 月 · 最佳日子</h2>';
    h += '<p class="muted" style="margin:0 0 10px">按气势分排序（判档仍看规则）。本月档位分布：'
      + ['大吉','吉','平','凶','大凶'].map(function (k) { return k + ' ' + (dist[k] || 0) + ' 天'; }).join('　') + '</p>';
    h += '<div class="best-grid">';
    h += '<div class="best-col"><h3>最宜（前 5）</h3>' + best.map(function (r, i) {
      return '<div class="best-row clickable" data-d="' + r.date.text + '">'
        + '<span class="bp-no">' + (i + 1) + '</span>'
        + '<span class="bp-date">' + esc(r.date.text.slice(5)) + ' ' + esc(r.date.week) + '</span>'
        + '<span class="bp-gz">' + esc(r.day.ganZhi) + '</span>'
        + '<span class="bp-lv ' + (LV_CLS[r.level] || '') + '">' + esc(r.grade ? r.grade.text : r.level) + '</span>'
        + '<span class="bp-score">' + r.score + '</span>'
        + '<span class="bp-go">›</span></div>';
    }).join('') + '</div>';
    h += '<div class="best-col"><h3>宜避（后 3）</h3>' + worst.map(function (r) {
      return '<div class="best-row clickable" data-d="' + r.date.text + '">'
        + '<span class="bp-no">·</span>'
        + '<span class="bp-date">' + esc(r.date.text.slice(5)) + ' ' + esc(r.date.week) + '</span>'
        + '<span class="bp-gz">' + esc(r.day.ganZhi) + '</span>'
        + '<span class="bp-lv ' + (LV_CLS[r.level] || '') + '">' + esc(r.grade ? r.grade.text : r.level) + '</span>'
        + '<span class="bp-score">' + r.score + '</span>'
        + '<span class="bp-go">›</span></div>';
    }).join('') + '</div></div></div>';

    // 日历热力图
    h += '<div class="card"><h2>本月日历（颜色＝档位）</h2><div class="cal-grid">'
      + ['日','一','二','三','四','五','六'].map(function (w) { return '<div class="cal-head">' + w + '</div>'; }).join('');
    var firstDow = new Date(y, mo, 1).getDay();
    for (var i = 0; i < firstDow; i++) h += '<div class="cal-cell empty"></div>';
    rows.forEach(function (r) {
      var dd = +r.date.text.slice(-2);
      h += '<div class="cal-cell clickable lv-' + (r.levelIdx || 3) + '" data-d="' + r.date.text + '" title="' + esc(r.date.text + ' ' + r.level + ' ' + r.score + '分') + '">'
        + '<b>' + dd + '</b><i>' + esc(r.grade ? r.grade.text : r.level) + '</i></div>';
    });
    h += '</div><p class="muted">点任意一天看详情。颜色越暖越好（大吉深金 → 大凶深红）。</p></div>';

    $('dlResult').innerHTML = h;
    var txt = '【' + y + '年' + (mo + 1) + '月最佳日子】\n最宜：' + best.map(function (r) { return r.date.text + '(' + r.level + r.score + ')'; }).join('、')
      + '\n宜避：' + worst.map(function (r) { return r.date.text + '(' + r.level + r.score + ')'; }).join('、')
      + '\n分布：' + Object.keys(dist).map(function (k) { return k + dist[k]; }).join(' ');
    saveResult('bazi', '八字·本月最佳', y + '年' + (mo + 1) + '月最佳日子', h, txt);
    toast('本月最宜：' + best[0].date.text + '（' + best[0].level + ' ' + best[0].score + ' 分）');
    window.scrollTo({ top: Math.max(0, $('dlResult').getBoundingClientRect().top + window.scrollY - 60) });
  });

  /* ---------- 点任意一天看详情（列表/日历/最佳榜通用） ---------- */
  $('dlResult').addEventListener('click', function (e) {
    var el = e.target.closest('[data-d]'); if (!el) return;
    var dstr = el.getAttribute('data-d');
    var r = dlCache[dstr];
    if (!r) {
      var b = dlBirth(); if (!b) { toast('先填出生日期'); return; }
      var p = dstr.split('-');
      r = XS.Daily.daily({ y: +p[0], m: +p[1], d: +p[2], birth: b });
      if (!r.ok) { toast(r.error); return; }
      dlCache[dstr] = r;
    }
    $('dlDate').value = dstr;
    var h = '<div class="dl-back"><button class="ghost" id="dlBack" type="button">← 返回列表</button>'
      + '<span class="muted">' + esc(dstr) + ' 详情</span></div>' + renderDaily(r);
    var keep = $('dlResult').innerHTML;
    $('dlResult').innerHTML = h;
    saveResult('bazi', '八字·当日运势', dstr, h, XS.Daily.report(r));
    $('dlBack').addEventListener('click', function () { $('dlResult').innerHTML = keep; });
    window.scrollTo({ top: Math.max(0, $('dlResult').getBoundingClientRect().top + window.scrollY - 60) });
  });
  $('dlCopy').addEventListener('click', function () { copyText(state.lastText['八字·当日运势']); });
  $('dlSave').addEventListener('click', function () { downloadText('当日运势.txt', state.lastText['八字·当日运势']); });
  (function dlInit() { var t = new Date(); $('dlDate').value = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); })();

  function baziOptions() {
    var lunar = bzIsLunar();
    var dt;
    if (lunar) {
      // 农历：直接用三下拉，不走 <input type=date>
      dt = { y: +$('bzLYear').value, m: +$('bzLMonth').value, d: +$('bzLDay').value };
    } else {
      var bd = $('bzDate').value.split('-');
      dt = { y: +bd[0], m: +bd[1], d: +bd[2] };
    }
    var btv = $('bzTime').value;
    if (btv) { var bt = btv.split(':'); dt.h = +bt[0]; dt.mi = +bt[1]; }
    return {
      y: dt.y, m: dt.m, d: dt.d, h: dt.h, mi: dt.mi,
      calendar: $('bzCalendar').value, leap: lunar ? $('bzLeap').checked : false,
      name: getAcct(),
      gender: +$('bzGender').value, sect: $('bzSect').checked ? 1 : 2,
      trueSolar: $('bzTrueSolar').checked, lng: +$('bzLng').value
    };
  }

  function renderBazi(r) {
    state.bazi = r; state.dayunIdx = 0;
    var WX = XS.Bazi.WX;
    var maxScore = Math.max.apply(null, WX.map(function (k) { return r.wuXing.score[k]; })) || 1;
    var h = '';

    // 基本信息
    h += '<div class="card"><h2>基本信息' + (r.name ? '　·　' + esc(r.name) : '') + '</h2><div class="kv">';
    h += '<div><span class="k">公历</span><span class="v">'
      + esc(r.hourKnown === false ? r.solar.ymd : r.solar.text) + '（' + esc(r.solar.week) + '）</span></div>';
    h += '<div><span class="k">农历</span><span class="v">' + esc(r.lunar.text) + '</span></div>';
    h += '<div><span class="k">生肖</span><span class="v">' + esc(r.lunar.yearGanZhi) + '</span></div>';
    h += r.hourKnown === false
      ? '<div><span class="k">时辰</span><span class="v" style="color:var(--zhu)">未填（不做时柱判断）</span></div>'
      : '<div><span class="k">时辰</span><span class="v">' + esc(r.lunar.timeZhi) + '时</span></div>';
    h += '<div><span class="k">星座</span><span class="v">' + esc(r.lunar.xingZuo) + '</span></div>';
    h += '<div><span class="k">性别</span><span class="v">' + esc(r.genderText) + '</span></div>';
    if (r.lunar.jieQi) h += '<div><span class="k">节气</span><span class="v">' + esc(r.lunar.jieQi.prev.name + ' ' + r.lunar.jieQi.prev.time.slice(0, 16)) + '</span></div>';
    h += '<div><span class="k">日主</span><span class="v ' + wxCls(r.dayMaster.wuXing) + '">' + esc(r.dayMaster.gan + r.dayMaster.wuXing) + '（' + esc(r.dayMaster.yinYang) + '）</span></div>';
    h += '</div>';
    if (r.trueSolarInfo) {
      h += '<p class="muted" style="margin:10px 0 0">真太阳时校正：' + esc(r.trueSolarInfo.from) + ' → <b>' + esc(r.trueSolarInfo.to) + '</b>'
        + '（经度 ' + r.trueSolarInfo.lng + '°，均时差 ' + r.trueSolarInfo.eot.toFixed(1) + ' 分，经度差 ' + (r.trueSolarInfo.lngDelta >= 0 ? '+' : '') + r.trueSolarInfo.lngDelta.toFixed(1) + ' 分）</p>';
    }
    h += '</div>';

    // 四柱
    h += '<div class="card"><h2>四柱八字</h2><div style="overflow-x:auto"><table class="pillar">';
    h += '<tr><th></th>' + r.pillars.map(function (p) { return '<th>' + p.name + '</th>'; }).join('') + '</tr>';
    h += '<tr><th>干支</th>' + r.pillars.map(function (p) {
      return '<td class="ganGZ"' + (p.name === '时柱' && r.hourKnown === false ? ' title="时辰未填，时柱不计入强弱"' : '') + '><span class="' + wxCls(p.ganWuXing) + '">' + p.gan + '</span><br><span class="' + wxCls(p.zhiWuXing) + '">' + p.zhi + '</span></td>'; }).join('') + '</tr>';
    h += '<tr><th>十神</th>' + r.pillars.map(function (p) { return '<td>' + esc(p.ganShiShen || '—') + '</td>'; }).join('') + '</tr>';
    h += '<tr><th>藏干</th>' + r.pillars.map(function (p) {
      return '<td>' + p.hideGan.map(function (g2) { return '<span class="' + wxCls(g2.wuXing) + '">' + g2.gan + '</span><span class="muted">' + g2.shiShen + '</span>'; }).join('<br>') + '</td>'; }).join('') + '</tr>';
    h += '<tr><th>纳音</th>' + r.pillars.map(function (p) { return '<td>' + esc(p.naYin) + '</td>'; }).join('') + '</tr>';
    h += '<tr><th>地势</th>' + r.pillars.map(function (p) { return '<td>' + esc(p.diShi) + '</td>'; }).join('') + '</tr>';
    h += '<tr><th>旬空</th>' + r.pillars.map(function (p) { return '<td class="muted">' + esc(p.xunKong) + '</td>'; }).join('') + '</tr>';
    h += '</table></div>';

    h += '<h2 style="margin-top:20px">五行力量</h2><div class="wx-bar-wrap">';
    WX.forEach(function (k) {
      var v = r.wuXing.score[k] || 0, pct = Math.round(v / maxScore * 100);
      h += '<div class="wx-bar"><div class="track"><div class="fill f-' + k + '" style="height:' + pct + '%"></div></div>'
        + '<div class="name ' + wxCls(k) + '">' + k + '</div><div class="val">' + v.toFixed(2) + '</div></div>';
    });
    h += '</div>';
    h += '<p class="muted" style="margin-top:10px">缺（计分＜0.35）：' + (r.wuXing.missing.length ? r.wuXing.missing.join('、') : '无明显缺') + '　｜　同党 ' + r.wuXing.sameScore.toFixed(2) + '　异党 ' + r.wuXing.otherScore.toFixed(2) + '</p>';
    h += '</div>';

    // 旺衰取用 + 神煞
    h += '<div class="grid2">';
    h += '<div class="card"><h2>日主旺衰</h2>';
    h += '<p><b class="' + wxCls(r.dayMaster.wuXing) + '">' + esc(r.dayMaster.gan + ' ' + r.dayMaster.wuXing) + '</b> 日主判定：<span class="tag gold">' + esc(r.strength.level) + '</span>'
      + '<span class="tag">得令 ' + (r.strength.deLing ? '✔' : '✘') + '</span><span class="tag">得地 ' + (r.strength.deDi ? '✔' : '✘') + '</span><span class="tag">得势 ' + (r.strength.deShi ? '✔' : '✘') + '</span></p>';
    h += '<p class="muted">同党（比劫＋印）' + r.strength.sameScore.toFixed(2) + '　异党（食伤＋财＋官杀）' + r.strength.otherScore.toFixed(2)
      + '　比值 ' + (r.strength.ratio * 100).toFixed(1) + '%</p>';
    h += '<p style="margin-top:8px">取用倾向：' + esc(r.strength.yongHint.text) + '</p>';
    h += '</div>';
    h += '<div class="card"><h2>神煞</h2><div>' + r.shenSha.map(function (s) {
      return '<span class="tag" title="' + esc(s.note || '') + '">' + esc(s.name) + ' ' + esc(s.zhi) + '</span>'; }).join('') + '</div>'
      + '<ul class="plain muted" style="margin-top:10px">' + r.shenSha.map(function (s) {
        return '<li>' + esc(s.name) + '（' + esc(s.ref) + '）→ ' + esc(s.zhi) + (s.pillars ? '　落' + esc(s.pillars) : '') + (s.note ? '　' + esc(s.note) : '') + '</li>'; }).join('') + '</ul></div>';
    h += '</div>';

    // 大运
    h += '<div class="card"><h2>大运流年</h2>';
    h += '<p class="muted">' + (r.yun.forward ? '顺行' : '逆行') + '起运：出生后 ' + esc(r.yun.startText) + '，交运日 ' + esc(r.yun.startSolar) + '（点击大运查看该运流年）</p>';
    h += '<div class="dayun-strip" id="dayunStrip">';
    r.yun.daYun.forEach(function (d, i) {
      h += '<div class="dayun" data-i="' + i + '"><div class="gz">' + (d.ganZhi || '—') + '</div>'
        + '<div class="age">' + (d.isBeforeStart ? '起运前' : d.startAge + '-' + d.endAge + '岁') + '</div>'
        + '<div class="age">' + d.startYear + '-' + d.endYear + '</div>'
        + '<div class="ss">' + esc(d.shiShen || '') + '</div></div>';
    });
    h += '</div><div id="liunianBox"></div></div>';

    // 其他
    h += '<div class="card"><h2>胎元命宫等</h2><div class="kv">'
      + '<div><span class="k">胎元</span><span class="v">' + esc(r.extras.taiYuan) + '（' + esc(r.extras.taiYuanNaYin) + '）</span></div>'
      + '<div><span class="k">胎息</span><span class="v">' + esc(r.extras.taiXi) + '（' + esc(r.extras.taiXiNaYin) + '）</span></div>'
      + '<div><span class="k">命宫</span><span class="v">' + esc(r.extras.mingGong) + '（' + esc(r.extras.mingGongNaYin) + '）</span></div>'
      + '<div><span class="k">身宫</span><span class="v">' + esc(r.extras.shenGong) + '（' + esc(r.extras.shenGongNaYin) + '）</span></div>'
      + '</div></div>';

    // 算法口径
    h += '<div class="card"><h2>本次口径</h2><ul class="plain muted">'
      + Object.keys(r.rules).map(function (k) { return '<li>' + esc(k) + '：' + esc(r.rules[k]) + '</li>'; }).join('') + '</ul></div>';

    h += interpCard(XS.Interp.bazi(r));
    return h;
  }

  function renderLiunian(idx) {
    var r = state.bazi; if (!r) return;
    var d = r.yun.daYun[idx]; if (!d) return;
    var box = $('liunianBox'); if (!box) return;
    if (!d.liuNian || !d.liuNian.length) { box.innerHTML = '<p class="muted">起运前无流年（该段为出生至交运）。</p>'; return; }
    var thisYear = new Date().getFullYear();
    box.innerHTML = '<h2 style="margin-top:14px">' + esc(d.ganZhi) + ' 运流年（' + d.startAge + '-' + d.endAge + '岁）</h2><div class="liunian-grid">'
      + d.liuNian.map(function (n) {
        return '<div class="liunian' + (n.year === thisYear ? ' thisyear' : '') + '"><div class="gz">' + esc(n.ganZhi) + '</div>'
          + '<div class="muted">' + n.year + '</div><div>' + esc(n.age) + '岁</div><div class="muted">' + esc(n.shiShen) + '</div></div>'; }).join('')
      + '</div>';
    document.querySelectorAll('#dayunStrip .dayun').forEach(function (n) { n.classList.toggle('active', +n.dataset.i === idx); });
  }

  function bindDayun() {
    var strip = $('dayunStrip'); if (!strip) return;
    strip.addEventListener('click', function (e) {
      var d = e.target.closest('.dayun'); if (!d) return;
      renderLiunian(+d.dataset.i);
    });
    var cur = 0;
    state.bazi.yun.daYun.forEach(function (d, i) { if (d.ganZhi && new Date().getFullYear() >= d.startYear && new Date().getFullYear() <= d.endYear) cur = i; });
    renderLiunian(cur);
  }

  $('bzRun').addEventListener('click', function () {
    try {
      var opts0 = baziOptions();
      try { localStorage.setItem('xiangshu.bazi.input', JSON.stringify(opts0)); } catch (e0) {}
      var r = XS.Bazi.paipan(opts0);
      var html = renderBazi(r);
      $('bzResult').innerHTML = html;
      bindDayun();
      var text = XS.Bazi.report(r);
      saveResult('bazi', '生辰八字', (r.name ? r.name + ' · ' : '') + r.pillars.map(function (p) { return p.ganZhi; }).join(' ') + '（' + r.solar.ymd + ' ' + r.genderText + '）', html, text);
      toast('排盘完成');
    } catch (e) { $('bzResult').innerHTML = '<div class="card"><p class="tag red">排盘失败：' + esc(e.message) + '</p></div>'; }
  });
  $('bzCopy').addEventListener('click', function () { copyText(state.lastText.bazi); });
  $('bzSave').addEventListener('click', function () { downloadText('八字排盘.txt', state.lastText.bazi); });

  /* ============================================================
   *  二、梅花易数
   * ============================================================ */
  $('mhDate').value = todayStr();
  $('mhTime').value = nowTimeStr();
  (function fillGuaSelects() {
    var opts = XS.Data.BAGUA.map(function (b) { return '<option value="' + b.name + '">' + b.name + '（' + b.nature + '·' + b.wx + '）</option>'; }).join('');
    $('mhUpper').innerHTML = opts; $('mhLower').innerHTML = opts;
    $('mhUpper').value = '乾'; $('mhLower').value = '坤';
  })();
  $('mhMethod').addEventListener('change', function () {
    var v = this.value;
    $('mhTimeFields').style.display = v === 'time' ? '' : 'none';
    $('mhNumberFields').style.display = v === 'numbers' ? '' : 'none';
    $('mhTextField').style.display = v === 'text' ? '' : 'none';
    $('mhManualFields').style.display = v === 'manual' ? '' : 'none';
  });

  function renderMeihuaBody(r) {
    var h = '';
    h += '<div class="card"><h2>起卦</h2><p><span class="tag gold">' + esc(r.methodText) + '</span></p><ul class="plain muted">'
      + r.calc.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
    if (r.lunarDetail) h += '<p class="muted">时间：' + esc(r.solarText) + '　农历 ' + esc(r.lunarDetail) + '</p>';
    h += '</div>';

    var gb = function (title, g, withMoving) {
      return '<div class="gua-box"><div class="title">' + title + '</div>' + guaLinesHtml(g.lines, withMoving ? r.moving : 0)
        + '<div class="name">' + esc(g.name) + '</div>'
        + '<div class="badge">' + esc(g.lower.name) + '下' + esc(g.upper.name) + '上</div>'
        + '<div class="mean">' + esc(g.meaning) + '</div></div>';
    };
    h += '<div class="card"><h2>卦象（本·互·变）</h2><div class="gua-row">'
      + gb('本卦', r.ben, true) + gb('互卦（过程）', r.hu, false) + gb('变卦（结果）', r.bian, false)
      + '</div><p class="muted" style="text-align:center;margin-top:12px">动爻：第 ' + r.moving + ' 爻（' + ['初','二','三','四','五','上'][r.moving-1] + '爻动）</p></div>';

    var j = r.judge;
    var cls = j.level.indexOf('吉') >= 0 ? 'green' : j.level.indexOf('凶') >= 0 ? 'red' : 'gold';
    h += '<div class="grid2"><div class="card"><h2>体用分析</h2>'
      + '<p>体卦 <b class="' + wxCls(r.tiYong.ti.wx) + '">' + esc(r.tiYong.ti.name) + '(' + r.tiYong.ti.wx + ')</b>　用卦 <b class="' + wxCls(r.tiYong.yong.wx) + '">' + esc(r.tiYong.yong.name) + '(' + r.tiYong.yong.wx + ')</b></p>'
      + '<p>关系：<span class="tag ' + cls + '">' + esc(j.rel) + ' · ' + esc(j.level) + '</span></p>'
      + '<p>' + esc(j.text) + '</p>';
    if (r.wangShuai) {
      h += '<p class="muted">月令：' + esc(r.wangShuai.monthZhi) + '月（' + esc(r.wangShuai.season) + '·' + esc(r.wangShuai.monthWx) + '当令）　体卦' + esc(r.wangShuai.ti) + '　用卦' + esc(r.wangShuai.yong) + '　变卦' + esc(r.wangShuai.bian) + '</p>';
    }
    h += '<p style="margin-top:10px">综合倾向：<span class="tag ' + cls + '">' + esc(r.overall) + '</span></p>';
    h += '</div>';

    h += '<div class="card"><h2>推断依据</h2><ul class="note-list">'
      + r.reasons.map(function (x) { return '<li>' + esc(x).replace(/【(.+?)】/g, '<b>【$1】</b>') + '</li>'; }).join('') + '</ul></div></div>';

    h += '<div class="card"><h2>取象与应期参考</h2><ul class="plain">'
      + r.xiangHint.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
      + '<p class="muted" style="margin-top:10px">应期参考：' + esc(r.yingQi.byNum) + '</p>'
      + '<p class="muted">' + esc(r.yingQi.byWx) + '</p></div>';

    h += interpCard(XS.Interp.meihua(r));
    return h;
  }


  var MH_LV_CLS = { '大吉': 'lv-5', '吉': 'lv-4', '小吉': 'lv-4', '中平': 'lv-3', '小凶': 'lv-2', '凶': 'lv-2', '大凶': 'lv-1' };
  function renderMeihua(r) {
    var head = '';
    if (r && r.combo) {
      var c = r.combo;
      head += '<div class="card luck"><h2>结论：' + esc(c.level) + '</h2>'
        + '<div class="luck-head"><div class="luck-num"><b>' + c.sum + '</b><span>综合分</span></div>'
        + '<div class="luck-side"><div class="luck-level ' + (MH_LV_CLS[c.level] || 'lv-3') + '">' + esc(c.level) + '</div>'
        + '<div class="luck-meta">' + esc(r.ben.name) + ' → ' + esc(r.bian.name) + '　·　' + esc(r.overall) + '</div></div></div>'
        + '<div class="luck-gauge"><div class="gauge-fill ' + (MH_LV_CLS[c.level] || 'lv-3') + '" style="width:' + Math.max(5, Math.min(100, 50 + c.sum * 4)) + '%"></div></div>'
        + '<p class="muted" style="margin-top:10px">结论不是只看体用生克，而是四层加权（体用 → 月令 → 互卦 → 变卦）：</p>'
        + '<div class="ly-scroll"><table class="basis-table"><tr><th>层次</th><th>情况</th><th>含义</th><th>计分</th></tr>'
        + c.parts.map(function (p) {
          return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.value) + '</td><td class="doc">' + esc(p.why) + '</td>'
            + '<td class="delta ' + (p.pts >= 0 ? 'up' : 'down') + '">' + (p.pts >= 0 ? '+' : '') + p.pts + '</td></tr>';
        }).join('')
        + '<tr class="total"><td colspan="3">合计</td><td class="delta">' + (c.sum >= 0 ? '+' : '') + c.sum + ' → ' + esc(c.level) + '</td></tr></table></div></div>';
    }
    return head + renderMeihuaBody(r);
  }

  $('mhRun').addEventListener('click', function () {
    try {
      var m = $('mhMethod').value, opt = { method: m };
      if (m === 'time') { var dt = splitDateTime($('mhDate').value + 'T' + ($('mhTime').value || '12:00')); opt.y = dt.y; opt.m = dt.m; opt.d = dt.d; opt.h = dt.h; opt.mi = dt.mi; }
      if (m === 'numbers') { opt.n1 = $('mhN1').value; opt.n2 = $('mhN2').value; opt.n3 = $('mhN3').value; }
      if (m === 'text') { opt.text = $('mhText').value; }
      if (m === 'manual') { opt.method = 'numbers'; }
      var r;
      if (m === 'manual') {
        r = XS.Meihua.fromGua($('mhUpper').value, $('mhLower').value, +$('mhMoving').value);
      } else {
        r = XS.Meihua.qiGua(opt);
      }
      if (!r.ok) { toast(r.error || '起卦失败'); return; }
      var html = renderMeihua(r);
      $('mhResult').innerHTML = html;
      var text = XS.Meihua.report(r);
      saveResult('meihua', '梅花易数', r.ben.name + ' → 变' + r.bian.name + '（' + r.methodText + '）', html, text);
      toast('起卦完成');
    } catch (e) { $('mhResult').innerHTML = '<div class="card"><p class="tag red">起卦失败：' + esc(e.message) + '</p></div>'; }
  });
  $('mhCopy').addEventListener('click', function () { copyText(state.lastText.meihua); });
  $('mhSave').addEventListener('click', function () { downloadText('梅花易数.txt', state.lastText.meihua); });

  /* ============================================================
   *  三、六爻纳甲
   * ============================================================ */
  $('lyTime').value = nowLocalInput();
  (function fillTopics() {
    var sel = $('lyTopic'), keys = Object.keys(XS.Liuyao.YONG_SHEN_BY_TOPIC);
    sel.innerHTML = '<option value="">（不定用神，只排盘）</option>' + keys.map(function (k) {
      return '<option value="' + k + '">' + k + ' → ' + XS.Liuyao.YONG_SHEN_BY_TOPIC[k] + '</option>'; }).join('');
  })();
  var lyCoins = [];
  function renderCoinRows() {
    var box = $('lyCoinRows'), POSN = XS.Liuyao.POS;
    var h = '';
    for (var i = 0; i < 6; i++) {
      var c = lyCoins[i];
      if (!c) { h += '<div class="coin-row pending"><span class="pos">' + POSN[i] + '</span><span class="coins">'
        + '<span class="coin">?</span><span class="coin">?</span><span class="coin">?</span></span><span class="res">未摇</span></div>'; continue; }
      var t = XS.Liuyao.coinYao(c);
      var names = { 6:'老阴 ✕ 动', 7:'少阳 ▅▅▅', 8:'少阴 ▅ ▅', 9:'老阳 ○ 动' };
      h += '<div class="coin-row"><span class="pos">' + POSN[i] + '</span><span class="coins">'
        + c.map(function (x) { return '<span class="coin' + (x ? ' back' : '') + '">' + (x ? '背3' : '正2') + '</span>'; }).join('')
        + '</span><span class="res">' + names[t] + '</span></div>';
    }
    box.innerHTML = h;
    $('lyYaoBtn').textContent = lyCoins.length >= 6 ? '六爻已满，可排盘' : '摇第' + ['一','二','三','四','五','六'][lyCoins.length] + '爻';
    $('lyYaoBtn').disabled = lyCoins.length >= 6;
  }
  $('lyYaoBtn').addEventListener('click', function () {
    if (lyCoins.length >= 6) return;
    var c = [Math.random() < .5 ? 0 : 1, Math.random() < .5 ? 0 : 1, Math.random() < .5 ? 0 : 1];
    lyCoins.push(c); renderCoinRows();
    if (lyCoins.length === 6) { toast('六爻已摇满，点「排盘」出结果'); }
  });
  $('lyReset').addEventListener('click', function () { lyCoins = []; renderCoinRows(); });
  renderCoinRows();

  (function fillManualRows() {
    var POSN = XS.Liuyao.POS, h = '';
    for (var i = 0; i < 6; i++) {
      h += '<label class="field"><span>' + POSN[i] + '</span><select class="ly-manual" data-i="' + i + '">'
        + '<option value="7">少阳 ▅▅▅（静）</option><option value="8">少阴 ▅ ▅（静）</option>'
        + '<option value="9">老阳 ○（动）</option><option value="6">老阴 ✕（动）</option></select></label>';
    }
    $('lyManualRows').innerHTML = h;
  })();

  $('lyMethod').addEventListener('change', function () {
    var v = this.value;
    $('lyCoinArea').style.display = (v === 'coins') ? '' : 'none';
    $('lyManualArea').style.display = (v === 'manual') ? '' : 'none';
    $('lyNumberArea').style.display = (v === 'numbers') ? '' : 'none';
  });

  // 五行关系（app.js 内没有 rel，这里自带一份）
  function wxRel(a, b) {
    if (!a || !b) return '';
    if (a === b) return '比和';
    var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
    if (SHENG[b] === a) return '生我';
    if (SHENG[a] === b) return '我生';
    if (KE[b] === a) return '克我';
    if (KE[a] === b) return '我克';
    return '';
  }

  // 五行表（app.js 内自备，避免依赖 XS.Data 的导出名）
  var GAN_WX_A = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var ZHI_WX_A = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

  // 真正的旺衰：月建（地支五行）+ 日辰（天干五行）对某一爻是生/克/同，再加旬空、动爻
  function yaoWangShuai(y, monthGZ, dayGZ) {
    var mZhi = monthGZ ? monthGZ.charAt(1) : '';
    var dGan = dayGZ ? dayGZ.charAt(0) : '';
    var mWx = ZHI_WX_A[mZhi] || '';
    var dWx = GAN_WX_A[dGan] || '';
    var s = 0, why = [];
    function add(pts, txt) { s += pts; if (txt) why.push(txt); }
    var rm = wxRel(y.wx, mWx);
    if (rm === '比和') add(2, '临月建（' + mZhi + mWx + '）');
    else if (rm === '生我') add(1.5, '月建（' + mZhi + mWx + '）生之');
    else if (rm === '克我') add(-1.5, '月建（' + mZhi + mWx + '）克之');
    else if (rm === '我克') add(-1, '爻克月建');
    else if (rm === '我生') add(-0.5, '爻生月建（泄气）');
    var rd = wxRel(y.wx, dWx);
    if (rd === '比和') add(2, '临日辰（' + dGan + dWx + '）');
    else if (rd === '生我') add(1.5, '日辰（' + dGan + dWx + '）生之');
    else if (rd === '克我') add(-1.5, '日辰（' + dGan + dWx + '）克之');
    else if (rd === '我克') add(-1, '爻克日辰');
    else if (rd === '我生') add(-0.5, '爻生日辰（泄气）');
    if (y.kong) add(-1.5, '旬空');
    if (y.moving) add(0.5, '动爻（有变、稍有力）');
    var state = s >= 2.5 ? '有力' : (s <= -2.5 ? '无力' : '中平');
    return { score: s, state: state, why: why };
  }

  function renderLiuyao(r, yong) {
    var h = '';

    /* ---------- 看不懂？先看这张卡：人话结论 ---------- */
    (function () {
      var shi = r.yao[r.ben.shi - 1], ying = r.yao[r.ben.ying - 1];
      var sr = wxRel(shi.wx, ying.wx);
      var dong = r.yao.filter(function (y) { return y.moving; });
      // 真·旺衰：月建/日辰对世爻生克 + 旬空 + 动爻
      var ws = yaoWangShuai(shi, r.time.monthGanZhi, r.time.dayGanZhi);
      var verdict, verdictCls, plain;
      if (ws.state === '有力' && (sr === '生我' || sr === '比和')) { verdict = '吉'; verdictCls = 'lv-4'; plain = '你自己这一爻有气，对方或环境又帮你——事情顺，可以做。'; }
      else if (ws.state === '有力') { verdict = '偏吉'; verdictCls = 'lv-4'; plain = '你自己这爻有底气，虽然和对方关系一般，靠自己也能推得动。'; }
      else if (ws.state === '中平' && sr === '生我') { verdict = '偏吉'; verdictCls = 'lv-4'; plain = '你这爻不旺不弱，但对方/环境来生你——有人帮，值得一试。'; }
      else if (ws.state === '无力' && sr === '克我') { verdict = '凶'; verdictCls = 'lv-2'; plain = '你这爻没气，对方还压着你——这件事现在难成，别硬推。'; }
      else if (ws.state === '无力') { verdict = '偏凶'; verdictCls = 'lv-2'; plain = '你这爻偏弱，事情推起来费劲，宜缓不宜急。'; }
      else if (sr === '克我') { verdict = '偏凶'; verdictCls = 'lv-2'; plain = '对方或环境压着你，主动权不在你手上，先别急着定。'; }
      else if (sr === '我生') { verdict = '平'; verdictCls = 'lv-3'; plain = '你在为对方/环境付出，容易费力破财，别指望马上有回报。'; }
      else if (sr === '我克') { verdict = '平'; verdictCls = 'lv-3'; plain = '你压得住局面，主动权在你，但要费点劲去推。'; }
      else { verdict = '平'; verdictCls = 'lv-3'; plain = '不好不坏，成不成看后面怎么走；动爻多则有变数。'; }
      if (r.ben.chongGua && dong.length === 0) { plain += '（本卦是六冲卦又没动爻，主"散"，事情容易散掉或不了了之。）'; }
      if (r.ben.heGua) { plain += '（本卦是六合卦，主"合"，容易谈成、有人牵线。）'; }
      h += '<div class="card luck"><h2>先看结论（看不懂下面的表没关系）</h2>';
      h += '<div class="luck-head"><div class="luck-num"><b style="font-size:34px">' + esc(verdict) + '</b><span>粗判</span></div>'
        + '<div class="luck-side"><div class="luck-level ' + verdictCls + '">' + esc(r.ben.name) + (r.bian ? ' → ' + esc(r.bian.name) : '（六爻安静）') + '</div>'
        + '<div class="luck-meta">世爻' + esc(shi.posName + ' ' + shi.liuQin + shi.ganZhi) + '　·　应爻' + esc(ying.posName + ' ' + ying.liuQin + ying.ganZhi) + '　·　动爻 ' + dong.length + ' 个</div></div></div>';
      h += '<p class="slot-sum">' + esc(plain) + '</p>';
      h += '<p class="muted">判断依据：世爻（' + esc(shi.posName + ' ' + shi.liuQin + shi.ganZhi) + '，属' + esc(shi.wx) + '）' + esc(ws.state) + '（旺衰分 ' + ws.score + '）'
        + (ws.why.length ? '　—　' + esc(ws.why.join('、')) : '') + '；世应「' + esc(sr) + '」。</p>';
      h += '<p class="muted">这是"粗判"：只看世爻有没有气 + 世应关系。要看你问的那件事，还得看用神——往下读「怎么看这张表」四步。</p></div>';
    })();

    /* ---------- 读卦四步 ---------- */
    h += '<details class="card fold" open><summary>📖 怎么看这张表（四步，人话版）</summary><div class="fold-body">'
      + '<ol class="plain-list" style="padding-left:20px">'
      + '<li><b>先找「世」和「应」</b>：<b>世</b>＝你自己，<b>应</b>＝对方/环境。表里「世应」那列标着「世」「应」，各占一个爻。看这两爻的五行关系：他生你＝借力，你生他＝你付出，他克你＝被压，你克他＝你占上风，同气＝好商量。</li>'
      + '<li><b>再看「六亲」</b>：六亲是把每个爻换算成"对你而言是什么"。<br>'
      + '　·<b>父母</b>＝文书、房子、证件、长辈<br>'
      + '　·<b>兄弟</b>＝同伴、竞争、也主破财<br>'
      + '　·<b>子孙</b>＝平安、解忧、也主"克官"（不利于求官）<br>'
      + '　·<b>妻财</b>＝钱财、也主妻子/女性<br>'
      + '　·<b>官鬼</b>＝官职、事业、也主病与麻烦<br>'
      + '　<span class="muted">你问的事落在哪一类，那一爻就是「用神」——最重要的一爻。</span></li>'
      + '<li><b>看「纳甲」和旺衰</b>：纳甲是这一爻配的天干地支，代表它属什么五行；再看月建（这个月的气）和日辰（这一天）是生它还是克它。<b>旺</b>＝有力，<b>死/囚</b>＝没劲。事情成不成，主要看用神这一爻旺不旺。</li>'
      + '<li><b>最后看「动爻」和「变卦」</b>：带「动」的爻是变化点，它会变成另一卦（变卦）。动爻少＝事情稳；动爻多＝变数大。<b>六冲卦</b>主散（易散、易变），<b>六合卦</b>主合（易成、有人牵线）。</li>'
      + '</ol>'
      + '<p class="muted" style="margin-top:10px">还嫌复杂？记住一句话就行：<b>看你问的那件事对应的那一爻（用神）旺不旺、有没有被冲被克</b>——旺则有戏，弱则难成。</p>'
      + '</div></details>';
    h += '<div class="card"><h2>起卦信息</h2><div class="kv">'
      + '<div><span class="k">起卦</span><span class="v">' + esc(r.methodText) + '</span></div>'
      + '<div><span class="k">公历</span><span class="v">' + esc(r.time.solar) + '</span></div>'
      + '<div><span class="k">农历</span><span class="v">' + esc(r.time.lunar) + '</span></div>'
      + '<div><span class="k">月建</span><span class="v">' + esc(r.time.monthGanZhi) + '</span></div>'
      + '<div><span class="k">日辰</span><span class="v">' + esc(r.time.dayGanZhi) + '</span></div>'
      + '<div><span class="k">旬空</span><span class="v">' + esc(r.time.xunKong) + '</span></div>'
      + '<div><span class="k">本卦</span><span class="v">' + esc(r.ben.name) + '（' + esc(r.ben.palace) + '宫·' + esc(r.ben.palaceWx) + '·' + esc(r.ben.kind) + '）</span></div>'
      + '<div><span class="k">变卦</span><span class="v">' + (r.bian ? esc(r.bian.name) + '（' + esc(r.bian.palace) + '宫）' : '六爻安静') + '</span></div>'
      + '<div><span class="k">卦体</span><span class="v">' + (r.ben.chongGua ? '<span class="tag red">六冲卦</span>' : '') + (r.ben.heGua ? '<span class="tag green">六合卦</span>' : '') + (r.fanYin.length ? '<span class="tag red">' + esc(r.fanYin.join('、')) + '</span>' : '') + (r.fuYin.length ? '<span class="tag">' + esc(r.fuYin.join('、')) + '</span>' : '') + '　动爻 ' + r.dongCount + ' 个</span></div>'
      + '</div><p class="muted" style="margin-top:8px">' + esc(r.ben.meaning) + (r.bian ? '　→　' + esc(r.bian.meaning) : '') + '</p></div>';

    // 排盘表
    h += '<div class="card"><h2>装卦表（完整排盘，看不懂可跳过）</h2>'
      + '<p class="muted" style="margin:0 0 10px">这张表是六爻的"完整底稿"：把卦的六爻（从下往上数，初爻到上爻）逐爻配上六亲、纳甲干支、六神，并标出哪个是世、哪个是应、有没有伏神、动爻变成什么。<b>把鼠标放在列标题上能看到每列的意思</b>；新手只需关心「六亲」「纳甲」「世应」三列。</p>'
      + '<div class="ly-scroll"><table class="ly-table">'
      + '<tr>'
      + '<th title="六神＝青龙朱雀勾陈螣蛇白虎玄武，用来辅助判断事情的"性质"（吉庆/口舌/拖延/惊恐/伤灾/隐秘），新手可以先跳过">六神</th>'
      + '<th title="伏神＝本卦六亲不全时，从本宫首卦借来补的爻。伏在下面表示"事情藏着、还没露头"">伏神</th>'
      + '<th>本卦<br><span class="muted">' + esc(r.ben.name) + '</span></th>'
      + '<th title="六亲＝父母/兄弟/子孙/妻财/官鬼，代表这件事对你是哪一类。你问的事对应哪一类，那一爻就是"用神"">六亲</th>'
      + '<th title="纳甲＝这一爻配的干支，决定它属什么五行；配合月建日辰判断旺衰">纳甲</th>'
      + '<th title="世＝你自己，应＝对方或环境。看世应五行关系判断主动/被动">世应</th>'
      + '<th>变卦<br><span class="muted">' + (r.bian ? esc(r.bian.name) : '六爻安静') + '</span></th></tr>';
    for (var i = 5; i >= 0; i--) {
      var y = r.yao[i];
      var rowCls = y.isShi ? 'shi' : y.isYing ? 'ying' : '';
      var sym = y.yang ? '▅▅▅▅▅' : '▅▅　▅▅';
      var by = r.bian && r.bian.yao[i] ? r.bian.yao[i] : null;
      h += '<tr class="' + rowCls + '">'
        + '<td>' + esc(y.liuShen) + '</td>'
        + '<td class="fu">' + (y.fuShen ? esc(y.fuShen.liuQin) + '<br>' + esc(y.fuShen.ganZhi) + (y.fuShen.kong ? ' 空' : '') : '') + '</td>'
        + '<td class="yao-sym">' + sym + '</td>'
        + '<td>' + esc(y.liuQin) + '<br><span class="muted">' + esc(y.posName) + '</span></td>'
        + '<td class="' + (y.kong ? 'kong' : '') + '"><span class="' + wxCls(y.wx) + '">' + esc(y.ganZhi) + '</span>'
          + (y.moving ? '<br><span class="moving">' + esc(y.typeText) + ' 动</span>' : '') + (y.kong ? '<br><span class="muted">空</span>' : '') + '</td>'
        + '<td>' + (y.isShi ? '<span class="pos-tag shi">世</span>' : y.isYing ? '<span class="pos-tag ying">应</span>' : '<span class="muted">—</span>') + '</td>'
        + '<td>' + (by ? '<span class="' + wxCls(by.wx) + '">' + esc(by.liuQinOfBen) + ' ' + esc(by.ganZhi) + '</span><br><span class="muted">（变卦宫：' + esc(by.liuQinSelf) + '）</span>' : '') + '</td>'
        + '</tr>';
    }
    h += '</table></div><p class="muted" style="margin-top:10px">变爻六亲以「对本宫」为主（以本卦卦宫为我，便于直接论生克），括号内为按变卦自身宫所取的六亲，两种口径古今并用，取使用者所宗之书。</p></div>';

    // 断卦要点
    h += '<div class="card"><h2>断卦要点</h2><ul class="note-list">'
      + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';

    // 用神
    if (yong) {
      h += '<div class="card"><h2>用神分析</h2>';
      if (!yong.found) h += '<p class="tag red">' + esc(yong.text) + '</p>';
      else {
        h += '<p>所占之事：<span class="tag gold">' + esc(yong.topic) + '</span>　取用神：<span class="tag gold">' + esc(yong.subject) + '</span></p>'
          + '<ul class="note-list">' + yong.lines.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      h += '</div>';
    }

    h += interpCard(XS.Interp.liuyao(r, yong));
    return h;
  }

  $('lyRun').addEventListener('click', function () {
    try {
      var m = $('lyMethod').value, opt = { method: m };
      if (m === 'coins') {
        if (lyCoins.length < 6) { toast('请先摇满六爻（已摇 ' + lyCoins.length + ' 爻）'); return; }
        opt.coins = lyCoins.slice();
      } else if (m === 'manual') {
        var arr = [];
        document.querySelectorAll('.ly-manual').forEach(function (s) { arr[+s.dataset.i] = +s.value; });
        opt.yaoTypes = arr;
      } else if (m === 'numbers') {
        opt.n1 = $('lyN1').value; opt.n2 = $('lyN2').value; opt.n3 = $('lyN3').value;
      }
      var dt = splitDateTime($('lyTime').value);
      var qi = XS.Liuyao.qiGua(opt);
      var r = XS.Liuyao.paipan(qi, dt);
      var topic = $('lyTopic').value;
      var yong = topic ? XS.Liuyao.analyzeYongShen(r, topic) : null;
      var html = renderLiuyao(r, yong);
      $('lyResult').innerHTML = html;
      var text = XS.Liuyao.report(r) + (yong ? '\n\n【用神分析】\n' + (yong.found ? yong.text : yong.text) : '');
      saveResult('liuyao', '六爻纳甲', r.ben.name + (r.bian ? ' 变 ' + r.bian.name : ' 六爻安静') + '（' + r.time.dayGanZhi + '日）', html, text);
      toast('排盘完成');
    } catch (e) { $('lyResult').innerHTML = '<div class="card"><p class="tag red">排盘失败：' + esc(e.message) + '</p></div>'; }
  });
  $('lyCopy').addEventListener('click', function () { copyText(state.lastText.liuyao); });
  $('lySave').addEventListener('click', function () { downloadText('六爻排盘.txt', state.lastText.liuyao); });

  /* ============================================================
   *  四、小六壬
   * ============================================================ */
  $('xlrDate').value = todayStr();
  $('xlrTime').value = nowTimeStr();
  $('xlrMethod').addEventListener('change', function () {
    var v = this.value;
    $('xlrTimeFields').style.display = (v === 'time') ? '' : 'none';
    $('xlrNumberFields').style.display = (v === 'numbers') ? '' : 'none';
  });

  function renderXlr(r) {
    var h = '';
    h += '<div class="card"><h2>起课' + (r.detail ? '（' + esc(r.detail) + '）' : '') + '</h2>'
      + '<p><span class="tag gold">' + esc(r.methodText) + '</span></p><ul class="plain muted">'
      + r.steps.map(function (s) { return '<li>' + esc(s.label) + '　数 ' + s.count + ' → <b>' + esc(s.to) + '</b></li>'; }).join('')
      + '</ul></div>';

    var cls = r.jiXiong.indexOf('吉') >= 0 || r.jiXiong === '大吉' ? 'green' : r.jiXiong.indexOf('凶') >= 0 ? 'red' : 'gold';
    h += '<div class="card"><h2>落宫</h2>'
      + '<p style="font-size:30px;font-family:\'Songti SC\',serif;color:var(--gold2);letter-spacing:.2em;margin:6px 0">' + esc(r.gongName) + '</p>'
      + '<p><span class="tag ' + cls + '">' + esc(r.jiXiong) + '</span><span class="tag">五行 ' + esc(r.gong.wx) + '</span>'
      + '<span class="tag">' + esc(r.gong.shen) + '</span><span class="tag">' + esc(r.gong.dir) + '</span></p>'
      + '<p style="margin-top:10px">' + esc(r.gong.jie) + '</p>'
      + '<p class="muted">掌诀：' + esc(r.gong.jue) + '</p>'
      + '<p style="margin-top:8px"><b>宜忌：</b>' + esc(r.advice) + '</p>'
      + '<ul class="plain" style="margin-top:12px">' + Object.keys(r.aspects).map(function (k) {
          return '<li><b>' + esc(k) + '：</b>' + esc(r.aspects[k]) + '</li>'; }).join('') + '</ul>'
      + '</div>';

    h += '<div class="card"><h2>六宫掌诀</h2><div class="liunian-grid">'
      + XS.XiaoLiuRen.GONG_ORDER.map(function (n) {
        var g = XS.XiaoLiuRen.GONG.filter(function (x) { return x.name === n; })[0];
        return '<div class="liunian' + (n === r.gongName ? ' thisyear' : '') + '"><div class="gz">' + esc(n) + '</div><div class="muted">' + esc(g.wx) + '</div><div class="muted">' + esc(g.shen) + '</div></div>'; }).join('')
      + '</div></div>';

    h += interpCard(XS.Interp.xiaoliuren(r));
    return h;
  }
  $('xlrRun').addEventListener('click', function () {
    try {
      var m = $('xlrMethod').value, opt = { method: m };
      if (m === 'time') { var dt = splitDateTime($('xlrDate').value + 'T' + ($('xlrTime').value || '12:00')); opt.y = dt.y; opt.m = dt.m; opt.d = dt.d; opt.h = dt.h; opt.mi = dt.mi; }
      if (m === 'numbers') { opt.n1 = $('xlrN1').value; opt.n2 = $('xlrN2').value; opt.n3 = $('xlrN3').value; }
      var hintX = '';
      if (m === 'numbers') {
        var bad = [opt.n1, opt.n2, opt.n3].some(function (v) { return v !== '' && v !== undefined && !(Math.abs(parseInt(v, 10) || 0) >= 1); });
        if (bad) hintX = '（数字需 ≥1 的整数，已按 1 计算）';
      }
      var r = XS.XiaoLiuRen.ke(opt);
      var html = renderXlr(r);
      $('xlrResult').innerHTML = html;
      var text = XS.XiaoLiuRen.report(r);
      saveResult('xlr', '小六壬', '落宫 ' + r.gongName + '（' + r.gong.wx + '）', html, text);
      toast('起课完成' + hintX);
    } catch (e) { $('xlrResult').innerHTML = '<div class="card"><p class="tag red">起课失败：' + esc(e.message) + '</p></div>'; }
  });
  $('xlrCopy').addEventListener('click', function () { copyText(state.lastText.xlr); });
  $('xlrSave').addEventListener('click', function () { downloadText('小六壬.txt', state.lastText.xlr); });


  /* ============================================================
   *  五、今日抽卡时运（游戏签池 / 抽卡记录 / 每日待办提醒）
   * ============================================================ */
  $('gcDate').value = todayStr();
  $('grDate').value = todayStr();

  var GC_PREF_KEY = 'xiangshu.gacha.prefs', GC_DONE_KEY = 'xiangshu.gacha.done';
  function gcPrefs() { try { return JSON.parse(localStorage.getItem(GC_PREF_KEY) || '{}'); } catch (e) { return {}; } }
  function gcSavePrefs(p) { try { localStorage.setItem(GC_PREF_KEY, JSON.stringify(p)); } catch (e) {} }
  function gcDoneToday() { try { var m = JSON.parse(localStorage.getItem(GC_DONE_KEY) || '{}'); return !!m[todayStr()]; } catch (e) { return false; } }
  function gcSetDone(v) { try { var m = JSON.parse(localStorage.getItem(GC_DONE_KEY) || '{}'); if (v) m[todayStr()] = 1; else delete m[todayStr()]; localStorage.setItem(GC_DONE_KEY, JSON.stringify(m)); } catch (e) {} }

  // 游戏下拉（游戏签池）
  (function fillGameSelects() {
    var opts = XS.Games.GAMES.map(function (g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    $('gcGameSel').innerHTML = opts;
    $('grGame').innerHTML = opts;
    $('gcGameSel').value = XS.Games.GAMES[0].id; $('grGame').value = XS.Games.GAMES[0].id;
  })();
  $('gcGameSel').addEventListener('change', function () {
    $('gcGameWrap').style.display = this.value === 'generic' ? '' : 'none';
    $('grGame').value = this.value;
    if (gcLastOpt) gcRefresh(false);
  });
  $('grPulls').addEventListener('change', function () { $('grPullsWrap').style.display = this.value === '0' ? '' : 'none'; });
  // 记录页的游戏下拉与主游戏双向同步（否则统计/概率会与所选游戏不一致）
  $('grGame').addEventListener('change', function () {
    $('gcGameSel').value = this.value;
    $('gcGameWrap').style.display = this.value === 'generic' ? '' : 'none';
    if (gcLastOpt) gcRefresh(false);
    renderRecords(); renderProb();
  });

  function gcGameId() { return $('gcGameSel').value; }
  function gcGameName() {
    if (gcGameId() !== 'generic') return XS.Games.byId(gcGameId()).name;
    return ($('gcGame').value || '').trim() || '其他游戏';
  }
  /* ---------- 抽卡时运 · 出生信息（支持公历/农历 + 自动记忆） ---------- */
  var GC_BIRTH_KEY = 'xiangshu.gacha.birth';
  function gcIsLunar() { return $('gcBirthCalendar') && $('gcBirthCalendar').value === 'lunar'; }

  function gcSaveBirth() {
    try {
      localStorage.setItem(GC_BIRTH_KEY, JSON.stringify({
        calendar: gcIsLunar() ? 'lunar' : 'solar',
        date: $('gcBirthDate').value,
        ly: $('gcLYear').value, lm: $('gcLMonth').value, ld: $('gcLDay').value, leap: $('gcLeap').checked,
        time: $('gcBirthTime').value, gender: $('gcGender').value, lng: $('gcLng').value
      }));
    } catch (e) {}
  }
  function gcLoadBirth() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(GC_BIRTH_KEY) || 'null'); } catch (e) {}
    if (!s) return false;
    if (s.calendar === 'lunar') {
      $('gcBirthCalendar').value = 'lunar';
      $('gcLYear').value = s.ly || PRESET.y; $('gcLMonth').value = s.lm || '1'; $('gcLDay').value = s.ld || '1';
      $('gcLeap').checked = !!s.leap;
    } else if (s.date) {
      $('gcBirthCalendar').value = 'solar';
      $('gcBirthDate').value = s.date;
    }
    $('gcBirthTime').value = s.time || '';
    if (s.gender !== undefined) $('gcGender').value = String(s.gender);
    $('gcLng').value = s.lng || '';
    gcSyncBirthUI();
    return true;
  }
  // 农历/公历切换时显隐，并回显对应公历
  function gcSyncBirthUI() {
    var lunar = gcIsLunar();
    $('gcSolarWrap').style.display = lunar ? 'none' : '';
    $('gcLunarWrap').style.display = lunar ? '' : 'none';
    $('gcLeapWrap').style.display = lunar ? '' : 'none';
    var echo = $('gcLunarEcho');
    if (!echo) return;
    if (!lunar) { echo.textContent = ''; return; }
    try {
      var s = XS.Bazi.lunarToSolar(+$('gcLYear').value, +$('gcLMonth').value, +$('gcLDay').value, $('gcLeap').checked);
      echo.innerHTML = s ? ('对应公历：<b>' + esc(s) + '</b>') : '<span class="tag red">这个农历日期不存在，请检查闰月</span>';
    } catch (e) { echo.textContent = ''; }
  }

  function gcBirth() {
    var lunar = gcIsLunar(), y, m, d;
    if (lunar) {
      y = +$('gcLYear').value; m = +$('gcLMonth').value; d = +$('gcLDay').value;
      if (!y || !m || !d) return null;
    } else {
      var bd = $('gcBirthDate').value; if (!bd) return null;
      var p = bd.split('-'); y = +p[0]; m = +p[1]; d = +p[2];
    }
    var o = { y: y, m: m, d: d, gender: +$('gcGender').value };
    if (lunar) { o.calendar = 'lunar'; o.leap = $('gcLeap').checked; }
    var tv = $('gcBirthTime').value;
    if (tv) { var t = tv.split(':'); o.h = +t[0]; o.mi = +t[1]; }   // 不填时间 = 时辰未知
    var lng = $('gcLng').value;
    if (lng !== '' && !isNaN(+lng)) o.lng = +lng;
    return o;
  }
  function gcCompute(y, m, d) {
    return XS.Gacha.todayLuck({ y: y, m: m, d: d, gameId: gcGameId(), gameName: gcGameName(), birth: gcBirth(), account: getAcct() });
  }

  /* ---------- 统一刷新（切换游戏 / 改账号名都会即时重算，不写历史） ---------- */
  var gcLastOpt = null;
  function gcRefresh(saveHistory) {
    if (!gcLastOpt) return;
    var r = gcCompute(gcLastOpt.y, gcLastOpt.m, gcLastOpt.d);
    $('gcResult').innerHTML = renderGacha(r);
    try { var t = new Date(); gcTodayIdx = gcCompute(t.getFullYear(), t.getMonth() + 1, t.getDate()); } catch (e) {}
    renderReminder(); renderRecords(); renderWeek();
    if (saveHistory) {
      var extraTxt = '';
      try {
        var gidX = r.gameInfo.id, cfgX = rateCfg(gidX);
        var stX = XS.Records.stats(XS.Records.load(), gidX);
        var prX = XS.Prob.nextTen(stX.sinceLast, cfgX);
        var psX = XS.Prob.probScore(stX.sinceLast, cfgX);
        extraTxt = '\n\n【此刻抽卡】\n'
          + '今日时运分：' + r.score + '（' + r.level + '）\n'
          + '概率态势分：' + psX + '/100（已累计未出货 ' + stX.sinceLast + ' 抽，下一发十连出' + XS.Games.byId(gidX).unit + ' ' + prX.p10.toFixed(2) + '%）\n'
          + '综合抽卡分：' + XS.Prob.composite(r.score, psX) + '（时运×50% ＋ 概率×50%）\n'
          + XS.Prob.advice(XS.Prob.composite(r.score, psX), r.level, prX.p10, prX.guaranteedAt);
      } catch (e) {}
      saveResult('gacha', '抽卡时运', (r.account ? r.account + ' · ' : '') + r.date.text + ' · ' + r.game + ' · ' + r.level + '（' + r.slip.title + '）（综合 ' + (function () { try { return XS.Prob.composite(r.score, XS.Prob.probScore(XS.Records.stats(XS.Records.load(), r.gameInfo.id).sinceLast, rateCfg(r.gameInfo.id))); } catch (e) { return '-'; } })() + '）',
        $('gcResult').innerHTML, XS.Gacha.report(r) + extraTxt);
    }
    return r;
  }

  /* ---------- 概率参数（可按游戏公示值改，存本机） ---------- */
  var RATE_KEY = 'xiangshu.gacha.rates';
  function rateCfg(gameId) {
    var g = XS.Games.byId(gameId);
    var base = { rate: g.rate, softPity: g.softPity, softStep: g.softStep, pity: g.pity, note: g.rateNote };
    try {
      var all = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
      if (all[gameId]) return Object.assign({}, base, all[gameId]);
    } catch (e) {}
    return base;
  }
  function saveRateCfg(gameId, cfg) {
    try {
      var all = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
      all[gameId] = { rate: cfg.rate, softPity: cfg.softPity, softStep: cfg.softStep, pity: cfg.pity };
      localStorage.setItem(RATE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  /* ---------- 下一发十连出卡概率 ---------- */
  function renderProb() {
    var box = $('grProb'); if (!box) return;
    var gid = gcGameId(), g = XS.Games.byId(gid);
    var cfg = rateCfg(gid);
    var st = XS.Records.stats(XS.Records.load(), gid);
    var r = XS.Prob.nextTen(st.sinceLast, cfg);
    var pScore = XS.Prob.probScore(st.sinceLast, cfg);
    var h = '<div class="prob-block">';
    h += '<div class="prob-main"><span class="pm-label">下一发十连出' + esc(g.unit) + '概率</span>'
      + '<b>' + r.p10.toFixed(2) + '%</b><span class="muted">（至少出一个）</span></div>';
    h += '<div class="prob-meta">单抽 ' + r.single.toFixed(2) + '% · 已累计未出货 <b>' + st.sinceLast + '</b> 抽'
      + (cfg.pity > 0 ? ' · 硬保底 ' + cfg.pity + ' 抽' + (st.pityRemain !== null ? '（还差 ' + st.pityRemain + '）' : '')
                      : ' · 无硬保底')
      + (cfg.softPity > 0 ? ' · 软保底 ' + cfg.softPity + ' 抽起每抽 +' + cfg.softStep + '%' : '') + '</div>';
    h += '<div class="prob-bars">' + r.perPull.map(function (p, i) {
      return '<div class="pbcol" title="第 ' + (i + 1) + ' 抽 ' + p + '%"><i style="height:' + Math.max(3, Math.min(100, p)) + '%"></i><span>' + (i + 1) + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="prob-meta muted">10 根柱＝下一发十连里每一抽的即时概率；概率态势分 <b>' + pScore + '</b>/100（以该游戏基准十连概率为 50 分、保底必出为 100 分）</div>';
    h += '<p class="muted">纯数学概率，与运势无关。参数按游戏公示概率预填，若与官方不同可自行修改（存本机）。</p>';
    h += '<details class="prob-params"><summary>概率参数（可改）</summary><div class="form-grid">'
      + '<label class="field"><span>基础单抽概率 %</span><input type="number" step="0.1" id="prRate" value="' + cfg.rate + '"></label>'
      + '<label class="field"><span>硬保底抽数（0=无）</span><input type="number" id="prPity" value="' + cfg.pity + '"></label>'
      + '<label class="field"><span>软保底起点（0=无）</span><input type="number" id="prSoft" value="' + cfg.softPity + '"></label>'
      + '<label class="field"><span>软保底每抽 +%</span><input type="number" step="0.5" id="prStep" value="' + cfg.softStep + '"></label>'
      + '</div><div class="form-actions"><button class="ghost small" id="prSave" type="button">保存参数</button>'
      + '<button class="ghost small" id="prReset" type="button">恢复默认</button></div>'
      + '<p class="muted">默认：' + esc(g.rateNote || '') + '</p></details>';
    h += '</div>';
    box.innerHTML = h;
    if ($('prSave')) $('prSave').addEventListener('click', function () {
      saveRateCfg(gid, { rate: +$('prRate').value, pity: +$('prPity').value, softPity: +$('prSoft').value, softStep: +$('prStep').value });
      renderProb(); if (gcLastOpt) gcRefresh(false); toast('概率参数已保存');
    });
    if ($('prReset')) $('prReset').addEventListener('click', function () {
      try { var all = JSON.parse(localStorage.getItem(RATE_KEY) || '{}'); delete all[gid]; localStorage.setItem(RATE_KEY, JSON.stringify(all)); } catch (e) {}
      renderProb(); if (gcLastOpt) gcRefresh(false); toast('已恢复默认参数');
    });
  }

  /* ---------- 这期池 · 我的抽卡运气 ---------- */
  function renderPoolLuck(r) {
    if (!r.ok) return '<div class="card"><p class="tag red">' + esc(r.error) + '</p></div>';
    var h = '';
    h += '<div class="card luck"><h2>这期池抽卡运气 · ' + esc(r.window.start) + ' ~ ' + esc(r.window.end) + '</h2>';
    h += '<div class="luck-head"><div class="luck-num"><b>' + r.avgScore + '</b><span>平均气势分</span></div>'
      + '<div class="luck-side"><div class="luck-level ' + lvClsOf(r.avgScore) + '">整体 ' + esc(r.overall) + '</div>'
      + '<div class="luck-meta">吉日 ' + r.goodDays + ' 天　·　凶日 ' + r.badDays + ' 天　·　共 ' + r.window.days + ' 天可算</div></div></div>';
    h += '<div class="luck-gauge"><div class="gauge-fill ' + lvClsOf(r.avgScore) + '" style="width:' + r.avgScore + '%"></div></div>';
    h += '<p class="slot-sum">' + esc(r.advice) + '</p>';
    h += '<p class="muted">判定依据：' + esc(r.overallRule) + '（吉日＝大吉+吉）</p></div>';

    // 档位分布
    h += '<div class="card"><h2>档位分布</h2><div class="wx-bars">'
      + ['大吉', '吉', '平', '凶', '大凶'].map(function (k) {
        var n = r.dist[k] || 0, pct = Math.round(n / r.window.days * 100);
        return '<div class="wx-row"><span class="wx-name ' + lvClsOf(k === '大吉' ? 90 : k === '吉' ? 78 : k === '平' ? 62 : k === '凶' ? 46 : 20) + '">' + k + '</span>'
          + '<span class="wx-bar"><i class="' + lvClsOf(k === '大吉' ? 90 : k === '吉' ? 78 : k === '平' ? 62 : k === '凶' ? 46 : 20) + '" style="width:' + Math.max(3, pct) + '%"></i></span>'
          + '<span class="wx-val">' + n + ' 天</span></div>';
      }).join('') + '</div></div>';

    // 最宜抽
    h += '<div class="card"><h2>最宜抽的几天</h2><div class="week-list">'
      + r.best.map(function (d, i) {
        return '<div class="week-row' + (i === 0 ? ' today' : '') + '">'
          + '<span class="wk-date">' + esc(d.date.slice(5)) + ' ' + esc(d.week) + '</span>'
          + '<span class="wk-gz">' + esc(d.ganZhi) + '</span>'
          + '<span class="wk-lv ' + lvClsOf(d.score) + '">' + esc(d.grade ? d.grade.text : d.level) + '</span>'
          + '<span class="wk-score">' + d.score + '</span>'
          + '<span class="wk-rule">' + esc(d.tianShen + d.tianShenType + ' · ' + d.zhiXing + '日') + '</span>'
          + '<span class="wk-go">' + esc(d.bestHour) + '</span></div>';
      }).join('') + '</div>'
      + '<p class="muted">最后一列是当天最好的时辰。</p></div>';

    // 最忌抽
    if (r.worst.length) {
      h += '<div class="card"><h2>最忌抽的几天</h2><div class="week-list">'
        + r.worst.map(function (d) {
          return '<div class="week-row"><span class="wk-date">' + esc(d.date.slice(5)) + ' ' + esc(d.week) + '</span>'
            + '<span class="wk-gz">' + esc(d.ganZhi) + '</span>'
            + '<span class="wk-lv ' + lvClsOf(d.score) + '">' + esc(d.grade ? d.grade.text : d.level) + '</span>'
            + '<span class="wk-score">' + d.score + '</span>'
            + '<span class="wk-rule">' + esc(d.tianShen + d.tianShenType + ' · ' + d.zhiXing + '日') + '</span><span class="wk-go">避开</span></div>';
        }).join('') + '</div></div>';
    }

    // 逐日全表
    h += '<div class="card"><h2>档期内逐日（' + r.window.days + ' 天）</h2><div class="rank-grid">'
      + r.days.map(function (d) {
        return '<div class="rank-row"><span class="rk-no">' + esc(d.date.slice(5)) + '</span>'
          + '<span class="rk-name">' + esc(d.week) + '　' + esc(d.ganZhi) + '<i>' + esc(d.tianShen + d.tianShenType + ' · ' + d.zhiXing + '日') + '</i></span>'
          + '<span class="rk-lv ' + lvClsOf(d.score) + '">' + esc(d.level) + '</span>'
          + '<span class="rk-score">' + d.score + '</span>'
          + '<span class="rk-mode">' + esc(d.bestHour.slice(0, 2)) + '</span></div>';
      }).join('') + '</div></div>';

    h += interpCard({ headline: '这期池整体运气「' + r.overall + '」：' + r.advice, sections: [
      { h: '这期怎么排的', p: '档期内共 ' + r.window.days + ' 天，逐日按传统择日判档：值神黄道/黑道 → 建除十二神 → 吉神凶煞 → 再叠加你的日干十神、今日之气是否合喜用、日支是否冲你日支。' + (r.worst.length ? '最该避开的是 ' + r.worst[0].date + '（' + r.worst[0].level + '）。' : '') },
      { h: '怎么用', p: '想抽就挑「最宜抽」里那几天，并尽量落在当天最好的时辰；凶日别上头。但记住：' + r.disclaimer }
    ], tips: r.notes });
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    return h;
  }
  $('plLuckRun').addEventListener('click', function () {
    var b = gcBirth();
    if (!b) { toast('先填出生日期（抽卡页表单里）'); return; }
    var st = $('gpStart').value || ($('plStart') ? $('plStart').value : '');
    var en = $('gpEnd').value || ($('plEnd') ? $('plEnd').value : '');
    if (!st || !en) { toast('先填卡池起止日期'); return; }
    try {
      var r = XS.Pool.luck({ birth: b, start: st, end: en });
      $('plLuckResult').innerHTML = renderPoolLuck(r);
      if (r.ok) {
        saveResult('gacha', '卡池运气', '卡池运气 ' + r.window.start + '~' + r.window.end + ' · ' + r.overall, $('plLuckResult').innerHTML, XS.Pool.report(r));
        toast('这期池：' + r.overall + ' · 吉日 ' + r.goodDays + ' 天');
      } else { toast(r.error); }
      window.scrollTo({ top: Math.max(0, $('plLuckResult').getBoundingClientRect().top + window.scrollY - 70) });
    } catch (e) { $('plLuckResult').innerHTML = '<div class="card"><p class="tag red">算不出来：' + esc(e.message) + '</p></div>'; }
  });
  $('plLuckCopy').addEventListener('click', function () { copyText(state.lastText['卡池运气']); });
  $('plLuckSave').addEventListener('click', function () { downloadText('卡池运气.txt', state.lastText['卡池运气']); });

  /* ---------- 最近最宜 + 最近一周走势 ---------- */
  function levelCls(idx) { return 'lvd-' + idx; }
  function renderWeek() {
    var nbBox = $('gcNextBest'), trBox = $('gcTrend');
    if (!nbBox || !trBox) return;
    try {
      var opt = { birth: gcBirth() };
      var nb = XS.Gacha.nextBest(opt, 30);
      var wk = XS.Gacha.weekTrend(opt, 7);
      var today = todayStr();
      var daysOf = function (ds) { return Math.round((new Date(ds + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000); };
      // 最佳日的吉时
      var bestHourTxt = '';
      try {
        var p = nb.best.date.split('-');
        var full = XS.Gacha.todayLuck({ y: +p[0], m: +p[1], d: +p[2], birth: gcBirth(), gameId: gcGameId(), account: getAcct() });
        bestHourTxt = '最佳时辰 ' + full.bestHours[0].name + '时（' + full.bestHours[0].range + '）';
      } catch (e) {}

      var d0 = daysOf(nb.best.date);
      var h = '<div class="nextbest">'
        + '<div class="nb-label">最近最宜抽卡日期（未来 30 天内按规则排出）</div>'
        + '<div class="nb-main"><b>' + esc(nb.best.date) + '</b>（' + esc(nb.best.week) + '）'
        + '<span class="nb-level ' + levelCls(nb.best.levelIdx) + '">' + esc(nb.best.level) + '</span>'
        + '<span class="nb-meta">气势分 ' + nb.best.score + ' · ' + (d0 <= 0 ? '<b>就是今天</b>' : d0 + ' 天后') + (bestHourTxt ? ' · ' + esc(bestHourTxt) : '') + '</span></div>'
        + '<div class="nb-sub">次选：' + nb.top.slice(1).map(function (x) {
            return '<span class="tag">' + esc(x.date.slice(5)) + ' ' + esc(x.level) + ' · ' + x.score + '</span>'; }).join('') + '</div>'
        + '<div class="nb-sub muted">要避开：' + esc(nb.worst.date) + '（' + esc(nb.worst.level) + ' · ' + nb.worst.score + ' 分）</div>'
        + '</div>';
      nbBox.innerHTML = h;

      // 一周走势
      var best = wk.slice().sort(function (a, b) { return b.score - a.score; })[0];
      var worst = wk.slice().sort(function (a, b) { return a.score - b.score; })[0];
      var t = '<div class="trend">';
      wk.forEach(function (x) {
        var isToday = x.date === today;
        var cls = x.levelIdx >= 4 ? 'good' : x.levelIdx === 3 ? 'mid' : 'bad';
        t += '<div class="trend-col' + (isToday ? ' today' : '') + '">'
          + '<div class="tc-score">' + x.score + '</div>'
          + '<div class="tc-bar"><i class="' + cls + '" style="height:' + Math.max(5, Math.min(100, x.score)) + '%"></i></div>'
          + '<div class="tc-lv ' + levelCls(x.levelIdx) + '">' + esc(x.level) + '</div>'
          + '<div class="tc-date">' + esc(x.date.slice(5)) + '<br><span class="muted">' + (isToday ? '今天' : esc(x.week)) + '</span></div>'
          + '</div>';
      });
      t += '</div>';
      var delta = wk[wk.length - 1].score - wk[0].score;
      var dir = delta > 8 ? '一路走高' : delta < -8 ? '一路走低' : '整体平稳';
      var todayLv = wk[0];
      t += '<p class="muted" style="margin-top:10px">这一周' + dir + '（' + wk[0].score + ' → ' + wk[wk.length - 1].score + '）；'
        + '最高 ' + esc(best.date.slice(5)) + '（' + esc(best.level) + '·' + best.score + '），最低 ' + esc(worst.date.slice(5)) + '（' + esc(worst.level) + '·' + worst.score + '）。'
        + '柱高＝气势分，绿吉红凶。</p>';
      trBox.innerHTML = t;
    } catch (e) { nbBox.innerHTML = '<p class="muted">一周走势算不出来：' + esc(e.message) + '</p>'; trBox.innerHTML = ''; }
  }

  /* ---------- 卡池档期：区间内最佳抽卡日 ---------- */
  function renderPool() {
    var s = $('gpStart').value, e = $('gpEnd').value;
    var box = $('gpResult');
    if (!s || !e) { toast('先填卡池的开始与结束日期'); return; }
    var sd = new Date(s + 'T00:00:00'), ed = new Date(e + 'T00:00:00');
    if (ed < sd) { box.innerHTML = '<p class="disclaimer">结束日期不能早于开始日期。</p>'; return; }
    var span = Math.round((ed - sd) / 86400000) + 1;
    var capped = false;
    if (span > 180) { ed = XS.Gacha.addDays(sd, 179); span = 180; capped = true; }
    var opt = { birth: gcBirth() };
    var list = XS.Gacha.scanRange(opt, sd, ed);
    var ranked = XS.Gacha.rankDays(list);
    var today = new Date(todayStr() + 'T00:00:00');
    var remaining = list.filter(function (x) { return new Date(x.date + 'T00:00:00') >= today; });
    var poolEnded = new Date(e + 'T00:00:00') < today;
    var notStarted = sd > today;
    var rk = XS.Gacha.rankDays(remaining);
    // 档位分布
    var dist = {};
    list.forEach(function (x) { dist[x.level] = (dist[x.level] || 0) + 1; });
    var distHtml = ['大吉', '吉', '平', '凶', '大凶'].map(function (k) {
      return dist[k] ? '<span class="tag ' + (k === '大吉' ? 'gold' : k === '吉' ? 'green' : k === '平' ? '' : 'red') + '">' + k + ' ' + dist[k] + ' 天</span>' : '';
    }).join('');

    var h = '';
    if (capped) h += '<p class="disclaimer">卡池跨度超过 180 天，只统计了前 180 天。</p>';
    if (poolEnded) {
      h += '<p class="slot-sum">这期卡池已经结束了（' + esc(e) + ' 截止）。下面是它在<b>历史区间内</b>的最佳日，仅供参考。</p>';
    } else if (notStarted) {
      var dStart = Math.round((sd - today) / 86400000);
      h += '<p class="slot-sum">卡池还没开始（' + dStart + ' 天后开启）。以下是整个卡池期间的推荐：</p>';
    }
    if (!rk.length) {
      h += '<p class="disclaimer">区间内没有可推荐的日子。</p>';
      box.innerHTML = h; return;
    }
    var best = rk[0], worst = rk[rk.length - 1];
    var dBest = Math.round((new Date(best.date + 'T00:00:00') - today) / 86400000);
    // 结论
    var conclusion;
    if (poolEnded) conclusion = '区间内最佳是 ' + best.date + '（' + best.level + '）。';
    else if (dBest <= 0) conclusion = '最佳日<b>就是今天</b>（' + best.level + '·' + best.score + ' 分），想抽可以今天动手。';
    else conclusion = '剩余 ' + remaining.length + ' 天里，最宜抽卡的是 <b>' + best.date + '（' + best.level + '·' + best.score + ' 分，' + dBest + ' 天后）</b>。';
    h += '<p class="slot-sum">' + conclusion + '</p>';
    // 今天 vs 最佳日 的建议
    try {
      var tp = todayStr().split('-');
      var todayBrief = XS.Gacha.dayBrief(+tp[0], +tp[1], +tp[2], XS.Gacha.prep(gcBirth()));
      if (!poolEnded) {
        if (dBest > 0 && todayBrief.levelIdx <= 2) {
          h += '<p class="muted">今天判为「' + todayBrief.level + '」，建议<b>先别抽</b>，等到 ' + best.date + ' 再动手；如果等不了，次选 ' + rk.slice(1, 3).map(function (x) { return x.date + '（' + x.level + '）'; }).join('、') + '。</p>';
        } else if (dBest === 0) {
          h += '<p class="muted">今天正是区间最佳日，按计划抽、抽够保底就收。</p>';
        } else {
          h += '<p class="muted">今天判为「' + todayBrief.level + '」，可以先抽一点；但区间内最好的是 ' + best.date + '（' + dBest + ' 天后）。</p>';
        }
      }
    } catch (e) {}
    // 推荐日 + 避雷日
    h += '<div class="pool-best">'
      + '<div class="pb-row ok"><span class="slot-tag">最宜</span><span class="slot-time">' + esc(best.date) + '（' + esc(best.week) + '）</span>'
      + '<span class="slot-note">' + esc(best.level) + ' · ' + best.score + ' 分 · ' + esc(best.tianShen) + '·' + esc(best.tianShenType) + ' · 建除' + esc(best.zhiXing) + '日</span></div>'
      + '<div class="pb-row bad"><span class="slot-tag">避开</span><span class="slot-time">' + esc(worst.date) + '（' + esc(worst.week) + '）</span>'
      + '<span class="slot-note">' + esc(worst.level) + ' · ' + worst.score + ' 分 · ' + esc(worst.tianShen) + '·' + esc(worst.tianShenType) + '</span></div></div>';
    h += '<p style="margin:8px 0 4px">次选：' + rk.slice(1, 3).map(function (x) {
      return '<span class="tag gold">' + esc(x.date.slice(5)) + ' ' + esc(x.level) + ' · ' + x.score + '</span>'; }).join('') + '</p>';
    h += '<p class="muted" style="margin-top:6px">区间档位分布：' + distHtml + '</p>';
    // 每日色带
    h += '<h3 class="rec-h">卡池每天一览（绿色宜抽 / 红色避开）</h3><div class="pool-list">';
    list.forEach(function (x) {
      var cls = x.levelIdx >= 4 ? 'good' : x.levelIdx === 3 ? 'mid' : 'bad';
      var isToday = x.date === todayStr();
      var isBest = x.date === best.date;
      h += '<div class="pool-day ' + cls + (isToday ? ' today' : '') + (isBest ? ' best' : '') + '" title="' + esc(x.level + ' · ' + x.score + ' 分 · ' + x.tianShen + x.tianShenType + ' · ' + x.rule) + '">'
        + '<div class="pd-date">' + esc(x.date.slice(5)) + '</div>'
        + '<div class="pd-lv">' + esc(x.level) + '</div>'
        + '<div class="pd-sc">' + x.score + '</div></div>';
    });
    h += '</div>';
    box.innerHTML = h;
  }

  // 事件
  if ($('gpRun')) $('gpRun').addEventListener('click', renderPool);
  if ($('gpUseWeek')) $('gpUseWeek').addEventListener('click', function () {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var e = XS.Gacha.addDays(t, 6);
    var p = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    $('gpStart').value = p(t); $('gpEnd').value = p(e);
    renderPool();
  });

  /* ---------- 每日一句待办提醒 ---------- */
  var gcTodayIdx = null;
  function renderReminder() {
    var box = $('gcReminder'); if (!box) return;
    var st = XS.Records.stats(XS.Records.load(), gcGameId());
    var rem = XS.Records.dailyReminder({
      score: gcTodayIdx ? gcTodayIdx.score : null,
      level: gcTodayIdx ? gcTodayIdx.level : null,
      bestHour: gcTodayIdx ? gcTodayIdx.bestHours[0] : null,
      stats: st, done: gcDoneToday()
    });
    var acct = getAcct();
    box.innerHTML = '<div class="reminder-card ' + rem.kind + '">'
      + '<div class="rc-icon">' + rem.icon + '</div>'
      + '<div class="rc-body">'
      +   '<div class="rc-label">今日待办 · ' + esc(todayStr()) + '　' + (acct ? esc(acct) + '　' : '') + esc(XS.Games.byId(gcGameId()).name) + '</div>'
      +   '<div class="rc-text">' + esc(rem.text) + '</div>'
      +   (gcTodayIdx ? '<div class="rc-sub">最好抽：<b>' + esc(gcTodayIdx.timeAdvice.bestText) + '</b>　最差：<b>' + esc(gcTodayIdx.timeAdvice.worstText) + '</b></div>' : '')
      + '</div>'
      + '<label class="rc-done"><input type="checkbox" id="gcDoneChk"' + (gcDoneToday() ? ' checked' : '') + '><span>今日已完成</span></label>'
      + '</div>';
    var chk = $('gcDoneChk');
    if (chk) chk.addEventListener('change', function () { gcSetDone(this.checked); renderReminder(); toast(this.checked ? '今日待办已勾选完成' : '已取消完成标记'); });
  }

  /* ---------- 抽卡记录 / 连歪计数器 ---------- */
  function recRow(label, value, cls) {
    return '<div class="rk"><span class="rk-l">' + esc(label) + '</span><span class="rk-v ' + (cls || '') + '">' + value + '</span></div>';
  }
  function renderRecords() {
    var list = XS.Records.load();
    var g = XS.Games.byId(gcGameId());
    var cur = XS.Records.stats(list, gcGameId());
    var all = XS.Records.overall(list);
    var h = '<div class="rec-stats">';
    h += '<div class="rec-big"><div class="rb-label">当前连歪（' + esc(g.name) + '）</div>'
      + '<div class="rb-num' + (cur.consecutiveOff >= 3 ? ' hot' : '') + '">' + cur.consecutiveOff + '<span>次</span></div>'
      + '<div class="rb-sub">' + (cur.consecutiveOff >= 3 ? '连歪三次以上，传统上该停手了' : '最近连续出货中的"歪"次数') + '</div></div>';
    h += '<div class="rec-kv">'
      + recRow('总抽数', cur.totalPulls + ' 发')
      + recRow('出货', cur.outs + ' 次<span class="muted">（UP ' + cur.ups + ' · 歪 ' + cur.offs + '）</span>')
      + recRow('出货率', (cur.rate * 100).toFixed(2) + '%')
      + recRow('距上次出货', cur.sinceLast + ' 发')
      + (cur.pity > 0 ? recRow('距保底（参考）', cur.pityRemain + ' 发 / ' + cur.pity, cur.pityRemain <= 10 ? 'warn' : '') : recRow('保底', '该游戏无硬保底'))
      + recRow('今日已抽', cur.todayPulls + ' 发')
      + '</div></div>';
    h += '<p class="muted" style="margin:10px 0 4px">' + esc(g.pityNote) + '　共 ' + cur.count + ' 条记录（本游戏）／全部游戏合计 ' + all.totalPulls + ' 抽、出货 ' + all.outs + ' 次</p>';

    // 各游戏汇总
    var pg = XS.Records.perGame(list);
    if (pg.length > 1) {
      h += '<table class="rec-table"><tr><th>游戏</th><th>抽数</th><th>出货</th><th>连歪</th><th>距上次出货</th></tr>';
      pg.forEach(function (s) { h += '<tr><td>' + esc(s.gameName) + '</td><td>' + s.totalPulls + '</td><td>' + s.outs + '</td><td>' + s.consecutiveOff + '</td><td>' + s.sinceLast + '</td></tr>'; });
      h += '</table>';
    }

    // 记录列表
    if (!cur.records.length) {
      h += '<p class="muted" style="margin-top:12px">还没有（本游戏的）抽卡记录。抽完记一笔，「连歪」和「距保底」就会自动算出来。</p>';
    } else {
      h += '<div class="rec-list-head"><h3>最近记录</h3></div><div class="rec-list">';
      cur.records.slice().reverse().slice(0, 30).forEach(function (r) {
        var oc = r.outcome === 'up' ? 'green' : r.outcome === 'off' ? 'red' : 'gray';
        h += '<div class="rec-item"><span class="ri-date">' + esc(r.date) + '</span>' + (r.account ? '<span class="tag">' + esc(r.account) + '</span>' : '')
          + '<span class="ri-pulls">' + r.pulls + ' 发</span>'
          + '<span class="tag ' + oc + '">' + esc(XS.Records.OUTCOME_TEXT[r.outcome]) + '</span>'
          + '<span class="ri-note">' + esc(r.note || '') + '</span>'
          + '<button class="ghost small ri-del" data-id="' + r.id + '" type="button">删</button></div>';
      });
      h += '</div>';
    }
    $('grStats').innerHTML = h;
    renderProb();
    var box = $('grStats');
    box.querySelectorAll('.ri-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var l2 = XS.Records.removeById(XS.Records.load(), this.dataset.id);
        XS.Records.save(null, l2);
        renderRecords(); renderReminder(); toast('已删除一条记录');
      });
    });
  }

  $('grAdd').addEventListener('click', function () {
    try {
      var pullsSel = $('grPulls').value;
      var pulls = pullsSel === '0' ? (+$('grPullsCustom').value || 1) : +pullsSel;
      var rec = { date: $('grDate').value || todayStr(), gameId: $('grGame').value, account: getAcct(),
                  pulls: pulls, outcome: $('grOutcome').value, note: $('grNote').value.trim() };
      var l2 = XS.Records.add(XS.Records.load(), rec);
      XS.Records.save(null, l2);
      $('grNote').value = '';
      renderRecords(); renderReminder();
      toast('已记一笔：' + pulls + ' 发 · ' + XS.Records.OUTCOME_TEXT[rec.outcome]);
    } catch (e) { toast('记录失败：' + e.message); }
  });
  $('grClearAll').addEventListener('click', function () {
    if (!confirm('确定清空全部抽卡记录？此操作不可恢复。')) return;
    XS.Records.save(null, []);
    renderRecords(); renderReminder(); toast('记录已清空');
  });

  /* ---------- 抽卡时运结果渲染 ---------- */
  function renderGacha(r) {
    var lv = r.levelIdx;
    var h = '';
    h += '<div class="card luck"><h2>今日抽卡时运' + (r.account ? '　·　' + esc(r.account) : '') + '</h2>';
    h += '<div class="luck-head">'
      + '<div class="luck-num"><b>' + r.score + '</b><span>气势分</span></div>'
      + '<div class="luck-side">'
      + '<div class="luck-level lv-' + lv + '">' + esc(r.grade ? r.grade.text : r.level) + '</div>'
      + '<div class="luck-meta">' + esc(r.date.text) + '（' + esc(r.date.week) + '）　' + esc(r.lunar.dayGZ) + '日　值神' + esc(r.lunar.tianShen) + '·' + esc(r.lunar.tianShenType) + '　建除' + esc(r.lunar.zhiXing) + '日　煞' + esc(r.lunar.sha) + (r.game ? '　【' + esc(r.game) + '】' : '') + '</div>'
      + '</div></div>';
    h += '<div class="luck-gauge"><div class="gauge-fill lv-' + lv + '" style="width:' + r.score + '%"></div><i class="gauge-mark" style="left:' + Math.min(99, r.score) + '%"></i></div>';
    h += '<div class="gauge-labels"><span>大凶</span><span>凶</span><span>平</span><span>吉</span><span>大吉</span></div>';
    h += '<div class="judge-rule"><b>判定规则（档位由此得出）</b><br>' + esc(r.levelRule)
      + '</div>';
    h += '<p class="luck-advice">' + esc(r.advice) + '</p>';
    h += '<p class="muted">气势分是上面规则的汇总（' + esc(r.scoreFormula) + '），只用于展示强弱连续度，<b>不参与档位判定</b>。</p>'
      + '<p class="muted">档位与气势分只由<b>当日历法</b>决定——<b>换游戏、换账号都不会改变它</b>；游戏只决定签池，账号只决定签文。</p></div>';

    // 抽卡时间建议（最好 / 最差，明写）
    h += '<div class="card slot-card"><h2>今天什么时候抽最好</h2>';
    h += '<div class="slot-row ok"><span class="slot-tag">最好</span>'
      + '<span class="slot-time">' + esc(r.timeAdvice.bestText) + '</span>'
      + '<span class="slot-note">' + esc(r.timeAdvice.best[0].tianShen) + '·黄道 · 今日吉时（分数 ' + r.timeAdvice.best[0].score + '）</span></div>';
    h += '<div class="slot-row bad"><span class="slot-tag">最差</span>'
      + '<span class="slot-time">' + esc(r.timeAdvice.worstText) + '</span>'
      + '<span class="slot-note">' + esc(r.timeAdvice.worst.tianShen) + '·' + (r.worstHour.type) + ' · 今日最弱，尽量避开</span></div>';
    h += '<p class="slot-sum">' + esc(r.timeAdvice.text) + '</p>';
    h += '<p class="muted">时辰吉凶用五维综合计分（时值神、时干十神、时支五行、与命局冲合、与当日日支关系），档位由综合分决定；<b>与玩什么游戏无关</b>。十二时辰完整表见下方。</p></div>';

    // 此刻抽卡（时运 × 概率）
    try {
      var gid0 = r.gameInfo.id, cfg0 = rateCfg(gid0), g0 = XS.Games.byId(gid0);
      var st0 = XS.Records.stats(XS.Records.load(), gid0);
      var pr0 = XS.Prob.nextTen(st0.sinceLast, cfg0);
      var ps0 = XS.Prob.probScore(st0.sinceLast, cfg0);
      var comp0 = XS.Prob.composite(r.score, ps0);
      h += '<div class="card nowcard"><h2>此刻抽卡（时运 × 概率）</h2>'
        + '<div class="now-grid">'
        + '<div class="now-cell"><span class="nc-label">今日时运分</span><span class="nc-val">' + r.score + '</span><span class="nc-sub">' + esc(r.level) + '</span></div>'
        + '<div class="now-cell"><span class="nc-label">概率态势分</span><span class="nc-val">' + ps0 + '</span><span class="nc-sub">十连 ' + pr0.p10.toFixed(2) + '%</span></div>'
        + '<div class="now-cell hot"><span class="nc-label">综合抽卡分</span><span class="nc-val">' + comp0 + '</span><span class="nc-sub">各占 50%</span></div>'
        + '</div>'
        + '<p class="slot-sum">' + esc(XS.Prob.advice(comp0, r.level, pr0.p10, pr0.guaranteedAt)) + '</p>'
        + '<p class="muted">综合分 = 时运分 × 50% ＋ 概率分 × 50%。概率分按你当前累计未出货 ' + st0.sinceLast + ' 抽与该游戏概率参数算出（纯数学，与运势无关）；两项分开看更准，综合分只作参考。</p>'
        + (pr0.guaranteedAt > 0 ? '<p class="muted">本次十连的第 ' + pr0.guaranteedAt + ' 抽会触发硬保底，必出。</p>' : '')
        + '<p class="muted">概率参数可在下方「抽卡记录 · 下一发十连概率」里改（按官方公示值填）。</p>'
        + '</div>';
    } catch (e) {}

    // 签文
    h += '<div class="card slip-card"><h2>今日签 · ' + esc(r.game || '通用') + '</h2><div class="slip">'
      + '<div class="slip-level">' + esc(r.slip.level) + '</div>'
      + '<div class="slip-title">' + esc(r.slip.title) + '</div>'
      + '<div class="slip-verse">' + esc(r.slip.verse) + '</div>'
      + '<div class="slip-note">' + esc(r.slip.note) + '</div></div>'
      + '<p class="muted" style="margin-top:12px">签文取自「' + esc(r.gameInfo.name) + '」专属签池（最高稀有：' + esc(r.gameInfo.unit) + '），按「日期＋账号＋游戏」定签：同一账号同一天固定，<b>换账号或换游戏会换签</b>。</p></div>';

    // 时辰
    h += '<div class="card"><h2>十二时辰吉凶</h2>';
    h += '<p style="margin:4px 0 10px">吉时（时值神黄道）：' + r.bestHours.map(function (x) {
      return '<span class="tag gold">' + x.name + '时 ' + x.range + ' · ' + x.tianShen + '</span>'; }).join('') + '</p>';
    h += '<div class="hour-grid">';
    r.hours.forEach(function (x) {
      var isBest = r.bestHours.some(function (b) { return b.name === x.name; });
      var isWorst = r.worstHour.name === x.name;
      h += '<div class="hour-cell' + (isBest ? ' best' : '') + (isWorst ? ' worst' : '') + '">'
        + '<div class="hz">' + x.name + '时</div><div class="hr">' + x.range + '</div>'
        + '<div class="hs ' + (x.level === '吉' ? 'lucky' : 'unlucky') + '">' + x.level + '</div>'
        + '<div class="ht ' + (x.type === '黄道' ? 'huang' : 'hei') + '">' + esc(x.tianShen) + '·' + x.type + '</div>'
        + '</div>';
    });
    h += '</div><p class="muted" style="margin-top:8px">时辰吉凶由五维综合分决定；最弱时辰 ' + r.worstHour.name + '时（' + r.worstHour.range + '）。<b>若该时段正值游戏维护或无法登录，其吉凶对你没有实际意义、可直接忽略。</b></p></div>';

    // 幸运 + 个人
    h += '<div class="grid2"><div class="card"><h2>今日幸运项</h2><div class="kv">'
      + '<div><span class="k">五行</span><span class="v ' + wxCls(r.lucky.wx) + '">' + esc(r.lucky.wx) + '</span></div>'
      + '<div><span class="k">数字</span><span class="v">' + r.lucky.numbers.join(' / ') + '</span></div>'
      + '<div><span class="k">颜色</span><span class="v">' + esc(r.lucky.colors) + '</span></div>'
      + '<div><span class="k">方位</span><span class="v">' + esc(r.lucky.dir) + '</span></div>'
      + '<div><span class="k">物件</span><span class="v" style="font-weight:400">' + esc(r.lucky.item) + '</span></div>'
      + '</div><p class="muted" style="margin-top:10px">' + esc(r.lucky.from) + '推出——属传统对应关系，图个仪式感。</p></div>';
    h += '<div class="card"><h2>你的个人因素</h2>';
    if (r.personal) {
      h += '<div class="kv">'
        + '<div><span class="k">日主</span><span class="v">' + esc(r.personal.dayMaster) + '（' + esc(r.personal.strength) + '）</span></div>'
        + '<div><span class="k">今日十神</span><span class="v">' + esc(r.personal.shiShen) + '</span></div>'
        + '<div><span class="k">喜用神</span><span class="v">' + (esc(r.personal.yongShen.join('、')) || '—') + '</span></div>'
        + '<div><span class="k">日支冲合</span><span class="v">' + (r.personal.chong ? '<span class="tag red">冲（' + esc(r.personal.myZhi) + '）</span>' : r.personal.he ? '<span class="tag green">六合</span>' : '无') + '</span></div>'
        + '</div><p class="muted" style="margin-top:10px">日支冲你的日支时，按「日辰冲命」传统计入扣分（分数会明显偏低）；档位完全由气势分决定，分数与档位永远一致。</p>';
    } else {
      h += '<p class="muted">未填生辰，只按今日通用历法判定。填上出生日期与时间后，会叠加「日辰冲命」的降档规则与个人十神、喜用神。</p>';
    }
    h += '</div></div>';

    // 宜忌
    h += '<div class="grid2"><div class="card"><h2>宜</h2><ul class="plain">'
      + r.doList.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'
      + '<div class="card"><h2>忌</h2><ul class="plain">'
      + r.dontList.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>';

    // 气势分依据
    h += '<div class="card"><h2>气势分依据（逐项可查）</h2><table class="basis-table">'
      + '<tr><th>指标</th><th>当日取值</th><th>传统依据</th><th>计分</th></tr>'
      + r.indicators.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.value) + '</td><td class="doc">' + esc(p.doctrine) + '</td><td class="delta ' + (p.pts >= 0 ? 'up' : 'down') + '">' + (p.pts >= 0 ? '+' : '') + p.pts + '</td></tr>';
      }).join('')
      + '<tr class="total"><td colspan="3">合计 → ' + esc(r.scoreFormula) + '</td><td class="delta">' + (r.scoreSum >= 0 ? '+' : '') + r.scoreSum + '</td></tr></table></div>';

    h += interpCard(XS.Interp.gacha(r));
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    return h;
  }

  /* ---------- 抽卡页 · 出生信息控件绑定 ---------- */
  (function bindGcBirth() {
    var cal = $('gcBirthCalendar');
    if (!cal) return;
    cal.addEventListener('change', function () { gcSyncBirthUI(); gcSaveBirth(); });
    ['gcLYear', 'gcLMonth', 'gcLDay'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('change', function () { gcSyncBirthUI(); gcSaveBirth(); });
    });
    var leap = $('gcLeap');
    if (leap) leap.addEventListener('change', function () { gcSyncBirthUI(); gcSaveBirth(); });
    ['gcBirthDate', 'gcBirthTime', 'gcGender', 'gcLng'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('change', gcSaveBirth);
    });
    // 打开页面时回填上次填过的出生信息
    if (!gcLoadBirth()) { if ($('gcBirthDate') && !$('gcBirthDate').value) $('gcBirthDate').value = PRESET.date; gcSyncBirthUI(); }
  })();

  $('gcRun').addEventListener('click', function () {
    try {
      var dd = $('gcDate').value || todayStr();
      var p = dd.split('-');
      gcLastOpt = { y: +p[0], m: +p[1], d: +p[2] };
      gcSavePrefs({ gameId: gcGameId(), gameName: $('gcGame').value.trim(), birth: gcBirth() });
      var r = gcRefresh(true);
      toast('算好了：今日' + r.level + '　签：' + r.slip.title);
    } catch (e) {
      $('gcResult').innerHTML = '<div class="card"><p class="tag red">算不出来：' + esc(e.message) + '</p></div>';
    }
  });
  $('gcCopy').addEventListener('click', function () { copyText(state.lastText.gacha); });
  $('gcSave').addEventListener('click', function () { downloadText('抽卡时运.txt', state.lastText.gacha); });

  // 恢复上次用的游戏与生辰
  (function gcRestore() {
    var p = gcPrefs();
    if (p.gameId) {
      var exists = XS.Games.GAMES.some(function (g) { return g.id === p.gameId; });
      $('gcGameSel').value = exists ? p.gameId : XS.Games.GAMES[0].id;
      if ($('gcGameSel').value === 'generic') { $('gcGameWrap').style.display = ''; $('gcGame').value = p.gameName || ''; }
    }
    if (p.birth) {
      $('gcBirthDate').value = p.birth.y + '-' + pad(p.birth.m) + '-' + pad(p.birth.d);
      $('gcBirthTime').value = pad(p.birth.h) + ':' + pad(p.birth.mi);
      $('gcGender').value = String(p.birth.gender);
    }
    $('grGame').value = $('gcGameSel').value;
  })();

  // 首次进入就先把"今日待办"算出来（不用点按钮）
  (function gcInit() {
    try {
      var t = new Date();
      gcTodayIdx = gcCompute(t.getFullYear(), t.getMonth() + 1, t.getDate());
    } catch (e) { gcTodayIdx = null; }
    renderReminder();
    renderRecords();
    renderWeek();
    $('gpStart').value = todayStr();
    $('gpEnd').value = (function () { var d = XS.Gacha.addDays(new Date(), 6); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
  })();

  /* ============================================================
   *  六、二次元相性
   * ============================================================ */
  function mtFillMine() {
    try {
      var s = JSON.parse(localStorage.getItem('xiangshu.bazi.input') || 'null');
      if (!s || !s.y) return;
      // 用户排过盘就以排盘输入为准；但时间只在知道时才覆盖（不记得就保持空）
      $('mtMeDate').value = s.y + '-' + pad(s.m) + '-' + pad(s.d);
      if (s.h !== undefined && s.h !== null && s.hourKnown !== false) $('mtMeTime').value = pad(s.h) + ':' + pad(s.mi || 0);
      $('mtMeGender').value = String(s.gender === 0 ? 0 : 1);
    } catch (e) {}
  }
  function mtMe() {
    var d = $('mtMeDate').value; if (!d) return null;
    var p = d.split('-'), tv = $('mtMeTime').value;
    var o = { y: +p[0], m: +p[1], d: +p[2], gender: +$('mtMeGender').value };
    if (tv) { var t = tv.split(':'); o.h = +t[0]; o.mi = +t[1]; }   // 空时间 = 时辰未知
    return o;
  }
  function mtOther() {
    var d = $('mtDate').value, o = { name: $('mtName').value.trim(), wx: $('mtWx').value };
    if (d) {
      var p = d.split('-'), tv = $('mtTime').value;
      o.birth = { y: +p[0], m: +p[1], d: +p[2] };
      if (tv) { var t = tv.split(':'); o.birth.h = +t[0]; o.birth.mi = +t[1]; }
    } else if ($('mtMonth') && $('mtMonth').value && $('mtDay') && $('mtDay').value) {
      o.monthday = { m: +$('mtMonth').value, d: +$('mtDay').value };
      if ($('mtAssumeYear') && $('mtAssumeYear').value) o.assumedYear = +$('mtAssumeYear').value;
    }
    return o;
  }
  function lvClsOf(score) { return 'lv-' + (score >= 88 ? 5 : score >= 76 ? 4 : score >= 62 ? 3 : score >= 46 ? 2 : 1); }
  function renderMatch(r) {
    if (!r.ok) return '<div class="card"><p class="tag red">' + esc(r.error) + '</p></div>';
    var cls = lvClsOf(r.score);
    var h = '';
    h += '<div class="card luck match-card"><h2>相性结果' + (r.account ? '　·　' + esc(r.account) : '') + '</h2>';
    h += '<div class="luck-head"><div class="luck-num"><b>' + r.score + '</b><span>相性分</span></div>'
      + '<div class="luck-side"><div class="luck-level ' + cls + '">' + esc(r.level.name) + '</div>'
      + '<div class="luck-meta">我 × ' + esc(r.other.name) + '　·　' + esc(r.modeText)
        + (r.assumedYear ? '　<span class="tag">年份为假定 ' + r.assumedYear + '</span>'
            : r.confidence !== 'high' ? '　<span class="tag">资料不全 · 满分封顶 ' + (r.confidence === 'mid' ? 88 : 80) + '</span>' : '')
        + '</div></div></div>';
    h += '<div class="luck-gauge"><div class="gauge-fill ' + cls + '" style="width:' + r.score + '%"></div><i class="gauge-mark" style="left:' + Math.min(99, r.score) + '%"></i></div>';
    h += '<div class="gauge-labels"><span>相冲</span><span>需磨合</span><span>平顺</span><span>相得益彰</span><span>天作之合</span></div>';
    h += '<p class="slot-sum">' + esc(r.advice) + '</p>';
    h += '<p class="muted">' + esc(r.formula) + '。分数只是规则汇总，等级按固定区间，不掺主观。</p>';
    h += '</div>';

    h += '<div class="card"><h2>双方盘面</h2><div class="kv">'
      + '<div><span class="k">我的八字</span><span class="v">' + esc(r.me.bazi.join(' ')) + '</span></div>'
      + (r.other.bazi
          ? '<div><span class="k">角色八字</span><span class="v">' + esc(r.other.bazi.join(' ')) + '</span></div>'
          : r.mode === 'month'
            ? '<div><span class="k">角色月令</span><span class="v">' + esc(r.monthZhi + '月 · ' + r.other.wx) + (r.monthAmbiguous ? '（紧贴节气交界）' : '') + '</span></div>'
            : '<div><span class="k">角色属性</span><span class="v">' + esc(r.other.wxRaw || r.other.wx || '—') + (r.other.wxFromRaw ? '（五行' + esc(r.other.wx) + '）' : '') + '</span></div>')
      + '</div>' + (r.note ? '<p class="muted" style="margin-top:10px">' + esc(r.note) + '</p>' : '') + '</div>';

    h += '<div class="card"><h2>合盘依据（逐条）</h2><table class="basis-table"><tr><th>项目</th><th>盘面</th><th>含义</th><th>计分</th></tr>'
      + r.parts.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.detail) + '</td><td class="doc">' + esc(p.doctrine) + '</td>'
          + '<td class="delta ' + (p.pts >= 0 ? 'up' : 'down') + '">' + (p.pts >= 0 ? '+' : '') + p.pts + '</td></tr>';
      }).join('')
      + '<tr class="total"><td colspan="3">合计 → ' + esc(r.formula) + '</td><td class="delta">' + (r.sum >= 0 ? '+' : '') + r.sum + '</td></tr></table></div>';

    h += interpCard(XS.Interp.match(r));
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    return h;
  }
  $('mtWx').addEventListener('change', function () {
    var MAP = {
      风:'木（巽为风）', 雷:'木（震为雷）', 草:'木（草木同气）', 电:'木（震为雷动）',
      冰:'水（寒凝）', 暗:'水（坎为隐伏）', 烈霜:'水（寒凝之极）', 玄墨:'水（坎为黑）', 量子:'水（微观流动）',
      光:'火（离为明）', 流明:'火（流明为光束）',
      岩:'土（艮为山）', 以太:'土（虚空承载）', 盾:'土（护持）',
      物理:'金（刚硬直取）', 凛刃:'金（刃属金）'
    };
    var hint = $('mtWxHint');
    if (hint) hint.textContent = MAP[this.value] ? '→ 换算为五行：' + MAP[this.value] : '';
  });
  /* ---- 我和全部名单角色的相性排行 ---- */
  $('mtRank').addEventListener('click', function () {
    var me = mtMe();
    if (!me) { toast('先填你的出生日期'); return; }
    if (!XS.Chars) { toast('角色名单未加载'); return; }
    var assumeYear = ($('mtAssumeYear') && $('mtAssumeYear').value) ? +$('mtAssumeYear').value : 0;
    var rows = XS.Chars.all().map(function (c) {
      var r = XS.Match.match({ me: me, other: { name: c.name, monthday: c.monthday, wx: c.attr, assumedYear: assumeYear } });
      return r.ok ? { c: c, score: r.score, level: r.level.name, mode: r.mode, assumed: !!r.assumedYear } : null;
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score || a.c.name.localeCompare(b.c.name); });
    var top = rows[0];
    var h = '<div class="card"><h2>我和全部 ' + rows.length + ' 个角色的相性排行</h2>';
    h += (assumeYear ? '<p class="muted" style="color:var(--zhu)"><b>当前按假定年份 ' + assumeYear + ' 计算</b>：年份是假设的，换个年份结论可能反转，仅作对照。</p>' : '');
    h += '<p class="muted">按分数排序。<b>三种档位的满分不同</b>（完整盘 100 / 月令盘 88 / 简盘 80），所以分数只在同档位内可比——右侧标了档位。资料不全的结果本来就该打折，不是您和谁不合。</p>';
    h += '<div class="rank-grid">' + rows.map(function (x, i) {
      return '<div class="rank-row' + (i < 3 ? ' hot' : '') + '">'
        + '<span class="rk-no">' + (i + 1) + '</span>'
        + '<span class="rk-name">' + esc(x.c.name) + '<i>' + esc(x.c.game) + ' · ' + esc(x.c.attr) + (x.c.monthday ? ' · ' + x.c.monthday.m + '/' + x.c.monthday.d : '') + '</i></span>'
        + '<span class="rk-lv">' + esc(x.level) + '</span>'
        + '<span class="rk-score">' + x.score + '</span>'
        + '<span class="rk-mode">' + (x.assumed ? '假定' : x.mode === 'full' ? '完整' : x.mode === 'month' ? '月令' : '简盘') + '</span>'
        + '</div>';
    }).join('') + '</div></div>';
    $('mtResult').innerHTML = h;
    window.scrollTo({ top: Math.max(0, $('mtResult').getBoundingClientRect().top + window.scrollY - 80) });
    toast('最合：' + top.c.name + ' ' + top.score + ' 分 · ' + top.level);
  });

  $('mtRun').addEventListener('click', function () {
    try {
      var r = XS.Match.match({ me: mtMe(), other: mtOther(), account: getAcct() });
      $('mtResult').innerHTML = renderMatch(r);
      if (r.ok) {
        saveResult('match', '二次元相性', (r.account ? r.account + ' × ' : '我 × ') + r.other.name + ' · ' + r.score + ' 分（' + r.level.name + '）', $('mtResult').innerHTML, XS.Match.report(r));
        toast('相性：' + r.score + ' 分 · ' + r.level.name);
      } else { toast(r.error); }
    } catch (e) { $('mtResult').innerHTML = '<div class="card"><p class="tag red">算不出来：' + esc(e.message) + '</p></div>'; }
  });
  $('mtCopy').addEventListener('click', function () { copyText(state.lastText.match); });
  $('mtSave').addEventListener('click', function () { downloadText('二次元相性.txt', state.lastText.match); });
  /* ---- 角色库（本机保存，解决"很多角色没生日/要重复录入"） ---- */
  var ROSTER_KEY = 'xiangshu.match.roster';
  function loadRoster() { try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]'); } catch (e) { return []; } }
  function saveRoster(list) { try { localStorage.setItem(ROSTER_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {} }
  function renderRoster() {
    var wrap = $('mtRosterWrap'), box = $('mtRoster');
    if (!wrap || !box) return;
    var list = loadRoster();
    wrap.style.display = list.length ? '' : 'none';
    box.innerHTML = list.map(function (c, i) {
      return '<span class="chip" data-i="' + i + '"><b>' + esc(c.name) + '</b>'
        + '<i>' + esc(c.wx || '未填属性') + (c.birth ? ' · 有生日' : c.monthday ? ' · ' + c.monthday.m + '/' + c.monthday.d : ' · 无月日') + '</i>'
        + '<button class="chip-x" data-del="' + i + '" type="button" title="删除">✕</button></span>';
    }).join('');
  }
  $('mtRoster').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del]');
    if (del) {
      var list = loadRoster(); list.splice(+del.dataset.del, 1); saveRoster(list); renderRoster();
      toast('已从角色库删除'); return;
    }
    var chip = e.target.closest('.chip'); if (!chip) return;
    var c = loadRoster()[+chip.dataset.i]; if (!c) return;
    $('mtName').value = c.name || '';
    $('mtDate').value = c.birth || '';
    $('mtMonth').value = c.monthday ? String(c.monthday.m) : '';
    $('mtDay').value = c.monthday ? String(c.monthday.d) : '';
    $('mtWx').value = c.wx || '';
    $('mtWx').dispatchEvent(new Event('change'));
    toast('已填入：' + (c.name || '角色'));
  });
  $('mtSaveChar').addEventListener('click', function () {
    var name = $('mtName').value.trim();
    if (!name) { toast('先填角色名再存喵'); return; }
    var list = loadRoster().filter(function (c) { return c.name !== name; });
    list.unshift({ name: name, wx: $('mtWx').value, birth: $('mtDate').value || '',
      monthday: ($('mtMonth').value && $('mtDay').value) ? { m: +$('mtMonth').value, d: +$('mtDay').value } : null });
    saveRoster(list); renderRoster();
    toast('已存入角色库：' + name);
  });
  renderRoster();

  /* ---- 内置角色名单浏览器 ---- */
  var pcGame = 'zzz';
  function pcRender() {
    var box = $('pcGames'), listBox = $('pcList');
    if (!box || !listBox || !XS.Chars) return;
    box.innerHTML = XS.Chars.GROUPS.map(function (g) {
      return '<button class="pc-game' + (g.id === pcGame ? ' on' : '') + '" data-g="' + g.id + '" type="button">'
        + esc(g.name) + '<i>' + g.chars.length + '</i></button>';
    }).join('');
    var kw = ($('pcSearch').value || '').trim();
    var g = XS.Chars.GROUPS.filter(function (x) { return x.id === pcGame; })[0];
    var chars = (g ? g.chars : []).filter(function (c) {
      return !kw || c.name.indexOf(kw) >= 0 || (c.attr || '').indexOf(kw) >= 0;
    });
    listBox.innerHTML = chars.length ? chars.map(function (c) {
      return '<button class="pc-item" data-n="' + esc(c.name) + '" type="button">'
        + '<b>' + esc(c.name) + '</b>'
        + '<i>' + esc(c.attr) + (c.wx ? '→' + c.wx : '') + (c.monthday ? ' · ' + c.monthday.m + '/' + c.monthday.d : '') + (c.spec ? ' · ' + esc(c.spec) : '') + '</i>'
        + '</button>';
    }).join('') : '<p class="muted">没找到，换个关键词试试</p>';
  }
  $('pcGames').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    pcGame = b.dataset.g; pcRender();
  });
  $('pcSearch').addEventListener('input', function () { pcRender(); });
  $('pcList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-n]'); if (!b) return;
    var c = XS.Chars.find(b.dataset.n); if (!c) return;
    $('mtName').value = c.name;
    $('mtDate').value = '';                                  // 换角色先清干净旧资料
    $('mtTime').value = '';
    $('mtWx').value = c.attr || '';
    $('mtMonth').value = c.monthday ? String(c.monthday.m) : '';
    $('mtDay').value = c.monthday ? String(c.monthday.d) : '';
    $('mtWx').dispatchEvent(new Event('change'));
    toast('已填入：' + c.name + '（' + c.attr + (c.monthday ? ' · ' + c.monthday.m + '/' + c.monthday.d : '') + '）');
    id16Scroll();
  });
  function id16Scroll() {
    var box = $('mtResult');
    window.scrollTo({ top: Math.max(0, $('mtName').getBoundingClientRect().top + window.scrollY - 120) });
  }
  pcRender();

  mtFillMine();

  /* ==================== 键盘快捷键 ==================== */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      var map = { bazi: 'bzRun', meihua: 'mhRun', liuyao: 'lyRun', xlr: 'xlrRun', gacha: 'gcRun' };
      var id = map[state.module]; if (id && $(id)) { $(id).click(); }
    }
  });

  renderHistory();
})();


