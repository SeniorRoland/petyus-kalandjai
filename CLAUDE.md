# Petyus kalandjai – projekt-útmutató Claude Code-hoz

Izometrikus, voxel stílusú 3D böngészős **játéksorozat** (Three.js r187 + Vite 8): **12 rész, egy-egy hónap**, augusztussal kezdve. Most csak az **1. rész: Augusztus – Egy nap a parkban** játszható; a kezdőképernyőn mind a 12 látszik, a többi zárva („Hamarosan”). A részek adatai egy helyen: `SERIES`, `EPISODES` (`n`, `month`, `ready`, `art: { img, col, row }` = egy 2×2-es évszakkép panelje, vagy `icon` + `c` színátmenet) és `EPISODE` (a játszható rész) a `state.js`-ben; a csempéket a `menu.js` építi (a játszható csempe a `#startBtn`). Képek: `public/kezdokep.webp` (a kezdőképernyő háttere), `public/evszak-nyar.webp` (bicikli · hegyi túra / strand · roller a parkban) `public/evszak-osz-tel.webp` (őszi túra · őszi bicikli / szánkó · korcsolya) és `public/evszak-tel-tavasz.webp` (hógolyózás · hóvirág / virágzó park · piknik) – a csempék ezekből vágnak (aug.: roller, szept.: bicikli, okt.–jan.: ősz/tél, febr.–máj.: tél vége/tavasz, jún.: túra, júl.: strand). Kép nélküli részhez `icon` + `c` is megadható. Petyus (gyerek), Petya (apa) és Angi (anya) egy kisvárosi parkban; a nyitójelenet után a játékos Petyust irányítja: focizik, iszik az ivókútból, elektromos rollerezik, miközben az apa folyamatosan instruálja.

