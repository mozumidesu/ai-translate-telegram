<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <b>🇷🇴&nbsp;Română</b> ·
  <a href="README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <a href="README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate for Telegram

Un userscript pentru Telegram care îți traduce mesajele cu modelul de
inteligență artificială pe care îl alegi, fără să-ți netezească felul în care
scrii.

Mesajele pe care le trimiți sunt traduse înainte să plece, în conversațiile pe
care le pornești. Mesajele pe care le primești sunt traduse când ceri tu, din
meniul mesajului. Folosește nucleul de traducere al [pluginului AI Translate
pentru Discord](https://github.com/mozumidesu/ai-translate), cu aceiași
furnizori.

## De ce încă un traducător

Traducerea automată e făcută pentru proză. Conversația nu e proză. Merge cu
litere mici și fraze neterminate, se ține pe kaomoji, iar un punct care lipsește
spune ceva. Majoritatea traducătorilor fac ordine în toate astea pe tăcute, iar
de partea cealaltă ajunge o scrisoare tip scrisă de altcineva.

Acesta e făcut ca să nu se atingă de nimic. Nu pune semne de punctuație pe care
nu le-ai scris, nu trece cu majusculă ce ai lăsat cu literă mică, îți păstrează
rândurile rupte acolo unde le-ai rupt și știe că un emoticon e o față, nu un
cuvânt de tradus.

## Ce știe să facă

Traducerea automată se pornește pentru fiecare conversație în parte, așa că
lucrează doar acolo unde chiar ai nevoie de ea. Clic stânga pe butonul de
traducere din bara de scriere deschide panoul; clic dreapta, sau Shift și clic,
pornește sau oprește conversația curentă. Cât timp conversația e pornită,
butonul ia culoarea de accent.

Ce scrii așteaptă până vine traducerea, așa că celălalt vede mereu doar
traducerea. O editare pleacă exact cum o scrii, ca o traducere să poată fi
îndreptată de mână. Îngroșatul, cursivul, tăiatul, spoilerele, linkurile,
mențiunile, emoji-urile personalizate, citatele, codul și blocurile de cod rămân
la locul lor în mesajul tradus. Sublinierea e singurul lucru care se pierde.
Dacă o traducere eșuează, mesajul e reținut, motivul e afișat, iar textul tău se
întoarce în caseta de scriere; în setări poți alege să fie trimis netradus în
schimb.

Orice primești poate fi tradus din meniul de clic dreapta pe mesaj, iar
răspunsul apare într-un card lângă el. Când nici traducerea nu te lămurește, din
cauza prescurtărilor, a unui cuvânt folosit doar într-o țară sau a unei glume
între doi oameni, **Explică** din același meniu spune ce limbă e, desface
prescurtările și zice ce s-a vrut. Acela e oprit până îl pornești din setări.

Pornește **Folosește mesajele recente drept context** și ultimele mesaje ale
conversației pleacă odată cu fiecare cerere, așa că un simplu „da” sau „nu se
lipește” ajunge așa cum trebuia. E oprit până îl pornești, pentru că trimite
mesajele altor oameni la furnizorul tău. Îți poți fixa și vocabularul tău:
cuvinte care nu se traduc niciodată, termeni legați de o traducere fixă, genul
gramatical pe care să-l folosească pentru tine și dacă i se vorbește celuilalt
formal sau nu.

Și un singur mesaj poate păstra o parte din el. Pune un cuvânt sau o expresie
între două bare oblice inverse, `\carpe diem\`, și pleacă exact cum ai scris-o,
fără bare; o bară oblică inversă la începutul rândului păstrează tot rândul.
Codul nu se traduce niciodată, fie că e scris între accente grave, fie că e
formatat drept cod.

**AI Learn** e pentru limba pe care o înveți. Pornește-l din setări și, într-o
conversație pornită, ce scrii în alfabetul limbii în care traduci pleacă așa cum
l-ai scris, cu varianta pe care ar fi scris-o un vorbitor nativ dedesubt și
cuvintele schimbate marcate. Doar tu vezi rândul acela. **Corecturi**, în
setări, le păstrează pe ultimele cincizeci, iar **Corectează** din meniul
propriului tău mesaj întreabă din nou.

Sub mesajele tale trimise poate rămâne originalul, vizibil doar pentru tine, ca
să vezi ce ai scris de fapt; acela e oprit până îl pornești tu. Comenzile pentru
boți, ca `/start`, și ce trimit butoanele unui bot pleacă exact așa cum sunt.
Interfața vorbește 16 limbi și o urmează pe cea a Telegramului cât timp nu îi
spui altceva.

## Furnizori

Cheia de API o aduci tu și rămâne a ta. Scriptul nu are server de traducere
propriu și nu vede niciodată cheia nimănui.

| Furnizor | Plan gratuit |
|---|---|
| Groq | da |
| Google Gemini | da |
| Z.ai GLM | da, și merge acolo unde celelalte două sunt blocate |
| Anthropic Claude | nu |
| Altul (orice API compatibil cu OpenAI) | depinde de furnizor |

Până la patru furnizori de rezervă pot sta în spatele primului. Când primul e
aglomerat, a rămas fără cotă sau refuză cererea, traducerea trece de la sine
prin următorul, iar o notificare scurtă spune de ce a fost sărit primul, o
singură dată și nu la fiecare mesaj.

Cheia ta rămâne în spațiul de stocare al managerului de userscripturi, iar
cererile pleacă prin manager, nu din pagină. Mesajele altor oameni ajung la
furnizorul tău doar când ceri să fie tradus sau explicat unul dintre ele, sau
cât timp **Folosește mesajele recente drept context** e pornit.

## Instalare

AI Translate for Telegram merge în Telegram Web, în browser, și nicăieri
altundeva: aplicațiile Telegram nu pot fi extinse. Ambii clienți ai Telegram Web
funcționează, Web A și Web K.

Instalează [Tampermonkey](https://www.tampermonkey.net/) sau alt manager de
userscripturi, apoi deschide
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Managerul îți propune să îl instaleze și de atunci îl ține la zi de acolo.
Deschide [web.telegram.org](https://web.telegram.org/) și reîncarcă pagina.

Apoi apasă butonul de traducere din bara de scriere și alege **Toate setările
pluginului**, sau găsește aceeași intrare în meniul managerului de
userscripturi, alege un furnizor și lipește-ți cheia. Prima dată când scriptul
ajunge la furnizorul tău, managerul te poate întreba dacă are voie: permite
adresa aceea, în Tampermonkey cu **Always allow domain**. Apoi pornește o
conversație și ai terminat.

## Actualizări

Managerul de userscripturi caută o versiune nouă în ritmul lui, din ramura
`main` a acestui depozit. **Caută actualizări**, în josul setărilor, întreabă pe
loc și, dacă e ceva nou, deschide scriptul nou în manager: confirmă acolo și
reîncarcă pagina.

## Dezinstalare

Șterge scriptul din managerul de userscripturi. Nu s-a instalat nimic altceva,
așa că nu e nimic altceva de scos.

## Să spui ceva

Plicul din capul paginii de setări deschide o fereastră pentru raportat erori și
cerut lucruri, cu capturi de ecran cu tot. Serverul de suport e legat în aceeași
fereastră. Un raport conține ce ai scris, capturile pe care le-ai adăugat,
numele și id-ul tău de Telegram ca un răspuns să ajungă la tine, și versiunea pe
care o rulezi. Nu conține niciodată o cheie sau o setare. Poți și să [deschizi
un issue](https://github.com/mozumidesu/ai-translate-telegram/issues) pe GitHub.

## Licență

GPL-3.0-or-later, la fel ca AI Translate. Vezi [LICENSE](../LICENSE).
