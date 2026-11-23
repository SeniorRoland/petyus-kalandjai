# 1. rész (Augusztus – Egy nap a parkban): csibészség-ötletek

Mini játékok és jelenetek, amelyeket a meglévő rendszerekre lehet építeni. Mindegyiknél: mi a játék, mi a poén, mire épül a kódban.
**Állapot:** a közös pontozó rendszer (`mischief.js` + napló) és mind a 10 csibészség kész (tetszés szerinti sorrendben).

## Pontozás és csibészség-napló (közös rendszer, minden csibészségre)

- **Csillagok:** minden csibészségért **legfeljebb 3 csillag** jár. A teljesítés mindig legalább ★ (ha valami nem mérhető, akkor csak ennyi); ★★ és ★★★ egy mérhető eredményért (darab, magasság, idő, találat – lásd a táblázatban és az egyes leírásoknál). Mindig a **legjobb** eredmény számít, újra lehet próbálni.
- **Visszajelzés teljesítéskor:** képregényes felirat („Csibészség teljesítve: A szundikáló apa ★★☆”), a csillagok egyesével „bepattannak” hanggal; ha javított a korábbin: „Új legjobb!”.
- **Csibészség-napló** (megtekinthető lista): a játék közben az **N** gombbal vagy a HUD 📒 gombjával nyílik (érintőn is), a kezdőképernyőről az augusztusi csempe alatti „Napló” linkkel.
  - **Elvégzett:** név, csillagok (★★☆), legjobb eredmény (pl. „7 tárgy a fején”).
  - **Még hátravan:** szürke „???” név és egy rövid **tipp**, hol keresse (lásd a táblázatban) – a felfedezés is a játék része. A teljes nevet csak a teljesítés után mutatja.
  - Fejléc: összesen **⭐ x / 30** és „y / 10 csibészség”.
- **Összesítés máshol:** a HUD-on a gólok és a dekázás-rekord mellett ⭐ x/30; a kezdőképernyő augusztusi csempéjén is (pl. „⭐ 7/30”).
- **Mentés:** a böngészőben (`localStorage`, kulcs pl. `petyus.r1.csibeszsegek`: `{ id: { stars, best, at } }`), mint a dekázás-rekord.
- **Kód (kész):** `src/mischief.js`: a csibészségek listája (`MISCHIEFS`: `id`, `title`, `hint`, `fmt(érték, extra)` a napló szövegéhez, `stars(érték, extra)` → 1–3, `lower: true`, ha a kisebb eredmény a jobb), `award(id, érték, extra)` → csillagszám, mentés, felirat; a napló felülete (`#journal` panel, képregényes stílus). Minden mini játék a végén csak `award(...)`-ot hív.
- **Javaslat:** a már meglévő **szökőkút-ivás** is bekerülhetne 11. csibészségként (★ ivás; ★★ legalább 3 korty, mielőtt apa odaér; ★★★ 5 korty és Angi védelmére kel). Ekkor az összesen ⭐ 33.

| # | Csibészség | ★ | ★★ | ★★★ | Tipp a naplóban (amíg nincs meg) | Állapot |
|---|---|---|---|---|---|---|
| 1 | Fordított edzés: Petyus tanítja apát dekázni | apa dekáz | 8 érintés | 15 érintés | „Apa mindig okosabb… vagy mégsem?” | **kész** |
| 2 | A szundikáló apa | 3 tárgy a fején | 6 tárgy | 10 tárgy, a tetején a labda | „Ha apa sokáig ül a padon…” | **kész** |
| 3 | Galambraj-vezénylés | galamb száll apára | 8 galamb | 15 galamb, 60 mp-en belül | „Angi táskájában van valami morzsás.” | **kész** |
| 4 | Vízipisztoly az ivókútból | 1 találat | 8 találat | 12 találat, köztük apa feje | „Az ivókútból nem csak inni lehet.” | **kész** |
| 5 | Kutyaszán | végigér | legfeljebb 3 ütközés | ütközés nélkül a szökőkútig | „A szomszéd néni kutyája unatkozik.” | **kész** |
| 6 | Fotóbomba | 1 elrontott fotó | 3 a 5-ből | mind az 5, és az egyiken galamb van a kezében | „Anya fotózni készül a szökőkútnál.” | **kész** |
| 7 | Pénzhalászat a szökőkútból | 3 érme | 6 érme | 10 érme lebukás nélkül | „Valami csillog a szökőkút alján.” | **kész** |
| 8 | Rollerverseny a nyugdíjassal | célba ér | félúton vezet | legyőzi a bácsit (szélárnyékból előz a turbó előtt) | „A padon ülő bácsi gyorsnak tartja magát.” | **kész** |
| 9 | Bújócska apával | 20 mp rejtőzés | 40 mp | apa feladja („Nem láttad a gyereket?”) | „Apa szeret keresgélni.” | **kész** |
| 10 | Lufis bácsi | felszáll a lufikkal | eléri a labdát | eléri, és egy lufi sem pukkad ki | „Valaki lufit árul a park szélén.” | **kész** |

