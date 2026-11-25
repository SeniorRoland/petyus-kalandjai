# 2. rész (Szeptember – Otthon és iskola): terv

Helyszínek, napok és csibészségek. Mindegyiknél: mi a játék, mi a poén, mire épül a kódban.
**Állapot:** ✅ a megnyitás, a 2. rész saját csibészség-rendszere (napló-fül) és az otthoni reggel kész: a filmes nyitány (ébresztés), a lakás, a ház és környéke, az eszközök, a leltár, Karcsi, a nővér, a hangok és mind a 3 reggeli csibészség. ✅ A napok köre is kész: indulás (7:30 vagy mindhárom reggeli csibészség után) → iskola (helyszín, csibészségek nélkül) → otthon délután–este (sötét, lámpák) → lefekvés → másnap reggel; hétvége és hónap vége átvezetővel. ⬜ Hátravan: átöltözés, az iskola 4 és a délután 3 csibészsége, tesztelés telefonon.

## Röviden

- **Két helyszín:** otthon (lakás) és iskola.
- **Napszakok:** otthon reggel **6:00–7:30**, iskola **8:00–15:30**, otthon délután–este **16:00–22:00**.
- **10 csibészség:** 3 otthon reggel, 4 az iskolában, 3 otthon délután (mint az 1. részben: mindegyikért max. 3 ⭐, összesen ⭐ 30, saját napló).
- **Szereplők most:** Petyus, Petya (apa), Angi (anya). Később még három szereplő jön – velük egyelőre nem foglalkozunk.
- **Nézet:** izometrikus, voxel stílus, mint az 1. részben.

## Pontozás és csibészség-napló (2. rész)  ✅ kész

- **Ugyanaz a rendszer, mint az 1. részben** (`src/mischief.js`): csibészségenként legfeljebb 3 csillag, a legjobb eredmény számít; teljesítéskor felugró csillagok.
- **Saját lista és mentés:** `MISCHIEFS2`, `localStorage`-kulcs `petyus.r2.csibeszsegek`; a megnyitáshoz (15 ⭐) továbbra is csak az 1. rész csillagai számítanak (`totalStars()`).
- **Napló:** az **N** / 📒 naplóban részenként fül („2. Szeptember ⭐ x/9”, később x/30) – a kezdőképernyőről is megnézhető; játék közben az aktuális rész füle nyílik.
- **Késés:** minden sikeres reggeli csibészség perceket vesz el a reggelből (`ep2.lateMin`); ha a család 7:30 után indul, az iskolában ennek következménye lesz (beírás, a tanár megjegyzése – az iskolai résznél döntjük el).
- A HUD-on a késés: ⏰ +x perc (`addLate()` az `ep2.js`-ben, mentve a rész állapotával).

| # | Csibészség | Helyszín | ★ | ★★ | ★★★ | Tipp a naplóban | Állapot |
|---|---|---|---|---|---|---|---|
| 1 | A tejszínes kávé | otthon, reggel | apa a WC-re rohan | első próbára (nincs tejszínhabos visszaküldés) | és senki nem látta a tejszínt | „Apa kávét kér, de a gyomra nem bír mindent.” | **kész** |
| 2 | Karcsi nagy szökése | otthon, reggel | Karcsi szabadon | anya a széken | és ≥ 60 mp szabadon | „Karcsi is szeretne körülnézni a lakásban.” | **kész** |
| 3 | Hol a kulcs, Angi? | otthon, reggel | anya keresni kezd | 2 percnél tovább keres | fura helyen volt, és Petyus nem árulta el | „Anya kulcsa mindig a cipősszekrényen van.” | **kész** |
| 4–7 | (iskolai csibészségek) | iskola | | | | | ⬜ még nincs kitalálva |
| 8–10 | (délutáni csibészségek) | otthon, délután | | | | | ⬜ még nincs kitalálva |

---

## 1. A tejszínes kávé  ✅ kész

- **Megvalósítás** (`src/ep2/coffee.js`): apa kb. 12 mp után kávét kér; a bögre a pulton van, kávé a kávéfőzőnél (F), tej / tejszín / tejszínhab a hűtőből; apának elég mellette állni (belső nézetben rá nézni): **F – bögre odaadása apának**. Tejszínhabot (vagy kimosatlan, habos bögrét) visszaküld – a mosogatónál ki kell önteni, a nyitott csapnál kimosni. Tejszínnel megissza, 5× morog a gyomra (Angi: „Jól vagy, Petya?”), az 5.-re felpattan (a széke feldől), félrelöki Petyust, a WC-be rohan, becsapja az ajtót („BUMM!”), letolt pizsamanadrággal ül (a comb bőrszínű – `setPantsDown` a `pajama.js`-ben –, gyűrött nadrág a térdén), pukizik, jajveszékel, a zöld szagfelhő az ajtó alatt-fölött szivárog ki; papírért kiabál, ha Petyus elvitte. Végül kinyitja az ajtót (kigomolyog a felhő), kijön, visszacsukja, bicegve visszaül: „Ma kések a munkából. És te is az iskolából.” → +15 perc. Apa állapotai: `cf.st` (`wait → asked → look → drink → growl → rush → sitdown → wc → back → done`).
- **Alaphelyzet:** apa az asztalnál ül, és időnként kávét kér („Petyus, hoznál egy kávét?”). Apa gyomra érzékeny a tejszínre: a **tej** rendben van, a **tejszínhabot** észreveszi, a **tejszínt** nem.

- **Menet:**
1. Petyus felveszi a bögrét, a kávéfőzőnél kávét tölt bele (F), aztán a hűtőből tejet, tejszínt vagy tejszínhabot ad hozzá (ez már megvan: `inventory.js`).
2. A bögrét apa helyére teszi az asztalon (új lerakóhely: „apa helye”, csak a bögrét fogadja). Apa megissza (ivó póz, néhány korty).
3. A tartalomtól függően:
   - **Csak kávé, vagy kávé + tej:** „Köszönöm, fiam!” – nincs csibészség.
   - **Tejszínhab van benne:** apa azonnal észreveszi: „Ez tejszínhab! Tudod, hogy nem bírom!” – visszaadja a bögrét, és új kávét kér. Ilyenkor a bögrét a **mosogatóba kell önteni** (F a mosogatónál – megvan), **ki kell mosni** (új lépés: nyitott csapnál F – „bögre kimosása”; a kimosatlan, csak kiöntött bögrébe töltött kávéra apa: „Ez még habos!”), és **új adag kávét** kell csinálni. Ez még nem csibészség, csak kitérő (a ★★-t elveszi, lásd lent).
   - **Tejszín van benne (tejszínhab nélkül):** apa nem veszi észre, megissza, eszik tovább. Kb. 8–12 mp-enként **hangosan morog a gyomra** (hanghatás-felirat: „GRRRRRR…”, „KORRR-KORRR!”, „BRUGGGGG…” – szintetizált mély, remegő hang), közben a hasához kap, fészkelődik a széken; Angi rákérdez („Jól vagy, Petya?” – „Persze… persze…”).
