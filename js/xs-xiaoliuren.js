/*!
 * xs-xiaoliuren.js —— 小六壬（六宫掐指）引擎（象数工坊）
 * 六宫：大安、留连、速喜、赤口、小吉、空亡
 * 起法：农历月→日→时（大安起月，月上起日，日上起时）；亦支持三数报数起课
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./lunar.js')); }
  else { root.XS = root.XS || {}; root.XS.XiaoLiuRen = factory(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Lib) {
  'use strict';
  var Solar = Lib.Solar;

  var GONG = [
    { name:'大安', wx:'木', shen:'青龙', jiXiong:'吉', dir:'东方',
      jue:'大安事事昌，求财在东方；失物不远去，宅舍保安康；行人身未动，病者主无妨；将军回田野，仔细好推详。',
      jie:'身不动时，五行属木，青龙。主平安、安定、稳当、不动之象。',
      shi:'宜守成、宜静养、宜家宅之事；谋事宜缓图，不宜妄动。',
      cai:'求财在东方，可得但不急切。', bing:'病者无妨，宜静养。', xing:'行人未动，暂不归。', shiWu:'失物未曾远去，原处可寻。' },
    { name:'留连', wx:'水', shen:'玄武', jiXiong:'凶', dir:'北方',
      jue:'留连事难成，求谋日未明；官事只宜缓，去者未回程；失物南方见，急讨方称心；更须防口舌，人口且平平。',
      jie:'卒未归时，五行属水，玄武。主拖延、纠缠、反复、难成之象。',
      shi:'事多迟滞，宜守不宜进，宜缓办、宜耐心，防他人牵扯。',
      cai:'求财费力，财来迟。', bing:'病多反复，迁延难愈。', xing:'行人未回，归期不定。', shiWu:'失物南方可寻，急讨方得。' },
    { name:'速喜', wx:'火', shen:'朱雀', jiXiong:'吉', dir:'南方',
      jue:'速喜喜来临，求财向南行；失物申未午，逢人路上寻；官事有福德，病者无祸侵；田宅六畜吉，行人有信音。',
      jie:'人便至时，五行属火，朱雀。主喜事、快速、消息、热络之象。',
      shi:'事多速成，宜把握时机、宜主动出击，多有好消息。',
      cai:'求财向南行，速得。', bing:'病者无祸，速愈。', xing:'行人有信音，即至。', shiWu:'失物在路上、申未午时可见。' },
    { name:'赤口', wx:'金', shen:'白虎', jiXiong:'凶', dir:'西方',
      jue:'赤口主口舌，官非切要防；失物急去寻，行人有惊慌；鸡犬多作怪，病者出西方；更须防咒诅，恐怕染瘟殃。',
      jie:'官事凶时，五行属金，白虎。主口舌、争执、官非、惊吓之象。',
      shi:'防口舌是非、合同纠纷、突发争执；宜慎言、宜避争、宜早作了断。',
      cai:'求财起争，忌合伙分利不明。', bing:'病者宜速就医，防延误。', xing:'行人路上有惊慌。', shiWu:'失物急寻，迟则难觅。' },
    { name:'小吉', wx:'木', shen:'六合', jiXiong:'大吉', dir:'东南',
      jue:'小吉最吉昌，路上好商量；阴人来报喜，失物在坤方；行人即便至，交易甚是强；凡事皆和合，病者祈上苍。',
      jie:'人来喜时，五行属木，六合。主和合、顺利、喜庆、人缘之象。',
      shi:'凡事宜合作、宜商议、宜交往，多有人相助，事多和合而成。',
      cai:'交易顺利，求财得利。', bing:'病者和缓，可愈。', xing:'行人即便至。', shiWu:'失物在西南（坤方）可得。' },
    { name:'空亡', wx:'土', shen:'勾陈', jiXiong:'大凶', dir:'西南',
      jue:'空亡事不祥，阴人多乖张；求财无利益，行人有灾殃；失物寻不见，官事有刑伤；病人逢暗鬼，解禳保安康。',
      jie:'音信稀时，五行属土，勾陈。主落空、虚耗、无果、暗昧之象。',
      shi:'事多落空、白费力气，宜止宜缓，重新筹划；防暗中之损。',
      cai:'求财无利，防破财。', bing:'病多暗疾，宜早治。', xing:'行人羁绊，归期渺茫。', shiWu:'失物难寻。' }
  ];
  var GONG_ORDER = ['大安','留连','速喜','赤口','小吉','空亡'];

  function step(fromIdx, count) { return (fromIdx + count - 1) % 6; } // 从某宫起 1，数 count

  function byTime(opt) {
    var solar = Solar.fromYmdHms(+opt.y, +opt.m, +opt.d, +opt.h || 0, +opt.mi || 0, 0);
    var lunar = solar.getLunar();
    var month = Math.abs(lunar.getMonth()), day = lunar.getDay(), shiZhi = lunar.getTimeZhiIndex() + 1;
    var i1 = step(0, month);           // 大安起正月
    var i2 = step(i1, day);            // 月上起日
    var i3 = step(i2, shiZhi);         // 日上起时
    return {
      method: 'time', methodText: '月日时起课（小六壬掌诀）',
      solarText: solar.toYmdHms(), lunarText: lunar.toString(),
      detail: '农历 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' ' + lunar.getTimeZhi() + '时',
      steps: [
        { label:'月（正月起大安）', from:'大安', count:month, to:GONG[i1].name },
        { label:'日（' + GONG[i1].name + '起初一）', from:GONG[i1].name, count:day, to:GONG[i2].name },
        { label:'时（' + GONG[i2].name + '起子时）', from:GONG[i2].name, count:shiZhi, to:GONG[i3].name }
      ],
      resultIdx: i3, dayIdx: i2, monthIdx: i1
    };
  }
  function byNumbers(opt) {
    // 数必须 ≥1：0/负数视为 1（防御，避免 step() 出现负下标）
    var nz = function (v) { var n = Math.abs(parseInt(v, 10) || 0); return n >= 1 ? n : 1; };
    var n1 = nz(opt.n1), n2 = nz(opt.n2);
    var n3 = (opt.n3 === undefined || opt.n3 === null || opt.n3 === '') ? 1 : nz(opt.n3);
    var i1 = step(0, n1), i2 = step(i1, n2), i3 = step(i2, n3);
    return {
      method: 'numbers', methodText: '三数报数起课',
      steps: [
        { label:'第一数（大安起）', from:'大安', count:n1, to:GONG[i1].name },
        { label:'第二数（' + GONG[i1].name + '起）', from:GONG[i1].name, count:n2, to:GONG[i2].name },
        { label:'第三数（' + GONG[i2].name + '起）', from:GONG[i2].name, count:n3, to:GONG[i3].name }
      ],
      resultIdx: i3, dayIdx: i2, monthIdx: i1
    };
  }
  function randomKe() {
    var rnd = function () { var g = Math.random(); return Math.floor(g * 99) + 1; };
    var r = byNumbers({ n1: rnd(), n2: rnd(), n3: rnd() });
    r.method = 'random'; r.methodText = '随机起课';
    return r;
  }
  function analyze(q) {
    var g = GONG[q.resultIdx];
    return {
      ok: true, method: q.method, methodText: q.methodText, steps: q.steps,
      solarText: q.solarText, lunarText: q.lunarText, detail: q.detail,
      gong: g, gongName: g.name, jiXiong: g.jiXiong,
      monthGong: GONG[q.monthIdx], dayGong: GONG[q.dayIdx],
      overview: '落宫「' + g.name + '」（' + g.wx + '·' + g.shen + '·' + g.jiXiong + '），主' + g.jie,
      advice: g.shi,
      aspects: { 求财:g.cai, 疾病:g.bing, 行人:g.xing, 失物:g.shiWu }
    };
  }
  function ke(opt) {
    var o = opt || {};
    var q = (o.method === 'numbers') ? byNumbers(o) : (o.method === 'random') ? randomKe() : byTime(o);
    return analyze(q);
  }
  function report(r) {
    var L = ['【小六壬】' + r.methodText];
    if (r.detail) L.push('  时间：' + r.solarText + '（' + r.detail + '）');
    r.steps.forEach(function (s) { L.push('  ' + s.label + ' 数 ' + s.count + ' → ' + s.to); });
    L.push('');
    L.push('落宫：' + r.gongName + '（' + r.gong.wx + '・' + r.gong.shen + '・' + r.gong.dir + '・' + r.jiXiong + '）');
    L.push('宫义：' + r.gong.jie);
    L.push('掌诀：' + r.gong.jue);
    L.push('宜忌：' + r.advice);
    L.push('分项：' + Object.keys(r.aspects).map(function (k) { return k + '——' + r.aspects[k]; }).join('；'));
    return L.join('\n');
  }
  return { ke: ke, report: report, byTime: byTime, byNumbers: byNumbers, randomKe: randomKe, GONG: GONG, GONG_ORDER: GONG_ORDER };
});