---

## 1. Fordított edzés: Petyus tanítja apát dekázni  ✅ kész

- **Megvalósítás** (`src/activities/coach.js`): Petyus a labdával a padon ülő apához megy → **E – Mutasd te, apa!** → rövid párbeszéd (Angi: „Petya… a derekad.”), apa feláll, 2 m-re a padtól dekázik; a játékos irányítja (ugyanaz a QTE, `jug.who = Petya`, `jug.dad`: ablak 0,13 → 0,075 mp). Petyus közben edzi: apa saját mondatai + új poénok (`KID_COACH`), mérföldkövek 3/5/8/10/15/20/25 érintésnél, Angi aggódik. Leejtés után: Petyus ítélete, apa kifogása, „ÁÚ!! A DEREKAM!”, Angi: „Hozom a Voltarent.”, csillagok (`award('apa-dekaz', n)`), apa bicegve, morogva ül vissza (`dad.limpT`).

- **Játék:** Petya felveszi a kesztyűt: „Majd én megmutatom!” Most a játékos őt irányítja ugyanazzal a gyorsasági (quick-time) játékkal, mint a dekázást, csak sokkal szűkebb időablakkal („apa már nem olyan fürge”).
- **Poén:** Petyus edzőként Petya saját szövegeivel szól be neki: „Fejet fel, apa!”, „Ez passz volt vagy simogatás?” A végén Petya „meghúzza a derekát”, és sántikálva ül vissza a padra.
- **Mire épül:** dekázás (`activities/juggle.js`: `JUG`, `jugWindow`, `jugPress`), apa-szövegek (`coachLine` a `dad.js`-ben).
- **Csillagok:** ★ apa dekáz (bármennyit) · ★★ 8 érintés · ★★★ 15 érintés (apa szűkebb időablakkal dolgozik, mint Petyus).

## 2. A szundikáló apa  ✅ kész

- **Megvalósítás** (`src/activities/nap.js`): ha apa `DOZE_AFTER` (30) mp-ig nyugton ül a padon, és Petyus nincs 3 m-en belül, elalszik (`petyaMode = 'doze'`): horkol (buborék + hang, néha nagy „HRRRR!”). Petyus a pad mögé lopakodik: **E – Torony apa fejére (csitt!)** → `pstate = 'tower'`: a jel ide-oda leng egy sávon, **Szóköz / E**, amikor a zöldben van (a zöld sáv a toronnyal szűkül, nagy horkolásnál remeg). 10 tárgy (toboz, falevél, kavics, … a tetején a labda); elvétve leborul, apa felriad („Ki volt az?!”), Angi fütyörészik, Petyus: „Csak a galambok voltak!”. Kész torony: Angi lefényképezi, aztán egy hatalmas horkolás úgyis ledönti. Ha senki nem zavarja, `WAKE_AFTER` (80) mp után magától felébred („Nem aludtam! Csak pihentettem a szemem.”). A tárgyak a `#tower` panelen, a torony apa feje fölött himbálózik.

- **Játék:** egy idő után Petya elalszik a padon, és horkol. Petyus odalopakodik, és tornyot épít a fejére: toboz, falevél, végül a focilabda. Csak akkor lehet rakni, amikor épp nem horkant nagyot; rossz pillanatban leborul a torony.
- **Poén:** Petya felriad: „Ki volt az?!” Angi fütyörészve néz az égre. A legmagasabb torony rekordként mentődik (mint a dekázás-rekord).
- **Mire épül:** ülő póz (`Actor.sit`), gyorsasági gombnyomás (a dekázás mintájára), hangok (`audio.js`), rekord a `localStorage`-ban.
- **Csillagok:** ★ 3 tárgy a fején · ★★ 6 tárgy · ★★★ 10 tárgy, a tetején a focilabda (a torony magassága a mért érték, rekord is).

