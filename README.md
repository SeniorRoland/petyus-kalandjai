# Petyus kalandjai

Izometrikus, voxel stílusú 3D böngészős játéksorozat Three.js-ben. Petyus (a gyerek), Petya (apa) és Angi (anya) kalandjai.

A sorozat 12 részből áll, mindegyik egy hónap (augusztustól júliusig); a kezdőképernyőn mind látszik, egyelőre csak az első játszható.

**1. rész: Augusztus – Egy nap a parkban** – Petya és Angi a parkban sétál, Petyus elektromos rollerrel megy utánuk, a focipályánál átöltözik, és focizni kezd – a játékos irányítja.

## Indítás

Kell hozzá: **Node.js 20.19 vagy újabb** (https://nodejs.org).

```bash
npm install
npm run dev        # http://localhost:5173 – automatikusan újratölt, ha módosítasz
```

Windows-on a `start.bat` ugyanezt csinálja (első indításkor telepít is).

```bash
npm run build      # kiadható változat a dist/ mappába
npm run preview    # a buildelt változat kipróbálása
```

A design terv (3D objektumkatalógus): http://localhost:5173/designterv.html

## Irányítás

| Billentyű | Funkció |
|---|---|
| WASD / nyilak | mozgás (rolleren: kormányzás) |
| Shift | futás / roller gyorsítás |
| Szóköz | rúgás – nyomva tartva erősebb, magasabb (rolleren: fék) |
| E | ivókút / rollerre fel–le |
| R | labda Petyus elé |
| Görgő | zoom |
| M | hang ki/be |
| H | súgó elrejtése |
| Enter / Esc | nyitójelenet átugrása |

## Mappák

```
index.html, designterv.html   oldalak
src/main.js, src/*.js         a játék ES-modulokban (state.js: közös állapot G)
src/activities/               ivókút, szökőkút, macska, dekázás, roller
src/voxels.js                 voxel objektumkönyvtár (játék + katalógus közös)
src/designterv.js             katalógus oldal
public/                       a betöltött .glb modellek (riggelt, T-pose karakterek + roller)
models/source/                eredeti karaktermodellek (a modell-pipeline bemenete)
tools/model-pipeline/         Python: T-pose + csontváz generálása
```

## Modellek újragenerálása

```bash
pip install -r tools/model-pipeline/requirements.txt
npm run models     # models/source → models/build → public/
```

A karakterek 27 csontos, Mixamo-nevű csontvázat kapnak (`mixamorig:Hips` …), így Mixamo-animációk közvetlenül ráilleszthetők. Blenderből mindig **glTF 2.0 (.glb)** formátumban exportálj, ne FBX-ben.

Részletes fejlesztői leírás: [CLAUDE.md](CLAUDE.md).
