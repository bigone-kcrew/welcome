# 신입직원 안내 — 창업진흥원 노동조합

2026년 신입직원 대상 노동조합·노사협의회·상조회 설명 슬라이드.
대면 발표용이며 30분 / 24장으로 구성했다.

<https://bigone-kcrew.github.io/welcome/>

## 구성

| 장 | 내용 | 장수 |
|---|---|---|
| 표지 | | 1 |
| Ⅰ. 첫해에 겪을 일 | 대외 민원·괴롭힘·징계에서 신입을 지키는 협약 조항 | 4 |
| Ⅱ. 마주 앉는 자리 | 교섭대표(제86조)·협약 우선(제2조)·노조에만 있는 9개 권한 | 5 |
| Ⅲ. 그래서 바뀐 것 | 임금·결재선·제도·경영참여·조합원 설문 | 5 |
| Ⅳ. 지금 진행 중 | 한국창업보육협회 통합과 노사 협의 | 2 |
| Ⅴ. 비용과 혜택 | 조합비 1.2%의 실질 부담과 제휴 혜택 | 4 |
| Ⅵ. 오늘 하실 일 | 천원의 행복 · 상조회 · 가입 서식 | 3 |

## 빌드

```
python3 build.py
```

`deck/shell.html` 의 `<!--SLIDES-->` 자리에 `deck/slides/*.html` 을 파일명 순서로
끼워 `index.html` 을 만든다. 빌드가 아래를 검사하고, 하나라도 걸리면 종료 코드 1을 낸다.

- `<section class="slide">` 누락
- `data-ch` · `data-title` 누락 (좌측 목차가 이 두 값으로 만들어진다)
- 리터럴 hex 색상 — 색은 `var(--…)` 토큰만 쓴다
- `border-radius` · `box-shadow` 인라인 사용

## 슬라이드를 고칠 때

`deck/slides/NN-slug.html` 은 `<section class="slide">` 조각만 담는다.
`<html>`·`<head>`·`<body>` 는 넣지 않는다. 작성 규약과 사용 가능한 클래스 목록은
level 프로젝트의 `docs/deck/AUTHORING.md` 가 정본이다.

발표자 대본은 `<div class="notes">` 안에만 넣는다. 화면에는 나오지 않고 `N` 키로 열린다.

## 조작

| 키 | 기능 |
|---|---|
| ← → · PageUp/Down · Space | 이동 |
| Home / End | 처음 / 끝 |
| 1 ~ 9 | 해당 장의 첫 슬라이드 |
| F | 전체화면 |
| N | 발표 노트 |
| T | 밝은 화면 / 어두운 화면 |
| H | 목차 숨기기 |

모바일에서는 좌우로 밀거나 하단 이동 바를 쓴다.

## 이 저장소 밖의 것

덱 엔진(`deck/deck.css`, `deck/deck.js`, `deck/vendor/`)은 nosa 프로젝트의
`deck/` 을 그대로 가져온 것이고, 그 원형은 level 프로젝트의 `tools/build-deck.mjs` 다.
`deck/vendor/` 는 html-ppt-skill(MIT)에서 애니메이션 CSS와 Canvas FX만 부분 반입한 것으로
`deck/vendor/LICENSE` 에 원 라이선스를 두었다.

`.nojekyll` 은 지우지 않는다. `deck/vendor/fx/_util.js` 가 언더스코어로 시작해서
Jekyll 이 배포에서 빼 버리고, 표지의 배경 효과가 조용히 깨진다.