## 3. Galambraj-vezénylés  ✅ kész

- **Megvalósítás** (`src/activities/pigeons.js`): Angi mellett **E – Anya, van egy kis morzsád?** → morzsás zacskó (`pig.active`, HUD: `#crumbs` ⏱ 90 mp, 🐦 követők). **Szóköz** a rúgás helyett morzsát szór: a közeli galambok követik (`state 'follow'`, laza csapat Petyus körül), az égből újak érkeznek (max. 22 galamb), 8 mp morzsa nélkül elkószálnak. Apánál (a padon, akár alszik is): **E – Morzsa apára!** → a csapat leszáll rá (fej, váll, öl, pad, lába elé: `SLOTS`), „Leszállópálya lettem!”, Angi fényképez, „Galambapa!”, majd szétrebbennek. Csillag: a leszállt galambok száma, ★★★-hoz 60 mp-en belül.

- **Játék:** Angi táskájából előkerül egy zacskó pogácsamorzsa. Petyus szórja, és egyre több galamb követi. A feladat: a rajt a padig vezetni, és pont Petyára szórni az utolsó morzsát.
- **Poén:** a galambok rászállnak Petyára. „Leszállópálya lettem!” Angi lefényképezi.
- **Mire épül:** a meglévő galambok (`pigeons`, `makePigeon`, repülő állapot a `npcs.js`-ben), a madárraj (`flock` a `activities/cat.js`-ben).
- **Csillagok:** ★ legalább 1 galamb leszáll apára · ★★ 8 galamb · ★★★ 15 galamb, 60 mp-en belül.

## 4. Vízipisztoly az ivókútból  ✅ kész

- **Játék:** Petyus a hüvelykujjával befogja az ivókút csapját, a kifröccsenő sugarat egérrel célozza. Járókelő eltalálása pont; kutyák és macskák felháborodnak.
- **Poén:** ha Petyát éri: „Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!” Ha Angit, ő visszafröcsköl.
- **Mire épül:** ivókút (`DRINK`, `activities/drinking.js`), vízcsepp-effektek (`spawnFx`), járókelők (`npcs`).
- **Csillagok:** ★ 1 találat · ★★ 8 találat · ★★★ 12 találat, köztük apa feje (a találatszám a mért érték).
- **Megvalósítás** (`src/activities/squirt.js`): az ivókútnál **Szóköz** (érintőn RÚGÁS; morzsás zacskóval nem) → `pstate = 'squirt'`, 25 mp. A sugár becsapódási pontját egy kék gyűrű jelzi: **WASD / nyilak** képernyő-irányban mozgatják (1,8–7,2 m a csaptól), **Szóköz** nyomva tartva fröcsköl (parabola-cseppek). Közben 5 ideiglenes járókelő sétál a pálya melletti sétányon; eltalálva felkiáltanak és elfutnak. Apa első találatra: „Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!”; Angi egyszer visszafröcsköl („Áááá! Hideg! Anya!”). **E** idő előtt befejezi. HUD: `#mini` (💦 találat · ⏱). Utána a járókelők kisétálnak és eltűnnek. `award('vizipisztoly', találat, { dad })`.

## 5. Kutyaszán  ✅ kész

- **Játék:** Petyus felajánlja a szomszéd néninek, hogy megsétáltatja a kutyát – rolleren állva. A kutya húz, Petyus csak kormányoz; ki kell kerülni a padokat, virágágyásokat, a szökőkutat. A kutya minden macskát üldözőbe vesz.
- **Poén:** a vége mindig a szökőkút vagy egy virágágyás. A néni: „Bodri még sosem volt ilyen boldog!”
- **Mire épül:** rollerezés (`activities/scooter.js`, `updateRiding`), kutyák és macskák (`animals`), ütközők (`collide`).
- **Csillagok:** ★ végigér a kutyával · ★★ legfeljebb 3 ütközés · ★★★ ütközés nélkül jut el a szökőkútig (a csobbanás maga a jutalom).
- **Megvalósítás** (`src/activities/sled.js`): rolleren egy kutyasétáltató mellett **E – Megsétáltatom a kutyát!** → „De vigyázz, Bodri erős!”, `pstate = 'sled'`. A kutya a park körsétányának egyenes szakaszán, majd 2–3 akadályon (pad, virágágyás, lámpa, kuka) át egyenesen a szökőkút felé húz (az akadályokat átugorja); Petyus 5 m-ről bekiabálja őket („Jaj, egy pad!”). A játékos csak oldalra kormányoz (WASD a kamerához képest, a póráz keresztirányában ±1,9 m). A kutya a macskák után is elkanyarodik („Bodri, NEEE! Az egy cica!”). Ütközés: a roller beleütközik egy akadályba (0,9 mp-enként egyszer számít). A végén a kutya a szökőkútba ugrik, Petyus utána: CSOBBANÁS!, a néni: „Bodri még sosem volt ilyen boldog!”, apa kiabál, Angi hozza a törölközőt. `award('kutyaszan', ütközések)` – itt a kevesebb a jobb (`lower: true` a `MISCHIEFS`-ben).