4. **Az 5. morgásra** apa hirtelen felpattan („JAJ! Most azonnal!!”), feldönti a székét, és **a WC-be rohan**. A WC ajtaja kinyílik előtte, ha zárva van; ha Petyus áll az útjában, félrelöki: „Félre!”. Az ülőkét és a fedelet felcsapja, ráül.
5. **A WC-n:** a **pizsamanadrág térdig letolva** (a nadrág a térde köré gyűrődik – lásd a technikát), görnyedve ül, a hasát fogja. Hangosan **pukizgat** (szintetizált, változatos hosszúságú és hangmagasságú hangok, hanghatás-feliratok: „PRRRT!”, „PFFFFRRR!”, „BRÖTTYH!”), és **jajveszékel**: „Jajjj, a hasam!”, „Ki tett tejszínt a kávémba?!”, „Soha többé tejszín…”, „Angiii, hozz még papírt!”. A WC-ből **zöldes szagfelhő** gomolyog ki: lassan felszálló, terjedő zöld pamacsok az ajtón és a kis ablakon át, átér az előszobába is. Angi az orrát fogja: „Petya, az ég szerelmére, nyiss ablakot!”
6. **Izometrikus nézetben jól látszik:** a WC fala átlátszó lesz (a falak most is ilyenek), így látni, ahogy apa szenved; a szagfelhő a falakon kívül is látszik. A jelenet kb. 40–60 mp, közben Petyus szabadon mozoghat (belső nézetben a WC ajtajánál hallani is). Ha a **WC-papír** közben nincs a WC-ben (Petyus elvitte – leltár), apa külön kiabál érte: „PAPÍRT!!” – Petyus beviheti (lerakóhely a WC-ben), vagy hagyhatja.
7. **Vége:** apa kijön (sápadtan, görnyedt, lassú járással): „Ma kések a munkából. És te is az iskolából.” → **késés** (+15 perc).

- **Csillagok:**
- ★ apa a WC-re rohan (a tejszínes kávé hatott);
- ★★ első próbálkozásra sikerült (nem volt tejszínhabos visszaküldés);
- ★★★ és senki nem látta, ahogy a tejszínt a bögrébe tölti (Angi nem volt a konyhában, vagy háttal állt – Angi „látómezeje” egy kúp a nézési irányában).

- **Technika (új elemek):**
- apa új állapotai: `coffeeAsk → drinking → growl (1…5) → rushWC → onWC → limpBack` (útvonal a WC-ig: konyha → előtér → WC-ajtó);
- „apa helye” lerakóhely (csak a bögre), a bögre kimosása (nyitott csapnál F), a bögre „tiszta / habos” állapota;
- **letolt pizsamanadrág:** a pizsama-shaderben egy `pantsDown` jel – ilyenkor a comb bőrszínt kap, és a térdcsonthoz (`rig.knee`) kötve egy gyűrött nadrág-gyűrű jelenik meg; ülés a WC-n a WC magasságára (0,42 m);
- pukik és gyomormorgás: új szintetizált hangok (`audio.js`); szagfelhő: zöld részecskék (`spawnFx`), lassan emelkedő, nagyobbodó, halványuló pamacsok.

## 2. Karcsi nagy szökése  ✅ kész

- **Megvalósítás** (`src/ep2/runaway.js`, `karcsi.js`, `navgrid.js`): a hűtőben három répa 🥕; a nyitott kalitkánál felkínálva (F) Karcsi az ajtóhoz jön és felvehető (E, 🐹), bárhol letehető a padlóra. Szabadon (`karcsi.js` szabad mód) futkos, búvóhelyekre bújik (Petyus ágya, nagyágy, kanapé, asztal, fotel, íróasztal), a padlóra tett répához szalad (evés közben fel lehet venni), sokszor a konyha felé szaglászik. Angi lábánál: „ÁÁÁÁÁ! EGY PATKÁNY!!”, a székre ugrik (legalább 8 mp-ig fent marad), közben odaég a reggeli (füst, „Ég a rántotta!”). Apa négykézláb kergeti (útkeresés a lakás rácsán – `navgrid.js`), az asztal alatt beüti a fejét („Au! A fejem!”), Karcsi búvóhelyről búvóhelyre ugrik; a végén apa (vagy Petyus) visszateszi a kalitkába: „Petyus! Délután nincs Xbox!” → +10 perc. Állapot: `rw`.
- **Alaphelyzet:** Karcsi a kalitkában, Petyus szobájában. Angi fél az egerektől és minden „kis szőröstől” – reggel el is mondja: „Ha az a malac még egyszer kiszökik, én elköltözöm!”

- **Menet:**
1. Petyus kinyitja a kalitka ajtaját (E – megvan), és **kiveszi Karcsit** (Karcsi a leltárba kerül 🐹). Ha Karcsi épp a házikójában bújik, várni kell, vagy egy **répával** (új tárgy a hűtőből 🥕) ki kell csalogatni.
2. Petyus bárhol **leteszi** Karcsit a padlóra (F). Karcsi magától futkos a lakásban: bútorok alá bújik (ágy, kanapé, szekrény), szaglászik, visít („UÍ-UÍ!”), és a répa felé szalad, ha Petyus leteszi.
3. **Ha Karcsi a konyhába, Angi lábához ér:** Angi felsikít („ÁÁÁÁÁ! EGY PATKÁNY!!” – Petyus: „Anya, ez Karcsi!”), **felugrik egy székre**, és onnan nem jön le, amíg Karcsi a konyhában van. Közben a reggeli odaég a tűzhelyen (füst; apa: „Ég a rántotta!”).
4. **Apa** feláll, és **négykézláb kergeti** Karcsit a lakásban („Gyere ide, te kis… szőrgombóc!”): mulatságos négykézláb járás, az asztal alatt beüti a fejét („Au!”). Karcsi mindig a legközelebbi búvóhelyre menekül.
5. **Vége:** apa (vagy Petyus) elkapja Karcsit, és visszateszi a kalitkába; Angi: „Petyus! Délután nincs Xbox!” → **késés** (+10 perc).

- **Csillagok:**
- ★ Karcsi szabadon a lakásban;
- ★★ Angi a székre ugrik;
- ★★★ és Karcsi legalább 60 mp-ig szabad marad, mielőtt apa elkapja (minél jobb búvóhelyre fut, annál tovább tart).

- **Technika:** Karcsi kiléphet a kalitkából (a `karcsi.js` mozgása a padlón is: célpontok – búvóhelyek, répa, az emberek elkerülése, vagy épp Angi lába); Karcsi és a répa felvehető tárgy a leltárban; Angi „széken állás” póza (a szék tetején, karok a feje fölött); apa négykézláb járása (comb és kar is előre, a test vízszintesen).

## 3. Hol a kulcs, Angi?  ✅ kész

