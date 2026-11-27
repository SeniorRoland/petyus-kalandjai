# 2. rész (Szeptember – Otthon és iskola): terv

Helyszínek, napok és csibészségek. Mindegyiknél: mi a játék, mi a poén, mire épül a kódban.
**Állapot:** ✅ a megnyitás, a 2. rész saját csibészség-rendszere (napló-fül) és az otthoni reggel kész: a filmes nyitány (ébresztés), a lakás, a ház és környéke, az eszközök, a leltár, Karcsi, a nővér, a hangok és mind a 3 reggeli csibészség. ✅ A napok köre is kész: indulás (7:30 vagy mindhárom reggeli csibészség után) → iskola (helyszín, csibészségek nélkül) → otthon délután–este (sötét, lámpák) → lefekvés → másnap reggel; hétvége és hónap vége átvezetővel. ✅ Az este 3 csibészsége is kész. ✅ Az iskola 4 csibészsége is kész – mind a 10 csibészség megvan. ⬜ Hátravan még: tesztelés telefonon.

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
| 4 | Előre a mutatót! | iskola, 6. b (óra) | a tanító néni korábban kienged | ≥ 10 perccel korábban | és nem látta, ki volt | „A tanító néni mindig a falióráról olvassa le, mikor van vége az órának.” | **kész** |
| 5 | Vizes szivacs a széken | iskola, 6. b (szünet → óra) | a tanító néni beleül | a táblatörlő szivacs csuromvizes volt (a WC-ben áztatva) | és az osztály nevet, de senki nem árulja el | „A táblatörlő szivacs a tábla alatt van. A WC-ben van csap…” | **kész** |
| 6 | Béka a fiókban | iskola, udvar → 6. a | a tanár bácsi kinyitja a fiókot | felugrik az asztalra | és a béka kiugrik a folyosóra (a 6. b-sek is látják) | „Az udvari bokrok alatt béka lakik. A tanár bácsi fiókjában meg a napló…” | **kész** |
| 7 | Hol a szemüvegem? | iskola, 6. b | a tanító néni keresni kezdi | vakon ír a táblára (krix-krax), rossz nevet szólít | és végül a tanár bácsit gyanúsítja | „A tanító néni szemüvege szünetben a tanári asztalon pihen.” | **kész** |
| 8 | A fogkrémcsere | otthon, este (fürdő) | anya a sarokkrémmel **vagy** apa a chilikrémmel mos fogat | ugyanazon az estén mindketten | és Petyust senki nem kapta rajta | „A fürdőben minden tubus egyforma… majdnem.” | **kész** |
| 9 | Meccs vagy sorozat? | otthon, este (nappali) | átkapcsolsz a meccs alatt | a tizenegyesnél | és apa anyát hibáztatja | „Este apa meccset néz, anya a sorozatát várja.” | **kész** |
| 10 | A lepedős kísértet | otthon, este (előtér) | apa megijed | sötétben: „MEGADOM MAGAM!” | és mire felkapcsolják a villanyt, Petyus már az ágyánál van, a lepedő az ágyon | „Este, sötétben minden lepedő gyanús.” | **kész** |

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

## 4–7. Iskolai csibészségek  ✅ kész

Mindegyik az iskola meglévő rendszereire épül: órarend és csengő (`schoolStatus`, `lesson()`), a 6. b és a 6. a terme a tanárral és a gyerekekkel, a szünet (a gyerekek kimennek, az udvaron fociznak / ugróiskoláznak – `crowdTick`), a tábla (`boardText`), a falióra (`makeClock`), a WC-k (csap, mosdó), a leltár (felvehető tárgyak, lerakóhelyek). A tanító néni szemüveges (`glasses: true`). Az iskolában nincs késés-pont; a csillagok a naplóba kerülnek, mint otthon.

---

## 4. Előre a mutatót!  ✅ kész

- **Megvalósítás** (`src/ep2/school.js`: `ck`, `clockPush`, `clockTick`; a szünet: `crowdTick(dt, brk, early)`): a tanító néni óra közben időnként (9–15 mp-enként, 6–9 mp-re) a táblához fordul írni – háttal áll, a krétás kéz fent, csikorgás. A falióra a terem **hátsó falán** van (a könyvespolcok és a szekrények között – a tanító néni szemben látja, a gyerekek háta mögött; a 6. a-ban is). Alá a hátsó fal melletti **pótszéket kell odahúzni** (E), **E – felállás a székre** (Petyus 46 cm-rel magasabban áll, nem jár), a széken **E – a mutató előre (+5 perc)**, bármelyik mozgásgomb – leszállás, a szék mellett **Szóköz – a szék vissza a helyére**. Ha a tanító néni az osztály felé néz, amikor húzod / tekered, rászól (rajtakapás: az óra visszaáll, a szék vissza); ha a szék a falióra alatt marad, észreveszi („Ki húzta oda azt a széket?”), és a helyére teteti; szünetben is visszakerül. (A tanári asztal széke is megvan – egy elírás miatt eddig hiányzott.) A tanító néni 3–4 mp-enként az órára néz; ha az óra szerint vége, kiengedi a 6. b-t (csak őket – a 6. a órán marad), 10 percen belül időnként mondja is: „Még 8 perc, gyerekek!”. A valódi csengőnél kiderül: a tanár bácsi: „Már szünet van? A 6. b már kint focizik?!”, a tanító néni: „Valaki elállította a faliórát!” – a szünetben visszaállítja. Mentés: `r2-ora` (érték: hány perccel korábban). A falióra eddig is a játékidőt mutatta, most a 6. b-é eltolható.

- **Alaphelyzet:** a 6. b falióráját (a hátsó falon – szemben vele) a tanító néni nézi, mikor van vége az órának („Még tíz perc, gyerekek!”). Ő nem a csengőre, hanem az órára hallgat.
- **Menet:**
  1. Petyus óra közben feláll a helyéről (a tanító néni szól: „Petyus, ülj vissza!” – ha épp nem a táblánál ír).
  2. Amikor a tanító néni **háttal áll** (a táblára ír – krétacsikorgás), Petyus a falióra alá áll, **E – széket alá, mutató előre** (felugrik egy székre, és 5 percet előre teker; többször is lehet).
  3. A tanító néni a következő pillantásnál az órára néz: ha az óra szerint vége, **kienged**: „Na, gyerekek, ennyi volt mára… Szünet!” – a 6. b kitódul az udvarra, a folyosón csend (a 6. a még órán van).
  4. Pár perc múlva a valódi csengő: a tanár bácsi a 6. a-ból értetlenül kinéz („Már szünet van? A 6. b már kint focizik?!”), a tanító néni az órájára (karóra) néz: „…Valaki elállította a faliórát!”
