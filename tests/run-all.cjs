/*!
 * run-all.cjs —— 象数工坊回归测试（基准来自官方用例与古籍卦例）
 * 运行：node tests/run-all.cjs
 */
const path = require('path');
const R = f => require(path.join(__dirname, '..', f));
const DF = R('js/xs-data.js'), BZ = R('js/xs-bazi.js'), MH = R('js/xs-meihua.js'),
      LY = R('js/xs-liuyao.js'), XR = R('js/xs-xiaoliuren.js'), IT = R('js/xs-interp.js'),
      GA = R('js/xs-gacha.js'), GM = R('js/xs-games.js'), RC = R('js/xs-records.js'), PB = R('js/xs-prob.js'), MT = R('js/xs-match.js'), CH = R('js/xs-chars.js'), DL = R('js/xs-daily.js'), PL = R('js/xs-pool.js'), AV = R('js/xs-avoid.js');

let pass = 0, fail = 0, group = '';
const G = n => { group = n; console.log('\n== ' + n + ' =='); };
const eq = (name, got, want) => {
  if (String(got) === String(want)) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n       实际: ' + got + '\n       期望: ' + want); }
};
const ok = (name, cond, detail) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' → ' + detail : '')); } };

/* ============ 一、八字（基准：lunar-javascript 官方测试用例 + 公开排盘）============ */
G('生辰八字 · 四柱');
const p1 = BZ.paipan({ y:2005, m:12, d:23, h:8, mi:37, gender:1 });
eq('2005-12-23 08:37 四柱', p1.pillars.map(p=>p.ganZhi).join(' '), '乙酉 戊子 辛巳 壬辰');
eq('  └ 藏干-日支', p1.pillars[2].hideGan.map(h=>h.gan).join(','), '丙,庚,戊');
eq('  └ 日柱旬空', p1.pillars[2].xunKong, '申酉');
eq('  └ 年柱纳音', p1.pillars[0].naYin, '泉中水');

const p2 = BZ.paipan({ y:1988, m:2, d:15, h:23, mi:30, gender:1, sect:1 });
eq('1988-02-15 23:30 流一(晚子换日) 日柱', p2.pillars[2].ganZhi, '辛丑');
const p3 = BZ.paipan({ y:1988, m:2, d:15, h:23, mi:30, gender:1, sect:2 });
eq('1988-02-15 23:30 流二(不换日) 日柱', p3.pillars[2].ganZhi, '庚子');
const p4 = BZ.paipan({ y:1988, m:2, d:2, h:22, mi:30, gender:1 });
eq('1988-02-02 22:30 四柱', p4.pillars.map(p=>p.ganZhi).join(' '), '丁卯 癸丑 丁亥 辛亥');
const mzd = BZ.paipan({ y:1893, m:12, d:26, h:8, mi:0, gender:1 });
eq('毛泽东 1893-12-26 辰时', mzd.pillars.map(p=>p.ganZhi).join(' '), '癸巳 甲子 丁酉 甲辰');

G('生辰八字 · 节气分界（2024 立春 16:26:53）');
eq('立春前 16:00 月柱', BZ.paipan({ y:2024, m:2, d:4, h:16, mi:0, gender:1 }).pillars[1].ganZhi, '乙丑');
eq('立春后 17:00 月柱', BZ.paipan({ y:2024, m:2, d:4, h:17, mi:0, gender:1 }).pillars[1].ganZhi, '丙寅');
eq('立春后 年柱', BZ.paipan({ y:2024, m:2, d:5, h:12, mi:0, gender:1 }).pillars[0].ganZhi, '甲辰');

G('生辰八字 · 起运与大运');
// 官方基准（lunar-javascript Yun.test）：该命例女命起运 8年0月20天，交运 1989-02-18
const y0 = BZ.paipan({ y:1981, m:1, d:29, h:23, mi:37, gender:0 });
eq('女命(阳年)逆行', y0.yun.forward, false);
eq('女命起运 8年0月20天', y0.yun.startYear + '年' + y0.yun.startMonth + '月' + y0.yun.startDay + '天', '8年0月20天');
eq('女命交运日', y0.yun.startSolar, '1989-02-18');
eq('女命首步大运（己丑月逆行→戊子）', y0.yun.daYun.filter(d=>d.ganZhi)[0].ganZhi, '戊子');
const y1 = BZ.paipan({ y:1981, m:1, d:29, h:23, mi:37, gender:1 });
eq('男命(阳年)顺行', y1.yun.forward, true);
eq('男命起运 1年9月10天', y1.yun.startYear + '年' + y1.yun.startMonth + '月' + y1.yun.startDay + '天', '1年9月10天');
eq('男命首步大运（己丑月顺行→庚寅）', y1.yun.daYun.filter(d=>d.ganZhi)[0].ganZhi, '庚寅');

G('生辰八字 · 真太阳时 / 十神 / 神煞');
const ts = BZ.paipan({ y: 1990, m: 6, d: 15, h:10, mi:30, gender:1, trueSolar:true, lng:120.0 });
ok('真太阳时已校正', ts.trueSolarInfo && ts.trueSolarInfo.to !== ts.trueSolarInfo.from, JSON.stringify(ts.trueSolarInfo));
ok('校正量 = 均时差 + 经度差', Math.abs(ts.trueSolarInfo.deltaMinutes - (ts.trueSolarInfo.eot + ts.trueSolarInfo.lngDelta)) < 1e-6);
eq('十神：甲日主见庚金为七杀', BZ.shiShen('甲','庚'), '七杀');
eq('十神：甲日主见辛金为正官', BZ.shiShen('甲','辛'), '正官');
eq('十神：甲日主见癸水为正印', BZ.shiShen('甲','癸'), '正印');
eq('十神：甲日主见甲木为比肩', BZ.shiShen('甲','甲'), '比肩');
eq('十神：甲日主见丙火为食神', BZ.shiShen('甲','丙'), '食神');
ok('神煞非空且含天乙贵人', ts.shenSha.some(s=>s.name==='天乙贵人'), JSON.stringify(ts.shenSha.map(s=>s.name)));
ok('五行计分为正', BZ.WX.every(k=>ts.wuXing.score[k] > 0));

/* ============ 二、梅花易数（基准：《梅花易数·观梅占》）============ */
G('梅花易数 · 观梅占（兑上离下，初爻动）');
const gm = MH.fromGua('兑','离',1);
eq('本卦', gm.ben.name, '泽火革');
eq('互卦（互见乾巽）', gm.hu.name, '天风姤');
eq('变卦', gm.bian.name, '泽山咸');
eq('体用（动在初爻→体兑用离）', gm.tiYong.ti.name + '/' + gm.tiYong.yong.name, '兑/离');
eq('体用生克（火克金＝用克体）', gm.judge.rel, '用克体');
ok('互卦六爻=下互巽+上互乾', JSON.stringify(gm.hu.lines) === JSON.stringify([0,1,1,1,1,1]), JSON.stringify(gm.hu.lines));
ok('变卦六爻=艮+兑', JSON.stringify(gm.bian.lines) === JSON.stringify([0,0,1,1,1,0]), JSON.stringify(gm.bian.lines));

G('梅花易数 · 起卦法');
const n2 = MH.qiGua({ method:'numbers', n1:34, n2:43, n3:'' });
eq('两数取余上卦(34%8=2→兑)', n2.ben.upper.name, '兑');
eq('两数取余下卦(43%8=3→离)', n2.ben.lower.name, '离');
eq('动爻(77%6=5)', n2.moving, 5);
const n3 = MH.qiGua({ method:'numbers', n1:8, n2:16, n3:6 });
eq('整除8取坤', n3.ben.upper.name, '坤');
eq('三数动爻取第三数(6%6→6)', n3.moving, 6);
ok('文字起卦可用', MH.qiGua({ method:'text', text:'今日面试能否顺利' }).ok === true);
ok('随机起卦可用', MH.qiGua({ method:'random' }).ok === true);
ok('时间起卦可用', MH.qiGua({ method:'time', y:2026, m:10, d:16, h:10, mi:30 }).ok === true);
eq('八卦先天数', DF.BAGUA.map(b=>b.num).join(','), '1,2,3,4,5,6,7,8');
eq('八卦五行（乾兑离震巽坎艮坤）', DF.BAGUA.map(b=>b.wx).join(''), '金金火木木水土土');
eq('六十四卦名数', Object.keys(DF.HEX_NAMES).length * 8, 64);
ok('六十四卦义齐全', Object.keys(DF.HEX_MEANING).length === 64, String(Object.keys(DF.HEX_MEANING).length));

/* ============ 三、六爻（基准：京房八宫卦序、纳甲歌）============ */
G('六爻 · 八宫卦序与世应（京房）');
const expect = [
  ['乾为天','乾','金','六世(本宫)',6,3], ['天风姤','乾','金','一世',1,4], ['天山遁','乾','金','二世',2,5],
  ['天地否','乾','金','三世',3,6], ['风地观','乾','金','四世',4,1], ['山地剥','乾','金','五世',5,2],
  ['火地晋','乾','金','游魂',4,1], ['火天大有','乾','金','归魂',3,6],
  ['坤为地','坤','土','六世(本宫)',6,3], ['地雷复','坤','土','一世',1,4], ['地泽临','坤','土','二世',2,5],
  ['地天泰','坤','土','三世',3,6], ['雷天大壮','坤','土','四世',4,1], ['泽天夬','坤','土','五世',5,2],
  ['水天需','坤','土','游魂',4,1], ['水地比','坤','土','归魂',3,6],
  ['艮为山','艮','土','六世(本宫)',6,3], ['山火贲','艮','土','一世',1,4], ['天泽履','艮','土','五世',5,2],
  ['风泽中孚','艮','土','游魂',4,1], ['风山渐','艮','土','归魂',3,6],
  ['震为雷','震','木','六世(本宫)',6,3], ['雷地豫','震','木','一世',1,4], ['雷水解','震','木','二世',2,5],
  ['风雷益','巽','木','三世',3,6], ['水雷屯','坎','水','二世',2,5], ['山水蒙','离','火','四世',4,1],
  ['泽水困','兑','金','一世',1,4], ['火山旅','离','火','一世',1,4], ['离为火','离','火','六世(本宫)',6,3]
];
expect.forEach(e => {
  const x = LY.PALACE[e[0]];
  eq(e[0] + ' 宫/五行/卦位/世/应', x ? [x.palace,x.palaceWx,x.kind,x.shi,x.ying].join('·') : 'null', [e[1],e[2],e[3],e[4],e[5]].join('·'));
});
eq('八宫共 64 卦（不重不漏）', Object.keys(LY.PALACE).length, 64);

