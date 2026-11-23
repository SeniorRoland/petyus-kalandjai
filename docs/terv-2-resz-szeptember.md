# 2. rész: Szeptember – terv

**Állapot:** az első lépés kész (`feature/2-resz-otthon`): a lakás, reggel, pizsamában; megnyitás 15 ⭐-tól, fejlesztői elérés. Ezt a dokumentumot lépésenként bővítjük.

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
- **Naptár:** a HUD-on (és váltáskor nagyban) látszik az aktuális nap: „2026. szeptember 2., szerda”. Indulás: **2026. szeptember 2.** (szerda), utolsó nap: **2026. szeptember 30.** (szerda) – összesen 29 nap.
- **Hétvégék:** benne vannak, de szombaton és vasárnap nincs iskola: csak az otthon reggel és az otthon délután játszható, a köztük lévő program (iskola) kimarad – helyette egy átvezető képernyő („Szombat – kirándulás a nagymamánál…” jellegű kép + szöveg), majd jön az otthoni délután.
- **Vége:** az utolsó nap után lejár a hónap. Ilyenkor a hónapot csak elölről lehet kezdeni (újra szept. 2-től), de a **csibészségek eredményei megmaradnak** (a legjobb eredmény számít, mint eddig).
- **Váltás:** a **játékos dönti el**, mikor indul tovább (pl. az iskolatáskával és cipőben az ajtónál: „E – Indulás az iskolába”); egy rövid átvezető / áttűnés visz a következő helyszínre, közben a naptár és az óra mutatja az időugrást.
- **Óra:** a játékidő gyorsítva telik (hangolandó); a napszak végéhez közeledve apa/anya sürget („Elkésel!”), de a váltást akkor is a játékos indítja. (Hogy a késésnek legyen-e következménye, később döntjük el.)

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

- **Petyus:** az ágyából kel a kis szobában, a játékos irányítja.
- **Petya (apa):** a konyhában kávét főz / újságot olvas az asztalnál, közben instruál („Fogmosás! Öltözz! Hol a tolltartód?”).
- **Angi (anya):** reggelit készít, uzsonnát csomagol, a folyosón keresi a kulcsot.
- **Ruhák:** reggel **mindhárman pizsamában** vannak; később átöltöznek – Petyus iskolai ruhába, Petya és Angi munkaruhába. Megvalósítás: a meglévő modellek színezett változatai (a ruha anyagszíneinek cseréje, esetleg minta), vagy új modellváltozatok a modell-pipeline-nal – az első lépésben a pizsama kell.

## Helyszín: Iskola

Később részletezzük (osztályterem, folyosó, udvar/tornaterem, ebédlő?). A 4 iskolai csibészség és a tanár(ok) / osztálytársak itt jönnek majd.

## Csibészségek

10 csibészség: 3 otthon reggel, 4 az iskolában, 3 otthon délután – a tartalmukat később találjuk ki. A rendszer ugyanaz, mint az 1. részben (`mischief.js`: `award`, napló, ⭐), de részenként külön listával és mentéssel (`petyus.r2.csibeszsegek`).

### Otthon reggel (6:00–7:30) – 3 csibészség

Mindhárom a meglévő lakásra épül (leltár, eszközök, ajtók, Karcsi). Közös következményük a **késés**: minden sikeres csibészség perceket vesz el a reggelből (`ep2.lateMin`), és ha a család 7:30 után indul, az iskolában ennek következménye lesz (beírás, a tanár megjegyzése – az iskolai résznél döntjük el). Az eredmények a 2. rész saját naplójába kerülnek (`petyus.r2.csibeszsegek`), csibészségenként max. 3 ⭐.

#### 1. „A tejszínes kávé” (`r2-tejszin`) – **kész** (`src/ep2/coffee.js`)

**Alaphelyzet:** apa az asztalnál ül, és időnként kávét kér („Petyus, hoznál egy kávét?”). Apa gyomra érzékeny a tejszínre: a **tej** rendben van, a **tejszínhabot** észreveszi, a **tejszínt** nem.

