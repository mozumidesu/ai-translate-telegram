<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <b>🇧🇷&nbsp;Português</b> ·
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

Um userscript para o Telegram que traduz suas mensagens com o modelo de IA que
você escolher, sem achatar o seu jeito de escrever.

As mensagens que você envia são traduzidas antes de sair, nas conversas que você
ligar. As mensagens que você recebe são traduzidas quando você pede, pelo menu
da mensagem. Ele usa o núcleo de tradução do [plugin AI Translate para o
Discord](https://github.com/mozumidesu/ai-translate), com os mesmos provedores.

## Por que mais um tradutor

A tradução automática foi feita para a prosa. Conversa não é prosa. Ela vem em
letras minúsculas e pela metade, se apoia em kaomojis, e um ponto que falta está
dizendo alguma coisa. A maioria dos tradutores arruma tudo isso em silêncio, e
do outro lado chega uma carta padrão escrita por outra pessoa.

Este foi feito para não mexer. Ele não coloca pontuação que você não escreveu,
não passa para maiúscula o que você deixou em minúscula, mantém suas quebras de
linha onde você as colocou, e sabe que um emoticon é um rosto, não uma palavra
para traduzir.

## O que ele faz

A tradução automática é ligada por conversa, então ela só age onde você
realmente precisa. Clique esquerdo no botão de traduzir na barra de digitação
abre o painel; clique direito, ou Shift e clique, liga ou desliga a conversa
atual. Enquanto a conversa está ligada, o botão fica com a cor de destaque.

O que você digita espera até a tradução chegar, então a outra pessoa só vê a
tradução. Uma edição sai exatamente como você digita, para que uma tradução
possa ser corrigida à mão. Negrito, itálico, tachado, spoilers, links, menções,
emojis personalizados, citações, código e blocos de código ficam no lugar certo
na mensagem traduzida. O sublinhado é a única coisa que se perde. Se uma
tradução falhar, a mensagem fica retida, o motivo aparece e o seu texto volta
para a caixa de digitação; nas configurações você pode escolher enviá-la sem
tradução.

Qualquer coisa que você receber pode ser traduzida pelo menu do clique direito
na mensagem, e a resposta aparece num cartão ao lado dela. Quando nem a tradução
esclarece, por causa de abreviações, de uma palavra que só se usa em um país ou
de uma piada entre duas pessoas, o **Explicar** nesse mesmo menu diz qual é o
idioma, abre as abreviações e conta o que se quis dizer. Esse fica desligado até
você ligar nas configurações.

Ligue **Usar as mensagens recentes como contexto** e as últimas mensagens da
conversa vão junto com cada pedido, então um simples "sim" ou "não cola" chega
do jeito que devia. Fica desligado até você ligar, porque envia as mensagens de
outras pessoas para o seu provedor. Você também pode fixar o seu vocabulário:
palavras que nunca podem ser traduzidas, termos presos a uma tradução fixa, o
gênero gramatical a usar para você e se a outra pessoa é tratada de maneira
formal ou não.

Uma mensagem sozinha também pode guardar parte de si. Coloque uma palavra ou
expressão entre duas barras invertidas, `\carpe diem\`, e ela sai exatamente
como você digitou, sem as barras; uma barra invertida no começo da linha guarda
a linha inteira. Código nunca é traduzido, esteja ele entre crases ou formatado
como código.

O **AI Learn** é para o idioma que você está aprendendo. Ligue nas configurações
e, numa conversa ligada, o que você escrever no alfabeto do idioma para o qual
traduz sai como você digitou, com a versão que um falante nativo teria escrito
embaixo, as palavras trocadas marcadas. Só você vê essa linha. **Correções**,
nas configurações, guarda as últimas cinquenta, e **Corrigir** no menu da sua
própria mensagem pergunta de novo.

Embaixo das suas mensagens enviadas pode ficar o original, visível só para você,
para que você veja o que digitou de verdade; esse fica desligado até você ligar.
Comandos de bot como `/start`, e o que os botões de um bot enviam, saem
exatamente como são. A interface fala 16 idiomas e segue o do Telegram enquanto
você não disser outra coisa.

## Provedores

A chave de API é sua e continua sendo sua. O script não tem servidor de tradução
próprio e nunca vê a chave de ninguém.

| Provedor | Plano gratuito |
|---|---|
| Groq | sim |
| Google Gemini | sim |
| Z.ai GLM | sim, e funciona onde os outros dois estão bloqueados |
| Anthropic Claude | não |
| Outro (qualquer API compatível com OpenAI) | depende do provedor |

Até quatro provedores de reserva podem ficar atrás do primeiro. Quando o
primeiro está sobrecarregado, sem cota ou recusa o pedido, a tradução passa pelo
seguinte por conta própria, e uma notificação curta diz por que o primeiro foi
deixado de lado, uma vez e não a cada mensagem.

Sua chave fica no armazenamento do seu gerenciador de userscripts, e os pedidos
saem pelo gerenciador, não pela página. As mensagens de outras pessoas só chegam
ao seu provedor quando você pede para traduzir ou explicar uma delas, ou
enquanto **Usar as mensagens recentes como contexto** estiver ligado.

## Instalação

O AI Translate for Telegram roda no Telegram Web, no navegador, e em nenhum
outro lugar: os aplicativos do Telegram não podem ser estendidos. Os dois
clientes do Telegram Web funcionam, o Web A e o Web K.

Instale o [Tampermonkey](https://www.tampermonkey.net/) ou outro gerenciador de
userscripts e abra em seguida
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Seu gerenciador oferece instalá-lo e depois o mantém atualizado dali. Abra
[web.telegram.org](https://web.telegram.org/) e recarregue a página.

Depois clique no botão de traduzir na barra de digitação e aperte **Todas as
configurações do plugin**, ou encontre a mesma entrada no menu do seu
gerenciador de userscripts, escolha um provedor e cole sua chave. Na primeira
vez que o script chegar ao seu provedor, seu gerenciador pode perguntar se ele
pode fazer isso: permita esse endereço, no Tampermonkey com **Always allow
domain**. Depois ligue uma conversa, e pronto.

## Atualizações

Seu gerenciador de userscripts procura uma versão nova no ritmo dele, no branch
`main` deste repositório. **Procurar atualizações**, lá no fim das
configurações, pergunta na hora e, se houver algo novo, abre o script novo no
seu gerenciador: confirme lá e recarregue a página.

## Desinstalação

Apague o script no seu gerenciador de userscripts. Nada mais foi instalado,
então não há mais nada para remover.

## Relatar alguma coisa

O envelope no topo da página de configurações abre uma janela para relatos de
erro e pedidos, com capturas de tela. O servidor de suporte está linkado nessa
mesma janela. Um relato leva o que você escreveu, as capturas que você anexou,
seu nome e id do Telegram para que uma resposta possa chegar até você, e a build
que você usa. Ele nunca leva uma chave nem uma configuração. Você também pode
[abrir uma issue](https://github.com/mozumidesu/ai-translate-telegram/issues) no
GitHub.

## Licença

GPL-3.0-or-later, a mesma do AI Translate. Veja [LICENSE](../LICENSE).