- **Rajtakapás:** ha a tanító néni nem háttal áll, amikor Petyus a falióránál van (vagy a széken áll) → „Petyus! Szállj le onnan!” – az óra visszaáll, a ★★★ elvész.
- **Poén:** a 6. b már a pályán focizik, amikor a 6. a még írja a dolgozatot; a tanár bácsi az ablakból néz ki.
- **Mire épül:** a falióra (`makeClock` – eddig a játékidőt mutatja; kap egy eltolást), a tanító néni táblaírása (`school.chalkT`), a szünet indítása (`crowdTick` – most csak a 6. b-re), a csengő (`sBellRing`), `say`.
- **Csillagok:** ★ a tanító néni korábban kienged · ★★ legalább 10 perccel korábban · ★★★ és nem látta, ki volt.

---

## 5. Vizes szivacs a széken  ✅ kész

- **Megvalósítás** (`src/ep2/school.js`: `sponge`, `spongeUse`, `spongeTick`, `teacherBreak`, `spongeHit`): a 6. b táblatörlő szivacsa külön tárgy a krétatartón. **E – a táblatörlő szivacs elvétele** (Petyus kezében), egy WC-mosdónál **E – a szivacs beáztatása a csap alatt** (sötétebb, megdagad, csöpög), a tanári széknél **E – a szivacs a tanári székre** (vagy vissza a táblához). A tanító néni szünetben kimegy a folyosóra (a terem ajtaja mellé); ha ott meglátja Petyust a szivaccsal: „Petyus, mit csinálsz azzal a szivaccsal?” (★★★ elvész). Becsengetéskor visszamegy, és leül a székére („Na, nézzük a naplót…”): vizes szivacs → „HŰŰŰŰ!!”, felpattan, fröccsenő víz, az osztály nevet („HAHAHA!”), „Ki volt ez?!” – ha látta Petyust: „Láttalak a folyosón azzal a szivaccsal!”, különben „Nem tudjuk, tanító néni!”; száraz szivacs → „Hát ez meg hogy került ide?”. A szivacs utána visszakerül, megszárad. Mentés: `r2-szivacs`.

- **Alaphelyzet:** a tábla alatt a krétatartón a táblatörlő szivacs (a modellen már ott van). A tanító néni óra elején leül a tanári asztal mögé (a székére).
- **Menet:**
  1. Szünetben (az osztály kint van) Petyus felveszi a szivacsot (E), a fiú WC mosdójánál **F – szivacs beáztatása** (a csap folyik, a szivacs sötétebb lesz, csöpög – vízcseppek, tócsa a nyomában).
  2. Visszaviszi, és a tanári székre teszi (F – „a tanári székre”).
  3. Becsengetnek: a gyerekek leülnek, a tanító néni bejön, és **leül a székére** → „HŰŰŰ!!” – felpattan, a szoknyája hátul sötét foltos, az osztály hangosan nevet.
  4. A tanító néni: „Ki volt ez?!” – körbenéz; ha senki nem látta Petyust (szünetben a teremben csak ő volt), az osztály hallgat („Nem tudjuk, tanító néni!”); ha valaki látta (egy osztálytárs a folyosón / a teremben), rámutat: „Petyus volt!”
- **Csavar:** ha a szivacs száraz (nem áztatta be), a tanító néni csak felveszi: „Hát ez meg hogy került ide?” – nincs csillag.
- **Poén:** a tanító néni egész órán állva tanít, és időnként a szoknyáját szárítgatja a radiátornál.
- **Mire épül:** a leltár (új tárgy: a szivacs, „vizes” állapottal – mint a bögre töltése), a WC mosdója (új „csap” a WC-ben), a tanári szék (új lerakóhely), a tanító néni leülése óra elején (új rövid mozgás), `say`, nevetés-hang.
- **Csillagok:** ★ a tanító néni beleül · ★★ a szivacs csuromvizes volt · ★★★ és senki nem árulta el.

---

## 6. Béka a fiókban  ✅ kész

- **Megvalósítás** (`src/ep2/school.js`: `frog`, `frogTick`, `frogUse`, `frogOut`, `frogTeacher`; a tanárok szünete: `teacherBreak`): a tér melletti bokornál béka ugrál (néha brekeg, ha Petyus közel jön, elugorhat). **E – a béka elkapása** (kb. minden második próbálkozás sikerül), a kezében viszi; a 6. a tanári asztalánál **E – a béka a tanári asztal fiókjába**, máshol **E – a béka elengedése**. Szünetben mindkét tanár kint áll a folyosón a saját ajtaja mellett; ha a tanár bácsi a teremben van és látja: „Hát te mit keresel az asztalomnál?” – a béka elugrál (rajtakapás). Óra elején a tanár bácsi leül, kinyitja a fiókot: „BREKK!”, „ÁÁÁ!! Egy BÉKA!!”, felugrik az asztalra (karjai fent), a 6. a-sok sikítoznak / nevetnek; a béka leugrik, kiugrál az ajtón, végig a folyosón a 6. b ajtajáig – ha az nyitva van, a tanító néni: „Egy BÉKA?! Gyerekek, maradjatok a helyeteken!” –, aztán ki az udvarra, vissza a bokrához. A tanár bácsi lemászik: „Ki volt ez?!” Mentés: `r2-beka`.

- **Alaphelyzet:** az udvaron, a pálya melletti bokrok alatt egy béka ugrál (néha brekeg). A 6. a tanár bácsijának asztalán / fiókjában van a napló.
- **Menet:**
  1. Szünetben Petyus az udvaron a béka mellett **E – béka elkapása** (ugrál, ha közel megy, el is ugorhat; kétszer-háromszor kell próbálni) – a leltárba kerül 🐸.
  2. Visszamegy, és a **6. a** termében a tanári asztal fiókjába teszi (F – „a fiókba”; a fiók kinyílik, becsukódik).
  3. Becsengetnek: a tanár bácsi leül, és kinyitja a fiókot a naplóért → a béka kiugrik: „BREKK!” – a tanár bácsi felkiált, **felugrik az asztalára** (mint Angi a székre a Karcsi-szökésnél), a 6. a-sok sikítoznak / nevetnek.
  4. A béka kiugrál a terem ajtaján a folyosóra, végig a folyosón (ha a 6. b ajtaja nyitva van, ott is bekukkant – a tanító néni: „Egy BÉKA?!”), végül ki az udvarra.
- **Rajtakapás:** ha a tanár bácsi a teremben van, amikor Petyus a fiókhoz nyúl → „Hát te mit keresel az asztalomnál?” – a béka elugrik, ★★★ elvész.
- **Poén:** a tanár bácsi az asztal tetején áll, és a naplóval hadonászik; a béka nyugodtan ül a küszöbön.
- **Mire épül:** egy új kis állat (béka: ugrálás, menekülés – a Karcsi szabad mozgásához hasonló, `navgrid`), a leltár (🐸), a tanári asztal fiókja (új lerakóhely), a 6. a tanár bácsija (`ROOMS3[1].teacher`), Angi „székre ugrás” mozdulata a `runaway.js`-ből.
- **Csillagok:** ★ a tanár bácsi kinyitja a fiókot · ★★ felugrik az asztalra · ★★★ és a béka kiugrál a folyosóra (a 6. b-sek is látják).

---

## 7. Hol a szemüvegem?  ✅ kész

