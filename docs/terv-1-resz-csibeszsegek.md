# 1. rész (Augusztus – Egy nap a parkban): csibészség-ötletek

Mini játékok és jelenetek, amelyeket a meglévő rendszerekre lehet építeni. Mindegyiknél: mi a játék, mi a poén, mire épül a kódban.
Javasolt sorrend: **1 → 2 → 3**, utána tetszés szerint. Elsőként a közös pontozó rendszert (`mischief.js` + napló) érdemes megépíteni, hogy minden csibészség rögtön csillagot adhasson.

## Pontozás és csibészség-napló (közös rendszer, minden csibészségre)

- **Csillagok:** minden csibészségért **legfeljebb 3 csillag** jár. A teljesítés mindig legalább ★ (ha valami nem mérhető, akkor csak ennyi); ★★ és ★★★ egy mérhető eredményért (darab, magasság, idő, találat – lásd a táblázatban és az egyes leírásoknál). Mindig a **legjobb** eredmény számít, újra lehet próbálni.
- **Visszajelzés teljesítéskor:** képregényes felirat („Csibészség teljesítve: A szundikáló apa ★★☆”), a csillagok egyesével „bepattannak” hanggal; ha javított a korábbin: „Új legjobb!”.
- **Csibészség-napló** (megtekinthető lista): a játék közben az **N** gombbal vagy a HUD 📒 gombjával nyílik (érintőn is), a kezdőképernyőről az augusztusi csempe alatti „Napló” linkkel.
  - **Elvégzett:** név, csillagok (★★☆), legjobb eredmény (pl. „7 tárgy a fején”).
  - **Még hátravan:** szürke „???” név és egy rövid **tipp**, hol keresse (lásd a táblázatban) – a felfedezés is a játék része. A teljes nevet csak a teljesítés után mutatja.
  - Fejléc: összesen **⭐ x / 30** és „y / 10 csibészség”.
- **Összesítés máshol:** a HUD-on a gólok és a dekázás-rekord mellett ⭐ x/30; a kezdőképernyő augusztusi csempéjén is (pl. „⭐ 7/30”).
- **Mentés:** a böngészőben (`localStorage`, kulcs pl. `petyus.r1.csibeszsegek`: `{ id: { stars, best, at } }`), mint a dekázás-rekord.
- **Kód (kész):** `src/mischief.js`: a csibészségek listája (`id`, `title`, `hint`, `unit`, `stars: [k1, k2, k3]` küszöbök, `higherIsBetter`), `award(id, érték)` → csillagszám, mentés, felirat; a napló felülete (`#journal` panel, képregényes stílus). Minden mini játék a végén csak `award(...)`-ot hív.
- **Javaslat:** a már meglévő **szökőkút-ivás** is bekerülhetne 11. csibészségként (★ ivás; ★★ legalább 3 korty, mielőtt apa odaér; ★★★ 5 korty és Angi védelmére kel). Ekkor az összesen ⭐ 33.

| # | Csibészség | ★ | ★★ | ★★★ | Tipp a naplóban (amíg nincs meg) | Állapot |
|---|---|---|---|---|---|---|
| 1 | Fordított edzés: Petyus tanítja apát dekázni | apa dekáz | 8 érintés | 15 érintés | „Apa mindig okosabb… vagy mégsem?” | **kész** |
| 2 | A szundikáló apa | 3 tárgy a fején | 6 tárgy | 10 tárgy, a tetején a labda | „Ha apa sokáig ül a padon…” | terv |
| 3 | Galambraj-vezénylés | galamb száll apára | 8 galamb | 15 galamb, 60 mp-en belül | „Angi táskájában van valami morzsás.” | terv |
| 4 | Vízipisztoly az ivókútból | 1 találat | 8 találat | 12 találat, köztük apa feje | „Az ivókútból nem csak inni lehet.” | terv |
| 5 | Kutyaszán | végigér | legfeljebb 3 ütközés | ütközés nélkül a szökőkútig | „A szomszéd néni kutyája unatkozik.” | terv |
| 6 | Fotóbomba | 1 elrontott fotó | 3 a 5-ből | mind az 5, és az egyiken galamb van a kezében | „Anya fotózni készül a szökőkútnál.” | terv |
| 7 | Pénzhalászat a szökőkútból | 3 érme | 6 érme | 10 érme lebukás nélkül | „Valami csillog a szökőkút alján.” | terv |
| 8 | Rollerverseny a nyugdíjassal | célba ér | félúton vezet | legyőzi a bácsit (szélárnyékból előz a turbó előtt) | „A padon ülő bácsi gyorsnak tartja magát.” | terv |
| 9 | Bújócska apával | 20 mp rejtőzés | 40 mp | apa feladja („Nem láttad a gyereket?”) | „Apa szeret keresgélni.” | terv |
| 10 | Lufis bácsi | felszáll a lufikkal | eléri a labdát | eléri, és egy lufi sem pukkad ki | „Valaki lufit árul a park szélén.” | terv |