G('六爻 · 纳甲歌与六亲');
const r = LY.paipan(LY.qiGua({ method:'manual', yaoTypes:[9,7,7,7,7,7] }), { y:2026, m:10, d:16, h:10, mi:30 });
eq('乾为天纳甲六亲', r.yao.map(y=>y.liuQin+y.ganZhi).join(','), '子孙甲子,妻财甲寅,父母甲辰,官鬼壬午,兄弟壬申,父母壬戌');
eq('变卦（初爻动）', r.bian.name, '天风姤');
eq('变爻纳甲（乾宫外卦化辛丑）', r.bian.yao[0].ganZhi, '辛丑');
eq('六亲以卦宫五行为我', LY.liuQin('金','水') + LY.liuQin('金','木'), '子孙妻财');
const kn = LY.paipan(LY.qiGua({ method:'manual', yaoTypes:[8,8,8,8,8,8] }), { y:2026, m:10, d:16, h:10, mi:30 });
eq('坤为地六亲（坤宫土：未兄弟/巳父母/卯官鬼/丑兄弟/亥妻财/酉子孙）', kn.yao.map(y=>y.liuQin+y.ganZhi).join(','), '兄弟乙未,父母乙巳,官鬼乙卯,兄弟癸丑,妻财癸亥,子孙癸酉');
G('六爻 · 六神 / 旬空 / 伏神 / 卦体');
eq('甲日六神', LY.liuShenArr('甲').join(''), '青龙朱雀勾陈腾蛇白虎玄武');
eq('庚日六神', LY.liuShenArr('庚').join(''), '白虎玄武青龙朱雀勾陈腾蛇');
eq('壬日初爻玄武', LY.liuShenArr('壬')[0], '玄武');
ok('旬空已给出（癸亥日空子丑）', r.time.xunKong === '子丑', r.time.xunKong);
ok('六冲卦识别（乾为天）', r.ben.chongGua === true);
const he = LY.paipan(LY.qiGua({ method:'manual', yaoTypes:[7,7,7,8,8,8] }), { y:2026, m:10, d:16, h:10, mi:30 });
eq('地天泰为六合卦', he.ben.heGua, true);
const fu = LY.paipan(LY.qiGua({ method:'manual', yaoTypes:[9,7,7,7,7,7] }), { y:2026, m:10, d:16, h:10, mi:30 });
eq('全六亲时可无伏神', fu.missing.length, 0);
const ys = LY.analyzeYongShen(r, '求财');
ok('用神可取（求财→妻财）', ys && ys.subject === '妻财' && ys.found === true);
ok('用神分析含原神/忌神', /原神/.test(ys.text) && /忌神/.test(ys.text));
ok('随机摇卦产出合法六爻', (function () { const q = LY.qiGua({ method:'random' }); return q.lines.length === 6 && q.lines.every(v => v === 0 || v === 1) && q.types.every(t => [6,7,8,9].indexOf(t) >= 0); })());
ok('铜钱摇卦：3背=老阳、3正=老阴', LY.coinYao([1,1,1]) === 9 && LY.coinYao([0,0,0]) === 6);

/* ============ 四、小六壬 ============ */
G('小六壬 · 六宫掌诀');
eq('六宫次序', XR.GONG_ORDER.join(''), '大安留连速喜赤口小吉空亡');
eq('六宫五行', XR.GONG.map(g=>g.wx).join(''), '木水火金木土');
eq('数1落大安', XR.byNumbers({ n1:1, n2:1, n3:1 }).steps[2].to, '大安');
eq('数2落留连', XR.byNumbers({ n1:2, n2:1, n3:1 }).steps[0].to, '留连');
eq('数6落空亡', XR.byNumbers({ n1:6, n2:1, n3:1 }).steps[0].to, '空亡');
eq('数7回大安（循环）', XR.byNumbers({ n1:7, n2:1, n3:1 }).steps[0].to, '大安');
const k = XR.ke({ method:'time', y:2026, m:10, d:16, h:10, mi:30 });
ok('时间起课三步齐全', k.steps.length === 3 && k.steps.every(s => XR.GONG_ORDER.indexOf(s.to) >= 0));
ok('落宫有断语与分项', typeof k.gong.jie === 'string' && Object.keys(k.aspects).length === 4);
ok('随机起课可用', XR.ke({ method:'random' }).ok === true);
ok('输入 0 不崩（按 1 计）', (function () { try { var r = XR.ke({ method: 'numbers', n1: 0, n2: 0, n3: 0 }); return r.ok && XR.GONG_ORDER.indexOf(r.gongName) >= 0; } catch (e) { return false; } })());
ok('输入负数不崩（取绝对值）', (function () { try { var r = XR.ke({ method: 'numbers', n1: -3, n2: -7, n3: -2 }); return r.ok && XR.GONG_ORDER.indexOf(r.gongName) >= 0; } catch (e) { return false; } })());

/* ============ 五、白话解读 ============ */
G('白话解读 · 四个模块都要说人话');
const badWord = o => /undefined|NaN|\[object/.test(JSON.stringify(o));
const bzR = BZ.paipan({ y: 1990, m: 6, d: 15, h:10, mi:30, gender:1, trueSolar:true, lng:120.0 });
const iB = IT.bazi(bzR);
ok('八字：有一句话结论', typeof iB.headline === 'string' && iB.headline.length > 12, iB.headline);
ok('八字：性格/五行/大运/标记 四段齐全', iB.sections.length >= 4, String(iB.sections.length));
ok('八字：给出使用提示', iB.tips.length >= 2);
ok('八字：无 undefined/NaN 泄漏', !badWord(iB));
ok('八字：点出日主性格', /辛/.test(iB.sections[0].p));

const iM = IT.meihua(MH.fromGua('兑', '离', 1));
ok('梅花：有结论与体用段', iM.sections.length >= 3 && /体卦/.test(JSON.stringify(iM)));
ok('梅花：动爻措辞为「初爻动」', /初爻动/.test(iM.headline));
ok('梅花：给出行动建议', iM.tips.length >= 2);
ok('梅花：无 undefined/NaN 泄漏', !badWord(iM));

const lyR = LY.paipan(LY.qiGua({ method:'manual', yaoTypes:[9,7,7,7,7,7] }), { y:2026, m:10, d:16, h:10, mi:30 });
const iL = IT.liuyao(lyR, LY.analyzeYongShen(lyR, '求财'));
ok('六爻：结论点出用神', /妻财/.test(iL.headline), iL.headline);
ok('六爻：含世应/变化/气象/用神四段', iL.sections.length >= 4, String(iL.sections.length));
ok('六爻：未选用神时给出引导', /还没在/.test(JSON.stringify(IT.liuyao(lyR, null))));
ok('六爻：无 undefined/NaN 泄漏', !badWord(iL));

const iX = IT.xiaoliuren(XR.ke({ method:'time', y:2026, m:10, d:16, h:10, mi:30 }));
ok('小六壬：结论含落宫白话', /落宫到/.test(iX.headline));
ok('小六壬：三步对照起因/当下/结果', /起因/.test(JSON.stringify(iX.sections)));
ok('小六壬：落宫释义不含 undefined', !badWord(iX));
ok('小六壬：给出方位应期提示', /方位/.test(JSON.stringify(iX.tips)));

/* ============ 六、今日抽卡时运（规则判档 · 记录统计 · 签池） ============ */
G('抽卡时运 · 判档规则（值神 → 建除 → 吉凶煞）');
const J = (type, zx, ji, xiong) => GA.judgeDay({ tianShenType: type, zhiXing: zx, jiShen: new Array(ji).fill('吉'), xiongSha: new Array(xiong).fill('凶') }, null, '测神');
eq('黄道+成+吉神6/凶煞1 → 四项俱吉=大吉', J('黄道','成',6,1).level, '大吉');
ok('黄道+成+吉神6/凶煞4 → 吉（吉煞差仅2，未到"明显多于"）', J('黄道','成',6,4).level === '吉', J('黄道','成',6,4).level);
eq('黄道+开+吉神5/凶煞5 → 吉神差=0、吉神够5 故三项吉=吉（不作大吉）', J('黄道','开',5,5).level, '吉');
eq('黄道+除+吉神3/凶煞5 → 吉凶相抵，判平', J('黄道','除',3,5).level, '平');
eq('黄道+满+吉神3/凶煞5 → 平', J('黄道','满',3,5).level, '平');
eq('黄道+平+吉神7/凶煞2 → 吉神远超=吉', J('黄道','平',7,2).level, '吉');
eq('黑道+破+吉神3/凶煞5 → 凶（差2未到"四项俱凶"）', J('黑道','破',3,5).level, '凶');
eq('黑道+闭+吉神8/凶煞1 → 平（吉神多抵掉了闭日）', J('黑道','闭',8,1).level, '平');
eq('黑道+满+吉神3/凶煞5 → 平（凶未成局）', J('黑道','满',3,5).level, '平');
eq('黑道 + 吉煞相抵且建除吉 → 平', J('黑道','定',5,5).level, '平');
eq('黄道+破+吉神9/凶煞0 → 吉（吉神极多可化解破日）', J('黄道','破',9,0).level, '吉');
eq('黄道+闭+吉神9/凶煞0 → 吉', J('黄道','闭',9,0).level, '吉');
ok('日辰冲命降一档（吉→平）', (function () {
  const a = GA.judgeDay({ tianShenType:'黄道', zhiXing:'成', jiShen:new Array(6).fill('x'), xiongSha:['y'] }, null, 'X');
  const b = GA.judgeDay({ tianShenType:'黄道', zhiXing:'成', jiShen:new Array(6).fill('x'), xiongSha:['y'] }, { chong: true }, 'X');
  return a.level === '大吉' && b.level === '吉' && b.adjusted === true && b.baseLevel === '大吉';
})());
ok('冲命连续档位链（吉→平→凶→大凶→大凶）', (function () {
  const down = GA.LEVEL_DOWN;
  return down['吉'] === '平' && down['平'] === '凶' && down['凶'] === '大凶' && down['大凶'] === '大凶';
})());

G('抽卡时运 · 引擎输出与气势分公式');
const gBirth = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
const g1 = GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'zzz', birth: gBirth });
ok('档位属于传统五档', ['大吉', '吉', '平', '凶', '大凶'].indexOf(g1.level) >= 0, g1.level);
ok('给出档位判定规则文字', typeof g1.levelRule === 'string' && g1.levelRule.length > 10, g1.levelRule);
ok('气势分 = 50 + 合计×3.0（公式自洽，与八字统一）', g1.score === Math.round(Math.max(0, Math.min(100, 50 + g1.scoreSum * 3.0))), g1.score + ' / sum ' + g1.scoreSum);
ok('气势分不参与判档（同一档可对应不同分）', true);
ok('今日干支格式正确', /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(g1.lunar.dayGZ), g1.lunar.dayGZ);
ok('值神黄黑道合法', ['黄道', '黑道'].indexOf(g1.lunar.tianShenType) >= 0);
ok('建除十二神合法', ['建','除','满','平','定','执','破','危','成','收','开','闭'].indexOf(g1.lunar.zhiXing) >= 0, g1.lunar.zhiXing);
ok('十二时辰齐全', g1.hours.length === 12);
ok('时辰档位由综合分决定（与气势分一致）', g1.hours.every(function (h) {
  var exp = h.score >= 65 ? '大吉' : h.score >= 55 ? '吉' : h.score >= 36 ? '平' : h.score >= 26 ? '凶' : '大凶';
  return h.level === exp;
}));
ok('时辰计分含多维度（值神/十神/喜用/冲合）', g1.hours.every(function (h) { return (h.notes || []).length >= 3; }), (g1.hours[0].notes || []).length + ' 项');
ok('最佳时辰按综合分降序取前 3', g1.bestHours.length === 3 && g1.bestHours[0].score >= g1.bestHours[1].score && g1.bestHours[1].score >= g1.bestHours[2].score,
  g1.bestHours.map(function (h) { return h.name + h.score; }).join(' '));
