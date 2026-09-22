"use strict";
/* ══════════════════════════════════════════════════════════════════
   deck.js — 라우터 · 좌측 목차 · 발표 노트 · 전체화면
   html-ppt-skill 의 runtime.js 를 쓰지 않는 이유는 vendor/README.md 에 적었다.
   단, `.slide` 에 `is-active` 를 토글하므로 vendor/fx-runtime.js 는 그대로 동작한다.
   ══════════════════════════════════════════════════════════════════ */

const deck   = document.getElementById("deck");
const slides = Array.from(deck.querySelectorAll(".slide"));
const nav    = document.getElementById("nav");
const bar    = document.querySelector("#prog > span");
const nowch  = document.getElementById("nowch");
const drawer = document.getElementById("notes-drawer");
const nbody  = document.getElementById("notes-body");
const RM     = window.matchMedia("(prefers-reduced-motion: reduce)");

/* 슬라이드별 지연 렌더 훅 — 인덱스가 아니라 id 로 등록한다.
   슬라이드를 추가·재배치해도 깨지지 않는다. window.DECK_HOOKS 에 등록. */
window.DECK_HOOKS = window.DECK_HOOKS || {};
const rendered = new Set();

/* ─── 목차 ─────────────────────────────────────────────────────── */
let idx = 0;
const links = [];
(function buildNav(){
  let lastCh = null;
  slides.forEach((s, i) => {
    const ch = s.dataset.ch || "";
    if (ch !== lastCh) {
      const h = document.createElement("div");
      h.className = "ch"; h.textContent = ch;
      nav.appendChild(h); lastCh = ch;
    }
    const a = document.createElement("a");
    a.href = "#/" + (i + 1);
    a.innerHTML = '<span class="i">' + String(i + 1).padStart(2, "0") + "</span>" +
                  "<span>" + (s.dataset.title || ("슬라이드 " + (i + 1))) + "</span>";
    a.addEventListener("click", e => { e.preventDefault(); go(i); });
    nav.appendChild(a); links.push(a);
    // 페이지 번호를 슬라이드마다 자동으로 넣는다
    if (!s.querySelector(".pageno")) {
      const p = document.createElement("div");
      p.className = "pageno";
      p.textContent = String(i + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
      s.appendChild(p);
    }
  });
})();

/* ─── 장(章) 색인 ──────────────────────────────────────────────────
   data-ch 값이 바뀌는 지점이 장의 첫 슬라이드다. 안건 바로가기가 이걸 쓴다. */
const chapters = [];
(function indexChapters(){
  let last = null;
  slides.forEach((s, i) => {
    const c = s.dataset.ch || "";
    if (c !== last) { chapters.push({ ch: c, i: i }); last = c; }
  });
})();
function chIndex(ch){
  const hit = chapters.find(c => c.ch === ch);
  return hit ? hit.i : -1;
}
function goCh(ch){
  const i = chIndex(ch);
  if (i >= 0) go(i);
}

/* ─── 이동 ─────────────────────────────────────────────────────── */
let shownCh = null;   // 상단 안건줄에 마지막으로 표시한 장

function go(n){
  n = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach((s, i) => {
    s.classList.toggle("is-active", i === n);
    s.classList.toggle("is-prev", i < n);
  });
  links.forEach((a, i) => a.setAttribute("aria-current", i === n ? "true" : "false"));
  idx = n;
  bar.style.width = ((n + 1) / slides.length * 100) + "%";

  // 활성 슬라이드의 data-anim 재트리거 (skill 규약)
  slides[n].querySelectorAll("[data-anim]").forEach(el => {
    const a = el.getAttribute("data-anim");
    el.classList.remove("anim-" + a);
    void el.offsetWidth;
    el.classList.add("anim-" + a);
  });

  // 지연 렌더 훅
  const id = slides[n].id;
  if (id && window.DECK_HOOKS[id]) {
    const once = slides[n].dataset.hookOnce === "true";
    if (!once || !rendered.has(id)) {
      rendered.add(id);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { window.DECK_HOOKS[id](slides[n]); }
        catch (e) { console.error("hook", id, e); }
      }));
    }
  }

  // 노트
  const note = slides[n].querySelector(".notes");
  nbody.innerHTML = note ? note.innerHTML : '<i style="color:#8A8A8A">이 페이지에는 노트가 없습니다.</i>';

  // 활성 링크를 목차 안에서 보이게
  const a = links[n];
  if (a && a.offsetParent) {
    const r = a.getBoundingClientRect(), nr = nav.getBoundingClientRect();
    if (r.top < nr.top || r.bottom > nr.bottom) a.scrollIntoView({ block: "nearest" });
  }

  // 모바일 이동 바
  if (mCount) mCount.textContent = (n + 1) + " / " + slides.length;

  // 상단 고정 안건명 — 안건이 바뀐 순간에 한 번 반전시킨다
  if (nowch) {
    let c = "";
    chapters.forEach(x => { if (x.i <= n) c = x.ch; });
    nowch.textContent = c;
    nowch.hidden = !c || c === "표지";
    if (c !== shownCh) {
      shownCh = c;
      if (!nowch.hidden) {
        nowch.classList.remove("ch-in");
        void nowch.offsetWidth;
        nowch.classList.add("ch-in");
      }
    }
  }

  // 안건 바로가기 — 현재 장 표시
  if (jumpLinks.length) {
    let cur = 0;
    chapters.forEach((c, k) => { if (c.i <= n) cur = k; });
    jumpLinks.forEach((a, k) => a.setAttribute("aria-current", k === cur ? "true" : "false"));
    const act = jumpLinks[cur];
    if (act && act.offsetParent) act.scrollIntoView({ block: "nearest", inline: "center" });
  }
  if (document.body.classList.contains("side-on")) openSide(false);

  const h = "#/" + (n + 1);
  if (location.hash !== h) { try { history.replaceState(null, "", h); } catch (e) {} }
}