**Menet:**
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

**Csillagok:**
- ★ apa a WC-re rohan (a tejszínes kávé hatott);
- ★★ első próbálkozásra sikerült (nem volt tejszínhabos visszaküldés);
- ★★★ és senki nem látta, ahogy a tejszínt a bögrébe tölti (Angi nem volt a konyhában, vagy háttal állt – Angi „látómezeje” egy kúp a nézési irányában).

**Technika (új elemek):**
- apa új állapotai: `coffeeAsk → drinking → growl (1…5) → rushWC → onWC → limpBack` (útvonal a WC-ig: konyha → előtér → WC-ajtó);
- „apa helye” lerakóhely (csak a bögre), a bögre kimosása (nyitott csapnál F), a bögre „tiszta / habos” állapota;
- **letolt pizsamanadrág:** a pizsama-shaderben egy `pantsDown` jel – ilyenkor a comb bőrszínt kap, és a térdcsonthoz (`rig.knee`) kötve egy gyűrött nadrág-gyűrű jelenik meg; ülés a WC-n a WC magasságára (0,42 m);
- pukik és gyomormorgás: új szintetizált hangok (`audio.js`); szagfelhő: zöld részecskék (`spawnFx`), lassan emelkedő, nagyobbodó, halványuló pamacsok.

#### 2. „Karcsi nagy szökése” (`r2-karcsi`)

**Alaphelyzet:** Karcsi a kalitkában, Petyus szobájában. Angi fél az egerektől és minden „kis szőröstől” – reggel el is mondja: „Ha az a malac még egyszer kiszökik, én elköltözöm!”

**Menet:**
1. Petyus kinyitja a kalitka ajtaját (E – megvan), és **kiveszi Karcsit** (Karcsi a leltárba kerül 🐹). Ha Karcsi épp a házikójában bújik, várni kell, vagy egy **répával** (új tárgy a hűtőből 🥕) ki kell csalogatni.
2. Petyus bárhol **leteszi** Karcsit a padlóra (F). Karcsi magától futkos a lakásban: bútorok alá bújik (ágy, kanapé, szekrény), szaglászik, visít („UÍ-UÍ!”), és a répa felé szalad, ha Petyus leteszi.
3. **Ha Karcsi a konyhába, Angi lábához ér:** Angi felsikít („ÁÁÁÁÁ! EGY PATKÁNY!!” – Petyus: „Anya, ez Karcsi!”), **felugrik egy székre**, és onnan nem jön le, amíg Karcsi a konyhában van. Közben a reggeli odaég a tűzhelyen (füst; apa: „Ég a rántotta!”).
4. **Apa** feláll, és **négykézláb kergeti** Karcsit a lakásban („Gyere ide, te kis… szőrgombóc!”): mulatságos négykézláb járás, az asztal alatt beüti a fejét („Au!”). Karcsi mindig a legközelebbi búvóhelyre menekül.
5. **Vége:** apa (vagy Petyus) elkapja Karcsit, és visszateszi a kalitkába; Angi: „Petyus! Délután nincs Xbox!” → **késés** (+10 perc).

**Csillagok:**
- ★ Karcsi szabadon a lakásban;
- ★★ Angi a székre ugrik;
- ★★★ és Karcsi legalább 60 mp-ig szabad marad, mielőtt apa elkapja (minél jobb búvóhelyre fut, annál tovább tart).

**Technika:** Karcsi kiléphet a kalitkából (a `karcsi.js` mozgása a padlón is: célpontok – búvóhelyek, répa, az emberek elkerülése, vagy épp Angi lába); Karcsi és a répa felvehető tárgy a leltárban; Angi „széken állás” póza (a szék tetején, karok a feje fölött); apa négykézláb járása (comb és kar is előre, a test vízszintesen).

#### 3. „Hol a kulcs, Angi?” (`r2-kulcs`)

**Alaphelyzet:** Angi kulcscsomója az előszobában a cipősszekrény tetején van (a modellen most is van ott egy kulcs – felvehető tárgy lesz 🔑). Angi reggel többször kérdezi: „Petya, nem láttad a kulcsomat?” (ez a sora már megvan) – innen az ötlet.