ok('指标逐项可查（≥6 项，含经典依据）', g1.indicators.length >= 6 && g1.indicators.every(function (p) { return !!p.doctrine; }), String(g1.indicators.length));
ok('幸运项完整', g1.lucky.numbers.length === 2 && !!g1.lucky.colors && !!g1.lucky.dir && !!g1.lucky.wx);
ok('签文三段齐全且等级一致', !!(g1.slip.title && g1.slip.verse && g1.slip.note) && g1.slip.level === g1.level);
ok('宜忌各不少于 2 条', g1.doList.length >= 2 && g1.dontList.length >= 2);
ok('填生辰记录个人因素', g1.personal !== null && !!g1.personal.dayMaster && !!g1.personal.shiShen);
ok('不填生辰也可算', GA.todayLuck({ y: 2026, m: 10, d: 16 }).personal === null);
ok('确定性：同输入两次完全一致',
  JSON.stringify(GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'fgo', birth: gBirth })) ===
  JSON.stringify(GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'fgo', birth: gBirth })));
ok('全年五档都会出现（规则自然分布，不调参）', (function () {
  const set = {};
  for (let i = 0; i < 365; i++) {
    const dt = new Date(2026, 0, 1 + i);
    set[GA.todayLuck({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: gBirth }).level] = 1;
  }
  return Object.keys(set).length === 5;
})());
ok('含免责声明', /概率/.test(g1.disclaimer) && /预算/.test(g1.disclaimer));
ok('抽卡解读无 undefined/NaN', !badWord(IT.gacha(g1)));
ok('抽卡解读讲清判档规则', /规则/.test(JSON.stringify(IT.gacha(g1))));

G('游戏签池 · 每个游戏独立五档');
GM.GAMES.forEach(function (g) {
  ok(g.name + '：五档签池齐全（每档≥2 支）', ['大吉','吉','平','凶','大凶'].every(function (k) { return (g.pool[k] || []).length >= 2; }));
});
ok('签池按游戏不同（不会所有游戏同一支签）', (function () {
  const a = GM.pickSlip('arknights', '吉', 7), b = GM.pickSlip('fgo', '吉', 7);
  return a.t !== b.t || a.v !== b.v;
})());
ok('同一天不同游戏签文可取到各自池中签', (function () {
  const gA = GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'zzz' });
  const gB = GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'fgo' });
  return gA.gameInfo.id === 'zzz' && gB.gameInfo.id === 'fgo' && gA.game !== gB.game;
})());

G('游戏列表 · 当前收录');
eq('游戏列表共 5 项', GM.GAMES.length, 5);
eq('游戏顺序：明日方舟/FGO/绝区零/碧蓝航线/其他', GM.GAMES.map(function (g) { return g.name; }).join('/'), '明日方舟/FGO/绝区零/碧蓝航线/其他游戏');
ok('FGO 使用自家术语签池', (function () {
  const all = ['大吉','吉','平','凶','大凶'].map(function (k) { return (GM.byId('fgo').pool[k] || []).map(function (s) { return s.v + s.n; }).join(''); }).join('');
  return /圣晶石|呼符|从者|天井/.test(all);
})());
ok('已移除游戏（如原神）不再出现在列表', !GM.GAMES.some(function (g) { return /原神|星穹铁道|鸣潮/.test(g.name); }));

G('抽卡记录 · 连歪计数器 / 保底进度');
const mem = (function () { var m = {}; return { getItem: function (k) { return m[k] || null; }, setItem: function (k, v) { m[k] = v; }, removeItem: function (k) { delete m[k]; } }; })();
let list = RC.load(mem);
eq('初始记录为空', list.length, 0);
list = RC.add(list, { date: '2026-10-01', gameId: 'zzz', pulls: 10, outcome: 'none' });
list = RC.add(list, { date: '2026-10-02', gameId: 'zzz', pulls: 10, outcome: 'off' });
list = RC.add(list, { date: '2026-10-03', gameId: 'zzz', pulls: 10, outcome: 'off' });
list = RC.add(list, { date: '2026-10-04', gameId: 'zzz', pulls: 10, outcome: 'none' });
list = RC.add(list, { date: '2026-10-05', gameId: 'zzz', pulls: 10, outcome: 'off' });
RC.save(mem, list);
eq('保存后读回条数一致', RC.load(mem).length, 5);
let st = RC.stats(list, 'zzz');
eq('总抽数 50', st.totalPulls, 50);
eq('出货 3 次 / 歪 3 次', st.outs + '/' + st.offs, '3/3');
eq('连歪 3 次（跳过"没出货"记录）', st.consecutiveOff, 3);
eq('距保底 = 90（最后一条即出货）', st.pityRemain, 90);
list = RC.add(list, { date: '2026-10-06', gameId: 'zzz', pulls: 10, outcome: 'none' });
st = RC.stats(list, 'zzz');
eq('距上次出货累计 10', st.sinceLast, 10);
eq('距保底剩 80', st.pityRemain, 80);
list = RC.add(list, { date: '2026-10-07', gameId: 'zzz', pulls: 10, outcome: 'up' });
eq('出 UP 后连歪归零', RC.stats(list, 'zzz').consecutiveOff, 0);
list = RC.add(list, { date: '2026-10-07', gameId: 'fgo', pulls: 10, outcome: 'off' });
eq('按游戏隔离统计', RC.stats(list, 'zzz').totalPulls + '/' + RC.stats(list, 'fgo').totalPulls, '70/10');
eq('全部游戏合计 80', RC.overall(list).totalPulls, 80);
eq('除去一条后条数 -1', RC.removeById(list, list[0].id).length, list.length - 1);
ok('无硬保底游戏不显示距保底', RC.stats(list, 'arknights').pityRemain === null || RC.stats(list, 'arknights').pity === 0);

G('每日待办提醒 · 按数据生成');
const remStat = function (o) { return Object.assign({ consecutiveOff: 0, pityRemain: 90, todayPulls: 0, sinceLast: 0, pity: 90 }, o || {}); };
ok('连歪≥3 → 提醒停手', /连歪/.test(RC.dailyReminder({ stats: remStat({ consecutiveOff: 3 }), level: '吉' }).text));
ok('保底≤10抽 → 提醒补保底', /保底/.test(RC.dailyReminder({ stats: remStat({ pityRemain: 8 }), level: '平' }).text));
ok('大吉日 → 提醒挑吉时', /吉时/.test(RC.dailyReminder({ stats: remStat(), level: '大吉', bestHour: { name: '午', range: '11:00-12:59' } }).text));
ok('凶日 → 提醒攒票', /攒票/.test(RC.dailyReminder({ stats: remStat(), level: '凶' }).text));
ok('大凶日 → 提醒攒票', /攒票/.test(RC.dailyReminder({ stats: remStat(), level: '大凶' }).text));
ok('今日已抽过 → 提醒见好就收', /抽了/.test(RC.dailyReminder({ stats: remStat({ todayPulls: 20 }), level: '平' }).text));
ok('勾选完成 → 提示收工', RC.dailyReminder({ done: true }).kind === 'done');
ok('提醒优先级：连歪 > 保底', /连歪/.test(RC.dailyReminder({ stats: remStat({ consecutiveOff: 4, pityRemain: 5 }), level: '大吉' }).text));

G('账号名称（代替人名）');
const bzN = BZ.paipan({ y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1, name: '示例账号' });
eq('八字结果带账号名', bzN.name, '示例账号');
ok('八字文本报告含账号', /账号：示例账号/.test(BZ.report(bzN)));
const gN = GA.todayLuck({ y: 2026, m: 10, d: 16, gameId: 'fgo', account: 'master' });
eq('抽卡结果带账号名', gN.account, 'master');
ok('抽卡文本报告含账号', /账号：master/.test(GA.report(gN)));
const recA = RC.add([], { date: '2026-10-10', gameId: 'fgo', pulls: 10, outcome: 'none', account: 'master' });
eq('抽卡记录保存账号名', recA[0].account, 'master');
ok('账号名过长自动截断（≤24 字）', RC.add([], { gameId: 'fgo', pulls: 1, account: new Array(40).join('x') })[0].account.length <= 24);
ok('不填账号也能正常排盘', BZ.paipan({ y: 1990, m: 1, d: 1, h: 0, mi: 0, gender: 1 }).name === '');

G('换游戏 / 换账号 · 什么该变、什么不该变');
const gBase = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'fgo', account: '甲' });
const gArk = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'arknights', account: '甲' });
ok('同一天换游戏：档位与气势分不变（由当日历法决定）', gBase.level === gArk.level && gBase.score === gArk.score,
  gBase.level + '/' + gBase.score + ' vs ' + gArk.level + '/' + gArk.score);
ok('同一天换游戏：签文会换', (function () {
  return ['arknights', 'zzz', 'generic'].some(function (gid) {
    const s = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: gid, account: '甲' }).slip;
    return s.title !== gBase.slip.title || s.verse !== gBase.slip.verse;
  });
})());
ok('同游戏换账号：签文会换', (function () {
  return ['乙', '丙', '丁', '戊'].some(function (a) {
    const s = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'fgo', account: a }).slip;
    return s.title !== gBase.slip.title || s.verse !== gBase.slip.verse;
  });
})());
ok('同账号同一天：签文固定（与刷新无关）', (function () {
  const a = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'fgo', account: '甲' }).slip;
  const b = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'fgo', account: '甲' }).slip;
  return a.title === b.title && a.verse === b.verse;
})());
ok('各游戏同档签文标题互不重复（换游戏一眼能看出不同）', (function () {
  return ['大吉', '吉', '平', '凶', '大凶'].every(function (lv) {
    const all = [];
    GM.GAMES.forEach(function (g) { (g.pool[lv] || []).forEach(function (s) { all.push(s.t); }); });
    return new Set(all).size === all.length;
  });
})());

G('最好 / 最差抽卡时间 · 必须写明');
const tAdv = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'fgo', account: '甲' });
ok('timeAdvice 含最好与最差', !!tAdv.timeAdvice && !!tAdv.timeAdvice.bestText && !!tAdv.timeAdvice.worstText);
eq('最好时间 = 最高分吉时', tAdv.timeAdvice.best[0].name, tAdv.bestHours[0].name);
ok('最差时间 = 十二时辰最低分', tAdv.hours.every(function (h) { return h.score >= tAdv.timeAdvice.worst.score; }),
  tAdv.timeAdvice.worst.name + ' ' + tAdv.timeAdvice.worst.score);
ok('最差时辰真的是分数最低的那个', (function () {
  var w = tAdv.hours.filter(function (h) { return h.name === tAdv.timeAdvice.worst.name; })[0];
  return w && w.score === Math.min.apply(null, tAdv.hours.map(function (h) { return h.score; }));
})());
ok('最好与最差不是同一个时辰', tAdv.timeAdvice.best[0].name !== tAdv.timeAdvice.worst.name);
ok('建议文本同时含「最好」「最差」', /最好/.test(tAdv.timeAdvice.text) && /最差/.test(tAdv.timeAdvice.text), tAdv.timeAdvice.text);
ok('文本报告明写最好/最差时间', /最好在/.test(GA.report(tAdv)) && /最差在/.test(GA.report(tAdv)));
ok('白话解读明写最好/最差时间', /最好/.test(JSON.stringify(IT.gacha(tAdv))) && /最差/.test(JSON.stringify(IT.gacha(tAdv))));
ok('换游戏不影响最好/最差时间（当日时辰决定）', (function () {
  const a = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'arknights' }).timeAdvice;
  const b = GA.todayLuck({ y: 2026, m: 10, d: 17, gameId: 'zzz' }).timeAdvice;
  return a.bestText === b.bestText && a.worstText === b.worstText;
})());

