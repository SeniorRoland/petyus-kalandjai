# Petike a parkban – projekt-útmutató Claude Code-hoz

Izometrikus, voxel stílusú 3D böngészős játék (Three.js r187 + Vite 8). Petike (gyerek), Petya (apa) és Angi (anya) egy kisvárosi parkban; a nyitójelenet után a játékos Petikét irányítja: focizik, iszik az ivókútból, elektromos rollerezik, miközben az apa folyamatosan instruálja.

- A felhasználó magyar; **a játékban minden szöveg magyar** (buborékok, súgó, feliratok). Kódkommentek angolul vagy magyarul is lehetnek.
- Futtatás: `npm install`, majd `npm run dev` (http://localhost:5173). Build: `npm run build` → `dist/`.
- Objektumkatalógus (design terv): `designterv.html` – ugyanazt a `src/voxels.js`-t használja, mint a játék.

## Git munkafolyamat

- `main`: kiadott/stabil állapot · `develop`: fejlesztési ág, a `main`-ből ágazik.
- **Minden fejlesztés új feature ágon indul a `develop`-ból:** `git switch develop` → `git switch -c feature/<rövid-név>`, és ott commitolunk. Közvetlenül a `main`-re vagy a `develop`-ra nem commitolunk.
- A feature ág visszaolvasztása a `develop`-ba (és a `develop` → `main`), valamint a push csak a felhasználó kérésére történik.

## Fájlok

| Fájl | Tartalom |
|---|---|
| `index.html` | UI (start képernyő, HUD, súgó, buborékok, érintéses vezérlők, `#prompt` interakciós felirat) |
| `src/game.js` | a teljes játék (egy modul, szakaszokra bontva – lásd lent) |
| `src/voxels.js` | voxel objektumkönyvtár: `VoxelGrid`, `CATALOG`, `getGeometry(id, variant)` |
| `src/designterv.js` | a 3D katalógus oldal logikája |
| `public/*.glb` | a játék által betöltött modellek: `petya`, `angi`, `petike_roller`, `petike_foci` (riggelt, T-pose), `roller_kicsi` (a roller) |
| `models/source/*.glb` | az **eredeti**, nem riggelt karaktermodellek (lelógó karral) – a modell-pipeline bemenete |
| `tools/model-pipeline/` | Python: T-pose + csontváz generálása (lásd lent) |

## `src/game.js` szakaszai (a `// ----` fejlécek szerint)

utils → renderer/scene → voxel batch (`Batch`: összeolvasztott dobozok egy hálóban) → tiles/ground (1 m-es csempék: `T.GRASS/PARK/PATH/PITCH/ROAD/SIDEWALK/PLAZA`, `groundH()`) → colliders (`addBoxCol`, `addCircleCol`, `collide()`; `h` = magasság, `e` = pattanás) → world building (`buildWorld`, épületek, pálya, kerítés) → instanced voxel props (`place(id,x,y,z,rot,s,variant,opts)` + `buildInstances()`) → character rigs (`rigFromSkinned`, `rigFromGLTF` régi fallback, `makePerson` NPC) → `Actor` → animals → FX → audio (WebAudio szintetizált hangok; `soundAt(x,z,fn)` térhangzás, `startAmbience()` alapzaj) → UI helpers (`say(actor, szöveg)`) → input → game state → ball (fizika, gól) → player control (`updatePlayer`, rúgás, cselezés) → roller (`rollerRide`, `poseRider`, `RIDE_SKINNED`) → NPCs & animals → cutscene system (`W()`, `until()`, `tween()`, `runIntro`, `finishIntro`) → play activities (ivókút, szökőkút, macska-jelenet, dekázás, roller, apa AI) → in-game cutscenes (`cine`) → camera → ambience (`updateAmbience`: madarak, csengő, duda, kutya) → main loop (`step(dt)`) → boot.

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
- `CFG` (skála + régi felosztási küszöbök): Petya 0.93, Angi 0.86, focista Petike 0.70, rolleres Petike 0.95; a roller 0.72.
- Ha nem skinnelt GLB-t kap, a `rigFromGLTF` a régi módon (voxel-y/x küszöbökkel) bontja végtagokra.
- **Gyakori hiba:** Blenderből FBX-et menteni `.glb` névvel → a betöltés elhasal. Mindig glTF 2.0 Binary (.glb) export.

## Játékállapotok

- `mode`: `loading → title → intro → play`. Az intro egy `async` jelenet (`runIntro`), Enterrel/Kihagyással átugorható (`finishIntro` determinisztikus végállapotot állít be).
- `pstate` (Petike): `free | toDrink | drinking | riding | toFountain | ftnDrink | caught | chased | atMom | autoBall | catScared | catChased | catSafe | catToMom | catAtMom | juggle`. Interakció: **E** (`usePressed`), a `interactions()` dönti el, mi elérhető, és írja a `#prompt`-ot.
- `petyaMode` (apa): `bench | standing | leaving | follow | return | seat`. Az `updateDad()` mozgatja (`navTarget()` a pálya kapuján és a pad mögül is kivezet) és beszélteti: `worryLine()` (rollerezés), `coachLine()` (foci – sosem elégedett, `lastKick` alapján), `GRUMBLE`, `GOAL_GRUMBLE`, `ANGI_DEFEND`.
- Szökőkút-ivás (tilos!): a szökőkút pereménél **E** → `startFountain()`. Az apa felpattan és odafut (`ftnStand → ftnRun`), leszidja (`ftnScold`), majd visszakergeti Petikét Angihoz (`ftnChase → ftnWait → seat`); közben Petike nem irányítható (`caught`, `chased`: robotpilóta `autoRun()`-nal, `FTN_WAY` a pálya ÉNy-i sarkánál), a végén családi szópárbaj. A párbeszédeket a `runSeq()`/`tickSeq()` mini-ütemező játssza le (egyszerre több sorozat is futhat; a `W()`/`until()` játék közben nem használható, mert az intro átugrása után a `cs.skip` igaz marad). Szövegek: `FTN_SHOUT`, `FTN_RUN`, `FTN_SIP`, `FTN_SCOLD`, `FTN_EXCUSE`, `FTN_CHASE`.
- Macska-jelenet: ha Petike a pályán `CAT_IDLE` (10) mp-ig áll (és az apa a padon ül), magától focizni kezd (`autoBall` – az `idleFootball()` virtuális bemenetet ad az `updatePlayer()`-nek, így a cselezés/rúgás a megszokott kód; bármilyen bemenet visszaadja az irányítást). `CAT_COME` mp múlva a legközelebbi földön lévő macska (`callCat()`, `an.evt`) odamegy és fújtat; Petike megijed, és a középkör körül menekül (`CHASE_LOOP`), a macska a sarkában. `CAT_DAD` mp múlva az apa feláll (`catStand → catLeave → catRun`), elkapja a macskát (`catCarry`), a kerítéstől feldobja egy pálya mögötti fa tetejére (`catThrow`, `pickCatTree()`, `treeTop()`, `TREES`), majd „káromkodva” (`#@&%!`) fenyegeti (`catCurse`) és visszaül (`return → seat`). Petike közben Angihoz megy (`catToMom → catAtMom`). A macska a pálya déli bokrai alól lopakodik elő (`evt: sneak → approach → hiss → chase → held → flying → tree`). Két átvezető (cutscene) van benne: a macska érkezése és az apa közbelépése (`cineStart/cineFocus/cineCap/cineEnd`, `slowMo`, `airFocus()` a levegőben lévő pontra; fekete csíkok: `body.cine`). Landoláskor madárraj repül szét (`scatterBirds`, `flock`). A macska a fán marad, és `CAT_TREE_MEOW` (12) mp-enként nyávog; a jelenet a földön maradt macskákkal megismétlődhet. Állapotok: `cev`.
- Dekázás: a labda mellett **Q** (érintőn a HASZNÁL gomb) → `startJuggle()`. Minden repülésnél megjelenik a lenyomandó gomb (`JUG`: ← bal láb, → jobb láb, ↑ fej) egy rázáruló körrel; a találkozás ±`jugWindow()` (0,2 → 0,09 mp) ablakában kell lenyomni, a ritmus a számmal gyorsul. Korai / rossz / késő gomb → a labda leesik (`jugFail`). A legjobb eredmény a HUD-ban (`#jBest`) és a `localStorage`-ban (`petike.dekazasRekord`). A labda dekázás közben kinematikus (`ball.juggle`).
- Rollerezés: `updateRiding()` – kormányzás a kamera-relatív irány felé max. 2.4 rad/s, gyorsítás Shift, fék Szóköz; `mountScooter()`/`dismountScooter()` cseréli a rigeket (rolleres ↔ focista ruha) és a roller ütközőjét (`rollerCol`).

## Voxel objektumok (`src/voxels.js`)

- `VoxelGrid(size, seed)`: `box`, `ellipsoid`, `disc`, `cylX`, `line`, `sprinkle(tag, p, colors)`; `toGeometry()` csak a látható lapokat építi (x/z középre, y = 0-tól).
- Új objektum: builder függvény + egy bejegyzés a `CATALOG`-ban (`id, name, cat, variants, build, collider {r,h} vagy {hx,hz,h}, desc, use`). A katalógus oldal automatikusan megjeleníti; a játékban `place('id', x, y, z, rot, s)`.
- Felbontás-szintek: 0,05 m utcabútor/kerítés/fű · 0,08 m virágágyás · 0,10 m bokor/kő/autó/szökőkút · 0,15 m fák.

## Modell-pipeline (`tools/model-pipeline`, Python 3 + `requirements.txt`)

- `rebuild.py [--install]`: `models/source/{petya,angi,petike_foci}.glb` → voxelekre bontás + belső kitöltés → karok 90°-kal T-pose-ba (a voxelrácson) → összevont lapok (greedy meshing, csonthatárokon nem lép át) → csontváz + súlyozás → `models/build/*_tpose.glb`, `*_rigged.glb`; `--install` a riggeltet a `public/`-ba másolja.
  - Az ízület-magasságok a `BODY` szótárban vannak (csípő = a nadrág teteje, térd = közvetlenül a nadrág alatt). A karok szélességét az `ARMX` küszöb adja (focista: 0.265 – a kar 3 voxel széles!).
- `roller_tpose.py` + `rig_roller.py [--install]`: a dobozokból álló rolleres Petike.
- `render2.py a.glb …`: gyors előnézet `preview.png`-be.
- Egyben: `npm run models` (Windows-on, ha nincs `python`, `py`-jal futtasd a szkripteket).

## Tesztelés / hibakeresés

- `window.__game` debug-objektum: `petike()`, `petya()`, `angi()`, `ball`, `roller`, `mode`, `pstate`, `petyaMode`, `skipIntro()`, `use()`, `setZoom(z)`, `camTarget`, `ftn`, `cev`, `TREES`, `keys`, `cine`, `jug`, `jugPress(k)`, `juggle()`, `tick(mp)` (kézi léptetés – rejtett fülön is fut, ahol a `requestAnimationFrame` áll; az intro átugrásához a tickek között `await` kell).
- `?speed=4` URL-paraméter: gyorsított idő (1–8) a nyitójelenet teszteléséhez.
- Headless teszthez (Playwright) WebGL: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Módosítás után érdemes: nyitójelenet végigfut-e hibátlanul (`mode === 'play'`), és képernyőkép a releváns helyről.

## Ötletek / nyitott pontok

- `src/game.js` felbontása modulokra (world, rigs, actors, activities, dad AI, audio, ui).
- Mixamo-animációk betöltése (`AnimationMixer`) a kézi pózok helyett – a csontnevek már egyeznek.
