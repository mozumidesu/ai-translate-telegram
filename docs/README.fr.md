<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <b>🇫🇷&nbsp;Français</b> ·
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

Un userscript pour Telegram qui traduit vos messages avec le modèle d'IA de
votre choix, sans lisser votre façon d'écrire.

Les messages que vous envoyez sont traduits avant de partir, dans les
discussions que vous activez. Les messages que vous recevez sont traduits quand
vous le demandez, depuis le menu du message. Il s'appuie sur le cœur de
traduction du [plugin AI Translate pour
Discord](https://github.com/mozumidesu/ai-translate), avec les mêmes
fournisseurs.

## Pourquoi encore un traducteur

La traduction automatique est faite pour la prose. Une conversation n'est pas de
la prose. Elle va en minuscules et à moitié dite, elle tient sur les kaomojis,
et un point qui manque veut dire quelque chose. La plupart des traducteurs
rangent tout cela sans rien dire, et de l'autre côté arrive une lettre type
écrite par quelqu'un d'autre.

Celui-ci est construit pour ne pas y toucher. Il n'ajoute pas la ponctuation que
vous n'avez pas mise, ne met pas de majuscule là où vous avez laissé une
minuscule, garde vos retours à la ligne là où vous les avez mis, et sait qu'un
émoticône est un visage et non un mot à traduire.

## Ce qu'il sait faire

La traduction automatique s'active discussion par discussion, elle n'intervient
donc que là où vous en avez vraiment besoin. Un clic gauche sur le bouton de
traduction dans la barre de saisie ouvre le panneau ; un clic droit, ou un clic
avec Maj, active ou désactive la discussion en cours. Tant que la discussion est
activée, le bouton prend la couleur d'accentuation.

Ce que vous tapez attend que sa traduction soit prête, si bien que votre
interlocuteur ne voit jamais que la traduction. Une modification part exactement
comme vous la tapez, ce qui permet de corriger une traduction à la main. Le
gras, l'italique, le barré, les spoilers, les liens, les mentions, les emoji
personnalisés, les citations, le code et les blocs de code restent à leur place
dans le message traduit. Seul le soulignement disparaît. Si une traduction
échoue, le message est retenu, la raison s'affiche et votre texte revient dans
la zone de saisie ; dans les réglages, vous pouvez choisir de l'envoyer non
traduit à la place.

Tout ce que vous recevez peut être traduit depuis le menu du clic droit sur le
message, et la réponse apparaît dans une carte à côté. Quand même la traduction
ne vous avance à rien, à cause d'abréviations, d'un mot qu'on n'emploie que dans
un pays ou d'une blague entre deux personnes, **Expliquer** dans ce même menu
nomme la langue, développe les abréviations et dit ce qui était voulu. Celui-là
est désactivé tant que vous ne l'activez pas dans les réglages.

Activez **Utiliser les messages récents comme contexte** et les derniers
messages de la conversation partent avec chaque requête, si bien qu'un simple «
oui » ou « ça ne se colle pas » arrive comme il le devait. C'est désactivé tant
que vous ne l'activez pas, parce que cela envoie les messages des autres à votre
fournisseur. Vous pouvez aussi fixer votre propre vocabulaire : les mots à ne
jamais traduire, les termes liés à une traduction fixe, le genre grammatical à
utiliser pour vous, et si l'on vouvoie ou tutoie votre interlocuteur.

Un message isolé peut lui aussi garder une partie de lui-même. Mettez un mot ou
une expression entre deux barres obliques inverses, `\carpe diem\`, et il part
exactement comme vous l'avez tapé, sans les barres ; une barre oblique inverse
en début de ligne garde la ligne entière. Le code n'est jamais traduit, qu'il
soit écrit entre accents graves ou mis en forme comme du code.

**AI Learn** est pour la langue que vous apprenez. Activez-le dans les réglages
et, dans une discussion activée, ce que vous écrivez dans l'alphabet de la
langue vers laquelle vous traduisez part tel que vous l'avez tapé, avec en
dessous la version qu'aurait écrite un locuteur natif, les mots changés marqués.
Vous seul voyez cette ligne. **Corrections**, dans les réglages, garde les
cinquante dernières, et **Corriger** dans le menu de votre propre message
redemande.

Sous vos messages envoyés, l'original peut rester, visible de vous seul, pour
que vous voyiez ce que vous avez réellement tapé ; celui-là est désactivé tant
que vous ne l'activez pas. Les commandes de bot comme `/start`, et ce
qu'envoient les boutons d'un bot, partent exactement tels quels. L'interface
parle 16 langues et suit celle de Telegram tant que vous ne dites pas le
contraire.

## Fournisseurs

La clé d'API, c'est vous qui l'apportez, et elle reste la vôtre. Le script n'a
pas de serveur de traduction à lui et ne voit jamais la clé de quelqu'un
d'autre.

| Fournisseur | Offre gratuite |
|---|---|
| Groq | oui |
| Google Gemini | oui |
| Z.ai GLM | oui, et accessible là où les deux autres sont bloqués |
| Anthropic Claude | non |
| Autre (toute API compatible OpenAI) | selon le fournisseur |

Jusqu'à quatre fournisseurs de secours peuvent se placer derrière le premier.
Quand le premier est saturé, à court de quota ou refuse la requête, la
traduction passe d'elle-même par le suivant. Si le premier a refusé, une courte
notification dit pourquoi, une fois et non à chaque message.

Votre clé reste dans le stockage de votre gestionnaire de userscripts, et les
requêtes passent par le gestionnaire, pas par la page. Les messages des autres
n'atteignent votre fournisseur que lorsque vous demandez à en traduire ou à en
expliquer un, ou tant que **Utiliser les messages récents comme contexte** est
activé.

## Installation

AI Translate for Telegram fonctionne dans Telegram Web, dans un navigateur, et
nulle part ailleurs : les applications Telegram ne peuvent pas être étendues.
Les deux clients de Telegram Web fonctionnent, Web A et Web K.

Installez [Tampermonkey](https://www.tampermonkey.net/) ou un autre gestionnaire
de userscripts, puis ouvrez
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Votre gestionnaire propose de l'installer, puis le tient à jour depuis là.
Ouvrez [web.telegram.org](https://web.telegram.org/) et rechargez la page.

Cliquez ensuite sur le bouton de traduction dans la barre de saisie et appuyez
sur **Tous les réglages du plugin**, ou trouvez la même entrée dans le menu de
votre gestionnaire de userscripts, choisissez un fournisseur et collez votre
clé. La première fois que le script contacte votre fournisseur, votre
gestionnaire peut demander s'il en a le droit : autorisez cette adresse, dans
Tampermonkey avec **Always allow domain**. Activez ensuite une discussion, et
c'est terminé.

## Mises à jour

Votre gestionnaire de userscripts cherche une nouvelle version à son rythme, sur
la branche `main` de ce dépôt. **Rechercher des mises à jour**, en bas des
réglages, le demande tout de suite et, s'il y a du nouveau, ouvre le nouveau
script dans votre gestionnaire : confirmez-le là-bas et rechargez la page.

## Désinstallation

Supprimez le script dans votre gestionnaire de userscripts. Rien d'autre n'a été
installé, il n'y a donc rien d'autre à enlever.

## Signaler quelque chose

L'enveloppe en haut de la page des réglages ouvre une fenêtre pour les rapports
de bugs et les demandes, captures d'écran comprises. Le serveur d'entraide est
lié dans cette même fenêtre. Un rapport contient ce que vous avez écrit, les
captures que vous avez ajoutées, votre nom et votre identifiant Telegram pour
qu'une réponse puisse vous joindre, et la version que vous utilisez. Il ne
contient jamais de clé ni de réglage. Vous pouvez aussi [ouvrir une
issue](https://github.com/mozumidesu/ai-translate-telegram/issues) sur GitHub.

## Licence

GPL-3.0-or-later, comme AI Translate. Voir [LICENSE](../LICENSE).