function fromHash(){
  const m = /^#\/(\d+)/.exec(location.hash || "");
  go(m ? parseInt(m[1], 10) - 1 : 0);
}
window.addEventListener("hashchange", fromHash);

/* ─── 도구 ─────────────────────────────────────────────────────── */
function toggleFull(){
  const d = document.documentElement;
  if (!document.fullscreenElement)
    (d.requestFullscreen || d.webkitRequestFullscreen || function(){}).call(d);
  else
    (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
}
function toggleNotes(){
  document.body.classList.toggle("notes-on");
  if (document.body.classList.contains("notes-on")) {
    const n = slides[idx].querySelector(".notes");
    nbody.innerHTML = n ? n.innerHTML : '<p class="micro">이 슬라이드에는 발표 노트가 없습니다.</p>';
  }
}
function toggleSide(){
  // CSS 는 body.side-off 를 본다. 이름이 어긋나면 버튼만 바뀌고 목차는 그대로다.
  const hid = document.body.classList.toggle("side-off");
  document.getElementById("sideOpen").hidden = !hid;
  if (hid) document.getElementById("sideOpen").focus();
  else document.getElementById("btnSide").focus();
}
document.getElementById("btnFull").addEventListener("click", toggleFull);
document.getElementById("btnNotes").addEventListener("click", toggleNotes);
document.getElementById("btnSide").addEventListener("click", toggleSide);
document.getElementById("sideOpen").addEventListener("click", toggleSide);
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen))
  document.getElementById("btnFull").style.display = "none";

/* ─── 모바일 — 목차 오프캔버스 ────────────────────────────────────
   deck.css 의 @media (max-width:900px) 는 body.side-on 을 기대한다.
   원본에는 이 클래스를 붙이는 코드가 없어 모바일에서 목차가 열리지 않았다. */
const scrim = document.getElementById("sideScrim");
function openSide(on){
  document.body.classList.toggle("side-on", on);
  if (scrim) scrim.hidden = !on;
}
if (scrim) scrim.addEventListener("click", () => openSide(false));

/* ─── 모바일 이동 바 ──────────────────────────────────────────────
   카카오톡 인앱 브라우저 등에서 키보드가 없어 이동 수단이 필요하다. */
const mCount = document.getElementById("mCount");
(function mobileBar(){
  const prev = document.getElementById("mPrev");
  const next = document.getElementById("mNext");
  const menu = document.getElementById("mMenu");
  if (prev) prev.addEventListener("click", () => go(idx - 1));
  if (next) next.addEventListener("click", () => go(idx + 1));
  if (menu) menu.addEventListener("click", () => openSide(!document.body.classList.contains("side-on")));
})();