- A gyerek neve a játékban **Petyus** (korábban Petike). A kódban az azonosítók és fájlnevek történeti okból `petike`-ek maradtak (`G.petike`, `petike_foci.glb`, `updateCatPetike`, a rekord `localStorage`-kulcsa) – a játékos ezeket nem látja.
- A felhasználó magyar; **a játékban minden szöveg magyar** (buborékok, súgó, feliratok). Kódkommentek angolul vagy magyarul is lehetnek.
- Buborékok (`say(actor, szöveg, mp, név)` a `ui.js`-ben): képregényes stílus, betűtípusok npm-ből (`@fontsource/patrick-hand` a szöveghez, `@fontsource/bangers` a nevekhez/kiabáláshoz/hanghatásokhoz – mindkettő latin-ext, kell az ő/ű!). Fajták a szövegből: kiabálás (`!!` vagy nagybetűk) · motyogás (`…`-re végződik) · hanghatás (ha a „beszélő” nem Actor, pl. állat, autó: csak színes felirat). A farok SVG-ben (`#tails`) mindig a beszélő feje felé mutat; a buborékok nem takarják egymást (megjelenési sorrendben helyezkednek el, a foglalt helyről a legközelebbi szabad helyre csúsznak). A farok a buborék alsó, felső vagy oldalsó szélétől indul (ahol a fej van); ha a fej a buborék mögé kerül, nincs farok. Telefonon (`body.mobile`) kisebb a betű, és a feliratok felül középen jelennek meg (legfeljebb 2). A buborékok csak a látható képen belül lehetnek (a cutscene-csíkok magasságát minden képkockán megméri); ha a beszélő feje nincs a képen, a szöveg ugyanilyen stílusú **feliratként** jelenik meg alul középen (név mellett ◀/▶ jelzi, merre van; egyszerre legfeljebb 3; képen kívüli hanghatás nem jelenik meg). Ezért a cutscene-ek közelijeit testmagasságra kell keretezni: `atHeight(x, y, z)` (`cine.js`), nem a talppontra.
- Futtatás: `npm install`, majd `npm run dev` (http://localhost:5173). Build: `npm run build` → `dist/`.
- Objektumkatalógus (design terv): `designterv.html` – ugyanazt a `src/voxels.js`-t használja, mint a játék. A kezdőképernyőről nem érhető el, csak közvetlen címmel (`…/designterv.html`).

## Git munkafolyamat

- `main`: kiadott/stabil állapot · `develop`: fejlesztési ág, a `main`-ből ágazik.
- **Minden fejlesztés új feature ágon indul a `develop`-ból:** `git switch develop` → `git switch -c feature/<rövid-név>`, és ott commitolunk. Közvetlenül a `main`-re vagy a `develop`-ra nem commitolunk.
- A feature ág visszaolvasztása a `develop`-ba (és a `develop` → `main`), valamint a push csak a felhasználó kérésére történik.
- Távoli repó: `origin` = https://github.com/SeniorRoland/petyus-kalandjai · élő oldal (GitHub Pages): https://seniorroland.github.io/petyus-kalandjai/

### Verzió kiadása

A GitHub Pagesre **csak verzió-tag** tesz ki új változatot (`.github/workflows/deploy-pages.yml`: `push: tags: v*.*.*`); a sima push a `main`-re vagy a `develop`-ra nem ad ki semmit. Verziószám: **3 jegyű, `MAJOR.MINOR.PATCH`** (pl. `0.0.1`), a tag neve `v` + verzió (pl. `v0.0.1`). Az első kiadás: **0.0.1**. Kiadás csak a felhasználó kérésére.

1. **Verziószám emelése** feature ágon: `git switch develop` → `git switch -c feature/kiadas-X.Y.Z` → a `package.json` `version` mezője `X.Y.Z` (`npm version X.Y.Z --no-git-tag-version` a lockot is frissíti) → commit → merge a `develop`-ba.
2. **develop → main:** `git switch main` → `git merge --no-ff develop -m "Kiadás: vX.Y.Z"`.
3. **Tag a main-en:** `git tag -a vX.Y.Z -m "Petyus kalandjai X.Y.Z"` (a tag a `main` merge-commitjára kerül).
4. **Push:** `git push origin main develop` → `git push origin vX.Y.Z` – a tag indítja a kiadást.
5. **Ellenőrzés:** *Actions → Deploy to GitHub Pages* zöld; az élő oldal betölt. A workflow leáll, ha a tag nem a `main`-en van, vagy nem egyezik a `package.json` verziójával.

- Melyik szám nő: **PATCH** – javítás, apró módosítás; **MINOR** – új tartalom (pl. új csibészség, új rész); **MAJOR** – nagy, kész állomás (pl. 1.0.0 = az első teljes rész kiadva).
- Egyszeri GitHub-beállítások: *Settings → Pages → Source: GitHub Actions* (kész); és mivel tagről történik a kiadás: *Settings → Environments → github-pages → Deployment branches and tags* → **Add deployment branch or tag rule** → *Tag*, minta: `v*`.

## Fájlok

| Fájl | Tartalom |
|---|---|
| `index.html` | UI (start képernyő: nagy cím fent, alatta a 12 rész kisebb csempéi, jobb alsó sarokban a verzió `#version` – a `package.json`-ból, `__APP_VERSION__` a `vite.config.js`-ben; a katalógusra nem mutat link; HUD; súgó `#help` a jobb alsó sarokban, gombonként egy sor – `<dl>`: gomb · leírás, **H** rejti; buborékok, érintéses vezérlők, `#prompt` interakciós felirat) |
| `src/main.js` + `src/*.js`, `src/activities/*.js` | a játék ES-modulokra bontva (belépési pont: `main.js`, lásd lent) |
| `src/voxels.js` | voxel objektumkönyvtár: `VoxelGrid`, `CATALOG`, `getGeometry(id, variant)`; a lakás bútorai (2. rész) a `src/voxels-home.js`-ben (`HOME_CATALOG`, „Lakás” kategória) |
| `src/designterv.js` | a 3D katalógus oldal logikája |
| `public/*.glb` | a játék által betöltött modellek: `petya`, `angi`, `petike_roller`, `petike_foci` (riggelt, T-pose), `roller_kicsi` (a roller) |
| `models/source/*.glb` | az **eredeti**, nem riggelt karaktermodellek (lelógó karral) – a modell-pipeline bemenete |
| `tools/model-pipeline/` | Python: T-pose + csontváz generálása (lásd lent) |
| `tools/ikon/make_icon.py` | a böngészőfül ikonja (pixel-art focilabda narancs csempén, 32×32-es rács) → `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, a webalkalmazás ikonjai `icon-192.png`, `icon-512.png` (Pillow kell hozzá) |
| `public/manifest.webmanifest` · `public/sw.js` | telepíthető webalkalmazás (PWA): név, ikonok (`any` és `maskable` külön), `display: standalone`, **nincs** kötelező tájolás (`orientation` – Androidon a telepített app nem indult el vele; a fekvő helyzetet az Indítás gomb kéri: `screen.orientation.lock`) · service worker (`petyus-v2`): az oldal hálózatról (6 mp időkorlát), különben a gyorsítótárból; minden más gyorsítótár + háttérfrissítés (`ignoreVary`); a gyorsítótárba írás hibája nem rontja el a választ; az első betöltés után az oldal átküldi a már letöltött fájlokat (`postMessage({ keep })`) → már az első látogatás után offline is indul; csak buildben regisztrál (`updateViaCache: 'none'`). Ha a service worker logikája változik, a `CACHE` nevét is emelni kell |

## A játék moduljai (`src/`)

| Modul | Tartalom |
|---|---|
| `util.js` | `V3`, `$`, seedelt `rand`/`R`/`pick`, `clamp`, `lerp`, `damp`, `dampAngle` … |
| `state.js` | **`G`** – a közös, több modulból is átírt állapot (`G.mode`, `G.pstate`, `G.petyaMode`, `G.petike`/`G.petya`/`G.angi`, `G.score`, `G.viewSizeTarget`, `G.usePressed` …), valamint `ball`, `roller`, `rigs`, `npcs`/`animals`/`pigeons`/`cars` |
| `scene.js` | renderer, jelenet, kamera (`CAM_OFF`, `camTarget`, `updateProjection`), fények (a felbontást és az árnyékot a `quality.js` szintje adja) |
| `occlude.js` | ami a kamera és Petyus közé kerül (fa, lámpa …, a `world.js` `INSTANCES` példánylistájából), áttetsző lesz: a példány elrejtve, helyette áttetsző másolat (`updateOcclusion`) |
| `install.js` | telefonon a kezdőképernyőn „Telepítsd alkalmazásként!” (Android: `beforeinstallprompt` → Telepítés; iPhone: útmutató); „Most nem” után nem kérdez újra (`localStorage`) |
| `touchui.js` | érintős eszközön a RÚGÁS / HASZNÁL / FUTÁS gombok felirata és láthatósága állapotonként (`updateTouchUI`); a szövegek gombnevei: `touchText()` a `util.js`-ben (a `setPrompt`, `toast` és a napló tippjei használják) |
| `quality.js` | grafikai minőség: `Q.level` 2 asztal / 1 mobil / 0 minimális, `MOBILE`, `fxAllowed()` (részecske-ritkítás), `watchFrame()` (lassú eszközön automatikus visszaváltás), `?quality=high|mobile|low` |
| `world.js` | voxel batch, csempék/talaj, ütközők, világépítés, voxel-kellékek, `TREES` |
| `rigs.js` · `actors.js` | karakter-rigek · `Actor`, állatmodellek, FX |
| `audio.js` · `ambience.js` | szintetizált hangok, `soundAt` · környezeti hangok |
| `menu.js` | kezdőképernyő: a 12 havi rész szétszórt polaroidokként (`buildEpisodeMenu`: részenként rögzített `--rot`/`--dx`/`--dy`, minden harmadikon ragasztószalag; egér alatt kiegyenesedik, megnő, előre jön), `setStartLabel` |
| `mischief.js` | csibészségek: `MISCHIEFS` (1. rész) és `MISCHIEFS2` (2. rész, külön mentés `petyus.r2.csibeszsegek`; a napló az aktuális rész listáját mutatja, a `totalStars()` csak az 1. részé) (id, cím, napló-tipp, `stars(eredmény, extra)` → 1–3, `lower: true` = a kisebb eredmény a jobb), `award(id, eredmény, extra)` (legjobb mentése `localStorage`-ba, felugró csillagok), `toggleJournal()` (napló, **N** / 📒 – játék közben szünetel: `G.paused`), ⭐ összesítés |
| `viewturn.js` | a nézet forgatása 90°-onként mindkét részben: ⟲ ⟳ gombok jobb felül, billentyű `,` és `.` (a 2. részben Q / R is); a `CAM_OFF`, `CAM_FWD`, `CAM_RIGHT` együtt fordul (`updateViewTurn` minden lépésben) |
| `backmenu.js` | vissza a főmenübe: 🏠 gomb jobb felül játék közben (mindkét részben), megerősítő ablak (`#backDlg`, a játék közben áll), igen → a rész saját mentése (`G.saveHook`; 2. rész: nap, óra, hely, ajtók, lámpák – `petyus.r2.allapot`, a szeptemberi csempe ilyenkor „Folytatás ▶”), majd a kezdőképernyő (az oldal újraindul paraméterek nélkül) |
| `ui.js` · `input.js` | képregényes buborékok (`say`), toast, nagy felirat · billentyűzet/érintés |
| `ball.js` · `player.js` · `roller.js` · `npcs.js` | labda · Petyus irányítása · roller · járókelők, állatok |
| `prologue.js` · `intro.js` · `cine.js` · `camera.js` | filmes nyitány · nyitójelenet (családi séta) · átvezetők (`cineCut`, `shake`) · kamera |
| `ep2/ep2.js` · `ep2/home.js` · `ep2/outside.js` · `ep2/karcsi.js` · `ep2/appliances.js` · `ep2/food.js` · `ep2/inventory.js` · `ep2/pajama.js` · `ep2/coffee.js` | **2. rész: Szeptember** – indítás (`startEp2`: a park helyére a lakás; `G.episode = 2` → a fő ciklus `stepEp2`-t hív), naptár/óra a HUD-on, apa és anya · a lakás az alaprajz szerint (`ROOMS`, `WALLS`, bútorok a `voxels-home.js` katalógusából, ütközők; a kamera és Petyus/a szobája közé eső falak átlátszók – **T**: lesüllyedők, `wallView`, `updateHome`; a nézet Q / R-rel 90°-onként forog: `CAM_OFF`, `CAM_FWD`, `CAM_RIGHT` együtt fordul, az `occlude.js` és a pásztázás ezekből számol; **V**: belső nézet (FPS) – a képet és a buborékokat a `view.cam` (`scene.js`) kamerája adja; kizoomolni csak az alapnézetig lehet: `G.zoomMax`) · a ház és környéke (a lakás a 2. emeleten: `FY`; alsó szintek, bejárat, parkoló, udvar, kerítés, garázssor, szomszéd házak, gyerekek, kutyák, macskák, trambulin) · kapcsolható / nyitható eszközök (`devices`: hűtő, mikró, vízforraló, tűzhely, csapok, zuhany, mosógép, tévé, számítógép – E, a mikrónál Szóköz is) · ételek, edények (`food.js`) · leltár: felvehető tárgyak, lerakóhelyek, bögre töltése (`inventory.js`; E fel, F le / tölt, 1–6 / Tab választ) · Karcsi, a tengerimalac a kalitkában (félénk: ha valaki közel jön, a házába bújik) · pizsama (vertex-szín + shader-minta; anyag személyenként, `setPantsDown`: letolt nadrág) · csibészség: „A tejszínes kávé” (`coffee.js`: apa kávét kér, „apa helye” lerakóhely, bögre kimosása nyitott csapnál, morgás ×5 → WC, szagfelhő, `addLate` késés a HUD-on ⏰; apa állapotai `cf.st`; a leltár eseményei: `invHooks`). Megnyitás: 15 ⭐ (`ep2Unlocked`); fejlesztői szerveren mindig nyitva, `?resz=2` egyből indítja (csak `import.meta.env.DEV`) |
| `activities/drinking.js` | `interactions()`, `setPrompt()`, ivókút |
| `activities/fountain.js` · `cat.js` · `juggle.js` · `scooter.js` | szökőkút-ivás · macska-jelenet (+ madárraj) · dekázás (`jug.who`: Petyus vagy apa) · rollerezés |
| `activities/coach.js` · `nap.js` · `pigeons.js` | csibészségek: 1. „Fordított edzés” · 2. „A szundikáló apa” (torony a fején) · 3. „Galambraj-vezénylés” (a galambok `pigeonHook`-ja az `npcs.js`-ben) |
| `activities/photo.js` · `fish.js` | csibészségek: 6. „Fotóbomba” (Angi magától hív a szökőkúthoz; `photoTick` minden képkockán; polaroidok: `#polaroids`) · 7. „Pénzhalászat a szökőkútból” (Szóköz a szökőkút peremén; parkőr, fagyis kocsi; `fishTick`) |
| `activities/balloon.js` | csibészség: 10. „Lufis bácsi” (E a lufis bácsinál; könnyű ugrás, szél, a fára akadt labda a macska mellett; apa elkapja a bokáját; `balloonTick`) |
| `activities/hide.js` | csibészség: 9. „Bújócska apával” (E apánál a padnál; búvóhelyek: `TREES` + `BUSHES` a `world.js`-ben; apa: `hideCount` → `hideSeek`; levegő visszatartása Szóközzel) |
| `activities/race.js` | csibészség: 8. „Rollerverseny a nyugdíjassal” (rolleren E a kalapos bácsi mellett; moped, szélárnyék, turbó; `raceTick`; a roller mozgása: `rideStep()` a `scooter.js`-ben) |
| `activities/squirt.js` · `sled.js` | csibészségek: 4. „Vízipisztoly az ivókútból” (Szóköz az ivókútnál; HUD: `#mini`) · 5. „Kutyaszán” (rolleren E egy kutyasétáltató mellett; a kutyát ilyenkor `an.sled` alatt a `sled.js` mozgatja, a rollert `roller.scripted`) |
| `dad.js` | az apa AI-ja és szövegei |
| `main.js` | fő ciklus (`step(dt)`), betöltés, `window.__game` |

- **Szabály:** egy importált változót a fogadó modul nem írhat felül (ES-modul). Ami több modulból is változik, az a `G` objektumon él (`G.pstate = 'free'`); a csak a saját modulban írt `let`-ek sima `export let`-ek maradnak (élő kötés). Függvényeket és objektumokat szabadon lehet importálni.
- Az import-ciklusok rendben vannak, amíg a modulok **betöltéskor** (függvényen kívül) csak a `util.js`/`state.js`/`scene.js`/`world.js` konstansait olvassák.
- A korábbi egyetlen `game.js` szakaszai (sorrendben, ma ezek a modulok): utils → renderer/scene → voxel batch (`Batch`: összeolvasztott dobozok egy hálóban) → tiles/ground (1 m-es csempék: `T.GRASS/PARK/PATH/PITCH/ROAD/SIDEWALK/PLAZA`, `groundH()`) → colliders (`addBoxCol`, `addCircleCol`, `collide(p, r, y, onHit, skipSoft)`; `h` = magasság, `e` = pattanás, `soft` = csak Petyust és a labdát állítja meg, pl. a parkoló roller `G.rollerCol` – apa és az állatok `skipSoft`-tal átmennek rajta) → world building (`buildWorld`, épületek, pálya, kerítés) → instanced voxel props (`place(id,x,y,z,rot,s,variant,opts)` + `buildInstances()`) → character rigs (`rigFromSkinned`, `rigFromGLTF` régi fallback, `makePerson` NPC) → `Actor` → animals → FX → audio (WebAudio szintetizált hangok; `soundAt(x,z,fn)` térhangzás, `startAmbience()` alapzaj) → UI helpers (`say(actor, szöveg)`) → input → game state → ball (fizika, gól) → player control (`updatePlayer`, rúgás, cselezés) → roller (`rollerRide`, `poseRider`, `RIDE_SKINNED`) → NPCs & animals → cutscene system (`W()`, `until()`, `tween()`, `runIntro`, `finishIntro`) → play activities (ivókút, szökőkút, macska-jelenet, dekázás, roller, apa AI) → in-game cutscenes (`cine`) → camera → ambience (`updateAmbience`: madarak, csengő, duda, kutya) → main loop (`step(dt)`) → boot.

## Világ és koordináták

- Y felfelé, 1 egység = 1 m. A karakterek a **+Z** irányba néznek; `heading = atan2(dx, dz)`. A karakter **bal** oldala a +X.
- Kamera: ortografikus, `CAM_OFF = (40, 34, 40)` (délkelet felől). A WASD a kamerához képest mozgat (`CAM_FWD`, `CAM_RIGHT`).
- Fontos helyek: park középen (szökőkút: 0,0), focipálya `PITCH` x 25.5–51.5, z ±8.5; kerítés `FENCE`, **kapu az északi oldalon x 29–31**; családi pad `FAMILY_BENCH` (33, −12.7); ivókút `DRINK` (28.3, −12.9); a nyitójelenet után a roller a pad keleti végénél (`LEAN`); társasház (−38…−24, −30…−18); út z 14–18.
- A kamera délkeleti, ezért magas tárgyat **ne tegyél a pálya déli/keleti oldala közelébe** (eltakarná a játékot).

## Karakter-rig (fontos!)

- A `public/` modellek **skinnelt, T-pose** modellek, 27 Mixamo-nevű csonttal (`mixamorig:Hips` … – three.js-ben `mixamorigHips`, a kettőspont kiesik).
- `rigFromSkinned()` ugyanazt az interfészt adja, mint a régi felosztós rig: `rig.hip[R,L]` = UpLeg, `rig.knee[R,L]` = Leg csontok; **`rig.sh[R,L]` proxyk** (Object3D) – „lelógó kar” jelentéssel. A `rig.apply()` írja át őket a karcsontokra: `armBone.rotation = (sh.x, sh.y, sh.z + armBase)`, ahol `armBase = [+1.5, −1.5]` hozza le a T-pose karokat. Index 0 = jobb (−X), 1 = bal (+X).
  - Kar előre lendítése: `sh.rotation.x < 0`; comb előre: `hip.rotation.x < 0`; térd hajlítása: `knee.rotation.x > 0`.
  - `Actor.sync()` hívja az `apply()`-t; aki közvetlenül pózol (pl. `poseRider`), annak is hívnia kell.
- Ülés: `sitKnee()` a lábszár hossza (`rig.kneeH`) alapján dönti meg a lábszárat, hogy a talp a földön legyen (a `rig.foot` csont vízszintesen tartja a talpat).
- `CFG` (skála + régi felosztási küszöbök): Petya 0.93, Angi 0.86, focista Petyus 0.833, rolleres Petyus 1.14 (≈ 1,5 m, Petya 1,86 m, Angi 1,75 m); a roller `ROLLER_SCALE` = 0.84 (`state.js`; a deszka magassága is ezzel nő). Ha Petyus méretét változtatod, a rolleren a kéz–kormány illesztést (`RIDE_SKINNED` a `roller.js`-ben) újra kell hangolni.
- Ha nem skinnelt GLB-t kap, a `rigFromGLTF` a régi módon (voxel-y/x küszöbökkel) bontja végtagokra.
- **Gyakori hiba:** Blenderből FBX-et menteni `.glb` névvel → a betöltés elhasal. Mindig glTF 2.0 Binary (.glb) export.

## Játékállapotok

- `mode`: `loading → title → intro → play`. Az intro egy `async` jelenet (`runIntro`), Enterrel/Kihagyással átugorható (`finishIntro` determinisztikus végállapotot állít be).
- Az intro elején a **filmes nyitány** (`runPrologue`, kb. 40 mp): Petyus a társasház ajtajából rollerrel száguld a park felé, a park északi sétányán szlalomozik a direkt odaállított járókelők (`PEDS`) között (a két beszélgető néni között lassítva), farolva fékez (por, féknyom, csikorgás), Petya mérgesen visszahívja, Petyus duzzogva visszagurul a szülők mögé (`ROLLER_START`) – innen folytatódik a családi séta (`INTRO_ROUTE`). Filmes hatás: `body.film` (2,39:1 csíkok, szemcse, vignetta, színkorrekció), `#filmTitle` főcím, `#filmDip` vágás, `cineCut`/`shake`/`slowMo`, `sSting`/`sScreech`/`startHum`. A roller ilyenkor `roller.scripted` (a `rollerRide` nem mozgatja). A park sétálói addig a déli oldalon várnak; a végén (vagy átugráskor) az `endPrologue()` mindent visszaállít, a szlalom-járókelők sima sétálók lesznek.
- `pstate` (Petyus): `free | toDrink | drinking | riding | toFountain | ftnDrink | caught | chased | atMom | autoBall | catScared | catChased | catSafe | catToMom | catAtMom | juggle | coach | tower | squirt | sled | photo | fish | race | hide | balloon`; a morzsás zacskó nem külön állapot, hanem `pig.active` (ilyenkor a Szóköz morzsát szór). Interakció: **E** (`usePressed`), a `interactions()` dönti el, mi elérhető, és írja a `#prompt`-ot.
- `petyaMode` (apa): `bench | standing | leaving | follow | return | seat` (+ `ftn…`, `cat…`, `coach`, `doze`, `photo`, `hideCount`/`hideSeek`, `balloon` a jelenetekben; `doze` = szundikál a padon, `dad.benchT` méri a nyugodt időt). `dad.limpT > 0`: fáj a dereka, bicegve megy vissza a padra (`LIMP` szövegek). Az `updateDad()` mozgatja (`navTarget()` a pálya kapuján és a pad mögül is kivezet) és beszélteti: `worryLine()` (rollerezés), `coachLine()` (foci – sosem elégedett, `lastKick` alapján), `GRUMBLE`, `GOAL_GRUMBLE`, `ANGI_DEFEND`.
- Szökőkút-ivás (tilos!): a szökőkút pereménél **E** → `startFountain()`. Az apa felpattan és odafut (`ftnStand → ftnRun`), leszidja (`ftnScold`), majd visszakergeti Petyust Angihoz (`ftnChase → ftnWait → seat`); közben Petyus nem irányítható (`caught`, `chased`: robotpilóta `autoRun()`-nal, `FTN_WAY` a pálya ÉNy-i sarkánál), a végén családi szópárbaj. A párbeszédeket a `runSeq()`/`tickSeq()` mini-ütemező játssza le (egyszerre több sorozat is futhat; a `W()`/`until()` játék közben nem használható, mert az intro átugrása után a `cs.skip` igaz marad). Szövegek: `FTN_SHOUT`, `FTN_RUN`, `FTN_SIP`, `FTN_SCOLD`, `FTN_EXCUSE`, `FTN_CHASE`.
- Macska-jelenet: ha Petyus a pályán `CAT_IDLE` (10) mp-ig áll (és az apa a padon ül), magától focizni kezd (`autoBall` – az `idleFootball()` virtuális bemenetet ad az `updatePlayer()`-nek, így a cselezés/rúgás a megszokott kód; bármilyen bemenet visszaadja az irányítást). `CAT_COME` mp múlva a legközelebbi földön lévő macska (`callCat()`, `an.evt`) odamegy és fújtat; Petyus megijed, és a középkör körül menekül (`CHASE_LOOP`), a macska a sarkában. `CAT_DAD` mp múlva az apa feláll (`catStand → catLeave → catRun`), elkapja a macskát (`catCarry`), a kerítéstől feldobja egy pálya mögötti fa tetejére (`catThrow`, `pickCatTree()`, `treeTop()`, `TREES`), majd „káromkodva” (`#@&%!`) fenyegeti (`catCurse`) és visszaül (`return → seat`). Petyus közben Angihoz megy (`catToMom → catAtMom`). A macska a pálya déli bokrai alól lopakodik elő (`evt: sneak → approach → hiss → chase → held → flying → tree`). Két átvezető (cutscene) van benne: a macska érkezése és az apa közbelépése (`cineStart/cineFocus/cineCap/cineEnd`, `slowMo`, `airFocus()` a levegőben lévő pontra; fekete csíkok: `body.cine`). Landoláskor madárraj repül szét (`scatterBirds`, `flock`). A macska a fán marad, és `CAT_TREE_MEOW` (12) mp-enként nyávog; a jelenet a földön maradt macskákkal megismétlődhet. Állapotok: `cev`.
- Dekázás: a labda mellett **Q** (érintőn a HASZNÁL gomb) → `startJuggle()`. Minden repülésnél megjelenik a lenyomandó gomb (`JUG`: ← bal láb, → jobb láb, ↑ fej) egy rázáruló körrel; a találkozás ±`jugWindow()` (0,2 → 0,09 mp) ablakában kell lenyomni, a ritmus a számmal gyorsul. Korai / rossz / késő gomb → a labda leesik (`jugFail`). A legjobb eredmény a HUD-ban (`#jBest`) és a `localStorage`-ban (`petike.dekazasRekord`). A labda dekázás közben kinematikus (`ball.juggle`).
- Interakció-sorrend (`interactions()`): ivókút (E inni, Szóköz vízipisztoly) › morzsa apára › torony › bújócska (apánál, labda nélkül) › lufi (a lufis bácsinál) › roller › szökőkút (E inni, Szóköz pénzhalászat) › „Mutasd te, apa!” › morzsakérés › dekázás (a pad melletti csibészségek megelőzik a pad mellé támasztott rollert).
- Rollerezés: `updateRiding()` (rolleren **E**: kutyasétáltató mellett kutyaszán, a kalapos bácsi mellett verseny, különben leszállás; a mozgás a `rideStep(dt, boost)`) – kormányzás a kamera-relatív irány felé max. 2.4 rad/s, gyorsítás Shift, fék Szóköz; `mountScooter()`/`dismountScooter()` cseréli a rigeket (rolleres ↔ focista ruha) és a roller ütközőjét (`rollerCol`).

## Voxel objektumok (`src/voxels.js`)

- `VoxelGrid(size, seed)`: `box`, `ellipsoid`, `disc`, `cylX`, `line`, `sprinkle(tag, p, colors)`; `toGeometry()` csak a látható lapokat építi (x/z középre, y = 0-tól).
- Új objektum: builder függvény + egy bejegyzés a `CATALOG`-ban (`id, name, cat, variants, build, collider {r,h} vagy {hx,hz,h}, desc, use`). A katalógus oldal automatikusan megjeleníti; a játékban `place('id', x, y, z, rot, s)`.
- Felbontás-szintek: 0,05 m utcabútor/kerítés/fű · 0,08 m virágágyás · 0,10 m bokor/kő/autó/szökőkút · 0,15 m fák.

## Modell-pipeline (`tools/model-pipeline`, Python 3 + `requirements.txt`)

- `rebuild.py [--install]`: `models/source/{petya,angi,petike_foci}.glb` → voxelekre bontás + belső kitöltés → karok 90°-kal T-pose-ba (a voxelrácson) → összevont lapok (greedy meshing, csonthatárokon nem lép át) → csontváz + súlyozás → `models/build/*_tpose.glb`, `*_rigged.glb`; `--install` a riggeltet a `public/`-ba másolja.
  - Az ízület-magasságok a `BODY` szótárban vannak (csípő = a nadrág teteje, térd = közvetlenül a nadrág alatt). A karok szélességét az `ARMX` küszöb adja (focista: 0.265 – a kar 3 voxel széles!).
- `roller_tpose.py` + `rig_roller.py [--install]`: a dobozokból álló rolleres Petyus.
- `render2.py a.glb …`: gyors előnézet `preview.png`-be.
- Egyben: `npm run models` (Windows-on, ha nincs `python`, `py`-jal futtasd a szkripteket).

## Tesztelés / hibakeresés

- **Körülnézés (pásztázás):** egérrel (bal/középső gomb) vagy egy ujjal húzva a játékteret – `G.pan` eltolás (`panBy()` az `input.js`-ben), 3 mp után visszasiklik Petyusra; átvezetőben nincs.
- Zoom: a jelenet adja az alap-képkivágást (`G.viewSizeTarget`), erre szorzódik a játékos saját zoomja (`G.zoom`, 0,3 … 2,6; görgő, `+`/`−`, `0` = alap, érintőn két ujjas csippentés – `zoomBy()` az `input.js`-ben); cutscene-ben csak a jelenet képkivágása számít.
- `window.__game` debug-objektum: `petike()`, `petya()`, `angi()`, `ball`, `roller`, `mode`, `pstate`, `petyaMode`, `skipIntro()`, `use()`, `setZoom(z)`, `camTarget`, `ftn`, `cev`, `TREES`, `keys`, `cine`, `jug`, `jugPress(k)`, `juggle()`, `tick(mp)` (kézi léptetés – rejtett fülön is fut, ahol a `requestAnimationFrame` áll; az intro átugrásához a tickek között `await` kell).
- `?speed=4` URL-paraméter: gyorsított idő (1–8) a nyitójelenet teszteléséhez.
- Headless teszthez (Playwright) WebGL: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Módosítás után érdemes: nyitójelenet végigfut-e hibátlanul (`mode === 'play'`), és képernyőkép a releváns helyről.

## Ötletek / nyitott pontok

- **Csibészségek az 1. részhez** (mini játékok / jelenetek; részletek, poénok és a kódbeli kapcsolódás: [docs/terv-1-resz-csibeszsegek.md](docs/terv-1-resz-csibeszsegek.md), ott az állapotuk is). **Pontozás:** mindegyikért max. 3 csillag (★ teljesítés, ★★/★★★ mérhető eredményért, a legjobb számít), összesen ⭐ 30; **Csibészség-napló** (N / 📒): elvégzettek csillagokkal és legjobb eredménnyel, a hátralévők „???” + tipp; ⭐ x/30 a HUD-on és az augusztusi csempén; mentés `localStorage`-ban. **Kész:** a közös rendszer (`mischief.js`, `award(id, érték, extra)`) és mind a 10 csibészség.
  1. Fordított edzés: Petyus tanítja apát dekázni · 2. A szundikáló apa (torony a fején) · 3. Galambraj-vezénylés · 4. Vízipisztoly az ivókútból · 5. Kutyaszán · 6. Fotóbomba · 7. Pénzhalászat a szökőkútból (parkőr) · 8. Rollerverseny a nyugdíjassal · 9. Bújócska apával · 10. Lufis bácsi
- **2. rész: Szeptember** (folyamatban; kész: a lakás reggel, pizsamában, megnyitás + dev elérés): otthon (lakás, az alaprajz alapján) és iskola, napszakok (otthon reggel 6:00–7:30 → iskola 8:00–15:30 → otthon 16:00–22:00, csak előre), naptár (2026. szept. 2–30., hétvégén nincs iskola: átvezető képernyő), a játékos dönti el, mikor indul; a 20 m²-es szoba a testvéré (zárva), a 26 m²-es a szülőké; reggel mindenki pizsamában; 10 csibészség (3 + 4 + 3; az otthoni reggel hármának terve kész: „A tejszínes kávé”, „Karcsi nagy szökése”, „Hol a kulcs, Angi?”); csak az 1. rész ≥ 15 ⭐-a után nyílik meg; fejlesztői elérés (`?resz=2`) csak `import.meta.env.DEV`-ben. Részletek és nyitott kérdések: [docs/terv-2-resz-szeptember.md](docs/terv-2-resz-szeptember.md).
- Mixamo-animációk betöltése (`AnimationMixer`) a kézi pózok helyett – a csontnevek már egyeznek.
- **Mobilon is jól játszható játék** (folyamatban, `feature/mobil`; kész: 1. mobil minőség mód + fekvő elrendezés, 2. érintéses vezérlés csibészségenként, 3. teljes képernyő, hang, PWA/offline): mobil minőség mód és fekvő elrendezés → érintéses vezérlés csibészségenként → teljes képernyő, PWA, telefonos apróságok → tesztelés valódi telefonon. Részletek: [docs/terv-mobil.md](docs/terv-mobil.md).
