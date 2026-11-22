# 2. rész: Szeptember – terv

**Állapot:** terv (még nem kezdtük el). Ezt a dokumentumot lépésenként bővítjük.

## Röviden

- **Két helyszín:** otthon (lakás) és iskola.
- **Napszakok:** otthon reggel **6:00–7:30**, iskola **8:00–15:30**, otthon délután–este **16:00–22:00**.
- **10 csibészség:** 3 otthon reggel, 4 az iskolában, 3 otthon délután (mint az 1. részben: mindegyikért max. 3 ⭐, összesen ⭐ 30, saját napló).
- **Szereplők most:** Petyus, Petya (apa), Angi (anya). Később még három szereplő jön – velük egyelőre nem foglalkozunk.
- **Nézet:** izometrikus, voxel stílus, mint az 1. részben.

## Megnyitás és fejlesztői elérés

- **Feltétel:** a 2. rész csak akkor nyílik meg, ha az 1. részben a csibészségekből **legalább 15 ⭐** összegyűlt (`totalStars()` a `mischief.js`-ben, mentés: `petyus.r1.csibeszsegek`).
- **Kezdőképernyő:** a szeptemberi polaroidon zárva „🔒 15 ⭐ kell (most: x)” felirat; ha megvan a 15 ⭐, a csempe indítható lesz (mint az augusztusi). Első megnyíláskor egy kis „Új rész nyílt meg!” jelzés.
- **Fejlesztői elérés:** csak a fejlesztői szerveren (`npm run dev`), a kiadott (prod) buildben nincs benne.
  - Megvalósítás: `import.meta.env.DEV` ágban – a Vite a buildből kidobja, így a prod oldalon semmilyen URL-lel vagy gombbal nem érhető el.
  - Használat: `?resz=2` URL-paraméter (egyből a 2. részt indítja), valamint `?resz=2&hely=iskola&nap=5` jellegű ugrás a helyszínek / napok teszteléséhez; a kezdőképernyőn dev módban egy kis „DEV: minden rész nyitva” jelzés.
  - Ellenőrzés: a build után a `dist/` JS-ében nem szerepelhet a dev-ág (pl. egy keresés a `resz=` szövegre).

## Napok, naptár, váltás a helyszínek között

- **Kör:** otthon reggel → iskola → otthon délután. Csak előre lehet lépni, vissza nem. Egy teljes kör = egy nap; utána a következő nap reggele jön.
- **Naptár:** a HUD-on (és váltáskor nagyban) látszik az aktuális nap: „2026. szeptember 2., szerda”. Indulás: **2026. szeptember 2.** (szerda).
- **Vége:** az utolsó nap után lejár a hónap. Ilyenkor a hónapot csak elölről lehet kezdeni (újra szept. 2-től), de a **csibészségek eredményei megmaradnak** (a legjobb eredmény számít, mint eddig).
- **Váltás:** a helyszín végén (pl. az iskolatáska és a cipő felvétele után az ajtóban, vagy ha lejár a napszak ideje) egy rövid átvezető / áttűnés visz a következő helyszínre; közben a naptár és az óra mutatja az időugrást.
- **Óra:** a játékidő gyorsítva telik (pl. 1 valós mp = 1 játékperc körül – hangolandó); a napszak végén figyelmeztetés („Indulni kell!”).

## Helyszín: Otthon (a lakás)

### Az alaprajz értelmezése (a csatolt kép alapján)

A lakás egyszintes, nagyjából **13 m × 7,5 m**, téglafalakkal, két erkéllyel. Az északi oldal (a kép teteje) és a déli oldal (a kép alja) egy-egy szobasor, köztük – a felső sor alatt – egy kb. 1,3 m széles előtér/folyosó.

| Helyiség | Méret | Berendezés a rajzon | Javasolt szerep |
|---|---|---|---|
| Fürdőszoba | 5 m² (2,88 × 1,78 m) | kád, mosdó | reggeli fogmosás, fürdés este |
| WC | 2 m² (1,25 × 1,78 m) | WC, kis mosdó | |
| Konyha–étkező | 21 m² (4,65 m széles + a folyosó vége) | konyhapult mosogatóval és főzőlappal az északi ablakok alatt, 6 személyes étkezőasztal, radiátor | reggeli, vacsora, családi jelenetek |
| Kis szoba | 10 m² (2,98 × 3,20 m) | íróasztal monitorral, egyszemélyes ágy; ajtó az északi erkélyre | **Petyus szobája** |
| Előtér / folyosó | kb. 1,28 m széles, 3,83 m hosszú (a fürdő/WC alatt, a konyháig) | bejárati ajtó a nyugati falon | cipő, iskolatáska, indulás |
| Nagy hálószoba | 20 m² (5,18 × 3,70 m) | beépített gardrób, franciaágy, TV-szekrény / komód | (nyitott kérdés, lásd lent) |
| Nappali–háló | 26 m² (kb. 7 × 3,7 m) | franciaágy, állólámpa, kanapé, TV-szekrény, gardróbsáv (84 cm) | **szülők** szobája / nappali; ajtó a keleti erkélyre |
| Erkély (észak) | kb. 3 m × 1,5 m | | a kis szobából nyílik |
| Erkély (kelet) | kb. 1,8 m × 4 m | | a nappaliból nyílik |

