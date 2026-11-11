/* GAiA 생성형 AI 자료실 — 관리자 페이지 */
(function () {
  'use strict';

  var CFG_KEY = 'gaia-admin-cfg';
  var HEADER = '/*\n' +
    ' * GAiA 생성형 AI 자료실 — 자료 데이터\n' +
    ' * ------------------------------------------------------------\n' +
    ' * 이 파일은 관리자 페이지(admin.html)가 읽고 씁니다.\n' +
    ' * 직접 고칠 때는 아래가 올바른 JSON 형식을 유지해야 합니다\n' +
    ' * (키와 문자열은 큰따옴표, 마지막 항목 뒤 쉼표 없음).\n' +
    ' *\n' +
    ' * resources 항목 필드\n' +
    " *  id, type('video'|'blog'|'repo'), title, source, date('YYYY.MM'),\n" +
    " *  updated(GitHub만), lang, level('입문'|'활용'|'심화'),\n" +
    " *  audience(['학생','교원','직원']), tags[], comment(사서 한마디), url,\n" +
    " *  youtubeId(영상만), own(GAiA 자체 제작), featured(홈 추천 1건), added('YYYY-MM-DD')\n" +
    ' */\n';

  /* ---------- 데이터 직렬화 (data/resources.js 형식) ---------- */
  function serialize(d) {
    var res = d.resources.map(function (r) { return '    ' + JSON.stringify(r); }).join(',\n');
    var ind = function (v) { return JSON.stringify(v, null, 2).split('\n').join('\n  '); };
    return HEADER + 'window.GAIA_DATA = {\n  "resources": [\n' + res + '\n  ],\n  "briefings": ' +
      ind(d.briefings || []) + ',\n  "TAGS": ' + ind(d.TAGS || []) + '\n};\n';
  }
  function parse(text) {
    var key = 'window.GAIA_DATA =';
    var i = text.indexOf(key);
    if (i < 0) throw new Error('데이터 파일에서 GAIA_DATA를 찾을 수 없습니다.');
    var body = text.slice(i + key.length).trim();
    if (body.charAt(body.length - 1) === ';') body = body.slice(0, -1);
    return JSON.parse(body);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* UTF-8 ↔ base64 (GitHub API용) */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- 상태 ---------- */
  var base = clone(window.GAIA_DATA || { resources: [], briefings: [], TAGS: [] });
  var data = clone(base);
  var changes = [];
  var connected = false;
  var tab = 'video';
  var editingId = null;
  var cfg = loadCfg();

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  var esc = function (s) { return window.GAIA_UI ? window.GAIA_UI.esc(s) : String(s); };
  function msg(el, text, kind) { var e = $(el); e.textContent = text || ''; e.className = 'msg' + (kind ? ' ' + kind : ''); }
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function loadCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCfg() {
    var c = { owner: val('#c-owner'), repo: val('#c-repo'), branch: val('#c-branch') || 'main', path: val('#c-path') || 'data/resources.js' };
    var remember = $('#c-remember').checked;
    if (remember) c.token = val('#c-token');
    c.remember = remember;
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) { /* 저장 불가 환경 */ }
    cfg = c;
  }
  function val(s) { return ($(s).value || '').trim(); }
  function token() { return val('#c-token'); }

  /* ---------- GitHub API ---------- */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers: headers, body: opts.body })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var m = j && j.message ? j.message : ('HTTP ' + r.status);
            if (r.status === 401) m = '토큰이 올바르지 않거나 만료되었습니다.';
            if (r.status === 403) m = '권한이 없습니다. 토큰에 이 저장소의 Contents 쓰기 권한이 있는지 확인하세요. (' + m + ')';
            if (r.status === 404) m = '저장소나 파일을 찾을 수 없습니다. 계정·저장소·경로·브랜치를 확인하세요.';
            if (r.status === 409) m = '다른 곳에서 파일이 먼저 바뀌었습니다. 다시 불러온 뒤 저장하세요.';
            throw new Error(m);
          }
          return j;
        });
      });
  }
  function contentsPath() {
    return '/repos/' + encodeURIComponent(val('#c-owner')) + '/' + encodeURIComponent(val('#c-repo')) +
      '/contents/' + val('#c-path').split('/').map(encodeURIComponent).join('/');
  }
  function getRemote() {
    return gh(contentsPath() + '?ref=' + encodeURIComponent(val('#c-branch') || 'main')).then(function (j) {
      var text = b64decode(j.content || '');
      return { sha: j.sha, data: parse(text) };
    });
  }

  function connect() {
    if (!val('#c-owner') || !val('#c-repo')) { msg('#c-msg', '계정과 저장소 이름을 넣어 주세요.', 'err'); return; }
    if (changes.length) { msg('#c-msg', '저장하지 않은 변경이 있습니다. 먼저 저장하거나 변경 취소를 누르세요.', 'err'); return; }
    saveCfg();
    msg('#c-msg', '불러오는 중…');
    getRemote().then(function (r) {
      base = clone(r.data); data = clone(r.data); connected = true;
      msg('#c-msg', 'GitHub에서 최신 데이터를 불러왔습니다. 자료 ' + data.resources.length + '건.', 'ok');
      $('#conn-state').textContent = '연결됨 · ' + val('#c-owner') + '/' + val('#c-repo');
      $('#conn-state').classList.add('on');
      $('#conn').open = false;
      refreshAll();
    }).catch(function (e) { msg('#c-msg', e.message, 'err'); });
  }

  function saveToGitHub() {
    if (!token() || !val('#c-owner') || !val('#c-repo')) {
      msg('#f-msg', 'GitHub에 저장하려면 위 GitHub 연결에 저장소와 토큰을 넣어 주세요. 또는 데이터 파일을 내려받아 직접 올리세요.', 'err');
      $('#conn').open = true; $('#conn').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    saveCfg();
    var btn = $('#sb-save'); btn.disabled = true; btn.textContent = '저장 중…';
    getRemote().then(function (r) {
      // 다른 사람이 그 사이 파일을 바꿨는지 확인
      if (JSON.stringify(r.data) !== JSON.stringify(base)) {
        throw new Error('GitHub의 데이터가 이 화면에서 불러온 뒤에 바뀌었습니다. 지금 변경은 "데이터 파일 내려받기"로 보관한 뒤, 변경 취소 → 다시 불러오기를 하세요.');
      }
      var message = changes.length === 1 ? '자료실: ' + changes[0] : '자료실: ' + changes.length + '건 변경\n\n' + changes.map(function (c) { return '- ' + c; }).join('\n');
      return gh(contentsPath(), { method: 'PUT', body: JSON.stringify({ message: message, content: b64encode(serialize(data)), sha: r.sha, branch: val('#c-branch') || 'main' }) });
    }).then(function (j) {
      base = clone(data); changes = []; connected = true;
      var link = j && j.commit && j.commit.html_url;
      msg('#f-msg', '저장했습니다. 1~2분 뒤 사이트에 반영됩니다.' + (link ? ' (커밋: ' + link + ')' : ''), 'ok');
      refreshAll();
    }).catch(function (e) {
      msg('#f-msg', e.message, 'err');
    }).then(function () { btn.textContent = 'GitHub에 저장'; updateSavebar(); });
  }

  function download() {
    var blob = new Blob([serialize(data)], { type: 'text/javascript;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'resources.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    msg('#f-msg', '내려받은 resources.js를 GitHub 저장소의 data 폴더에 올리면(같은 이름으로 덮어쓰기) 반영됩니다.', 'ok');
  }

  /* ---------- 폼 ---------- */
  var LABELS = {
    video: { url: '유튜브 주소', ph: 'https://www.youtube.com/watch?v=…', source: '채널', date: '게시일', fetch: true },
    blog: { url: '글 주소', ph: 'https://…', source: '출처 (매체·블로그 이름)', date: '게시일', fetch: true },
    repo: { url: 'GitHub 저장소 주소', ph: 'https://github.com/owner/repo', source: '소유자', date: '최근 업데이트', fetch: true }
  };

  function setTab(t) {
    tab = t;
    $$('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === t)); });
    $('#form-panel').hidden = t === 'manage';
    $('#manage-panel').hidden = t !== 'manage';
    if (t !== 'manage') {
      var L = LABELS[t];
      $('#f-url-label').textContent = L.url;
      $('#f-url').placeholder = L.ph;
      $('#f-source-label').textContent = L.source;
      $('#f-date-label').textContent = L.date;
      $('#f-own-wrap').hidden = t !== 'video';
      $('#f-fetch').textContent = t === 'blog' ? '출처 채우기' : '정보 불러오기';
      renderPreview();
    } else {
      renderManage();
    }
  }

  function ytId(u) {
    u = (u || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  function repoName(u) {
    u = (u || '').trim().replace(/\.git$/, '').replace(/\/+$/, '');
    var m = u.match(/github\.com\/([\w.-]+)\/([\w.-]+)/) || u.match(/^([\w.-]+)\/([\w.-]+)$/);
    return m ? m[1] + '/' + m[2] : '';
  }
  function hasHangul(s) { return /[가-힣]/.test(s || ''); }
  function normUrl(u) {
    try { var x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase(); }
    catch (e) { return (u || '').toLowerCase(); }
  }
  function findDup(item) {
    return data.resources.filter(function (r) {
      if (r.id === editingId) return false;
      if (item.youtubeId && r.youtubeId === item.youtubeId) return true;
      return normUrl(r.url) === normUrl(item.url);
    })[0];
  }

  function fetchInfo() {
    var u = val('#f-url');
    msg('#f-fetch-msg', '');
    if (tab === 'video') {
      var id = ytId(u);
      if (!id) { msg('#f-fetch-msg', '유튜브 주소에서 영상 ID를 찾지 못했습니다.', 'err'); return; }
      $('#f-url').value = 'https://www.youtube.com/watch?v=' + id;
      var dup = findDup({ youtubeId: id, url: $('#f-url').value });
      if (dup) msg('#f-fetch-msg', '이미 등록된 영상입니다: ' + dup.title, 'err');
      var target = encodeURIComponent('https://www.youtube.com/watch?v=' + id);
      msg('#f-fetch-msg', '불러오는 중…');
      fetch('https://www.youtube.com/oembed?format=json&url=' + target)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return fetch('https://noembed.com/embed?url=' + target).then(function (r) { return r.json(); }); })
        .then(function (o) {
          if (!o || !o.title) throw new Error('영상 정보를 찾을 수 없습니다. 비공개이거나 퍼가기가 막힌 영상일 수 있습니다.');
          $('#f-title').value = o.title;
          $('#f-source').value = o.author_name || '';
          $('#f-lang').value = hasHangul(o.title) ? '한국어' : '영어';
          msg('#f-fetch-msg', (dup ? '⚠ 이미 등록된 영상입니다. ' : '') + '제목과 채널을 채웠습니다. 게시일은 유튜브 영상 화면에서 확인해 넣어 주세요(선택).', dup ? 'err' : 'ok');
          renderPreview();
        })
        .catch(function (e) { msg('#f-fetch-msg', '자동으로 불러오지 못했습니다. 제목과 채널을 직접 넣어 주세요. (' + e.message + ')', 'err'); });
    } else if (tab === 'repo') {
      var name = repoName(u);
      if (!name) { msg('#f-fetch-msg', 'github.com/계정/저장소 형식의 주소를 넣어 주세요.', 'err'); return; }
      msg('#f-fetch-msg', '불러오는 중…');
      gh('/repos/' + name).then(function (j) {
        $('#f-url').value = j.html_url;
        $('#f-title').value = j.full_name;
        $('#f-source').value = j.owner && j.owner.login || name.split('/')[0];
        $('#f-date').value = (j.pushed_at || '').slice(0, 7);
        $('#f-lang').value = '영어';
        var dup = findDup({ url: j.html_url });
        var hint = $('#f-desc-hint');
        hint.hidden = !j.description;
        hint.textContent = j.description ? '저장소 설명 (사서 한마디 작성 참고): ' + j.description + (j.stargazers_count != null ? '  · ★ ' + j.stargazers_count.toLocaleString() : '') : '';
        msg('#f-fetch-msg', dup ? '⚠ 이미 등록된 저장소입니다: ' + dup.title : (j.archived ? '⚠ 보관(archived)된 저장소입니다. 더 이상 업데이트되지 않습니다.' : '저장소 정보를 채웠습니다.'), dup || j.archived ? 'err' : 'ok');
        renderPreview();
      }).catch(function (e) { msg('#f-fetch-msg', e.message, 'err'); });
    } else {
      try {
        var x = new URL(u);
        var host = x.hostname.replace(/^www\./, '');
        if (!val('#f-source')) $('#f-source').value = host;
        var dup2 = findDup({ url: u });
        msg('#f-fetch-msg', (dup2 ? '⚠ 이미 등록된 글입니다: ' + dup2.title + '. ' : '') + '블로그 글은 보안 정책상 제목을 자동으로 가져올 수 없습니다. 제목을 직접 넣고, 출처 이름을 다듬어 주세요.', dup2 ? 'err' : 'ok');
        renderPreview();
      } catch (e) { msg('#f-fetch-msg', 'https://로 시작하는 주소를 넣어 주세요.', 'err'); }
    }
  }

  function readForm() {
    var aud = $$('input[name="f-aud"]:checked').map(function (i) { return i.value; });
    var lvl = ($$('input[name="f-level"]:checked')[0] || {}).value || '입문';
    var tags = val('#f-tags').split(/[,，]/).map(function (s) { return s.trim().replace(/^#/, ''); }).filter(Boolean);
    var month = val('#f-date');
    var item = {
      type: tab, title: val('#f-title'), source: val('#f-source'),
      date: tab === 'repo' ? '' : (month ? month.replace('-', '.') : ''),
      lang: $('#f-lang').value, level: lvl, audience: aud, tags: tags,
      comment: val('#f-comment'), url: val('#f-url')
    };
    if (tab === 'repo' && month) item.updated = month.replace('-', '.');
    if (tab === 'video') {
      item.youtubeId = ytId(item.url);
      if (item.youtubeId) item.url = 'https://www.youtube.com/watch?v=' + item.youtubeId;
      if ($('#f-own').checked) item.own = true;
    }
    if ($('#f-featured').checked) item.featured = true;
    return item;
  }

  function validate(item) {
    if (!item.url) return '주소를 넣어 주세요.';
    if (!/^https?:\/\//.test(item.url)) return '주소는 https://로 시작해야 합니다.';
    if (tab === 'video' && !item.youtubeId) return '유튜브 영상 주소가 아닙니다.';
    if (tab === 'repo' && !repoName(item.url)) return 'GitHub 저장소 주소가 아닙니다.';
    if (!item.title) return '제목을 넣어 주세요.';
    if (!item.source) return '출처(채널·매체)를 넣어 주세요.';
    if (!item.audience.length) return '대상을 하나 이상 고르세요.';
    if (!item.comment) return '사서 한마디를 적어 주세요.';
    var dup = findDup(item);
    if (dup) return '이미 등록된 자료입니다: ' + dup.title;
    return '';
  }

  function makeId(item) {
    var raw;
    if (item.type === 'video') raw = 'yt-' + item.youtubeId;
    else if (item.type === 'repo') raw = 'gh-' + repoName(item.url);
    else { try { var x = new URL(item.url); raw = 'b-' + x.hostname.replace(/^www\./, '') + x.pathname; } catch (e) { raw = 'b-' + Date.now(); } }
    var id = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
    var ids = {}; data.resources.forEach(function (r) { ids[r.id] = 1; });
    var out = id, n = 2;
    while (ids[out]) out = id + '-' + (n++);
    return out;
  }

  function submit() {
    var item = readForm();
    var err = validate(item);
    if (err) { msg('#f-msg', err, 'err'); return; }
    if (item.featured) data.resources.forEach(function (r) { delete r.featured; });
    if (editingId) {
      var idx = data.resources.findIndex(function (r) { return r.id === editingId; });
      var old = data.resources[idx];
      item.id = old.id; item.added = old.added;
      data.resources[idx] = order(item);
      changes.push('수정: ' + item.title);
      msg('#f-msg', '수정했습니다. 아래 저장 버튼을 눌러야 사이트에 반영됩니다.', 'ok');
      cancelEdit(true);
    } else {
      item.id = makeId(item); item.added = today();
      data.resources.unshift(order(item));
      changes.push('추가: ' + item.title);
      msg('#f-msg', '목록 맨 앞에 추가했습니다. 계속 추가하거나, 아래 저장 버튼으로 한 번에 저장하세요.', 'ok');
      clearForm(true);
    }
    refreshAll();
  }

  // 필드 순서를 데이터 파일과 같게 맞춤
  function order(it) {
    var keys = ['id', 'type', 'title', 'source', 'date', 'updated', 'lang', 'level', 'audience', 'tags', 'comment', 'url', 'youtubeId', 'own', 'featured', 'added'];
    var o = {};
    keys.forEach(function (k) { if (it[k] !== undefined && it[k] !== '' || k === 'date') o[k] = it[k] === undefined ? '' : it[k]; });
    return o;
  }

  function clearForm(keepMsg) {
    ['#f-url', '#f-title', '#f-source', '#f-date', '#f-tags', '#f-comment'].forEach(function (s) { $(s).value = ''; });
    $('#f-lang').value = '한국어';
    $$('input[name="f-aud"]').forEach(function (i) { i.checked = true; });
    $$('input[name="f-level"]').forEach(function (i) { i.checked = i.value === '입문'; });
    $('#f-own').checked = false; $('#f-featured').checked = false;
    $('#f-desc-hint').hidden = true;
    msg('#f-fetch-msg', '');
    if (!keepMsg) msg('#f-msg', '');
    updateCount(); renderPreview();
  }

  function startEdit(id) {
    var r = data.resources.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    editingId = id;
    setTab(r.type);
    $('#f-url').value = r.url; $('#f-title').value = r.title; $('#f-source').value = r.source;
    $('#f-date').value = (r.type === 'repo' ? (r.updated || '') : (r.date || '')).replace('.', '-');
    var langs = $$('#f-lang option').map(function (o) { return o.value; });
    if (langs.indexOf(r.lang) < 0) { var op = document.createElement('option'); op.textContent = r.lang; $('#f-lang').appendChild(op); }
    $('#f-lang').value = r.lang;
    $$('input[name="f-level"]').forEach(function (i) { i.checked = i.value === r.level; });
    $$('input[name="f-aud"]').forEach(function (i) { i.checked = r.audience.indexOf(i.value) >= 0; });
    $('#f-tags').value = (r.tags || []).join(', ');
    $('#f-comment').value = r.comment || '';
    $('#f-own').checked = !!r.own; $('#f-featured').checked = !!r.featured;
    $('#edit-banner').hidden = false; $('#edit-title').textContent = r.title;
    $('#f-submit').textContent = '수정 내용 반영';
    msg('#f-msg', ''); msg('#f-fetch-msg', '');
    updateCount(); renderPreview();
    $('#form-panel').scrollIntoView({ behavior: 'smooth' });
  }
  function cancelEdit(keepMsg) {
    editingId = null;
    $('#edit-banner').hidden = true;
    $('#f-submit').textContent = '목록에 추가';
    clearForm(keepMsg);
  }

  function renderPreview() {
    if (tab === 'manage' || !window.GAIA_UI) return;
    var it = readForm();
    if (!it.title) it.title = '(제목)';
    if (!it.source) it.source = '(출처)';
    if (!it.comment) it.comment = '(사서 한마디)';
    if (tab === 'video' && !it.youtubeId) it.youtubeId = '';
    var html = window.GAIA_UI.card(it).replace(/<a class="card" href="[^"]*"[^>]*>/, '<div class="card">').replace(/<\/a>$/, '</div>');
    $('#f-preview').innerHTML = html;
  }
  function updateCount() {
    var n = val('#f-comment').length;
    $('#f-count').textContent = n + ' / 120';
    $('#f-count').classList.toggle('over', n > 120);
  }

  function renderTagSuggest() {
    var cnt = {};
    data.resources.forEach(function (r) { (r.tags || []).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
    var tags = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    $('#f-tag-suggest').innerHTML = tags.map(function (t) {
      return '<button type="button" class="tagbtn" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
    }).join('');
  }

  /* ---------- 목록 관리 ---------- */
  var TYPE_NAME = { video: '영상', blog: '블로그', repo: 'GitHub' };
  var pendingDelete = null;
  function renderManage() {
    var q = val('#m-q').toLowerCase(), t = $('#m-type').value;
    var list = data.resources.filter(function (r) {
      if (t !== 'all' && r.type !== t) return false;
      return !q || (r.title + ' ' + r.source).toLowerCase().indexOf(q) >= 0;
    });
    $('#m-count').textContent = list.length + '건 / 전체 ' + data.resources.length + '건';
    $('#m-body').innerHTML = list.map(function (r) {
      var del = pendingDelete === r.id
        ? '<button type="button" class="btn-sm danger" data-act="del-ok" data-id="' + esc(r.id) + '">정말 삭제</button>'
        : '<button type="button" class="btn-sm" data-act="del" data-id="' + esc(r.id) + '">삭제</button>';
      return '<tr><td>' + TYPE_NAME[r.type] + '</td><td><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a>' +
        '<div class="sub">' + esc(r.source) + (r.featured ? ' · <strong class="star">★ 홈 추천</strong>' : '') + '</div></td>' +
        '<td>' + esc(r.added || '') + '</td>' +
        '<td class="acts"><button type="button" class="btn-sm" data-act="edit" data-id="' + esc(r.id) + '">수정</button>' +
        '<button type="button" class="btn-sm" data-act="feature" data-id="' + esc(r.id) + '">' + (r.featured ? '추천 해제' : '홈 추천') + '</button>' + del + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="sub">자료가 없습니다.</td></tr>';
  }
  function manageClick(e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var id = b.dataset.id, act = b.dataset.act;
    var r = data.resources.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    if (act === 'edit') { startEdit(id); return; }
    if (act === 'feature') {
      var on = !r.featured;
      data.resources.forEach(function (x) { delete x.featured; });
      if (on) r.featured = true;
      changes.push((on ? '홈 추천 지정: ' : '홈 추천 해제: ') + r.title);
    }
    if (act === 'del') { pendingDelete = id; renderManage(); return; }
    if (act === 'del-ok') {
      data.resources = data.resources.filter(function (x) { return x.id !== id; });
      changes.push('삭제: ' + r.title); pendingDelete = null;
    }
    refreshAll();
  }

  /* ---------- 저장 바 ---------- */
  function updateSavebar() {
    var n = changes.length;
    $('#sb-text').innerHTML = n ? '저장하지 않은 변경 <strong>' + n + '</strong>건 — ' + esc(changes[changes.length - 1]) : '변경 사항 없음';
    $('#sb-undo').disabled = !n; $('#sb-download').disabled = !n; $('#sb-save').disabled = !n;
    $('#savebar').classList.toggle('active', !!n);
  }
  function undoAll() {
    data = clone(base); changes = []; pendingDelete = null;
    if (editingId) cancelEdit();
    msg('#f-msg', '저장하지 않은 변경을 모두 취소했습니다.', 'ok');
    refreshAll();
  }
  function refreshAll() {
    renderTagSuggest();
    if (tab === 'manage') renderManage();
    updateSavebar();
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    $('#c-owner').value = cfg.owner || ''; $('#c-repo').value = cfg.repo || '';
    $('#c-branch').value = cfg.branch || 'main'; $('#c-path').value = cfg.path || 'data/resources.js';
    $('#c-token').value = cfg.token || ''; $('#c-remember').checked = !!cfg.remember;
    if (cfg.owner && cfg.repo) $('#conn-state').textContent = '설정 저장됨 · 연결 버튼을 눌러 최신 데이터를 불러오세요';

    $('#c-connect').addEventListener('click', connect);
    $('#c-forget').addEventListener('click', function () {
      try { localStorage.removeItem(CFG_KEY); } catch (e) { /* 무시 */ }
      $('#c-token').value = ''; $('#c-remember').checked = false;
      msg('#c-msg', '이 브라우저에 저장된 설정과 토큰을 지웠습니다.', 'ok');
    });
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { if (editingId) cancelEdit(); setTab(b.dataset.tab); });
    });
    $('#f-fetch').addEventListener('click', fetchInfo);
    $('#f-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fetchInfo(); } });
    $('#f-submit').addEventListener('click', submit);
    $('#f-clear').addEventListener('click', function () { if (editingId) cancelEdit(); else clearForm(); });
    $('#edit-cancel').addEventListener('click', function () { cancelEdit(); });
    $('#form-panel').addEventListener('input', function (e) { if (e.target.id === 'f-comment') updateCount(); renderPreview(); });
    $('#form-panel').addEventListener('change', renderPreview);
    $('#f-tag-suggest').addEventListener('click', function (e) {
      var b = e.target.closest('.tagbtn'); if (!b) return;
      var cur = val('#f-tags').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cur.indexOf(b.dataset.tag) < 0) cur.push(b.dataset.tag);
      $('#f-tags').value = cur.join(', '); renderPreview();
    });
    $('#m-q').addEventListener('input', renderManage);
    $('#m-type').addEventListener('change', renderManage);
    $('#m-body').addEventListener('click', manageClick);
    $('#sb-undo').addEventListener('click', undoAll);
    $('#sb-download').addEventListener('click', download);
    $('#sb-save').addEventListener('click', saveToGitHub);
    window.addEventListener('beforeunload', function (e) { if (changes.length) { e.preventDefault(); e.returnValue = ''; } });

    setTab('video');
    refreshAll();
  });

  // 테스트용
  window.GAIA_ADMIN = { serialize: serialize, parse: parse, b64encode: b64encode, b64decode: b64decode };
})();