- **Megvalósítás** (`src/ep2/keyhunt.js`): Angi kulcsa 🔑 a cipősszekrényen; minden lerakóhelyre elrejthető, plusz kabátzsebbe, kanapépárna alá, fotelba, mosógépbe, Karcsi kalitkájába. 20 mp után Angi keresni kezd: a logikus helyektől (cipősszekrény, kabát, pult, asztal, kanapé, fotel, tévé, íróasztal) a furcsák felé (WC, kád, mikró, hűtő, mosógép, kalitka), mindenhol kotorászik, ajtót nyit, egyre idegesebb. Petyus mellette **E – „Anya, nem a … van?”** (tipp: ★★★ elvész). Fura helyen: „A kulcsom… a HŰTŐBEN?! … PETYA!!”, apát hibáztatja, Petyus fütyörészik; ha Petyusnál maradt: „Nálad van a kulcsom?!” Késés 5–20 perc a keresés hossza szerint. Állapot: `kh`.
- **Alaphelyzet:** Angi kulcscsomója az előszobában a cipősszekrény tetején van (a modellen most is van ott egy kulcs – felvehető tárgy lesz 🔑). Angi reggel többször kérdezi: „Petya, nem láttad a kulcsomat?” (ez a sora már megvan) – innen az ötlet.

- **Menet:**
1. Petyus felveszi a kulcsot (E), és **elrejti** valahol (F): hűtő, mikró, a mosógép dobja, kád, Karcsi kalitkája, a kanapé párnája alá, a fotelbe, a cipősszekrénybe, az íróasztal fiókjába, a WC-tartályra…
2. Amikor közeledik az indulás (vagy Angi a kulcsért megy), **Angi keresni kezd**: sorra járja a „logikus” helyeket (cipősszekrény → kabátzseb a fogason → táska → konyhapult → asztal → kanapé → …), mindegyiknél kicsit kotorászik (fiókot nyit, párnákat emelget), és egyre idegesebb („Itt volt! Itt volt a kezemben!”, „Petya, te tetted el?!”, „Ez a ház megeszi a kulcsaimat!”).
3. **A rejtekhelytől függ, meddig keres:** a szokásos helyeken hamar megtalálja; a fura helyeken (hűtő, mosógép, Karcsi kalitkája, mikró) csak a sor végén. A legvégén: „A kulcsom… a HŰTŐBEN?! … PETYA!!” – és **apát hibáztatja** („Megint te pakoltad el a bevásárlással együtt!”), apa értetlenül tiltakozik. Petyus közben fütyörészik.
4. Petyus **segíthet** is: Angi mellett E-vel tippet adhat („Anya, nem a hűtőben van?”) – Angi azonnal odamegy, de a ★★★ elvész (gyanús lesz: „Honnan tudtad?…”).
5. **Vége:** megvan a kulcs → **késés** (a keresés ideje szerint +5…+20 perc).

- **Csillagok:**
- ★ Angi keresni kezdi a kulcsot (el van rejtve);
- ★★ 2 percnél tovább keres;
- ★★★ a kulcs fura helyen volt (hűtő, mikró, mosógép, Karcsi kalitkája), és Angi végül apát hibáztatja (Petyus nem árulta el magát).

- **Technika:** a kulcs új leltártárgy (minden lerakóhely elfogadja, plusz új rejtekhelyek: kanapé, fotel, fiók, mosógép); Angi keresési útvonala és „kotorászás” mozdulatai (lehajolás, fiók- és szekrényajtó nyitása – az ajtók már nyithatók); a keresés ideje rejtekhelyenként.

## 4–7. Iskolai csibészségek  ⬜ még nincs kitalálva

Az iskola helyszínnel együtt (lásd lent).

## 8–10. Délutáni csibészségek  ⬜ még nincs kitalálva

Az otthoni délutánnal együtt (16:00–22:00).

---

## Filmes nyitány: az ébresztés  ✅ kész

- **Megvalósítás** (`src/ep2/wakeup.js`, az ágyak: `src/ep2/sleep.js`): új játék elején (folytatáskor nem; fejlesztéshez `?resz=2&nyitany=1`). Filmes kép (csíkok, szemcse), Enter / Kihagyás → azonnal a végállapot.
- **Menet:**
  1. Felirat: **Tököl** · a nap dátuma és neve (pl. „2026. szeptember 2. · szerda”).
  2. Sötét hálószoba, holdfény; apa és anya alszik a franciaágyban betakarózva, apa hatalmasat horkol.
  3. 6:00-kor megszólal apa éjjeliszekrényén az ébresztőóra (piros 6:00, villog, zörög, nagyon hangos).
  4. Apa felriad, felül, kezét feltartva kiabál: „MEGADOM MAGAM! MEGADOM MAGAM!!” – anya is felül, lecsapja az órát, leszidja, és Petyus felébresztésére küldi.
  5. Apa felkel, kioson (anya visszafordul aludni), hajnalodik; beoson Petyus szobájába (az ajtók kinyílnak).
  6. Óvatos ébresztgetés: „Petyus… kisfiam… ébresztő…” – „Mmmm… még öt percet…”, Petyus elfordul.
  7. Apa lufit fúj, Petyus feje mellé tartja és kidurrantja: PUKK! Petyus felriad: „ÁÁÁÁ!! MI VOLT EZ?!” – „Jó reggelt, bajnok!”
  8. Főcím (Petyus kalandjai · 2. rész · Szeptember), majd indul az otthoni reggel (Angi: „Na végre fent vagy…”).
- **Technika:** saját kis idővonal (`W`, `until`, kihagyáskor elutasít), a kamera testmagasságra keretez (`atHeight`), a szereplő előtti magas bútor áttetsző (`G.occludeAt` → `occlude.js`), a falak a jelenet tárgya szerint fakulnak.

## Helyszín: Otthon délután–este  ✅ kész (csibészségek nélkül)

- **Megvalósítás** (`ep2.js` `EVE` ág, `outside.js` `setEvening`, `home.js` `addFillLights`): ugyanaz a lakás és környéke, mint reggel, de **kint sötét van** (éjszakai égbolt, halvány kék fény), **bent égnek a lámpák** (minden szoba villanya fel van kapcsolva – a két legközelebbi árnyékot vető spotfény mellett a többi szoba is lágy fényt kap).
- **A ház többi lakása és a szomszéd házak** ablakaiban lámpák égnek, időnként (6–30 mp-enként) fel- és lekapcsolódnak (`WINDOWS`, egy instanced négyzetrács).
- **Az utcán és az udvaron** az 1. rész park-lámpái (kandeláberek: `LAMPS`) – este világít a lámpaházuk, alattuk fényfolt a földön, a házhoz legközelebbi háromnak valódi fénye is van.
- Nincs pizsama; a nővér nincs otthon; a reggeli csibészségek nem futnak; apa és anya esti mondatai („Megírtad a leckét?”, „Mindjárt kész a vacsora!”), 21:15 után anya lefekvésre küld. Petyus a bejárati ajtónál kezd (most ért haza).
- **E – lefekvés** Petyus ágyánál → másnap reggel.
- ⬜ Később: a délutáni 3 csibészség, vacsora, fürdés, tévézés.

