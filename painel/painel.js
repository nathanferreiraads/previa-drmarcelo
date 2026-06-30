/* ============================================================
   Painel de Leads · Dr. Marcelo Marciano
   Auth + leitura via Supabase (REST). Modo demonstracao incluso.
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.LP_CONFIG || {};
  var SB_URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  var SB_KEY = CFG.SUPABASE_ANON_KEY || "";
  var SB_OK = SB_URL && SB_KEY && !/^\s*$/.test(SB_URL);
  var LS = "marcelo_painel_session";

  var WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg>';

  var STATUS = {
    novo: "Novo", em_atendimento: "Em atendimento", agendado: "Agendado", perdido: "Perdido"
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]; }); }

  var state = { leads: [], demo: false, token: null, email: "" };

  /* ---------------- formatadores ---------------- */
  function fmtPhone(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.indexOf("55") === 0 && d.length > 11) d = d.slice(2);
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return t || "";
  }
  function waNumber(t) {
    var d = String(t || "").replace(/\D/g, "");
    return d.indexOf("55") === 0 ? d : "55" + d;
  }
  function fmtDate(iso) {
    var dt = new Date(iso); if (isNaN(dt)) return "";
    var now = new Date();
    var sameDay = dt.toDateString() === now.toDateString();
    var y = new Date(now); y.setDate(now.getDate() - 1);
    var hh = ("0" + dt.getHours()).slice(-2) + ":" + ("0" + dt.getMinutes()).slice(-2);
    if (sameDay) return "Hoje " + hh;
    if (dt.toDateString() === y.toDateString()) return "Ontem " + hh;
    return ("0" + dt.getDate()).slice(-2) + "/" + ("0" + (dt.getMonth() + 1)).slice(-2) + "/" + dt.getFullYear();
  }
  function origemOf(l) {
    var s = l.utm_source, c = l.utm_campaign;
    if (!s && !c) return "Direto";
    return [s, c].filter(Boolean).join(" · ");
  }

  /* ---------------- Supabase REST ---------------- */
  function sbFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "apikey": SB_KEY,
      "Authorization": "Bearer " + (state.token || SB_KEY),
      "Content-Type": "application/json"
    }, opts.headers || {});
    return fetch(SB_URL + path, opts);
  }
  function login(email, senha) {
    return fetch(SB_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: senha })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function loadLeads() {
    showLoading(true);
    return sbFetch("/rest/v1/leads?select=*&order=created_at.desc", {})
      .then(function (r) { if (!r.ok) throw new Error("fetch " + r.status); return r.json(); })
      .then(function (rows) { state.leads = rows || []; populateFilters(); render(); })
      .catch(function (e) { console.warn(e); alert("Nao foi possivel carregar os leads. Faca login novamente."); doLogout(); })
      .then(function () { showLoading(false); });
  }
  function updateStatus(id, status) {
    if (state.demo) {
      var l = state.leads.filter(function (x) { return x.id === id; })[0]; if (l) l.status = status;
      render(); return;
    }
    sbFetch("/rest/v1/leads?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({ status: status })
    }).then(function (r) {
      if (r.ok) { var l = state.leads.filter(function (x) { return x.id === id; })[0]; if (l) l.status = status; render(); }
      else alert("Nao foi possivel atualizar o status.");
    }).catch(function () { alert("Erro de conexao ao atualizar."); });
  }

  /* ---------------- sessao ---------------- */
  function saveSession() { try { localStorage.setItem(LS, JSON.stringify({ token: state.token, email: state.email })); } catch (e) {} }
  function restoreSession() { try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return null; } }
  function clearSession() { try { localStorage.removeItem(LS); } catch (e) {} }

  function enterApp() {
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
    $("#userEmail").textContent = state.email || "";
    $("#demoBadge").hidden = !state.demo;
  }
  function doLogout() {
    clearSession();
    state = { leads: [], demo: false, token: null, email: "" };
    $("#appView").hidden = true;
    $("#loginView").hidden = false;
    $("#senha").value = "";
  }

  /* ---------------- render ---------------- */
  function showLoading(b) { $("#loadingState").hidden = !b; if (b) { $("#leadsTable").hidden = true; $("#emptyState").hidden = true; } else { $("#leadsTable").hidden = false; } }

  function activeFilters() {
    return {
      q: $("#fSearch").value.trim().toLowerCase(),
      caso: $("#fCaso").value,
      origem: $("#fOrigem").value,
      status: $("#fStatus").value,
      dias: parseInt($("#fData").value, 10) || 0
    };
  }
  function applyFilters(rows) {
    var f = activeFilters();
    var now = Date.now();
    return rows.filter(function (l) {
      if (f.caso && l.caso !== f.caso) return false;
      if (f.status && l.status !== f.status) return false;
      if (f.origem && origemOf(l) !== f.origem) return false;
      if (f.dias) { var d = new Date(l.created_at).getTime(); if (now - d > f.dias * 864e5) return false; }
      if (f.q) {
        var hay = ((l.nome || "") + " " + (l.telefone || "") + " " + fmtPhone(l.telefone)).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });
  }
  function renderKPIs() {
    var c = { total: state.leads.length, novo: 0, em_atendimento: 0, agendado: 0, perdido: 0 };
    state.leads.forEach(function (l) { if (c[l.status] != null) c[l.status]++; });
    $all("[data-kpi]").forEach(function (el) { el.textContent = c[el.getAttribute("data-kpi")] || 0; });
  }
  function populateFilters() {
    var casos = {}, origens = {};
    state.leads.forEach(function (l) { if (l.caso) casos[l.caso] = 1; origens[origemOf(l)] = 1; });
    fillSelect("#fCaso", Object.keys(casos).sort());
    fillSelect("#fOrigem", Object.keys(origens).sort());
  }
  function fillSelect(sel, items) {
    var el = $(sel), cur = el.value, first = el.querySelector("option");
    el.innerHTML = ""; el.appendChild(first);
    items.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; el.appendChild(o); });
    el.value = cur;
  }
  function render() {
    renderKPIs();
    var rows = applyFilters(state.leads);
    var body = $("#leadsBody");
    body.innerHTML = "";
    rows.forEach(function (l) {
      var tr = document.createElement("tr");
      var statusOpts = Object.keys(STATUS).map(function (k) {
        return '<option value="' + k + '"' + (l.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>";
      }).join("");
      tr.innerHTML =
        '<td data-th="Nome"><span class="lead-nome">' + esc(l.nome) + "</span></td>" +
        '<td data-th="Telefone"><span class="lead-tel">' + esc(fmtPhone(l.telefone)) + "</span></td>" +
        '<td data-th="Caso"><span class="caso-tag">' + esc(l.caso || "-") + "</span></td>" +
        '<td data-th="Origem"><span class="lead-origem">' + esc(origemOf(l)) + "</span></td>" +
        '<td data-th="Data"><span class="lead-data">' + esc(fmtDate(l.created_at)) + "</span></td>" +
        '<td data-th="Status"><select class="status-sel" data-status="' + esc(l.status) + '" data-id="' + esc(l.id) + '">' + statusOpts + "</select></td>" +
        '<td data-th=""><a class="wa-btn" href="https://wa.me/' + waNumber(l.telefone) + '" target="_blank" rel="noopener">' + WA_SVG + "WhatsApp</a></td>";
      body.appendChild(tr);
    });
    $("#emptyState").hidden = rows.length !== 0;
    $("#fCount").textContent = rows.length + (rows.length === 1 ? " lead" : " leads");

    $all(".status-sel", body).forEach(function (sel) {
      sel.addEventListener("change", function () {
        sel.setAttribute("data-status", sel.value);
        updateStatus(sel.getAttribute("data-id"), sel.value);
      });
    });
  }

  /* ---------------- demonstracao ---------------- */
  function demoData() {
    var casos = ["Hemorroida", "Fissura", "Fístula", "Cisto pilonidal", "Estou com dor", "Estou com sangramento", "Preciso de orientação"];
    var nomes = ["Ana Paula Ribeiro", "Carlos Eduardo Mendes", "Fernanda Souza", "Roberto Almeida", "Juliana Castro",
      "Marcos Vinícius Lima", "Patrícia Gomes", "Eduardo Tavares", "Camila Ferreira", "Rafael Moreira",
      "Beatriz Nunes", "Luiz Henrique Dias", "Sandra Regina", "Thiago Barbosa"];
    var origens = [
      { utm_source: "instagram", utm_campaign: "hemorroida-laser" },
      { utm_source: "google", utm_campaign: "coloproctologista-votuporanga" },
      { utm_source: "facebook", utm_campaign: "remarketing" },
      { utm_source: "instagram", utm_campaign: "fissura-dor" },
      { utm_source: null, utm_campaign: null }
    ];
    var statuses = ["novo", "novo", "novo", "em_atendimento", "agendado", "perdido"];
    var ddd = ["17", "11", "18", "16"];
    var now = Date.now();
    return nomes.map(function (nome, i) {
      var o = origens[i % origens.length];
      var tel = "55" + ddd[i % ddd.length] + "9" + String(80000000 + i * 13579).slice(0, 8);
      return {
        id: "demo-" + i,
        nome: nome,
        telefone: tel,
        caso: casos[i % casos.length],
        utm_source: o.utm_source, utm_campaign: o.utm_campaign,
        status: statuses[i % statuses.length],
        created_at: new Date(now - i * 7.3 * 36e5).toISOString()
      };
    });
  }
  function startDemo() {
    state.demo = true; state.email = "Demonstração"; state.token = null;
    state.leads = demoData();
    enterApp(); populateFilters(); render();
  }

  /* ---------------- eventos ---------------- */
  function bind() {
    if (!SB_OK) { $("#loginNote").textContent = "Supabase ainda nao configurado. Use a demonstracao para visualizar o painel."; }

    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      $("#loginError").hidden = true;
      if (!SB_OK) { showErr("Supabase ainda nao configurado. Use a demonstracao."); return; }
      var btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "Entrando...";
      login($("#email").value.trim(), $("#senha").value).then(function (res) {
        btn.disabled = false; btn.textContent = "Entrar";
        if (res.ok && res.j.access_token) {
          state.token = res.j.access_token;
          state.email = (res.j.user && res.j.user.email) || $("#email").value.trim();
          state.demo = false; saveSession(); enterApp(); loadLeads();
        } else {
          showErr(res.j.error_description || res.j.msg || "E-mail ou senha invalidos.");
        }
      }).catch(function () { btn.disabled = false; btn.textContent = "Entrar"; showErr("Erro de conexao."); });
    });

    $("#demoBtn").addEventListener("click", startDemo);
    $("#logoutBtn").addEventListener("click", doLogout);
    $("#refreshBtn").addEventListener("click", function () { if (state.demo) render(); else loadLeads(); });

    ["#fSearch", "#fCaso", "#fOrigem", "#fStatus", "#fData"].forEach(function (s) {
      $(s).addEventListener("input", render);
      $(s).addEventListener("change", render);
    });
  }
  function showErr(m) { var e = $("#loginError"); e.textContent = m; e.hidden = false; }

  function init() {
    bind();
    var s = restoreSession();
    if (s && s.token && SB_OK) { state.token = s.token; state.email = s.email; state.demo = false; enterApp(); loadLeads(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
