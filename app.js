/* Hesapça ortak yardımcılar. Harici bağımlılık yok, her şey tarayıcıda hesaplanır. */
(function () {
  'use strict';
  var nf = {};
  function fmt(n, d) {
    if (d === undefined) d = 2;
    if (!isFinite(n)) return '–';
    var k = 'd' + d;
    if (!nf[k]) nf[k] = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[k].format(n);
  }
  function $(id) { return document.getElementById(id); }
  function val(id) {
    var el = $(id);
    if (!el) return 0;
    var s = String(el.value).trim();
    if (el.hasAttribute('data-money')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function sv(id) { var el = $(id); return el ? el.getAttribute('data-value') : ''; }
  function tl(n, d) { return fmt(n, d === undefined ? 2 : d) + ' ₺'; }
  function pct(n, d) { return '%' + fmt(n, d === undefined ? 2 : d); }
  function setVal(id, v) { var el = $(id); if (el) el.value = v; }

  /* Para girişi: binlik noktası ve ondalık virgül, imleç korunur */
  function maskMoney(el) {
    var dec = parseInt(el.getAttribute('data-money'), 10);
    if (isNaN(dec)) dec = 2;
    el.addEventListener('input', function () {
      var pos = el.selectionStart || 0;
      var digitsBefore = el.value.slice(0, pos).replace(/[^\d,]/g, '').length;
      var raw = el.value.replace(/[^\d,]/g, '');
      var i = raw.indexOf(',');
      var ip = i < 0 ? raw : raw.slice(0, i);
      var dp = i < 0 || dec === 0 ? null : raw.slice(i + 1).replace(/,/g, '').slice(0, dec);
      ip = ip.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      el.value = dp === null ? ip : ip + ',' + dp;
      var count = 0, np = 0;
      while (np < el.value.length && count < digitsBefore) { if (/[\d,]/.test(el.value[np])) count++; np++; }
      try { el.setSelectionRange(np, np); } catch (e) {}
    });
    el.addEventListener('focus', function () { try { el.select(); } catch (e) {} });
  }

  function initSeg(seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !seg.contains(b)) return;
      seg.setAttribute('data-value', b.getAttribute('data-v'));
      [].forEach.call(seg.querySelectorAll('button'), function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      seg.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* ids içindeki alanlar değişince fn çalışır. Açılışta bir kez çalışır. */
  function on(ids, fn) {
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', fn);
      el.addEventListener('change', fn);
    });
    fn();
  }

  function big(label, value) {
    if ($('bigL')) $('bigL').textContent = label;
    if ($('bigV')) $('bigV').textContent = value;
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* rows: [{k, v, strong}] veya {sep:true} */
  function ledger(id, rows) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = rows.map(function (r) {
      if (r.sep) return '<div class="sep"></div>';
      return '<div class="r' + (r.strong ? ' strong' : '') + '"><span class="k">' + esc(r.k) + '</span><span class="d"></span><span class="v">' + esc(r.v) + '</span></div>';
    }).join('');
  }

  function table(id, heads, rows) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = '<div class="tablewrap"><table><thead><tr>' + heads.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  function msg(text) { var m = $('msg'); if (m) m.textContent = text || ''; }

  /* Halka grafik. parts: [{label, value, color}] */
  function donut(id, parts) {
    var el = $(id);
    if (!el) return;
    var total = parts.reduce(function (a, p) { return a + Math.max(0, p.value); }, 0);
    if (!(total > 0)) { el.innerHTML = ''; return; }
    var off = 0, circles = '';
    parts.forEach(function (p) {
      var share = Math.max(0, p.value) / total * 100;
      if (share <= 0) return;
      circles += '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="' + p.color + '" stroke-width="6.5" stroke-dasharray="' + share.toFixed(3) + ' ' + (100 - share).toFixed(3) + '" stroke-dashoffset="' + (25 - off).toFixed(3) + '"></circle>';
      off += share;
    });
    var legend = parts.map(function (p) {
      return '<span><i style="background:' + p.color + '"></i>' + esc(p.label) + ' <b>%' + fmt(Math.max(0, p.value) / total * 100, 1) + '</b></span>';
    }).join('');
    el.innerHTML = '<svg viewBox="0 0 42 42" role="img" aria-label="Dağılım grafiği" style="max-width:190px;margin:0 auto">' +
      '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--slip-line)" stroke-width="6.5"></circle>' + circles + '</svg><div class="legend">' + legend + '</div>';
  }

  function compact(n) {
    var a = Math.abs(n);
    function c(v, s) { return fmt(v, Math.abs(v - Math.round(v)) > 0.05 ? 1 : 0) + s; }
    if (a >= 1e9) return c(n / 1e9, ' Mr');
    if (a >= 1e6) return c(n / 1e6, ' Mn');
    if (a >= 1e3) return c(n / 1e3, ' B');
    return fmt(n, 0);
  }

  /* Yığılmış sütun grafik. series: [{name, values, color}] */
  function bars(id, labels, series, opts) {
    var el = $(id);
    if (!el) return;
    opts = opts || {};
    var n = labels.length;
    if (!n) { el.innerHTML = ''; return; }
    var W = 320, Hh = 150, L = 38, B = 18, T = 6, R = 4;
    var stacks = labels.map(function (_, i) { return series.reduce(function (a, s) { return a + Math.max(0, s.values[i] || 0); }, 0); });
    var max = Math.max.apply(null, stacks) || 1;
    var mag = Math.pow(10, Math.floor(Math.log10(max)));
    var ti = mag * 5;
    [0.2, 0.25, 0.5, 1, 2, 2.5, 5].some(function (c) { if (max / (c * mag) <= 5) { ti = c * mag; return true; } return false; });
    var top = Math.ceil(max / ti) * ti, ticks = Math.round(top / ti);
    var pw = (W - L - R) / n, bw = Math.max(1.5, pw * 0.72);
    var svg = '';
    for (var g = 0; g <= ticks; g++) {
      var gv = ti * g, gy = Hh - B - (Hh - B - T) * gv / top;
      svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" stroke="var(--slip-line)" stroke-width="0.5"></line>' +
        '<text x="' + (L - 4) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end">' + compact(gv) + '</text>';
    }
    labels.forEach(function (lb, i) {
      var x = L + pw * i + (pw - bw) / 2, y = Hh - B;
      series.forEach(function (s) {
        var h = Math.max(0, s.values[i] || 0) / top * (Hh - B - T);
        y -= h;
        svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + s.color + '" rx="1"></rect>';
      });
      var every = Math.ceil(n / 8);
      if (i % every === 0 || i === n - 1) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Hh - 5) + '" text-anchor="middle">' + esc(lb) + '</text>';
    });
    var legend = series.length > 1 || opts.legend ? '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>' : '';
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + esc(opts.label || 'Grafik') + '">' + svg + '</svg>' + legend;
  }

  /* Tema */
  function initTheme() {
    var btn = $('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('hc-theme', next); } catch (e) {}
    });
  }

  window.H = { $: $, val: val, sv: sv, fmt: fmt, tl: tl, pct: pct, setVal: setVal, on: on, big: big, ledger: ledger, table: table, donut: donut, bars: bars, msg: msg, esc: esc, compact: compact };

  function boot() {
    [].forEach.call(document.querySelectorAll('[data-money]'), maskMoney);
    [].forEach.call(document.querySelectorAll('[data-seg]'), initSeg);
    initTheme();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
