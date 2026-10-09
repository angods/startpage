# 🗒️ Startpage

Una página de inicio personal con forma de **tablero de sticky notes**: notas que se arrastran, se apilan, cambian de color y de tamaño, sobre un fondo animado o **tu propio video MP4**. Todo se guarda solo en tu navegador.

Sin frameworks, sin build, sin dependencias: HTML + CSS + JavaScript puro.

## ✨ Qué trae

| | |
|---|---|
| 📝 **Notas** | Texto libre, con opción de letra manuscrita |
| 🔗 **Accesos directos** | Mini sticky notes con el ícono de la página (favicon automático, emoji o imagen propia) |
| ☁️ **Clima** | Buscás tu ciudad (o usás tu ubicación); pronóstico de 5 días. Usa [Open-Meteo](https://open-meteo.com), gratis y sin API key |
| 📊 **Planilla** | Mini Excel: fila de totales Σ, fórmulas `=B2*C2`, `=SUMA(B2:B9)`, `PROMEDIO`, `MIN`, `MAX`, `CONTAR`, `REDONDEAR`, `ABS` |
| ⏱️ **Pomodoro** | Tiempos editables (⚙ o clic en el número), 8 alarmas, tic-tac opcional, cuenta regresiva 3-2-1, volumen, silencio y notificación; sigue corriendo si recargás |
| ▶️ **YouTube** | Cualquier video, short o lista como nota |
| 🧮 **Calculadora** | 6 skins: Cristal, iOS oscuro, Retro LCD, Neón, Pastel y Papel. Funciona con el teclado |
| ✅ **Tareas**, 🕐 **Reloj**, 🔍 **Buscador** | Extras para completar el escritorio |

- **Apilar y ordenar:** clic en una nota la trae al frente; desde el menú `⋯` podés enviarla atrás, duplicarla o borrarla (con *Deshacer*).
- **Candado 🔒:** fija todas las posiciones para que nada se mueva por accidente.
- **Claro / oscuro:** cambia notas, interfaz y también el video (lo oscurece o aclara con un velo regulable).
- **Paletas:** Aurora, Atardecer, Océano, Bosque, Sakura y Grafito, más un color de acento a elección.
- **Brillo (glossy):** de *Mate* a *Liquid glass* (estilo Apple): reflejos en notas, botones e íconos. También podés bajar la opacidad de las notas para que se vea el fondo.
- **Fuentes:** más de 50 fuentes gratis curadas (Google Fonts y Fontshare: Inter, Geist, Satoshi, Fraunces, Instrument Serif, Clash Display, Caveat, JetBrains Mono…). Una para el texto, otra para títulos/números, y **cada nota puede tener la suya** (menú `⋯` → Fuente). Solo se descargan las que usás.
- **Modo ligero:** sin desenfoques ni animaciones, para PCs modestas.
- **Colores de nota:** 9 predefinidos (cada uno con versión clara y oscura) o cualquier color personalizado.
- **Fondo:** aurora animada por defecto; o un MP4/WebM subido, por URL o desde la carpeta del proyecto; o un **video de YouTube o Vimeo**; o **cualquier página web**. Opcionalmente, uno distinto para cada tema. El fondo nunca se queda en pausa: si el navegador lo frena, se reanuda solo.
- **Copias de seguridad:** exportar / importar tus datos en JSON desde Ajustes.

## 🚀 Uso

**Recomendado:** publicala en **GitHub Pages** (pasos más abajo) y ponela como página de inicio. Así funciona todo, incluidos los videos de YouTube dentro de las notas y como fondo.

**Para probar rápido:** abrí `index.html` con doble clic. Funciona todo, salvo que YouTube no permite reproducir videos dentro de una página abierta como archivo (`file://`, muestra *Error 153*): las notas de YouTube muestran la miniatura y se abren en una ventanita.

> ⚠️ Cada dirección guarda sus notas por separado (el archivo local y GitHub Pages no comparten datos). Para pasar todo de una a otra: *Ajustes → Tus datos → Llevar a otra dirección* (copia notas y ajustes; los videos subidos hay que volver a subirlos). También podés usar *Exportar / Importar*.

### Atajos

| Tecla | Acción |
|---|---|
| `N` | Agregar nota |
| `L` | Candado (bloquear/desbloquear) |
| `T` | Tema claro / oscuro |
| `Ctrl + V` | Pegar un enlace sobre el tablero crea un acceso directo (o una nota de YouTube) |
| Soltar un `.mp4` | Lo pone de fondo |
| Doble clic en el título | Renombrar la nota |

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
│   ├── ui.js               # Toasts, menús y diálogos
│   ├── fonts.js            # Catálogo curado de fuentes y selector
│   ├── sound.js            # Alarmas y tic-tac sintetizados (Web Audio)
│   ├── theme.js            # Tema claro/oscuro, paletas y colores de nota
│   ├── background.js       # Aurora, video, YouTube/Vimeo/página de fondo (sin pausas)
│   ├── board.js            # Tablero: arrastrar, redimensionar, apilar, candado
│   ├── settings.js         # Panel de ajustes, exportar/importar
│   ├── app.js              # Arranque, menú "Agregar", tablero inicial, atajos
│   └── widgets/
│       ├── basic.js        # Nota, tareas, reloj, buscador
│       ├── link.js         # Accesos directos
│       ├── weather.js      # Clima
│       ├── sheet.js        # Planilla con fórmulas
│       ├── pomodoro.js     # Pomodoro
│       ├── youtube.js      # YouTube
│       └── calculator.js   # Calculadora con skins
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

Todo queda en tu navegador (`localStorage` + `IndexedDB`). Las únicas llamadas externas son: Open-Meteo (clima), Google Favicons (íconos de accesos), BigDataCloud (nombre de tu ciudad si usás *mi ubicación*), Google Fonts / Fontshare (solo las fuentes que elegís) y los videos de YouTube/Vimeo que agregues.

## Licencia

MIT
