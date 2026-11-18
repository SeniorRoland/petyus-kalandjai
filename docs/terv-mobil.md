# Terv: mobilon is jól játszható játék

**Állapot:** folyamatban (`feature/mobil` ág) – az 1–3. lépés kész, a 4. (tesztelés valódi telefonon) hátravan. Becsült méret: kb. 2–4 munkamenet. Nem kell hozzá újraírás.

## Ami már megvan

- Érintéses vezérlés (`#touch` az `index.html`-ben, `input.js`): joystick, **HASZNÁL** / **FUTÁS** / **RÚGÁS** gombok; dekázáskor külön gombsor (`#jTouch`).
- Két ujjas csippentés-zoom (`zoomBy()`).
- A feliratok érintőn más szöveget mutatnak (`isTouch`, pl. „RÚGÁS – vízipisztoly”); a súgó érintőn rejtve.
- A kezdőképernyő (polaroidok) keskeny képernyőn 2 oszlopos.

## Teendők

### 1. Mobil minőség mód és fekvő elrendezés  ✅ kész
- **Megvalósítás:** `src/quality.js` – szintek: 2 teljes (asztal), 1 mobil (felbontás ≤ 1,25×, élsimítás ki, árnyéktérkép 1024, fele annyi részecske, max. 160 élő), 0 minimális (1×, árnyék nélkül, negyed annyi részecske). Telefonon/tableten (`pointer: coarse`, vagy érintős és a rövidebb képernyőoldal < 820 px) 1-ről indul; `watchFrame()`: ha a játék tartósan (4 mp) 25 kép/mp alatt fut, egy szinttel lejjebb vált („Egyszerűbb grafika…” felirat). `?quality=high|mobile|low` felülírja (és kikapcsolja az automatikus váltást). A `scene.js` a szint szerint állítja a renderert és az árnyékot, az `actors.js` `spawnFx` a `fxAllowed()`-dal ritkít. Állóban tartott telefonon játék közben „Fordítsd el a telefont!” (`#rotate`, `body.upright`), a játék addig áll. Fekvő telefonon (`max-height: 500px`) kisebb HUD, gombok, joystick, buborékok, panelek (a stíluslap végén).
- Mobil minőség (automatikusan érintős / gyenge eszközön, vagy kapcsolóval):
  - kisebb felbontás (`setPixelRatio` 1–1,5 a 2 helyett), élsimítás ki,
  - egyszerűbb vagy kikapcsolt árnyék (`shadowMap`), kisebb árnyéktérkép,
  - kevesebb részecske (`spawnFx`) és környezeti effekt.
- Képkocka-idő mérése, és ha tartósan lassú, automatikus visszaváltás alacsonyabb minőségre.
- Fekvő tájolás javasolt; álló helyzetben „Fordítsd el a telefont!” üzenet.
- Kis képernyőre igazítás: HUD-chipek, buborékok (`say`), a minijáték-panelek (`#mini`, `#crumbs`, `#tower`, `#polaroids`, `#fishTip`), a filmes csíkok és a napló. Az érintéses gombok ne takarják a buborékokat.

### 2. Érintéses vezérlés csibészségenként  ✅ kész
- **Megvalósítás:** `src/touchui.js` (`updateTouchUI()`, minden képkockán érintős eszközön): a három gomb felirata és láthatósága az állapottól függ – szabad játék RÚGÁS/MORZSA · HASZNÁL · FUTÁS; roller/verseny FÉK · GYORS; vízipisztoly FRÖCSKÖL + KÉSZ; pénzhalászat HALÁSZ + KÉSZ; fotóbomba **UGRÁS + GRIMASZ** (a FUTÁS gomb ilyenkor grimasz-gomb, `G.runPressed`) + GALAMB; bújócska LEVEGŐ · FUTÁS · FELADOM; lufi UGRÁS; torony RAKD!; dekázás és jelenetek alatt rejtve (dekázásnál a ← ↑ → gombsor). A HASZNÁL gomb ott is látszik, ahol a minijátékból ki lehet lépni. A feliratok, tippek és a napló billentyűnevei érintőn gombnevekre cserélődnek (`touchText()` a `util.js`-ben: Szóköz → RÚGÁS, E → HASZNÁL, WASD → joystick …).
Átnézni és szükség szerint javítani:
- **Fordított edzés / dekázás:** a ← → ↑ gombsor mérete és helye, az időablak érintéssel.
- **A szundikáló apa (torony):** az időzítéses gomb.
- **Galambraj-vezénylés:** morzsaszórás a RÚGÁS gombbal.
- **Vízipisztoly:** célzás joystickkal, fröcskölés nyomva tartott RÚGÁS-sal.
- **Kutyaszán:** oldalra kormányzás joystickkal.
- **Fotóbomba:** az ugrás és a grimasz most joystick-billentéssel megy. Valószínűleg két külön gomb kell (UGRÁS, GRIMASZ), mert a pontos időzítés a lényeg.
- **Pénzhalászat:** körbejárás joystickkal, halászás nyomva tartott RÚGÁS-sal, megdermedés.
- **Csibészség-napló:** a 📒 gomb elérhetősége és mérete.
- A gombok felirata kövesse a helyzetet (pl. RÚGÁS → MORZSA / FRÖCSKÖL / HALÁSZ), ahogy a `#prompt` is.

