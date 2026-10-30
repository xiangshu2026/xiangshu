/*!
 * xs-bazi.js —— 生辰八字排盘引擎（象数工坊）
 * 依赖：lunar.js（6tail lunar-javascript, MIT）
 * 纯数据层：只负责计算，不做任何 HTML 渲染。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./lunar.js')); }
  else { root.XS = root.XS || {}; root.XS.Bazi = factory(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Lib) {
  'use strict';
  var Solar = Lib.Solar, Lunar = Lib.Lunar;

  /* ============================ 基础常量 ============================ */
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var GAN_WX = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  var ZHI_WX = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  var WX = ['木','火','土','金','水'];
  var SHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};   // 我生
  var KE   = {木:'土',火:'金',土:'水',金:'木',水:'火'};   // 我克
  var GAN_YANG = {甲:1,丙:1,戊:1,庚:1,壬:1};
  var ZHI_ORDER = {}; ZHI.forEach(function (z, i) { ZHI_ORDER[z] = i; });

  // 地支藏干（本气 / 中气 / 余气）
  var HIDE = {
    子:[['癸',1]], 丑:[['己',.6],['癸',.3],['辛',.1]], 寅:[['甲',.6],['丙',.3],['戊',.1]],
    卯:[['乙',1]], 辰:[['戊',.6],['乙',.3],['癸',.1]], 巳:[['丙',.6],['戊',.3],['庚',.1]],
    午:[['丁',.7],['己',.3]], 未:[['己',.6],['丁',.3],['乙',.1]], 申:[['庚',.6],['壬',.3],['戊',.1]],
    酉:[['辛',1]], 戌:[['戊',.6],['辛',.3],['丁',.1]], 亥:[['壬',.7],['甲',.3]]
  };
  // 地支关系
  var LIU_CHONG = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  var LIU_HE = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var SAN_HE = {申:'子辰',子:'申辰',辰:'申子',亥:'卯未',卯:'亥未',未:'亥卯',寅:'午戌',午:'寅戌',戌:'寅午',巳:'酉丑',酉:'巳丑',丑:'巳酉'};
  var SAN_HUI = {寅:'卯辰',卯:'寅辰',辰:'寅卯',巳:'午未',午:'巳未',未:'巳午',申:'酉戌',酉:'申戌',戌:'申酉',亥:'子丑',子:'亥丑',丑:'亥子'};

  /* ============================ 神煞表 ============================ */
  var SHEN_SHA = {
    tianYi:  {甲:'丑未',戊:'丑未',庚:'丑未',乙:'子申',己:'子申',丙:'亥酉',丁:'亥酉',壬:'卯巳',癸:'卯巳',辛:'寅午'},
    wenChang:{甲:'巳',乙:'午',丙:'申',戊:'申',丁:'酉',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'},
    lu:      {甲:'寅',乙:'卯',丙:'巳',戊:'巳',丁:'午',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'},
    yangRen: {甲:'卯',乙:'辰',丙:'午',戊:'午',丁:'未',己:'未',庚:'酉',辛:'戌',壬:'子',癸:'丑'},
    hongYan: {甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申'},
    jinYu:   {甲:'辰',乙:'巳',丙:'未',丁:'申',戊:'未',己:'申',庚:'戌',辛:'亥',壬:'丑',癸:'寅'},
    jiMa:    {申:'寅',子:'寅',辰:'寅',寅:'申',午:'申',戌:'申',巳:'亥',酉:'亥',丑:'亥',亥:'巳',卯:'巳',未:'巳'},
    taoHua:  {申:'酉',子:'酉',辰:'酉',寅:'卯',午:'卯',戌:'卯',巳:'午',酉:'午',丑:'午',亥:'子',卯:'子',未:'子'},
    jiangXing:{申:'子',子:'子',辰:'子',寅:'午',午:'午',戌:'午',巳:'酉',酉:'酉',丑:'酉',亥:'卯',卯:'卯',未:'卯'},
    huaGai:  {申:'辰',子:'辰',辰:'辰',寅:'戌',午:'戌',戌:'戌',巳:'丑',酉:'丑',丑:'丑',亥:'未',卯:'未',未:'未'},
    guChen:  {亥:'寅',子:'寅',丑:'寅',寅:'巳',卯:'巳',辰:'巳',巳:'申',午:'申',未:'申',申:'亥',酉:'亥',戌:'亥'},
    guaSu:   {亥:'戌',子:'戌',丑:'戌',寅:'丑',卯:'丑',辰:'丑',巳:'辰',午:'辰',未:'辰',申:'未',酉:'未',戌:'未'}
  };
  var YUE_DE = {寅:'丙',午:'丙',戌:'丙',申:'壬',子:'壬',辰:'壬',亥:'甲',卯:'甲',未:'甲',巳:'庚',酉:'庚',丑:'庚'};
  var TIAN_DE = {寅:'丁',卯:'申',辰:'壬',巳:'辛',午:'亥',未:'甲',申:'癸',酉:'寅',戌:'丙',亥:'乙',子:'巳',丑:'庚'};
  var KUI_GANG = ['庚辰','庚戌','壬辰','戊戌'];

  /* ============================ 工具函数 ============================ */
  function shiShen(dayGan, targetGan) {
    if (!targetGan) return '';
    var mw = GAN_WX[dayGan], tw = GAN_WX[targetGan];
    var same = (GAN_YANG[dayGan] ? 1 : 0) === (GAN_YANG[targetGan] ? 1 : 0);
    if (mw === tw) return same ? '比肩' : '劫财';
    if (SHENG[mw] === tw) return same ? '食神' : '伤官';
    if (KE[mw] === tw) return same ? '偏财' : '正财';
    if (KE[tw] === mw) return same ? '七杀' : '正官';
    if (SHENG[tw] === mw) return same ? '偏印' : '正印';
    return '';
  }
  function shiShenOfZhi(dayGan, zhi) {
    return (HIDE[zhi] || []).map(function (h) { return h[0] + shiShen(dayGan, h[0]); });
  }
  // 十神归党：同党（比劫+印） / 异党（食伤+财+官杀）
  function partyOf(dayGan, gan) {
    var s = shiShen(dayGan, gan);
    if (s === '比肩' || s === '劫财' || s === '正印' || s === '偏印') return 'same';
    return 'other';
  }
  // 均时差（分钟），Meeus 低精度式，误差 < 1 分钟
  function equationOfTime(date) {
    var start = Date.UTC(date.getUTCFullYear(), 0, 1);
    var n = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
    var h = date.getUTCHours() + date.getUTCMinutes() / 60;
    var g = 2 * Math.PI / 365 * (n + (h - 12) / 24);
    var e = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
            - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // 把历法库的英文异常翻译成人话
  var LUNAR_MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  function lunarMonthName(m) { var i = Math.abs(m) - 1; return (LUNAR_MONTH_CN[i] || (Math.abs(m) + '')) + '月'; }
  function friendlyLunarError(e, y, m, d, leap) {
    var msg = (e && e.message) ? String(e.message) : '未知错误';
    var mm = msg.match(/wrong lunar year (\d+) month (-?\d+)/);
    if (mm) {
      return new Error('农历 ' + y + ' 年没有' + (leap ? '闰' : '') + lunarMonthName(m) + '（该年不存在这个月，请核对闰月设置）');
    }
    var md = msg.match(/only (\d+) days in lunar year (\d+) month (-?\d+)/);
    if (md) {
      return new Error('农历 ' + y + ' 年' + (leap ? '闰' : '') + lunarMonthName(m) + '只有 ' + md[1] + ' 天，没有 ' + d + ' 日，请把日期改到 1~' + md[1] + ' 之间');
    }
    if (/lunar/i.test(msg)) {
      return new Error('农历日期无效：' + y + '年' + (leap ? '闰' : '') + lunarMonthName(m) + d + '日（请检查年/月/日与闰月）');
    }
    return e;
  }

  /* ============================ 主排盘 ============================ */
  /**
   * @param opt {y,m,d,h,mi} 出生时间；calendar:'solar'|'lunar'；leap:农历闰月；
   *            gender:1男/0女；sect:1=晚子时算次日(默认)；trueSolar:bool；lng:经度
   */
  function paipan(opt) {
    var o = opt || {};
    var y = +o.y, m = +o.m, d = +o.d;
    // 时辰未知：不要默认 0 点/12 点去"假装知道"。正午仅用于取历法日（不影响日柱），时柱会被标为未知且不参与强弱
    var hourKnown = (o.h !== undefined && o.h !== null && o.h !== '' && !isNaN(+o.h));
    var h = hourKnown ? +o.h : 12;
    var mi = +o.mi || 0;
    var gender = (o.gender === 0 || o.gender === '0') ? 0 : 1;
    var sect = (o.sect === 2 || o.sect === '2') ? 2 : 1;
    var useTrue = !!o.trueSolar;
    var lng = (o.lng === undefined || o.lng === null || o.lng === '') ? 120 : +o.lng;

    var base, solar, lunar, trueSolarInfo = null;
    if (o.calendar === 'lunar') {
      var lm = o.leap ? -Math.abs(m) : Math.abs(m);
      try {
        lunar = Lunar.fromYmdHms(y, lm, d, h, mi, 0);
        solar = lunar.getSolar();
      } catch (e) {
        throw friendlyLunarError(e, y, m, d, !!o.leap);
      }
    } else {
      solar = Solar.fromYmdHms(y, m, d, h, mi, 0);
      lunar = solar.getLunar();
    }
    // 真太阳时校正
    if (useTrue) {
      var dt = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond());
      var eot = equationOfTime(dt);
      var lngMin = 4 * (lng - 120);
      var delta = eot + lngMin;
      var adj = new Date(dt.getTime() + Math.round(delta * 60000));
      trueSolarInfo = {
        eot: eot, lngDelta: lngMin, deltaMinutes: delta, lng: lng,
        from: solar.toYmdHms(),
        to: [adj.getFullYear(), pad(adj.getMonth() + 1), pad(adj.getDate())].join('-') + ' ' + pad(adj.getHours()) + ':' + pad(adj.getMinutes()) + ':' + pad(adj.getSeconds())
      };
      solar = Solar.fromYmdHms(adj.getFullYear(), adj.getMonth() + 1, adj.getDate(), adj.getHours(), adj.getMinutes(), adj.getSeconds());
      lunar = solar.getLunar();
    }

    var ec = lunar.getEightChar();
    ec.setSect(sect);
    var dayGan = ec.getDayGan();

    /* ---------- 四柱 ---------- */
    var pillars = ['Year', 'Month', 'Day', 'Time'].map(function (k, idx) {
      var gan = ec['get' + k + 'Gan'](), zhi = ec['get' + k + 'Zhi']();
      var hide = ec['get' + k + 'HideGan']() || [];
      return {
        name: ['年柱', '月柱', '日柱', '时柱'][idx],
        ganZhi: gan + zhi, gan: gan, zhi: zhi,
        ganWuXing: GAN_WX[gan], zhiWuXing: ZHI_WX[zhi],
        ganShiShen: idx === 2 ? '日主' : (ec['get' + k + 'ShiShenGan']() || ''),
        hideGan: hide.map(function (g) { return { gan: g, wuXing: GAN_WX[g], shiShen: shiShen(dayGan, g) }; }),
        naYin: ec['get' + k + 'NaYin'](),
        wuXing: ec['get' + k + 'WuXing']() + '',
        diShi: ec['get' + k + 'DiShi'](),
        xun: ec['get' + k + 'Xun'](),
        xunKong: ec['get' + k + 'XunKong'](),
        isDayMaster: idx === 2
      };
    });

    /* ---------- 五行力量 ---------- */
    var score = { 木:0, 火:0, 土:0, 金:0, 水:0 };
    var detail = [];
    pillars.forEach(function (p, i) {
      var ganW = 1.0;
      score[p.ganWuXing] += ganW;
      detail.push({ from: p.name + '天干', char: p.gan, wuXing: p.ganWuXing, weight: ganW });
      var zhiFactor = (i === 1) ? 1.5 : 1.0; // 月令加权
      (HIDE[p.zhi] || []).forEach(function (hd) {
        var w = hd[1] * zhiFactor;
        score[GAN_WX[hd[0]]] += w;
        detail.push({ from: p.name + '地支' + p.zhi, char: hd[0], wuXing: GAN_WX[hd[0]], weight: +w.toFixed(2) });
      });
    });
    var totalScore = WX.reduce(function (a, k) { return a + score[k]; }, 0);
    var sameScore = 0, otherScore = 0;
    WX.forEach(function (k) {
      var isSame = (k === GAN_WX[dayGan]) || (SHENG[k] === GAN_WX[dayGan]); // 比劫 + 印
      if (isSame) sameScore += score[k]; else otherScore += score[k];
    });
    var strengthRatio = sameScore / (sameScore + otherScore);
    var strength = strengthRatio >= 0.60 ? '偏强' : (strengthRatio <= 0.40 ? '偏弱' : '中和');
    var deLing = (HIDE[pillars[1].zhi] || []).some(function (hd) { return partyOf(dayGan, hd[0]) === 'same'; });
    var deDiCols = hourKnown ? [pillars[0].zhi, pillars[2].zhi, pillars[3].zhi] : [pillars[0].zhi, pillars[2].zhi];
    var deDi = deDiCols.some(function (z) {
      return (HIDE[z] || []).some(function (hd) { return partyOf(dayGan, hd[0]) === 'same'; });
    });
    var deShiCols = hourKnown ? [pillars[0].gan, pillars[1].gan, pillars[3].gan] : [pillars[0].gan, pillars[1].gan];
    var deShi = deShiCols.some(function (g) { return partyOf(dayGan, g) === 'same'; });
    var dayWx = GAN_WX[dayGan];

    // 用神（简法：扶抑）
    var yongHint;
    if (strength === '偏强') {
      yongHint = { type: '抑', favor: [SHENG[dayWx], KE[dayWx], dayWx === '木' ? '金' : Object.keys(KE).filter(function (k) { return KE[k] === dayWx; })[0]],
        text: '日主偏强，一般取「泄、耗、克」为喜：食伤（' + SHENG[dayWx] + '）、财（' + KE[dayWx] + '）、官杀（克我者）' };
    } else if (strength === '偏弱') {
      var shengMe = Object.keys(SHENG).filter(function (k) { return SHENG[k] === dayWx; })[0];
      yongHint = { type: '扶', favor: [shengMe, dayWx], text: '日主偏弱，一般取「生、扶」为喜：印（' + shengMe + '）、比劫（' + dayWx + '）' };
    } else {
      // 中和盘：按传统「调候」取用——夏天取水润、冬天取火暖，春秋取平衡
      var mz = pillars[1].zhi;
      var season = ({ 寅:'春',卯:'春',辰:'四季',巳:'夏',午:'夏',未:'四季',申:'秋',酉:'秋',戌:'四季',亥:'冬',子:'冬',丑:'四季' })[mz] || '四季';
      var tiaoFavor, tiaoText;
      if (season === '夏') {
        // 夏月燥热，取水润之、金生水
        tiaoFavor = ['水', '金'];
        tiaoText = '日主中和，但生在夏月（' + pillars[1].zhi + '月）、气候燥热，按调候取「水」润之、「金」生水为辅';
      } else if (season === '冬') {
        // 冬月寒湿，取火暖之、木生火
        tiaoFavor = ['火', '木'];
        tiaoText = '日主中和，但生在冬月（' + pillars[1].zhi + '月）、气候寒湿，按调候取「火」暖之、「木」生火为辅';
      } else if (season === '春') {
        tiaoFavor = ['土', '金'];
        tiaoText = '日主中和，生在春月（' + pillars[1].zhi + '月）、木气偏旺，按调候取「土」培之、「金」制木';
      } else if (season === '秋') {
        tiaoFavor = ['火', '木'];
        tiaoText = '日主中和，生在秋月（' + pillars[1].zhi + '月）、金气偏旺，按调候取「火」炼之、「木」为薪';
      } else {
        // 四季月（辰戌丑未）：土旺，取木疏土、水润土
        tiaoFavor = ['木', '水'];
        tiaoText = '日主中和，生在四季月（' + pillars[1].zhi + '月）、土气偏旺，按调候取「木」疏土、「水」润之';
      }
      yongHint = { type: '调候', favor: tiaoFavor, text: tiaoText };
    }

    /* ---------- 神煞 ---------- */
    function has(zhi) { return pillars.some(function (p) { return p.zhi === zhi; }); }
    function whichPillars(zhi) { return pillars.filter(function (p) { return p.zhi === zhi; }).map(function (p) { return p.name; }).join('、'); }
    var shenSha = [];
    function addSha(name, target, ref, note) {
      if (!target) return;
      var hit = target.split('').filter(function (z) { return has(z); });
      if (hit.length) shenSha.push({ name: name, ref: ref, zhi: hit.join('、'), pillars: hit.map(whichPillars).join('、'), note: note || '' });
    }
    addSha('天乙贵人', SHEN_SHA.tianYi[dayGan], '日干' + dayGan, '逢凶化吉、贵人相助');
    addSha('文昌贵人', SHEN_SHA.wenChang[dayGan], '日干' + dayGan, '利文书学业、聪明');
    addSha('禄神', SHEN_SHA.lu[dayGan], '日干' + dayGan, '主衣禄、根本');
    addSha('羊刃', SHEN_SHA.yangRen[dayGan], '日干' + dayGan, '刚烈、主决断，忌冲动');
    addSha('红艳煞', SHEN_SHA.hongYan[dayGan], '日干' + dayGan, '主容貌多情');
    addSha('金舆', SHEN_SHA.jinYu[dayGan], '日干' + dayGan, '主车马富贵');
    addSha('驿马', SHEN_SHA.jiMa[pillars[0].zhi], '年支' + pillars[0].zhi, '主奔波迁动');
    addSha('桃花(咸池)', SHEN_SHA.taoHua[pillars[0].zhi], '年支' + pillars[0].zhi, '主人缘情缘');
    addSha('将星', SHEN_SHA.jiangXing[pillars[0].zhi], '年支' + pillars[0].zhi, '主掌权统御');
    addSha('华盖', SHEN_SHA.huaGai[pillars[0].zhi], '年支' + pillars[0].zhi, '主孤高清雅、宗教艺术');
    addSha('孤辰', SHEN_SHA.guChen[pillars[0].zhi], '年支' + pillars[0].zhi, '主孤独');
    addSha('寡宿', SHEN_SHA.guaSu[pillars[0].zhi], '年支' + pillars[0].zhi, '主孤独');
    addSha('驿马(日支)', SHEN_SHA.jiMa[pillars[2].zhi], '日支' + pillars[2].zhi);
    addSha('桃花(日支)', SHEN_SHA.taoHua[pillars[2].zhi], '日支' + pillars[2].zhi);
    addSha('月德贵人', YUE_DE[pillars[1].zhi], '月支' + pillars[1].zhi, '逢凶化吉');
    addSha('天德贵人', TIAN_DE[pillars[1].zhi], '月支' + pillars[1].zhi, '逢凶化吉');
    if (KUI_GANG.indexOf(pillars[2].ganZhi) >= 0) shenSha.push({ name: '魁罡', ref: '日柱' + pillars[2].ganZhi, zhi: pillars[2].zhi, pillars: '日柱', note: '性刚果断，忌刑冲' });
    shenSha.push({ name: '空亡(旬空)', ref: '日柱' + pillars[2].xun + '旬', zhi: pillars[2].xunKong, pillars: pillars.filter(function (p) { return pillars[2].xunKong.indexOf(p.zhi) >= 0; }).map(function (p) { return p.name; }).join('、') || '空支不在四柱', note: '落空则力减；填实、冲空可解' });

    /* ---------- 大运 / 流年 ---------- */
    var yun = ec.getYun(gender, sect);
    var daYunRaw = yun.getDaYun();
    var daYun = daYunRaw.map(function (d) {
      var gz = d.getGanZhi();
      var item = {
        ganZhi: gz, gan: gz ? gz.charAt(0) : '', zhi: gz ? gz.charAt(1) : '',
        startAge: d.getStartAge(), endAge: d.getEndAge(), startYear: d.getStartYear(), endYear: d.getEndYear(),
        wuXing: gz ? GAN_WX[gz.charAt(0)] + ZHI_WX[gz.charAt(1)] : '',
        shiShen: gz ? shiShen(dayGan, gz.charAt(0)) : '', zhiShiShen: gz ? shiShenOfZhi(dayGan, gz.charAt(1)) : [],
        xunKong: gz ? d.getXunKong() : '', isBeforeStart: !gz
      };
      if (gz) {
        item.liuNian = d.getLiuNian().map(function (n) {
          var g2 = n.getGanZhi();
          return { year: n.getYear(), age: n.getAge(), ganZhi: g2, shiShen: shiShen(dayGan, g2.charAt(0)), zhiShiShen: shiShenOfZhi(dayGan, g2.charAt(1)), xunKong: n.getXunKong() };
        });
      } else { item.liuNian = []; }
      return item;
    });
    var nowYear = new Date().getFullYear();
    var current = null;
    daYun.forEach(function (d) { if (d.ganZhi && nowYear >= d.startYear && nowYear <= d.endYear) current = d; });

    /* ---------- 节气 ---------- */
    var jq = null;
    try {
      var pj = lunar.getPrevJieQi(true), nj = lunar.getNextJieQi(true);
      jq = {
        prev: { name: pj.getName(), time: pj.getSolar().toYmdHms() },
        next: { name: nj.getName(), time: nj.getSolar().toYmdHms() },
        today: lunar.getJieQi() || ''
      };
    } catch (e) { jq = null; }

    return {
      ok: true,
      hourKnown: hourKnown,
      name: (o.name || '').toString().trim().slice(0, 24),
      input: { y: y, m: m, d: d, h: h, mi: mi, hourKnown: hourKnown, calendar: o.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!o.leap, gender: gender, sect: sect, trueSolar: useTrue, lng: lng, name: (o.name || '').toString().trim().slice(0, 24) },
      genderText: gender === 1 ? '男' : '女',
      solar: { text: solar.toYmdHms(), ymd: solar.toYmd(), week: solar.getWeekInChinese() },
      trueSolarInfo: trueSolarInfo,
      lunar: {
        text: lunar.toString(), year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay(),
        yearGanZhi: lunar.getYearInGanZhi() + '(' + lunar.getYearShengXiao() + ')',
        monthChinese: lunar.getMonthInChinese(), dayChinese: lunar.getDayInChinese(),
        timeZhi: lunar.getTimeZhi(), xingZuo: solar.getXingZuo() + '座',
        jieQi: jq
      },
      pillars: pillars,
      dayMaster: { gan: dayGan, wuXing: dayWx, yinYang: GAN_YANG[dayGan] ? '阳' : '阴' },
      wuXing: { score: score, total: totalScore, detail: detail, sameScore: sameScore, otherScore: otherScore,
                missing: WX.filter(function (k) { return score[k] < 0.35; }) },
      strength: { level: strength, ratio: strengthRatio, deLing: deLing, deDi: deDi, deShi: deShi,
                  sameScore: sameScore, otherScore: otherScore, yongHint: yongHint },
      shenSha: shenSha,
      extras: {
        taiYuan: ec.getTaiYuan(), taiYuanNaYin: ec.getTaiYuanNaYin(),
        taiXi: ec.getTaiXi(), taiXiNaYin: ec.getTaiXiNaYin(),
        mingGong: ec.getMingGong(), mingGongNaYin: ec.getMingGongNaYin(),
        shenGong: ec.getShenGong(), shenGongNaYin: ec.getShenGongNaYin()
      },
      yun: {
        forward: yun.isForward(), startYear: yun.getStartYear(), startMonth: yun.getStartMonth(), startDay: yun.getStartDay(),
        startSolar: yun.getStartSolar().toYmd(),
        startText: yun.getStartYear() + '年' + yun.getStartMonth() + '个月' + yun.getStartDay() + '天',
        daYun: daYun, current: current,
        currentAge: nowYear - y
      },
      rules: {
        '月柱分界': '以「节」为界（立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒），非农历初一',
        '晚子时': sect === 1 ? '23:00 后日柱按次日计（流派一）' : '23:00 后日柱仍按当日计（流派二）',
        '五行计分': '天干各计 1.0；地支按藏干本气/中气/余气比例（0.6/0.3/0.1 等）折算，月支×1.5 加权',
        '旺衰判定': '同党（比劫+印）与异党（食伤+财+官杀）比值：≥60% 偏强，≤40% 偏弱，其余中和（简法，仅供参考）'
      }
    };
  }

  /* ============================ 文本报告 ============================ */
  function report(r) {
    var L = [];
    L.push('【生辰八字】' + (r.name ? '　账号：' + r.name : ''));
    L.push('公历：' + r.solar.text + '（' + r.solar.week + '）  性别：' + r.genderText);
    if (r.trueSolarInfo) L.push('真太阳时：' + r.trueSolarInfo.to + '（经度' + r.trueSolarInfo.lng + '°，均时差' + r.trueSolarInfo.eot.toFixed(1) + '分，经度差' + (r.trueSolarInfo.lngDelta > 0 ? '+' : '') + r.trueSolarInfo.lngDelta.toFixed(1) + '分）');
    L.push('农历：' + r.lunar.text + '  ' + r.lunar.yearGanZhi + '年  ' + r.lunar.timeZhi + '时  ' + r.lunar.xingZuo);
    L.push('');
    L.push('四柱：');
    r.pillars.forEach(function (p) {
      L.push('  ' + p.name + ' ' + p.ganZhi + '（' + p.gan + p.ganWuXing + ' ' + p.zhi + p.zhiWuXing + '）'
        + ' 十神:' + (p.ganShiShen || '-') + ' 纳音:' + p.naYin + ' 地势:' + p.diShi
        + ' 藏干:' + p.hideGan.map(function (h) { return h.gan + '(' + h.shiShen + ')'; }).join(' '));
    });
    L.push('');
    L.push('日主：' + r.dayMaster.gan + r.dayMaster.wuXing + '（' + r.dayMaster.yinYang + '）');
    L.push('五行：' + WX.map(function (k) { return k + r.wuXing.score[k].toFixed(2); }).join('  ')
      + '  缺（<0.35）：' + (r.wuXing.missing.join('、') || '无明显缺'));
    L.push('旺衰：' + r.strength.level + '（同党' + r.strength.sameScore.toFixed(2) + ' / 异党' + r.strength.otherScore.toFixed(2)
      + '  得令:' + (r.strength.deLing ? '是' : '否') + ' 得地:' + (r.strength.deDi ? '是' : '否') + ' 得势:' + (r.strength.deShi ? '是' : '否') + '）');
    L.push('取用倾向：' + r.strength.yongHint.text);
    L.push('');
    L.push('神煞：');
    r.shenSha.forEach(function (s) { L.push('  ' + s.name + '（' + s.ref + '）→ ' + s.zhi + (s.note ? '  ' + s.note : '')); });
    L.push('');
    L.push('胎元：' + r.extras.taiYuan + ' 胎息：' + r.extras.taiXi + ' 命宫：' + r.extras.mingGong + ' 身宫：' + r.extras.shenGong);
    L.push('起运：' + (r.yun.forward ? '顺行' : '逆行') + ' ' + r.yun.startText + '，交运日 ' + r.yun.startSolar);
    L.push('大运：');
    r.yun.daYun.forEach(function (d) {
      if (!d.ganZhi) { L.push('  ' + d.startYear + '-' + d.endYear + ' 起运前（' + d.startAge + '岁起）'); return; }
      L.push('  ' + d.ganZhi + ' (' + d.startAge + '-' + d.endAge + '岁 / ' + d.startYear + '-' + d.endYear + ') 十神:' + d.shiShen + ' 旬空:' + d.xunKong);
    });
    return L.join('\n');
  }

  // 农历 → 公历（界面回显「对应公历哪一天」用）
  function lunarToSolar(y, m, d, leap) {
    try {
      var lm = leap ? -Math.abs(m) : Math.abs(m);
      var lunar = Lunar.fromYmdHms(y, lm, d, 12, 0, 0);
      var s = lunar.getSolar();
      return s.getYear() + '-' + pad(s.getMonth()) + '-' + pad(s.getDay());
    } catch (e) { return null; }
  }

  return { lunarToSolar: lunarToSolar, paipan: paipan, report: report, shiShen: shiShen, shiShenOfZhi: shiShenOfZhi,
           GAN: GAN, ZHI: ZHI, GAN_WX: GAN_WX, ZHI_WX: ZHI_WX, HIDE: HIDE, WX: WX, SHENG: SHENG, KE: KE,
           LIU_CHONG: LIU_CHONG, LIU_HE: LIU_HE, SAN_HE: SAN_HE, SAN_HUI: SAN_HUI, equationOfTime: equationOfTime };
});