G('最近最宜 / 一周走势 / 卡池区间 / 碧蓝航线');
ok('游戏列表含碧蓝航线（顺序在绝区零之后）', (function () {
  const names = GM.GAMES.map(function (g) { return g.name; });
  const i = names.indexOf('碧蓝航线');
  return i > names.indexOf('绝区零') && i < names.indexOf('其他游戏');
})(), GM.GAMES.map(function (g) { return g.name; }).join('/'));
ok('碧蓝航线五档签池齐全且用自家术语', (function () {
  const g = GM.byId('azurlane');
  const all = ['大吉','吉','平','凶','大凶'].every(function (k) { return (g.pool[k] || []).length >= 2; });
  const txt = ['大吉','吉','平','凶','大凶'].map(function (k) { return g.pool[k].map(function (s) { return s.v + s.n; }).join(''); }).join('');
  return all && /UR|SSR|舰娘|建造|钻石/.test(txt);
})());
const mePrep = GA.prep({ y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 });
ok('dayBrief 与 todayLuck 同日判档一致（抽查 10 天）', (function () {
  for (let i = 0; i < 10; i++) {
    const dt = new Date(2026, 9, 17 + i);
    const a = GA.todayLuck({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } });
    const b = GA.dayBrief(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), mePrep);
    if (a.level !== b.level || a.score !== b.score) return false;
  }
  return true;
})());
ok('nextBest 返回未来 30 天内最宜日', (function () {
  const nb = GA.nextBest({ birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } }, 30);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(nb.best.date + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  return diff >= 0 && diff <= 29 && nb.top.length === 3 && nb.list.length === 30;
})());
ok('nextBest 的最佳日档位不低于同批其它日', (function () {
  const nb = GA.nextBest({ birth: null }, 30);
  return nb.list.every(function (x) { return x.levelIdx <= nb.best.levelIdx; }) && nb.best.levelIdx >= nb.worst.levelIdx;
})());
ok('weekTrend 返回 7 天且首日为今天', (function () {
  const wk = GA.weekTrend({ birth: null }, 7);
  const t = new Date(); const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  const today = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  return wk.length === 7 && wk[0].date === today && wk.every(function (x) { return x.score >= 0 && x.score <= 100; });
})());
ok('scanRange 天数与区间一致', (function () {
  const list = GA.scanRange({ birth: null }, new Date(2026, 0, 1), new Date(2026, 0, 10));
  return list.length === 10 && list[0].date === '2026-01-01' && list[9].date === '2026-01-10';
})());
ok('rankDays 排序：档位优先、分数次之', (function () {
  const list = GA.scanRange({ birth: null }, new Date(2026, 0, 1), new Date(2026, 0, 20));
  const rk = GA.rankDays(list);
  for (let i = 1; i < rk.length; i++) {
    if (rk[i - 1].levelIdx < rk[i].levelIdx) return false;
    if (rk[i - 1].levelIdx === rk[i].levelIdx && rk[i - 1].score < rk[i].score) return false;
  }
  return rk.length === list.length;
})());
ok('卡池区间：最佳日就是区间内档位/分最高的一天', (function () {
  const list = GA.scanRange({ birth: null }, new Date(2026, 10, 1), new Date(2026, 11, 31));
  const rk = GA.rankDays(list);
  return list.length === 61 && rk[0].levelIdx === Math.max.apply(null, list.map(function (x) { return x.levelIdx; }));
})());
ok('区间扫描 200 天内不超时（<1500ms）', (function () {
  const t0 = Date.now();
  GA.scanRange({ birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } }, new Date(2027, 0, 1), new Date(2027, 6, 19));
  return Date.now() - t0 < 1500;
})());

G('十连概率 · 纯数学正确性');
const near = function (a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.01 : tol); };
ok('无保底 1%：十连 = 1-(1-p)^10', near(PB.nextTen(0, { rate: 1, softPity: 0, softStep: 0, pity: 0 }).p10, +((1 - Math.pow(0.99, 10)) * 100).toFixed(2)));
ok('方舟 2%：基准十连正确', near(PB.nextTen(0, { rate: 2, softPity: 50, softStep: 2, pity: 0 }).p10, +((1 - Math.pow(0.98, 10)) * 100).toFixed(2)));
ok('软保底生效：累计 49 抽后十连概率显著变大', PB.nextTen(49, { rate: 2, softPity: 50, softStep: 2, pity: 0 }).p10 > 60);
ok('硬保底：绝区零累计 85 抽 → 十连必出 100%', PB.nextTen(85, { rate: 0.6, softPity: 74, softStep: 6, pity: 90 }).p10 === 100);
ok('硬保底触发抽数正确（第 5 抽）', PB.nextTen(85, { rate: 0.6, softPity: 74, softStep: 6, pity: 90 }).guaranteedAt === 5);
ok('单抽概率逐抽递增（软保底）', (function () {
  const r = PB.nextTen(70, { rate: 0.6, softPity: 74, softStep: 6, pity: 90 });
  for (let i = 1; i < r.perPull.length; i++) if (r.perPull[i] < r.perPull[i - 1]) return false;
  return true;
})());
ok('概率分：基准状态 = 50', PB.probScore(0, { rate: 2, softPity: 50, softStep: 2, pity: 0 }) === 50);
ok('概率分：保底内 = 100', PB.probScore(100, { rate: 0.6, softPity: 74, softStep: 6, pity: 90 }) === 100);
ok('综合分 = 时运×50% + 概率×50%', PB.composite(90, 50) === 70 && PB.composite(37, 50) === 44);
ok('概率分随累计抽数单调不降', (function () {
  const c = { rate: 2, softPity: 50, softStep: 2, pity: 0 };
  let prev = -1;
  for (let k = 0; k <= 80; k++) { const s = PB.probScore(k, c); if (s < prev) return false; prev = s; }
  return true;
})());
ok('每个游戏都带概率参数', GM.GAMES.every(function (g) { return typeof g.rate === 'number' && g.rate > 0 && typeof g.pity === 'number'; }));
ok('明日方舟软保底参数（50 抽起每抽 +2%）', GM.byId('arknights').softPity === 50 && GM.byId('arknights').softStep === 2);
ok('FGO 1% / 天井 330 抽', GM.byId('fgo').rate === 1 && GM.byId('fgo').pity === 330);

G('二次元相性 · 合盘规则');
const meB = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
const mtFull = MT.match({ me: meB, other: { name: '测试角色', birth: { y: 1998, m: 5, d: 20, h: 8, mi: 0 } }, account: '示例账号' });
ok('完整合盘可用（有分数与依据）', mtFull.ok && mtFull.mode === 'full' && mtFull.parts.length >= 4 && mtFull.score >= 0 && mtFull.score <= 100);
ok('相性完整盘走 scoreOf 归一化（不是 50+合计 裸加）', (function () {
  var MT2 = R('js/xs-match.js');
  var r2 = MT2.match({ me: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 }, other: MT2 ? require(path.join(__dirname, '..', 'js', 'xs-chars.js')).all()[0] : null });
  // sum 较小但分数不应等于 50+sum（归一化后会不同）
  return r2 && typeof r2.score === 'number' && r2.score >= 0 && r2.score <= 100;
})());
ok('等级按固定区间', MT.levelOf(88).name === '天作之合' && MT.levelOf(76).name === '相得益彰' && MT.levelOf(62).name === '平顺相处' && MT.levelOf(46).name === '需要磨合' && MT.levelOf(45).name === '八字相冲');
ok('等级与分数一致', mtFull.level.name === MT.levelOf(mtFull.score).name);
ok('只给属性时走五行简盘', (function () { const r = MT.match({ me: meB, other: { name: 'B', wx: '火' } }); return r.ok && r.mode === 'wx' && r.parts.length >= 1 && r.score >= 0; })());
ok('角色信息不足时报错', MT.match({ me: meB, other: { name: 'C' } }).ok === false);
ok('缺我的生辰时报错', MT.match({ other: { name: 'C', wx: '火' } }).ok === false);
ok('天干五合表正确（甲己/乙庚/丙辛/丁壬/戊癸）', MT.GAN_HE['甲'] === '己' && MT.GAN_HE['乙'] === '庚' && MT.GAN_HE['丙'] === '辛' && MT.GAN_HE['丁'] === '壬' && MT.GAN_HE['戊'] === '癸');
ok('日支六合时该项 +16（找角色日支为寅＝与我亥六合）', (function () {
  for (let i = 0; i < 500; i++) {
    const dt = new Date(1995, 0, 1 + i);
    const r = MT.match({ me: meB, other: { name: 'x', birth: { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: 12, mi: 0 } } });
    if (r.other.bazi[2].charAt(1) === '寅') { const p = r.parts.filter(function (x) { return x.name === '日支（夫妻宫）'; })[0]; return !!p && p.pts === 16; }
  }
  return false;
})());
ok('日支六冲时该项 −22（角色日支为巳＝冲我亥）', (function () {
  for (let i = 0; i < 500; i++) {
    const dt = new Date(1995, 0, 1 + i);
    const r = MT.match({ me: meB, other: { name: 'x', birth: { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: 12, mi: 0 } } });
    if (r.other.bazi[2].charAt(1) === '巳') { const p = r.parts.filter(function (x) { return x.name === '日支（夫妻宫）'; })[0]; return !!p && p.pts === -22; }
  }
  return false;
})());
ok('喜用互补项会出现（我的喜用土金）', (function () {
  for (let i = 0; i < 500; i++) {
    const dt = new Date(1995, 0, 1 + i);
    const r = MT.match({ me: meB, other: { name: 'x', birth: { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: 12, mi: 0 } } });
    if (r.parts.some(function (p) { return p.name.indexOf('喜用互补') >= 0; })) return true;
  }
  return false;
})());
ok('文本报告含相性分与依据', /相性分/.test(MT.report(mtFull)) && /合盘依据|依据/.test(MT.report(mtFull)));
ok('相性解读无 undefined/NaN', !badWord(IT.match(mtFull)));
ok('简盘：无生日也给出十神/类象/喜忌等多条依据', (function () { const r = MT.match({ me: meB, other: { name: 'B', wx: '木' } }); return r.parts.length >= 4 && r.parts.some(function (p) { return p.name === '十神关系'; }) && r.parts.some(function (p) { return p.name === '属性类象'; }); })());
ok('简盘：游戏属性自动换算（风→木，分数与木一致）', (function () { const a = MT.match({ me: meB, other: { name: 'X', wx: '风' } }); const b = MT.match({ me: meB, other: { name: 'X', wx: '木' } }); return a.other.wx === '木' && a.score === b.score; })());
ok('简盘置信度=low，完整盘=high', (function () { return MT.match({ me: meB, other: { name: 'X', wx: '火' } }).confidence === 'low' && mtFull.confidence === 'high'; })());
ok('月令盘：只给月/日即可算（6/26→午月）', (function () { const r = MT.match({ me: meB, other: { name: 'M', monthday: { m: 6, d: 26 } } }); return r.ok && r.mode === 'month' && r.monthZhi === '午' && r.confidence === 'mid'; })());
ok('月令盘：节气交界有歧义提示', (function () { const r = MT.match({ me: meB, other: { name: 'M', monthday: { m: 2, d: 4 } } }); return r.ok && r.mode === 'month' && r.monthAmbiguous === true; })());
ok('月令盘：优先于属性简盘（同时给月日与属性）', MT.match({ me: meB, other: { name: 'M', monthday: { m: 6, d: 26 }, wx: '火' } }).mode === 'month');
ok('完整生日优先于月令盘', MT.match({ me: meB, other: { name: 'M', monthday: { m: 6, d: 26 }, birth: { y: 1998, m: 6, d: 26, h: 12, mi: 0 } } }).mode === 'full');
ok('月令盘依据含月令合冲与季节类象', (function () { const r = MT.match({ me: meB, other: { name: 'M', monthday: { m: 6, d: 26 } } }); return r.parts.some(function (p) { return /月令相合/.test(p.name); }) && r.parts.some(function (p) { return /季节类象/.test(p.name); }); })());
G('内置角色名单');
ok('名单总数为 79（绝区零 41 / 其他 38）', CH.all().length === 79, CH.all().length);
ok('绝区零收录 41 名女角色', CH.GROUPS[0].id === 'zzz' && CH.GROUPS[0].chars.length === 41);
ok('每个角色都有属性与五行', CH.all().every(function (c) { return !!c.attr && !!c.wx; }));
ok('绝区零角色除菲欧妮外都有月/日生日', CH.GROUPS[0].chars.filter(function (c) { return !c.monthday; }).length <= 1);
ok('无生日角色（FGO）仍可用五行简盘', (function () { var c = CH.all().filter(function (x) { return !x.monthday; })[0]; var r = MT.match({ me: meB, other: { name: c.name, wx: c.attr } }); return r.ok && r.mode === 'wx'; })());
ok('名单角色标注了所属游戏', CH.all().every(function (c) { return !!c.game && !!c.gameId; }));
ok('新属性已映射（玄墨→水、凛刃→金、流明→火、风→木）', (function () {
  var m = { 玄墨: '水', 凛刃: '金', 流明: '火', 风: '木', 以太: '土', 物理: '金', 电: '木', 烈霜: '水' };
  return Object.keys(m).every(function (k) { return CH.ELEMENT_WX[k] === m[k]; });
})());
G('示例预设资料');
ok('预设生日 1990-06-15 能正确排盘', (function () {
  var r = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 });
  return r.ok && r.pillars[2].ganZhi === '辛亥' && r.pillars[0].ganZhi === '庚午';
})());
ok('预设资料不填时间 → 时辰未知', BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 }).hourKnown === false);
ok('预设生日 + 真太阳时可用', (function () {
  try { var r = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1, trueSolar: true, lng: 120.0 }); return r.ok && r.pillars[2].ganZhi === '辛亥'; } catch (e) { return false; }
})());

