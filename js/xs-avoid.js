/*!
 * xs-avoid.js —— 「遇到凶如何避灾」（生辰八字 · 化解建议）
 *
 * 【方法】传统术数的「趋避」不是画符念咒，而是：先找出凶在哪个维度，再给对应的调整。
 *   ① 五行偏枯 → 用喜用五行补，忌神五行泄（颜色/方位/作息/环境）
 *   ② 忌神方位 → 大事避方位、宜用喜用方位
 *   ③ 凶煞 → 按神煞性质给行为规避（如驿马多主奔波、空亡宜守不宜签）
 *   ④ 日辰冲命 → 冲日支/年支的日子与时辰要避开
 *   ⑤ 择日 → 给宜/忌事项与吉时
 * 全部输出都是「可执行的行为建议」，不作吉凶判决，也不替代医疗与法律意见。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./xs-data.js'), require('./xs-bazi.js'), require('./xs-daily.js'));
  } else {
    root.XS = root.XS || {};
    root.XS.Avoid = factory(root.XS.Data, root.XS.Bazi, root.XS.Daily);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, BZ, DL) {
  'use strict';

  // 五行 → 方位 / 颜色 / 生活习惯（传统对应）
  var WX_MAP = {
    木: { dir: '东方', color: '青、绿', organ: '肝胆', habit: '多接触草木、早起、伸展', avoid: '久坐不动、熬夜伤肝' },
    火: { dir: '南方', color: '红、紫', organ: '心、小肠', habit: '晒背、适度运动、与人交流', avoid: '过度兴奋、剧烈情绪' },
    土: { dir: '中央、西南、东北', color: '黄、棕', organ: '脾胃', habit: '规律进食、接地气、稳步推进', avoid: '思虑过度、暴饮暴食' },
    金: { dir: '西方', color: '白、银', organ: '肺、大肠', habit: '深呼吸、整理收纳、果断决事', avoid: '优柔寡断、久处浊气' },
    水: { dir: '北方', color: '黑、蓝', organ: '肾、膀胱', habit: '充足睡眠、近水、静坐', avoid: '纵欲、恐惧焦虑、久坐憋尿' }
  };
  var WX_ALL = ['木', '火', '土', '金', '水'];

  // 神煞 → 行为规避（只列常见、有明确行为含义的）
  // 吉神：不算"要规避"，单独提示即可
  var JI_SHEN = ['天乙贵人', '文昌贵人', '天德贵人', '月德贵人', '太极贵人', '福星贵人', '国印贵人', '禄神', '将星', '金舆'];

  var SHA_ADVICE = {
    '驿马(日支)': '主奔波变动：出行多、易折腾。凶时应减少远行与频繁跳槽，先把一件事做稳。',
    '驿马(年支)': '主奔波：年支驿马，长距离移动多。凶时慎长途、慎签异地合同。',
    '桃花(日支)': '主异性缘与情绪：凶时易因感情/人情误事，重要决策别在情绪波动时做。',
    '华盖': '主孤高独处：凶时易钻牛角尖，多与人沟通、别独自硬扛。',
    '空亡(旬空)(日柱)': '主"落空"：签约、投资、托人办事在空亡日易落空，重要事情避开空亡日。',
    '魁罡': '主刚烈：凶时易与人正面冲突，遇争执先退一步。',
    '羊刃': '主刚猛易伤：凶时避免危险运动、开车别斗气。',
    '劫煞': '主耗损：凶时防破财、别借钱给人、别贪高收益。',
    '灾煞': '主意外：凶时减少高风险活动（爬高、夜路、极限运动）。'
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /**
   * @param opt { birth:{y,m,d,h?,gender}, y?,m?,d?（要看的日子，可空） }
   */
  function analyze(opt) {
    opt = opt || {};
    var br;
    try { br = BZ.paipan(opt.birth || {}); } catch (e) { return { ok: false, error: '排盘失败：' + e.message }; }
    if (!br || !br.ok) return { ok: false, error: '请先填出生日期' };

    var dm = br.dayMaster;
    var favor = (br.strength.yongHint.favor || []).slice();
    var score = br.wuXing.score;
    var maxWx = WX_ALL.slice().sort(function (a, b) { return score[b] - score[a]; })[0];
    var minWx = WX_ALL.slice().sort(function (a, b) { return score[a] - score[b]; })[0];
    // 忌神：偏强取"克泄耗"，偏弱取"克泄"中的耗身者；简化：不在喜用里的最旺者
    var avoidWx = WX_ALL.filter(function (w) { return favor.indexOf(w) < 0; })
      .sort(function (a, b) { return score[b] - score[a]; })[0] || null;

    var sections = [];

    /* ① 五行偏枯 */
    var totalScore = WX_ALL.reduce(function (a, w) { return a + score[w]; }, 0) || 1;
    var ratio = {}; WX_ALL.forEach(function (w) { ratio[w] = score[w] / totalScore; });
    // 按占比判：< 10% 算偏枯，< 4% 算"缺"
    var lackList = WX_ALL.filter(function (w) { return ratio[w] < 0.10; });
    var zeroList = WX_ALL.filter(function (w) { return ratio[w] < 0.04; });
    if (lackList.length) {
      sections.push({
        id: 'wx', title: '五行偏枯：' + lackList.join('、') + ' 偏少',
        why: '你的八字里 ' + lackList.map(function (w) { return w + '只占' + (ratio[w] * 100).toFixed(0) + '%' + (zeroList.indexOf(w) >= 0 ? '（近缺）' : '') + '(' + score[w].toFixed(2) + ')'; }).join('、') + '，传统认为这会让相应方面容易出状况。',
        actions: lackList.map(function (w) {
          var m = WX_MAP[w];
          return '补' + w + '：方位取' + m.dir + '；颜色用' + m.color + '；生活上' + m.habit + '；避免' + m.avoid + '（对应' + m.organ + '）';
        }),
        level: '常'
      });
    }

    /* ② 喜用与忌神 */
    if (favor.length) {
      sections.push({
        id: 'yong', title: '用喜用、避忌神',
        why: '你是' + br.strength.level + '（' + br.strength.yongHint.type + '），喜用是「' + favor.join('、') + '」' + (avoidWx ? '，比较要避的是「' + avoidWx + '」' : '') + '。',
        actions: [
          '重要的事（面试、签约、谈判）安排在喜用方位：' + favor.map(function (w) { return WX_MAP[w].dir; }).join(' / '),
          '穿衣、随身物偏喜用颜色：' + favor.map(function (w) { return WX_MAP[w].color; }).join(' / '),
          avoidWx ? '忌神「' + avoidWx + '」之日、之方位少办大事；那天穿少一点' + WX_MAP[avoidWx].color + '、别久待' + WX_MAP[avoidWx].dir : '喜用较均衡，按日常节奏即可',
          '身体上多照顾：' + favor.map(function (w) { return WX_MAP[w].organ; }).join('、')
        ],
        level: '常'
      });
    }

    /* ③ 凶煞 */
    var shaActs = [];
    var jiHits = [];
    (br.shenSha || []).forEach(function (s) {
      var baseName = s.name.indexOf('(') > 0 ? s.name.split('(')[0] : s.name;
      // 吉神单独归类，不进"规避"
      var isJi = JI_SHEN.some(function (j) { return s.name.indexOf(j) >= 0; });
      if (isJi) { jiHits.push(baseName); return; }
      var adv = SHA_ADVICE[s.name];
      if (!adv) {
        Object.keys(SHA_ADVICE).forEach(function (k) {
          if (!adv && s.name.indexOf(k.split('(')[0]) >= 0) adv = SHA_ADVICE[k];
        });
      }
      if (adv) shaActs.push(baseName + '：' + adv);
    });
    if (shaActs.length) {
      sections.push({
        id: 'sha', title: '命带神煞：按性质规避',
        why: '你的盘里有这些带「性质」的神煞' + (jiHits.length ? '（另有吉神：' + jiHits.join('、') + '，是助力不是障碍）' : '') + '，凶时它们的特征会被放大。',
        actions: shaActs,
        level: '常'
      });
    }

    /* ④ 冲命：日支/年支被冲的日子 */
    var meZhi = br.pillars[2].zhi, meYear = br.pillars[0].zhi;
    var chongList = [];
    WX_ALL.forEach(function () {});
    Object.keys(D.ZHI_CHONG || {}).forEach(function (z) { if (D.ZHI_CHONG[z] === meZhi) chongList.push(z); });
    sections.push({
      id: 'chong', title: '冲命之日：' + (chongList.join('、') || '无'),
      why: '你的日支是「' + meZhi + '」，遇到「' + (chongList.join('、') || '—') + '」日就是"日辰冲命"，传统认为这天容易躁动、易出岔子（本软件的当日运势会因冲命扣分）。',
      actions: [
        chongList.length ? '「' + chongList.join('、') + '」日避免：签长约、动手术式的大决定、长途赶时间、与人正面冲突' : '无冲命之日，按常规即可',
        '冲命日若必须办事，挑黄道吉时（当日运势页会给"最好时辰"）',
        '冲命日适合做"清理型"的事：整理、复盘、断舍离，不适合"开创型"的事'
      ],
      level: chongList.length ? '要' : '常'
    });

    /* ⑤ 具体某一天：如果有给日期 */
    var dayPart = null;
    if (opt.y && opt.m && opt.d) {
      try {
        var dl = DL.daily({ y: +opt.y, m: +opt.m, d: +opt.d, birth: opt.birth });
        if (dl.ok) {
          var acts = [];
          var isChong = chongList.indexOf(dl.day.zhi) >= 0;
          if (dl.level === '大凶' || dl.level === '凶') {
            acts.push('当天判「' + dl.level + '」：能推的事推掉；必须办的，挑当天吉时（' + dl.hours.bestHours.join('、') + '），避开最差时辰' + dl.hours.worst.zhi + '时(' + dl.hours.worst.range + ')。');
          } else {
            acts.push('当天判「' + dl.level + '」：正常推进即可，重要环节仍建议落在吉时 ' + dl.hours.best.zhi + '时(' + dl.hours.best.range + ')。');
          }
          if (isChong) acts.push('当天干支「' + dl.day.ganZhi + '」冲你的日支「' + meZhi + '」：格外注意情绪与交通，别赌气、别抢时间。');
          if (dl.yi.length) acts.push('黄历当日宜：' + dl.yi.slice(0, 6).join('、'));
          if (dl.ji.length) acts.push('黄历当日忌：' + dl.ji.slice(0, 6).join('、'));
          if (favor.length) acts.push('当天可倾向喜用方位（' + favor.map(function (w) { return WX_MAP[w].dir; }).join('/') + '）与颜色（' + favor.map(function (w) { return WX_MAP[w].color; }).join('/') + '）。');
          dayPart = { date: dl.date.text, week: dl.date.week, ganZhi: dl.day.ganZhi, level: dl.level, grade: dl.grade, score: dl.score,
                      bestHour: dl.hours.best, worstHour: dl.hours.worst, isChong: isChong, acts: acts };
        }
      } catch (e) {}
    }

    var tips = [
      '「避灾」在传统术数里是调整行为与节奏，不是改命，更不是画符念咒。',
      '涉及健康、法律、财务的重大决定，请以医生/律师/专业人士意见为准——择日只作参考。',
      '真正的"避灾"三件事：睡够、别赌气、别在情绪上头时做决定。'
    ];

    return {
      ok: true,
      me: {
        name: br.name || '', pillars: br.pillars.map(function (p) { return p.ganZhi; }),
        dayMaster: dm.gan + dm.wuXing, level: br.strength.level, yongType: br.strength.yongHint.type,
        favor: favor, avoid: avoidWx, hourKnown: br.hourKnown,
        maxWx: maxWx, minWx: minWx, score: score
      },
      sections: sections,
      day: dayPart,
      tips: tips,
      disclaimer: '以上为传统术数的趋避建议，属行为参考，不构成命运判决、医疗或法律意见。'
    };
  }

  function report(r) {
    if (!r.ok) return '算不出来：' + r.error;
    var L = [];
    L.push('【遇到凶如何避灾】' + (r.me.name ? r.me.name + '　' : '') + '日主 ' + r.me.dayMaster + '（' + r.me.level + '·' + r.me.yongType + '）');
    L.push('八字：' + r.me.pillars.join(' ') + (r.me.hourKnown === false ? '（缺时柱）' : ''));
    L.push('喜用：' + (r.me.favor.join('、') || '—') + (r.me.avoid ? '　忌神：' + r.me.avoid : ''));
    L.push('');
    r.sections.forEach(function (s, i) {
      L.push('【' + (i + 1) + '】' + s.title);
      if (s.why) L.push('  ' + s.why);
      s.actions.forEach(function (a) { L.push('  · ' + a); });
      L.push('');
    });
    if (r.day) {
      L.push('【当天】' + r.day.date + '（' + r.day.week + '）' + r.day.ganZhi + '日　' + (r.day.grade ? r.day.grade.text : r.day.level) + ' ' + r.day.score + '分');
      r.day.acts.forEach(function (a) { L.push('  · ' + a); });
      L.push('');
    }
    L.push('提醒：');
    r.tips.forEach(function (t) { L.push('· ' + t); });
    L.push('');
    L.push(r.disclaimer);
    return L.join('\n');
  }

  return { analyze: analyze, report: report, WX_MAP: WX_MAP };
});