**Menet:**
1. Petyus felveszi a kulcsot (E), és **elrejti** valahol (F): hűtő, mikró, a mosógép dobja, kád, Karcsi kalitkája, a kanapé párnája alá, a fotelbe, a cipősszekrénybe, az íróasztal fiókjába, a WC-tartályra…
2. Amikor közeledik az indulás (vagy Angi a kulcsért megy), **Angi keresni kezd**: sorra járja a „logikus” helyeket (cipősszekrény → kabátzseb a fogason → táska → konyhapult → asztal → kanapé → …), mindegyiknél kicsit kotorászik (fiókot nyit, párnákat emelget), és egyre idegesebb („Itt volt! Itt volt a kezemben!”, „Petya, te tetted el?!”, „Ez a ház megeszi a kulcsaimat!”).
3. **A rejtekhelytől függ, meddig keres:** a szokásos helyeken hamar megtalálja; a fura helyeken (hűtő, mosógép, Karcsi kalitkája, mikró) csak a sor végén. A legvégén: „A kulcsom… a HŰTŐBEN?! … PETYA!!” – és **apát hibáztatja** („Megint te pakoltad el a bevásárlással együtt!”), apa értetlenül tiltakozik. Petyus közben fütyörészik.
4. Petyus **segíthet** is: Angi mellett E-vel tippet adhat („Anya, nem a hűtőben van?”) – Angi azonnal odamegy, de a ★★★ elvész (gyanús lesz: „Honnan tudtad?…”).
5. **Vége:** megvan a kulcs → **késés** (a keresés ideje szerint +5…+20 perc).

**Csillagok:**
- ★ Angi keresni kezdi a kulcsot (el van rejtve);
- ★★ 2 percnél tovább keres;
- ★★★ a kulcs fura helyen volt (hűtő, mikró, mosógép, Karcsi kalitkája), és Angi végül apát hibáztatja (Petyus nem árulta el magát).

**Technika:** a kulcs új leltártárgy (minden lerakóhely elfogadja, plusz új rejtekhelyek: kanapé, fotel, fiók, mosógép); Angi keresési útvonala és „kotorászás” mozdulatai (lehajolás, fiók- és szekrényajtó nyitása – az ajtók már nyithatók); a keresés ideje rejtekhelyenként.

### A reggel vége, a késés
- Az indulást továbbra is a játékos dönti el (a bejárati ajtónál – ha már nem pizsamában van; az átöltözés még hátravan).
- A csibészségek késése összeadódik; 7:30 után indulva „Elkéstünk!” átvezető, az iskolában következménnyel (később).
- Egy reggelen mindhárom elvégezhető, de nem kötelező egyszerre: a naptár napjain bármikor, és – mint az 1. részben – a legjobb eredmény számít.

## Technikai terv (váz)

1. **Részek szétválasztása:** ma a játék egyetlen pályára (a parkra) épül. Kell egy rész/helyszín-betöltő: a közös motor (rigek, `Actor`, buborékok, input, minőség, kamera, csibészség-rendszer) marad, a világ (`world.js` park) és a rész-specifikus tevékenységek részenként külön modulba kerülnek (pl. `src/ep1/…` és `src/ep2/…`), és a kezdőképernyőről indított rész tölti be a sajátját.
2. **Csibészség-rendszer részenként:** `MISCHIEFS` és a mentési kulcs részenként; az összesítés (⭐) részenként és összesen.
3. **Megnyitás + fejlesztői elérés** (fent).
4. **Naptár és napszakok:** állapot (`nap`, `napszak`, játékóra), mentés `localStorage`-ba, HUD-elem, átvezetők a váltáshoz.
5. **Otthon – reggel:** a lakás voxelből az alaprajz alapján (falak, ajtók, ablakok, padló, bútorok), babaház-nézet, reggeli fények, Petyus/Petya/Angi elhelyezése, mozgás, ütközés. **← ez az első fejlesztési lépés.**
6. Iskola, délutáni otthon, csibészségek – később.