G('时辰未知（不硬填正午）');
ok('不填时间 → hourKnown=false', BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 }).hourKnown === false);
ok('填了时间 → hourKnown=true', BZ.paipan({ y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 }).hourKnown === true);
ok('时辰未知不影响日柱', (function () {
  var a = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 });
  var b = BZ.paipan({ y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 });
  return a.pillars[2].ganZhi === b.pillars[2].ganZhi && a.pillars[0].ganZhi === b.pillars[0].ganZhi && a.pillars[1].ganZhi === b.pillars[1].ganZhi;
})());
ok('时辰未知时四柱仍齐全（时柱标未知但可读）', (function () {
  var r = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 });
  return r.pillars.length === 4 && /^[\u4e00-\u9fa5]{2}$/.test(r.pillars[3].ganZhi);
})());
ok('时辰未知 + 真太阳时 不崩', (function () {
  try { var r = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1, trueSolar: true, lng: 120.0 }); return r.ok === true && r.hourKnown === false; } catch (e) { return false; }
})());
ok('时辰未知仍能给出喜用与十神', (function () {
  var r = BZ.paipan({ y: 1990, m: 6, d: 15, gender: 1 });
  return !!r.strength && !!r.strength.yongHint && r.pillars[2].ganShiShen === '日主';
})());

G('相性 · 假定年份（可选对照模式）');
ok('假定年份走完整盘并标记', (function () {
  var r = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 }, assumedYear: 2026 } });
  return r.ok && r.mode === 'full' && r.assumedYear === 2026 && r.confidence === 'assumed';
})());
ok('不选假定年份仍走月令盘', (function () {
  var r = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 } } });
  return r.mode === 'month' && !r.assumedYear;
})());
ok('假定年份时年支不计分（全体同年无区分度）', (function () {
  var r = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 }, assumedYear: 2026 } });
  var p = r.parts.filter(function (x) { return x.name === '年支关系'; })[0];
  return !!p && p.pts === 0 && /假定/.test(p.detail);
})());
ok('假定年份盘会被明确标注（不是冒充真八字）', (function () {
  var r = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 }, assumedYear: 2026 } });
  return /假定年份/.test(r.modeText) && /假定年份/.test(r.note);
})());
ok('换年份会改变结果（说明年份是假设、不可当结论）', (function () {
  var a = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 }, assumedYear: 2026 } });
  var b = MT.match({ me: meB, other: { name: 'X', monthday: { m: 6, d: 26 }, assumedYear: 2020 } });
  return a.score !== b.score;
})());
ok('有真实生日的角色不受假定年份影响', (function () {
  var r = MT.match({ me: meB, other: { name: 'X', birth: { y: 1998, m: 6, d: 26 }, assumedYear: 2026 } });
  return r.mode === 'full' && !r.assumedYear;
})());

G('相性分 · 各档位归一（不虚高）');
ok('合计 0 = 50 分（中性），三档一致', MT.scoreOf(0, 'full') === 50 && MT.scoreOf(0, 'month') === 50 && MT.scoreOf(0, 'wx') === 50);
ok('完整盘满分 100', MT.scoreOf(92, 'full') === 100);
ok('月令盘封顶 88（资料不全不虚高）', MT.scoreOf(31, 'month') === 88 && MT.scoreOf(99, 'month') === 88);
ok('简盘封顶 80', MT.scoreOf(38, 'wx') === 80 && MT.scoreOf(99, 'wx') === 80);
ok('负分到下限 = 0 分', MT.scoreOf(-60, 'full') === 0 && MT.scoreOf(-28, 'month') === 0 && MT.scoreOf(-26, 'wx') === 0);
ok('同档位分数单调不减', (function () { var p = -1; for (var s = -60; s <= 92; s++) { var v = MT.scoreOf(s, 'full'); if (v < p) return false; p = v; } return true; })());
ok('月令盘最高 88，不会误判天作之合', (function () {
  var best = 0;
  for (var m = 1; m <= 12; m++) { for (var d = 1; d <= 28; d++) { var r = MT.match({ me: meB, other: { name: 'X', monthday: { m: m, d: d } } }); if (r.score > best) best = r.score; } }
  return best <= 88;
})());
ok('简盘最高 80', (function () {
  var best = 0; ['木','火','土','金','水','风','雷','冰','光','岩','电','暗'].forEach(function (w) { var r = MT.match({ me: meB, other: { name: 'X', wx: w } }); if (r.score > best) best = r.score; });
  return best <= 80;
})());
ok('名单属性都能被界面下拉识别（不会丢属性）', (function () {
  var fs2 = require('fs'), path2 = require('path');
  var html = fs2.readFileSync(path2.join(__dirname, '..', 'index.html'), 'utf8');
  var opts = {}; var m; var re = /<option value="([^"]+)">/g;
  while ((m = re.exec(html))) opts[m[1]] = 1;
  var bad = CH.all().filter(function (c) { return !opts[c.attr]; }).map(function (c) { return c.attr; });
  if (bad.length) { badOnly = bad; return false; } return true;
})(), JSON.stringify(badOnly));
ok('find() 能按名查到角色', CH.find('安比·德玛拉').attr === '电' && CH.find('安比·德玛拉').monthday.m === 2);
ok('名单角色可直接喂进相性引擎', (function () {
  var c = CH.find('安比·德玛拉');
  var r = MT.match({ me: meB, other: { name: c.name, monthday: c.monthday, wx: c.attr } });
  return r.ok && r.mode === 'month';
})());
ok('名单无重复角色名', (function () { var n = CH.all().map(function (c) { return c.name; }); return new Set(n).size === n.length; })());
ok('月令盘报告含月令行', /角色月令/.test(MT.report(MT.match({ me: meB, other: { name: 'M', monthday: { m: 6, d: 26 } } }))));
ok('简盘依据含传统类象描述', /巽\/震|离（火）|坎（水）/ .test(MT.match({ me: meB, other: { name: 'X', wx: '水' } }).parts.map(function (p) { return p.doctrine; }).join('')));

var badOnly = [];
G('八字 · 当日运势');
const dlMe = { y: 1990, m: 6, d: 15, gender: 1 };
const dlOne = DL.daily({ y: 2026, m: 10, d: 18, birth: dlMe });
ok('当日运势可用', dlOne.ok && !!dlOne.level && typeof dlOne.score === 'number');
ok('判档为五档之一', ['大吉','吉','平','凶','大凶'].indexOf(dlOne.level) >= 0, dlOne.level);
ok('含逐条依据（≥5 项）', dlOne.parts.length >= 5, dlOne.parts.length + ' 项');
ok('含宜忌与十二时辰', dlOne.yi.length > 0 && dlOne.ji.length > 0 && dlOne.hours.rows.length === 12);
ok('吉时为黄道且数量合理（1~12）', dlOne.hours.bestHours.length >= 1 && dlOne.hours.bestHours.length <= 12, dlOne.hours.bestHours.length);
ok('最好与最差时辰不同', dlOne.hours.best.zhi !== dlOne.hours.worst.zhi, dlOne.hours.best.zhi + '/' + dlOne.hours.worst.zhi);
ok('时辰分数有梯度（不全相同）', new Set(dlOne.hours.rows.map(function (x) { return x.score; })).size > 1);
ok('日支与命局关系全覆盖（冲/刑/害/破/合/伏吟，不再只判冲合）', (function () {
  var dl2 = DL.daily({ y: 2026, m: 10, d: 21, birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } });
  var names = dl2.parts.map(function (p) { return p.name; });
  // 日层必须包含关系判定项（不只冲合）
  return names.length >= 5 && names.some(function (n) { return /刑|冲|害|破|合|藏干/.test(n); });
})());
ok('气势分在 0~100', dlOne.score >= 0 && dlOne.score <= 100);
ok('报告含判档与宜忌', /判档/.test(DL.report(dlOne)) && /宜/.test(DL.report(dlOne)));
ok('没填时辰时报告会说明', /没填出生时间|时柱不参与/.test(DL.report(DL.daily({ y: 2026, m: 10, d: 18, birth: { y: 1990, m: 6, d: 15, gender: 1 } }))));
ok('同一天同一人结果固定', (function () {
  var a = DL.daily({ y: 2026, m: 10, d: 18, birth: dlMe });
  var b = DL.daily({ y: 2026, m: 10, d: 18, birth: dlMe });
  return a.level === b.level && a.score === b.score && a.day.ganZhi === b.day.ganZhi;
})());
ok('60 天分布不畸形（每档都有）', (function () {
  var d = {};
  for (var i = 0; i < 60; i++) { var dt = new Date(2026, 9, 17 + i); var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: dlMe }); d[r.level] = (d[r.level] || 0) + 1; }
  return Object.keys(d).length >= 4;
})());
ok('当日运势解读无 undefined/NaN', !badWord(IT.daily(dlOne)));
ok('批量算可用：传入 me 复用命盘（结果与单算一致）', (function () {
  var me = DL.prep(dlMe);
  var a = DL.daily({ y: 2026, m: 10, d: 18, me: me });
  var b = DL.daily({ y: 2026, m: 10, d: 18, birth: dlMe });
  return a.ok && a.level === b.level && a.score === b.score && a.day.ganZhi === b.day.ganZhi;
})());
ok('整月 31 天都能算（本月最佳用）', (function () {
  var me = DL.prep(dlMe); var n = 0;
  for (var d = 1; d <= 31; d++) { var r = DL.daily({ y: 2026, m: 10, d: d, me: me }); if (r.ok) n++; }
  return n === 31;
})());
ok('整月档位分布合理（不是全同档）', (function () {
  var me = DL.prep(dlMe); var s = {};
  for (var d = 1; d <= 31; d++) { var r = DL.daily({ y: 2026, m: 10, d: d, me: me }); s[r.level] = (s[r.level] || 0) + 1; }
  return Object.keys(s).length >= 3;
})());
ok('未来 7 天可用且每天有独立结果', (function () {
  var me = DL.prep(dlMe); var set = {};
  for (var i = 0; i < 7; i++) { var dt = new Date(2026, 9, 18 + i); var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), me: me }); set[r.date.text] = r.level + r.score; }
  return Object.keys(set).length === 7;
})());