## 6. Fotóbomba  ✅ kész

- **Játék:** Angi családi fotót akar a szökőkút előtt. Visszaszámlálás; a kattanás pillanatában kell bohóckodni (ugrás, nyelvöltés, galamb a kézben).
- **Poén:** minden képen Petya pislog vagy tüsszent. A fotók polaroidként gyűlnek, és a rész végén a stáblista alatt megjelennek.
- **Mire épül:** gyorsasági gombnyomás, filmes átvezetők (`cine.js`, `prologue.js` főcímei).
- **Csillagok:** ★ 1 elrontott fotó · ★★ 3 az 5-ből · ★★★ mind az 5, és az egyiken galamb van a kezében.
- **Megvalósítás** (`src/activities/photo.js`): ha apa és anya nyugton ül a padon (apa szundíthat is – Angi felkelti), és Petyus szabadon jár, 35 mp után (utána 75 mp-enként) Angi szól: „Családi fotó! Mindenki a szökőkúthoz!” – apa morogva, Angi a szökőkút déli oldalára sétál, egy kék kör jelzi Petyus helyét (ha 40 mp-ig nem jön: „Na jó… akkor majd később.”). Beállva `pstate = 'photo'`: 5 kép; Angi „3… 2… 1…”, majd változó szünet után KATT (vaku, zár hang). A kattanáskor futó póz rontja el a képet: **Szóköz / ↑** ugrás, **A / D** grimasz (nyúlfül apának, orrpiszén) – a póz kb. 0,75 mp; ha Angi a számolás közben észreveszi, előről kezdi („Petyus! Állj rendesen!”). Az egyik képnél (2.–4.) egy galamb sétál Petyus lábához: **E – galamb a kézbe!**, így az a kép biztosan elrontott, és ★★★-hoz kell. Apa minden képen pislog vagy tüsszent (HAPCI!). A képek valódi pillanatképek (a vászon kivágása), polaroidként gyűlnek a bal szélen (`#polaroids`), a végén középen nagyban: Angi és apa kommentálja. `award('fotobomba', elrontott, { pigeon })`. HUD: `#mini` (📸 kép · 🤪 elrontva). *(A stáblista alatti megjelenítés még nincs – stáblista sincs.)*

## 7. Pénzhalászat a szökőkútból  ✅ kész

- **Játék:** a szökőkút alján érmék csillognak. Petyus bottal halászik, miközben új szereplő, a **parkőr bácsi** körbe-körbe járőrözik. Ha felé néz, Petyusnak mozdulatlanná kell dermednie („piros lámpa, zöld lámpa”).
- **Poén:** a pénzből fagyit vesz, a fagyi pont Petya cipőjére esik.
- **Mire épül:** szökőkút (`FOUNTAIN`), járókelő-rig (`makePerson`); új: parkőr, fagyis.
- **Csillagok:** ★ 3 érme · ★★ 6 érme · ★★★ 10 érme úgy, hogy a parkőr egyszer sem veszi észre.
- **Megvalósítás** (`src/activities/fish.js`): a szökőkút peremén **Szóköz** (az E továbbra is ivás) → `pstate = 'fish'`, 70 mp. Petyus bottal a peremen áll; 12 érme csillog a medence alján. **A / D** (bármely irány) körbeviszi a peremen (a gombot tartva végig ugyanarra megy), **Szóköz** nyomva tartva kb. 1 mp alatt kihalássza az előtte lévő érmét (a cél érme villog, a bot hegye beleér a vízbe). A **parkőr bácsi** (új szereplő, zöld egyenruha) a szökőkút körüli kövezett gyűrűn járőrözik; időnként megáll („Hmm?” – 🟡), majd odanéz (🔴, 1,6–2,8 mp): ha ilyenkor Petyus mozog vagy halászik → síp, „Hé, fiatalember! A szökőkút nem pénztárca!”, egy érme visszakerül a vízbe; 3 lebukás után vége. A szökőkút középső oszlopa eltakar előle. **E** idő előtt befejezi. Legalább 3 érmével: begurul a fagyis kocsi (csengő), Petyus vesz egy gombócot (az érmék számától függ a mérete), odaviszi apának a padhoz: „Honnan volt rá pénzed?” – „…A szökőkútból.” – a gombóc PLACCS apa cipőjére: „…Ez az új cipőm volt.” Angi: „Legalább csokis.” `award('penzhalasz', érmék, { seen })`. HUD: `#mini` (🪙 · ⏱ · lámpa), tipp: `#fishTip`.