## A reggel vége, a késés  ◐ részben

- ✅ A csibészségek késése összeadódik, a HUD-on ⏰ +x perc.
- ⬜ Indulás (átöltözés után), „Elkéstünk!” átvezető, következmény az iskolában.

- Az indulást továbbra is a játékos dönti el (a bejárati ajtónál – ha már nem pizsamában van; az átöltözés még hátravan).
- A csibészségek késése összeadódik; 7:30 után indulva „Elkéstünk!” átvezető, az iskolában következménnyel (később).
- Egy reggelen mindhárom elvégezhető, de nem kötelező egyszerre: a naptár napjain bármikor, és – mint az 1. részben – a legjobb eredmény számít.

## Megnyitás és fejlesztői elérés  ✅ kész

- **Feltétel:** a 2. rész csak akkor nyílik meg, ha az 1. részben a csibészségekből **legalább 15 ⭐** összegyűlt (`totalStars()` a `mischief.js`-ben, mentés: `petyus.r1.csibeszsegek`).
- **Kezdőképernyő:** a szeptemberi polaroidon zárva „🔒 15 ⭐ kell (most: x)” felirat; ha megvan a 15 ⭐, a csempe indítható lesz (mint az augusztusi). ⬜ Első megnyíláskor egy kis „Új rész nyílt meg!” jelzés (még nincs).
- **Fejlesztői elérés:** csak a fejlesztői szerveren (`npm run dev`), a kiadott (prod) buildben nincs benne.
  - Megvalósítás: `import.meta.env.DEV` ágban – a Vite a buildből kidobja, így a prod oldalon semmilyen URL-lel vagy gombbal nem érhető el.
  - Használat: ✅ `?resz=2` URL-paraméter (egyből a 2. részt indítja); ⬜ `?resz=2&hely=iskola&nap=5` jellegű ugrás a helyszínek / napok teszteléséhez; a kezdőképernyőn dev módban egy kis „DEV: minden rész nyitva” jelzés.
  - Ellenőrzés: a build után a `dist/` JS-ében nem szerepelhet a dev-ág (pl. egy keresés a `resz=` szövegre).

## Napok, naptár, váltás a helyszínek között  ✅ kész

- **Megvalósítás** (`ep2.js`): `ep2.phase` (`morning` · `school` · `evening`), mindegyiknek saját órája (`PHASES`: 6:00–7:30 · 8:00–15:30 · 16:00–22:00, kb. 10 valós perc alatt telik), a mentés (`petyus.r2.allapot`) a napszakot is tartalmazza. Továbblépéskor (`goPhase`) a következő napszak kezdete mentődik („fresh”), az oldal újraindul, és egy **átvezető kártya** jön (hely · dátum · óra, „Tovább ▶” – a kattintás indítja a hangot is); így minden napszak tiszta állapotból indul.
- **Reggel → iskola:** a bejárati ajtónál **E – indulás az iskolába** – csak ha Petyus **fel van öltözve**, a szülők már az ajtónál várnak, és már **7:30** van **vagy** mindhárom reggeli csibészség legalább egy csillaggal megvolt (a napló szerint); különben Angi: „Pizsamában?! Előbb öltözz fel!” / „Még csak 6:45 van! Fél nyolckor indulunk.” + felirat a feltételről.
- **Öltözködés** ✅ (`src/ep2/dressing.js`): Petyus szobájában a szekrény (üreges, saját modell: oldalak, hátfal, polc, rúd) **E**-vel kinyílik (két ajtószárny a fogantyúval együtt nyílik, bent a rúdon vállfán a pólók, a polcon a nadrágok; amíg Petyus előtte áll, a szekrény áttetsző – a kamera a hátulja felől néz), újra **E** → ruhaválasztó: **1 fehér** (az 1. rész focimeze) · **2 fekete** · **3 kék** (a pizsama sötétebb kékje) – ugyanaz a ruha, csak a felső színe más (`dressClothes` + `TOPS` a `pajama.js`-ben). Petyus megpördül, és már az új ruhában van (később újra választhat); a viselt póló nincs a vállfán. A választott ruha az iskolában és este is rajta marad.
- **A szülők:** ha Petyus felöltözött, és ideje indulni (7:30, vagy megvolt mindhárom reggeli csibészség – és épp egyik csibészség sem foglalja le őket), berohannak a szobájukba, a szekrénysornál átöltöznek (az 1. részes ruhájukba), majd a bejárati ajtóhoz mennek, és onnan sürgetik Petyust („Petyus, gyere már! Elkésünk!”). Ha 7:30 van, és Petyus még pizsamában van, öltözni küldik.
- **Iskola → otthon délután:** a kapunál **E – hazaindulás**, egyelőre feltétel nélkül.
- **Este → másnap reggel:** Petyus ágyánál **E – lefekvés**, feltétel nélkül (a másnap reggel már film nélkül indul; a késés nullázódik).
- **Hétvége:** szombaton–vasárnap reggel az indulás az iskola helyett egyből az esti otthonba visz („Hétvége: ma nincs iskola – egész nap a nagyiéknál voltatok.”).
- **A hónap vége:** szeptember 30. este lefekvés után a hónap elölről kezdődik (szept. 2.), a csibészségek eredményei megmaradnak.
- Fejlesztéshez: `?resz=2` a mentett napszakot folytatja.

- ✅ Naptár és óra a HUD-on (2026. szeptember 2. …), a reggeli óra telik (6:00 → 7:30), mentés a rész állapotával.
- ⬜ A napok léptetése, hétvégi átvezető, a hónap vége, a helyszínek közti váltás.

- **Kör:** otthon reggel → iskola → otthon délután. Csak előre lehet lépni, vissza nem. Egy teljes kör = egy nap; utána a következő nap reggele jön.
- **Naptár:** a HUD-on (és váltáskor nagyban) látszik az aktuális nap: „2026. szeptember 2., szerda”. Indulás: **2026. szeptember 2.** (szerda), utolsó nap: **2026. szeptember 30.** (szerda) – összesen 29 nap.
- **Hétvégék:** benne vannak, de szombaton és vasárnap nincs iskola: csak az otthon reggel és az otthon délután játszható, a köztük lévő program (iskola) kimarad – helyette egy átvezető képernyő („Szombat – kirándulás a nagymamánál…” jellegű kép + szöveg), majd jön az otthoni délután.
- **Vége:** az utolsó nap után lejár a hónap. Ilyenkor a hónapot csak elölről lehet kezdeni (újra szept. 2-től), de a **csibészségek eredményei megmaradnak** (a legjobb eredmény számít, mint eddig).
- **Váltás:** a **játékos dönti el**, mikor indul tovább (pl. az iskolatáskával és cipőben az ajtónál: „E – Indulás az iskolába”); egy rövid átvezető / áttűnés visz a következő helyszínre, közben a naptár és az óra mutatja az időugrást.
- **Óra:** a játékidő gyorsítva telik (hangolandó); a napszak végéhez közeledve apa/anya sürget („Elkésel!”), de a váltást akkor is a játékos indítja. (Hogy a késésnek legyen-e következménye, később döntjük el.)

