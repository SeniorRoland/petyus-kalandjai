# Petyus kalandjai

Izometrikus, voxel stílusú 3D böngészős játéksorozat Three.js-ben. Petyus (a gyerek), Petya (apa) és Angi (anya) kalandjai.

A sorozat 12 részből áll, mindegyik egy hónap (augusztustól júliusig); a kezdőképernyőn mind látszik, egyelőre csak az első játszható.

**1. rész: Augusztus – Egy nap a parkban** – Petya és Angi a parkban sétál, Petyus elektromos rollerrel megy utánuk, a focipályánál átöltözik, és focizni kezd – a játékos irányítja. Közben apa folyamatosan instruál, és Petyus 10 **csibészséget** fedezhet fel (mindegyikért max. 3 csillag, ⭐ 30; napló: **N** / 📒): fordított edzés, torony a szundikáló apa fején, galambraj-vezénylés, vízipisztoly az ivókútból, kutyaszán, fotóbomba, pénzhalászat a szökőkútból, rollerverseny a nyugdíjassal, bújócska apával, lufis bácsi.

**Játszd online:** https://seniorroland.github.io/petyus-kalandjai/ (a GitHub Pages oldal, lásd lent: *Publikálás*)

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
| E | használat: ivókút, rollerre fel–le, a csibészségek indítása |
| Q | dekázás a labda mellett (← → ↑, amikor a kör ráér a gombra) |
| N | csibészség-napló |
| R | labda Petyus elé |
| Görgő / + − | zoom (0: alap) |
| M | hang ki/be |
| H | súgó elrejtése |
| Enter / Esc | nyitójelenet átugrása |

## Mappák

```
index.html, designterv.html   oldalak
src/main.js, src/*.js         a játék ES-modulokban (state.js: közös állapot G)
src/activities/               ivókút, szökőkút, macska, dekázás, roller és a 10 csibészség
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

## Publikálás (GitHub Pages)

A játék statikus oldal (a `dist/` mappa), ezért a GitHub Pages közvetlenül ki tudja szolgálni. A `vite.config.js`-ben `base: './'` van, így a projekt-alútvonalon (`/petyus-kalandjai/`) is működik.

- **Kiadás verzió-tagre:** a [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) csak akkor fut, ha a `main` ágra verzió-tag kerül (3 jegyű verzió, pl. `v0.0.1`, egyezzen a `package.json` verziójával): `npm ci` → `npm run build` → a `dist/` feltöltése → kiadás. A lépések: [CLAUDE.md – Verzió kiadása](CLAUDE.md#verzió-kiadása).
- **Egyszeri beállítás a repóban:** *Settings → Pages → Source: **GitHub Actions***, valamint *Settings → Environments → github-pages → Deployment branches and tags*: tag-szabály `v*` (különben a GitHub csak a `main` ágról enged kiadást).
- **Cím:** https://seniorroland.github.io/petyus-kalandjai/ · a design terv: `…/designterv.html`
- Ág-rend: fejlesztés `feature/*` → `develop` → kiadás: `develop` → `main`, majd verzió-tag a `main`-en (ez indítja a kiadást).

