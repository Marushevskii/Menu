/* Меню AIR LOUNGE & BAR. Все тексты берутся из data/*.json — в этом файле текстов нет. */
(function () {
  "use strict";

  const LS_KEY = "menu-lang";
  const FALLBACK = "en";

  // Простые иконки (линии), используются как заглушки фото и в вкладках
  const ICONS = {
    hookah: '<path d="M12 2v3M9 5h6M10 5l-1 6h6l-1-6M8 11h8v2a4 4 0 0 1-8 0v-2Z"/><path d="M9 17c-2 0-3 1-3 2.5S7 22 12 22s6-1 6-2.5S17 17 15 17"/><path d="M16 12h2a2 2 0 0 1 2 2v1"/>',
    cocktail: '<path d="M4 4h16l-8 9z"/><path d="M12 13v7M8 20h8"/><path d="M15 4l3-2"/>',
    shot: '<path d="M7 4h10l-1.5 16h-7z"/><path d="M7.6 10h8.8"/>',
    beer: '<path d="M6 7h10v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M6 7a3 3 0 0 1 5-2.5A3 3 0 0 1 16 7"/>',
    spirits: '<path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z"/><path d="M8 12h8"/>',
    wine: '<path d="M7 2h10v6a5 5 0 0 1-10 0z"/><path d="M12 13v8M8 21h8M7 6h10"/>',
    lemonade: '<path d="M6 6h12l-1.5 15h-9z"/><path d="M13 6l2-4"/><circle cx="12" cy="13" r="2.5"/>',
    soda: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M7 7h10M7 17h10"/>',
    tea: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1a3 3 0 0 1 0 6h-1"/><path d="M8 3v3M12 3v3"/>',
    milkshake: '<path d="M7 8h10l-1.5 13h-7z"/><path d="M6 8a6 4 0 0 1 12 0"/><path d="M13 4l2-2"/>',
    snack: '<path d="M4 10h16l-2 10H6z"/><path d="M7 10c0-3 2-6 5-6s5 3 5 6"/>',
    gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-2 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-3 3-5 3"/>',
    cake: '<path d="M4 21h16M5 21v-7h14v7"/><path d="M5 17c2 1 3-1 4.7 0s2.6 1 4.6 0 3 1 4.7 0"/><path d="M12 14v-4M12 7a1 1 0 0 0 1-1c0-1-1-2-1-2s-1 1-1 2a1 1 0 0 0 1 1z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3.5"/>',
    umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    telegram: '<path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/>',
    google: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    yandex: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><path d="M13 6v9M13 6h-1.5a2.5 2.5 0 0 0 0 5H13M11 11l-2 4"/>'
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.cocktail}</svg>`;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let settings, ui, tabs = {}, lang, currentTab;

  // Текст на текущем языке; если пусто — английский, потом русский
  const t = (obj) => (obj && (obj[lang] || obj[FALLBACK] || obj.ru)) || "";
  const u = (key) => t(ui[key]);

  function pickLang() {
    const codes = settings.languages.map((l) => l.code);
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (codes.includes(saved)) return saved;
    } catch (e) { /* приватный режим */ }
    for (const l of navigator.languages || [navigator.language || ""]) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (codes.includes(c)) return c;
    }
    return settings.defaultLang || FALLBACK;
  }

  function num(n) {
    return new Intl.NumberFormat(lang === "en" ? "en-US" : lang, { maximumFractionDigits: 2 }).format(n);
  }
  function money(p) { return `${num(p)} ${settings.currency}`; }
  // пустое поле из админки ("" или null) — значит «не указано»
  const has = (v) => v !== null && v !== undefined && v !== "";
  // путь к фото из админки может прийти как "/photos/x.webp" — сайт лежит в подпапке, поэтому без первого "/"
  const src = (p) => String(p || "").replace(/^\/+/, "");
  function amount(a, unit) { return !has(a) || !unit ? "" : `${num(a)} ${u("unit_" + unit)}`; }

  // ---------------- отрисовка ----------------
  function renderLangs() {
    $("langs").innerHTML = settings.languages.map((l) =>
      `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === lang}">${esc(l.label)}</button>`).join("");
  }

  function renderTabbar() {
    $("tabs").innerHTML = settings.tabs.map((id) => {
      const tab = tabs[id];
      return `<a class="tab" href="#${id}" data-tab="${id}" ${id === currentTab ? 'aria-current="page"' : ""}>${icon(tab.icon)}<span>${esc(t(tab.title))}</span></a>`;
    }).join("");
    // «линза» переезжает под активную вкладку
    const bar = $("tabbar");
    bar.style.setProperty("--n", settings.tabs.length);
    bar.style.setProperty("--i", settings.tabs.indexOf(currentTab));
  }

  function renderHero() {
    const tab = tabs[currentTab];
    // подпись «Меню» под заголовком — только там, где она уместна (в файле вкладки "menuLabel": false убирает её)
    $("hero").innerHTML = `<h1>${esc(t(tab.title))}</h1>${tab.menuLabel === false ? "" : `<span>${esc(u("menu"))}</span>`}`;
    fitHero();
  }

  // длинный заголовок (например «PROMOTIONS») уменьшаем, чтобы он целиком помещался в ширину экрана
  function fitHero() {
    const h = $("hero").querySelector("h1");
    if (!h) return;
    h.style.fontSize = "";
    const avail = $("hero").clientWidth - 32;
    const need = h.scrollWidth;
    if (need > avail) {
      const size = parseFloat(getComputedStyle(h).fontSize);
      h.style.fontSize = Math.floor(size * avail / need) + "px";
    }
  }

  // «Показывать фото позиций» выключено в админке — карточки без фото (классический вид меню)
  const photosOn = () => settings.showPhotos !== false;

  function photoHtml(it, sec) {
    if (!photosOn()) return "";
    if (it.photo) {
      return `<button class="photo" type="button" data-photo="${esc(src(it.photo))}" data-caption="${esc(t(it.name))}" aria-label="${esc(t(it.name))}">
        <img src="${esc(src(it.thumb || it.photo))}" alt="" decoding="async"></button>`;
    }
    return `<div class="photo">${icon(sec.icon)}</div>`;
  }

  function itemHtml(it, sec) {
    const desc = t(it.desc);
    const amt = amount(it.amount, it.unit);
    let price = "";
    if (has(it.price)) price = it.priceFrom ? u("priceFrom").replace("{price}", money(it.price)) : money(it.price);
    const vars = (it.variants || []).filter((v) => has(v.price));
    // варианты с подписью (джерки: куриные / свиные) — строками «подпись ··· цена»;
    // без подписи (лимонады 0,5 л / 1 л) — плашками
    const labeled = vars.some((v) => t(v.label));
    const variants = !vars.length ? "" : labeled
      ? `<div class="vrows">${vars.map((v) => `<div class="vrow"><span>${t(v.label) ? esc(t(v.label)) + (amount(v.amount, v.unit) ? ` <i class="vamt">${esc(amount(v.amount, v.unit))}</i>` : "") : esc(amount(v.amount, v.unit))}</span><span class="lead"></span><b>${esc(money(v.price))}</b></div>`).join("")}</div>`
      : `<div class="variants">${vars.map((v) => `<span class="variant">${esc(amount(v.amount, v.unit))} <b>${esc(money(v.price))}</b></span>`).join("")}</div>`;
    const amtHtml = amt ? `<div class="item-amount">${esc(amt)}</div>` : "";
    return `<article class="item">
      ${photoHtml(it, sec)}
      <div class="item-body">
        <div class="item-head"><div class="item-name">${esc(t(it.name))}</div>${price ? `<span class="lead"></span><div class="item-price">${esc(price)}</div>` : ""}</div>
        ${desc ? `<div class="item-desc">${esc(desc)}</div>` : ""}
        ${labeled ? variants + amtHtml : amtHtml + variants}
      </div>
    </article>`;
  }

  function builderHtml(it) {
    const steps = (it.steps || []).map((s, i) => `<li class="step"><span class="step-num">${i + 1}</span>
      <div><div class="step-title">${esc(t(s.title))}</div><div class="step-options">${esc(t(s.options))}</div></div></li>`).join("");
    return `<div class="builder">
      <div class="item-head"><div class="item-name">${esc(t(it.name))}</div>${has(it.price) ? `<div class="item-price">${esc(money(it.price))}</div>` : ""}</div>
      ${t(it.desc) ? `<div class="item-desc">${esc(t(it.desc))}</div>` : ""}
      ${steps ? `<ol class="steps">${steps}</ol>` : ""}
    </div>`;
  }

  function promoHtml(it) {
    return `<article class="promo"><div class="promo-icon">${icon(it.icon)}</div>
      <div><div class="promo-title">${esc(t(it.name))}</div><div class="promo-text">${esc(t(it.desc))}</div></div></article>`;
  }

  function renderTab() {
    const tab = tabs[currentTab];
    // «Коктейль вне меню» хранится отдельным блоком (в админке у него свои поля) — ставим его после нужного раздела
    let all = [...(tab.sections || [])];
    if (tab.offMenu) {
      const at = all.findIndex((x) => x.id === tab.offMenu.after);
      all.splice(at >= 0 ? at + 1 : all.length, 0, { ...tab.offMenu, layout: "builder" });
    }
    const sections = all
      .map((s) => ({ ...s, items: (s.items || []).filter((i) => !i.hidden) }))
      .filter((s) => s.items.length);

    $("content").innerHTML = sections.map((s) => {
      let body;
      if (s.layout === "builder") body = s.items.map((i) => (i.steps || []).length ? builderHtml(i) : `<div class="items">${itemHtml(i, s)}</div>`).join("");
      else if (s.layout === "promo") body = `<div class="items">${s.items.map(promoHtml).join("")}</div>`;
      else body = `<div class="items">${s.items.map((i) => itemHtml(i, s)).join("")}</div>`;
      const note = t(s.note);
      return `<section class="section" id="s-${s.id}" data-section="${s.id}">
        <h2 class="section-title">${esc(t(s.title))}</h2>
        ${note ? `<p class="section-note">${esc(note)}</p>` : ""}
        ${body}
      </section>`;
    }).join("");

    const chips = $("chips");
    $("chipsWrap").hidden = sections.length < 2;
    $("hero").classList.toggle("single", sections.length < 2);
    chips.innerHTML = sections.map((s, i) =>
      `<button type="button" class="chip${i === 0 ? " active" : ""}" data-target="${s.id}">${esc(t(s.title))}</button>`).join("");

    setupSpy();
    setupReveal();
  }

  // Плавное появление: всё, что на первом экране, видно сразу,
  // а карточки ниже проявляются, когда до них долистали.
  let revealObs = null;
  function revealNow(el) { el.classList.add("shown"); el.classList.remove("pre"); }
  function setupReveal() {
    if (revealObs) revealObs.disconnect();
    const els = $("content").querySelectorAll(".item, .promo, .builder, .section-title, .section-note");
    if (!("IntersectionObserver" in window)) return;
    revealObs = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { revealNow(e.target); revealObs.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("pre"); revealObs.observe(el); }
    });
  }
  // страховка: если гость прыгнул к разделу, всё, что уже на экране, точно показываем
  function revealVisible() {
    document.querySelectorAll(".pre").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) revealNow(el);
    });
  }

  function fadeIn() {
    ["content", "hero"].forEach((id) => {
      const c = $(id);
      c.classList.remove("fade");
      void c.offsetWidth;
      c.classList.add("fade");
    });
  }

  function renderFooter() {
    const w = settings.wifi || {};
    const wifi = w.show && w.name
      ? `<div class="wifi"><span>${esc(u("wifi"))}: <b>${esc(w.name)}</b></span><span>${esc(u("password"))}: <b>${esc(w.password)}</b></span></div>`
      : "";
    const socials = (settings.socials || []).map((s) =>
      `<a href="${esc(s.url || "#")}" class="${s.url ? "" : "empty"}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${icon(s.type)}</a>`).join("");
    $("footer").innerHTML = `
      <p class="rule">${esc(u("ownDrinks"))}</p>
      <p>${esc(u("orderHint"))}</p>
      ${wifi}
      <p>${esc(u("followUs"))}</p>
      <div class="socials">${socials}</div>`;
  }

  function renderAll() {
    document.documentElement.lang = lang;
    document.body.classList.toggle("no-photos", !photosOn());
    document.title = u("pageTitle");
    // «&» в названии стоит ближе к соседним словам (пробелы вокруг него вдвое уже)
    $("brand").innerHTML = esc(settings.name).replace(/ &amp; /g, '<span class="amp">&amp;</span>');
    $("viewerClose").setAttribute("aria-label", u("close"));
    renderLangs();
    renderTabbar();
    renderHero();
    renderTab();
    renderFooter();
  }

  // ---------------- поведение ----------------
  // Подсветка текущего раздела в ленте чипсов.
  // pinned — раздел, выбранный нажатием: держим его, пока гость сам не начнёт листать
  // (иначе короткие разделы в конце страницы, вроде «Вина» или «VIP», не подсвечивались бы).
  let pinned = null, spyTick = false;

  function setActiveChip(id) {
    const chips = $("chips");
    chips.querySelectorAll(".chip").forEach((c) => {
      const on = c.dataset.target === id;
      if (on && !c.classList.contains("active")) chips.scrollTo({ left: c.offsetLeft - 16, behavior: "smooth" });
      c.classList.toggle("active", on);
    });
  }

  function updateSpy() {
    spyTick = false;
    revealVisible();
    const secs = [...document.querySelectorAll(".section")];
    if (!secs.length) return;
    if (pinned) return setActiveChip(pinned);
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const line = $("chips").offsetHeight + 24;
    let id = secs[0].dataset.section;
    for (const s of secs) if (s.getBoundingClientRect().top <= line) id = s.dataset.section;
    if (atBottom) {
      // внизу страницы — последний раздел, который виден целиком
      const visible = secs.filter((s) => s.getBoundingClientRect().top < window.innerHeight - 80);
      if (visible.length) id = visible[visible.length - 1].dataset.section;
    }
    setActiveChip(id);
  }

  function setupSpy() {
    pinned = null;
    updateSpy();
  }

  function setTab(id, scroll) {
    if (!tabs[id]) id = settings.tabs[0];
    if (id === currentTab) return;
    currentTab = id;
    renderTabbar();
    renderHero();
    renderTab();
    fadeIn();
    if (scroll) window.scrollTo({ top: 0 });
  }

  function bind() {
    $("langs").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-lang]");
      if (!b || b.dataset.lang === lang) return;
      lang = b.dataset.lang;
      try { localStorage.setItem(LS_KEY, lang); } catch (err) { /* ничего */ }
      const y = window.scrollY;
      renderAll();
      window.scrollTo({ top: y });
    });

    // на компьютере: ленту можно тянуть мышкой и крутить колёсиком (на телефоне — обычный свайп)
    const strip = $("chips");
    let drag = null, dragged = false;
    strip.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      drag = { x: e.clientX, left: strip.scrollLeft };
      dragged = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) dragged = true;
      strip.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => { drag = null; });
    strip.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      strip.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });

    $("chips").addEventListener("click", (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      if (dragged) { dragged = false; return; } // это было перетаскивание, а не нажатие
      const sec = document.getElementById("s-" + c.dataset.target);
      pinned = c.dataset.target;
      setActiveChip(pinned);
      if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - $("chips").offsetHeight + 1, behavior: "smooth" });
    });
    // гость сам листает — снова следим за прокруткой
    const unpin = () => { if (pinned) { pinned = null; updateSpy(); } };
    ["touchstart", "wheel", "keydown"].forEach((ev) => window.addEventListener(ev, unpin, { passive: true }));

    window.addEventListener("hashchange", () => setTab(location.hash.slice(1), true));
    window.addEventListener("resize", fitHero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHero); // шрифт догрузился — пересчитать

    const chips = $("chips");
    window.addEventListener("scroll", () => {
      // подложка под лентой разделов появляется плавно, по мере прокрутки
      const hero = $("hero");
      const start = hero.offsetTop + hero.offsetHeight - 50;
      $("chipsBg").style.opacity = Math.min(1, Math.max(0, (window.scrollY - start) / 50)).toFixed(3);
      if (!spyTick) { spyTick = true; requestAnimationFrame(updateSpy); }
    }, { passive: true });

    // просмотр фото
    $("content").addEventListener("click", (e) => {
      const p = e.target.closest("button.photo");
      if (!p) return;
      $("viewerImg").src = p.dataset.photo;
      $("viewerCaption").textContent = p.dataset.caption;
      $("viewer").hidden = false;
    });
    const closeViewer = () => { $("viewer").hidden = true; $("viewerImg").src = ""; };
    $("viewer").addEventListener("click", closeViewer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeViewer(); });
  }

  // ---------------- загрузка ----------------
  async function load(name) {
    const r = await fetch(`data/${name}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(name);
    return r.json();
  }

  async function init() {
    // site.json — техническое (вкладки, языки, валюта), settings.json — то, что правят в админке
    const [site, edit] = await Promise.all([load("site"), load("settings")]);
    settings = { ...site, ...edit };
    const [uiData, ...tabData] = await Promise.all([load("ui"), ...settings.tabs.map(load)]);
    ui = uiData;
    tabData.forEach((tb) => { tabs[tb.id] = tb; });
    lang = pickLang();
    const fromHash = location.hash.slice(1);
    currentTab = tabs[fromHash] ? fromHash : settings.tabs[0];
    // настоящее преломление стекла — только там, где браузер это умеет (Chrome, не iPhone)
    const ua = navigator.userAgent;
    if (/Chrome\//.test(ua) && !/iPhone|iPad|iPod/.test(ua) && window.CSS && CSS.supports("backdrop-filter", "url(#liquid)")) {
      document.documentElement.classList.add("refract");
    }
    renderAll();
    bind();
    $("loading").classList.add("done");
  }

  init().catch((e) => {
    console.error(e);
    $("loading").textContent = "Menu is temporarily unavailable";
  });
})();