## Helyszín: Otthon (a lakás)  ✅ kész (reggel)

### Az alaprajz értelmezése (a csatolt kép alapján)

A lakás egyszintes, nagyjából **13 m × 7,5 m**, téglafalakkal, két erkéllyel. Az északi oldal (a kép teteje) és a déli oldal (a kép alja) egy-egy szobasor, köztük – a felső sor alatt – egy kb. 1,3 m széles előtér/folyosó.

| Helyiség | Méret | Berendezés a rajzon | Javasolt szerep |
|---|---|---|---|
| Fürdőszoba | 5 m² (2,88 × 1,78 m) | kád, mosdó | reggeli fogmosás, fürdés este |
| WC | 2 m² (1,25 × 1,78 m) | WC, kis mosdó | |
| Konyha–étkező | 21 m² (4,65 m széles + a folyosó vége) | konyhapult mosogatóval és főzőlappal az északi ablakok alatt, 6 személyes étkezőasztal, radiátor | reggeli, vacsora, családi jelenetek |
| Kis szoba | 10 m² (2,98 × 3,20 m) | íróasztal monitorral, egyszemélyes ágy; ajtó az északi erkélyre | **Petyus szobája** |
| Előtér / folyosó | kb. 1,28 m széles, 3,83 m hosszú (a fürdő/WC alatt, a konyháig) | bejárati ajtó a nyugati falon | cipő, iskolatáska, indulás |
| Testvér szobája | 20 m² (5,18 × 3,70 m) | beépített gardrób, franciaágy, TV-szekrény / komód | **a testvéré** (később érkező szereplő) – egyelőre **zárva**, nem lehet bemenni (csukott ajtó, „Zárva” buborék) |
| Nappali–háló | 26 m² (kb. 7 × 3,7 m) | franciaágy, állólámpa, kanapé, TV-szekrény, gardróbsáv (84 cm) | **a szülők** szobája (háló + nappali); ajtó a keleti erkélyre |
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

- **Petyus:** az ágyából kel a kis szobában (a nyitány után), a játékos irányítja. ✅ A WC-be pisilni is tud (lent).
- **Petyus nővére:** ✅ a testvér szobájában (zárva) alszik a franciaágyban, betakarózva, időnként forgolódik (`sister.js`; modell: `nover.glb` – Angi testéből, hosszú fekete hajjal, sötét szemmel, `reshape_nover` a modell-pipeline-ban).
- **Petya (apa):** a konyhában kávét főz / újságot olvas az asztalnál, közben instruál („Fogmosás! Öltözz! Hol a tolltartód?”).
- **Angi (anya):** reggelit készít, uzsonnát csomagol, a folyosón keresi a kulcsot.
- **Ruhák:** reggel **mindhárman pizsamában** vannak; később átöltöznek – Petyus iskolai ruhába, Petya és Angi munkaruhába. Megvalósítás: a meglévő modellek színezett változatai (a ruha anyagszíneinek cseréje, esetleg minta), vagy új modellváltozatok a modell-pipeline-nal – az első lépésben a pizsama kell.

### Ami elkészült  ✅