- **Megvalósítás** (`src/ep2/school.js`: `gl`, `glassesUse`, `glassesOn`, `glassesSearch`, `glassesBack`): a tanító néni szemüvege külön kis tárgy az arcán. Szünetben leveszi („Hű, de fáradt a szemem…”), és az asztalán hagyja. **E – a tanító néni szemüvegének elvétele**, bárhol **E – a szemüveg letétele ide (elrejtés)** (újra felvehető). Óra elején leül, és ha nincs ott: keresés – az asztal („Itt hagytam…”) → **vakon a táblához** (a tábla szövege összekuszálódik), „Botond, gyere ki a táblához!” (egy osztálytárs: „Botond a 6. a-ba jár!”), Petyust kislánynak szólítja → a polc → végül átmegy a 6. a-hoz: „Kolléga! Biztos maga tette el!” – „Én? Ugyan, kolléganő!” –, és előveszi a tartalék szemüvegét. Ha a keresés közben a szemüveg közelébe ér, megtalálja („Na végre!”); Petyus vissza is adhatja (**E – „Tanító néni, itt a szemüvege!”** – „Ezért jár egy piros pont!”, de a ★★★ elvész). Mentés: `r2-szemuveg` (érték: meddig jutott a keresés).

- **Alaphelyzet:** a tanító néni szünetben leveszi a szemüvegét, és a tanári asztalra teszi (dörzsöli a szemét: „Fáradt vagyok…”), óra elején visszaveszi.
- **Menet:**
  1. Szünetben Petyus felveszi a szemüveget (E) 👓, és elrejti valahol (F): a padok közt, a könyvespolcon, a 6. a-ban, a WC-ben, a kabátok közt a folyosón.
  2. Becsengetnek: a tanító néni keresi („Hol a szemüvegem?”) – az asztalán, a fiókban, a polcon; **vakon tanít**: a táblára krix-kraxot ír (a tábla szövege elcsúszik, betűk összevissza), rossz nevet szólít („Botond, gyere a táblához!” – Botond a 6. a-ba jár), Petyust „Kislány”-nak szólítja.
  3. Ha nem találja meg (a szemüveg messze van: a 6. a-ban / a WC-ben), átmegy a tanár bácsihoz: „Kolléga, nem látta a szemüvegemet? Biztos maga tette el!” – a tanár bácsi értetlen.
  4. Petyus **E-vel visszaadhatja** („Tanító néni, itt van!”) – „Köszönöm, Petyus, ezért jár egy piros pont!” (★★★ elvész, de jár egy kis meglepetés).
- **Poén:** a tábla szövege: „Törtek: ½ + ¼ = ¾” helyett „Trök: ½ + ¼ = 8 ?”; a tanító néni a radiátornak magyaráz.
- **Mire épül:** a tanító néni szemüvege (a modell `glasses` része külön tárgyként: felvehető 👓, a modellről eltűnik), a tábla szövege (`boardText` – egy „vak” változat), a 6. a tanár bácsija, a kulcskeresés menete (`keyhunt.js` – logikus helyek → furcsák), a leltár.
- **Csillagok:** ★ a tanító néni keresni kezdi · ★★ vakon ír a táblára és rossz nevet szólít · ★★★ és végül a tanár bácsit gyanúsítja (Petyus nem adta vissza).

## 8–10. Esti csibészségek  ✅ kész

Az otthoni délután–este helyszínen (16:00–22:00). Mindhárom az esti **napirendre** épül: vacsora után apa meccset néz (20:00), anya a sorozatát várja (20:30); fogmosás (anya 20:45, apa 21:30); apa kiviszi a szemetet (21:00); lefekvés. Az **esti ütemező** a játékórán (`ep2.min`, `ep2.js` `updateParents`): apa egyszerre egy dolgot csinál (`dadFree`: meccs 20:00–20:42, szemét 21:00, fogmosás 21:30).

---

## 8. A fogkrémcsere  ✅ kész

- **Megvalósítás** (`src/ep2/toothpaste.js`, a tárgyak modelljei: `food.js`, a leltár: `inventory.js`): `buildBath()` a mosdó két oldalára teszi Angi nyitható faliszekrényét (E – nyit / csuk; bent üvegek, tégelyek, parfüm, a felvehető sarokkrém és arcmaszk) és a polcot (négy pohár fogkefével, mellettük a fogkrém – a `paste` lerakóhely). A chilikrém a hűtő felső polcán van. Esti ütemező (`toothTick`): 20:45-kor anya, 21:30-kor apa megy fogat mosni (útkeresés, ajtót nyit, villanyt kapcsol), és azt használja, ami a fogkrém helyén van: anya + sarokkrém → öklendezve kirohan, kör a konyhában, kétszer iszik a csapból, „SAROKKRÉMEM!”, apát gyanúsítja; apa + chilikrém → vörösödő fej (az arc vertex-színei), gőz a füléből, rohan a csaphoz, káromkodik, anya rászól; arcmaszk → Petyust megkeresi és leszidja; anya + chili → visszaviszi a hűtőbe; apa + sarokkrém → „lábszagú…”; nincs semmi a helyén → „Hol a fogkrém?!”. Rajtakapás: ha a szülő látja Petyust a polcnál / a szekrénynél. Mentés: `r2-fogkrem` (`MISCHIEFS2`), érték: a becsapottak száma. Állapot: `tp`.

- **Új tárgyak a fürdőben** (a mosdó fölött, a falon):
  - **A mosdó egyik oldalán Angi kozmetikai szekrénye:** kis, nyitható faliszekrény (E – ajtó nyit / csuk), bent polcokon Angi dolgai: krémes tégelyek, tubusok, flakonok, parfüm, vattakorong. Ezek közül **két krém felvehető:**
    - **Sarokkrém** – fehér tubus kék kupakkal, **pont olyan, mint a fogkrém**, csak más a felirata (a leltárban: „Sarokkrém – olyan, mint a fogkrém”).
    - **Éjszakai arcmaszk** – rózsaszín tégely arany tetővel, **teljesen más**, mint a fogkrém.
  - **A mosdó másik oldalán polc:** négy fogmosópohár, mindegyikben egy fogkefe (apa kék, anya rózsaszín, Petyus zöld, a nővér lila), mellettük **a fogkrém** (fehér tubus kék kupakkal).
  - **A hűtőben:** **csípős chilikrém** tubusban (piros tubus, zöld kupak, chilipaprika a címkén) – felvehető, mint a tej vagy a répa.