/* ─── 안건 바로가기 ───────────────────────────────────────────────
   장 목록에서 자동 생성한다. 어느 슬라이드를 보다가도 안건으로 건너뛸 수 있다. */
const jump = document.getElementById("jump");
const jumpLinks = [];
(function buildJump(){
  if (!jump) return;
  chapters.forEach(c => {
    const a = document.createElement("a");
    // 「① 임신검진 동행휴가」처럼 원 번호로 시작하면 번호만 쓴다
    const m = /^([①-⑳])\s*(.*)$/.exec(c.ch);
    a.textContent = m ? m[1] : c.ch;
    a.title = c.ch;
    a.href = "#/" + (c.i + 1);
    a.dataset.at = String(c.i);
    a.addEventListener("click", e => { e.preventDefault(); go(c.i); });
    jump.appendChild(a);
    jumpLinks.push(a);
  });
  // 안건 전문으로 나가는 링크 — 바로가기 바 끝에 둔다
  const doc = document.getElementById("docLink");
  if (doc) {
    const out = document.createElement("a");
    out.className = "out";
    out.href = doc.getAttribute("href");
    out.textContent = "전문";
    out.title = "안건 전문 보기";
    jump.appendChild(out);
  }
})();

/* 슬라이드 안에서 data-goto="장 이름" 이 붙은 요소를 누르면 그 장으로 간다 */
deck.addEventListener("click", e => {
  const el = e.target.closest("[data-goto]");
  if (!el) return;
  e.preventDefault();
  goCh(el.dataset.goto);
});

/* ─── 스와이프 ────────────────────────────────────────────────────
   가로 이동이 세로 스크롤보다 뚜렷할 때만 슬라이드를 넘긴다. */
(function swipe(){
  let x0 = null, y0 = null, t0 = 0;
  const MIN = 45;     // 최소 가로 이동(px)
  const MAX_T = 700;  // 최대 시간(ms)
  deck.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  deck.addEventListener("touchend", e => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > MAX_T) return;
    if (Math.abs(dx) < MIN || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    go(dx < 0 ? idx + 1 : idx - 1);
  }, { passive: true });
})();

/* ─── 테마 — 어두운 화면이 기본, 밝은 회의실·인쇄는 밝은 화면 ─────── */
const THEME_KEY = "deck-theme";
function applyTheme(t){
  if (t === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  const b = document.getElementById("btnTheme");
  if (b) b.title = (t === "light" ? "어두운 화면 전환 (T)" : "밝은 화면 전환 (T)");
  // 캔버스 효과는 만들어질 때 색을 한 번 읽는다. 테마가 바뀌면 다시 만든다.
  const act = document.querySelector(".slide.is-active");
  if (act && window.__hpxReinit) requestAnimationFrame(() => window.__hpxReinit(act));
}
function toggleTheme(){
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  applyTheme(next);
}
(function initTheme(){
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch (_) {}
  applyTheme(t || "dark");
  const b = document.getElementById("btnTheme");
  if (b) b.addEventListener("click", toggleTheme);
})();

/* ─── 키보드 ───────────────────────────────────────────────────── */
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && t.matches && t.matches("input,textarea,select,summary")) return;
  switch (e.key) {
    case "ArrowRight": case "PageDown": case " ": e.preventDefault(); go(idx + 1); break;
    case "ArrowLeft":  case "PageUp":            e.preventDefault(); go(idx - 1); break;
    case "Home": e.preventDefault(); go(0); break;
    case "End":  e.preventDefault(); go(slides.length - 1); break;
    case "f": case "F": toggleFull(); break;
    case "n": case "N": toggleNotes(); break;
    case "h": case "H": toggleSide(); break;
    case "t": case "T": toggleTheme(); break;
    case "Escape": document.body.classList.remove("notes-on"); break;
    default:
      // 숫자키 → 해당 장(章)의 첫 슬라이드
      if (/^[1-9]$/.test(e.key)) {
        const chs = [];
        let last = null;
        slides.forEach((s, i) => { const c = s.dataset.ch || ""; if (c !== last) { chs.push(i); last = c; } });
        const k = parseInt(e.key, 10) - 1;
        if (chs[k] !== undefined) go(chs[k]);
      }
  }
});

fromHash();