---

## 1. Fordított edzés: Petyus tanítja apát dekázni  ✅ kész

- **Megvalósítás** (`src/activities/coach.js`): Petyus a labdával a padon ülő apához megy → **E – Mutasd te, apa!** → rövid párbeszéd (Angi: „Petya… a derekad.”), apa feláll, 2 m-re a padtól dekázik; a játékos irányítja (ugyanaz a QTE, `jug.who = Petya`, `jug.dad`: ablak 0,13 → 0,075 mp). Petyus közben edzi: apa saját mondatai + új poénok (`KID_COACH`), mérföldkövek 3/5/8/10/15/20/25 érintésnél, Angi aggódik. Leejtés után: Petyus ítélete, apa kifogása, „ÁÚ!! A DEREKAM!”, Angi: „Hozom a Voltarent.”, csillagok (`award('apa-dekaz', n)`), apa bicegve, morogva ül vissza (`dad.limpT`).

- **Játék:** Petya felveszi a kesztyűt: „Majd én megmutatom!” Most a játékos őt irányítja ugyanazzal a gyorsasági (quick-time) játékkal, mint a dekázást, csak sokkal szűkebb időablakkal („apa már nem olyan fürge”).
- **Poén:** Petyus edzőként Petya saját szövegeivel szól be neki: „Fejet fel, apa!”, „Ez passz volt vagy simogatás?” A végén Petya „meghúzza a derekát”, és sántikálva ül vissza a padra.
- **Mire épül:** dekázás (`activities/juggle.js`: `JUG`, `jugWindow`, `jugPress`), apa-szövegek (`coachLine` a `dad.js`-ben).
- **Csillagok:** ★ apa dekáz (bármennyit) · ★★ 8 érintés · ★★★ 15 érintés (apa szűkebb időablakkal dolgozik, mint Petyus).

## 2. A szundikáló apa

- **Játék:** egy idő után Petya elalszik a padon, és horkol. Petyus odalopakodik, és tornyot épít a fejére: toboz, falevél, végül a focilabda. Csak akkor lehet rakni, amikor épp nem horkant nagyot; rossz pillanatban leborul a torony.
- **Poén:** Petya felriad: „Ki volt az?!” Angi fütyörészve néz az égre. A legmagasabb torony rekordként mentődik (mint a dekázás-rekord).
- **Mire épül:** ülő póz (`Actor.sit`), gyorsasági gombnyomás (a dekázás mintájára), hangok (`audio.js`), rekord a `localStorage`-ban.
- **Csillagok:** ★ 3 tárgy a fején · ★★ 6 tárgy · ★★★ 10 tárgy, a tetején a focilabda (a torony magassága a mért érték, rekord is).

## 3. Galambraj-vezénylés

- **Játék:** Angi táskájából előkerül egy zacskó pogácsamorzsa. Petyus szórja, és egyre több galamb követi. A feladat: a rajt a padig vezetni, és pont Petyára szórni az utolsó morzsát.
- **Poén:** a galambok rászállnak Petyára. „Leszállópálya lettem!” Angi lefényképezi.
- **Mire épül:** a meglévő galambok (`pigeons`, `makePigeon`, repülő állapot a `npcs.js`-ben), a madárraj (`flock` a `activities/cat.js`-ben).
- **Csillagok:** ★ legalább 1 galamb leszáll apára · ★★ 8 galamb · ★★★ 15 galamb, 60 mp-en belül.

## 4. Vízipisztoly az ivókútból

- **Játék:** Petyus a hüvelykujjával befogja az ivókút csapját, a kifröccsenő sugarat egérrel célozza. Járókelő eltalálása pont; kutyák és macskák felháborodnak.
- **Poén:** ha Petyát éri: „Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!” Ha Angit, ő visszafröcsköl.
- **Mire épül:** ivókút (`DRINK`, `activities/drinking.js`), vízcsepp-effektek (`spawnFx`), járókelők (`npcs`).
- **Csillagok:** ★ 1 találat · ★★ 8 találat · ★★★ 12 találat, köztük apa feje (a találatszám a mért érték).

