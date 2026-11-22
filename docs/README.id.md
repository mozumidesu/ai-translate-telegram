<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <b>🇮🇩&nbsp;Bahasa Indonesia</b> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="README.ro.md">🇷🇴&nbsp;Română</a> ·
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

Userscript untuk Telegram yang menerjemahkan pesan Anda dengan model AI pilihan
Anda, dan melakukannya tanpa meratakan cara Anda menulis.

Pesan yang Anda kirim diterjemahkan sebelum terkirim, di obrolan yang Anda
nyalakan. Pesan yang Anda terima diterjemahkan saat Anda meminta, lewat menu
pesan itu. Ia memakai inti penerjemahan [plugin AI Translate untuk
Discord](https://github.com/mozumidesu/ai-translate), dengan penyedia yang sama.

## Kenapa penerjemah lagi

Terjemahan mesin dibuat untuk prosa. Obrolan bukan prosa. Ia ditulis dengan
huruf kecil dan setengah jadi, hidup dari kaomoji, dan titik yang hilang pun
punya arti. Sebagian besar penerjemah diam-diam merapikan semua itu, dan yang
sampai di seberang terbaca seperti surat formulir tulisan orang lain.

Yang ini dibuat untuk membiarkannya apa adanya. Ia tidak menambahkan tanda baca
yang tidak Anda tulis, tidak membesarkan huruf yang Anda biarkan kecil, menjaga
pergantian baris di tempat Anda menaruhnya, dan tahu bahwa emotikon adalah
wajah, bukan kata yang harus diterjemahkan.

## Apa saja yang bisa

Terjemahan otomatis diatur per obrolan, jadi ia hanya bekerja di percakapan yang
memang Anda butuhkan. Klik kiri tombol terjemah di bilah ketik membuka panel;
klik kanan, atau Shift-klik, menyalakan atau mematikan obrolan yang sedang
dibuka. Selama obrolan itu menyala, tombolnya berwarna aksen.

Yang Anda ketik menunggu sampai terjemahannya siap, jadi lawan bicara hanya
pernah melihat terjemahannya. Suntingan terkirim persis seperti yang Anda ketik,
jadi terjemahan bisa dibetulkan dengan tangan. Tebal, miring, coret, spoiler,
tautan, sebutan, emoji kustom, kutipan, kode, dan blok kode tetap di tempatnya
dalam pesan terjemahan. Hanya garis bawah yang hilang. Kalau terjemahan gagal,
pesan ditahan, alasannya ditampilkan, dan teks Anda kembali ke kotak ketik; di
pengaturan Anda bisa memilih untuk mengirimnya tanpa terjemahan saja.

Apa pun yang Anda terima bisa diterjemahkan lewat menu klik kanan pada pesan
itu, dan jawabannya muncul di kartu di sebelahnya. Kalau terjemahannya pun tidak
menolong, karena singkatan, kata yang hanya dipakai di satu negara, atau lelucon
antara dua orang, **Jelaskan** di menu yang sama menyebut bahasanya, membuka
singkatannya, dan menjelaskan maksudnya. Yang itu mati sampai Anda menyalakannya
di pengaturan.

Nyalakan **Gunakan pesan terbaru sebagai konteks** dan beberapa pesan terakhir
percakapan ikut dikirim bersama setiap permintaan, jadi "ya" yang singkat atau
"tidak mau ke-paste" sampai seperti yang dimaksud. Ini mati sampai Anda
menyalakannya, karena ia mengirim pesan orang lain ke penyedia Anda. Anda juga
bisa menyematkan kosakata sendiri: kata yang tidak boleh diterjemahkan, istilah
dengan satu terjemahan tetap, jenis kelamin gramatikal untuk diri Anda, dan
apakah lawan bicara disapa secara formal atau tidak.

Satu pesan pun bisa menyimpan sebagian dirinya. Apit sebuah kata atau frasa
dengan dua garis miring terbalik, `\carpe diem\`, dan ia terkirim persis seperti
yang Anda ketik, tanpa garis miringnya; garis miring terbalik di awal baris
menjaga seluruh baris itu. Kode tidak pernah diterjemahkan, baik ditulis di
antara backtick maupun diformat sebagai kode.

**AI Learn** untuk bahasa yang sedang Anda pelajari. Nyalakan di pengaturan, dan
di obrolan yang Anda nyalakan, apa yang Anda tulis dengan aksara bahasa tujuan
terjemahan terkirim seperti yang Anda ketik, dengan versi yang akan ditulis
penutur asli di bawahnya, kata yang diubah ditandai. Hanya Anda yang melihat
baris itu. **Koreksi**, di pengaturan, menyimpan lima puluh yang terakhir,
dan **Koreksi** di menu pesan Anda sendiri menanyakannya lagi.

Di bawah pesan yang Anda kirim bisa tertinggal teks aslinya, hanya terlihat oleh
Anda, supaya Anda tahu apa yang benar-benar Anda ketik; yang itu mati sampai
Anda menyalakannya. Perintah bot seperti `/start`, dan apa yang dikirim
tombol-tombol bot, terkirim persis apa adanya. Antarmukanya berbicara dalam 16
bahasa dan mengikuti bahasa Telegram selama Anda tidak menentukan lain.

## Penyedia

Kunci API Anda bawa sendiri, dan tetap milik Anda. Skrip ini tidak punya server
penerjemahan sendiri dan tidak pernah melihat kunci milik orang lain.

| Penyedia | Paket gratis |
|---|---|
| Groq | ada |
| Google Gemini | ada |
| Z.ai GLM | ada, dan bisa dipakai di tempat dua yang lain diblokir |
| Anthropic Claude | tidak ada |
| Lainnya (API apa pun yang kompatibel dengan OpenAI) | tergantung penyedianya |

Hingga empat penyedia cadangan bisa berdiri di belakang yang pertama. Kalau yang
pertama sedang penuh, kuotanya habis, atau menolak permintaan, terjemahan lewat
yang berikutnya dengan sendirinya. Kalau yang pertama menolak, sebuah
pemberitahuan singkat menyebut kenapa, sekali saja dan tidak di setiap pesan.

Kunci Anda tetap di penyimpanan pengelola userscript Anda, dan permintaan keluar
lewat pengelola, bukan dari halamannya. Pesan orang lain hanya sampai ke
penyedia Anda saat Anda meminta salah satunya diterjemahkan atau dijelaskan,
atau selama **Gunakan pesan terbaru sebagai konteks** menyala.

## Pemasangan

AI Translate for Telegram berjalan di Telegram Web, di peramban, dan tidak di
tempat lain: aplikasi Telegram tidak bisa diperluas. Kedua klien Telegram Web
bisa dipakai, Web A dan Web K.

Pasang [Tampermonkey](https://www.tampermonkey.net/) atau pengelola userscript
lain, lalu buka
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Pengelola Anda akan menawarkan pemasangan, lalu menjaganya tetap baru dari sana.
Buka [web.telegram.org](https://web.telegram.org/) lalu muat ulang halaman.

Lalu klik tombol terjemah di bilah ketik dan tekan **Semua pengaturan plugin**,
atau cari entri yang sama di menu pengelola userscript Anda, pilih penyedia, dan
tempel kunci Anda. Pertama kali skrip menghubungi penyedia Anda, pengelola Anda
mungkin bertanya apakah itu boleh: izinkan alamat itu, di Tampermonkey
dengan **Always allow domain**. Lalu nyalakan sebuah obrolan, dan selesai.

## Pembaruan

Pengelola userscript Anda mencari versi baru sesuai jadwalnya sendiri, dari
branch `main` repositori ini. **Periksa pembaruan** di bagian bawah pengaturan
menanyakannya seketika dan, kalau ada yang baru, membuka skrip baru itu di
pengelola Anda: konfirmasikan di sana lalu muat ulang halaman.

## Menghapus

Hapus skripnya di pengelola userscript Anda. Tidak ada hal lain yang dipasang,
jadi tidak ada hal lain yang perlu dihapus.

## Melaporkan sesuatu

Ikon amplop di bagian atas halaman pengaturan membuka jendela untuk laporan bug
dan permintaan, lengkap dengan tangkapan layar. Server dukungan ditautkan di
jendela yang sama. Laporan membawa apa yang Anda tulis, tangkapan layar yang
Anda tambahkan, nama dan id Telegram Anda supaya balasan bisa sampai ke Anda,
dan build yang Anda jalankan. Laporan tidak pernah membawa kunci atau
pengaturan. Anda juga bisa [membuka
issue](https://github.com/mozumidesu/ai-translate-telegram/issues) di GitHub.

## Lisensi

GPL-3.0-or-later, sama seperti AI Translate. Lihat [LICENSE](../LICENSE).