- **Kód:** `src/ep2/ep2.js` (indítás: a park eltűnik, a lakás jön – `startEp2()`; fő lépés: `stepEp2(dt)` a `main.js`-ből, ha `G.episode === 2`; naptár + óra a HUD-on; apa és anya szövegei; ajtók: kopogás a testvérnél, a bejárati ajtó „Pizsamában?!”), `src/ep2/home.js` (szobák `ROOMS`, falak `WALLS` ajtókkal/ablakokkal, padlók, bútorok, erkélyek, ütközők; a belső falak lesüllyednek, ha Petyus vagy a szobája mögöttük van – `updateHome`), `src/ep2/pajama.js` (a ruha átszínezése vertex-színekben + minta a shaderben: Petyus csíkos, apa kockás, anya pöttyös), `src/voxels-home.js` (22 bútor a katalógusban, „Lakás” kategória).
- **Megnyitás:** a szeptemberi csempe (`need: 15` az `EPISODES`-ban) zárva „🔒 15 ⭐ kell (most: x)”; ha megvan, indítható. Fejlesztői szerveren mindig nyitva („DEV: nyitva”), és `?resz=2` egyből indítja; a buildben ez nincs benne (ellenőrizve).
- **Méretek:** a játékban a szobák kb. 1,3-szor nagyobbak az alaprajznál (a lakás belül 15,6 × 9,2 m), hogy ne legyen zsúfolt. Az étkezőasztal a konyha keleti falánál, Petyus szobája mellett áll, hosszában, így a konyha közepe szabad. A déli és a keleti külső fal 1,6 m-nél „el van vágva”: a párkány, az üveg és az ablakkeret látszik; ha Petyust takarnák, lesüllyednek.
- **Falak és nézet:** minden fal teljes magasságú. A kamera felé néző külső falak mindig átlátszók, a belső falak akkor, ha Petyust vagy a szobáját takarják; a **T** gombbal ki lehet próbálni a lesüllyedő változatot is. A nézet **Q / R** (vagy a ⟲ ⟳ gomb) 90°-onként forgatható. **V** (👁): belső nézet (FPS) Petyus szemmagasságából – WASD, ← → fordul, kattintás után az egérrel néz körül; ilyenkor a falak tömörek, van mennyezet.
- **Zoom:** a játék az 1-es szinten indul (a lakás nagy része látszik); kifelé 2×-ig lehet zoomolni (a ház és az udvar), befelé szabadon (`G.zoomMax = 2`).
- **A ház és környéke** (`src/ep2/outside.js`): a lakás a társasház 2. emeletén van (`FY = 6`). Látszik a földszint és az 1. emelet ablakokkal és alsó erkélyekkel, a lakástól nyugatra a lépcsőház és a szomszéd lakás. A bejárat délen van, előtte parkoló autókkal, utca, járda. A ház körül nyugaton, északon és keleten nagy füves udvar van fákkal és bokrokkal, a ház mögött trambulin. Körben drótkerítés, délen kapukkal. A környék a légifotó szerint: az utca túloldalán (délen) családi házak narancs cseréptetővel és kertekkel; nyugaton két hosszú, lapostetős négyemeletes tömb (keleti oldalukon narancs erkélysávok), köztük parkoló; mögöttük (északnyugaton) a garázssor; a ház mögött (északon) hosszú rét dűlőúttal, a végén néhány autóval, mögötte kis házak; keleten sűrű erdősáv, azon túl (északkeleten) felszántott szántóföld. Az udvaron két kutya és két macska van; gyerekek reggel még nincsenek kint (a trambulinozó és fogócskázó gyerekek a délutánhoz készen állnak: `buildLife(true)`).
- **A ház kinézete (fotó alapján):** fehér vakolat, barnás-rózsaszín lábazat, fehér ablakok barna redőnytokkal (néhány redőny félig lehúzva), sötét keretes üveg bejárat, ereszcsatornák; piros cserepes kontyolt tető tetőablakokkal, téglakéményekkel, antennával. A tető csak kizoomolva látszik (1,35× felett beúszik), közelről és FPS-ben eltűnik, hogy belelássunk a lakásba; amikor látszik, a falak tömörek.
- **Udvar:** kavicsos-betonos parkoló betonszegélyekkel, homokozó, ruhaszárító ruhákkal, három fekete kuka a kapunál, lépőkövek a trambulinhoz, virágágyások, sövény a kerítés mentén, kerti asztal, kerékpártámasz, kövek, fűcsomók és vadvirágok, virágzó fák a ház előtt.
- **FPS egér:** kattintásra egérzár (mint a lövöldözős játékokban), Esc-re elenged; ahol nincs egérzár, húzással megy.
- **Berendezés:** a szülőknél a franciaágy az északi falon, szemben a déli falon a kanapé, a tévé a déli falon a testvér szobája felé, a gardrób a testvér szobájának falán. Petyusnál az ágy a konyha falán, az íróasztal a keleti ablaknál, a gardrób a déli falon. A fürdőben a kád a nyugati falon, az északi falon mosógép és polc, a mosdó a keleti falon.
- **Ajtók, kapcsolók, redőnyök:** minden szobának nyitható-csukható ajtaja van (E), az erkélyeknek üvegajtaja; csukott ajtón nem lehet átmenni. A testvér szobája zárva (kopogás), a bejárati ajtó egyelőre az indulásé. Kapcsolók (E) a fürdő és a WC ajtaja mellett a folyosón, a bejáratnál, a konyhában, Petyus és a szülők szobájában; mindegyik a saját szobája lámpáját kapcsolja (meleg fény, FPS-ben a mennyezeti lámpa is világít). Reggel minden lámpa le van kapcsolva. Az ablakokon kívül redőny, félig felhúzva.
- **Konyha:** széles, kétajtós hűtő a nyugati falon, mellette L alakban fordul a pult (egy elem a nyugati falon, négy az északin).
- **Szobanövények:** a szülők szobájában a keleti ablak alatt virágpolc kis növényekkel (rajta és alatta: futóka, kaktusz és pozsgás, flamingóvirág, páfrány), előtte a padlón nagyobbak: monstera, anyósnyelv, páfrány, fikuszfa a sarokban. Az állólámpa a kanapé mellé került.
- **Képek, berendezés:** a falakon bekeretezett képek az 1. részből (`public/kepek/`, 512 px): az előszobában, a konyhában (2), Petyus ágya és a szülők ágya fölött, a szülők alacsony szekrénye fölött (2); a fallal együtt áttetszők lesznek. A szülők gardróbja helyett fél magas (1,05 m), a testvér szobájának teljes falát beborító fiókos-ajtós szekrénysor. WC: fel- és lehajtható ülőke (E), WC-pumpa, WC-papír-tartó tartalék tekercsekkel. Fürdő: zuhany a kád fölött (csaptelep, rúd, zuhanyfej, gégecső) és zuhanyfüggöny. Előszoba: fali fogas kabátokkal, sállal, kalappal, alatta cipősszekrény.
- **Kapcsolható és nyitható eszközök** (`src/ep2/appliances.js`, E; a mikrónál Szóköz is): nyitható kétajtós hűtő (polcok, ételek, ajtópolcok, lámpa) · részletes mikró (nyitható ajtó ablakkal, forgótányér, kijelző, gombok; Szóköz: tányér, majd pohár berakása / kivétele, csukva indítás 10 mp-re, a végén DING) · vízforraló (kék fény, gőz, magától kikapcsol) · tűzhely (izzó főzőlapok, gőz a lábasból; reggel be van kapcsolva, anya főz) · mosogatócsap, kádcsap (vízsugár), zuhany (csepegő víz) · mosógép (forgó dob) · a szülők tévéje (focimeccs: Real Madrid – Barcelona) · Petyus részletes számítógépe (monitor webkamerával, billentyűzet narancs WASD-vel és világítással, egér, hangfalak, gépház világító ventilátorokkal; képernyőn: indulás → asztal → ugrálós játék).
- **Reggeli és hűtő** (`src/ep2/food.js`): az asztalon részletes tányérok (peremcsíkkal), bögrék teával, poharak (tej, narancslé), evőeszközök, müzli tejjel (zabpehely, mazsola, dió darabok, kanál), szeletelt kenyér a vágódeszkán késsel, szalámiszeletek, gyümölcstál (alma, narancs, banán, szőlő), tejesdoboz, müzlisdoboz, teáskanna, vaj, méz, szalvéta. A hűtőben: a második polc elején tej, **tejszín** (TEJSZÍN feliratú doboz) és **tejszínhab** (TEJSZÍNHAB spray piros kupakkal); az első polcon három répa (Karcsinak), mögöttük sajt, egész szalámi szeletekkel; a harmadik polcon kóla, narancsos üdítő, doboz üdítő, gyümölcs a zöldségfiókban.
- **Árnyékok:** a 2. részben a nap nem vet árnyékot; a felkapcsolt mennyezeti lámpák (lefelé világító spotlámpák, egyszerre legfeljebb 2 – a Petyushoz legközelebbiek) vetnek árnyékot, felülnézetben és belső nézetben is.
- **A szülők tévéje előtt:** fotel, amibe **E**-vel le lehet ülni (bármelyik mozgásgomb feláll; belső nézetben ülőmagasságból látni). A TV-szekrényen egy részletes **Xbox Series X** (állva, zöldes szellőzőnyílások felül, világító gomb, lemezrés, USB) és egy **kontroller** (két markolat, két kar, D-pad, színes A/B/X/Y, Xbox-gomb, vállgombok, ravaszok); az Xboxot külön, **E**-vel lehet bekapcsolni (indulóhang, világító gomb); ha a tévé is megy, rajta az Xbox indulása, kezdőképernyő, majd focijáték látszik. A franciaágy mellett jobbra, az erkélyajtó felé könyvespolc (színes könyvek, növény, fénykép, dobozok, földgömb).
- **Tárgyak, leltár** (`src/ep2/inventory.js`): felvehető (E) a kontroller, a WC-papír (a WC-tartályon), a bögre (a pulton a mikró mellett), a tej, a tejszín, a tejszínhab és három répa (a hűtőben – csak nyitott hűtőből), Angi kulcsa (a cipősszekrényen), Karcsi (répával kicsalogatva); a nálad lévők a felső sávban (1–9 / Tab / kattintás: választás). **F** (telefonon a gomb): a kiválasztott lerakása a közeli helyre – kontroller és WC-papír: TV-állvány, íróasztal, hűtő, mikró, kád széle (a papír a WC-tartályra is); bögre: mikró, hűtő, étkezőasztal, TV-állvány, íróasztal, konyhapult; tej, tejszín, tejszínhab: hűtő (a saját rekeszükbe), étkezőasztal, konyhapult (hűtő és mikró csak nyitva). A bögrébe: tea (a teáskannánál), kávé (a kávéfőzőnél – apa szól), tej, tejszín, tejszínhab (a nálad lévő vagy közeli dobozból); a színe ettől változik, a tejszínhabtól habkorona lesz rajta; a mosogatónál kiönthető. Az Xbox bekapcsolása a tévét is bekapcsolja; ha megy az Xbox és Petyus a fotelben ül, a kontroller a kezében van.
- **Célzás belső nézetben:** a képernyő közepén kis pont; minden interakció (ajtó, kapcsoló, eszköz, tárgy felvétele, lerakóhely, bögretöltés) csak akkor elérhető, ha a pont az adott tárgyra mutat (legfeljebb ~1,9 m-ről; a nagy tárgyakat – ajtó, hűtő, tévé – bárhol, a kicsiket – kapcsoló, bögre – pontosan kell megcélozni). Felülnézetben továbbra is a közelség számít.
- **Karcsi, a tengerimalac** (`src/ep2/karcsi.js`): Petyus szobájában az északi ablak előtti asztalon nagy kalitka (kék tálca, alom, rácsok) kis faházzal, etető- és itatótállal, répával; a kalitka ajtaja E-vel nyílik. Karcsi vöröses, fehér foltokkal. Félénk: ha valaki 1,5 m-nél közelebb jön, a házába bújik, és kikukucskál az ajtón; ha senki sincs a közelben, körbe-körbe mászkál, és minden második körben megáll a répánál enni. Ha anya a hűtőhöz megy, Karcsi visít („UÍ-UÍ-UÍ!”).
- **Azóta kész:** ✅ a telefonos gombfeliratok, ✅ a három reggeli csibészség, ✅ hangok és beszédhang, ✅ a belső nézetben nagyobb szögben lehet le- és felnézni (kb. ±80°).
- **Még nincs:** ⬜ átöltözés, ⬜ iskolatáska/cipő és indulás az iskolába, ⬜ a napok léptetése, ⬜ „Új rész nyílt meg!” jelzés.

