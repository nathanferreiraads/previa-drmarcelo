/* ============================================================
   Dr. Marcelo Marciano · LP  ·  main.js
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.LP_CONFIG || {};
  var dl = (window.dataLayer = window.dataLayer || []);
  var REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------- helpers ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function isPlaceholder(v) { return !v || /XXXX|^\s*$/.test(v); }

  /* ---------------- injeta config no DOM ---------------- */
  function injectConfig() {
    $all("[data-config]").forEach(function (el) {
      var key = el.getAttribute("data-config");
      var val = CFG[key];
      if (val && String(val).trim() !== "" && !/^0+$/.test(String(val))) {
        el.textContent = val;
      }
    });
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    // aviso de compliance: CRM/RQE ainda em placeholder
    if (/0{4,}/.test(String(CFG.CRM || "")) || /0{4,}/.test(String(CFG.RQE || ""))) {
      console.warn("[LP] CRM/RQE ainda em placeholder. Preencha valores reais em js/config.js ANTES de veicular trafego (compliance CFM).");
    }
  }

  /* ---------------- captura de UTMs ---------------- */
  var UTM_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"];
  function captureUTMs() {
    var params = new URLSearchParams(location.search);
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem("lp_utms") || "{}"); } catch (e) {}
    var changed = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { stored[k] = v; changed = true; }
    });
    if (changed) { try { sessionStorage.setItem("lp_utms", JSON.stringify(stored)); } catch (e) {} }
    return stored;
  }
  function getUTMs() {
    try { return JSON.parse(sessionStorage.getItem("lp_utms") || "{}"); } catch (e) { return {}; }
  }

  /* ---------------- header scroll ---------------- */
  function headerScroll() {
    var h = $("#siteHeader");
    var onScroll = function () { h.classList.toggle("scrolled", window.scrollY > 30); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- FAB ---------------- */
  function fabToggle() {
    var fab = $(".fab");
    if (!fab) return;
    var onScroll = function () { fab.classList.toggle("show", window.scrollY > 280); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- smooth scroll ---------------- */
  function smoothLinks() {
    $all(".js-smooth").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id && id.charAt(0) === "#") {
          var t = $(id);
          if (t) { e.preventDefault(); t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" }); }
        }
      });
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  function revealObserver() {
    // stagger: entrada em cascata nos grupos (premium)
    [".cards-grid", ".timeline"].forEach(function (sel) {
      var grp = $(sel); if (!grp) return;
      $all(".reveal", grp).forEach(function (el, i) { el.style.transitionDelay = (i * 0.07).toFixed(2) + "s"; });
    });
    var els = $all(".reveal");
    if (REDUCE || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- contadores ---------------- */
  function counters() {
    var nums = $all(".stat-num[data-count]");
    if (!nums.length) return;
    var run = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (REDUCE) { el.textContent = target; return; }
      var dur = 1100, start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.floor(p * target * (2 - p)); // easeOut
        if (p < 1) requestAnimationFrame(step); else el.textContent = target;
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------------- mascara de telefone ---------------- */
  function phoneMask(input) {
    input.addEventListener("input", function () {
      var d = input.value.replace(/\D/g, "").slice(0, 11);
      var out = "";
      if (d.length > 0) out = "(" + d.slice(0, 2);
      if (d.length >= 2) out += ") ";
      if (d.length > 2 && d.length <= 6) out += d.slice(2);
      else if (d.length > 6 && d.length <= 10) out += d.slice(2, 6) + "-" + d.slice(6);
      else if (d.length > 10) out += d.slice(2, 7) + "-" + d.slice(7);
      input.value = out;
    });
  }

  /* ---------------- MODAL ---------------- */
  var modal, lastFocus, originCta = "", closeTimer = null;
  function openModal(origin) {
    originCta = origin || "";
    submitting = false;
    var btn = $("#submitBtn"); if (btn) btn.disabled = false;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    modal.classList.add("visible");
    void modal.offsetWidth; // reflow para a animacao de entrada tocar
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lastFocus = document.activeElement;
    setState("form");
    setTimeout(function () { var f = $("#nome"); if (f) f.focus(); }, 120);
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    closeTimer = setTimeout(function () { modal.classList.remove("visible"); }, REDUCE ? 0 : 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function setState(state) {
    $all(".modal-body", modal).forEach(function (b) { b.hidden = b.getAttribute("data-state") !== state; });
  }
  function trapFocus(e) {
    if (e.key === "Escape") { if (modal.classList.contains("open")) closeModal(); return; }
    if (e.key !== "Tab" || !modal.classList.contains("open")) return;
    var f = $all('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', $(".modal-card", modal))
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- chips (caso) com teclado de radiogroup ---------------- */
  function chips() {
    var hidden = $("#caso");
    var list = $all(".chip");
    if (!list.length) return;

    function select(c) {
      list.forEach(function (x) {
        x.classList.remove("active");
        x.setAttribute("aria-checked", "false");
        x.setAttribute("tabindex", "-1");
      });
      c.classList.add("active");
      c.setAttribute("aria-checked", "true");
      c.setAttribute("tabindex", "0");
      hidden.value = c.getAttribute("data-caso");
    }
    function move(i) {
      var n = (i + list.length) % list.length;
      list.forEach(function (x, j) { x.setAttribute("tabindex", j === n ? "0" : "-1"); });
      list[n].focus();
    }
    list.forEach(function (c, i) {
      c.setAttribute("tabindex", i === 0 ? "0" : "-1");
      c.addEventListener("click", function () { select(c); });
      c.addEventListener("keydown", function (e) {
        var idx = list.indexOf(c);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(idx + 1); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(idx - 1); }
      });
    });
  }

  /* ---------------- validacao ---------------- */
  function setError(name, show) {
    var input = $("#" + name);
    var err = $('[data-error="' + name + '"]');
    if (input) {
      input.classList.toggle("invalid", show);
      input.setAttribute("aria-invalid", show ? "true" : "false");
    }
    if (err) err.classList.toggle("show", show);
  }
  function validate() {
    var nome = $("#nome").value.trim();
    var tel = $("#telefone").value.replace(/\D/g, "");
    var okNome = nome.length >= 2;
    var okTel = tel.length >= 10;
    setError("nome", !okNome);
    setError("telefone", !okTel);
    if (!okNome) $("#nome").focus();
    else if (!okTel) $("#telefone").focus();
    return okNome && okTel;
  }

  /* ---------------- Supabase insert (keepalive) ---------------- */
  function saveLead(payload) {
    if (isPlaceholder(CFG.SUPABASE_URL) || isPlaceholder(CFG.SUPABASE_ANON_KEY)) {
      console.info("[LP] Supabase nao configurado: lead nao gravado em banco (so dataLayer).");
      return;
    }
    try {
      fetch(CFG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/leads", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": CFG.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + CFG.SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }).catch(function (e) { console.warn("[LP] Falha ao gravar lead:", e); });
    } catch (e) { console.warn("[LP] Erro Supabase:", e); }
  }

  /* ---------------- monta link do Tintim ---------------- */
  function buildWaLink(caso) {
    var base = CFG.TINTIM_LINK || "#";
    if (CFG.TINTIM_APPEND_TEXT && caso) {
      var msg = "Olá! Vim pelo site e gostaria de agendar uma consulta. Meu caso: " + caso + ".";
      base += (base.indexOf("?") === -1 ? "?" : "&") + "text=" + encodeURIComponent(msg);
    }
    return base;
  }

  /* ---------------- submit (mecanica de 5 passos) ---------------- */
  var submitting = false;
  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    // 1) validar
    if (!validate()) return;
    submitting = true;
    var btn = $("#submitBtn"); if (btn) btn.disabled = true;

    var caso = $("#caso").value || "Não informado";
    var nome = $("#nome").value.trim();
    var telLimpo = $("#telefone").value.replace(/\D/g, "");
    // BR tem 10-11 digitos (DDD + numero). Prefixa 55 pelo comprimento (nao quebra DDD 55).
    var telWa = telLimpo.length <= 11 ? "55" + telLimpo : telLimpo;
    var utms = getUTMs();
    var idLead = uuid();

    // 2) payload
    var payload = {
      nome: nome,
      telefone: telWa,
      caso: caso,
      utm_source: utms.utm_source || null,
      utm_medium: utms.utm_medium || null,
      utm_campaign: utms.utm_campaign || null,
      utm_content: utms.utm_content || null,
      utm_term: utms.utm_term || null,
      gclid: utms.gclid || null,
      fbclid: utms.fbclid || null,
      origem_cta: originCta || null,
      page_url: location.href,
      status: "novo"
    };

    // 3) gravar lead ANTES do redirect (keepalive)
    saveLead(payload);

    // 4) e 5) eventos: generate_lead + contact (sincronos, antes do click)
    var common = {
      caso: caso,
      origem_cta: originCta,
      lead_nome: nome,
      lead_whatsapp: telWa,
      utm_source: utms.utm_source || "",
      utm_medium: utms.utm_medium || "",
      utm_campaign: utms.utm_campaign || "",
      value: CFG.LEAD_VALUE || 0,
      currency: CFG.CURRENCY || "BRL"
    };
    dl.push(Object.assign({ event: "generate_lead", event_id: "gl_" + idLead }, common));
    dl.push(Object.assign({ event: "contact", event_id: "ct_" + idLead }, common));

    // 6) "clicar" no link oculto do Tintim DENTRO do gesto (evita bloqueio de popup)
    var link = buildWaLink(caso);
    var wa = $("#wa-redirect");
    wa.setAttribute("href", link);
    var successBtn = $("#successWa");
    if (successBtn) successBtn.setAttribute("href", link);

    wa.click(); // mesmo tick do submit: o navegador permite a nova aba

    // tela de sucesso (fallback caso o popup seja bloqueado)
    setState("success");
    var sb = $("#successWa"); if (sb) sb.focus();
  }

  /* ---------------- init ---------------- */
  function init() {
    injectConfig();
    captureUTMs();
    headerScroll();
    fabToggle();
    smoothLinks();
    revealObserver();
    counters();
    chips();

    modal = $("#formModal");
    $all(".js-open-form").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(b.getAttribute("data-cta") || "");
      });
    });
    $all(".js-close-form").forEach(function (b) { b.addEventListener("click", closeModal); });
    document.addEventListener("keydown", trapFocus);

    var tel = $("#telefone"); if (tel) phoneMask(tel);
    $("#nome").addEventListener("input", function () { setError("nome", false); });
    if (tel) tel.addEventListener("input", function () { setError("telefone", false); });

    $("#leadForm").addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
