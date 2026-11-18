/*
 * interpret.js — 求职专用解盘
 * 用神：日干=求测人自己；开门=工作/岗位/公司；值符=公司高层、决策者；
 *       景门=面试通知、简历、信息；丁奇=offer、录取文书；生门=薪资收益；戊=资金；时干=所问之事。
 */
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Q = isNode ? require('./qimen.js') : root.Qimen;
  var Cal = isNode ? require('./calendar.js') : root.QimenCalendar;

  var DOOR = {
    开门: [2, '开门：岗位开放、通道打开，利求职'],
    休门: [2, '休门：人事和顺，HR 好沟通'],
    生门: [2, '生门：有收益、有成长空间'],
    景门: [1, '景门：信息、文书多，利展示自己'],
    杜门: [-1, '杜门：流程卡住、渠道不通'],
    伤门: [-1, '伤门：竞争摩擦，容易受挫'],
    惊门: [-2, '惊门：虚惊变动、口舌是非'],
    死门: [-2, '死门：停滞、岗位冻结、没下文']
  };
  var STAR = {
    天心: [2, '天心：面试官/领导认可，利技术与管理岗'],
    天任: [2, '天任：稳重可靠，进展踏实'],
    天辅: [2, '天辅：利笔试、考核，专业能力被看见'],
    天禽: [1, '天禽：中正平稳'],
    天冲: [1, '天冲：行动力强，宜主动出击'],
    天英: [0, '天英：利表达展示，但忌急躁'],
    天柱: [-1, '天柱：易有口舌，言多必失'],
    天芮: [-1, '天芮：问题多，需要补短板'],
    天蓬: [-2, '天蓬：风险大，警惕画饼与不实信息']
  };
  var GOD = {
    值符: [2, '值符：贵人、大平台、上层支持'],
    六合: [2, '六合：撮合之象，利内推、猎头、熟人引荐'],
    太阴: [1, '太阴：暗中有助，适合私下沟通、低调推进'],
    九天: [1, '九天：利冲高目标、扩大投递面'],
    九地: [1, '九地：稳中求进，节奏偏慢但牢靠'],
    腾蛇: [-1, '腾蛇：信息反复、虚实难辨，要多核实'],
    玄武: [-1, '玄武：信息不透明，留意虚假岗位'],
    白虎: [-2, '白虎：竞争激烈、压力面，易有挫折']
  };
  // 天盘干 + 地盘干 常见格局
  var GE = {
    戊丙: ['青龙返首', 2, '大吉格：贵人提携，机会主动找上门'],
    丙戊: ['飞鸟跌穴', 2, '大吉格：好消息不期而至，事半功倍'],
    乙丙: ['奇仪顺遂', 2, '吉格：有提升、升级之象'],
    乙丁: ['奇仪相佐', 2, '吉格：文书、录取有利'],
    丙丁: ['星奇朱雀', 2, '吉格：贵人传来好消息'],
    丁丙: ['星随月转', 1, '吉格：借势而起'],
    丙乙: ['日月并行', 1, '吉格：公私皆顺'],
    丁乙: ['人遁吉格', 1, '吉格：得人相助'],
    乙辛: ['青龙逃走', -2, '凶格：机会溜走、对方变卦'],
    辛乙: ['白虎猖狂', -2, '凶格：竞争激烈、压力大'],
    丁癸: ['朱雀投江', -2, '凶格：消息石沉大海、文书受阻'],
    癸丁: ['腾蛇夭矫', -2, '凶格：信息反复、虚惊纠缠'],
    庚丙: ['太白入荧', -1, '竞争者来势汹汹'],
    丙庚: ['荧入太白', -1, '阻力会退，但要防变动'],
    庚戊: ['天乙伏宫', -2, '凶格：上层卡住，决策迟迟不下'],
    戊庚: ['值符飞宫', -1, '变动：换人、换岗、换流程'],
    庚庚: ['太白同宫', -2, '同类竞争、内耗'],
    戊戊: ['伏吟', -1, '宜守不宜进，进展缓慢']
  };
  var INDUSTRY = {
    金: '金融/银行/投资、法律合规、硬件与机械、汽车',
    木: '教育培训、出版文化、医疗医药、设计与内容创作',
    水: '物流贸易、传媒、旅游出行、销售与流量运营',
    火: '互联网/AI/电子、能源、广告营销、娱乐与游戏',
    土: '房地产与建筑、咨询与人力服务、政府/公共事业、保险'
  };
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var OPP = function (b) { var i = Cal.BRANCHES.indexOf(b); return Cal.BRANCHES[(i + 6) % 12]; };

  function pname(ch, p) { var x = ch.palaces[p]; return x.name + p + '宫（' + x.dir + '）'; }

  /** 评估某一宫的吉凶。opt.skipDoor：用神本身就是门时，不再按门的吉凶计分 */
  function evalPalace(ch, p, opt) {
    opt = opt || {};
    var x = ch.palaces[p], s = 0, notes = [];
    function add(v, t) { s += v; notes.push({ v: v, t: t }); }
    if (!x || p === 5) return { s: 0, notes: notes };

    if (!opt.skipDoor && x.door) add(DOOR[x.door][0], DOOR[x.door][1]);
    if (x.door) {
      var st = Q.seasonState(Q.DOOR_ELEM[x.door], ch.info.month.branch);
      var sv = { 旺: 1, 相: 1, 休: 0, 囚: -1, 死: -1 }[st];
      if (sv) add(sv, x.door + '当令' + st + (sv > 0 ? '，力量足' : '，力量弱'));
    }
    var mainStar = x.stars[0];
    if (STAR[mainStar][0] !== 0 || opt.verbose) add(STAR[mainStar][0], STAR[mainStar][1]);
    if (x.god) add(GOD[x.god][0], GOD[x.god][1]);
    x.heavenStems.forEach(function (h) {
      var g = GE[h + x.earthStem];
      if (g) add(g[1], g[0] + '（' + h + '加' + x.earthStem + '）：' + g[2]);
    });
    if (x.heavenStems.indexOf('庚') >= 0 && !GE['庚' + x.earthStem]) add(-1, '天盘见庚：有阻隔或竞争对手');
    if (x.isVoid) add(-2, '落空亡（' + x.voidBranches.join('') + '）：事情暂未落实，需等出空');
    if (x.isHorse) add(1, '逢驿马：动得快，有变动、出差或异地机会');
    if (x.menPo) add(-2, '门迫（' + x.door + '克宫）：外部环境压门，推进吃力');
    if (x.jiXing.length) add(-2, x.jiXing.join('') + '击刑：容易受挫、内心焦虑');
    if (x.ruMu.length) add(-1, x.ruMu.join('') + '入墓：被埋没、暂时施展不开');
    return { s: s, notes: notes };
  }

  /** 我（日干宫）与目标宫的五行关系 */
  function relate(ch, selfP, targetP, who) {
    if (!selfP || !targetP) return { v: 0, t: '' };
    if (selfP === targetP) return { v: 2, t: '你与' + who + '同宫：直接相会，缘分到位' };
    var a = ch.palaces[selfP].elem, b = ch.palaces[targetP].elem;
    switch (Q.relation(b, a)) {
      case '生': return { v: 2, t: who + '宫（' + b + '）生你（' + a + '）：对方主动青睐你' };
      case '比和': return { v: 1, t: who + '宫与你五行比和（' + a + '）：匹配度不错' };
      case '被生': return { v: 0, t: '你（' + a + '）生' + who + '（' + b + '）：你付出多，对方回应偏慢' };
      case '被克': return { v: 1, t: '你（' + a + '）克' + who + '（' + b + '）：能争取到，但要主动出击' };
      default: return { v: -2, t: who + '宫（' + b + '）克你（' + a + '）：门槛高、压力大' };
    }
  }

  function level(score, labels) {
    var i = score >= 5 ? 0 : score >= 2 ? 1 : score >= -1 ? 2 : score >= -4 ? 3 : 4;
    return { i: i, label: labels[i], tone: ['great', 'good', 'mid', 'warn', 'bad'][i], pct: Math.max(4, Math.min(96, Math.round(50 + score * 6))) };
  }

  /** 应期：未来 7 天中，地支与关键宫相应（或冲空、填实）的日子 */
  function timing(ch, p) {
    var x = ch.palaces[p], hits = [], why;
    if (x.isVoid) { hits = x.voidBranches.concat(x.voidBranches.map(OPP)); why = '关键宫空亡，等「填实」（' + x.voidBranches.join('') + '日）或「冲空」（' + x.voidBranches.map(OPP).join('') + '日）'; }
    else { hits = x.branches.slice(); why = '关键宫地支为 ' + x.branches.join('、') + '，逢此日支易有动静'; }
    var days = [], base = Date.UTC(ch.local.y, ch.local.m - 1, ch.local.d);
    for (var i = 0; i < 7; i++) {
      var dt = new Date(base + i * 86400000);
      var y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      var g = Cal.gz(Cal.dayIndexOfDate(y, m, d));
      var hit = hits.indexOf(g.branch) >= 0 || (x.isHorse && i < 3);
      days.push({ label: m + '/' + d + ' 周' + WEEK[dt.getUTCDay()], gz: g.name, hit: hit });
    }
    if (x.isHorse) why += '；又逢驿马，前三天就可能有动静';
    var next = null;
    if (!days.some(function (d) { return d.hit; })) {
      for (var j = 7; j < 40; j++) {
        var dt2 = new Date(base + j * 86400000);
        var g2 = Cal.gz(Cal.dayIndexOfDate(dt2.getUTCFullYear(), dt2.getUTCMonth() + 1, dt2.getUTCDate()));
        if (hits.indexOf(g2.branch) >= 0) { next = '7 天内没有对应日，最近的是 ' + (dt2.getUTCMonth() + 1) + '/' + dt2.getUTCDate() + '（' + g2.name + '日）'; break; }
      }
    }
    return { why: why, days: days, next: next };
  }

  function overall(ch) {
    var out = [];
    out.push({ v: 0, t: ch.dun + ch.ju + '局 ' + ch.yuan + '，' + (ch.yang ? '阳遁主进、主外，节奏偏快' : '阴遁主守、主内，节奏偏慢，宜稳') });
    if (ch.fuYin) out.push({ v: -1, t: '星盘伏吟：事情原地打转，宜等待、宜跟进，不宜硬推' });
    if (ch.fanYin) out.push({ v: 0, t: '星盘反吟：变化快、易反复，结果可能来回摇摆' });
    return out;
  }

  function tips(ch, ps) {
    var t = [], seen = {};
    function push(k, s) { if (!seen[k]) { seen[k] = 1; t.push(s); } }
    ps.forEach(function (p) {
      var x = ch.palaces[p]; if (!x) return;
      if (x.god === '六合') push('合', '找内推、猎头或校友引荐，比海投更有效');
      if (x.god === '太阴') push('阴', '私下联系招聘方/前同事打听，低调推进');
      if (x.god === '九天') push('天', '目标可以定高一点，扩大投递面');
      if (x.god === '九地') push('地', '保持耐心，流程慢不代表没戏');
      if (x.god === '腾蛇' || x.god === '玄武') push('核', '核实岗位真实性与 JD 细节，别轻信口头承诺');
      if (x.god === '白虎') push('虎', '提前准备压力面和高强度技术面');
      if (x.god === '值符') push('符', '优先投大平台、找高层或部门负责人的通道');
      if (x.stars[0] === '天辅') push('辅', '笔试/OA 有利，好好刷题准备');
      if (x.stars[0] === '天英') push('英', '面试重在表达与作品展示，准备好项目故事');
      if (x.stars[0] === '天柱') push('柱', '面试少说多听，谈薪和离职原因要谨慎措辞');
      if (x.stars[0] === '天冲') push('冲', '主动发邮件跟进，别干等');
      if (x.isVoid) push('空', '有信息也别急着下定论，等落实再庆祝');
      if (x.menPo) push('迫', '市场环境偏紧，多准备几条备选线');
    });
    return t;
  }

  function read(ch, qtype, extra) {
    extra = extra || {};
    var hourP = ch.hourPalace, self = ch.dayPalace, nian = null;
    if (typeof extra.birthYearIdx === 'number') {
      var ny = Cal.gz(extra.birthYearIdx), nStem = Q.effectiveStem(extra.birthYearIdx);
      nian = { gz: ny.name, stem: nStem, p: ch.heavenPalaceOf(nStem) };
      if (nian.p) self = nian.p; // 有年命时以年命代表你本人
    }
    var jing = ch.doorPalaceOf('景门'), kai = ch.doorPalaceOf('开门'), sheng = ch.doorPalaceOf('生门');
    var ding = ch.heavenPalaceOf('丁'), wu = ch.heavenPalaceOf('戊');
    var sections = [], marks = {}, score = 0, verdict, title, tm = null, adviceExtra = [];

    function mark(p, label) { if (!p) return; (marks[p] = marks[p] || []).push(label); }
    function section(h, items) { sections.push({ h: h, items: items.filter(function (i) { return i && i.t; }) }); }
    if (nian && nian.p) { mark(nian.p, '年命·你'); if (ch.dayPalace !== nian.p) mark(ch.dayPalace, '日干·当下的你'); }
    else mark(self, '日干·你');

    var ov = overall(ch);
    ov.forEach(function (o) { score += o.v; });

    if (qtype === 'interview') {
      title = extra.question || '这周会有面试吗？';
      mark(jing, '景门·面试通知'); mark(kai, '开门·机会'); mark(hourP, '时干·此事');
      var A = evalPalace(ch, jing, { skipDoor: true }), B = evalPalace(ch, kai, { skipDoor: true });
      var R = relate(ch, self, jing, '景门'), H = evalPalace(ch, hourP);
      score += A.s + B.s * 0.6 + R.v + H.s * 0.3;
      verdict = level(score, ['大概率会有，消息很近', '有机会，留意邮箱和电话', '有，但需要你推一把', '近期偏淡，先打磨简历', '这周希望不大，放长线']);
      section('面试通知 · 景门在' + pname(ch, jing), A.notes);
      section('机会大门 · 开门在' + pname(ch, kai), B.notes);
      section('你与面试信息的关系', [R]);
      tm = timing(ch, jing);
    } else if (qtype === 'company') {
      var co = (extra.company || '').trim() || '这家公司';
      title = extra.question || ('我对「' + co + '」有没有机会？');
      mark(kai, '开门·' + co); mark(ch.zhiFuPalace, '值符·决策层'); mark(hourP, '时干·结果');
      var K = evalPalace(ch, kai, { skipDoor: true }), R1 = relate(ch, self, kai, '开门（' + co + '）');
      var R2 = relate(ch, self, ch.zhiFuPalace, '值符（决策层）'), H2 = evalPalace(ch, hourP);
      score += K.s + R1.v * 1.5 + R2.v * 0.5 + H2.s * 0.4;
      verdict = level(score, ['机会很大，冲！', '有戏，值得全力准备', '五五开，看临场发挥', '有阻力，需要内推或换岗位方向', '希望不大，建议并行其他公司']);
      section(co + ' · 开门在' + pname(ch, kai), K.notes);
      section('你和 ' + co + ' 的关系', [R1, R2]);
      section('结果走向 · 时干在' + pname(ch, hourP), H2.notes);
      tm = timing(ch, kai);
    } else if (qtype === 'offer') {
      title = extra.question || '能拿到 offer 吗？薪资怎么样？';
      mark(jing, '景门·offer'); mark(ding, '丁奇·录取文书'); mark(sheng, '生门·薪资');
      var J = evalPalace(ch, jing, { skipDoor: true }), Dg = evalPalace(ch, ding);
      var S = evalPalace(ch, sheng, { skipDoor: true }), R3 = relate(ch, self, jing, '景门（offer）');
      var R4 = relate(ch, self, sheng, '生门（薪资）');
      score += J.s + Dg.s * 0.5 + R3.v + (S.s + R4.v) * 0.4;
      verdict = level(score, ['offer 稳了，可以谈条件', '大概率能拿到', '能拿到但会拖一拖', '悬，需补材料或再争取', '这一轮可能落空']);
      var salary = S.s + R4.v * 1.5;
      section('Offer · 景门在' + pname(ch, jing), J.notes);
      section('录取文书 · 丁奇在' + pname(ch, ding), Dg.notes);
      section('薪资 · 生门在' + pname(ch, sheng) + '：' + (salary >= 3 ? '给得爽快，可适度上探' : salary >= 0 ? '中规中矩，可以谈' : '有压价倾向，准备好筹码'), S.notes.concat([R4]));
      section('你与 offer 的关系', [R3]);
      tm = timing(ch, jing);
    } else { // direction
      title = extra.question || '我近期的求职方向与重点';
      mark(kai, '开门·事业'); mark(sheng, '生门·收益');
      var ranks = Q.RING.map(function (p) { return { p: p, e: evalPalace(ch, p) }; })
        .sort(function (a, b) { return b.e.s - a.e.s; });
      var best = ranks.slice(0, 2), worst = ranks[ranks.length - 1];
      best.forEach(function (r) { mark(r.p, '吉方'); });
      mark(worst.p, '慎方');
      var K2 = evalPalace(ch, kai, { skipDoor: true }), R5 = relate(ch, self, kai, '开门（事业）');
      score += K2.s + R5.v;
      verdict = level(score, ['大运在线，全面出击', '整体顺，重点突破', '平稳期，稳扎稳打', '有阻滞，先蓄力', '低潮期，宜修炼内功']);
      var e1 = ch.palaces[kai].elem, e2 = ch.palaces[sheng].elem;
      section('有利方位（城市/办公地点方向）', best.map(function (r) {
        var x = ch.palaces[r.p];
        return { v: 1, t: x.dir + '方（' + x.name + '宫）：' + x.door + '·' + x.stars[0] + '·' + x.god };
      }).concat([{ v: -1, t: '慎选 ' + ch.palaces[worst.p].dir + '方（' + ch.palaces[worst.p].name + '宫）：' + ch.palaces[worst.p].door + '·' + ch.palaces[worst.p].god }]));
      section('行业倾向', [
        { v: 1, t: '开门落' + e1 + '宫 → ' + INDUSTRY[e1] },
        e2 !== e1 ? { v: 1, t: '生门落' + e2 + '宫（收益）→ ' + INDUSTRY[e2] } : null
      ]);
      section('事业状态 · 开门在' + pname(ch, kai), K2.notes.concat([R5]));
    }

    if (nian && nian.p) {
      var NP = evalPalace(ch, nian.p);
      if (nian.p === hourP && qtype !== 'direction') {
        NP = { s: 1, notes: [{ v: 1, t: '年命与时干同宫：你本人就是这件事成败的关键，主动权在你（宫内细节见「结果走向」）' }] };
      }
      score += NP.s * 0.3;
      var nx = ch.palaces[nian.p];
      section('你的年命 · ' + nian.gz + '年生，' + nian.stem + (nian.stem !== nian.gz[0] ? '（甲遁' + nian.stem + '）' : '') + '落' + pname(ch, nian.p), NP.notes.length ? NP.notes : [{ v: 0, t: '年命宫平稳，状态中性' }]);
      if (nx.isVoid) adviceExtra.push('年命落空：最近心气不足或想法未定，先把目标想清楚');
      if (nx.ruMu.length) adviceExtra.push('年命入墓：容易被埋没，主动展示作品、多做 networking');
    } else {
      section('盘面总体 · 提示', [{ v: 0, t: '未填出生年份，以日干代表你；填写后改用年命，结果会因人而异' }]);
    }
    section('盘面总体', ov);
    var adv = tips(ch, [jing, kai, self, hourP].filter(Boolean)).concat(adviceExtra);
    if (verdict.i >= 3) adv.push('同时多开几条线，不把希望压在一家');
    if (verdict.i <= 1) adv.push('趁势而上：这段时间多投、多约面');
    return { nian: nian, title: title, score: Math.round(score * 10) / 10, verdict: verdict, sections: sections, marks: marks, timing: tm, tips: adv };
  }

  var api = { read: read, evalPalace: evalPalace, relate: relate };
  if (isNode) module.exports = api;
  else root.QimenJob = api;
})(this);
