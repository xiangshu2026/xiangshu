// 象数工坊 · 中式术数排盘（纯前端离线）
// https://github.com/xiangshu2026/xiangshu
/*!
 * xs-chars.js —— 内置角色名单（二次元相性 · 仅女性角色）
 *
 * 【数据来源】属性与生日取自游戏官方设定，2026-10 经萌娘百科逐条核对。
 * 【五行换算】按八卦类象的「本软件约定」，用于相性计算，非官方设定：
 *   风/雷/草/电→木（巽为风、震为雷）；冰/水/暗/烈霜/玄墨→水（寒凝、坎为黑）；
 *   火/光/流明→火（离为明）；岩/土/以太/虚数/盾→土（艮为山、虚空承载）；
 *   物理/金/凛刃→金（刚刃之象）；量子→水（微观流动之象）。
 *   以太、物理、玄墨、凛刃、流明、烈霜、量子、虚数均属本软件约定，无传统定论。
 * 【改数据】直接改下面的 GROUPS 即可；也可以不选名单，自己手填角色。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.XS = root.XS || {}; root.XS.Chars = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var ELEMENT_WX = { 风:'木', 雷:'木', 草:'木', 电:'木',
                     冰:'水', 水:'水', 暗:'水', 烈霜:'水', 玄墨:'水', 量子:'水',
                     火:'火', 光:'火', 流明:'火',
                     岩:'土', 土:'土', 以太:'土', 虚数:'土', 盾:'土',
                     物理:'金', 金:'金', 凛刃:'金' };
  var GROUPS = [{"id":"zzz","name":"绝区零","chars":[{"name":"11号","attr":"火","wx":"火","monthday":{"m":3,"d":21},"spec":"强攻"},{"name":"艾莲·乔","attr":"冰","wx":"水","monthday":{"m":1,"d":4},"spec":"强攻"},{"name":"爱丽丝·泰姆菲尔德","attr":"物理","wx":"金","monthday":{"m":8,"d":30},"spec":"异常"},{"name":"爱芮","attr":"以太","wx":"土","monthday":{"m":6,"d":7},"spec":"异常"},{"name":"安比·德玛拉","attr":"电","wx":"木","monthday":{"m":2,"d":20},"spec":"击破"},{"name":"奥菲丝·马格努森","attr":"火","wx":"火","monthday":{"m":11,"d":3},"spec":"强攻"},{"name":"柏妮思·怀特","attr":"火","wx":"火","monthday":{"m":5,"d":23},"spec":"异常"},{"name":"波可娜·费雷尼","attr":"物理","wx":"金","monthday":{"m":6,"d":19},"spec":"击破"},{"name":"苍角","attr":"冰","wx":"水","monthday":{"m":1,"d":23},"spec":"支援"},{"name":"菲欧妮·蕾法爱菈","attr":"火","wx":"火","monthday":null,"spec":"异常"},{"name":"浮波柚叶","attr":"物理","wx":"金","monthday":{"m":11,"d":2},"spec":"支援"},{"name":"格莉丝·霍华德","attr":"电","wx":"木","monthday":{"m":4,"d":14},"spec":"异常"},{"name":"简·杜","attr":"物理","wx":"金","monthday":{"m":2,"d":16},"spec":"异常"},{"name":"橘福福","attr":"火","wx":"火","monthday":{"m":1,"d":6},"spec":"击破"},{"name":"凯撒·金","attr":"物理","wx":"金","monthday":{"m":3,"d":16},"spec":"防护"},{"name":"可琳·威克斯","attr":"物理","wx":"金","monthday":{"m":6,"d":2},"spec":"强攻"},{"name":"克拉蕾·弗林特","attr":"电","wx":"木","monthday":{"m":7,"d":23},"spec":"锋御"},{"name":"蕾米埃尔·丹","attr":"流明","wx":"火","monthday":{"m":3,"d":14},"spec":"异常"},{"name":"琉音","attr":"物理","wx":"金","monthday":{"m":5,"d":28},"spec":"击破"},{"name":"卢西娅·艾洛温","attr":"以太","wx":"土","monthday":{"m":3,"d":17},"spec":"支援"},{"name":"洛克茜·伊芙莉塔·普莱斯","attr":"风","wx":"木","monthday":{"m":12,"d":29},"spec":"击破"},{"name":"猫宫又奈","attr":"物理","wx":"金","monthday":{"m":7,"d":30},"spec":"强攻"},{"name":"南宫羽","attr":"以太","wx":"土","monthday":{"m":9,"d":29},"spec":"击破"},{"name":"妮可·德玛拉","attr":"以太","wx":"土","monthday":{"m":11,"d":11},"spec":"支援"},{"name":"诺姆·霍洛维尔","attr":"火","wx":"火","monthday":{"m":7,"d":26},"spec":"击破"},{"name":"派派·韦尔","attr":"物理","wx":"金","monthday":{"m":10,"d":21},"spec":"异常"},{"name":"普罗米娅","attr":"冰","wx":"水","monthday":{"m":12,"d":23},"spec":"异常"},{"name":"青衣","attr":"电","wx":"木","monthday":{"m":1,"d":1},"spec":"击破"},{"name":"薇薇安·班希","attr":"以太","wx":"土","monthday":{"m":4,"d":10},"spec":"异常"},{"name":"维琳娜·艾嘉德","attr":"风","wx":"木","monthday":{"m":9,"d":22},"spec":"异常"},{"name":"希希芙","attr":"电","wx":"木","monthday":{"m":1,"d":10},"spec":"强攻"},{"name":"席德","attr":"电","wx":"木","monthday":{"m":11,"d":22},"spec":"强攻"},{"name":"亚历山德丽娜·莎芭丝缇安","attr":"电","wx":"木","monthday":{"m":9,"d":23},"spec":"支援"},{"name":"耀嘉音","attr":"以太","wx":"土","monthday":{"m":1,"d":31},"spec":"支援"},{"name":"叶瞬光","attr":"凛刃","wx":"金","monthday":{"m":1,"d":20},"spec":"强攻"},{"name":"伊德海莉·墨菲","attr":"冰","wx":"水","monthday":{"m":3,"d":19},"spec":"命破"},{"name":"伊芙琳·舒瓦利耶","attr":"火","wx":"火","monthday":{"m":10,"d":7},"spec":"强攻"},{"name":"仪玄","attr":"玄墨","wx":"水","monthday":{"m":12,"d":3},"spec":"命破"},{"name":"月城柳","attr":"电","wx":"木","monthday":{"m":9,"d":21},"spec":"异常"},{"name":"照","attr":"冰","wx":"水","monthday":{"m":10,"d":14},"spec":"防护"},{"name":"朱鸢","attr":"以太","wx":"土","monthday":{"m":9,"d":1},"spec":"强攻"}]},{"id":"genshin","name":"原神","chars":[{"name":"雷电将军","attr":"雷","wx":"木","monthday":{"m":6,"d":26}},{"name":"甘雨","attr":"冰","wx":"水","monthday":{"m":12,"d":2}},{"name":"胡桃","attr":"火","wx":"火","monthday":{"m":7,"d":15}},{"name":"纳西妲","attr":"草","wx":"木","monthday":{"m":10,"d":27}},{"name":"芙宁娜","attr":"水","wx":"水","monthday":{"m":10,"d":13}},{"name":"八重神子","attr":"雷","wx":"木","monthday":{"m":6,"d":27}},{"name":"神里绫华","attr":"冰","wx":"水","monthday":{"m":9,"d":28}},{"name":"宵宫","attr":"火","wx":"火","monthday":{"m":6,"d":21}},{"name":"莫娜","attr":"水","wx":"水","monthday":{"m":8,"d":31}},{"name":"刻晴","attr":"雷","wx":"木","monthday":{"m":11,"d":20}},{"name":"夜兰","attr":"水","wx":"水","monthday":{"m":4,"d":20}},{"name":"可莉","attr":"火","wx":"火","monthday":{"m":7,"d":27}}]},{"id":"hsr","name":"崩坏：星穹铁道","chars":[{"name":"花火","attr":"量子","wx":"水","monthday":{"m":10,"d":13}},{"name":"流萤","attr":"火","wx":"火","monthday":{"m":6,"d":22}},{"name":"黄泉","attr":"雷","wx":"木","monthday":{"m":7,"d":3}},{"name":"布洛妮娅","attr":"风","wx":"木","monthday":{"m":7,"d":2}},{"name":"镜流","attr":"冰","wx":"水","monthday":{"m":1,"d":4}},{"name":"银狼","attr":"量子","wx":"水","monthday":{"m":2,"d":15}},{"name":"三月七","attr":"冰","wx":"水","monthday":{"m":3,"d":24}},{"name":"知更鸟","attr":"物理","wx":"金","monthday":{"m":3,"d":3}},{"name":"阮·梅","attr":"冰","wx":"水","monthday":{"m":5,"d":2}},{"name":"希儿","attr":"量子","wx":"水","monthday":{"m":12,"d":2}}]},{"id":"fgo","name":"FGO","chars":[{"name":"玛修·基列莱特","attr":"盾","wx":"土","monthday":null},{"name":"阿尔托莉雅·潘德拉贡","attr":"光","wx":"火","monthday":null},{"name":"斯卡蒂（FGO）","attr":"冰","wx":"水","monthday":null},{"name":"伊什塔尔","attr":"火","wx":"火","monthday":null},{"name":"美杜莎","attr":"岩","wx":"土","monthday":null},{"name":"贞德","attr":"光","wx":"火","monthday":null},{"name":"玉藻前","attr":"火","wx":"火","monthday":null},{"name":"茨木童子","attr":"暗","wx":"水","monthday":null}]},{"id":"arknights","name":"明日方舟","chars":[{"name":"阿米娅","attr":"暗","wx":"水","monthday":{"m":12,"d":23}},{"name":"能天使","attr":"光","wx":"火","monthday":{"m":7,"d":20}},{"name":"银灰","attr":"风","wx":"木","monthday":{"m":2,"d":2}},{"name":"陈","attr":"雷","wx":"木","monthday":{"m":7,"d":7}},{"name":"星熊","attr":"岩","wx":"土","monthday":{"m":4,"d":4}},{"name":"夜莺","attr":"光","wx":"火","monthday":{"m":10,"d":9}},{"name":"艾雅法拉","attr":"火","wx":"火","monthday":{"m":7,"d":18}},{"name":"斯卡蒂（方舟）","attr":"水","wx":"水","monthday":{"m":8,"d":2}}]}];

  function all() {
    var out = [];
    GROUPS.forEach(function (g) {
      g.chars.forEach(function (c) { out.push({ name: c.name, game: g.name, gameId: g.id, attr: c.attr, wx: c.wx, monthday: c.monthday, spec: c.spec || null }); });
    });
    return out;
  }
  function find(name) {
    var list = all();
    for (var i = 0; i < list.length; i++) { if (list[i].name === name) return list[i]; }
    return null;
  }
  return { GROUPS: GROUPS, ELEMENT_WX: ELEMENT_WX, all: all, find: find };
});
