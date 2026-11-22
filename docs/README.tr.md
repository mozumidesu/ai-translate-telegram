<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="README.ro.md">🇷🇴&nbsp;Română</a> ·
  <a href="README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <b>🇹🇷&nbsp;Türkçe</b> ·
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate for Telegram

Mesajlarınızı seçtiğiniz bir yapay zekâ modeliyle çeviren ve bunu yazış
biçiminizi düzleştirmeden yapan bir Telegram userscript'i.

Gönderdiğiniz mesajlar çıkmadan önce, açtığınız sohbetlerde çevrilir. Aldığınız
mesajlar ise siz isteyince, mesajın menüsünden çevrilir. [Discord için AI
Translate eklentisinin](https://github.com/mozumidesu/ai-translate) çeviri
çekirdeğini aynı sağlayıcılarla kullanır.

## Neden bir çevirmen daha

Makine çevirisi düzyazı için yapılmıştır. Sohbet düzyazı değildir. Küçük harfle
ve yarım cümlelerle gider, kaomoji üzerine kuruludur ve eksik bir nokta bile bir
şey anlatır. Çoğu çevirmen bunların hepsini sessizce toparlar, karşı tarafa da
başkasının yazdığı matbu bir mektup ulaşır.

Bu, hiçbirine dokunmamak üzere kurulmuş. Yazmadığınız noktalama işaretini
eklemez, küçük bıraktığınız harfi büyütmez, satır sonlarınızı koyduğunuz yerde
bırakır ve emotikonun çevrilecek bir kelime değil bir yüz olduğunu bilir.

## Neler yapabilir

Otomatik çeviri her sohbet için ayrı açılır, yani yalnızca gerçekten ihtiyaç
duyduğunuz konuşmalara dokunur. Yazı çubuğundaki çeviri düğmesine sol tıklamak
paneli açar; sağ tıklamak ya da Shift ile tıklamak o anki sohbeti açıp kapatır.
Sohbet açıkken düğme vurgu rengini alır.

Yazdığınız şey çevirisi hazır olana kadar bekler, böylece karşınızdaki yalnızca
çeviriyi görür. Bir düzenleme tam yazdığınız gibi gider, böylece bir çeviri elle
düzeltilebilir. Kalın, italik, üstü çizili, spoiler, bağlantılar, bahsetmeler,
özel emojiler, alıntılar, kod ve kod blokları çevrilen mesajda ait oldukları
yerde kalır. Düşen tek şey alt çizgidir. Bir çeviri başarısız olursa mesaj
bekletilir, nedeni gösterilir ve metniniz yazı kutusuna geri döner; ayarlardan
bunun yerine çevrilmeden gönderilmesini seçebilirsiniz.

Aldığınız her şey mesajın sağ tık menüsünden çevrilebilir ve cevap yanında bir
kartta görünür. Çeviri bile bir şey anlatmadığı zaman, kısaltmalar, yalnızca bir
ülkede kullanılan bir kelime ya da iki kişi arasındaki bir şaka yüzünden, aynı
menüdeki **Açıkla** dilin hangisi olduğunu söyler, kısaltmaları açar ve neyin
kastedildiğini anlatır. Bu, siz ayarlardan açana kadar kapalıdır.

**Son mesajları bağlam olarak kullan** seçeneğini açın, konuşmanın son birkaç
mesajı her istekle birlikte gider, böylece kuru bir "evet" ya da "yapıştırmıyor"
olması gerektiği gibi ulaşır. Siz açana kadar kapalıdır, çünkü başkalarının
mesajlarını sağlayıcınıza gönderir. Kendi sözlüğünüzü de sabitleyebilirsiniz:
asla çevrilmemesi gereken kelimeler, tek bir sabit karşılığa bağlı terimler,
kendiniz için kullanılacak dilbilgisel cinsiyet ve karşınızdakine resmî hitap
edilip edilmeyeceği.

Tek bir mesaj da kendisinin bir parçasını koruyabilir. Bir kelimeyi ya da
ifadeyi iki ters eğik çizgi arasına alın, `\carpe diem\`, tam yazdığınız gibi
gider, ters çizgiler olmadan; satır başındaki bir ters eğik çizgi o satırın
tamamını korur. Kod, ister ters tırnaklar arasında yazılmış ister kod olarak
biçimlendirilmiş olsun, hiçbir zaman çevrilmez.

**AI Learn** öğrendiğiniz dil içindir. Ayarlardan açın; açtığınız bir sohbette,
çevirdiğiniz dilin alfabesiyle yazdığınız şey yazdığınız gibi gider, altında da
anadili o dil olan birinin yazacağı hâli, değişen kelimeler işaretli olarak
durur. O satırı yalnızca siz görürsünüz. Ayarlardaki **Düzeltmeler** son
ellisini saklar, kendi mesajınızın menüsündeki **Düzelt** de yeniden sorar.

Gönderdiğiniz mesajların altında özgün hâli kalabilir, yalnızca sizin
görebileceğiniz şekilde, böylece gerçekte ne yazdığınızı görürsünüz; bu, siz
açana kadar kapalıdır. `/start` gibi bot komutları ve bir botun düğmelerinin
gönderdikleri olduğu gibi gider. Arayüz 16 dil konuşur ve siz başka bir şey
söylemedikçe Telegram'ın dilini izler.

## Sağlayıcılar

API anahtarını siz getirirsiniz ve o sizde kalır. Betiğin kendi çeviri sunucusu
yoktur ve kimsenin anahtarını görmez.

| Sağlayıcı | Ücretsiz kullanım |
|---|---|
| Groq | var |
| Google Gemini | var |
| Z.ai GLM | var, ve diğer ikisinin engellendiği yerlerden erişilebilir |
| Anthropic Claude | yok |
| Diğer (OpenAI uyumlu herhangi bir API) | sağlayıcıya bağlı |

İlkinin arkasına dört yedek sağlayıcıya kadar konabilir. İlki yoğun olduğunda,
kotası bittiğinde ya da isteği geri çevirdiğinde çeviri kendiliğinden sıradakine
geçer ve kısa bir bildirim ilkinin neden atlandığını söyler, her mesajda değil,
bir kez.

Anahtarınız userscript yöneticinizin depolama alanında kalır ve istekler
sayfadan değil, yönetici üzerinden gider. Başkalarının mesajları sağlayıcınıza
yalnızca birini çevirmesini ya da açıklamasını istediğinizde veya **Son
mesajları bağlam olarak kullan** açıkken ulaşır.

## Kurulum

AI Translate for Telegram, Telegram Web'de, tarayıcıda çalışır, başka hiçbir
yerde değil: Telegram uygulamaları genişletilemez. Telegram Web'in iki istemcisi
de çalışır, Web A ve Web K.

[Tampermonkey](https://www.tampermonkey.net/)'i ya da başka bir userscript
yöneticisini kurun, sonra
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js)
dosyasını açın. Yöneticiniz kurmayı önerir, sonrasında da oradan güncel tutar.
[web.telegram.org](https://web.telegram.org/) adresini açın ve sayfayı
yenileyin.

Sonra yazı çubuğundaki çeviri düğmesine tıklayıp **Tüm eklenti ayarları**'na
basın ya da aynı girişi userscript yöneticinizin menüsünde bulun, bir sağlayıcı
seçin ve anahtarınızı yapıştırın. Betik sağlayıcınıza ilk kez ulaştığında
yöneticiniz buna izin verip vermeyeceğinizi sorabilir: o adrese izin verin,
Tampermonkey'de **Always allow domain** ile. Sonra bir sohbeti açın, hepsi bu.

## Güncellemeler

Userscript yöneticiniz yeni sürümü kendi takvimine göre, bu deponun `main`
dalından arar. Ayarların altındaki **Güncellemeleri denetle** hemen sorar ve
yeni bir şey varsa yeni betiği yöneticinizde açar: orada onaylayın ve sayfayı
yenileyin.

## Kaldırma

Betiği userscript yöneticinizden silin. Başka hiçbir şey kurulmadı, yani
kaldırılacak başka bir şey de yok.

## Bir şey bildirmek

Ayarlar sayfasının üstündeki zarf, ekran görüntüleri de ekleyebileceğiniz bir
hata bildirme ve istek penceresi açar. Destek sunucusunun bağlantısı da aynı
pencerede. Bir bildirim yazdıklarınızı, eklediğiniz ekran görüntülerini, size
bir cevap ulaşabilsin diye Telegram adınızı ve kimliğinizi, bir de kullandığınız
derlemeyi içerir. Hiçbir zaman bir anahtar ya da ayar içermez. GitHub'da [bir
issue da
açabilirsiniz](https://github.com/mozumidesu/ai-translate-telegram/issues).

## Lisans

GPL-3.0-or-later, AI Translate ile aynı. Bkz. [LICENSE](../LICENSE).
