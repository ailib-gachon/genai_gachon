/* GAiA 생성형 AI 자료실 — 공통 스크립트 (헤더·푸터·카드·필터·상세) */
(function () {
  'use strict';

  var D = window.GAIA_DATA || { resources: [], briefings: [], TAGS: [] };
  var R = D.resources.slice().sort(function (a, b) {
    return (b.added || '').localeCompare(a.added || '');
  });

  var NAV = [
    ['index.html', '홈', 'home'],
    ['resources.html', '전체 자료', 'all'],
    ['videos.html', '영상', 'video'],
    ['articles.html', '블로그·GitHub', 'text'],
    ['briefing.html', '주간 브리핑', 'briefing'],
    ['guide.html', '가이드라인', 'guide']
  ];
  var TYPE_NAME = { video: '영상', blog: '블로그·아티클', repo: 'GitHub' };
  var TYPE_META = { video: 'YouTube', blog: '블로그', repo: 'GitHub 레포' };
  var LEVEL = { beginner: '입문', intermediate: '활용', advanced: '심화' };
  var AUD = { student: '학생', faculty: '교원', staff: '직원' };

  var ICON = {
    play: '<svg aria-hidden="true" width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    doc: '<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6M9 9h2"/></svg>',
    note: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    ext: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    video: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/></svg>',
    blog: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg>',
    repo: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
    brief: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }
  function slugOf(obj, val) {
    for (var k in obj) if (obj[k] === val) return k;
    return '';
  }

  /* ---------- 헤더·푸터 ---------- */
  function header(active) {
    var links = NAV.map(function (n) {
      var cur = n[2] === active ? ' aria-current="page"' : '';
      return '<a href="' + n[0] + '"' + cur + '>' + n[1] + '</a>';
    }).join('');
    return '<a class="skip" href="#main">본문 바로가기</a>' +
      '<header class="site-header"><div class="wrap">' +
      '<a class="brand" href="index.html"><span class="brand-mark">GAiA</span>' +
      '<span class="brand-text"><strong>생성형 AI 자료실</strong><span>가천대학교 중앙도서관 · AI도서관</span></span></a>' +
      '<nav class="nav" aria-label="주 메뉴">' + links +
      '<a class="nav-cta" href="https://gcai.gachon.ac.kr">GCAI 바로가기</a></nav>' +
      '</div></header>';
  }
  function footer() {
    return '<footer class="site-footer"><div class="wrap">' +
      '<div class="info"><strong>가천대학교 중앙도서관 학술정보지원팀 · GAiA AI도서관</strong>' +
      '<span>GAiA실 안내데스크 031-750-5228</span>' +
      '<span>이 사이트는 자료의 요약과 원문 링크만 제공합니다. 각 자료의 저작권은 원저작자에게 있습니다.</span></div>' +
      '<a class="btn btn-line" href="guide.html#request">자료 추천 요청하기</a>' +
      '</div></footer>';
  }

  /* ---------- 카드 ---------- */
  function ytThumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
  function imgTag(src) {
    // 썸네일을 못 불러오면 이미지를 지우고 기본 배경을 보여 줌
    return '<img src="' + esc(src) + '" alt="" loading="lazy" onerror="this.remove()">';
  }
  function thumb(r) {
    if (r.type === 'video') {
      return '<div class="thumb video">' + (r.youtubeId ? imgTag(ytThumb(r.youtubeId)) : '') +
        '<span class="play">' + ICON.play + '</span>' +
        '<span class="badge">영상</span>' + (r.own ? '<span class="badge own">GAiA 자체 제작</span>' : '') + '</div>';
    }
    if (r.type === 'blog') {
      return '<div class="thumb blog">' + ICON.doc + '<span class="badge">블로그·아티클</span></div>';
    }
    var parts = String(r.title).split('/');
    return '<div class="thumb repo"><code><small>' + esc(parts[0]) + ' /</small>' + esc(parts.slice(1).join('/')) + '</code><span class="badge">GitHub</span></div>';
  }
  function metaLine(r) {
    var when = r.date || (r.updated ? '업데이트 ' + r.updated : '');
    return [TYPE_META[r.type], r.source, when, r.lang].filter(Boolean).map(esc).join(' · ');
  }
  function card(r) {
    var isVideo = r.type === 'video';
    var href = isVideo ? 'video.html#' + r.id : r.url;
    var attrs = isVideo ? '' : ' target="_blank" rel="noopener"';
    var tags = (r.tags || []).map(function (t) { return '<span class="lb-tag">#' + esc(t) + '</span>'; }).join('');
    return '<a class="card" href="' + esc(href) + '"' + attrs + '>' + thumb(r) +
      '<div class="card-body">' +
      '<span class="meta">' + metaLine(r) + '</span>' +
      '<span class="card-title">' + esc(r.title) + '</span>' +
      '<span class="note">' + ICON.note + '<span><strong>사서 한마디</strong>' + esc(r.comment) + '</span></span>' +
      '<span class="labels"><span class="lb-level">' + esc(r.level) + '</span>' +
      '<span class="lb-aud">' + esc((r.audience || []).join(' · ')) + '</span>' + tags + '</span>' +
      (isVideo ? '' : '<span class="ext">원문 보기 ' + ICON.ext + '</span>') +
      '</div></a>';
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    var pick = R.filter(function (r) { return r.featured; })[0] || R[0];
    var pickEl = $('#pick');
    if (pick && pickEl) {
      var isV = pick.type === 'video';
      pickEl.innerHTML =
        '<div class="pick-top"><strong>이번 주 사서 추천</strong><span>' + esc(pick.added || '') + '</span></div>' +
        '<a href="' + esc(isV ? 'video.html#' + pick.id : pick.url) + '" style="text-decoration:none;border-radius:12px;overflow:hidden">' + thumb(pick).replace('<span class="badge">영상</span>', '') + '</a>' +
        '<h2>' + esc(pick.title) + '</h2>' +
        '<p>' + esc(pick.comment) + '</p>' +
        '<div class="labels" style="margin-top:0"><span class="lb-level">' + esc(pick.level) + '</span><span class="lb-aud">' + esc(pick.audience.join(' · ')) + '</span><span class="lb-tag">' + esc(pick.lang) + '</span></div>' +
        '<a class="btn btn-navy" href="' + esc(isV ? 'video.html#' + pick.id : pick.url) + '">' + (isV ? '영상 보러 가기' : '원문 보러 가기') + '</a>';
    }
    var hot = $('#hot');
    if (hot) {
      hot.innerHTML = '<span>많이 찾는 주제</span>' + (D.TAGS || []).map(function (t) {
        return '<a href="resources.html#tag-' + t.slug + '">#' + esc(t.name) + '</a>';
      }).join('');
    }
    var tiles = $('#tiles');
    if (tiles) {
      var count = function (t) { return R.filter(function (r) { return r.type === t; }).length; };
      tiles.innerHTML = [
        ['videos.html', 'video', '영상', '유튜브 강의와 GAiA 교육 녹화 영상', count('video') + '편'],
        ['articles.html', 'blog', '블로그·GitHub', 'AI 기업 공식 블로그, 정리 글, 실습 저장소', (count('blog') + count('repo')) + '건'],
        ['briefing.html', 'brief', '주간 브리핑', '사서가 고른 한 주의 생성형 AI 소식', (D.briefings || []).length + '회']
      ].map(function (t) {
        return '<a class="tile" href="' + t[0] + '"><span class="tile-icon">' + ICON[t[1]] + '</span>' +
          '<strong>' + t[2] + '</strong><span>' + t[3] + '</span></a>';
      }).join('');
    }
    var latest = $('#latest');
    if (latest) latest.innerHTML = R.slice(0, 4).map(card).join('');
    var cols = $('#collections');
    if (cols) {
      var n = function (fn) { return R.filter(fn).length; };
      cols.innerHTML = [
        ['resources.html#level-beginner', '입문', '처음 만나는 생성형 AI', 'LLM이 무엇이고 어떻게 답을 만드는지, 원리부터 차근차근 잡는 자료입니다.', n(function (r) { return r.level === '입문'; })],
        ['resources.html#tag-prompt', '학습·연구', '프롬프트 제대로 쓰기', '기법별 정리 글과 따라 하는 실습 과정으로 프롬프트 작성법을 익힙니다.', n(function (r) { return r.tags.indexOf('프롬프트') >= 0; })],
        ['resources.html#tag-agent', '업무', '업무 자동화와 AI 에이전트', '반복 업무를 맡기는 에이전트의 개념과 설계 원칙을 다룬 자료입니다.', n(function (r) { return r.tags.indexOf('AI 에이전트') >= 0; })]
      ].map(function (c) {
        return '<a class="collection" href="' + c[0] + '"><span class="kicker">' + c[1] + '</span><strong>' + c[2] +
          '</strong><p>' + c[3] + '</p></a>';
      }).join('');
    }
    var form = $('#home-search');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = form.querySelector('input').value.trim();
        try { sessionStorage.setItem('gaia-q', q); } catch (err) { /* 무시 */ }
        location.href = 'resources.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      });
    }
  }

  /* ---------- 목록 (전체·영상·블로그·GitHub) ---------- */
  function renderList(fixedType) {
    // fixedType: 'video' = 영상 페이지, 'text' = 블로그·GitHub 페이지, null = 전체 자료
    var PAGE = 24;
    var st = { type: fixedType || 'all', aud: 'all', lvl: 'all', q: '', limit: PAGE };

    function readUrl() {
      var h = decodeURIComponent((location.hash || '').slice(1));
      var m;
      if (fixedType === 'text' && (h === 'blog' || h === 'repo')) st.type = h;
      if ((m = h.match(/^level-(\w+)$/)) && LEVEL[m[1]]) st.lvl = LEVEL[m[1]];
      if ((m = h.match(/^aud-(\w+)$/)) && AUD[m[1]]) st.aud = AUD[m[1]];
      if ((m = h.match(/^tag-([\w-]+)$/))) {
        var t = (D.TAGS || []).filter(function (x) { return x.slug === m[1]; })[0];
        if (t) st.q = t.name;
      }
      var q = '';
      try { q = new URLSearchParams(location.search).get('q') || ''; } catch (err) { /* 무시 */ }
      if (!q) { try { q = sessionStorage.getItem('gaia-q') || ''; } catch (err) { /* 무시 */ } }
      try { sessionStorage.removeItem('gaia-q'); } catch (err) { /* 무시 */ }
      if (q) st.q = q;
    }

    function chips(key, opts, cls) {
      return opts.map(function (o) {
        return '<button type="button" class="chip' + (cls ? ' ' + cls : '') + '" data-k="' + key + '" data-v="' + esc(o[0]) +
          '" aria-pressed="' + (st[key] === o[0]) + '">' + o[1] + '</button>';
      }).join('');
    }

    function draw() {
      var f = $('#filters');
      var typeOpts = fixedType === 'text'
        ? [['text', '전체'], ['blog', '블로그·아티클'], ['repo', 'GitHub']]
        : [['all', '전체'], ['video', '영상'], ['text', '블로그·GitHub']];
      var typeRow = fixedType === 'video' ? '' :
        '<div class="frow" role="group" aria-label="유형"><span class="flabel">유형</span>' +
        chips('type', typeOpts, 'type') + '</div>';
      var active = st.aud !== 'all' || st.lvl !== 'all' || st.q || st.type !== (fixedType || 'all');
      f.innerHTML = typeRow +
        '<div class="frow" role="group" aria-label="대상"><span class="flabel">대상</span>' +
        chips('aud', [['all', '전체'], ['학생', '학생'], ['교원', '교원'], ['직원', '직원']]) + '</div>' +
        '<div class="frow" role="group" aria-label="난이도"><span class="flabel">난이도</span>' +
        chips('lvl', [['all', '전체'], ['입문', '입문'], ['활용', '활용'], ['심화', '심화']]) + '</div>' +
        '<div class="frow"><label class="flabel" for="fq">검색</label>' +
        '<input id="fq" class="filter-search" type="search" placeholder="제목, 출처, 태그로 찾기" value="' + esc(st.q) + '">' +
        (active ? '<button type="button" class="reset" id="reset">필터 초기화</button>' : '') + '</div>';

      var q = st.q.trim().toLowerCase();
      var list = R.filter(function (r) {
        if (st.type === 'text') { if (r.type !== 'blog' && r.type !== 'repo') return false; }
        else if (st.type !== 'all' && r.type !== st.type) return false;
        if (st.aud !== 'all' && r.audience.indexOf(st.aud) < 0) return false;
        if (st.lvl !== 'all' && r.level !== st.lvl) return false;
        if (q) {
          var hay = [r.title, r.source, r.comment].concat(r.tags || []).join(' ').toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });
      $('#count').innerHTML = '자료 <strong>' + list.length + '</strong>건';
      $('#grid').innerHTML = list.slice(0, st.limit).map(card).join('');
      $('#empty').hidden = list.length > 0;
      var more = $('#more');
      if (!more) {
        more = document.createElement('div');
        more.id = 'more';
        more.style.cssText = 'display:flex;justify-content:center;margin-top:28px';
        $('#grid').insertAdjacentElement('afterend', more);
        more.addEventListener('click', function (e) {
          if (e.target.closest('button')) { st.limit += PAGE; draw(); }
        });
      }
      var left = list.length - st.limit;
      more.innerHTML = left > 0
        ? '<button type="button" class="btn btn-line">더 보기 (' + left + '건 남음)</button>'
        : '';
    }

    readUrl();
    draw();

    $('#filters').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'reset') {
        st = { type: fixedType || 'all', aud: 'all', lvl: 'all', q: '', limit: PAGE };
      } else {
        st[b.dataset.k] = b.dataset.v;
        st.limit = PAGE;
      }
      draw();
    });
    $('#filters').addEventListener('input', function (e) {
      if (e.target.id !== 'fq') return;
      st.q = e.target.value;
      st.limit = PAGE;
      var pos = e.target.selectionStart;
      draw();
      var inp = $('#fq'); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (err) { /* 무시 */ }
    });
    window.addEventListener('hashchange', function () { readUrl(); draw(); });
  }

  /* ---------- 영상 상세 ---------- */
  function renderVideo() {
    function draw() {
      var id = (location.hash || '').slice(1);
      if (!id) { try { id = new URLSearchParams(location.search).get('id') || ''; } catch (err) { /* 무시 */ } }
      var v = R.filter(function (r) { return r.id === id && r.type === 'video'; })[0];
      var root = $('#video');
      if (!v) {
        root.innerHTML = '<div class="empty"><strong>영상을 찾을 수 없습니다</strong><span><a href="videos.html">영상 목록으로 돌아가기</a></span></div>';
        return;
      }
      document.title = v.title + ' | GAiA 생성형 AI 자료실';
      var player = v.youtubeId
        ? '<div class="player" id="player"><button type="button" aria-label="' + esc(v.title) + ' 재생">' + imgTag(ytThumb(v.youtubeId)) +
          '<span class="play">' + ICON.play + '</span></button></div>'
        : '<div class="player"><span class="soon" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">영상 준비 중입니다</span></div>';
      var rel = R.filter(function (r) {
        return r.type === 'video' && r.id !== v.id && r.tags.some(function (t) { return v.tags.indexOf(t) >= 0; });
      });
      if (rel.length < 3) {
        rel = rel.concat(R.filter(function (r) { return r.type === 'video' && r.id !== v.id && rel.indexOf(r) < 0; }));
      }
      rel = rel.slice(0, 4);
      $('#crumb-title').textContent = v.title;
      root.innerHTML =
        '<div class="detail"><div class="detail-main">' + player +
        '<span class="meta">' + metaLine(v) + '</span>' +
        '<h1>' + esc(v.title) + '</h1>' +
        '<div class="note">' + ICON.note + '<span><strong>사서 한마디</strong>' + esc(v.comment) + '</span></div>' +
        '<div class="labels" style="margin-top:0"><span class="lb-level">' + esc(v.level) + '</span><span class="lb-aud">' +
        esc(v.audience.join(' · ')) + '</span>' + v.tags.map(function (t) { return '<span class="lb-tag">#' + esc(t) + '</span>'; }).join('') + '</div>' +
        '</div><aside class="detail-side">' +
        '<dl class="facts"><dt>채널</dt><dd>' + esc(v.source) + '</dd><dt>게시</dt><dd>' + esc(v.date || '-') +
        '</dd><dt>언어</dt><dd>' + esc(v.lang) + '</dd><dt>대상</dt><dd>' + esc(v.audience.join(', ')) + '</dd></dl>' +
        (v.url ? '<a class="btn btn-line" href="' + esc(v.url) + '" target="_blank" rel="noopener">YouTube에서 보기 ' + ICON.ext + '</a>' : '') +
        '<div class="related"><h2>함께 보면 좋은 영상</h2>' + rel.map(function (r) {
          return '<a class="rel" href="video.html#' + r.id + '"><span class="thumb video">' + (r.youtubeId ? imgTag(ytThumb(r.youtubeId)) : '') +
            '<span class="play">' + ICON.play + '</span></span><span style="display:flex;flex-direction:column;gap:4px"><strong>' +
            esc(r.title) + '</strong><span>' + esc(r.source) + '</span></span></a>';
        }).join('') + '</div></aside></div>';

      var p = $('#player button');
      if (p) {
        p.addEventListener('click', function () {
          $('#player').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.youtubeId) +
            '?autoplay=1&rel=0" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        });
      }
      window.scrollTo(0, 0);
    }
    draw();
    window.addEventListener('hashchange', draw);
  }

  /* ---------- 주간 브리핑 ---------- */
  function renderBriefing() {
    var B = D.briefings || [];
    function draw() {
      var id = (location.hash || '').slice(1);
      var cur = B.filter(function (b) { return b.id === id; })[0] || B[0];
      var art = $('#brief');
      if (!cur) { art.innerHTML = '<div class="empty"><strong>아직 브리핑이 없습니다</strong></div>'; return; }
      art.innerHTML = '<article class="brief-article"><span class="kicker">' + esc(cur.week) + ' · ' + esc(cur.date) + '</span>' +
        '<h2>' + esc(cur.title) + '</h2>' + cur.items.map(function (it, i) {
          return '<section class="brief-item"><span class="meta">' + (i + 1) + ' · ' + esc(it.source) + '</span><h3>' + esc(it.title) +
            '</h3><p>' + esc(it.summary) + '</p>' + (it.url ? '<a class="ext" href="' + esc(it.url) + '" target="_blank" rel="noopener">원문 보기 ' + ICON.ext + '</a>' : '') + '</section>';
        }).join('') + '</article>';
      $('#brief-list').innerHTML = B.map(function (b) {
        return '<li><a class="brief-row" href="#' + b.id + '"' + (b === cur ? ' aria-current="true"' : '') + '><b>' + esc(b.week) +
          '</b><span>' + esc(b.title) + '</span></a></li>';
      }).join('');
    }
    draw();
    window.addEventListener('hashchange', function () { draw(); $('#brief').scrollIntoView({ behavior: 'smooth' }); });
  }

  /* 관리자 페이지 미리보기용 */
  window.GAIA_UI = { card: card, esc: esc };

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    var type = document.body.getAttribute('data-type') || '';
    var active = page === 'list' ? (type || 'all') : (page === 'video' ? 'video' : page);
    var h = $('#site-header'); if (h) h.outerHTML = header(active);
    var f = $('#site-footer'); if (f) f.outerHTML = footer();
    if (page === 'home') renderHome();
    if (page === 'list') renderList(type || null);
    if (page === 'video') renderVideo();
    if (page === 'briefing') renderBriefing();
  });
})();