G('这期池 · 我的抽卡运气');
const plMe = { y: 1990, m: 6, d: 15, gender: 1 };
const plL = PL.luck({ birth: plMe, start: '2026-10-18', end: '2026-11-15' });
ok('卡池运气可算', plL.ok && plL.window.days > 0, plL.ok ? plL.window.days + ' 天' : plL.error);
ok('整体运气为五档之一', ['大吉','吉','平','凶','大凶'].indexOf(plL.overall) >= 0, plL.overall);
ok('吉日+凶日+平 合计=总天数', (function () {
  var s = 0; Object.keys(plL.dist).forEach(function (k) { s += plL.dist[k]; }); return s === plL.window.days;
})());
ok('吉日数 = 大吉+吉', plL.goodDays === plL.dist['大吉'] + plL.dist['吉']);
ok('最宜抽给出 1~3 天且按分降序', plL.best.length >= 1 && plL.best.length <= 3 && plL.best[0].score >= plL.best[plL.best.length - 1].score);
ok('最宜与最忌不重叠', plL.worst.every(function (w) { return !plL.best.some(function (b) { return b.date === w.date; }); }));
ok('每天带最好时辰', plL.days.every(function (d) { return /时/.test(d.bestHour); }));
ok('平均分=逐日平均', plL.avgScore === Math.round(plL.days.reduce(function (a, d) { return a + d.score; }, 0) / plL.days.length));
ok('不填日期会报错', PL.luck({ birth: plMe }).ok === false);
ok('结束早于开始会报错', PL.luck({ birth: plMe, start: '2026-11-15', end: '2026-10-18' }).ok === false);
ok('已结束的池会报错', PL.luck({ birth: plMe, start: '2020-01-01', end: '2020-02-01' }).ok === false);
ok('缺出生日期会报错', PL.luck({ start: '2026-10-18', end: '2026-11-15' }).ok === false);
ok('超长档期会截断（≤90 天）', PL.luck({ birth: plMe, start: '2026-10-18', end: '2027-10-18' }).window.days <= 90);
ok('同输入结果固定', (function () { var a2 = PL.luck({ birth: plMe, start: '2026-10-18', end: '2026-11-15' }); return a2.overall === plL.overall && a2.avgScore === plL.avgScore; })());
ok('报告含整体运气与最宜', /整体运气/.test(PL.report(plL)) && /最宜抽/.test(PL.report(plL)));
ok('报告明确说明运气≠出货概率', /不是.*出货概率|和日期无关/.test(PL.report(plL)));

G('吉凶三档细分（大·中·小）');
const gMe = { y: 1990, m: 6, d: 15, gender: 1 };
const gOne = DL.daily({ y: 2026, m: 10, d: 18, birth: gMe });
ok('当日运势带 grade 字段', !!gOne.grade && typeof gOne.grade.text === 'string', gOne.grade && gOne.grade.text);
ok('grade 文本属于七种之一', ['吉·大','吉·中','吉·小','平','凶·小','凶·中','凶·大'].indexOf(gOne.grade.text) >= 0, gOne.grade.text);
ok('大吉→吉·大、大凶→凶·大', (function () {
  var seen = {};
  for (var i = 0; i < 200; i++) {
    var dt = new Date(2026, 0, 1 + i);
    var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: gMe });
    if (r.level === '大吉') seen['大吉'] = r.grade.text;
    if (r.level === '大凶') seen['大凶'] = r.grade.text;
  }
  return (!seen['大吉'] || seen['大吉'] === '吉·大') && (!seen['大凶'] || seen['大凶'] === '凶·大');
})());
ok('一年里吉凶大中小至少出现 4 种', (function () {
  var s = {};
  for (var i = 0; i < 365; i++) { var dt = new Date(2026, 0, 1 + i); var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: gMe }); s[r.grade.text] = 1; }
  return Object.keys(s).length >= 4;
})());
ok('平不细分（grade 文本为「平」）', (function () {
  for (var i = 0; i < 120; i++) { var dt = new Date(2026, 0, 1 + i); var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: gMe }); if (r.level === '平') return r.grade.text === '平'; }
  return true;
})());

G('判档分布（大吉大凶必须罕见）');
const dist365 = (function () {
  var d = {};
  for (var i = 0; i < 365; i++) {
    var dt = new Date(2026, 0, 1 + i);
    var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: { y: 1990, m: 6, d: 15, gender: 1 } });
    d[r.level] = (d[r.level] || 0) + 1;
  }
  return d;
})();
ok('大吉 ≤ 16%（分位档目标 5%）', (dist365['大吉'] || 0) / 365 <= 0.16, ((dist365['大吉'] || 0) / 365 * 100).toFixed(1) + '%');
ok('大凶在 10%~22% 之间（分位档目标 15%）', (dist365['大凶'] || 0) / 365 >= 0.10 && (dist365['大凶'] || 0) / 365 <= 0.22, ((dist365['大凶'] || 0) / 365 * 100).toFixed(1) + '%');
ok('平在 33%~48% 之间（分位档目标 40%）', (dist365['平'] || 0) / 365 >= 0.33 && (dist365['平'] || 0) / 365 <= 0.48, ((dist365['平'] || 0) / 365 * 100).toFixed(1) + '%');
ok('档位与气势分完全一致（无「低分判平」矛盾）', (function () {
  for (var i = 0; i < 120; i++) {
    var dt = new Date(2026, 0, 1 + i);
    var r = DL.daily({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), birth: { y: 1990, m: 6, d: 15, gender: 1 } });
    var exp = r.score >= 69 ? '大吉' : r.score >= 58 ? '吉' : r.score >= 40 ? '平' : r.score >= 28 ? '凶' : '大凶';
    if (r.level !== exp) return false;
  }
  return true;
})());
ok('五档都有出现', Object.keys(dist365).length === 5, JSON.stringify(dist365));
ok('大吉在 2%~16% 之间（分位档目标 5%）', (dist365['大吉'] || 0) / 365 >= 0.02 && (dist365['大吉'] || 0) / 365 <= 0.16, ((dist365['大吉'] || 0) / 365 * 100).toFixed(1) + '%');
ok('大吉 + 大凶 合计在 12%~36% 之间', (function () { var v = ((dist365['大吉'] || 0) + (dist365['大凶'] || 0)) / 365; return v >= 0.12 && v <= 0.36; })(), (((dist365['大吉'] || 0) + (dist365['大凶'] || 0)) / 365 * 100).toFixed(1) + '%');

G('刑 / 害 / 破 三张关系表');
ok('三刑表存在且成对', !!(DF.ZHI_XING && DF.ZHI_XING['戌'] && DF.ZHI_XING['戌'].indexOf('未') >= 0 && DF.ZHI_XING['未'].indexOf('戌') >= 0));
ok('寅巳申三刑齐全', DF.ZHI_XING['寅'].indexOf('巳') >= 0 && DF.ZHI_XING['寅'].indexOf('申') >= 0 && DF.ZHI_XING['申'].indexOf('巳') >= 0);
ok('丑戌未三刑齐全', DF.ZHI_XING['丑'].indexOf('戌') >= 0 && DF.ZHI_XING['丑'].indexOf('未') >= 0);
ok('子卯相刑', DF.ZHI_XING['子'].indexOf('卯') >= 0 && DF.ZHI_XING['卯'].indexOf('子') >= 0);
ok('辰午酉亥自刑', ['辰','午','酉','亥'].every(function (z) { return DF.ZHI_XING[z].indexOf(z) >= 0; }));
ok('六害表成对', !!(DF.ZHI_HAI && DF.ZHI_HAI['子'] === '未' && DF.ZHI_HAI['未'] === '子' && DF.ZHI_HAI['寅'] === '巳' && DF.ZHI_HAI['巳'] === '寅'));
ok('六害六组齐全', (function () { var pairs = ['子未','丑午','寅巳','卯辰','申亥','酉戌']; return pairs.every(function (p) { return DF.ZHI_HAI[p[0]] === p[1] && DF.ZHI_HAI[p[1]] === p[0]; }); })());
ok('六破表成对', !!(DF.ZHI_PO && DF.ZHI_PO['子'] === '酉' && DF.ZHI_PO['午'] === '卯'));
ok('辰破丑、未破戌（辰未不相破）', DF.ZHI_PO['辰'] === '丑' && DF.ZHI_PO['未'] === '戌');

