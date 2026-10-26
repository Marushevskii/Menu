/* Оформление страниц мероприятий. Тема выбирается в админке (поле «Оформление страницы» у мероприятия).
   Тема отдаёт украшения:
     icon()    — вокруг главного значка вверху (за ним); noIcon: true — значок не показывать;
     scene()   — картинка-сцена между значком и названием;
     content() — фон за меню (мерцающие звёзды, паутина, привидение, предметы по краям);
     titleDeco(i) — предмет в конце строки с названием i-го раздела;
     fixed()   — закреплённый фон основного меню (когда меню в оформлении мероприятия, но это не его страница);
     vars      — CSS-переменные (необязательно).
   Всё векторное (SVG прямо в коде) — без картинок, чтобы страница не тормозила на телефоне.
   Стили тем — в assets/style.css, блок «ТЕМЫ МЕРОПРИЯТИЙ». */
window.EVENT_THEMES = (function () {
  "use strict";

  // предсказуемый «случай»: одинаковые кляксы и звёзды при каждом открытии
  function rnd(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const f = (n) => n.toFixed(1);

  // неровное пятно (сглаженный многоугольник) — для «морей» и светлых участков луны
  function blob(cx, cy, rad, r) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, k = rad * (0.6 + r() * 0.55);
      pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * (0.75 + r() * 0.35)]);
    }
    let d = "";
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      d += (i ? "" : `M${f((pts[n - 1][0] + p[0]) / 2)} ${f((pts[n - 1][1] + p[1]) / 2)}`) + `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
    });
    return d + "Z";
  }
  // текстура луны: крупные тёмные «моря», мелкие пятна, светлые участки и пара кратеров
  function moonTexture() {
    const r = rnd(42);
    const layer = (count, rMin, rMax, color, op) => {
      let d = "";
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2, dist = r() * 52;
        d += blob(200 + Math.cos(a) * dist, 82 + Math.sin(a) * dist, rMin + r() * (rMax - rMin), r);
      }
      return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
    };
    return layer(6, 12, 22, "#a39066", ".55")   // большие тёмные «моря» (серо-оливковые, как на референсах)
      + layer(10, 5, 11, "#b9a274", ".5")         // средние пятна
      + layer(18, 2, 5, "#97845c", ".45")         // мелкие тёмные крапинки
      + layer(8, 6, 14, "#fff9e8", ".45")         // светлые участки
      + `<g fill="none" stroke="#8f7c55" stroke-opacity=".55" stroke-width="1.2"><circle cx="164" cy="98" r="4.5"/><circle cx="238" cy="70" r="3.2"/><circle cx="176" cy="60" r="2.6"/><circle cx="246" cy="98" r="2.2"/></g>`;
  }

  // ---------- ночная сцена: луна, кривой замок, кладбище, тыквы-фонари на поле ----------
  // низкая и широкая (400×160), чтобы верх страницы не занимал полэкрана
  function scene() {
    const r = rnd(7);
    let stars = "", big = 0;
    for (let i = 0; i < 26; i++) {
      const x = r() * 400, y = r() * 96;
      if (Math.hypot(x - 200, y - 80) < 84) continue; // не на луне
      // каждая вторая звезда мерцает (размер тот же, меняется только яркость);
      // самые крупные (радиус от 1) мерцают быстро. Порядок вызовов r() прежний — положения и размеры звёзд не меняются
      let tw = i % 2 ? "" : ` class="hw-star" style="animation-duration:${(2.6 + r() * 2.4).toFixed(1)}s;animation-delay:-${(r() * 5).toFixed(1)}s"`;
      const rad = 0.5 + r() * 0.8;
      if (rad >= 1) {
        // крупные: редкая плавная вспышка (раз в 4–6 с); моменты вспышек разнесены, чтобы не загорались разом
        // у всех крупных один ритм (вспышка раз в 6 с), k-я сдвинута на k·1.2 с — по очереди и никогда разом
        const dur = 6, peak = 0.6 + big * 1.2;
        const delay = (((0.7 * dur - peak) % dur) + dur) % dur;
        tw = ` class="hw-star hw-star-big" style="animation-duration:${dur.toFixed(1)}s;animation-delay:-${delay.toFixed(2)}s"`;
        big++;
      }
      stars += `<circle${tw} cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`;
    }
    const K = "#060706";                       // силуэты
    const W = "#f2b45a";                       // горящие окна
    // тыква-фонарь: тёмный силуэт, светится только вырезанное лицо
    // тыква-фонарь — такой же тёмный силуэт, как замок; светится только вырезанное лицо, отсвет падает на землю,
    // спереди её прикрывает трава (pumpkinGrass) — так она стоит в поле, а не наложена сверху
    const pumpkin = (x, y, s, flip, blink) => `<ellipse cx="${x}" cy="${f(y + 14 * s)}" rx="${f(30 * s)}" ry="${f(6 * s)}" fill="url(#hwFace)" opacity=".28"/>`
      + `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">`
      + `<path d="M-17 2C-17-9-9-14 0-14S17-9 17 2 9 15 0 15-17 13-17 2z" fill="${K}"/>`
      + `<path d="M-6-13C-11-8-11 9-6 14M6-13C11-8 11 9 6 14" stroke="#2a170a" stroke-width="1.3" fill="none"/>`
      + `<path d="M0-13C0-17 2-20 6-20" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      + `<path d="M6-20c3 0 4 2 3 4" stroke="${K}" stroke-width="1.2" fill="none"/>`
      + `<g fill="url(#hwCarve)"><g class="hw-eyes" style="animation-delay:${blink || 0}s"><path d="M-11-4l7-3-2 6z"/><path d="M11-4l-7-3 2 6z"/></g><path d="M-1 0l1-3 1 3z"/>`
      + `<path d="M-12 4c3 6 21 6 24 0l-3 3-2-2-3 3-2-2-2 2-3-3-2 2-3-3-2 2z"/></g></g>`;
    // пучки травы перед тыквами (закрывают низ)
    const pumpkinGrass = (list) => list.map(([cx, y, w]) => {
      let d = "";
      for (let x = cx - w; x < cx + w; x += 2.2 + r() * 2.4) {
        const h = 3 + r() * 5;
        d += `M${f(x)} ${f(y + 3)}l${f(0.8 + r() * 1.6)} -${f(h)} ${f(0.9 + r() * 0.8)} ${f(h)}z`;
      }
      return d + `M${cx - w} ${y + 1}h${2 * w}v4h-${2 * w}z`;
    }).join("");
    const tomb = (x, y, h) => `<path d="M${x} ${y}v-${h}a7 7 0 0 1 14 0v${h}z" fill="${K}"/>`;
    const cross = (x, y, h) => `<path d="M${x - 1.6} ${y}v-${h}h3.2v${h}zM${x - 6} ${y - h + 5}h12v3h-12z" fill="${K}"/>`;
    // трава по краю поля
    let grass = "";
    for (let x = 0; x < 400; x += 5 + r() * 5) {
      const y = 132 - Math.sin(x / 64) * 5 + (x > 160 && x < 245 ? 4 : 0), h = 3 + r() * 6;
      if (x > 184 && x < 218) continue;           // перед светящейся дверью травы нет
      grass += `M${f(x)} ${f(y + 2)}l${f(1 + r() * 2)} -${f(h)} ${f(1 + r())} ${f(h)}z`;
    }
    return `<svg class="hw-scene-svg" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">`
      + `<defs><radialGradient id="hwMoon" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="#fdf3d8"/><stop offset=".6" stop-color="#f0d9a3"/><stop offset="1" stop-color="#e6c88e"/></radialGradient>`
      + `<radialGradient id="hwGlow"><stop offset=".72" stop-color="#f3dca6" stop-opacity=".62"/><stop offset=".76" stop-color="#f1d9a0" stop-opacity=".38"/><stop offset=".82" stop-color="#eed49a" stop-opacity=".18"/><stop offset=".9" stop-color="#ebd196" stop-opacity=".07"/><stop offset="1" stop-color="#ebd196" stop-opacity="0"/></radialGradient>`
      + `<clipPath id="hwMoonClip"><circle cx="200" cy="82" r="60"/></clipPath>`
      + `<radialGradient id="hwLimb" cx=".5" cy=".5" r=".5"><stop offset=".72" stop-color="#9c7a45" stop-opacity="0"/><stop offset="1" stop-color="#a88a55" stop-opacity=".16"/></radialGradient>`
      + `<radialGradient id="hwFace"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff7b1a" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="hwCarve" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffd27a"/><stop offset=".7" stop-color="#ff9a32"/><stop offset="1" stop-color="#d9661c"/></radialGradient>`
      + `<linearGradient id="hwDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf7a"/><stop offset="1" stop-color="#e8862f"/></linearGradient></defs>`
      + `<g fill="#fff">${stars}</g>`
      + `<circle cx="200" cy="82" r="82" fill="url(#hwGlow)"/>`
      + `<circle cx="200" cy="82" r="60" fill="url(#hwMoon)"/>`
      + `<g clip-path="url(#hwMoonClip)">${moonTexture()}<circle cx="200" cy="82" r="60" fill="url(#hwLimb)"/></g>`
      // кривые ветки по верхним углам
      + `<g fill="none" stroke="${K}" stroke-linecap="round">`
      + `<path stroke-width="5" d="M-4 4C20 10 34 6 50 18"/><path stroke-width="2.4" d="M28 9C34 20 30 28 38 34M50 18C58 22 60 30 70 28M44 14C52 4 60 6 66 0"/><path stroke-width="1.3" d="M38 34c-2 4 1 6 4 5M70 28c4 0 6 3 4 6M66 0c4 2 8 0 8-4"/>`
      + `<path stroke-width="5" d="M404 8C380 12 368 8 352 20"/><path stroke-width="2.4" d="M374 11C368 22 372 30 364 36M352 20C344 24 342 32 332 30M358 16C350 6 342 8 336 2"/><path stroke-width="1.3" d="M364 36c2 4-1 6-4 5M332 30c-4 0-6 3-4 6M336 2c-4 2-8 0-8-4"/>`
      + `</g>`
      // кривой сказочный замок
      + `<g fill="${K}">`
      + `<path d="M161 140L165 96 238 93 242 140z"/>`
      + `<path d="M154 99L248 93 244 86 158 91z"/>`
      + `<path d="M170 93L172 64 189 62 188 93z"/><path d="M165 66Q178 56 180 40Q181 31 189 29Q184 35 186 42Q189 55 194 63z"/>`
      + `<path d="M193 93L195 50 214 48 216 93z"/><path d="M190 52Q202 38 203 20Q204 11 213 8Q206 15 208 23Q211 38 220 49z"/>`
      + `<path d="M219 93L221 68 236 67 236 93z"/><path d="M216 70Q228 61 229 48Q230 41 237 40Q233 45 234 51Q236 60 241 68z"/>`
      + `<path d="M150 140L151 112 162 110 163 140z"/><path d="M147 113Q154 106 155 98Q160 104 166 111z"/>`
      + `</g>`
      + `<g fill="${W}">` + [
        ["M176 72h6v9h-6z", 0], ["M200 58h7v10h-7z", -2.5], ["M201 76h5v7h-5z", -5], ["M225 74h6v8h-6z", -7.5],
        ["M168 104h7v8h-7z", -10], ["M228 103h7v8h-7z", -12.5], ["M154 118h5v7h-5z", -15]
      ].map(([d, delay]) => `<path class="hw-win" style="animation-delay:${delay}s" d="${d}"/>`).join("") + `</g>`
      + `<path d="M188 140V120Q201 100 214 120V140z" fill="url(#hwDoor)"/>`
      + `<path d="M201 140v-25" stroke="#9a5418" stroke-width="1.1"/><circle cx="205" cy="130" r="1.1" fill="#9a5418"/>`
      // поле
      + `<path d="M0 160V134C60 124 120 132 168 138C230 146 300 126 400 124V160z" fill="${K}"/>`
      + `<path d="${grass}" fill="${K}"/>`
      // кладбище слева и справа
      + cross(28, 136, 22) + tomb(46, 138, 10) + cross(76, 136, 15) + tomb(92, 140, 6)
      + `<path d="M0 124h40M0 130h40" stroke="${K}" stroke-width="1.8"/>`
      + `<g fill="${K}">${[3, 13, 23, 33].map((x) => `<path d="M${x} 136V120l2-3 2 3v16z"/>`).join("")}</g>`
      + tomb(352, 132, 8) + cross(380, 132, 18)
      // тыквы-фонари на поле перед замком
      + pumpkin(122, 141, 0.8, false, -1.2) + pumpkin(274, 137, 0.88, true, -3.6) + pumpkin(322, 143, 0.62, false, -5.4)
      + `<path d="${pumpkinGrass([[122, 152, 15], [274, 149, 17], [322, 151, 12]])}" fill="${K}"/>`
      + `</svg>`;
  }

  // ---------- звёздное небо для фона страницы (плитка, повторяется) ----------
  function starsTile() {
    const r = rnd(101);
    let c = "";
    for (let i = 0; i < 46; i++) {
      c += `<circle cx="${f(r() * 390)}" cy="${f(r() * 640)}" r="${f(0.4 + r() * 0.9)}" fill="#fff" opacity="${(0.12 + r() * 0.45).toFixed(2)}"/>`;
    }
    for (let i = 0; i < 6; i++) {
      c += `<circle cx="${f(r() * 390)}" cy="${f(r() * 640)}" r="${f(1 + r() * 0.6)}" fill="#f6e2b0" opacity="${(0.35 + r() * 0.3).toFixed(2)}"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="640" viewBox="0 0 390 640">${c}</svg>`;
  }
  const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  // ---------- привидение, летучая мышь, паутина, паук ----------
  // привидение: полупрозрачное тело цвета луны, книзу растворяется; лунная обводка; тёмные глаза и раскрытый рот
  const GHOST = `<svg viewBox="0 0 64 84" aria-hidden="true"><defs><linearGradient id="hwGhost" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="#f0d9a3" stop-opacity=".55"/><stop offset=".65" stop-color="#f0d9a3" stop-opacity=".22"/><stop offset="1" stop-color="#f0d9a3" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="hwGhostLine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d9a3" stop-opacity=".8"/><stop offset="1" stop-color="#f0d9a3" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="M32 3C17 3 10 15 10 30c0 8-3 12-8 16 5 1 8-1 9-3 0 10-2 18-6 26 5 0 8-3 10-6 0 8 2 14 6 18 2-5 4-9 7-11 1 6 4 9 8 11 2-4 3-8 4-12 3 4 6 6 11 6-2-6-3-12-2-19 2 3 5 5 9 5-3-5-4-12-4-20 2 2 5 3 8 2-4-4-7-8-7-16C55 15 47 3 32 3z" fill="url(#hwGhost)" stroke="url(#hwGhostLine)" stroke-width="1.4"/>`
    + `<ellipse cx="24" cy="26" rx="4.6" ry="7" fill="#0b0c0a"/><ellipse cx="40" cy="26" rx="4.6" ry="7" fill="#0b0c0a"/>`
    + `<ellipse cx="32" cy="46" rx="7.5" ry="12" fill="#0b0c0a"/><ellipse cx="32" cy="50" rx="4" ry="6" fill="#1d1a12"/></svg>`;
  const BAT = `<svg viewBox="0 0 64 28" aria-hidden="true"><path fill="currentColor" d="M32 10c-2-4-4-5-5-3-2-3-5-4-9-1-4-4-10-4-16 0 5 1 8 4 9 8 3-2 7-1 9 2 3-3 7-2 9 2l3 3 3-3c2-4 6-5 9-2 2-3 6-4 9-2 1-4 4-7 9-8-6-4-12-4-16 0-4-3-7-2-9 1-1-2-3-1-5 3z"/></svg>`;
  function web() {
    // паутина из угла: лучи + провисающие нити между ними
    const rays = [0, 14, 30, 47, 64, 78, 90].map((a) => a * Math.PI / 180);
    let s = "";
    rays.forEach((a) => { s += `<path d="M0 0L${f(120 * Math.cos(a))} ${f(120 * Math.sin(a))}"/>`; });
    [16, 31, 47, 64, 82, 101, 118].forEach((rad) => {
      let p = "";
      rays.forEach((a, i) => {
        const x = rad * Math.cos(a), y = rad * Math.sin(a);
        if (!i) { p += `M${f(x)} ${f(y)}`; return; }
        const m = (a + rays[i - 1]) / 2, sag = rad * 0.84;
        p += `Q${f(sag * Math.cos(m))} ${f(sag * Math.sin(m))} ${f(x)} ${f(y)}`;
      });
      s += `<path d="${p}"/>`;
    });
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".55">${s}</g></svg>`;
  }
  const SPIDER = `<svg viewBox="0 0 30 26" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">`
    + `<path d="M11 11L4 6 1 9M11 13L3 12 0 16M11 15L4 18 2 23M12 17L7 22 6 26M19 11l7-5 3 3M19 13l8-1 3 4M19 15l7 3 2 5M18 17l5 5 1 4"/></g>`
    + `<ellipse cx="15" cy="14" rx="5" ry="6" fill="currentColor"/><circle cx="15" cy="7.5" r="3.4" fill="currentColor"/>`
    + `<circle cx="13.8" cy="7" r=".8" fill="#e8742a"/><circle cx="16.2" cy="7" r=".8" fill="#e8742a"/></svg>`;

  // ---------- предметы-украшения: только палитра страницы ----------
  // тёмное тело (как силуэты замка), тонкая лунная обводка, тёплый оранжевый свет (как окна и тыквы),
  // капля тёмно-красного — только на сердце куклы
  const D = "#121510", G = "#f0d9a3", L = "#f2b45a", LD = "#d9661c", R = "#8e1a1f";
  const O = `stroke="${G}" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"`;
  const ITEMS = {
    // котёл со светящимся зельем
    cauldron: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="hwPot"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="${LD}"/></radialGradient></defs>`
      + `<ellipse cx="32" cy="27" rx="22" ry="9" fill="${L}" opacity=".18"/>`
      + `<path d="M44 6l-9 28" stroke="${G}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`
      + `<g fill="${L}">`
      + `<circle class="hw-bub" style="animation-delay:0s" cx="24" cy="18" r="3"/><circle class="hw-bub" style="animation-delay:-.5s" cx="31" cy="12" r="2.2"/>`
      + `<circle class="hw-bub" style="animation-delay:-1s" cx="19" cy="11" r="1.6"/><circle class="hw-bub" style="animation-delay:-1.5s" cx="37" cy="21" r="2"/>`
      + `<circle class="hw-bub" style="animation-delay:-.25s" cx="27" cy="5" r="1.5"/><circle class="hw-bub" style="animation-delay:-.9s" cx="35" cy="7" r="1.2"/>`
      + `<circle class="hw-bub" style="animation-delay:-1.7s" cx="22" cy="3.5" r="1.1"/></g>`
      + `<path d="M8 30C8 48 18 56 32 56S56 48 56 30z" fill="${D}" ${O}/>`
      + `<ellipse cx="32" cy="29" rx="25" ry="5.5" fill="${D}" ${O}/><ellipse cx="32" cy="29" rx="20" ry="3.4" fill="url(#hwPot)"/>`
      + `<path d="M16 54l-3 6M48 54l3 6M32 57v5" stroke="${G}" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>`
      + `<circle cx="11" cy="40" r="3.6" fill="none" ${O}/><path d="M18 37c4-2 10-3 14-3" stroke="${G}" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/></svg>`,
    // банка с глазом: мутная лунная жидкость, оранжевая радужка
    jar: `<svg viewBox="0 0 48 64" aria-hidden="true">`
      + `<rect x="10" y="2" width="28" height="8" rx="2" fill="${D}" ${O}/>`
      + `<path d="M8 12h32v44a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="${G}" fill-opacity=".07" ${O}/>`
      + `<path d="M9 26h30v30a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5z" fill="${G}" opacity=".14"/>`
      + `<path d="M20 44c-4 4-8 6-10 12M22 46c0 5 3 8 6 11" stroke="${R}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>`
      + `<circle cx="24" cy="38" r="9" fill="#d8cdb2"/><circle cx="26" cy="38" r="5" fill="${L}"/><circle cx="26" cy="38" r="5" fill="none" stroke="${LD}" stroke-width="1.2"/>`
      + `<circle cx="26.6" cy="38" r="2.4" fill="#0b0b0b"/><circle cx="24.8" cy="36.2" r="1" fill="#fff"/>`
      + `<path d="M17 34l3 2M16 40l3-1" stroke="${R}" stroke-width=".9"/>`
      + `<g fill="${G}" opacity=".35"><circle cx="14" cy="30" r="1.2"/><circle cx="35" cy="48" r="1.5"/><circle cx="33" cy="30" r="1"/></g></svg>`,
    // кукла вуду: тёмная мешковина, лунные стежки, булавки с золотыми/оранжевыми головками
    voodoo: `<svg viewBox="0 0 56 64" aria-hidden="true">`
      + `<path d="M28 4c7 0 11 5 11 11 0 4-2 7-4 9l10 4c3 1 4 5 1 7l-9-2v12l7 13c1 3-2 5-5 4l-11-11-11 11c-3 1-6-1-5-4l7-13V33l-9 2c-3-2-2-6 1-7l10-4c-2-2-4-5-4-9 0-6 4-11 11-11z" fill="#1d1a12" ${O}/>`
      + `<path d="M28 26v22M23 19h10" stroke="${G}" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 2"/>`
      + `<path d="M22 11l4 4M26 11l-4 4M30 11l4 4M34 11l-4 4" stroke="${L}" stroke-width="1.6" stroke-linecap="round"/>`
      + `<path d="M28 33c-1.6-2.2-5-1-3.6 1.6L28 38l3.6-3.4c1.4-2.6-2-3.8-3.6-1.6z" fill="${R}"/>`
      + `<g class="hw-pin-l"><path d="M20 30l-14-9" stroke="${G}" stroke-opacity=".75" stroke-width="1.1"/><circle cx="6" cy="21" r="2.6" fill="${L}"/></g>`
      + `<g class="hw-pin-r"><path d="M36 40l14-6" stroke="${G}" stroke-opacity=".75" stroke-width="1.1"/><circle cx="50" cy="34" r="2.6" fill="${G}"/></g>`
      + `<path d="M24 46l-10 9" stroke="${G}" stroke-opacity=".75" stroke-width="1.1"/><circle cx="14" cy="55" r="2.6" fill="${LD}"/></svg>`,
    // бутылка яда: светящаяся оранжевая жидкость, лунная этикетка с черепом
    poison: `<svg viewBox="0 0 40 64" aria-hidden="true"><defs><linearGradient id="hwPoison" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}"/><stop offset="1" stop-color="${LD}"/></linearGradient></defs>`
      + `<rect x="15" y="2" width="10" height="8" rx="2" fill="${D}" ${O}/>`
      + `<path d="M14 10h12v10l8 8v28a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V28l8-8z" fill="${G}" fill-opacity=".06" ${O}/>`
      + `<path d="M7 34h26v22a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5z" fill="url(#hwPoison)" opacity=".75"/>`
      + `<rect x="10" y="36" width="20" height="14" rx="1.5" fill="#d8cdb2"/>`
      + `<g fill="${D}"><circle cx="20" cy="41.5" r="3.4"/><rect x="18" y="44" width="4" height="2.2" rx=".6"/></g>`
      + `<g fill="#d8cdb2"><circle cx="18.8" cy="41.2" r=".9"/><circle cx="21.2" cy="41.2" r=".9"/></g>`
      + `<path d="M15 47.5l10-1.6M15 46l10 1.6" stroke="${D}" stroke-width="1"/></svg>`,
    // голова зомби: тёмный силуэт с лунным контуром, глаза-провалы с тусклыми огоньками
    zombie: `<svg viewBox="0 0 64 64" aria-hidden="true">`
      + `<path d="M8 30C8 14 18 6 32 6s24 8 24 24c0 12-6 22-12 26H20C14 52 8 42 8 30z" fill="#1a1d17" ${O}/>`
      + `<path d="M8 32c-4 0-5 7 0 8M56 32c4 0 5 7 0 8" fill="#1a1d17" ${O}/>`
      + `<ellipse cx="23" cy="28" rx="7.5" ry="8.5" fill="#050605"/><ellipse cx="41" cy="28" rx="7.5" ry="8.5" fill="#050605"/>`
      + `<circle cx="24" cy="30" r="1.6" fill="${L}"/><circle cx="40" cy="30" r="1.6" fill="${L}"/>`
      + `<path d="M22 47c4-4 16-4 20 0" fill="#050605" stroke="#050605" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M28 44.6v2.8h3v-3.2M33 44.4v3h3v-2.6" fill="#d8cdb2"/>`
      + `<path d="M30 8l-2-4M36 9l2-5M33 8V3" stroke="${G}" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>`
      + `<path d="M44 12l6 6M45 15l2-2M48 18l2-2" stroke="${G}" stroke-opacity=".55" stroke-width="1"/></svg>`,
    // голова мумии: тёмная, лунные бинты, оранжевые светящиеся глаза
    mummy: `<svg viewBox="0 0 56 64" aria-hidden="true">`
      + `<path d="M28 4C14 4 7 15 7 30c0 16 9 28 21 28s21-12 21-28C49 15 42 4 28 4z" fill="#1a1d17" ${O}/>`
      + `<g fill="none" stroke="${G}" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round">`
      + `<path d="M9 18c10 4 26 4 38-2M8 27c14 2 26 0 40 3M9 42c12-3 26-2 39 1M12 50c10 3 22 3 32-1M14 11c8 3 18 2 28-2"/></g>`
      + `<path d="M46 16l8-4M47 19l7 2" stroke="${G}" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`
      + `<rect x="9" y="30" width="38" height="11" rx="3" fill="#050605"/>`
      + `<circle cx="20" cy="35.5" r="3.2" fill="${L}"/><circle cx="36" cy="35.5" r="3.2" fill="${L}"/>`
      + `<path d="M22 48l3 2 3-2 3 2 3-2" stroke="#d8cdb2" stroke-width="1.2" fill="none"/></svg>`,
    // голова дьявола: тёмно-красная, рожки, оранжевые глаза, клыки
    devil: `<svg viewBox="0 0 64 64" aria-hidden="true">`
      + `<path d="M14 18C10 12 9 6 11 2c3 6 8 9 13 11M50 18c4-6 5-12 3-16-3 6-8 9-13 11" fill="#3a1416" ${O}/>`
      + `<path d="M32 12c-13 0-20 10-20 22 0 8 3 13 8 18l4 6c2 3 6 4 8 4s6-1 8-4l4-6c5-5 8-10 8-18 0-12-7-22-20-22z" fill="#3a1416" ${O}/>`
      + `<path d="M8 32c-3 0-4 6 2 8M56 32c3 0 4 6-2 8" fill="#3a1416" ${O}/>`
      + `<path d="M18 30l10 4-2 4-8-3zM46 30l-10 4 2 4 8-3z" fill="${L}"/>`
      + `<path d="M17 27l12 5M47 27l-12 5" stroke="#050605" stroke-width="2.2" stroke-linecap="round"/>`
      + `<path d="M21 46c6 4 16 4 22 0-2 6-6 8-11 8s-9-2-11-8z" fill="#050605"/>`
      + `<path d="M24 47l2 4 2-3 2 4 2-4 2 4 2-3 2 3 2-4" fill="#d8cdb2"/></svg>`,
    // коса: лунное древко, тёмное лезвие с лунной кромкой, капли тёмной крови
    scythe: `<svg viewBox="0 0 64 64" aria-hidden="true">`
      + `<path d="M8 60L46 6" stroke="${G}" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M44 8c8 4 14 13 15 26-5-11-12-17-20-19z" fill="#1a1d17" ${O}/>`
      + `<path d="M47 12c5 4 9 10 11 17" stroke="#fff" stroke-opacity=".18" stroke-width="1.2" fill="none"/>`
      + `<path d="M56 26c1 4 1 8 0 11-1-3-2-6-1-9zM52 22c1 3 1 6 0 8-1-2-1-5 0-8z" fill="${R}"/>`
      + `<ellipse cx="56" cy="41" rx="1.4" ry="2" fill="${R}"/>`
      + `<path d="M22 42l5 3" stroke="${G}" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    // череп: цвет старой кости (приглушённый лунный), тёмные глазницы
    skull: `<svg viewBox="0 0 56 64" aria-hidden="true">`
      + `<path d="M28 4C14 4 6 14 6 27c0 8 3 13 8 16v8c0 3 2 5 5 5h18c3 0 5-2 5-5v-8c5-3 8-8 8-16C50 14 42 4 28 4z" fill="#c9bb98" ${O}/>`
      + `<path d="M12 22c2-8 8-13 16-14" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M13 28c0-5 4-8 8-8s7 4 6 9c-1 4-4 6-8 6s-6-3-6-7zM43 28c0-5-4-8-8-8s-7 4-6 9c1 4 4 6 8 6s6-3 6-7z" fill="#121510"/>`
      + `<path d="M28 36l-3 6h6z" fill="#121510"/>`
      + `<path d="M20 49v6M25 49v7M31 49v7M36 49v6" stroke="#121510" stroke-width="1.2"/>`
      + `<path d="M19 48h18" stroke="#121510" stroke-width="1"/></svg>`,
    // леденец-череп: тёмно-оранжевая карамель с бликом, тёмный череп
    lollipop: `<svg viewBox="0 0 44 64" aria-hidden="true"><defs><radialGradient id="hwCandy" cx=".4" cy=".35"><stop offset="0" stop-color="${L}"/><stop offset="1" stop-color="#8a3a12"/></radialGradient></defs>`
      + `<path d="M22 36v26" stroke="${G}" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>`
      + `<circle cx="22" cy="20" r="17" fill="url(#hwCandy)" ${O}/>`
      + `<path d="M9 14c3-6 9-9 16-8" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M13 18l6 2-1 5-6-2zM31 18l-6 2 1 5 6-2z" fill="#2a1208"/>`
      + `<path d="M21 26l1 3 1-3z" fill="#2a1208"/>`
      + `<path d="M16 31h12M18 29v4M22 29v4M26 29v4" stroke="#2a1208" stroke-width="1.2"/></svg>`
  };

  return {
    halloween: {
      vars: {
        "--hw-stars": url(starsTile()),
        "--hw-ghost": url(GHOST.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')),
        "--hw-mummy": url(ITEMS.mummy.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')),
        "--hw-poison": url(ITEMS.poison.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))
      },
      noIcon: true,   // большой значок сверху не показываем — тыквы стоят на поле в сцене
      scene: () => `<div class="hw-scene" aria-hidden="true">${scene()}`
        + `<div class="hw-bats"><i class="b1"><b>${BAT}</b></i><i class="b2"><b>${BAT}</b></i><i class="b3"><b>${BAT}</b></i><i class="b4"><b>${BAT}</b></i></div></div>`,
      content: () =>
        `<div class="deco hw-web" aria-hidden="true">${web()}</div>`
        + `<div class="deco hw-spider" aria-hidden="true"><i></i>${SPIDER}</div>`
        + `<div class="deco hw-twinkle" aria-hidden="true">${"<i></i>".repeat(9)}</div>`
        // по краям — выглядывают из-за края экрана
        // ближе к середине — почти прозрачные, под текстом (как водяной знак)
        + `<div class="deco hw-item hw-faint hw-skull" aria-hidden="true">${ITEMS.skull}</div>`
        + `<div class="deco hw-item hw-faint hw-devil" aria-hidden="true">${ITEMS.devil}</div>`
        // внизу меню, между последней карточкой и подвалом (привидение и мумия — в подвале, см. style.css)
        + `<div class="deco hw-item hw-zombie" aria-hidden="true">${ITEMS.zombie}</div>`,
      // основное меню после страницы мероприятия: закреплённый фон (не прокручивается) — паутина с пауком, череп, дьявол
      fixed: () =>
        `<div class="deco hw-web" aria-hidden="true">${web()}</div>`
        + `<div class="deco hw-spider" aria-hidden="true"><i></i>${SPIDER}</div>`
        + `<div class="deco hw-item hw-faint hw-skull" aria-hidden="true">${ITEMS.skull}</div>`
        + `<div class="deco hw-item hw-faint hw-devil" aria-hidden="true">${ITEMS.devil}</div>`,
      // предмет в конце строки с названием раздела (по очереди)
      titleDeco: (i) => {
        const list = ["cauldron", "voodoo", "lollipop", "jar"];
        // у второго раздела слева над заголовком — коса (в промежутке между карточками)
        const left = i === 1 ? `<span class="hw-title-left" aria-hidden="true">${ITEMS.scythe}</span>` : "";
        const name = list[i % list.length];
        return left + `<span class="hw-title-item hw-ti-${name}" aria-hidden="true">${ITEMS[name]}</span>`;
      }
    }
  };
})();