- **Menet:**
  1. Petyus a polcról felveszi a fogkrémet (E), és a helyére tesz egy másik tubust (F – új lerakóhely: „a fogkrém helyére”). A fogkrémet magánál tarthatja, vagy elrejtheti bárhol.
  2. **20:45 – anya fogat mos.** Bemegy a fürdőbe, felkapcsolja a villanyt, és azt használja, ami a fogkrém helyén van:
     - **Sarokkrém** → nem veszi észre: dúdolva mos fogat… megáll… „Hmm… ez valahogy… ŐŐKH!” – **öklendezve kirohan**, körbe-körbe szaladgál a konyhában, majd **a mosogatónál a csapból iszik** (a csap kinyílik, folyik a víz), köpköd, újra iszik, megint rohangál („Ez nem fogkrém!! Ez a SAROKKRÉMEM!!”). Végül: „PETYA!! Te tetted ide?!” – apa értetlenkedik.
     - **Arcmaszk** → rögtön észreveszi: „Mit keres az arcmaszkom a fogkrém helyén?!” → megkeresi Petyust, és **jól leszidja** („Petyus! A kozmetikumaimhoz nem nyúlunk! Hányszor mondjam?!”), a tégelyt visszateszi a szekrénybe, a fogkrémet visszaveszi. **Nincs csillag.**
     - **Chilikrém** → a piros tubust is észreveszi („Ez meg mi? Chili?! Petya, ez a tiéd?”), visszaviszi a hűtőbe – nincs csillag, de szidás sincs (apát gyanúsítja).
  3. **21:30 – apa fogat mos.** Ugyanígy azt használja, ami a fogkrém helyén van:
     - **Chilikrém** → nagy, habos fogmosás („Brrr, de friss…”), aztán megáll, a feje **egyre vörösebb** (a fej színe pirosra vált, a füléből gőz száll), **berohan a konyhába**, a csapból iszik, és közben **káromkodva szidja Petyust** (`#@&%!`, mint a macskánál az 1. részben): „PETYUUUS!! #@&%! Hol vagy?! ÉG A SZÁM!!”
     - **Sarokkrém** → csak furcsállja („Ez valahogy… lábszagú.”) – nincs csillag.
     - **Arcmaszk** → mint anyánál: észreveszi, és leszidja Petyust.
  4. Ha a fogkrém a helyén van, egyszerűen fogat mosnak (dúdolás, csobogás).
  5. A trükk **egy estén kétszer is** sikerülhet: a sarokkrémet anya előtt (20:45-ig), a chilikrémet anya után, apa előtt (20:45 és 21:30 között) kell a fogkrém helyére tenni.
- **Rajtakapás:** ha apa vagy anya a fürdőben látja Petyust a polcnál vagy a szekrénynél (≤ 2 m, felé néz), rászól („Mit keresel ott, Petyus?”) – a ★★★ elvész.
- **Poén:** anya öklendezve rohangál a konyhában; apa vörös fejjel, gőzölgő fülekkel iszik a csapból, és cifrán káromkodik; anya a sarokkrémnél apát gyanúsítja.
- **Mire épül:** a leltár (`inventory.js`: felvehető tárgyak, lerakóhelyek, `invHooks`) – új tárgyak: fogkrém, sarokkrém, arcmaszk, chilikrém; új lerakóhelyek: a fogkrém helye a polcon és Angi szekrénye; nyitható szekrényajtó (`appliances.js` `devices`); a konyhai csap (víz); útkeresés (`navgrid.js`); a kávés csibészség rohanása és szövegei; `say` kiabálás. Este nincs késés (`addLate` nem kell).
- **Csillagok:**
  - ★ anya a sarokkrémmel **vagy** apa a chilikrémmel mos fogat;
  - ★★ ugyanazon az estén **mindketten**;
  - ★★★ és Petyust senki nem kapta rajta (nem látták a polcnál, és nem szidták le az arcmaszk miatt).

---

## 9. Meccs vagy sorozat?  ✅ kész

- **Megvalósítás** (`src/ep2/tvmatch.js`, a tévé: `appliances.js` – csatorna `match` / `series`, `setPenalty`; a távirányító: `inventory.js` `remote`, F-művelet: `invHooks.action`): 20:00-kor apa a fotelbe ül (ha Petyus ül ott, mögötte áll), bekapcsolja a meccset; anya szól a 8:30-as sorozatáért. A távirányító a tévészekrényen; Petyus kezében, a szobában F – átkapcsolás. Apa kétszer elmegy vízért (20:09, 20:29) – ha közben átkapcsolsz: „MI EZ?! Hol a meccs?!”, a távirányító Petyusnál → őt hibáztatja, különben anyát (★). Ha apa ott ül és átkapcsolsz: elveszi a távirányítót (nincs csillag). 20:19 tizenegyes (felirat a tévén, apa feláll, „Na… NA… NAAA…”): ha ekkor kapcsolsz át → „NEEEE!!”, térdre rogy, a szomszédból „GÓÓÓL!”, majd körülnéz: távirányító Petyusnál → „PETYUUUS!!” (★★), különben „ANGIII!!” (★★★). 20:42-kor vége, apa vissza az asztalhoz. Állapot: `tm`. Mentés: `r2-meccs`.

- **Alaphelyzet:** 20:00-kor apa a kanapén meccset néz (a tévé bekapcsol, zöld pálya a képernyőn, szurkolás). Anya a konyhában pakol, és 20:30-ra várja a sorozatát („Petya, fél kilenckor átkapcsolsz, ugye?” – „Persze, persze…”).
- **Menet:**
  1. A távirányító 📺 a dohányzóasztalon van (felvehető, mint a kulcs). Petyus felveszi.
  2. Amikor apa nem figyel (kimegy a konyhába egy pohár vízért, vagy a WC-re – az esti ütemező indítja), Petyus **Szóközzel átkapcsol** (a képernyőn rózsaszín sorozat, hegedűzene).
  3. Apa visszajön: „MI EZ?! Hol a meccs?!” – keresi a távirányítót (mint anya a kulcsot); ha Petyusnál van vagy el van rejtve, **anyát gyanúsítja** („Angi! Te kapcsoltál át?!”), anya pedig örül („Végre, kezdődik a sorozatom!”) – vita a kanapén.
  4. **A tizenegyes:** a meccs alatt egyszer jön egy tizenegyes (felirat a képernyőn, apa feláll: „Na… NA… NAAA…”) – ha Petyus pont ekkor kapcsol át, apa térdre rogy („NEEEEE!!”), a szomszédból pedig áthallatszik a „GÓÓÓL!”.
- **Poén:** apa a tizenegyes helyett a sorozat csókjelenetét látja; a szomszéd gólörömét a falon át hallja.
- **Mire épül:** a tévé (`devices`), a leltár (új tárgy: a távirányító), a kulcskeresés útvonala (`keyhunt.js` – apa ugyanígy keresi a távirányítót), szövegbuborékok.
- **Csillagok:** ★ átkapcsolsz a meccs alatt · ★★ a tizenegyesnél · ★★★ és apa anyát hibáztatja (a távirányítót nem találta Petyusnál).

---

## 10. A lepedős kísértet  ✅ kész

- **Megvalósítás** (`src/ep2/ghost.js`): Petyus ágyánál Szóköz – lepedő magára / vissza (fehér lepel szemlyukakkal, alatta a teste nem látszik, „Húúúú…”). 21:00-kor apa a szemeteszsákkal kimegy a bejárati ajtón, kb. 18 mp múlva visszajön, és az előszobán át az asztalhoz megy. Ha a lepedős Petyus mellette Szóközt nyom: „BÚÚÚ!!” – világos előszobában apa csak megriad és felismeri (★), sötétben (lekapcsolt villany) felteszi a kezét: „MEGADOM MAGAM!” (★★). Anya odaszalad, felkapcsolja a villanyt: ha Petyus addigra az ágyánál van, a lepedő az ágyon → apát szidja, hogy felébreszti a gyereket, a kísértetet senki nem hiszi el (★★★). Állapot: `gh`. Mentés: `r2-kiserteet`. (Eltérés a tervtől: a szemét 21:00-kor megy ki, hogy ne ütközzön apa fogmosásával; az alibi: az ágyánál áll, nem fekszik be.)