### 3. Telefonos apróságok  ✅ kész
- **Megvalósítás:** indításkor telefonon teljes képernyő + fekvő zárolás (`goFullscreen()` a `main.js`-ben; ahol a böngésző engedi – Android Chrome; iPhone-on a főképernyőre tett webalkalmazás fut teljes képernyőn). A hang a háttérbe kerüléskor szünetel, visszatéréskor / a következő érintésre folytatódik (`audio.js`). Nincs „húzd le a frissítéshez”, rugózás, szürke érintés-villanás, hosszan nyomott menü, dupla koppintásos nagyítás a gombokon (CSS). **PWA:** `public/manifest.webmanifest` (név, fekvő, teljes képernyő, ikonok: `icon-192.png`, `icon-512.png` – `tools/ikon/make_icon.py`), `public/sw.js` service worker: az oldal hálózatról jön, ha van net, különben a gyorsítótárból; minden más a gyorsítótárból, a háttérben frissítve → az első látogatás után **offline is indul**. Csak a buildelt változatban regisztrál (`import.meta.env.PROD`). iOS-hez `apple-mobile-web-app-*` metatagek.
- Teljes képernyős mód az indításkor (Fullscreen API), ahol a böngésző engedi.
- A hang elindítása az első érintéskor (WebAudio feloldás).
- A véletlen oldalnagyítás, görgetés és szövegkijelölés tiltása (`touch-action`, `user-scalable=no`).
- Telepíthető webalkalmazás (PWA): `manifest.webmanifest`, ikonok (a meglévő focilabda-ikonból: `tools/ikon/make_icon.py`), offline gyorsítótár service workerrel – így a kezdőképernyőről appként indul.

### 4. Tesztelés valódi telefonon
- A fejlesztői szerver elérhetővé tétele a helyi hálózaton (`vite --host`), és megnyitás a telefonról.
- Ellenőrizni: sebesség (FPS), az időzítéses részek érintéssel, a buborékok és feliratok olvashatósága, a hang.
- Asztali gépen csak a méret szimulálható, az érintés és a sebesség nem.

## Visszajelzés után (első telefonos próba)  ✅ kész

- Körülnézés egy ujjal húzva (asztalon egérrel) – `G.pan`, 3 mp után visszasiklik.
- Telefonon kisebb buborékbetű; a feliratok (képen kívüli beszélő) felül középen, legfeljebb 2 – alul a gombok és a joystick vannak.
- A buborék farka nem mutat bele a szövegbe, ha a buborék a beszélő fejére csúszik (felső szélről indul, vagy nincs).
- Telefonon a kezdőképernyő felajánlja a telepítést (`install.js`).
- Ami Petyust kitakarja (fa, lámpa …), áttetsző lesz (`occlude.js`).

## Telepített app javítása

- Android/Chrome: a telepített app fekete képernyővel indult („Internetes alkalmazás”). Javítva: robusztusabb service worker (`petyus-v2`: a gyorsítótárba írás hibája nem dobja el a jó választ, 6 mp-es hálózati időkorlát, `ignoreVary` – enélkül az első látogatás után elmentett JS-t nem találta meg), az első látogatás fájljai is elmentődnek, a manifest `display: standalone` (a teljes képernyőt az Indítás gomb kéri), külön `any`/`maskable` ikonok, `id`. A kezdőképernyő kiírja a nem kezelt hibákat (`#err`), mert telefonon nincs konzol.
- v0.0.5 után is: az ikonról indítva semmi nem jelenik meg, a feladatlistán egy előtérbe nem hozható Chrome-példány látszik (Chrome-ban az oldal működik; telepítés: ⋮ → Alkalmazás telepítése). Az ablak meg sem nyílik → a manifest kötelező fekvő tájolása (`orientation: landscape`) a fő gyanúsított: kivéve (a fekvő zárolást az Indítás gomb kéri, állóban a „Fordítsd el a telefont!” üzenet marad).

## Később, külön lépésként

- Valódi app-boltos alkalmazás (Google Play, App Store) egy csomagoló réteggel (pl. Capacitor). Ez a fenti lépésekre épül.
