# 🗒️ Startpage

Una página de inicio personal con forma de **tablero de sticky notes**: notas que se arrastran, se apilan, cambian de color y de tamaño, sobre un fondo animado o **tu propio video MP4**. Todo se guarda solo en tu navegador.

Sin frameworks, sin build, sin dependencias: HTML + CSS + JavaScript puro.

## ✨ Qué trae

### Widgets

| | |
|---|---|
| 📝 **Notas** · **Markdown** · ✅ **Tareas** | Texto libre (con letra manuscrita opcional), Markdown con tareas `[ ]` clickeables, y listas con festejo al terminar |
| 🖥️ **ASCII art** | Galería, editor, **texto → letras grandes** (5 estilos), **imagen → ASCII** (caracteres, bloques o braille) y efectos: monitor verde, ámbar, neón, arcoíris, hielo. El tamaño se ajusta solo a la nota |
| ✏️ **Dibujo** · 🖼️ **Imágenes** | Pizarra a mano alzada (trazos vectoriales) y fotos o galerías con pase automático |
| 🔗 **Accesos** · 📁 **Carpetas** | Mini sticky notes con el ícono de la página. Soltá un acceso sobre una carpeta para guardarlo; arrastralo afuera para sacarlo |
| 🕐 **Reloj** · 📅 **Calendario** · ⏳ **Cuenta regresiva** | Agenda con eventos (y cumpleaños que se repiten), importa `.ics`; cuenta regresiva con anillo de progreso |
| ⏱️ **Pomodoro** · 🔥 **Hábitos** | Pomodoro completo (8 alarmas, tic-tac, notificación) y rachas diarias de hábitos |
| 📚 **Wikipedia** | Un artículo al azar con su imagen principal, en el idioma que elijas (22 idiomas), que cambia solo cada 10 min, 30 min, 1 h, 6 h o 1 día (o a mano). Botones para el anterior y otro al azar |
| ☁️ **Clima** · 📰 **Noticias (RSS)** · 💵 **Cotizaciones** · 🔁 **Conversor** | Pronóstico de 5 días; titulares de más de 90 fuentes por tema (World, Business, Tech, AI & Dev, Science, Health, Climate, Sports, Culture, Long reads y en español), varias juntas en una sola nota; dólar (oficial, blue, MEP…), cripto y monedas; unidades y monedas |
| 📊 **Planilla** · 🧮 **Calculadora** · 🔍 **Buscador** | Mini Excel con fórmulas, calculadora con 6 skins y buscador con 4 motores |
| ▶️ **YouTube** · 🎧 **Sonido ambiente** | Videos como nota; lluvia, olas, viento, fuego y ruidos para concentrarse (sintetizados, sin descargar nada) |

### El tablero

- **Varios tableros** (pestañas arriba a la izquierda): Trabajo, Personal, Estudio… Doble clic para renombrar, clic derecho para más opciones, `Alt+1…9` para cambiar.
- **Deshacer / rehacer** (`Ctrl+Z` / `Ctrl+Shift+Z`) de todo: mover, tamaño, color, borrar, ordenar, carpetas…
- **Cuadrícula guía:** al mover o redimensionar aparece una cuadrícula y una sombra con el lugar exacto donde va a quedar la nota (roja si pisa otra). Al soltarla, se acomoda sola.
- **Guías de alineación:** líneas de color cuando un borde o el centro coincide con el de otra nota (y se "imanta").
- **Selección múltiple:** arrastrá sobre una zona vacía o usá `Shift+clic`. Aparece una barra para alinear, repartir, cambiar color, duplicar o borrar.
- **Zoom y vista general:** `Ctrl + rueda`, pellizco en pantallas táctiles, o los botones de abajo a la izquierda. `F` muestra todo el tablero.
- **Paleta de comandos (`Ctrl+K`):** buscá cualquier nota (de cualquier tablero, también por su contenido), agregá widgets, cambiá ajustes o buscá en la web.
- **Teclado:** `Tab` recorre las notas, flechas para moverlas, `Supr` para borrar, `Ctrl+D` duplicar. `?` muestra todos los atajos.
- **Ordenar el tablero** automáticamente, **fijar** una nota en su lugar o **plegarla** (doble clic en su barra).
- **Pegar y soltar:** pegá un enlace (acceso), una imagen (nota de imagen), un texto (nota) o un dibujo ASCII; soltá imágenes, videos (fondo) o links arrastrados desde otra pestaña.
- **Candado 🔒**, **claro / oscuro**, **paletas**, **brillo glossy**, **opacidad**, **más de 50 fuentes** (cada nota puede tener la suya), **modo ligero** y **9 colores de nota** o uno propio.
- **Fondo:** aurora animada, MP4/WebM propio, YouTube, Vimeo o cualquier página web (uno distinto para cada tema si querés).
- **Copias de seguridad** en JSON (incluyen imágenes y dibujos) y **sincronización opcional** entre computadoras con un Gist privado de GitHub.
- **Instalable y sin conexión** (PWA) cuando la publicás en GitHub Pages.
- **Animaciones** cuidadas (entrada escalonada, cambio de tablero, inclinación al arrastrar, festejos) que respetan *reducir movimiento* del sistema y el modo ligero.