## 8. Rollerverseny a nyugdíjassal  ✅ kész

- **Játék:** a padon ülő bácsi kihívja Petyust egy körre a sétányon – a saját elektromos mopedjén. Versenyjáték az ismert pályán.
- **Poén:** a bácsi a célegyenesben bekapcsolja a „turbót”, és nyer. „Az én időmben is így volt!”
- **Mire épül:** rollerezés, a sétány útvonala (`loopPoint` a `npcs.js`-ben), a padon ülő bácsik (`type: 'sit'`).
- **Csillagok:** ★ célba ér · ★★ félúton vezet · ★★★ megnyeri a versenyt (a bácsi szélárnyékából, a turbója előtt kell előzni).
- **Megvalósítás** (`src/activities/race.js`): a sétány északi padján ülő kalapos bácsi mellett mentazöld moped parkol. Rolleren odagurulva **E – Verseny a bácsival!** → „Szép kis roller… de az én mopedem gyorsabb!”, a bácsi felül a mopedre, 3-2-1-RAJT (`pstate = 'race'`, a roller `scripted`, a mozgás a közös `rideStep()` a `scooter.js`-ben). Egy kör a sétányon (a sétálók köre, 96 m); a sétányról letérve nem halad (nincs levágás). A bácsi az egyeneseken gyorsabb (6 m/s; Petyus Shifttel 5,6), a kanyarokban lassít (4 m/s). **Szélárnyék:** közvetlenül mögötte (5 m-en belül, ugyanabban a sávban) Petyus 25%-kal gyorsabb, és kiállás után még 1,6 mp-ig kitart a lendület – így lehet kanyar előtt belülről előzni. Félúton és az utolsó kanyar után (turbó) dől el: ha ott a bácsi vezet, „Most jön a TURBÓ!!” és nyer – „Az én időmben is így volt!” („Ez nem ér! Neked turbód van!”); ha Petyus vezet, a turbó lefullad („TURBÓ! …Na ne! Pont most?!”). Utána a bácsi visszagurul, leparkol és visszaül a padjára. Apa ilyenkor a padon marad („Verseny?! Petyus, ÓVATOSAN!!”). `award('rollerverseny', 1|2|3)`. HUD: `#mini` (🛴 % · 🥇/🥈 · 💨 szélárnyék · 🔥 turbó).

## 9. Bújócska apával  ✅ kész

- **Játék:** Petyus elbújik (bokor, fa mögé, szobor mellé), apa keres és közben kommentál. Ha a közelben jár, vissza kell tartani a levegőt (fogyó csík).
- **Poén:** mindig tüsszentés árulja el. Ha mégis sikerül elbújni, Petya végül Angit kérdezi: „Nem láttad a gyereket?” – „Melyiket?”
- **Mire épül:** az apa útkeresése (`navTarget`, `dad.js`), bokrok és fák (`TREES`).
- **Csillagok:** ★ 20 mp rejtőzés · ★★ 40 mp · ★★★ apa feladja a keresést („Nem láttad a gyereket?”).
- **Megvalósítás** (`src/activities/hide.js`): apa mellett a padnál (labda nélkül; ha apa a közelebbi, nem Angi) **E – Apa, bújócskázzunk!** → `pstate = 'hide'`. Apa feláll, eltakarja a szemét, és hangosan tízig számol (`petyaMode = 'hideCount'`); Petyus közben elbújik: **fa mögé** (a törzs legyen apa és közte) vagy **bokor mellé** – ha áll, magától leguggol. Utána apa (`hideSeek`) búvóhelyről búvóhelyre jár (a pad 30 m-es körzetének fái és bokrai, `TREES` + `BUSHES`; néha „megérzi”, merre lehet Petyus), körülnéz és kommentál. **Észreveszi**, ha Petyus előtte van takarás nélkül, vagy takarásban mozog a közelben (11 m), illetve 1,5 m-en belül mindenképp. 4 m-en belül **hallja a szuszogást**: **Szóköz** nyomva = levegő visszatartása (a 🫁 csík 6 mp alatt fogy el; ha elfogy: HAPCI! – lebukás; ha nem tartja vissza: „Hallom ám, hogy szuszogsz!”). 60 mp után apa feladja, odamegy Angihoz: „Angi, nem láttad a gyereket?” – „Melyiket?” – „ITT VAGYOK!!” **E** = feladás. `award('bujocska', mp, { gaveUp })` (20 mp alatt nincs csillag). HUD: `#mini` (🙈 számolás / rejtőzés mp · 🫁 levegő).