- **Alaphelyzet:** 21:00-kor apa kiviszi a szemetet (bejárati ajtó, lépcsőház), majd visszajön.
- **Menet:**
  1. Petyus a saját ágyáról leveszi a lepedőt (E az ágynál – „lepedő fel”): fehér lepel lesz rajta két szemlyukkal, lassabban jár, halkan „Húúúú…”-zik.
  2. Lekapcsolja az előszoba villanyát (a meglévő kapcsolók), és elbújik az előszobában (a cipősszekrény vagy a kabátok mellett).
  3. Amikor apa belép a sötét előszobába, Petyus **Szóközzel előugrik**: „BÚÚÚ!!” → apa hátratántorodik, felemeli a kezét: **„MEGADOM MAGAM! MEGADOM MAGAM!!”** (mint a filmes nyitányban), a szemeteszsák kiesik a kezéből.
  4. Anya kiszalad: „Mi történt?!” – felkapcsolja a villanyt. Ha Petyus addigra **visszafutott az ágyába** (lepedő vissza, lefekszik – `sleep.js`), anya apát szidja, hogy felébresztette a gyereket, apa pedig a „kísértetről” magyaráz – senki nem hiszi el.
- **Poén:** a nyitány „Megadom magam!”-ja visszatér; a végén apa gyanakodva nézi a lepedőt Petyus ágyán.
- **Mire épül:** villanykapcsolók (`switches`, `toggleSwitch`), ajtók (`toggleDoor`), az ágy és a takaró (`sleep.js`), apa ijedt póza a nyitányból (`wakeup.js`), új kellék: szemeteszsák, `say`.
- **Csillagok:** ★ apa megijed · ★★ sötétben ijed meg, és felkiált: „MEGADOM MAGAM!” · ★★★ és mire anya felkapcsolja a villanyt, Petyus az ágyában fekszik (alibi).

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
- **Az utcán és az udvaron** az 1. rész park-lámpái (kandeláberek: `LAMPS`) – este csak a lámpaházuk világít (fénykör és valódi fény nélkül); a ház bejáratánál nincs lámpa.
- Nincs pizsama; a nővér (mint reggel) az ágyában alszik és forgolódik; a reggeli csibészségek nem futnak; apa és anya esti mondatai („Megírtad a leckét?”, „Mindjárt kész a vacsora!”), 21:15 után anya lefekvésre küld. Petyus a bejárati ajtónál kezd (most ért haza).
- **E – lefekvés** Petyus ágyánál → másnap reggel.
- ✅ Az esti csibészségek: 8. A fogkrémcsere, 9. Meccs vagy sorozat?, 10. A lepedős kísértet. ⬜ Később: vacsora, fürdés.

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
- **Bent** a főépület földszintje járható: a folyosó (fogasok kabátokkal és táskákkal, vitrin, faliújságok, padok, a falon írók és költők arcképei) két terem (**Petyus osztálya, a 6. b**, és a 6. a), valamint a **fiú és a lány WC**.
  - **A terem berendezése:** a tábla a nyugati falon (ott nincs ablak; az alap kamera felől jól látszik), fölötte falióra (a játékidőt mutatja), mellette a tanári asztal; a tanulók nyugat felé néznek, az ablakok (észak) a jobb kezük felől; az ablakok alatt csak radiátor és alacsony növény (az ablak aljánál nem magasabb); a hátsó falon könyvespolcok és alacsony szekrények.
  - **A tábla:** 6. osztályos anyag (6. b: törtek, házi feladat; 6. a: Arany János: Toldi; 5. b: a térkép, méretarány).
  - **Képek** (`src/ep2/posters.js`, vászonra rajzolva): írók, költők stilizált arcképe névvel és évszámmal (Petőfi Sándor, Arany János, József Attila, Ady Endre, Móra Ferenc, Weöres Sándor, Kosztolányi Dezső, Jókai Mór), szorzótábla, Magyarország térképe (Budapest, Tököl), a 6. b órarendje.
  - **Petyus helye:** az első pad (a táblához legközelebbi sor) középső padjának ablak felőli széke – **E – leülés (a helyed)** / **E – felállás** (bármely mozgásgomb is felállítja); a tanító néni szól, ha nem ül a helyén.
  - **Ütközés:** a padokon, székeken, polcokon, radiátorokon, növényeken, padokon, fákon nem lehet átsétálni (a `put` `col: true` kapcsolója).
  - **Nézet, mint otthon:** **V** belső nézet (FPS, mennyezet neonlámpákkal), **Q / R** forgatás, **T** falak átlátszók / lesüllyednek (a falra akasztott tábla, kép, kabát a fallal együtt fakul / tűnik el), a zoom ugyanaz (kizoomolva a falak tömörek, az emeletek és a napelemes tető látszanak). Bent az emeletek eltűnnek, a déli kisebb épületből csak a lábazata marad.
  - **Ajtók** (E – nyit / csuk): a bejárat kétszárnyú üvegajtó, a termek fa ajtaján tábla az osztállyal (6. b, 6. a), a WC-k fehér ajtaján fiú / lány jelzés (kék fiú, piros lány alak, FIÚ / LÁNY). Befelé nyílnak, csukva ütköző; a fallal együtt fakulnak / tűnnek el.
  - **WC-k:** csempézett padló, a falakon csempe, fülkék (2 a fiúknál, 3 a lányoknál) vécével, mosdók tükörrel, a fiúknál piszoárok. A vécénél **E – ülőke fel / le**, **Szóköz – pisilés** (mint otthon: célzás A / D-vel, mellé is mehet – `pee.js` most már bármelyik vécével működik: `useToilet`), utána **Szóköz – lehúzás**. Ha mellé ment, a takarító néni kiabál a folyosóról. A lány WC-ben Réka a mosdónál: „KIFELÉ!! Ez a LÁNYVÉCÉ!!”
  - **Ablakok:** a földszinti ablakok üvege átlátszó (függöny nélkül, belül is kerettel) – az osztályokból és a folyosóról ki lehet látni az udvarra.
  - **Világítás:** minden teremben (6. b, 6. a, fiú és lány WC) mennyezeti lámpák, az ajtó melletti kapcsolóval (**E – villany fel / le**); az osztálytermekben alapból ég, a folyosón mindig. Bent a kinti fénynek (szinte) nincs hatása: amíg Petyus az épületben van, a napfény elhalványul, a termeket a saját lámpájuk és egy egyenletes, lágy fény világítja.
  - **Óra és szünet jelzése:** a HUD-on egy címke: „📚 2. óra · Magyar · még 23 perc” / „🔔 Szünet · még 6 perc · utána: Matek” / „🏠 Vége a tanításnak” (az órarend a 6. b-é, napok szerint – `TIMETABLE` a `posters.js`-ben, a falon lógó órarend is ebből készül); csengetéskor nagy felirat: „BECSENGETTEK! 3. ÓRA” / „SZÜNET!” / „VÉGE A TANÍTÁSNAK!”. 6 óra 8:00-tól (45 perc óra, 10 perc szünet); az iskolában lassabban telik az idő: egy óra (45 perc) kb. 2 perc, a szünet (10 perc) kb. 70 mp (`SCHOOL_RATE`, `SCHOOL_BREAK_RATE` az `ep2.js`-ben), hogy legyen idő a csibészségekre, kimenni és játszani; az utolsó óra után (napközi) a gyerekek kint játszanak.
  - **Szünet:** a csengőre Petyus osztálytársai felállnak a padból, a tanító néni kiküldi őket („Szünet! Irány az udvar!”), a terem ajtaján, a folyosón, a bejáraton át kimennek (az ajtók kinyílnak); a 6. a is kimegy a saját ajtaján – kint csak a két osztály gyerekei vannak: a fiúk (14, két csapat) a füves pályán fociznak (labda, passzok, kapura lövés, „GÓÓÓL!!”), a lányok (12) a téren ugróiskoláznak (a krétával rajzolt pályán sorban ugrálnak – egy lábon / két lábon –, a többiek nézik, biztatják); óra kezdetén mind visszamennek, és visszaülnek a helyükre.
  - **Hangok:** csengő minden óra elején és végén (45 perc óra, 10 perc szünet), gyerekzsivaj (órán halk, szünetben hangos; szünetben kiabálás az udvaron), a kréta csikorgása, ha a tanító néni ír.
