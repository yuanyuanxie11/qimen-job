(function () {
  'use strict';
  var Q = window.Qimen, J = window.QimenJob, Cal = window.QimenCalendar;
  var LAYOUT = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // 上南下北
  var NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var DOOR_CLASS = { 开门: 'ji', 休门: 'ji', 生门: 'ji', 景门: 'ping', 杜门: 'xiong', 伤门: 'xiong', 惊门: 'xiong', 死门: 'xiong' };
  var SEAL = ['大吉', '吉', '平', '阻', '难'];

  var $ = function (id) { return document.getElementById(id); };
  var state = { q: 'interview', chart: null };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tzOffsetFor(local) {
    var v = $('tz').value;
    if (v !== 'local') return Number(v);
    return -new Date(local.y, local.m - 1, local.d, local.h, local.mi).getTimezoneOffset() / 60;
  }
  function setNow() {
    var d = new Date(), v = $('tz').value;
    if (v !== 'local') d = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + Number(v) * 3600000);
    $('when').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function readWhen() {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec($('when').value);
    if (!m) { setNow(); return readWhen(); }
    return { y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
  }

  function cast() {
    var local = readWhen();
    state.chart = Q.cast(local, tzOffsetFor(local));
    renderChart();
    renderReading();
  }

  function renderChart() {
    var ch = state.chart, inf = ch.info;
    $('pillars').innerHTML = [['年', inf.year], ['月', inf.month], ['日', inf.day], ['时', inf.hour]].map(function (p) {
      return '<div class="pillar"><small>' + p[0] + '</small><b>' + p[1].name + '</b></div>';
    }).join('');
    $('meta').innerHTML = [
      '节气 <b>' + inf.term.name + '</b>（' + Cal.formatJd(inf.term.startJD, ch.tz).slice(5) + ' 起）',
      '<b>' + ch.dun + NUM[ch.ju] + '局 · ' + ch.yuan + '</b>',
      '旬首 <b>' + ch.xun + '（' + ch.xunYi + '）</b>',
      '值符 <b>' + ch.zhiFuStar + '</b>',
      '值使 <b>' + ch.zhiShiDoor + '</b>',
      '空亡 <b>' + ch.voidBranches.join('') + '</b>',
      '驿马 <b>' + ch.horseBranch + '</b>'
    ].map(function (s) { return '<span>' + s + '</span>'; }).join('');
  }

  function cellHtml(p, marks) {
    var ch = state.chart, x = ch.palaces[p];
    if (p === 5) {
      return '<div class="cell center"><div class="ju">' + ch.dun + NUM[ch.ju] + '局</div>' +
        '<div class="sub">' + ch.yuan + ' · 中五寄坤</div><div class="es">' + x.earthStem + '</div></div>';
    }
    var stars = x.stars[0].slice(1) + (x.stars[1] ? '<small>禽</small>' : '');
    var tags = (marks[p] || []).map(function (t) { return '<b>' + esc(t) + '</b>'; }).join('');
    var mk = x.marks.map(function (m) { return '<i' + (m === '马' ? ' class="horse"' : '') + '>' + m + '</i>'; }).join('');
    return '<div class="cell' + (marks[p] ? ' hl' : '') + '">' +
      '<div class="r"><span class="god">' + x.god + '</span><span class="marks">' + mk + '</span></div>' +
      '<div class="sky"><span class="star">' + stars + '</span><span class="hs">' + x.heavenStems.join('') + '</span></div>' +
      '<div class="door ' + DOOR_CLASS[x.door] + '">' + x.door + '</div>' +
      '<div class="r"><span class="gong">' + x.name + NUM[p] + ' · ' + x.dir + '</span><span class="es">' + x.earthStem + '</span></div>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>';
  }

  function renderReading() {
    var ch = state.chart;
    var r = J.read(ch, state.q, { company: $('company').value, question: state.text });
    $('board').innerHTML = LAYOUT.map(function (p) { return cellHtml(p, r.marks); }).join('');

    var v = r.verdict, h = [];
    h.push('<div><h2>' + esc(r.title) + '</h2><p class="asked">按「' + LABEL[state.q] + '」解读 · 起盘于 ' + $('when').value.replace('T', ' ') + '</p></div>');
    h.push('<div class="verdict tone-' + v.tone + '"><div class="seal">' + SEAL[v.i] + '</div><div>' +
      '<div class="label">' + esc(v.label) + '</div><div class="meter"><span style="width:' + v.pct + '%"></span></div>' +
      '<div class="score">综合分 ' + r.score + '</div></div></div>');
    if (r.timing) {
      h.push('<div class="sec"><h3>应期 · 未来 7 天</h3><div class="days">' + r.timing.days.map(function (d) {
        return '<div class="day' + (d.hit ? ' hit' : '') + '"><b>' + d.gz + '</b>' + d.label.replace(' ', '<br>') + '</div>';
      }).join('') + '</div><p class="why">' + esc(r.timing.why) + (r.timing.next ? '；' + esc(r.timing.next) : '') + '</p></div>');
    }
    r.sections.forEach(function (s) {
      if (!s.items.length) return;
      h.push('<div class="sec"><h3>' + esc(s.h) + '</h3><ul>' + s.items.map(function (i) {
        return '<li class="' + (i.v > 0 ? 'pos' : i.v < 0 ? 'neg' : '') + '">' + esc(i.t) + '</li>';
      }).join('') + '</ul></div>');
    });
    if (r.tips.length) h.push('<div class="sec"><h3>行动建议</h3><ul class="tips">' + r.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>');
    $('reading').innerHTML = h.join('');
  }

  // ---- 问题 → 类型自动推荐 ----
  var RULES = [
    ['offer', /offer|录取|薪|工资|待遇|package|谈薪|期权|签约/i],
    ['interview', /面试|笔试|oa\b|约面|电话|邀请|回复|消息|hr/i],
    ['direction', /方向|行业|城市|转行|哪里|哪个领域|赛道|适合|发展|规划/],
    ['company', /公司|机会|能不能进|进得去|有戏|大厂|投的|岗位/]
  ];
  function guessType(text) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(text)) return RULES[i][0];
    return null;
  }
  function guessCompany(text) {
    var m = /(?:投的?|对|去|进)\s*([A-Za-z][\w&.\- ]{0,24}?|[\u4e00-\u9fa5]{2,8}?)(?:公司|集团)?\s*(?:有没有|能不能|会不会|机会|面试|笔试|实习|岗位?|的|offer|吗|有戏|[？?。，,]|$)/i.exec(text);
    return m ? m[1].trim() : '';
  }
  var LABEL = { interview: '面试时机', company: '公司机会', offer: 'Offer 与薪资', direction: '求职方向' };
  var userPicked = false;

  function setType(q) {
    state.q = q;
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', String(c.dataset.q === q)); });
    $('companyRow').hidden = q !== 'company';
    $('tErr').hidden = true;
  }
  function onQuestion() {
    var text = $('question').value;
    $('qErr').hidden = true;
    if (!userPicked) {
      var g = guessType(text);
      if (g) { setType(g); $('autoHint').textContent = '已根据问题推荐「' + LABEL[g] + '」，可以改'; }
      else { setType(null); $('autoHint').textContent = ''; }
    }
    var co = guessCompany(text);
    if (co && !$('company').dataset.touched) $('company').value = co;
  }

  function renderIdle() {
    $('board').classList.add('idle');
    $('board').innerHTML = LAYOUT.map(function (p) {
      var x = Q.PALACE[p];
      return '<div class="cell idle-cell"><div>' + x.name + '<small>' + NUM[p] + '宫 · ' + x.dir + '</small></div></div>';
    }).join('');
    $('reading').innerHTML = '<div class="empty"><h2>心中想着一件事，再起盘</h2>' +
      '<ol><li>在左边写下你想问的求职问题，越具体越好。</li>' +
      '<li>选择问题类型，决定解盘时看哪个用神：面试看景门，公司看开门，offer 看景门与丁奇，薪资看生门。</li>' +
      '<li>点击「起盘」，按那一刻的时辰排出九宫盘，右侧给出结论、应期和建议。</li></ol>' +
      '<p>一事一占：同一个问题不要反复起盘。</p></div>';
  }

  $('examples').addEventListener('click', function (e) {
    var b = e.target.closest('.ex'); if (!b) return;
    $('question').value = b.textContent; userPicked = false; onQuestion(); $('question').focus();
  });
  $('question').addEventListener('input', onQuestion);
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    userPicked = true; $('autoHint').textContent = '';
    setType(b.dataset.q);
    if (state.q === 'company' && !$('company').value) $('company').focus();
  });
  $('company').addEventListener('input', function () { $('company').dataset.touched = '1'; });
  $('useNow').addEventListener('change', function () { if ($('useNow').checked) setNow(); });
  $('when').addEventListener('input', function () { $('useNow').checked = false; });
  $('tz').addEventListener('change', function () { if ($('useNow').checked) setNow(); });

  $('askForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = $('question').value.trim(), ok = true;
    if (!text) { $('qErr').hidden = false; ok = false; }
    if (!state.q) { $('tErr').hidden = false; ok = false; }
    if (!ok) return;
    if ($('useNow').checked) setNow();
    state.text = text;
    $('board').classList.remove('idle');
    cast();
    $('castBtn').textContent = '重新起盘';
    if (window.matchMedia('(max-width: 900px)').matches) $('reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  state.q = null;
  setNow();
  renderIdle();
})();