- Ablakok: északon a konyha és a kis szoba felett, délen a két nagy szoba alatt, keleten a kis szoba és a nappali mellett.
- Ajtók: a fürdő, a WC és a konyha a folyosóról nyílik; a két déli szoba a folyosóról / a konyha felől.
- **Méretarány:** 1 egység = 1 m, mint az 1. részben; a lakás bal felső belső sarka a (0, 0), x kelet, z dél felé nő (a rajz szerint). A karakterek (Petyus ≈ 1,5 m, Petya 1,86 m, Angi 1,75 m) a 2,6–2,7 m belmagasságú szobákban jól elférnek.

### Megjelenítés

- **Babaház-nézet:** a kamera délkelet felől néz (mint a parkban), ezért a déli és a keleti falak (és ajtókeretek) csak kb. 0,5 m magasak, vagy áttetszők, hogy belássunk; az északi és nyugati falak teljes magasak, ablakokkal. A belső falak szobáról szobára átlátszóvá válhatnak, ahol Petyus van (a meglévő `occlude.js` ötlete falakra is).
- **Mennyezet nincs**, a padló szobánként más (parketta a szobákban, csempe a fürdőben/konyhában).
- **Bútorok:** voxel kellékek a `voxels.js` katalógusába (kád, WC, mosdó, konyhapult, főzőlap, hűtő, étkezőasztal + székek, ágyak, íróasztal + monitor, gardrób, kanapé, TV-szekrény, állólámpa, szőnyeg, iskolatáska, cipők) – a katalógus oldalon is látszanak.
- **Fény:**
  - reggel (6:00–7:30): világos, hűvös reggeli napfény a keleti ablakokon, élénk, „jól megvilágított” lakás;
  - délután–este (16:00–22:00): melegedő fény, naplemente az ablakokon, este lámpák (a szobák lámpái külön fényforrások, kevés árnyékkal, hogy telefonon is fusson).
- **Ütközők:** falak, bútorok (a meglévő `addBoxCol` / `collide` rendszerrel); ajtónyílások szabadok.

### Szereplők otthon reggel (első kör)

- **Petyus:** az ágyából kel a kis szobában, a játékos irányítja.
- **Petya (apa):** a konyhában kávét főz / újságot olvas az asztalnál, közben instruál („Fogmosás! Öltözz! Hol a tolltartód?”).
- **Angi (anya):** reggelit készít, uzsonnát csomagol, a folyosón keresi a kulcsot.
- A ruhák: Petyus pizsamában indul, öltözés után iskolai ruhában (új rig-változat vagy színcsere – külön döntés).

## Helyszín: Iskola

Később részletezzük (osztályterem, folyosó, udvar/tornaterem, ebédlő?). A 4 iskolai csibészség és a tanár(ok) / osztálytársak itt jönnek majd.

## Csibészségek

10 csibészség: 3 otthon reggel, 4 az iskolában, 3 otthon délután – a tartalmukat később találjuk ki. A rendszer ugyanaz, mint az 1. részben (`mischief.js`: `award`, napló, ⭐), de részenként külön listával és mentéssel (`petyus.r2.csibeszsegek`).

## Technikai terv (váz)

1. **Részek szétválasztása:** ma a játék egyetlen pályára (a parkra) épül. Kell egy rész/helyszín-betöltő: a közös motor (rigek, `Actor`, buborékok, input, minőség, kamera, csibészség-rendszer) marad, a világ (`world.js` park) és a rész-specifikus tevékenységek részenként külön modulba kerülnek (pl. `src/ep1/…` és `src/ep2/…`), és a kezdőképernyőről indított rész tölti be a sajátját.
2. **Csibészség-rendszer részenként:** `MISCHIEFS` és a mentési kulcs részenként; az összesítés (⭐) részenként és összesen.
3. **Megnyitás + fejlesztői elérés** (fent).
4. **Naptár és napszakok:** állapot (`nap`, `napszak`, játékóra), mentés `localStorage`-ba, HUD-elem, átvezetők a váltáshoz.
5. **Otthon – reggel:** a lakás voxelből az alaprajz alapján (falak, ajtók, ablakok, padló, bútorok), babaház-nézet, reggeli fények, Petyus/Petya/Angi elhelyezése, mozgás, ütközés. **← ez az első fejlesztési lépés.**
6. Iskola, délutáni otthon, csibészségek – később.

## Első lépés (következő munkamenet)

A 2. rész **otthon, reggeli időszakkal** induljon: a fejlesztői eléréssel (`?resz=2`) betölthető lakás az alaprajz szerint, berendezve, reggeli fényekkel, a három szereplővel; Petyus irányítható, a falak és bútorok ütköznek. A megnyitási feltétel (15 ⭐) és a kezdőképernyő-csempe ugyanebben a körben.

## Nyitott kérdések

1. **Utolsó nap:** a leírás szerint „2026. szeptember 30. hétfő” – de 2026. szeptember 30. **szerda**, a hétfő szeptember 28. Melyik legyen az utolsó nap?
2. **Hétvégék:** szeptember 2-től 30-ig 29 nap, ebből 21 hétköznap. Hétvégén nincs iskola – kimaradnak a hétvégék (csak hétköznapok, 21 kör), vagy hétvégén más a menet (pl. egész nap otthon / kirándulás)?
3. **A 20 m²-es szoba** (franciaágy, gardrób) kié – a szülőké, és a 26 m²-es nappali–háló a nappali? Vagy a később érkező három szereplő (pl. nagyszülők, testvér?) egyikéé?
4. **A napszak ideje:** a napszak végén automatikusan vált (pl. 7:30-kor indulás), vagy a játékos dönti el, mikor indul (és a csibészségekhez van elég idő)?
5. **Öltözés / ruhák:** kell-e pizsamás és iskolai ruhás Petyus (új modell / színváltozat), és apa–anya otthoni ruhában legyen?