- **Szereplők:** a 6. b-ben a tanító néni és 12 osztálytárs, a 6. a-ban a tanár bácsi és 14 gyerek – mindkét teremben folyik az óra (a 6. a-ban a tanár bácsi rászól Petyusra, hogy nem oda jár); a gyerekek a padban Petyus felé fordulnak, ha elmegy mellettük, és megszólítják.
- **Óra:** 8:00 → 15:30; **E – hazaindulás** a kapunál – csak 14:00-tól (előtte: „Hazamenni csak 14:00-tól lehet – még tanítás van!”).
- **Élet az iskola körül:** autók járnak a három utcán (Kossuth Lajos, Iskola, Aradi utca), mindkét irányban, jobb oldalon (`buildTraffic`, `trafficTick`); szünetben a többi osztály gyerekei is kijönnek – több focista és ugróiskolázó, a füves pályán fogócskázók és körben ülve beszélgetők (`buildExtras`, `extrasTick`); tanórák alatt a pályán tornaóra: 12 gyerek fut köröket, középen a sípoló tornatanár (`buildPE`, `peTick`).
- ✅ A 4 iskolai csibészség (Előre a mutatót!, Vizes szivacs a széken, Béka a fiókban, Hol a szemüvegem?). ⬜ Később: a tornaterem / ebédlő belseje, az emeletek.

## Fejlesztési lépések