## 5. Kutyaszán

- **Játék:** Petyus felajánlja a szomszéd néninek, hogy megsétáltatja a kutyát – rolleren állva. A kutya húz, Petyus csak kormányoz; ki kell kerülni a padokat, virágágyásokat, a szökőkutat. A kutya minden macskát üldözőbe vesz.
- **Poén:** a vége mindig a szökőkút vagy egy virágágyás. A néni: „Bodri még sosem volt ilyen boldog!”
- **Mire épül:** rollerezés (`activities/scooter.js`, `updateRiding`), kutyák és macskák (`animals`), ütközők (`collide`).
- **Csillagok:** ★ végigér a kutyával · ★★ legfeljebb 3 ütközés · ★★★ ütközés nélkül jut el a szökőkútig (a csobbanás maga a jutalom).

## 6. Fotóbomba

- **Játék:** Angi családi fotót akar a szökőkút előtt. Visszaszámlálás; a kattanás pillanatában kell bohóckodni (ugrás, nyelvöltés, galamb a kézben).
- **Poén:** minden képen Petya pislog vagy tüsszent. A fotók polaroidként gyűlnek, és a rész végén a stáblista alatt megjelennek.
- **Mire épül:** gyorsasági gombnyomás, filmes átvezetők (`cine.js`, `prologue.js` főcímei).
- **Csillagok:** ★ 1 elrontott fotó · ★★ 3 az 5-ből · ★★★ mind az 5, és az egyiken galamb van a kezében.

## 7. Pénzhalászat a szökőkútból

- **Játék:** a szökőkút alján érmék csillognak. Petyus bottal halászik, miközben új szereplő, a **parkőr bácsi** körbe-körbe járőrözik. Ha felé néz, Petyusnak mozdulatlanná kell dermednie („piros lámpa, zöld lámpa”).
- **Poén:** a pénzből fagyit vesz, a fagyi pont Petya cipőjére esik.
- **Mire épül:** szökőkút (`FOUNTAIN`), járókelő-rig (`makePerson`); új: parkőr, fagyis.
- **Csillagok:** ★ 3 érme · ★★ 6 érme · ★★★ 10 érme úgy, hogy a parkőr egyszer sem veszi észre.

## 8. Rollerverseny a nyugdíjassal

- **Játék:** a padon ülő bácsi kihívja Petyust egy körre a sétányon – a saját elektromos mopedjén. Versenyjáték az ismert pályán.
- **Poén:** a bácsi a célegyenesben bekapcsolja a „turbót”, és nyer. „Az én időmben is így volt!”
- **Mire épül:** rollerezés, a sétány útvonala (`loopPoint` a `npcs.js`-ben), a padon ülő bácsik (`type: 'sit'`).
- **Csillagok:** ★ célba ér · ★★ félúton vezet · ★★★ megnyeri a versenyt (a bácsi szélárnyékából, a turbója előtt kell előzni).

## 9. Bújócska apával

- **Játék:** Petyus elbújik (bokor, fa mögé, szobor mellé), apa keres és közben kommentál. Ha a közelben jár, vissza kell tartani a levegőt (fogyó csík).
- **Poén:** mindig tüsszentés árulja el. Ha mégis sikerül elbújni, Petya végül Angit kérdezi: „Nem láttad a gyereket?” – „Melyiket?”
- **Mire épül:** az apa útkeresése (`navTarget`, `dad.js`), bokrok és fák (`TREES`).
- **Csillagok:** ★ 20 mp rejtőzés · ★★ 40 mp · ★★★ apa feladja a keresést („Nem láttad a gyereket?”).

## 10. Lufis bácsi

- **Játék:** Petyus egy hatalmas lufi-csokrot kap, könnyebb lesz tőle: nagyokat ugrik, lassan száll le, a szél sodorja. Így kell elérni egy fára akadt labdát – ahol épp a korábban fára dobott macska ül.
- **Poén:** Petya az utolsó pillanatban elkapja a bokáját; ha nem, a macska kipukkaszt egy lufit.
- **Mire épül:** fák és `treeTop()`, a macskás jelenet folytatása (`activities/cat.js`, `evt = 'tree'`).
- **Csillagok:** ★ felszáll a lufikkal · ★★ eléri a fára akadt labdát · ★★★ eléri, és egy lufi sem pukkad ki.
