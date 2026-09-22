#!/usr/bin/env python3
"""deck/shell.html + deck/slides/*.html -> index.html

창업진흥원 노동조합 신입직원 안내 덱 빌더.
/workspace/nosa/build.py 의 build_deck() 계열만 떼어낸 축약판이며,
원형은 level 프로젝트의 tools/build-deck.mjs 다. 하는 일은 같다.

    python3 build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
DECK_DIR = ROOT / "deck"

WJ = "\u2060"   # WORD JOINER — 보이지 않고, 줄바꿈만 막는다


def bind_typography(html):
    """한국어에서 갈리면 어색한 자리를 묶는다.

    괄호는 앞말·뒤조사와 한 덩어리로 읽힌다. 「수치(기준)이며」가
    「수치(기준)」과 「이며」로 갈리면 눈이 한 번 멈춘다.
    물결표로 묶은 수 범위도 같다. 태그 안쪽은 건드리지 않는다.
    """
    def fix(t):
        t = re.sub(r"(?<=[가-힣A-Za-z0-9\]])\(", WJ + "(", t)      # 앞말 + 여는 괄호
        t = re.sub(r"\)(?=[가-힣])", ")" + WJ, t)                   # 닫는 괄호 + 조사
        t = re.sub(r"(?<=[0-9])\s*~\s*(?=[0-9])", WJ + "~" + WJ, t)  # 수 범위
        return t

    out, i = [], 0
    for m in re.finditer(r"<[^>]*>", html):
        out.append(fix(html[i:m.start()]))
        out.append(m.group(0))
        i = m.end()
    out.append(fix(html[i:]))
    return "".join(out)


def split_sentences(html):
    """넓은 화면에서 문장이 줄 가운데서 시작하지 않도록 경계를 표시한다.

    설명 문단(cap·body·lead)과 개조식 항목에 넣는다. 날짜 「’26. 9. 3.」가
    깨지지 않도록 한글 뒤의 마침표만 문장 끝으로 본다.
    마침표 앞뒤에 </b> 같은 태그가 끼므로 태그를 자리표로 감춘 뒤에 찾는다.
    좁은 화면에서는 CSS 가 무시한다.
    """
    TAG = r"(?:\x00\d+\x00)*"

    def mark(inner):
        tags = []

        def hide(m):
            tags.append(m.group(0))
            return "\x00%d\x00" % (len(tags) - 1)

        masked = re.sub(r"<[^>]*>", hide, inner)
        masked = re.sub(r"([가-힣])(" + TAG + r")\.(" + TAG + r")\s+(?=\S)",
                        lambda m: m.group(1) + m.group(2) + "." + m.group(3)
                        + '<br class="wide">\n    ', masked)
        return re.sub(r"\x00(\d+)\x00", lambda m: tags[int(m.group(1))], masked)

    # 발표노트는 화면에 나오지 않으므로 손대지 않는다
    notes = []

    def keep(m):
        notes.append(m.group(0))
        return "\x01%d\x01" % (len(notes) - 1)

    html = re.sub(r'<div class="notes">.*?</div>\s*(?=</section>)', keep, html, flags=re.S)

    html = re.sub(r'(<p class="(?:cap|body|lead|ask)[^"]*"[^>]*>)(.*?)(</p>)',
                  lambda m: m.group(1) + mark(m.group(2)) + m.group(3),
                  html, flags=re.S)
    # 상자 안의 본문은 class 가 없는 <p> 다
    html = re.sub(r"(<p>)(.*?)(</p>)",
                  lambda m: m.group(1) + mark(m.group(2)) + m.group(3),
                  html, flags=re.S)
    # 개조식 항목 — 하위 목록은 건드리지 않도록 <ul> 앞까지만 본다
    html = re.sub(r"(<li>)((?:(?!<ul|</li>).)*)",
                  lambda m: m.group(1) + mark(m.group(2)),
                  html, flags=re.S)
    return re.sub(r"\x01(\d+)\x01", lambda m: notes[int(m.group(1))], html)




def build_deck():
    shell_path = DECK_DIR / "shell.html"
    slide_dir = DECK_DIR / "slides"
    shell = shell_path.read_text(encoding="utf-8")
    if "<!--SLIDES-->" not in shell:
        raise SystemExit("shell.html 에 <!--SLIDES--> 자리표시자가 없다")

    files = sorted(p for p in slide_dir.glob("*.html")) if slide_dir.is_dir() else []
    if not files:
        raise SystemExit("deck/slides/*.html 이 비어 있다")

    parts, warn, count = [], [], 0
    for f in files:
        html_src = f.read_text(encoding="utf-8")
        n = len(re.findall(r'<section[^>]*class="[^"]*\bslide\b', html_src))
        if n == 0:
            warn.append(f"{f.name}: slide section 없음")
        count += n
        # 필수 속성 — 목차가 이 두 값으로 만들어진다
        for sec in re.findall(r"<section[^>]*>", html_src):
            if "slide" not in sec:
                continue
            for attr in ("data-ch", "data-title"):
                if attr not in sec:
                    warn.append(f"{f.name}: {attr} 없음")
        # 계약 점검 — 리터럴 색상 금지, 모서리·그림자 금지
        for hexcolor in re.findall(r"#[0-9A-Fa-f]{3,8}\b", html_src):
            warn.append(f"{f.name}: 리터럴 색상 {hexcolor} — var(--…) 로 바꿀 것")
        for m in re.findall(r"border-radius:\s*([^;\"']+)", html_src):
            if m.strip() not in ("0", "0px"):
                warn.append(f"{f.name}: border-radius {m.strip()}")
        for m in re.findall(r"box-shadow:\s*([^;\"']+)", html_src):
            if m.strip() != "none":
                warn.append(f"{f.name}: box-shadow {m.strip()}")
        parts.append(f"\n<!-- ══ {f.name} ══ -->\n{split_sentences(bind_typography(html_src))}\n")

    out = ROOT / "index.html"
    out.write_text(shell.replace("<!--SLIDES-->", "".join(parts)), encoding="utf-8")
    print(f"{out.name} (조각 {len(files)}개 · 슬라이드 {count}장)")
    for w in warn:
        print("  경고 —", w)
    return len(warn)


if __name__ == "__main__":
    raise SystemExit(1 if build_deck() else 0)