## Első lépés – kész

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
- **Kapcsolható és nyitható eszközök** (`src/ep2/appliances.js`, E; a mikrónál Szóköz is): nyitható kétajtós hűtő (polcok, ételek, ajtópolcok, lámpa) · részletes mikró (nyitható ajtó ablakkal, forgótányér, kijelző, gombok; Szóköz: tányér, majd pohár berakása / kivétele, csukva indítás 10 mp-re, a végén DING) · vízforraló (kék fény, gőz, magától kikapcsol) · tűzhely (izzó főzőlapok, gőz a lábasból; reggel be van kapcsolva, anya főz) · mosogatócsap, kádcsap (vízsugár), zuhany (csepegő víz) · mosógép (forgó dob) · a szülők tévéje (mese) · Petyus részletes számítógépe (monitor webkamerával, billentyűzet narancs WASD-vel és világítással, egér, hangfalak, gépház világító ventilátorokkal; képernyőn: indulás → asztal → ugrálós játék).
- **Reggeli és hűtő** (`src/ep2/food.js`): az asztalon részletes tányérok (peremcsíkkal), bögrék teával, poharak (tej, narancslé), evőeszközök, müzli tejjel (zabpehely, mazsola, dió darabok, kanál), szeletelt kenyér a vágódeszkán késsel, szalámiszeletek, gyümölcstál (alma, narancs, banán, szőlő), tejesdoboz, müzlisdoboz, teáskanna, vaj, méz, szalvéta. A hűtőben: a jobb ajtó alsó rekeszében tej, **tejszín** (TEJSZÍN feliratú doboz) és **tejszínhab** (TEJSZÍNHAB spray piros kupakkal) – az ajtóval együtt nyílnak; a polcokon sajt, egész szalámi szeletekkel, kóla, narancsos üdítő, doboz üdítő, gyümölcs a zöldségfiókban.
- **Árnyékok:** a 2. részben a nap nem vet árnyékot; a felkapcsolt mennyezeti lámpák (lefelé világító spotlámpák, egyszerre legfeljebb 2 – a Petyushoz legközelebbiek) vetnek árnyékot, felülnézetben és belső nézetben is.
- **A szülők tévéje előtt:** fotel, amibe **E**-vel le lehet ülni (bármelyik mozgásgomb feláll; belső nézetben ülőmagasságból látni). A TV-szekrényen egy részletes **Xbox Series X** (állva, zöldes szellőzőnyílások felül, világító gomb, lemezrés, USB) és egy **kontroller** (két markolat, két kar, D-pad, színes A/B/X/Y, Xbox-gomb, vállgombok, ravaszok); az Xboxot külön, **E**-vel lehet bekapcsolni (indulóhang, világító gomb); ha a tévé is megy, rajta az Xbox indulása, kezdőképernyő, majd focijáték látszik. A franciaágy mellett jobbra, az erkélyajtó felé könyvespolc (színes könyvek, növény, fénykép, dobozok, földgömb).
- **Tárgyak, leltár** (`src/ep2/inventory.js`): felvehető (E) a kontroller, a WC-papír (a WC-tartályon), a bögre (a pulton a mikró mellett), a tej, a tejszín és a tejszínhab (a hűtő jobb ajtajában – csak nyitott hűtőből); a nálad lévők a felső sávban (1–6 / Tab / kattintás: választás). **F** (telefonon a gomb): a kiválasztott lerakása a közeli helyre – kontroller és WC-papír: TV-állvány, íróasztal, hűtő, mikró, kád széle (a papír a WC-tartályra is); bögre: mikró, hűtő, étkezőasztal, TV-állvány, íróasztal, konyhapult; tej, tejszín, tejszínhab: hűtő (a saját rekeszükbe), étkezőasztal, konyhapult (hűtő és mikró csak nyitva). A bögrébe: tea (a teáskannánál), kávé (a kávéfőzőnél – apa szól), tej, tejszín, tejszínhab (a nálad lévő vagy közeli dobozból); a színe ettől változik, a tejszínhabtól habkorona lesz rajta; a mosogatónál kiönthető. Az Xbox bekapcsolása a tévét is bekapcsolja; ha megy az Xbox és Petyus a fotelben ül, a kontroller a kezében van.
- **Célzás belső nézetben:** a képernyő közepén kis pont; minden interakció (ajtó, kapcsoló, eszköz, tárgy felvétele, lerakóhely, bögretöltés) csak akkor elérhető, ha a pont az adott tárgyra mutat (legfeljebb ~1,9 m-ről; a nagy tárgyakat – ajtó, hűtő, tévé – bárhol, a kicsiket – kapcsoló, bögre – pontosan kell megcélozni). Felülnézetben továbbra is a közelség számít.
- **Karcsi, a tengerimalac** (`src/ep2/karcsi.js`): Petyus szobájában az északi ablak előtti asztalon nagy kalitka (kék tálca, alom, rácsok) kis faházzal, etető- és itatótállal, répával; a kalitka ajtaja E-vel nyílik. Karcsi vöröses, fehér foltokkal. Félénk: ha valaki 1,5 m-nél közelebb jön, a házába bújik, és kikukucskál az ajtón; ha senki sincs a közelben, körbe-körbe mászkál, és minden második körben megáll a répánál enni. Ha anya a hűtőhöz megy, Karcsi visít („UÍ-UÍ-UÍ!”).
- **Még nincs:** átöltözés, iskolatáska/cipő és indulás az iskolába, a napok léptetése, „Új rész nyílt meg!” jelzés, telefonos gombok finomhangolása, a csibészségek.

