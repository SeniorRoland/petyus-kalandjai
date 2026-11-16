# 1. rész (Augusztus – Egy nap a parkban): csibészség-ötletek

Mini játékok és jelenetek, amelyeket a meglévő rendszerekre lehet építeni. Mindegyiknél: mi a játék, mi a poén, mire épül a kódban.
Javasolt sorrend: **1 → 2 → 3**, utána tetszés szerint.

| # | Csibészség | Állapot |
|---|---|---|
| 1 | Fordított edzés: Petyus tanítja apát dekázni | terv |
| 2 | A szundikáló apa | terv |
| 3 | Galambraj-vezénylés | terv |
| 4 | Vízipisztoly az ivókútból | terv |
| 5 | Kutyaszán | terv |
| 6 | Fotóbomba | terv |
| 7 | Pénzhalászat a szökőkútból | terv |
| 8 | Rollerverseny a nyugdíjassal | terv |
| 9 | Bújócska apával | terv |
| 10 | Lufis bácsi | terv |

---

## 1. Fordított edzés: Petyus tanítja apát dekázni

- **Játék:** Petya felveszi a kesztyűt: „Majd én megmutatom!” Most a játékos őt irányítja ugyanazzal a gyorsasági (quick-time) játékkal, mint a dekázást, csak sokkal szűkebb időablakkal („apa már nem olyan fürge”).
- **Poén:** Petyus edzőként Petya saját szövegeivel szól be neki: „Fejet fel, apa!”, „Ez passz volt vagy simogatás?” A végén Petya „meghúzza a derekát”, és sántikálva ül vissza a padra.
- **Mire épül:** dekázás (`activities/juggle.js`: `JUG`, `jugWindow`, `jugPress`), apa-szövegek (`coachLine` a `dad.js`-ben).

## 2. A szundikáló apa

- **Játék:** egy idő után Petya elalszik a padon, és horkol. Petyus odalopakodik, és tornyot épít a fejére: toboz, falevél, végül a focilabda. Csak akkor lehet rakni, amikor épp nem horkant nagyot; rossz pillanatban leborul a torony.
- **Poén:** Petya felriad: „Ki volt az?!” Angi fütyörészve néz az égre. A legmagasabb torony rekordként mentődik (mint a dekázás-rekord).
- **Mire épül:** ülő póz (`Actor.sit`), gyorsasági gombnyomás (a dekázás mintájára), hangok (`audio.js`), rekord a `localStorage`-ban.

## 3. Galambraj-vezénylés

- **Játék:** Angi táskájából előkerül egy zacskó pogácsamorzsa. Petyus szórja, és egyre több galamb követi. A feladat: a rajt a padig vezetni, és pont Petyára szórni az utolsó morzsát.
- **Poén:** a galambok rászállnak Petyára. „Leszállópálya lettem!” Angi lefényképezi.
- **Mire épül:** a meglévő galambok (`pigeons`, `makePigeon`, repülő állapot a `npcs.js`-ben), a madárraj (`flock` a `activities/cat.js`-ben).

## 4. Vízipisztoly az ivókútból

- **Játék:** Petyus a hüvelykujjával befogja az ivókút csapját, a kifröccsenő sugarat egérrel célozza. Járókelő eltalálása pont; kutyák és macskák felháborodnak.
- **Poén:** ha Petyát éri: „Ez nem vízipisztoly! Ez ivókút! IVÓ-KÚT!” Ha Angit, ő visszafröcsköl.
- **Mire épül:** ivókút (`DRINK`, `activities/drinking.js`), vízcsepp-effektek (`spawnFx`), járókelők (`npcs`).

## 5. Kutyaszán

- **Játék:** Petyus felajánlja a szomszéd néninek, hogy megsétáltatja a kutyát – rolleren állva. A kutya húz, Petyus csak kormányoz; ki kell kerülni a padokat, virágágyásokat, a szökőkutat. A kutya minden macskát üldözőbe vesz.
- **Poén:** a vége mindig a szökőkút vagy egy virágágyás. A néni: „Bodri még sosem volt ilyen boldog!”
- **Mire épül:** rollerezés (`activities/scooter.js`, `updateRiding`), kutyák és macskák (`animals`), ütközők (`collide`).

## 6. Fotóbomba

- **Játék:** Angi családi fotót akar a szökőkút előtt. Visszaszámlálás; a kattanás pillanatában kell bohóckodni (ugrás, nyelvöltés, galamb a kézben).
- **Poén:** minden képen Petya pislog vagy tüsszent. A fotók polaroidként gyűlnek, és a rész végén a stáblista alatt megjelennek.
- **Mire épül:** gyorsasági gombnyomás, filmes átvezetők (`cine.js`, `prologue.js` főcímei).

## 7. Pénzhalászat a szökőkútból

- **Játék:** a szökőkút alján érmék csillognak. Petyus bottal halászik, miközben új szereplő, a **parkőr bácsi** körbe-körbe járőrözik. Ha felé néz, Petyusnak mozdulatlanná kell dermednie („piros lámpa, zöld lámpa”).
- **Poén:** a pénzből fagyit vesz, a fagyi pont Petya cipőjére esik.
- **Mire épül:** szökőkút (`FOUNTAIN`), járókelő-rig (`makePerson`); új: parkőr, fagyis.

## 8. Rollerverseny a nyugdíjassal

- **Játék:** a padon ülő bácsi kihívja Petyust egy körre a sétányon – a saját elektromos mopedjén. Versenyjáték az ismert pályán.
- **Poén:** a bácsi a célegyenesben bekapcsolja a „turbót”, és nyer. „Az én időmben is így volt!”
- **Mire épül:** rollerezés, a sétány útvonala (`loopPoint` a `npcs.js`-ben), a padon ülő bácsik (`type: 'sit'`).

## 9. Bújócska apával

- **Játék:** Petyus elbújik (bokor, fa mögé, szobor mellé), apa keres és közben kommentál. Ha a közelben jár, vissza kell tartani a levegőt (fogyó csík).
- **Poén:** mindig tüsszentés árulja el. Ha mégis sikerül elbújni, Petya végül Angit kérdezi: „Nem láttad a gyereket?” – „Melyiket?”
- **Mire épül:** az apa útkeresése (`navTarget`, `dad.js`), bokrok és fák (`TREES`).

## 10. Lufis bácsi

- **Játék:** Petyus egy hatalmas lufi-csokrot kap, könnyebb lesz tőle: nagyokat ugrik, lassan száll le, a szél sodorja. Így kell elérni egy fára akadt labdát – ahol épp a korábban fára dobott macska ül.
- **Poén:** Petya az utolsó pillanatban elkapja a bokáját; ha nem, a macska kipukkaszt egy lufit.
- **Mire épül:** fák és `treeTop()`, a macskás jelenet folytatása (`activities/cat.js`, `evt = 'tree'`).
