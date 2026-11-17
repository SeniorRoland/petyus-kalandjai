# Terv: mobilon is jól játszható játék

**Állapot:** terv (még nem kezdtük el). Becsült méret: kb. 2–4 munkamenet. Nem kell hozzá újraírás.

## Ami már megvan

- Érintéses vezérlés (`#touch` az `index.html`-ben, `input.js`): joystick, **HASZNÁL** / **FUTÁS** / **RÚGÁS** gombok; dekázáskor külön gombsor (`#jTouch`).
- Két ujjas csippentés-zoom (`zoomBy()`).
- A feliratok érintőn más szöveget mutatnak (`isTouch`, pl. „RÚGÁS – vízipisztoly”); a súgó érintőn rejtve.
- A kezdőképernyő (polaroidok) keskeny képernyőn 2 oszlopos.

## Teendők

### 1. Mobil minőség mód és fekvő elrendezés
- Mobil minőség (automatikusan érintős / gyenge eszközön, vagy kapcsolóval):
  - kisebb felbontás (`setPixelRatio` 1–1,5 a 2 helyett), élsimítás ki,
  - egyszerűbb vagy kikapcsolt árnyék (`shadowMap`), kisebb árnyéktérkép,
  - kevesebb részecske (`spawnFx`) és környezeti effekt.
- Képkocka-idő mérése, és ha tartósan lassú, automatikus visszaváltás alacsonyabb minőségre.
- Fekvő tájolás javasolt; álló helyzetben „Fordítsd el a telefont!” üzenet.
- Kis képernyőre igazítás: HUD-chipek, buborékok (`say`), a minijáték-panelek (`#mini`, `#crumbs`, `#tower`, `#polaroids`, `#fishTip`), a filmes csíkok és a napló. Az érintéses gombok ne takarják a buborékokat.

### 2. Érintéses vezérlés csibészségenként
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

### 3. Telefonos apróságok
- Teljes képernyős mód az indításkor (Fullscreen API), ahol a böngésző engedi.
- A hang elindítása az első érintéskor (WebAudio feloldás).
- A véletlen oldalnagyítás, görgetés és szövegkijelölés tiltása (`touch-action`, `user-scalable=no`).
- Telepíthető webalkalmazás (PWA): `manifest.webmanifest`, ikonok (a meglévő focilabda-ikonból: `tools/ikon/make_icon.py`), offline gyorsítótár service workerrel – így a kezdőképernyőről appként indul.

### 4. Tesztelés valódi telefonon
- A fejlesztői szerver elérhetővé tétele a helyi hálózaton (`vite --host`), és megnyitás a telefonról.
- Ellenőrizni: sebesség (FPS), az időzítéses részek érintéssel, a buborékok és feliratok olvashatósága, a hang.
- Asztali gépen csak a méret szimulálható, az érintés és a sebesség nem.

## Később, külön lépésként

- Valódi app-boltos alkalmazás (Google Play, App Store) egy csomagoló réteggel (pl. Capacitor). Ez a fenti lépésekre épül.