## 🚀 Uso

**Recomendado:** publicala en **GitHub Pages** (pasos más abajo) y ponela como página de inicio. Así funciona todo, incluidos los videos de YouTube dentro de las notas y como fondo.

**Para probar rápido:** abrí `index.html` con doble clic. Funciona todo, salvo que YouTube no permite reproducir videos dentro de una página abierta como archivo (`file://`, muestra *Error 153*): las notas de YouTube muestran la miniatura y se abren en una ventanita.

> ⚠️ Cada dirección guarda sus notas por separado (el archivo local y GitHub Pages no comparten datos). Para pasar todo de una a otra: *Ajustes → Tus datos → Llevar a otra dirección* (copia notas y ajustes; los videos subidos hay que volver a subirlos). También podés usar *Exportar / Importar*.

### Atajos

| Tecla | Acción |
|---|---|
| `Ctrl + K` | Paleta de comandos |
| `N` | Agregar nota (con buscador) |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Deshacer / rehacer |
| Arrastrar en vacío · `Shift + clic` | Elegir varias notas |
| Flechas · `Supr` · `Ctrl + D` · `Ctrl + A` · `Esc` | Mover · borrar · duplicar · elegir todo · soltar selección |
| `Alt + 1…9` | Cambiar de tablero |
| `Ctrl + rueda` · `Ctrl +/−/0` · `F` | Zoom · 100% · ver todo |
| `L` · `T` · `?` | Candado · tema · ayuda |
| `Ctrl + V` | Pegar un enlace, una imagen o un texto crea una nota |
| Soltar un `.mp4` / una imagen | Fondo / nota de imagen |
| Doble clic en el título · en la barra | Renombrar · plegar |
| Clic derecho en una nota | Menú de la nota |

## 🎬 Videos de fondo

Cuatro formas:

1. **Subirlo** en *Ajustes → Fondo → Video → Subir MP4* (o arrastrarlo a la página). Se guarda en IndexedDB del navegador, no en el repo.
2. **Por URL** a un `.mp4` público.
3. **Desde el proyecto:** copiá el video a `assets/videos/` y en *Enlace* escribí `assets/videos/mi-video.mp4`.
4. **YouTube, Vimeo o una página web:** pegá el enlace en *Fondo → Video → Enlace*. Se reproduce silenciado y en bucle. (YouTube necesita la página publicada en GitHub Pages; algunas páginas web no permiten mostrarse dentro de otra.)

Consejos: usá MP4 (H.264) o WebM, 1080p, en bucle y sin audio; entre 5 y 30 MB va perfecto. GitHub no acepta archivos de más de 100 MB, por eso `.gitignore` excluye los videos de `assets/videos/` (borrá esa línea si querés subir uno liviano).

## 🌐 Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "Mi startpage"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/startpage.git
git push -u origin main
```

Después, en el repo: **Settings → Pages → Branch: `main` / `(root)` → Save**. En un minuto queda en `https://TU-USUARIO.github.io/startpage/`.

Para usarla como página de inicio: en Chrome/Edge, *Configuración → Al iniciar → Abrir una página específica* y pegá esa dirección.

## 🗂️ Estructura

