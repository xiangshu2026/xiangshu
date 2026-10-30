/*!
 * xs-prob.js —— 抽卡概率计算（象数工坊）
 * 纯数学：按游戏公示概率 + 保底/软保底机制 + 当前已累计未出货抽数，算「下一发十连出卡概率」。
 * 与术数运势无关，两者在界面上分开呈现。
 *
 * 模型（参数均可在界面调整）：
 *   rate      基础单抽概率（%）
 *   softPity  软保底起点：累计该抽数之后，每抽额外 +softStep%
 *   softStep  软保底每抽加成（百分点）
 *   pity      硬保底抽数（累计到该抽数必出；0 = 无硬保底）
 * 十连至少出一个的概率 = 1 - Π(1 - p_i)，p_i 为第 i 抽的即时概率。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.XS = root.XS || {}; root.XS.Prob = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 累计第 n 抽（自上次出货算起，1-based）的即时单抽概率（%）
  function rateAt(n, cfg) {
    var p = +cfg.rate || 0;
    if (cfg.softPity > 0 && n > cfg.softPity) p += (+cfg.softStep || 0) * (n - cfg.softPity);
    if (cfg.pity > 0 && n >= cfg.pity) p = 100;
    return clamp(p, 0, 100);
  }

  // 下一发十连：逐抽概率 + 至少出一个的概率 + 第几抽触发保底
  function nextTen(used, cfg) {
    used = Math.max(0, +used || 0);
    var per = [], prod = 1, guaranteedAt = -1;
    for (var i = 1; i <= 10; i++) {
      var p = rateAt(used + i, cfg);
      per.push(+p.toFixed(3));
      if (p >= 100 && guaranteedAt < 0) guaranteedAt = i;
      prod *= (1 - p / 100);
    }
    return { used: used, perPull: per, single: rateAt(used + 1, cfg), p10: +( (1 - prod) * 100 ).toFixed(2), guaranteedAt: guaranteedAt };
  }

  // 「正常状态」的十连概率（0 累计、未进软保底），作为概率分的中性基准
  function baseP10(cfg) {
    var p = clamp(+cfg.rate || 0, 0, 100) / 100;
    return +((1 - Math.pow(1 - p, 10)) * 100).toFixed(2);
  }

  // 概率分：基准十连概率 = 50 分；保底必出（100%）= 100 分；线性映射，便于和时运分平均
  function probScore(used, cfg) {
    var p10 = nextTen(used, cfg).p10, b = baseP10(cfg);
    if (b >= 99.9) return 100;
    var s = 50 + 50 * (p10 - b) / (100 - b);
    return Math.round(clamp(s, 0, 100));
  }

  // 综合分 = 时运分 × w + 概率分 × (1-w)；默认各一半
  function composite(dayScore, pScore, w) {
    w = (w === undefined || w === null) ? 0.5 : w;
    return Math.round(clamp(dayScore * w + pScore * (1 - w), 0, 100));
  }

  // 一句话判断（规则式，依据综合分与当日档位）
  function advice(comp, level, p10, guaranteedAt) {
    if (level === '大吉' && comp >= 70) return '时运与概率同向，此刻抽卡条件最好。';
    if (level === '吉' && comp >= 60) return '时运与概率都不错，可按计划抽。';
    if (comp >= 55) return '综合条件偏优，可以抽一点，见好就收。';
    if (comp >= 45) return '两边都一般，按原计划抽、抽够就收，别临时加码。';
    if (comp >= 35) return '综合条件不占优，建议只做日常，把票留到更合适的时机。';
    return '时运与概率都不占优，此刻不建议抽。';
  }

  return { rateAt: rateAt, nextTen: nextTen, baseP10: baseP10, probScore: probScore, composite: composite, advice: advice };
});