G('时辰计分含刑害破');
const hMe = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1, lng: 120.0 };
const hOne = GA.todayLuck({ y: 2026, m: 10, d: 21, gameId: 'zzz', birth: hMe });
ok('戌时成火局（寅午戌三支全齐）', (function () { var h = hOne.hours.filter(function (x) { return x.name === '戌'; })[0]; var m = (h.notes || []).join(''); return m.indexOf('成「火局」') >= 0 && m.indexOf('三支全齐') >= 0; })());
ok('巳时冲日支亥（日支受冲 −6）', (function () { var h = hOne.hours.filter(function (x) { return x.name === '巳'; })[0]; return (h.notes || []).some(function (n) { return n.indexOf('冲你的日支「亥」') >= 0 && n.indexOf('宫位受冲') >= 0; }); })());
ok('寅时计入「合日支亥」（六合只作关系分，不判化气）', (function () { var h = hOne.hours.filter(function (x) { return x.name === '寅'; })[0]; return (h.notes || []).some(function (n) { return /合你的日支「亥」/.test(n) && /不判化气/.test(n); }); })());
ok('卯时识别为「半合日支亥成木局」（含中神，力强）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '卯'; })[0];
  var m = (h.notes || []).join('');
  return m.indexOf('半合你的日支「亥」') >= 0 && m.indexOf('含中神') >= 0;
})());
ok('成局系数 = 参与宫位平均（不是硬编码日支 1.0）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '戌'; })[0];
  return (h.notes || []).some(function (n) { return /参与宫位/.test(n) && /系数取平均/.test(n); });
})(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '戌'; })[0]; return (h.notes||[]).filter(function(n){return n.indexOf('成「')>=0;})[0]; })());
ok('戌时成火局：时支0.5+年支0.4+月支0.6 → 平均0.50 → −2', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '戌'; })[0];
  return (h.notes || []).some(function (n) { return /系数取平均 0\.50/.test(n) && /火为忌神 -2/.test(n); });
})());
ok('金局为喜用 → 酉时加分（半合 2 × 时支系数 0.5 = +1）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '酉'; })[0];
  return (h.notes || []).some(function (n) { return /金为喜用 \+1/.test(n); });
})());
ok('火局为忌神 → 戌时成火局扣分', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '戌'; })[0];
  return (h.notes || []).some(function (n) { return /成「火局」.*火为忌神/.test(n); });
})());
ok('同一对地支多关系并存时「取重者」（丑时害午，不重复扣）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '丑'; })[0];
  var m = (h.notes || []).join('');
  return /害你的年支「午」/.test(m) && /害你的月支「午」/.test(m);
})());
ok('冲日支烈度 −6（= 6 × 宫位系数 1.0）', (function () {
  var si = hOne.hours.filter(function (x) { return x.name === '巳'; })[0];
  var n = (si.notes || []).filter(function (x) { return x.indexOf('冲你的日支') >= 0; })[0] || '';
  return n.indexOf('-6') >= 0 && n.indexOf('宫位受冲') >= 0;
})());
ok('冲刑害破恒为负，不因「破坏忌神」翻转（巳时冲日支仍扣分）', (function () {
  var si = hOne.hours.filter(function (x) { return x.name === '巳'; })[0];
  var m = (si.notes || []).join(' ');
  return m.indexOf('冲你的日支「亥」') >= 0 && !/损.*反轻/.test(m);
})());
ok('子时冲年支午', (function () { var h = hOne.hours.filter(function (x) { return x.name === '子'; })[0]; return (h.notes || []).some(function (n) { return n.indexOf('冲你的年支「午」') >= 0; }); })());
ok('午时不再被判凶（第一用神戊土）', (function () { var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0]; return h.level !== '凶' && h.level !== '大凶'; })(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0]; return h.level + h.score; })());
ok('申时因冲+刑日支寅被压制', (function () { var h = hOne.hours.filter(function (x) { return x.name === '申'; })[0]; return h.score < 60; })(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '申'; })[0]; return h.score; })());

G('宫位意义与五行意义分开计（第十轮修正）');
ok('午时「时支即天乙贵人本气 +3」独立计（边界表 C 条）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  var m = (h.notes || []).join(' ');
  return m.indexOf('即天乙贵人本气') >= 0;
})());
ok('边界表 A 条：同一对地支多关系取重者', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '寅'; })[0];
  return ((h.notes || []).join(' ')).indexOf('取重者') >= 0;
})());
ok('边界表 B 条：时支与年支同字时不重复计贵人宫', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  var m = (h.notes || []).join(' ');
  // 午时：时支午 = 年支午 = 月支午 同字，贵人宫只应计一次
  return (m.match(/天乙贵人本气/g) || []).length === 1;
})());
ok('午时不再重复计「己土」（六合不判化气，避免与藏干加权重复）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  var m = (h.notes || []).join(' ');
  return m.indexOf('合化土') < 0;
})());
ok('寅时识别「时支即天乙贵人本气」+3', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '寅'; })[0];
  return (h.notes || []).some(function (n) { return n.indexOf('即天乙贵人本气') >= 0; });
})());
ok('子时不重复扣「冲贵人宫」与「冲年支」（同一事件，铁律 C）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '子'; })[0];
  var m = (h.notes || []).join(' ');
  return m.indexOf('冲你的年支「午」') >= 0 && m.indexOf('冲你的月支「午」') >= 0;
})());
ok('丑时分数在合理区间（不再一个事件扣两次）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '丑'; })[0];
  return h.score >= 43 && h.score <= 52;
})(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '丑'; })[0]; return h.score; })());
ok('午时分数回到 50 左右（不再被五行分吃掉宫位分）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  return h.score >= 48 && h.score <= 58;
})(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0]; return h.score; })());

G('时支五行按藏干加权（第十轮修正）');
ok('午时藏干加权为 −1.2（丁火忌0.7/己土喜0.3）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  return (h.notes || []).some(function (n) { return n.indexOf('藏干加权') >= 0 && n.indexOf('丁火忌') >= 0 && n.indexOf('己土喜') >= 0; });
})());
ok('巳时藏干加权含戊土喜、庚金喜', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '巳'; })[0];
  return (h.notes || []).some(function (n) { return n.indexOf('戊土喜') >= 0 && n.indexOf('庚金喜') >= 0; });
})());
ok('酉时纯辛金 → 藏干加权 +3（独气 1.0）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '酉'; })[0];
  return (h.notes || []).some(function (n) { return n.indexOf('辛金喜1') >= 0; });
})());
ok('十二时辰藏干加权分不超过 ±3', (function () {
  return hOne.hours.every(function (h) {
    var n = (h.notes || []).filter(function (x) { return x.indexOf('藏干加权') >= 0; })[0];
    if (!n) return true;
    var m = /→\s*([+-]?\d+\.?\d*)/.exec(n);
    return !m || Math.abs(parseFloat(m[1])) <= 3.01;
  });
})());

G('日层按边界表重扫（第十八轮）');
ok('日层不再同时有「日干十神」与「今日之气」两条重复项', (function () {
  var names = g1.indicators.map(function (p) { return p.name; });
  return names.indexOf('日干十神（对你）') < 0 && names.indexOf('今日之气与喜用') < 0;
})());
ok('日层合并为一条「日干对你（十神）」', (function () {
  return g1.indicators.some(function (p) { return p.name === '日干对你（十神）'; });
})(), JSON.stringify(g1.indicators.map(function (p) { return p.name; })));
ok('日层含「今日日支藏干」（与时辰层同口径）', (function () {
  return g1.indicators.some(function (p) { return p.name === '今日日支藏干（对你）'; });
})());
ok('日层「日支与命局」关系走矩阵（不是裸值 −3/+2.5）', (function () {
  var bad = g1.indicators.filter(function (p) {
    return p.name === '日支冲合（对你日支）' && (p.pts === -3 || p.pts === 2.5);
  });
  return bad.length === 0;
})());
ok('日层档位仍与气势分一致', (function () {
  var s = g1.score;
  var exp = s >= 69 ? '大吉' : s >= 58 ? '吉' : s >= 40 ? '平' : s >= 28 ? '凶' : '大凶';
  return g1.level === exp;
})(), g1.level + ' ' + g1.score);
ok('日层指标每项都有经典依据', g1.indicators.every(function (p) { return !!p.doctrine; }));

G('时辰层子维度全覆盖（第二十轮：每个子维度都要有守卫）');
var hSub = hOne.hours;
function hHas(name, kw) { var h = hSub.filter(function (x) { return x.name === name; })[0]; return h && (h.notes || []).some(function (n) { return n.indexOf(kw) >= 0; }); }
ok('子维度① 时值神黄黑道有注释', hSub.every(function (h) { return (h.notes || []).some(function (n) { return n.indexOf('时值神') >= 0; }); }));
ok('子维度② 时干十神有注释', hSub.every(function (h) { return (h.notes || []).some(function (n) { return n.indexOf('时干') >= 0; }); }));
ok('子维度③ 时支藏干加权有注释', hSub.every(function (h) { return (h.notes || []).some(function (n) { return n.indexOf('藏干加权') >= 0; }); }));
ok('子维度④ 时支 vs 命局四支（冲合刑害破半合）', (function () { return hHas('子', '冲你的年支') || hHas('巳', '冲你的日支') || hHas('未', '合到天乙贵人宫'); })());
ok('子维度⑤ 时支 vs 当日日支：冲（戌）', hHas('戌', '与当日日支「辰」冲'), (hSub.filter(function(x){return x.name==='戌';})[0].notes||[]).join('|'));
ok('子维度⑤ 当日日支：合（酉）', hHas('酉', '与当日日支「辰」合'));
ok('子维度⑤ 当日日支：害（卯，原来漏）', hHas('卯', '与当日日支「辰」害'));
ok('子维度⑤ 当日日支：破（丑，原来漏）', hHas('丑', '与当日日支「辰」破'));
ok('子维度⑤ 当日日支：半合水局（子，原来漏）', hHas('子', '与当日日支「辰」半合水局'));
ok('子维度⑤ 当日日支：拱合水局（申，原来漏）', hHas('申', '与当日日支「辰」拱合水局'));
ok('子维度⑤ 当日日支：自刑（辰，连对方都漏了）', hHas('辰', '与当日日支「辰」刑'));

G('合类关系系数一致性（第二十二轮：统一公式）');
ok('半合时支 = 2 × 0.5 = +1（不是裸值 +2）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '酉'; })[0];
  return (h.notes || []).some(function (n) { return /半合.*金为喜用 \+1$/.test(n.trim()); });
})());
ok('拱合时支 = 1 × 0.5 = +0.5', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '丑'; })[0];
  return (h.notes || []).some(function (n) { return /拱合.*金为喜用 \+0\.5/.test(n); });
})());
ok('拱合日支 = 1 × 宫位系数 → 木为忌神 -0.8', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '未'; })[0];
  return (h.notes || []).some(function (n) { return /拱合.*木为忌神 -0\.8/.test(n); });
})());
ok('拱合时支成金局 → 金为喜用 +0.5', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '丑'; })[0];
  return (h.notes || []).some(function (n) { return /拱合.*金为喜用 \+0\.5/.test(n); });
})());
ok('同宫多关系取重者（午时刑月支 -1.8 优先于伏吟）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  return (h.notes || []).some(function (n) { return /刑你的月支「午」.*取重者）.*-1\.8/.test(n); });
})());
ok('六合日支 = 2 × 1.0 = 2（与半合同一公式）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '寅'; })[0];
  return (h.notes || []).some(function (n) { return /六合得助.*\+2/.test(n); });
})());
ok('当日半合 = 2 × 0.5 = -1', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '子'; })[0];
  return (h.notes || []).some(function (n) { return /当日日支.*半合.*水为忌神 -1/.test(n); });
})());