```
startpage/
├── index.html              # Esqueleto de la página
├── css/
│   └── style.css           # Tokens de tema, notas, widgets y paneles
├── js/
│   ├── core.js             # Utilidades, íconos, guardado (localStorage + IndexedDB)
│   ├── ui.js               # Toasts, menús, diálogos y festejos
│   ├── history.js          # Deshacer / rehacer
│   ├── fonts.js            # Catálogo curado de fuentes y selector
│   ├── sound.js            # Alarmas y tic-tac sintetizados (Web Audio)
│   ├── theme.js            # Tema claro/oscuro, paletas y colores de nota
│   ├── background.js       # Aurora, video, YouTube/Vimeo/página de fondo (sin pausas)
│   ├── board.js            # Tablero: arrastrar, guías, selección, zoom, tableros, teclado
│   ├── settings.js         # Panel de ajustes, exportar/importar
│   ├── sync.js             # Sincronización opcional con un Gist de GitHub
│   ├── palette.js          # Paleta de comandos (Ctrl+K)
│   ├── app.js              # Arranque, menú "Agregar", pestañas, zoom, atajos, pegar/soltar
│   └── widgets/
│       ├── basic.js        # Nota, tareas, reloj, buscador
│       ├── link.js         # Accesos directos
│       ├── weather.js      # Clima
│       ├── sheet.js        # Planilla con fórmulas
│       ├── pomodoro.js     # Pomodoro
│       ├── youtube.js      # YouTube
│       ├── calculator.js   # Calculadora con skins
│       ├── ascii.js        # ASCII art (galería, letras grandes, imagen → ASCII)
│       ├── folder.js       # Carpetas de accesos
│       ├── markdown.js     # Nota Markdown
│       ├── calendar.js     # Calendario y agenda (.ics)
│       ├── countdown.js    # Cuenta regresiva
│       ├── habits.js       # Hábitos
│       ├── rss.js          # Noticias RSS (varios intermediarios, varias fuentes)
│       ├── rss-sources.js  # Catálogo de fuentes por tema
│       ├── wikipedia.js    # Wikipedia al azar
│       ├── rates.js        # Cotizaciones
│       ├── converter.js    # Conversor
│       ├── draw.js         # Dibujo
│       ├── image.js        # Imágenes
│       └── ambient.js      # Sonido ambiente
├── sw.js                   # Service worker (sin conexión)
├── manifest.webmanifest    # Para instalarla como app
└── assets/
    ├── icon.svg
    └── videos/             # Poné acá tus videos de fondo
```

### Agregar un widget nuevo

Creá `js/widgets/mi-widget.js`, sumalo en `index.html` antes de `background.js`, y registralo:

```js
SP.board.register('mi-widget', {
  label: 'Mi widget', icon: 'note', size: [260, 200], min: [160, 120], color: 'mint',
  create: () => ({ contador: 0 }),          // datos iniciales (se guardan solos)
  text: (note) => '',                       // opcional: texto para la búsqueda de Ctrl+K
  render(body, note, ctx) {                 // dibuja el contenido
    const b = SP.util.h('button', { text: note.data.contador });
    b.onclick = () => { note.data.contador++; b.textContent = note.data.contador; ctx.save(); };
    body.append(b);
    return () => {};                        // opcional: limpieza (timers, etc.)
  },
});
```

Y agregalo a la lista `ADD_ITEMS` en `js/app.js` para que aparezca en el menú.

## 🔒 Privacidad

Todo queda en tu navegador (`localStorage` + `IndexedDB`). Las únicas llamadas externas son las de los widgets que uses: Open-Meteo (clima), Google Favicons (íconos de accesos), BigDataCloud (nombre de tu ciudad si usás *mi ubicación*), Google Fonts / Fontshare (solo las fuentes que elegís), los videos de YouTube/Vimeo que agregues, DolarApi / CoinGecko / ExchangeRate-API (cotizaciones y conversor), los feeds RSS que elijas (si el sitio no deja leerlos directo, se prueban en orden los intermediarios públicos `rss2json.com`, `allorigins.win`, `codetabs.com` y `corsproxy.io`) la API de Wikipedia (artículos al azar) y GitHub (solo si activás la sincronización; el token queda únicamente en tu navegador y nunca se exporta).

## Licencia

MIT
