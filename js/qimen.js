/*
 * qimen.js — 时家奇门 · 转盘 · 拆补法 排盘
 * 流程：节气定阴阳遁 → 日柱符头定上中下元 → 局数布地盘三奇六仪
 *       → 时柱旬首定值符/值使 → 值符随时干转天盘 → 值使按时辰步数行门 → 八神随值符。
 */
(function (root) {
  'use strict';
  var Cal = (typeof module !== 'undefined' && module.exports) ? require('./calendar.js') : root.QimenCalendar;
  var STEMS = Cal.STEMS, BRANCHES = Cal.BRANCHES, mod = Cal.mod;

  // 拆补法局数表：[上元, 中元, 下元]
  var JU = {
    冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 惊蛰: [1, 7, 4],
    春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9],
    夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6],
    秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1]
  };
  var YUAN = ['上元', '中元', '下元'];
  var YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙']; // 六仪 + 三奇（逆序）
  var XUN_NAMES = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];

  var PALACE = {
    1: { name: '坎', dir: '北', elem: '水', branches: ['子'] },
    2: { name: '坤', dir: '西南', elem: '土', branches: ['未', '申'] },
    3: { name: '震', dir: '东', elem: '木', branches: ['卯'] },
    4: { name: '巽', dir: '东南', elem: '木', branches: ['辰', '巳'] },
    5: { name: '中', dir: '中', elem: '土', branches: [] },
    6: { name: '乾', dir: '西北', elem: '金', branches: ['戌', '亥'] },
    7: { name: '兑', dir: '西', elem: '金', branches: ['酉'] },
    8: { name: '艮', dir: '东北', elem: '土', branches: ['丑', '寅'] },
    9: { name: '离', dir: '南', elem: '火', branches: ['午'] }
  };
  var STAR_HOME = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  var DOOR_HOME = { 1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门' };
  var RING = [1, 8, 3, 4, 9, 2, 7, 6]; // 外八宫顺时针（坎→艮→震→巽→离→坤→兑→乾）
  var GODS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  var STAR_ELEM = { 天蓬: '水', 天芮: '土', 天冲: '木', 天辅: '木', 天禽: '土', 天心: '金', 天柱: '金', 天任: '土', 天英: '火' };
  var DOOR_ELEM = { 休门: '水', 死门: '土', 伤门: '木', 杜门: '木', 开门: '金', 惊门: '金', 生门: '土', 景门: '火' };
  var JI_XING = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };          // 六仪击刑
  var RU_MU = { 乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 6, 庚: 8, 辛: 4, 壬: 4, 癸: 2 }; // 十干入墓

  var GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // 生
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };    // 克
  function relation(a, b) { // a 对 b
    if (a === b) return '比和';
    if (GEN[a] === b) return '生';
    if (KE[a] === b) return '克';
    if (GEN[b] === a) return '被生';
    return '被克';
  }
  var BRANCH_ELEM = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  /** 五行在当令月份中的旺相休囚死 */
  function seasonState(elem, monthBranch) {
    var s = BRANCH_ELEM[monthBranch];
    if (s === elem) return '旺';
    if (GEN[s] === elem) return '相';
    if (GEN[elem] === s) return '休';
    if (KE[elem] === s) return '囚';
    return '死';
  }

  function palaceOfBranch(b) {
    for (var p = 1; p <= 9; p++) if (PALACE[p].branches.indexOf(b) >= 0) return p;
    return 0;
  }

  /**
   * 起盘
   * @param local {y,m,d,h,mi}
   * @param tz 时区小时数
   */
  function cast(local, tz) {
    var info = Cal.pillars(local, tz);
    var k = info.term.index;
    var yang = (k >= 18 || k <= 5); // 冬至…芒种 阳遁
    var yuan = Math.floor((info.day.idx % 15) / 5); // 符头 子午卯酉=上 寅申巳亥=中 辰戌丑未=下
    var ju = JU[info.term.name][yuan];

    // 地盘
    var earth = {};
    for (var i = 0; i < 9; i++) {
      var p = yang ? mod(ju - 1 + i, 9) + 1 : mod(ju - 1 - i, 9) + 1;
      earth[p] = YI[i];
    }
    function earthPalaceOf(stem) { for (var q = 1; q <= 9; q++) if (earth[q] === stem) return q; return 0; }

    // 旬首、值符、值使
    var hIdx = info.hour.idx;
    var xun = Math.floor(hIdx / 10);
    var xunYi = YI[xun];
    var P = earthPalaceOf(xunYi);
    var Ph = P === 5 ? 2 : P; // 中五寄坤二
    var zhiFuStar = STAR_HOME[P];
    var zhiShiDoor = DOOR_HOME[Ph];

    var hourStem = info.hour.stem;
    var hourStemEff = hourStem === '甲' ? xunYi : hourStem;
    var T = earthPalaceOf(hourStemEff); if (T === 5) T = 2;

    var palaces = {};
    for (var q = 1; q <= 9; q++) {
      palaces[q] = { n: q, name: PALACE[q].name, dir: PALACE[q].dir, elem: PALACE[q].elem, branches: PALACE[q].branches,
        earthStem: earth[q], stars: [], heavenStems: [], door: null, god: null, marks: [] };
    }

    // 天盘：九星连同其本宫地盘干一起转
    var sOff = mod(RING.indexOf(T) - RING.indexOf(Ph), 8);
    for (i = 0; i < 8; i++) {
      var home = RING[i], to = RING[(i + sOff) % 8];
      palaces[to].stars.push(STAR_HOME[home]);
      palaces[to].heavenStems.push(earth[home]);
      if (home === 2) { palaces[to].stars.push('天禽'); palaces[to].heavenStems.push(earth[5]); }
    }

    // 人盘：值使按时辰距旬首步数沿九宫飞，阳顺阴逆
    var steps = hIdx % 10;
    var D = yang ? mod(P - 1 + steps, 9) + 1 : mod(P - 1 - steps, 9) + 1;
    if (D === 5) D = 2;
    var dOff = mod(RING.indexOf(D) - RING.indexOf(Ph), 8);
    for (i = 0; i < 8; i++) palaces[RING[(i + dOff) % 8]].door = DOOR_HOME[RING[i]];

    // 神盘：值符神随值符星，阳顺阴逆
    var tPos = RING.indexOf(T);
    for (i = 0; i < 8; i++) {
      var gp = yang ? RING[(tPos + i) % 8] : RING[mod(tPos - i, 8)];
      palaces[gp].god = GODS[i];
    }

    // 空亡（时旬）、驿马（时支）
    var b0 = (xun * 10) % 12;
    var voidBranches = [BRANCHES[(b0 + 10) % 12], BRANCHES[(b0 + 11) % 12]];
    var horseBranch = BRANCHES[[2, 11, 8, 5][info.hour.idx % 12 % 4]]; // 申子辰马在寅 / 巳酉丑在亥 / 寅午戌在申 / 亥卯未在巳
    var horsePalace = palaceOfBranch(horseBranch);

    for (q = 1; q <= 9; q++) {
      var pal = palaces[q];
      if (q === 5) continue;
      var vb = pal.branches.filter(function (b) { return voidBranches.indexOf(b) >= 0; });
      if (vb.length) { pal.isVoid = true; pal.voidBranches = vb; pal.marks.push('空'); }
      if (q === horsePalace) { pal.isHorse = true; pal.marks.push('马'); }
      if (pal.door && KE[DOOR_ELEM[pal.door]] === pal.elem) { pal.menPo = true; pal.marks.push('迫'); }
      pal.jiXing = pal.heavenStems.filter(function (s) { return JI_XING[s] === q; });
      if (pal.jiXing.length) pal.marks.push('刑');
      pal.ruMu = pal.heavenStems.filter(function (s) { return RU_MU[s] === q; });
      if (pal.ruMu.length) pal.marks.push('墓');
    }

    function heavenPalaceOf(stem) {
      for (var r = 0; r < 8; r++) if (palaces[RING[r]].heavenStems.indexOf(stem) >= 0) return RING[r];
      return 0;
    }
    function doorPalaceOf(door) {
      for (var r = 0; r < 8; r++) if (palaces[RING[r]].door === door) return RING[r];
      return 0;
    }
    var dayXunYi = YI[Math.floor(info.day.idx / 10)];
    var dayStemEff = info.day.stem === '甲' ? dayXunYi : info.day.stem;

    return {
      info: info, tz: tz, local: local,
      yang: yang, dun: yang ? '阳遁' : '阴遁', ju: ju, yuan: YUAN[yuan],
      xun: XUN_NAMES[xun], xunYi: xunYi,
      zhiFuStar: zhiFuStar, zhiShiDoor: zhiShiDoor, zhiFuPalace: T, zhiShiPalace: D,
      hourStemEff: hourStemEff, dayStemEff: dayStemEff,
      voidBranches: voidBranches, horseBranch: horseBranch, horsePalace: horsePalace,
      fuYin: sOff === 0, fanYin: sOff === 4,
      palaces: palaces,
      heavenPalaceOf: heavenPalaceOf, doorPalaceOf: doorPalaceOf,
      dayPalace: heavenPalaceOf(dayStemEff), hourPalace: heavenPalaceOf(hourStemEff)
    };
  }

  var api = {
    cast: cast, PALACE: PALACE, RING: RING, GODS: GODS, STAR_ELEM: STAR_ELEM, DOOR_ELEM: DOOR_ELEM,
    relation: relation, seasonState: seasonState, palaceOfBranch: palaceOfBranch, GEN: GEN, KE: KE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Qimen = api;
})(this);