## 10. Lufis bácsi  ✅ kész

- **Játék:** Petyus egy hatalmas lufi-csokrot kap, könnyebb lesz tőle: nagyokat ugrik, lassan száll le, a szél sodorja. Így kell elérni egy fára akadt labdát – ahol épp a korábban fára dobott macska ül.
- **Poén:** Petya az utolsó pillanatban elkapja a bokáját; ha nem, a macska kipukkaszt egy lufit.
- **Mire épül:** fák és `treeTop()`, a macskás jelenet folytatása (`activities/cat.js`, `evt = 'tree'`).
- **Csillagok:** ★ felszáll a lufikkal · ★★ eléri a fára akadt labdát · ★★★ eléri, és egy lufi sem pukkad ki.
- **Megvalósítás** (`src/activities/balloon.js`): a pálya melletti sétány nyugati végén (23,6; −12,2) áll a lufis bácsi egy csokor lufival. **E – Kérek egy lufit!** → „Egyet? Minek egyet! Vegyél ötöt!” – Petyus 5 lufit kap (`pstate = 'balloon'`): könnyű lesz, **Szóköz** = hatalmas ugrás (5 lufival kb. 7 m), lassan száll le (max. 2,2 m/s), a levegőben **WASD**-dal kormányozható, és a szél ide-oda sodorja (falevelek mutatják). Minden lufi kevesebb súlyt jelent: kevesebb lufival kisebbet ugrik. A fán, ahol a macska ül (ha apa már feldobott egyet, azon; különben egy macska most mászik fel a lufis bácsihoz legközelebbi tölgyre), fennakadt egy piros-fehér labda – kézzel kell elérni. A macska közelében („Psssz!”) PUKK – egy lufi kidurran. Apa már az első nagy ugrásnál kiabál; a labdával földet érve egy széllökés felkapja Petyust („Elvisz a szél!! APAAA!”), apa odarohan és az utolsó pillanatban elkapja a bokáját; a lufik elszállnak. A lufis bácsi: „A lufik ára nem tartalmazza a repülést!” `award('lufi', 1|2|3)`. HUD: `#mini` (🎈 db · 🎯 távolság · ⏱ 50 mp · ⬆ magasság). A kamera a levegőben Petyus magasságát követi (`G.petike.flyY`).

## Javítandók (felvéve: 2026. 11. 23.)

- [ ] **Fotóbomba csak 3 csillagig:** Angi addig hív magától fotózni a szökőkúthoz, amíg Petyus el nem érte a ★★★-ot a fotóbombában; utána már nem (`activities/photo.js`, `photoTick` – a mentett eredmény a `mischief.js`-ben).
- [ ] **Telefonos gombfeliratok:** az érintéses gombok felirata nem mindig a valódi műveletet mutatja – pl. az ivókútnál „RÚGÁS” áll a fröcskölés helyett. Minden helyzetben a tényleges műveletet írja ki (`touchui.js` `updateTouchUI`, `touchText()` a `util.js`-ben).
- [ ] **Labda visszahívása telefonon:** messzire rúgott labda után nincs gomb a visszaszerzésére (böngészőben ez az **R**). Kell egy érintéses gomb is („LABDA IDE”).
- [ ] **Pénzhalászat vége:** utána Petyus kerülje ki a szökőkutat (ne menjen át rajta), és a fagyis kocsi ne a virágágyásba álljon, hanem a járdára (`activities/fish.js`).
- [ ] **Ülés a padon:** a padon ülő Petya és Angi lába ne lógjon bele a padba (ülőmagasság / comb-lábszár póz a padon – `actors.js` ülés, `sitKnee`).
