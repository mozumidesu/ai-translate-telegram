<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <b>🇪🇸&nbsp;Español</b> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
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

Un userscript para Telegram que traduce tus mensajes con el modelo de IA que
elijas, y lo hace sin aplanar tu manera de escribir.

Los mensajes que envías se traducen antes de salir, en los chats que actives.
Los mensajes que recibes se traducen cuando tú lo pides, desde el menú del
mensaje. Usa el núcleo de traducción del [plugin AI Translate para
Discord](https://github.com/mozumidesu/ai-translate), con los mismos
proveedores.

## Por qué otro traductor

La traducción automática está hecha para la prosa. Un chat no es prosa. Va en
minúsculas y a medias, se sostiene sobre kaomojis, y un punto que falta está
diciendo algo. La mayoría de los traductores ordenan todo eso sin avisar, y al
otro lado llega una carta modelo escrita por otra persona.

Este está hecho para no tocarlo. No pone puntuación que tú no escribiste, no
pasa a mayúscula lo que dejaste en minúscula, conserva tus saltos de línea donde
los pusiste, y sabe que un emoticono es una cara y no una palabra que traducir.

## Qué sabe hacer

La traducción automática se activa por chat, así que solo actúa en las
conversaciones donde de verdad hace falta. Clic izquierdo en el botón de
traducir de la barra de escritura abre el panel; clic derecho, o mayúsculas y
clic, activa o desactiva el chat actual. Mientras el chat está activado, el
botón toma el color de acento.

Lo que escribes espera hasta que llega su traducción, así que la otra persona
solo ve la traducción. Una edición sale exactamente como la escribes, para que
puedas corregir una traducción a mano. La negrita, la cursiva, el tachado, los
spoilers, los enlaces, las menciones, los emojis personalizados, las citas, el
código y los bloques de código se quedan en su sitio en el mensaje traducido. El
subrayado es lo único que se pierde. Si una traducción falla, el mensaje se
retiene, se muestra el motivo y tu texto vuelve al cuadro de escritura; en los
ajustes puedes elegir que se envíe sin traducir.

Cualquier cosa que recibas se puede traducir desde el menú del clic derecho
sobre el mensaje, y la respuesta aparece en una tarjeta a su lado. Cuando ni la
traducción aclara nada, por abreviaturas, por una palabra que solo se usa en un
país o por una broma entre dos, **Explicar** en ese mismo menú nombra el idioma,
desarrolla las abreviaturas y dice qué se quiso decir. Eso está apagado hasta
que lo enciendas en los ajustes.

Activa **Usar los mensajes recientes como contexto** y los últimos mensajes de
la conversación viajan con cada petición, así un simple «sí» o «no se pega»
llega como debía llegar. Está apagado hasta que lo enciendas, porque envía los
mensajes de otras personas a tu proveedor. También puedes fijar tu propio
vocabulario: palabras que nunca deben traducirse, términos atados a una
traducción fija, el género gramatical que usar para ti y si se trata a la otra
persona de tú o de usted.

Un mensaje suelto también puede conservar una parte de sí mismo. Pon una palabra
o una frase entre dos barras invertidas, `\carpe diem\`, y sale exactamente como
la escribiste, sin las barras; una barra invertida al principio de una línea
conserva la línea entera. El código no se traduce nunca, esté entre comillas
invertidas o con formato de código.

**AI Learn** es para el idioma que estás aprendiendo. Actívalo en los ajustes y,
en un chat que tengas activado, lo que escribas en el alfabeto del idioma al que
traduces sale tal como lo escribiste, con debajo la versión que habría escrito
un hablante nativo y las palabras cambiadas marcadas. Esa línea solo la ves
tú. **Correcciones**, en los ajustes, guarda las cincuenta últimas,
y **Corregir** en el menú de tu propio mensaje lo vuelve a preguntar.

Debajo de tus mensajes enviados puede quedar el original, visible solo para ti,
para que veas lo que escribiste en realidad; eso está apagado hasta que lo
enciendas. Los comandos de bot como `/start`, y lo que envían los botones de un
bot, salen exactamente como son. La interfaz habla 16 idiomas y sigue el de
Telegram mientras no le digas otra cosa.

## Proveedores

La clave de API la pones tú, y sigue siendo tuya. El script no tiene servidor de
traducción propio y nunca ve la clave de nadie.

| Proveedor | Plan gratuito |
|---|---|
| Groq | sí |
| Google Gemini | sí |
| Z.ai GLM | sí, y funciona donde los otros dos están bloqueados |
| Anthropic Claude | no |
| Otro (cualquier API compatible con OpenAI) | depende del proveedor |

Hasta cuatro proveedores de reserva pueden ir detrás del primero. Cuando el
primero está saturado, sin cuota o rechaza la petición, la traducción pasa por
el siguiente por sí sola, y un aviso breve dice por qué se saltó el primero, una
vez y no con cada mensaje.

Tu clave se queda en el almacenamiento de tu gestor de userscripts, y las
peticiones salen a través del gestor, no desde la página. Los mensajes de otras
personas llegan a tu proveedor solo cuando pides que uno se traduzca o se
explique, o mientras **Usar los mensajes recientes como contexto** está
activado.

## Instalación

AI Translate for Telegram funciona en Telegram Web, en el navegador, y en ningún
otro sitio: las aplicaciones de Telegram no se pueden ampliar. Los dos clientes
de Telegram Web funcionan, Web A y Web K.

Instala [Tampermonkey](https://www.tampermonkey.net/) u otro gestor de
userscripts y abre luego
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Tu gestor se ofrecerá a instalarlo y después lo mantendrá al día desde allí.
Abre [web.telegram.org](https://web.telegram.org/) y recarga la página.

Después haz clic en el botón de traducir de la barra de escritura y
pulsa **Todos los ajustes del plugin**, o busca esa misma entrada en el menú de
tu gestor de userscripts, elige un proveedor y pega tu clave. La primera vez que
el script llegue a tu proveedor, puede que tu gestor pregunte si puede hacerlo:
permite esa dirección, en Tampermonkey con **Always allow domain**. Luego activa
un chat y ya está.

## Actualizaciones

Tu gestor de userscripts busca una versión nueva según su propio calendario, en
la rama `main` de este repositorio. **Buscar actualizaciones**, al final de los
ajustes, lo pregunta al momento y, si hay algo nuevo, abre el script nuevo en tu
gestor: confírmalo allí y recarga la página.

## Desinstalación

Borra el script en tu gestor de userscripts. No se instaló nada más, así que no
hay nada más que quitar.

## Contar algo

El sobre de arriba en la página de ajustes abre una ventana para informar de
fallos y pedir cosas, con capturas incluidas. El servidor de soporte está
enlazado en esa misma ventana. Un informe lleva lo que escribiste, las capturas
que añadiste, tu nombre e id de Telegram para que una respuesta pueda llegarte,
y la compilación que usas. Nunca lleva una clave ni un ajuste. También puedes
[abrir un issue](https://github.com/mozumidesu/ai-translate-telegram/issues) en
GitHub.

## Licencia

GPL-3.0-or-later, igual que AI Translate. Consulta [LICENSE](../LICENSE).