### Az eredeti első lépés

A 2. rész **otthon, reggeli időszakkal** induljon: a fejlesztői eléréssel (`?resz=2`) betölthető lakás az alaprajz szerint, berendezve, reggeli fényekkel, a három szereplővel; Petyus irányítható, a falak és bútorok ütköznek. A megnyitási feltétel (15 ⭐) és a kezdőképernyő-csempe ugyanebben a körben.

## Helyszín: Iskola  ✅ kész (csibészségek nélkül)

- **Megvalósítás** (`src/ep2/school.js`) – a tököli **Weöres Sándor Általános Iskola** fényképe és légifotója alapján:
  - **Főépület:** hosszú, kelet–nyugati, háromszintes, lapostetős; a tetőn napelemsorok. Fehér vakolat narancs sávokkal (földszinti lábazat, az 1. emelet ablakai alatt), a tető alatt krémszínű sáv; fehér keretes, osztott ablakok, bent világos függönyök.
  - A nyugati végén a **narancs tömb** fehér szalagablakokkal; mellette a **bejárat**: sötétbarna fa előtető két vékony oszlopon, rajta a felirat („WEÖRES SÁNDOR ÁLTALÁNOS ISKOLA”), betonlépcső oldalfalakkal, üvegajtó.
  - Délre hozzá kapcsolódik a **kétszintes, négyzetes épület** (tornaterem / ebédlő, tetőablakkal), attól délre a **füves pálya** két kapuval az Iskola utcáig.
  - Északon a **városi sportcsarnok** (piros nyeregtető, napelemek), keletre mellette a **kék sportpálya** kerítéssel; mögötte murvás parkoló.
  - A bejárat előtt **térkő**, kerékpártámaszok, betonpadok fa ülőlappal, fa szemetesek, nagy fák (platánok), lámpák; keletre vöröses térkő.
  - Körben az iskola kerítése, a **kapu nyugaton a Kossuth Lajos utcára** nyílik; délen az Iskola utca, keleten az Aradi utca, az utcák mentén piros tetős családi házak.
- **Bent** a főépület földszintje járható: a folyosó (fogasok kabátokkal és táskákkal, vitrin, faliújságok, padok) és három terem: **Petyus osztálya (3. b)** – tábla krétaírással, tanári asztal, 3 × 3 pad, könyvespolc, szekrény, rajzok, óra –, a 4. a és a 2. a terme. Amíg Petyus bent van, az emeletek eltűnnek, a kamera felőli falak lesüllyednek, a déli kisebb épületből csak a lábazata marad.
- **Szereplők:** a tanító néni a táblánál sétál és beszél, 12 osztálytárs ül a padokban (Petyus felé fordulnak), négyen a téren és a pályán szaladgálnak, megszólítják.
- **Óra:** 8:00 → 15:30; **E – hazaindulás** a kapunál (egyelőre bármikor).
- ⬜ Később: a 4 iskolai csibészség, Petyus saját helye (leülés), a tornaterem / ebédlő belseje, az emeletek.

## Fejlesztési lépések

1. ✅ **Részek szétválasztása** (kész: `src/ep2/…`, `startEp2` / `stepEp2`): egy rész/helyszín-betöltő – a közös motor (rigek, `Actor`, buborékok, input, minőség, kamera, csibészség-rendszer) marad, a világ (`world.js` park) és a rész-specifikus tevékenységek részenként külön modulba kerülnek (pl. `src/ep1/…` és `src/ep2/…`), és a kezdőképernyőről indított rész tölti be a sajátját.
2. ✅ **Csibészség-rendszer részenként:** `MISCHIEFS` és a mentési kulcs részenként; az összesítés (⭐) részenként és összesen.
3. ✅ **Megnyitás + fejlesztői elérés** (fent).
4. ✅ **Naptár és napszakok** (naptár, óra, HUD, a napszakok köre, átvezető kártya, hétvége, a hónap vége): állapot (`nap`, `napszak`, játékóra), mentés `localStorage`-ba, HUD-elem, átvezetők a váltáshoz.
5. ✅ **Otthon – reggel:** a lakás voxelből az alaprajz alapján (falak, ajtók, ablakok, padló, bútorok), babaház-nézet, reggeli fények, Petyus/Petya/Angi elhelyezése, mozgás, ütközés.
6. ◐ Iskola (✅ helyszín), délutáni otthon (✅ helyszín), csibészségek (✅ a reggeliek, ⬜ az iskolaiak és a délutániak).

## Döntések

1. **Utolsó nap:** 2026. szeptember 30. (szerda).
2. **Hétvégék:** benne vannak; szombaton–vasárnap csak otthon reggel és otthon délután, a köztes program helyett átvezető képernyő.
3. **Szobák:** a 20 m²-es a testvéré (egyelőre zárva), a 26 m²-es a szülőké.
4. **Indulás:** a játékos dönti el, mikor indul.
5. **Ruhák:** reggel pizsama mindhármuknak; később átöltözés iskolai (Petyus) és munkaruhába (Petya, Angi).