## Első lépés (eredeti leírás)

A 2. rész **otthon, reggeli időszakkal** induljon: a fejlesztői eléréssel (`?resz=2`) betölthető lakás az alaprajz szerint, berendezve, reggeli fényekkel, a három szereplővel; Petyus irányítható, a falak és bútorok ütköznek. A megnyitási feltétel (15 ⭐) és a kezdőképernyő-csempe ugyanebben a körben.

## Döntések (a kérdésekre adott válaszok)

1. **Utolsó nap:** 2026. szeptember 30. (szerda).
2. **Hétvégék:** benne vannak; szombaton–vasárnap csak otthon reggel és otthon délután, a köztes program helyett átvezető képernyő.
3. **Szobák:** a 20 m²-es a testvéré (egyelőre zárva), a 26 m²-es a szülőké.
4. **Indulás:** a játékos dönti el, mikor indul.
5. **Ruhák:** reggel pizsama mindhármuknak; később átöltözés iskolai (Petyus) és munkaruhába (Petya, Angi).

## Javítandók (felvéve: 2026. 11. 23.)

- [ ] **Interakció-feliratok:** az egyes interakciók feliratai itt is pontosak legyenek – a súgósor (`#prompt`) és a telefonos gombok (HASZNÁL / RÚGÁS helyén az aktuális művelet) is (`ep2.js` `interactHome`).
- [ ] **Hűtő:** a tej, a tejszín és a tejszínhab a második polcon legyen (most a jobb ajtó alsó rekeszében vannak – `appliances.js` hűtő, `inventory.js` `places.fridge` helyei).
- [ ] **Tejszínes kávé – WC-ajtó:** Petya a WC-re rohanva becsukja maga mögött az ajtót; ha végzett, kinyitja, kijön, és visszacsukja (`coffee.js`: `rush` → `wc` → `back`). (A szagfelhő ilyenkor az ajtó résein / nyitáskor gomolyog ki.)
- [ ] **Bögre átadása apának:** könnyebb legyen – elég Petyára nézni (belső nézetben) vagy mellette állni, és úgy odaadni neki („bögre Petyának”), ne kelljen az asztalon a pontos helyet eltalálni (`inventory.js` `places.dad` / `invAction`).
- [ ] **TV:** focimeccs menjen rajta: Real Madrid – Barcelona (pálya, két mez szín: fehér / gránátvörös-kék, eredményjelző – `appliances.js` TV-kép).