1. ✅ **Részek szétválasztása** (kész: `src/ep2/…`, `startEp2` / `stepEp2`): egy rész/helyszín-betöltő – a közös motor (rigek, `Actor`, buborékok, input, minőség, kamera, csibészség-rendszer) marad, a világ (`world.js` park) és a rész-specifikus tevékenységek részenként külön modulba kerülnek (pl. `src/ep1/…` és `src/ep2/…`), és a kezdőképernyőről indított rész tölti be a sajátját.
2. ✅ **Csibészség-rendszer részenként:** `MISCHIEFS` és a mentési kulcs részenként; az összesítés (⭐) részenként és összesen.
3. ✅ **Megnyitás + fejlesztői elérés** (fent).
4. ✅ **Naptár és napszakok** (naptár, óra, HUD, a napszakok köre, átvezető kártya, hétvége, a hónap vége): állapot (`nap`, `napszak`, játékóra), mentés `localStorage`-ba, HUD-elem, átvezetők a váltáshoz.
5. ✅ **Otthon – reggel:** a lakás voxelből az alaprajz alapján (falak, ajtók, ablakok, padló, bútorok), babaház-nézet, reggeli fények, Petyus/Petya/Angi elhelyezése, mozgás, ütközés.
6. ◐ Iskola (✅ helyszín), délutáni otthon (✅ helyszín), csibészségek (✅ a reggeliek, ✅ az estiek, ⬜ az iskolaiak – terv kész).
7. ✅ **Esti csibészségek:** esti ütemező → 8. A fogkrémcsere → 9. Meccs vagy sorozat? → 10. A lepedős kísértet.
8. ✅ **Iskolai csibészségek:** 4. Előre a mutatót! → 5. Vizes szivacs a széken → 6. Béka a fiókban → 7. Hol a szemüvegem?

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
- [x] **Iskola belül:** FPS, forgatás, falak (T), zoom mint otthon; 6. osztály; Petyus helye (leülés); bútorokon nem lehet átmenni; a tábla nem az ablakok előtt, az ablakok előtt csak alacsony bútor; képek (szorzótábla, írók, költők); iskolai hangok; óra a tábla felett. ✅ `school.js`, `posters.js`.
- [x] **Iskolai ajtók és WC-k:** nyitható bejárati ajtó, a termeken ajtó az osztály számával, fiú és lány WC jelzéssel, használható vécék, pisilés. ✅ `school.js` (`makeDoor`, `buildToilets`), `pee.js` (`useToilet`).
- [x] **A WC ajtajába belelógott egy geometria** (a vécék falcsempe-sávja végigfutott az ajtónyílásokon). ✅ A csempesáv az ajtóknál megszakad.
- [x] **Szünet, ablakok, lámpák:** szünetben sok gyerek az udvaron (fiúk fociznak, lányok ugróiskoláznak), az udvarra néző ablakokon ki lehet látni, a termekben kapcsolható lámpa, bent nem hat a külső fény. ✅ `school.js`: `buildCrowd`/`crowdTick`, átlátszó üveg (`GLASS`), `buildLights`/`toggleLight`, `indoorLight`.
- [x] **Ablakok fordítva, nem lehetett kilátni:** a keret tömör lapként az üveg mögött volt, belül pedig egy második, átlátszatlan üveg. ✅ A keret négy léc, belül csak keret van (üveg nélkül).
- [x] **Villanykapcsolók az ajtó másik oldalán:** ✅ a kilincs felőli oldalon (a nyitott ajtó nem takarja).
- [x] **FPS nézetben ne tűnjön el a külső épület:** ✅ az emeletek és a déli épület belső nézetben is megmaradnak (az ablakon át látszanak).
- [x] **Az épület belsejébe néző ablakok:** a főépület déli falán, ahol a déli épület átjárója csatlakozik (földszint, 1. emelet). ✅ Ott nincs ablak.
- [x] **Az átlátszó ablakok külső pereme villogott** (az üveg széle a keretlécek oldalával, az alsó léc teteje a narancs lábazat tetejével egy síkban). ✅ Az üveg 1–1 cm-rel kisebb, a lábazat a keret alja alatt ér véget.
- [x] **Villany alapból, óra / szünet jelzése, a gyerekek szünetben kint:** ✅ az osztálytermekben ég a villany; HUD-címke az órával / szünettel és felirat csengetéskor; szünetben az osztálytársak is kimennek (fiúk foci, lányok ugróiskola), órára visszaülnek a helyükre.
- [x] **A tanórát mutató HUD belelógott a gombokba.** ✅ Az óra / szünet címke külön sorban; a HUD szélessége mindig a jobb felső gombok bal széléig tart (`fitHud`), a chipek új sorba törnek.
- [x] **Mennyezeti lámpák, 6. a, szünetben a termekből ki:** ✅ a mennyezeten csak a kapcsolható lámpák (rendezett rácsban; a folyosón az állandók); a 6. a-ban tanár bácsi és 14 gyerek; szünetben mindkét teremből kimennek, és csak ők játszanak kint. Közben javítva: a szüneti csapatok üresek maradtak (a diákok előtt készültek), és egy változó-ütközés miatt szünetben minden képkockán hiba lépett fel.
- [x] **A fény a lámpatestekből; a gyerekek ülnek; 14:00 után mindenki kint:** ✅ minden fényforrás egy mennyezeti lámpatest helyén (terem 2 × 2, WC 1, folyosó 3); órán a diákok mindig a saját székükön ülnek; a 6. óra után (13:20) ebédszünet, 14:00-tól délután: a gyerekek és a tanárok is kint vannak, csengetés nincs (HUD: „🍽️ Ebédszünet”, „🏠 Délután – mindenki kint az udvaron”).
- [x] **Otthon:** a társasház bejárata középen (nem vág bele ablakba); este is megvan Petyus szekrénye; az utcán járó autók első és hátsó lámpája este világít; a fürdő- és WC-ajtó induláskor csukva, este csak a konyhában ég a villany; beton parkoló csak a ház előtt, a blokkok között gyeprácsos parkoló. ✅ (képen még nincs ellenőrizve)
- [x] **Optimalizálás:** a megterített asztal, a roller és a hűtő fix részei egy-egy rajzolásba összevonva (`mergeStatic`), a kinti tárgyak nagyobb cellákban, az esti lámpák példányosítva, csak egy árnyékot vető spotfény; a kinti voxeltárgyak (autók, lámpák, fák, bokrok, a bougainvillea) összevont lapokkal (`toGeometryGreedy` a `voxels.js`-ben, `getGeometry(id, v, true)`: az autó 3152 helyett 299 lap, a lámpa 1342 helyett 176). Az esti otthon: 1112 → 677 rajzolás, ≈ 1,27 M → 1,06 M háromszög képkockánként. ✅
- [x] **Vibrálás a ház előtti parkolónál:** a garázsokhoz vezető murvás behajtó belelógott a nyugati útba (azonos magasságban), a kocsibejáró a betonlapokra, az esti fénytócsák pedig a lapok fugáival egy magasságban voltak. ✅ A behajtó az út széléig ér, a kocsibejáró a lapok és a járda közé esik, a fénytócsák (és az autók fénycsóvája) a burkolat fölött.
- [x] **Cipők az előszobában:** kidolgozottabbak, és ne az ajtó előtt legyenek. ✅ 2 cm-es voxelekből (talp, kerek orr, orrmerevítő, fűző, kéreg, bélés; a ruhacipőnek és a csizmának sarka van): Petyus piros sportcipője, apa fekete bőrcipője, anya fehér sportcipője és barna bokacsizmája – egy sorban a fürdőszoba fala mellett.
- [x] **Túl fehér plafon, szaggatás a világítás miatt.** ✅ A plafon (otthon és az iskolában) tompább szürke, este otthon sötétebb. A szaggatást az okozta, hogy a lámpák fényei ki-be rejtődtek: minden kapcsoláskor (és amikor a legközelebbi égő szoba változott) a fények száma megváltozott, és újrafordult minden shader. Most a fények mindig a jelenetben vannak, kikapcsolva 0 fényerővel; az árnyékot vető spotfény árnyéka csak használat közben frissül; este 4 (mobilon 2) kitöltő fény. Az iskolában 13 helyett 8 pontfény (egy tanterem négy paneljét két fény világítja, a folyosót kettő).
- [x] **Újra szaggat (este otthon).** ✅ A mindig jelen lévő (0 fényerős) fények is minden pixelnél számolnak: a kitöltő fények és a kinti valódi lámpafények megszűntek (lásd a következő pontot); a két szobalámpa árnyéka felváltva frissül (képkockánként egy); a fürdőszobai szekrény és polc fix részei összevonva, árnyék nélkül. Rajzolások este: 734 → 447. (A gyorsulást valódi FPS-sel nem tudtam mérni: a böngészőpanel rejtve volt.)
- [x] **Lámpa a ház bejáratánál; az utcai fények bevilágítanak a lakásba; a szobák fénye átvilágít a falakon.** ✅ A bejárat melletti két kandeláber megszűnt; kint nincs valódi fény – árnyék nélkül a falon át a lakásba világított –, és a lámpák alatti fénykör is megszűnt: csak maga a lámpafej világít. Bent nincsenek árnyék nélküli kitöltő fények; a két legközelebbi égő szoba spotfénye mindkettő árnyékot vet (felváltva frissítve), így a fény nem megy át a falon a szomszéd helyiségbe.
- [x] **A kinti lámpák feje nem fényes.** ✅ A világító test a lámpa üvegén belül volt (az átlátszatlan üveg-voxelek eltakarták); most egy kereszt alakú test kívülről fedi a négy üveglapot – a lapok világítanak, a sarokoszlopok sötétek.
- [x] **Az autók lámpái is csak világosak legyenek, fénycsóva nélkül.** ✅ A fényszórók és a hátsó lámpák világítanak, az út előttük nem (a fénycsóva megszűnt).
- [x] **A szobák fénye: az eredeti lámpák, hangolva.** ✅ (Egy próba – egyenletes „szobafény” dobozokkal – nem tetszett, nem került be.) A mennyezeti lámpák spotfények maradtak, árnyékkal (nem világítanak át a falon), de olyanok, mint egy mennyezeti lámpa: meleg szín, nagyon széles fénykúp (≈ 160°), puha szél, lassú lecsengés; egyszerre három égő helyiség kap fényt (Petyusé és a két legközelebbi), az árnyéktérképek felváltva frissülnek (képkockánként egy).
- [x] **A karakterek mozgás közben vibrálnak a fényben.** ✅ A saját árnyékuk (a széles fénykúp miatt durva, és csak minden harmadik képkockán frissülő árnyéktérképből) késve ugrált rajtuk. Most a szereplők nem kapnak árnyékot magukra (a padlóra továbbra is vetnek), és Petyus helyiségének lámpája minden képkockán frissíti az árnyékát (a másik kettő felváltva).
- [x] **A répa szára a vékony végén volt.** ✅ A répa kúpja meg volt fordítva: most a vastag végén van a zöld szár, a hegye a másik irányba mutat, a gyűrűk a felületén ülnek (nem lógnak ki a vékony részen).
- [x] **Minden indításkor legyen csukva a fürdő és a WC ajtaja.** ✅ Folytatáskor is (a mentett ajtóállás után csukódnak).
- [x] **Petyus is tudjon fogat mosni.** ✅ A mosdónál E – fogmosás (~6 mp, dúdolás, köpés); azzal mos, ami a fogkrém helyén van: sarokkrém → „Fúúúj!”, chilikrém → „Ez CSÍP!!”, arcmaszkkal nem mos, üres polcnál „Hol a fogkrém?”; amíg a szülők mosnak fogat, foglalt; ha elmegy, abbamarad.
- [x] **A nővér este is az ágyában legyen, mint reggel.** ✅ Este is alszik a franciaágyban, betakarózva, forgolódik.
- [x] **Petya és Angi se tudjon átmenni a falakon.** ✅ Minden sétájuk (a kézzel megadott útvonalak is: átöltözés, tejszínes kávé, anya teendői) szakaszonként ellenőrizve: ha egy szakasz falon vagy magas bútoron menne át, útkereséssel kerülnek (`navRoute` a `navgrid.js`-ben, a `walkTo` köré az `ep2.js`-ben); az útjukba eső csukott ajtót kinyitják (a zárt testvérszobáét nem).
- [x] **Apa továbbra is bele tud menni a falba.** ✅ Az útkeresés csak 7 cm-t hagyott a falak mellett (Karcsinak méretezve), így apa teste a fal mellett félig belelógott; a szülők útja most a test szélességével számol (24 cm). A rács az erkélyekre is kiterjed (eddig oda a falsarkon át vágott), a lakáson kívüli cellák (a ház körüli levegő) zártak. Ellenőrizve: a fő útvonalakon a test közepe legalább 23 cm-re marad a faltól.
- [x] **Fogmosáskor apa válla átmegy a WC és a fürdő falán.** ✅ Az ellenőrzés minden szakasz elejét és végét kihagyta (ott ülhet le / állhat fel), így a sok rövid szakaszból álló, már kiszámolt útvonalak (fogmosás, kulcskeresés, meccs, szemét) a falak mellett maradtak. Most csak a séta legeleje és legvége lehet foglalt helyen, a többi pont mind szabad kell legyen. A fürdőajtónál is legalább 27 cm marad.
- [x] **A karok még mindig belelógnak a falba.** ✅ Apa modellje karokkal kb. 1 m széles (anya ~0,6 m) – ez szélesebb a 80–90 cm-es ajtóknál. Az útkeresés most a karokkal együtt számol (apa 0,5 m, anya 0,31 m fél szélesség, 7,5 cm-es rácson); az ajtókon át egy-egy folyosó marad nyitva, a nyílás közepén, és ott oldalazva mennek át (a vállvonal az ajtó tengelyében, kb. 1 m-rel előtte elfordulnak). Ellenőrizve 18 útvonalon (fürdő, WC, szobák, erkélyek, bejárat – oda-vissza): a test téglalapja (karokkal) sehol nem ér falhoz.
- [x] **Petya fura útvonalon megy, a fal mellett, minden ajtót kinyit.** ✅ A legrövidebb út a falak és sarkok mentén vezetett, és a jelenetek (fogmosás, meccs, szemét, kulcskeresés) maguk is ilyen utat adtak át; az ajtónyitók minden közeli ajtót kinyitottak. Most a jelenetek csak a célt adják meg; az útkeresés a helyiségek és a folyosó közepét részesíti előnyben (a falközelség drágább, `pathMiddle`), majd egyenesekre húzza ki az utat (asztal → folyosó közepe → fürdőajtó közepe → mosdó). Ajtót csak az nyit ki, és csak ott oldalaz, akinek az útja a következő ~1,2 m-en át is megy rajta (a folyosón a WC ajtaja mellett elmenve nem).
- [x] **Petya az ajtón mindig oldalazva megy be – ez fura.** ✅ Nincs oldalazás: a lakás belső ajtói (fürdő, WC, Petyus szobája, a szülők szobája) és az erkélyajtók 1,05 m szélesek lettek (apa karokkal kb. 1 m széles), az út a nyílás közepén vezet, és az ajtóban apa (anya is) kicsit behúzza a karját, kevésbé lendíti (`tuck` az `actors.js`-ben) – szemből megy át, a falat nem éri. A mosdó előtti állóhely 7 cm-rel hátrébb került (a kéz nem éri a mosdószekrény sarkát).
- [x] **A lámpák fénye kilátszik egy szobából az ajtók és a falak éleinél.** ✅ Az ajtók fölötti szemöldökfa (külön darab, hogy a lesüllyedő falnál el lehessen tüntetni) nem vetett árnyékot – a lámpák fénye az ajtók fölött átjutott; most vet. A spotfények árnyékának eltolása (bias / normalBias) kisebb lett, így a fény nem kúszik át a falak élein.
- [x] **Még mindig átvilágít: a fürdőben a csukott ajtó mellett a fal alján és az ajtó berakásainak élein.** ✅ Az árnyéktérkép a nagyon széles fénykúp miatt durva, és a szűrés a vékony tárgyakon (fal alja, ajtólap) átengedte a fényt – árnyékhangolással ez nem szűnik meg teljesen. Most minden mennyezeti lámpa csak a saját helyiségében világít (`src/lightmask.js`: a shaderben a fény a szoba határán – a fal belső síkja után 4 cm-rel – megáll), az árnyékok maradnak. Ellenőrizve: a sötét fürdőből nézve a csukott ajtó és a fal alja sötét, az előszoba felől az ajtó világos.
- [x] **Teljen lassabban az idő az iskolában.** ✅ Egy óra kb. 1 perc helyett kb. 2 perc, a szünet kb. 50 mp helyett kb. 70 mp (0,75 → 0,375, illetve 0,2 → 0,14 játékperc / mp).
- [x] **14:00 előtt ne lehessen hazamenni.** ✅ A kapu csak 14:00-tól enged haza, előtte kiírja, hogy még tanítás van.
- [x] **A tanár hosszabb ideig forduljon a tábla felé.** ✅ A tanító néni 6–9 mp helyett 13–19 mp-ig ír háttal a táblára (8–13 mp-enként).
- [x] **Közlekedjenek autók az iskola körül.** ✅ 12 autó a három utcán, mindkét irányban, a jobb oldalon.
- [x] **Az udvaron több élet, főleg a füves területen.** ✅ Szünetben 30 gyerek a többi osztályból is (10 focista, 6 ugróiskolázó, 8 fogócskázó, 6 körben ülő); tanórák alatt tornaóra a pályán (12 futó gyerek, tornatanár síppal).
- [x] **Egy ház az úton állt (az iskola körül).** ✅ A Kossuth Lajos és az Aradi utca menti házsor egy-egy háza az Iskola utcára esett; a két sor most megáll az Iskola utca kereszteződésénél (járdával együtt szabad).
