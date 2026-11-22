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
  <a href="README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <b>🇻🇳&nbsp;Tiếng Việt</b> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate for Telegram

Một userscript cho Telegram dịch tin nhắn của bạn bằng mô hình AI bạn chọn, và
dịch mà không san phẳng lối viết của bạn.

Tin nhắn bạn gửi được dịch trước khi đi, trong những cuộc trò chuyện bạn bật.
Tin nhắn bạn nhận được dịch khi bạn yêu cầu, từ menu của tin nhắn đó. Nó dùng
lõi dịch của [plugin AI Translate cho
Discord](https://github.com/mozumidesu/ai-translate), với cùng các nhà cung cấp.

## Vì sao lại thêm một trình dịch nữa

Dịch máy được làm cho văn xuôi. Trò chuyện không phải văn xuôi. Nó viết thường,
nói nửa chừng, sống nhờ kaomoji, và một dấu chấm thiếu cũng đang nói điều gì đó.
Phần lớn trình dịch lặng lẽ dọn hết những thứ ấy đi, và cái đến bên kia đọc
giống một lá thư mẫu do người khác viết.

Cái này được làm ra để không đụng vào. Nó không thêm dấu câu bạn không viết,
không viết hoa chữ bạn để thường, giữ nguyên chỗ bạn xuống dòng, và biết rằng
biểu tượng cảm xúc là một khuôn mặt chứ không phải một từ cần dịch.

## Nó làm được gì

Dịch tự động được bật theo từng cuộc trò chuyện, nên nó chỉ động đến những cuộc
mà bạn thật sự cần. Nhấp chuột trái vào nút dịch trên thanh nhập sẽ mở bảng điều
khiển; nhấp chuột phải, hoặc giữ Shift rồi nhấp, sẽ bật hoặc tắt cuộc trò chuyện
hiện tại. Khi cuộc trò chuyện đang bật, nút mang màu nhấn.

Những gì bạn gõ sẽ chờ đến khi bản dịch xong, nên người bên kia chỉ thấy bản
dịch. Một lần sửa tin nhắn sẽ đi ra đúng như bạn gõ, để bạn có thể tự tay sửa
lại một bản dịch. Chữ đậm, nghiêng, gạch ngang, spoiler, liên kết, lượt nhắc,
emoji tùy chỉnh, trích dẫn, mã và khối mã đều ở đúng chỗ của chúng trong tin
nhắn đã dịch. Gạch chân là thứ duy nhất bị bỏ. Nếu dịch không thành, tin nhắn
được giữ lại, lý do được hiện ra, và chữ của bạn quay về ô nhập; trong phần cài
đặt bạn có thể chọn gửi nó đi mà không dịch.

Bất cứ thứ gì bạn nhận đều có thể dịch từ menu chuột phải trên tin nhắn, và câu
trả lời hiện trong một thẻ bên cạnh. Khi ngay cả bản dịch cũng không giúp bạn
hiểu, vì viết tắt, vì một từ chỉ dùng ở một nước hay một câu đùa riêng của hai
người, **Giải thích** trong cùng menu đó sẽ gọi tên ngôn ngữ, mở các chữ viết
tắt ra và nói ý người ta muốn nói là gì. Cái đó tắt cho đến khi bạn bật trong
phần cài đặt.

Bật **Dùng các tin nhắn gần đây làm ngữ cảnh** thì vài tin nhắn gần nhất của
cuộc trò chuyện sẽ đi kèm mỗi yêu cầu, nên một câu "ừ" trống trơn hay "không dán
được" đến nơi đúng như ý. Nó tắt cho đến khi bạn bật, vì nó gửi tin nhắn của
người khác tới nhà cung cấp của bạn. Bạn cũng có thể ghim từ vựng của riêng
mình: những từ không bao giờ được dịch, những thuật ngữ gắn với một bản dịch cố
định, giống ngữ pháp dùng cho chính bạn, và việc xưng hô với người kia có trang
trọng hay không.

Một tin nhắn lẻ cũng có thể giữ lại một phần của chính nó. Đặt một từ hay một
cụm giữa hai dấu gạch chéo ngược, `\carpe diem\`, và nó đi ra đúng như bạn gõ,
không còn dấu gạch chéo; một dấu gạch chéo ngược ở đầu dòng sẽ giữ nguyên cả
dòng đó. Mã không bao giờ được dịch, dù được viết trong dấu huyền ngược hay được
định dạng là mã.

**AI Learn** dành cho ngôn ngữ bạn đang học. Bật nó trong phần cài đặt, và trong
một cuộc trò chuyện bạn đã bật, những gì bạn viết bằng chữ của ngôn ngữ bạn dịch
sang sẽ đi ra đúng như bạn gõ, kèm bên dưới là câu mà người bản ngữ sẽ viết,
những từ đã đổi được đánh dấu. Chỉ mình bạn thấy dòng đó. **Những chỗ đã sửa**,
trong phần cài đặt, giữ năm mươi lần gần nhất, và **Sửa lại** trong menu tin
nhắn của chính bạn sẽ hỏi lại.

Dưới những tin nhắn bạn đã gửi có thể giữ lại bản gốc, chỉ mình bạn thấy, để bạn
biết mình thực sự đã gõ gì; cái đó tắt cho đến khi bạn bật. Các lệnh bot như
`/start`, và những gì nút của bot gửi đi, đều đi ra đúng nguyên như vậy. Giao
diện nói được 16 thứ tiếng và đi theo ngôn ngữ của Telegram chừng nào bạn chưa
chọn khác.

## Nhà cung cấp

Khóa API là của bạn mang theo, và vẫn là của bạn. Tập lệnh không có máy chủ dịch
riêng và không bao giờ nhìn thấy khóa của ai.

| Nhà cung cấp | Gói miễn phí |
|---|---|
| Groq | có |
| Google Gemini | có |
| Z.ai GLM | có, và dùng được ở nơi hai cái kia bị chặn |
| Anthropic Claude | không |
| Khác (bất kỳ API nào tương thích OpenAI) | tùy nhà cung cấp |

Có thể đặt tới bốn nhà cung cấp dự phòng đứng sau nhà cung cấp đầu tiên. Khi cái
thứ nhất quá tải, hết hạn mức hoặc từ chối yêu cầu, bản dịch tự đi qua cái kế
tiếp. Nếu cái thứ nhất từ chối, một thông báo ngắn nói vì sao, chỉ một lần chứ
không phải mỗi tin nhắn.

Khóa của bạn nằm trong bộ nhớ của trình quản lý userscript, và các yêu cầu đi ra
qua trình quản lý, không phải từ trang web. Tin nhắn của người khác chỉ đến nhà
cung cấp của bạn khi bạn yêu cầu dịch hay giải thích một tin, hoặc khi **Dùng
các tin nhắn gần đây làm ngữ cảnh** đang bật.

## Cài đặt

AI Translate for Telegram chạy trong Telegram Web, trên trình duyệt, và không ở
đâu khác: các ứng dụng Telegram không thể mở rộng. Cả hai trình khách của
Telegram Web đều dùng được, Web A và Web K.

Cài [Tampermonkey](https://www.tampermonkey.net/) hoặc một trình quản lý
userscript khác, rồi mở
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Trình quản lý sẽ hỏi có cài không, rồi sau đó tự cập nhật từ đó. Mở
[web.telegram.org](https://web.telegram.org/) rồi tải lại trang.

Rồi nhấp vào nút dịch trên thanh nhập và bấm **Tất cả cài đặt của tiện ích**,
hoặc tìm cùng mục đó trong menu của trình quản lý userscript, chọn một nhà cung
cấp và dán khóa của bạn. Lần đầu tập lệnh liên lạc với nhà cung cấp, trình quản
lý có thể hỏi có cho phép không: hãy cho phép địa chỉ đó, trong Tampermonkey
bằng **Always allow domain**. Rồi bật một cuộc trò chuyện, vậy là xong.

## Cập nhật

Trình quản lý userscript tự tìm phiên bản mới theo lịch riêng của nó, từ nhánh
`main` của kho này. **Kiểm tra cập nhật** ở cuối phần cài đặt sẽ hỏi ngay, và
nếu có bản mới thì mở tập lệnh mới trong trình quản lý: hãy xác nhận ở đó rồi
tải lại trang.

## Gỡ cài đặt

Xóa tập lệnh trong trình quản lý userscript. Không có gì khác được cài, nên cũng
không có gì khác phải gỡ.

## Báo một điều gì đó

Chiếc phong bì ở đầu trang cài đặt mở ra một cửa sổ để báo lỗi và đề nghị, kèm
được cả ảnh chụp màn hình. Máy chủ hỗ trợ cũng được dẫn link trong chính cửa sổ
đó. Một bản báo cáo mang theo những gì bạn viết, các ảnh chụp bạn thêm vào, tên
và id Telegram của bạn để câu trả lời có thể đến được với bạn, và bản dựng bạn
đang chạy. Nó không bao giờ mang theo khóa hay cài đặt nào. Bạn cũng có thể [mở
một issue](https://github.com/mozumidesu/ai-translate-telegram/issues) trên
GitHub.

## Giấy phép

GPL-3.0-or-later, giống như AI Translate. Xem [LICENSE](../LICENSE).
