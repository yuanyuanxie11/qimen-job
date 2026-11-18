// node test/test.js — 历法与排盘回归测试
const assert = require('assert');
const C = require('../js/calendar.js');
const Q = require('../js/qimen.js');
const I = require('../js/interpret.js');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok', name); }

t('日柱基准', () => {
  assert.strictEqual(C.gz(C.dayIndexOfDate(1949, 10, 1)).name, '甲子');
  assert.strictEqual(C.gz(C.dayIndexOfDate(2000, 1, 1)).name, '戊午');
});

t('节气时刻与天文台公布值相差 < 2 分钟（北京时间）', () => {
  const cases = [ // [名称, 公布时刻 UTC+8]
    ['冬至', 2024, 12, 21, 17, 20], ['立春', 2025, 2, 3, 22, 10], ['春分', 2025, 3, 20, 17, 1],
    ['夏至', 2025, 6, 21, 10, 42],
  ];
  for (const [name, y, m, d, h, mi] of cases) {
    const ms = Date.UTC(y, m - 1, d, h, mi) - 8 * 3600e3;
    const term = C.termAt(C.jdFromMs(ms) + 2 / 1440);
    assert.strictEqual(term.name, name);
    const diff = Math.abs(C.msFromJd(term.startJD) - ms) / 60000;
    assert.ok(diff < 2, name + ' 偏差 ' + diff.toFixed(1) + ' 分钟');
  }
});

t('四柱：立春换年、23 点换日', () => {
  let p = C.pillars({ y: 2025, m: 2, d: 3, h: 22, mi: 0 }, 8);
  assert.strictEqual(p.year.name, '甲辰'); assert.strictEqual(p.month.name, '丁丑');
  p = C.pillars({ y: 2025, m: 2, d: 3, h: 22, mi: 20 }, 8);
  assert.strictEqual(p.year.name, '乙巳'); assert.strictEqual(p.month.name, '戊寅');
  const a = C.pillars({ y: 2026, m: 11, d: 18, h: 22, mi: 59 }, 8), b = C.pillars({ y: 2026, m: 11, d: 18, h: 23, mi: 1 }, 8);
  assert.strictEqual(b.day.idx, (a.day.idx + 1) % 60);
  assert.strictEqual(b.hour.branch, '子');
});

t('手工核对盘：2026-11-18 15:30 北京时间 阴遁六局', () => {
  const ch = Q.cast({ y: 2026, m: 11, d: 18, h: 15, mi: 30 }, 8);
  assert.strictEqual(ch.info.day.name, '丙申'); assert.strictEqual(ch.info.hour.name, '丙申');
  assert.strictEqual(ch.dun + ch.ju + ch.yuan, '阴遁6上元');
  assert.strictEqual(ch.xun, '甲午'); assert.strictEqual(ch.zhiFuStar, '天冲'); assert.strictEqual(ch.zhiShiDoor, '伤门');
  const expect = { // 宫: [八神, 主星, 天盘干, 门, 地盘干]
    4: ['九地', '天英', '丁', '死门', '庚'], 9: ['玄武', '天芮', '壬己', '惊门', '丁'], 2: ['白虎', '天柱', '乙', '开门', '壬'],
    3: ['九天', '天辅', '庚', '景门', '辛'], 7: ['六合', '天心', '戊', '休门', '乙'],
    8: ['值符', '天冲', '辛', '杜门', '丙'], 1: ['腾蛇', '天任', '丙', '伤门', '癸'], 6: ['太阴', '天蓬', '癸', '生门', '戊'],
  };
  for (const p in expect) {
    const x = ch.palaces[p], e = expect[p];
    assert.deepStrictEqual([x.god, x.stars[0], x.heavenStems.join(''), x.door, x.earthStem], e, '宫 ' + p);
  }
  assert.ok(ch.palaces[4].isVoid); assert.ok(ch.palaces[8].isHorse); assert.ok(ch.palaces[8].menPo);
});

t('结构不变量：一年内每个时辰的盘都完整', () => {
  for (let day = 0; day < 366; day += 1) {
    for (let h = 0; h < 24; h += 2) {
      const dt = new Date(Date.UTC(2026, 0, 1) + day * 864e5);
      const ch = Q.cast({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h, mi: 10 }, 8);
      const doors = new Set(), gods = new Set(), stems = [];
      for (const p of Q.RING) { const x = ch.palaces[p]; doors.add(x.door); gods.add(x.god); stems.push(...x.heavenStems); }
      assert.strictEqual(doors.size, 8); assert.strictEqual(gods.size, 8);
      assert.strictEqual(new Set(stems).size, 9);
      assert.ok(ch.dayPalace && ch.hourPalace);
      for (const q of ['interview', 'company', 'offer', 'direction']) {
        const r = I.read(ch, q, { company: 'X' });
        assert.ok(Number.isFinite(r.score) && r.verdict.label);
      }
    }
  }
});

t('年命：按立春换年，甲年遁于旬首六仪，不同年命结果不同', () => {
  // 1996-02-03 在立春前 → 乙亥年；1996-02-05 → 丙子年
  assert.strictEqual(C.pillars({ y: 1996, m: 2, d: 3, h: 12, mi: 0 }, 8).year.name, '乙亥');
  assert.strictEqual(C.pillars({ y: 1996, m: 2, d: 5, h: 12, mi: 0 }, 8).year.name, '丙子');
  // 甲子年遁戊，甲戌年遁己
  assert.strictEqual(Q.effectiveStem(0), '戊');
  assert.strictEqual(Q.effectiveStem(10), '己');
  const ch = Q.cast({ y: 2026, m: 11, d: 18, h: 15, mi: 30 }, 8);
  // 丙子年（idx 12）年干丙 → 天盘丙在坎1
  const r1 = I.read(ch, 'company', { birthYearIdx: 12 });
  assert.strictEqual(r1.nian.p, 1); assert.ok(r1.marks[1].includes('年命·你'));
  // 戊年生（戊寅 idx 14）→ 天盘戊在兑7，与日干宫不同，分数应不同
  const r2 = I.read(ch, 'company', { birthYearIdx: 14 });
  assert.strictEqual(r2.nian.p, 7);
  assert.notStrictEqual(r1.score, r2.score);
  const r0 = I.read(ch, 'company', {});
  assert.strictEqual(r0.nian, null);
});
console.log(n + ' tests passed');