## Javítandók (felvéve: 2026. 11. 23.)  ✅ mind kész

- [x] **Interakció-feliratok:** az egyes interakciók feliratai itt is pontosak legyenek – a súgósor (`#prompt`) és a telefonos gombok (HASZNÁL / RÚGÁS helyén az aktuális művelet) is (`ep2.js` `interactHome`). ✅ Telefonon a súgósor a gombok nevét írja (nincs E / F / Szóköz), a HASZNÁL gomb a műveletet (NYIT, ZÁR, BE, KI, FELVESZ, VILLANY, KOPOG, LEÜL …), a RÚGÁS gomb az F-ét (KÁVÉ, TÖLT, LERAK, ODAAD …) vagy a második műveletet (START, LEHÚZÁS).
- [x] **Hűtő:** a tej, a tejszín és a tejszínhab a második polcon legyen (most a jobb ajtó alsó rekeszében vannak – `appliances.js` hűtő, `inventory.js` `places.fridge` helyei). ✅ A második polc elején (saját helyük), a sajt és a szalámi az első polcon, az ajtórekeszben palackok.
- [x] **Tejszínes kávé – WC-ajtó:** Petya a WC-re rohanva becsukja maga mögött az ajtót; ha végzett, kinyitja, kijön, és visszacsukja (`coffee.js`: `rush` → `wc` → `back`). (A szagfelhő ilyenkor az ajtó résein / nyitáskor gomolyog ki.) ✅ Befelé menet becsapja („BUMM!”), csukott ajtónál a szag az ajtó alatt és fölött szivárog ki; a végén kinyitja (kigomolyog a felhő), kijön, visszacsukja („Most egy darabig ne menjen be senki…”).
- [x] **Bögre átadása apának:** könnyebb legyen – elég Petyára nézni (belső nézetben) vagy mellette állni, és úgy odaadni neki („bögre Petyának”), ne kelljen az asztalon a pontos helyet eltalálni (`inventory.js` `places.dad` / `invAction`). ✅ „F – bögre odaadása apának”: felülnézetben 1,4 m-en belül, belső nézetben apára nézve.
- [x] **TV:** focimeccs menjen rajta: Real Madrid – Barcelona (pálya, két mez szín: fehér / gránátvörös-kék, eredményjelző – `appliances.js` TV-kép). ✅ Közvetítés: lelátó, csíkos gyep, a kamera követi a labdát, fehér madridi és gránátvörös-kék barcelonai mezek, „RMA x – x BAR” + játékidő, időnként GÓÓÓL! és a közönség zaja, sípszó.

## Javítandók (felvéve: 2026. 11. 24.)  ✅ mind kész

- [x] **Petyus szobája:** a táska az íróasztal mellé, a roller a szekrény és a fal közé, a bukósisakkal együtt. ✅ A táska az íróasztal déli végénél, a keleti falnál (`home.js`); a park rollere (a `roller_kicsi.glb` másolata) a szekrény és a keleti fal között áll, kicsit megdőlve, a kormányán lóg a kék, narancs csíkos bukósisak (`buildScooterCorner` az `appliances.js`-ben, ütközővel).
- [x] **Angi a hűtőnél:** ha Petyus nincs a hűtő előtt, Angi odamegy, kinyitja, nézelődik benne (előrehajol, benyúl), majd becsukja és visszamegy a tűzhelyhez. ✅ `momRoutine` az `ep2.js`-ben; a hűtő kódból is nyitható (`fx.fridge.setOpen`); Karcsi ilyenkor visít.
- [x] **Ha Petyus a hűtő előtt áll:** Angi nem megy oda, hanem a főzőlaphoz, a mosogatóhoz vagy a vízforralóhoz (`MOM_JOBS`); ha útközben áll oda Petyus, Angi meggondolja magát. ✅

## Javítandók (felvéve: 2026. 11. 25.)  ✅ mind kész

- [x] **A testvér szobája:** a nyugati falon felesleges ablak volt. ✅ Az ablak megszűnt, a helyén az ágy fölött három bekeretezett kép (`home.js`: `WALLS`, `PICTURES`).
- [x] **Petyus nővére:** feküdjön az ágyban betakarózva, időnként forgolódjon; Angi karakteréből, hosszú fekete hajjal és sötét szemekkel. ✅ `nover.glb` (`rebuild.py`: `reshape_nover`), `sister.js` + `sleep.js` (hanyatt fekszik, időnként oldalra fordul, a takaró vele púposodik és susog).
- [x] **Pisilés a WC-be:** jobbra-balra célozva, néha mellé. ✅ `pee.js`: felnyitott fedélnél Szóköz (érintőn PISILÉS); A / D (botkormány) célzás, a sugár magától is kalandozik, a végén elfogy a nyomás; ami mellé megy, az tócsa a padlón, lent hagyott ülőkénél az ülőkére is jut; Petyus megjegyzése, Angi kiabál; lehúzás után újra lehet.
- [x] **Bevezető film:** Tököl + dátum és a nap neve, horkoló apa a sötétben, 6:00-s ébresztőóra, „Megadom magam!”, anya leszidja, apa felébreszti Petyust – végül lufidurrantással. ✅ Lásd „Filmes nyitány: az ébresztés” (`wakeup.js`).
- [x] **Iskola helyszín** csibészségek nélkül, továbblépés az otthon délutánba feltétel nélkül. ✅ `school.js`, a kapunál E.
- [x] **Indulás reggel** csak 7:30-tól, vagy ha a reggeli csibészségek mind megvoltak (legalább 1 ⭐). ✅ `leaveMorning` az `ep2.js`-ben.
- [x] **Otthon délután–este** csibészségek nélkül: kint sötét, bent égnek a lámpák, a többi lakás ablakaiban fel-le kapcsolódó lámpák, utcai és udvari lámpák (az 1. rész kandeláberei); továbblépés a reggelbe feltétel nélkül. ✅ `setEvening`, `addFillLights`, lefekvés Petyus ágyánál.
- [x] **Öltözködés az induláshoz:** a szekrénynél E, három szín (fehér / fekete / kék felső), a szülők berohannak, átöltöznek, az ajtóhoz mennek és sürgetnek; az indulás feltétele a felöltözés is. ✅ `dressing.js`, `dressClothes` a `pajama.js`-ben.
- [x] **A szekrény működése:** a ruhák nem belül voltak, a fogantyúk furán viselkedtek (a voxel szekrény tömör volt, a fogantyúja a helyén maradt). ✅ Üreges szekrény a `dressing.js`-ben, a ruhák a rúdon és a polcon belül, a fogantyú az ajtószárnyon.
- [x] **Az iskola áttervezése** a fénykép és a légifotó alapján (az épület és a környezete). ✅ `school.js`: háromszintes főépület narancs–fehér homlokzattal, előtetős bejárat, déli kisebb épület, füves pálya, sportcsarnok, kék pálya, tér, utcák, házak.
