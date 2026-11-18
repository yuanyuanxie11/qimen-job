/*
 * calendar.js — 节气与干支历法（无依赖）
 * 太阳视黄经采用截断 VSOP87 + 章动 + 光行差（Meeus《天文算法》），节气时刻误差通常在 1 分钟内。
 */
(function (root) {
  'use strict';

  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  // 以黄经 0°（春分）为起点，每 15° 一个节气
  var TERMS = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
    '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];
  var D2R = Math.PI / 180;

  function mod(a, n) { return ((a % n) + n) % n; }
  function norm360(x) { return mod(x, 360); }

  // ΔT（秒），NASA 2005–2050 多项式，范围外误差也只有几十秒，对节气足够
  function deltaT(year) { var t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }

  function jdFromMs(ms) { return ms / 86400000 + 2440587.5; }
  function msFromJd(jd) { return (jd - 2440587.5) * 86400000; }

  // VSOP87 地球日心黄经截断项（Meeus 附录 III），[A, B, C]：A·cos(B + C·τ)
  var VSOP_L = [
    [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],[3497,2.7441,5753.3849],[3418,2.8289,3.5231],
     [3136,3.6277,77713.7715],[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],[1273,2.0371,529.691],
     [1199,1.1096,1577.3435],[990,5.233,5884.927],[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],
     [753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],[357,2.92,0.067],[317,5.849,11790.629],
     [284,1.899,796.298],[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],[205,1.869,5573.143],
     [202,2.458,6069.777],[156,0.833,213.299],[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],
     [103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],[99,6.21,2146.17],[98,0.68,155.42],
     [86,5.98,161000.69],[85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],[79,3.04,12036.46],
     [75,1.76,5088.63],[74,3.5,3154.69],[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],
     [61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],[56,3.47,6279.55],[52,0.19,12139.55],
     [52,1.33,1748.02],[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],[41,2.4,19651.05],
     [39,6.17,10447.39],[37,6.04,10213.29],[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],
     [33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]],
    [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],[425,1.59,3.523],[119,5.796,26.298],
     [109,2.966,1577.344],[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],[67,4.41,5507.55],
     [59,2.89,5223.69],[56,2.17,155.42],[45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],[21,5.34,0.98],
     [19,1.85,5486.78],[19,4.97,213.3],[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],[15,1.21,10977.08],
     [12,2.83,1748.02],[12,3.26,5088.63],[12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],[10,1.3,6286.6],
     [10,4.24,1349.87],[9,2.7,242.73],[9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]],
    [[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],[27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],
     [10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],
     [3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],
     [2,4.38,5223.69],[2,3.75,0.98]],
    [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],[3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]],
    [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]],
    [[1,3.14,0]]
  ];

  /** 太阳视黄经（度），输入为 UT 儒略日。精度约 1 角秒量级（节气时刻误差 < 1 分钟） */
  function sunLongitude(jdUT) {
    var year = 2000 + (jdUT - 2451545) / 365.25;
    var jde = jdUT + deltaT(year) / 86400;
    var tau = (jde - 2451545) / 365250, T = tau * 10;
    var L = 0, tp = 1;
    for (var n = 0; n < VSOP_L.length; n++) {
      var s = 0, terms = VSOP_L[n];
      for (var i = 0; i < terms.length; i++) s += terms[i][0] * Math.cos(terms[i][1] + terms[i][2] * tau);
      L += s * tp; tp *= tau;
    }
    var lon = L / 1e8 / D2R + 180;                       // 地心太阳几何黄经
    lon -= 0.09033 / 3600;                               // FK5 修正
    var om = (125.04452 - 1934.136261 * T) * D2R;
    var Ls = (280.4665 + 36000.7698 * T) * D2R, Lm = (218.3165 + 481267.8813 * T) * D2R;
    var dpsi = -17.2 * Math.sin(om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om);
    lon += dpsi / 3600 - 20.4898 / 3600;                 // 章动 + 光行差
    return norm360(lon);
  }

  /** 求太阳到达某黄经的时刻（UT 儒略日） */
  function solveLongitude(target, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 30; i++) {
      var d = mod(target - sunLongitude(jd) + 180, 360) - 180;
      jd += d * 365.2422 / 360;
      if (Math.abs(d) < 1e-7) break;
    }
    return jd;
  }

  /** 当前所处节气及其起止时刻 */
  function termAt(jdUT) {
    var lon = sunLongitude(jdUT);
    var k = Math.floor(lon / 15);
    var start = solveLongitude(k * 15, jdUT - (lon - k * 15) * 365.2422 / 360);
    if (start > jdUT) { // 边界处数值抖动时回退一个节气
      k = mod(k - 1, 24);
      start = solveLongitude(k * 15, start - 15.2);
    }
    var next = solveLongitude(mod(k + 1, 24) * 15, start + 15.2);
    return { index: k, name: TERMS[k], startJD: start, nextIndex: mod(k + 1, 24), nextName: TERMS[mod(k + 1, 24)], nextJD: next, lon: lon };
  }

  function gzIndex(s, b) {
    for (var i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
    return -1;
  }
  function gz(idx) {
    return { idx: idx, stem: STEMS[idx % 10], branch: BRANCHES[idx % 12], name: STEMS[idx % 10] + BRANCHES[idx % 12] };
  }

  /** 某公历日期（按当地日期）的日干支序号；1949-10-01 为甲子日 */
  function dayIndexOfDate(y, m, d) {
    var jdn = Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588;
    return mod(jdn + 49, 60);
  }

  /**
   * 四柱
   * @param local {y,m,d,h,mi} 当地钟面时间
   * @param tz    时区（小时，如北京 8）
   * 23:00 起换日（子初换日），年以立春、月以节为界。
   */
  function pillars(local, tz) {
    var ms = Date.UTC(local.y, local.m - 1, local.d, local.h, local.mi) - tz * 3600000;
    var jd = jdFromMs(ms);
    var lon = sunLongitude(jd);

    // 月：立春 315° 起寅月
    var monthIdx = Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅
    var yearNum = local.y;
    if (local.m <= 2 && monthIdx >= 10) yearNum -= 1; // 立春前仍属上一年
    var yIdx = mod(yearNum - 4, 60);
    var yStem = yIdx % 10;
    var mStem = mod((yStem % 5) * 2 + 2 + monthIdx, 10);
    var mIdx = gzIndex(mStem, mod(monthIdx + 2, 12));

    var dIdx = dayIndexOfDate(local.y, local.m, local.d);
    if (local.h >= 23) dIdx = mod(dIdx + 1, 60);

    var hBranch = Math.floor((local.h + 1) / 2) % 12;
    var hStem = mod((dIdx % 10 % 5) * 2 + hBranch, 10);
    var hIdx = gzIndex(hStem, hBranch);

    return {
      ms: ms, jd: jd, lon: lon,
      year: gz(yIdx), month: gz(mIdx), day: gz(dIdx), hour: gz(hIdx),
      term: termAt(jd)
    };
  }

  /** 把 UT 儒略日格式化为某时区的 "YYYY-MM-DD HH:mm" */
  function formatJd(jd, tz) {
    var dt = new Date(msFromJd(jd) + tz * 3600000);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return dt.getUTCFullYear() + '-' + p(dt.getUTCMonth() + 1) + '-' + p(dt.getUTCDate()) + ' ' +
      p(dt.getUTCHours()) + ':' + p(dt.getUTCMinutes());
  }

  var api = {
    STEMS: STEMS, BRANCHES: BRANCHES, TERMS: TERMS,
    mod: mod, gz: gz, gzIndex: gzIndex,
    sunLongitude: sunLongitude, solveLongitude: solveLongitude, termAt: termAt,
    dayIndexOfDate: dayIndexOfDate, pillars: pillars,
    jdFromMs: jdFromMs, msFromJd: msFromJd, formatJd: formatJd
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QimenCalendar = api;
})(this);