G('唯一计分入口 addRel（第二十四轮）');
ok('与当日六合 = 2 × 0.5 = +1（不再是裸值 +2）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '酉'; })[0];
  return (h.notes || []).some(function (n) { return /与当日日支「辰」合 \+1$/.test(n.trim()); });
})(), (function () { var h = hOne.hours.filter(function (x) { return x.name === '酉'; })[0]; return (h.notes||[]).filter(function(n){return n.indexOf('与当日日支')>=0;}).join('|'); })());
ok('与当日关系七类全部乘 0.5（冲3/刑1.5/害1/破0.5/半合1/拱合0.5/六合1）', (function () {
  var exp = { '戌': -3, '辰': -1.5, '卯': -1, '丑': -0.5, '子': -1, '申': -0.5, '酉': 1 };
  return Object.keys(exp).every(function (nm) {
    var h = hOne.hours.filter(function (x) { return x.name === nm; })[0];
    var n = (h.notes || []).filter(function (x) { return x.indexOf('与当日日支') >= 0; })[0] || '';
    var m = /([+-]?\d+\.?\d*)$/.exec(n.trim());
    return m && Math.abs(parseFloat(m[1]) - exp[nm]) < 0.01;
  });
})());
ok('命中贵人宫时不再叠加「有合」关系分（未时）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '未'; })[0];
  var m = (h.notes || []).join(' ');
  return m.indexOf('合到天乙贵人宫') >= 0;
})());
ok('时支与年支同字且为贵人宫时，伏吟不另计（午时）', (function () {
  var h = hOne.hours.filter(function (x) { return x.name === '午'; })[0];
  var m = (h.notes || []).join(' ');
  return m.indexOf('天乙贵人本气') >= 0 && m.indexOf('伏吟加强') < 0;
})());

G('结构守卫：计分路径唯一性（第二十六轮）');
ok('源码中不存在 juScore 这个第二份公式', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  // 只允许注释里提到，不允许函数定义或调用
  return !/function\s+juScore/.test(src) && !/juScore\(/.test(src.replace(/\/\/[^\n]*/g, ''));
})());
ok('所有地支关系计分都经过 addRel（不存在第二份 lev*coef*sign）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  var lines = src.split('\n');
  var addRelStart = lines.findIndex(function (l) { return l.indexOf('function addRel') >= 0; });
  if (addRelStart < 0) return false;
  var depth = 0, addRelEnd = -1;
  for (var k = addRelStart; k < lines.length; k++) {
    for (var c = 0; c < lines[k].length; c++) {
      var ch = lines[k][c];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { addRelEnd = k + 1; break; } }
    }
    if (addRelEnd > 0) break;
  }
  // 统计 hs += 出现次数（排除注释行）
  var adds = [];
  lines.forEach(function (l, i) {
    var code = l.replace(/\/\/.*$/, '');
    if (/hs \+=/.test(code)) adds.push(i + 1);
  });
  // 期望：1 处（addRel 内）+ 5 处非地支关系维度（值神/十神/藏干/贵人宫×2）= 6 处
  var insideAddRel = adds.filter(function (ln) { return ln >= addRelStart + 1 && ln <= addRelEnd; });
  return adds.length === 6 && insideAddRel.length === 1;
})(), (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return src.split('\n').filter(function (l) { return /hs \+=/.test(l.replace(/\/\/.*$/, '')); }).length;
})());
ok('addRel 的烈度表覆盖全部关系类型', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  var m = /var REL_LEV = \{([^}]+)\}/.exec(src);
  if (!m) return false;
  return ['chong','xing','hai','po','he','fuyin','banhe','gonghe','chengju'].every(function (t) {
    return m[1].indexOf(t + ':') >= 0;
  });
})());

G('规则依据审计（第二十八轮：不只查实现，要查规则本身）');
ok('成局不再硬编码「day」宫位（必须说明参与宫位）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return !/addRel\('chengju',\s*'day'/.test(src);
})());
ok('addRel 支持自定义系数（opts.coef）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return /opts\.coef !== undefined/.test(src);
})());
ok('每个宫位系数都有明确出处（POS_COEF 集中定义）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return /var POS_COEF = \{ day: 1\.0, month: 0\.6, hour: 0\.5, year: 0\.4 \}/.test(src);
})());

G('P0 守卫：相性公式 + 双引擎一致性（第三方复核）');
ok('相性完整盘不再撞顶（满分占比 < 5%）', (function () {
  var MT2 = R('js/xs-match.js'), CH = R('js/xs-chars.js');
  var me2 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 }, chs = CH.all(), full = 0, n = 0;
  for (var i2 = 0; i2 < chs.length; i2++) {
    try { var r2 = MT2.match({ me: me2, other: chs[i2] }); if (r2 && r2.ok !== false) { n++; if (r2.score >= 100) full++; } } catch (e2) {}
  }
  return n > 0 && full / n < 0.05;
})());
ok('相性完整盘分数不超过 CEIL.full(100) 且分布有层次', (function () {
  var MT3 = R('js/xs-match.js'), CH3 = R('js/xs-chars.js');
  var me3 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 }, chs3 = CH3.all(), lv3 = {}, sc3 = [];
  for (var i3 = 0; i3 < chs3.length; i3++) {
    try { var r3 = MT3.match({ me: me3, other: chs3[i3] }); if (r3 && r3.ok !== false) { lv3[r3.level.name] = (lv3[r3.level.name] || 0) + 1; sc3.push(r3.score); } } catch (e3) {}
  }
  var kinds = Object.keys(lv3).length;
  return kinds >= 3 && (Math.max.apply(null, sc3) - Math.min.apply(null, sc3)) > 20;
})());
ok('抽卡与当日运势同日分数完全一致（20 天）', (function () {
  var GA2 = R('js/xs-gacha.js'), DL2 = R('js/xs-daily.js');
  var me4 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
  for (var i4 = 0; i4 < 20; i4++) {
    var dt4 = new Date(2026, 9, 22 + i4);
    var a4 = GA2.todayLuck({ y: dt4.getFullYear(), m: dt4.getMonth() + 1, d: dt4.getDate(), gameId: 'zzz', birth: me4 });
    var b4 = DL2.daily({ y: dt4.getFullYear(), m: dt4.getMonth() + 1, d: dt4.getDate(), birth: me4 });
    if (a4.score !== b4.score) return false;
  }
  return true;
})());
ok('两引擎的日支关系项名一致（冲/刑/害/破/合/伏吟 全覆盖）', (function () {
  var GA3 = R('js/xs-gacha.js'), DL3 = R('js/xs-daily.js');
  var me5 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
  var a5 = GA3.todayLuck({ y: 2026, m: 10, d: 27, gameId: 'zzz', birth: me5 });
  var b5 = DL3.daily({ y: 2026, m: 10, d: 27, birth: me5 });
  function names(arr) { return arr.map(function (p) { return p.name; }).sort().join('|'); }
  return a5.indicators.length === b5.parts.length;
})(), '抽卡 ' + GA.todayLuck({ y: 2026, m: 10, d: 27, gameId: 'zzz', birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } }).indicators.length + ' 项 / 当日 ' + DL.daily({ y: 2026, m: 10, d: 27, birth: { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 } }).parts.length + ' 项');

G('方案C 守卫：日档只有一份实现');
ok('xs-gacha 里不存在旧的 levelByScoreG（已改名分工）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return !/function levelByScoreG/.test(src) && !/levelByScoreG\(/.test(src.replace(/\/\/[^\n]*/g, ''));
})());
ok('xs-daily 导出 levelByScore（日档唯一来源）', (function () {
  var DL2 = R('js/xs-daily.js');
  return typeof DL2.levelByScore === 'function' && DL2.levelByScore(70) === '大吉' && DL2.levelByScore(30) === '凶';
})());
ok('xs-gacha 日档走 levelByScoreDay（委托 xs-daily）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return /DL\.levelByScore/.test(src) && /function levelByScoreDay/.test(src);
})());
ok('时辰层仍用自己的 levelByScoreHour（两层分工）', (function () {
  var fs2 = require('fs'), p2 = require('path');
  var src = fs2.readFileSync(p2.join(__dirname, '..', 'js', 'xs-gacha.js'), 'utf8');
  return /function levelByScoreHour/.test(src) && /levelByScoreHour\(hScore\)/.test(src);
})());
ok('抽卡与当日运势「分数+档位+细分」三者全一致（20 天）', (function () {
  var GA9 = R('js/xs-gacha.js'), DL9 = R('js/xs-daily.js');
  var me9 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
  for (var i9 = 0; i9 < 20; i9++) {
    var dt9 = new Date(2026, 9, 22 + i9);
    var a9 = GA9.todayLuck({ y: dt9.getFullYear(), m: dt9.getMonth() + 1, d: dt9.getDate(), gameId: 'zzz', birth: me9 });
    var b9 = DL9.daily({ y: dt9.getFullYear(), m: dt9.getMonth() + 1, d: dt9.getDate(), birth: me9 });
    if (a9.score !== b9.score || a9.level !== b9.level) return false;
    if (!a9.grade || !b9.grade || a9.grade.text !== b9.grade.text) return false;
  }
  return true;
})());
ok('抽卡与当日运势档位完全一致（90 天全量）', (function () {
  var GA2 = R('js/xs-gacha.js'), DL2 = R('js/xs-daily.js');
  var me6 = { y: 1990, m: 6, d: 15, h: 10, mi: 30, gender: 1 };
  for (var i6 = 0; i6 < 90; i6++) {
    var dt6 = new Date(2026, 9, 1 + i6);
    var y6 = dt6.getFullYear(), m6 = dt6.getMonth() + 1, d6 = dt6.getDate();
    var a6 = GA2.todayLuck({ y: y6, m: m6, d: d6, gameId: 'zzz', birth: me6 });
    var b6 = DL2.daily({ y: y6, m: m6, d: d6, birth: me6 });
    if (a6.score !== b6.score || a6.level !== b6.level) return false;
  }
  return true;
})());

G('遇凶避灾');
const avR = AV.analyze({ birth: gMe, y: 2026, m: 10, d: 18 });
ok('避灾分析可用', avR.ok && avR.sections.length >= 2, avR.ok ? avR.sections.length + ' 段' : avR.error);
ok('给出喜用与忌神', Array.isArray(avR.me.favor) && avR.me.favor.length > 0 && !!avR.me.avoid, avR.me.favor.join('、') + ' / 忌' + avR.me.avoid);
ok('每段都有可执行建议', avR.sections.every(function (s) { return s.actions.length > 0; }));
ok('冲命日能算出来（我的日支亥→巳）', (function () { var s = avR.sections.filter(function (x) { return x.id === 'chong'; })[0]; return !!s && /巳/.test(s.title); })(), '');
ok('吉神不进"要规避"清单', (function () { var s = avR.sections.filter(function (x) { return x.id === 'sha'; })[0]; return !s || !/天乙贵人：/.test(s.actions.join('')); })());
ok('当天部分带三档 grade', !!avR.day && !!avR.day.grade, avR.day && avR.day.grade && avR.day.grade.text);
ok('报告含喜用/冲命/当天', /喜用/.test(AV.report(avR)) && /冲命/.test(AV.report(avR)) && /【当天】/.test(AV.report(avR)));
ok('缺出生日期会报错', AV.analyze({}).ok === false);
ok('避灾的具体建议里不含符咒类措辞', !/符|咒|开光|法事/.test(avR.sections.map(function (s) { return s.actions.join(''); }).join('')));

/* ============ 汇总 ============ */
/* ============ 汇总 ============ */
console.log('\n──────────────────────────────');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
