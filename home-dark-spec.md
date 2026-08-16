# CodeTyper — Home Screen (DARK Mode) Design Spec

Objetivo: que la home dark tenga la MISMA lógica de zonas por recuadros y tonos que ya aplicamos en el Settings dark — ahora mismo todo es un negro plano sin cajas que separen category/idioma/dificultad/snippets del fondo.

Regla: **navbar = chrome (un tono más claro que el fondo); fondo del body = el más oscuro; cada sección (comments+terminal, category, idioma, difficulty, snippets) vive en una card `--ctd-surface` con borde sutil + sombra; los controles activos se rellenan con su acento atenuado + glow**, igual que en Settings.

Reutiliza los tokens de `settings-modal-dark.css` (`--ctd-*`); no dupliques valores, solo aplícalos aquí.

---

## 1. Zonas

| Parte | Background | Borde | Nota |
|-------|-----------|-------|------|
| Navbar superior | `--ctd-modal-chrome` (`#1b212b`) | inferior `--ctd-border` (`#2a313c`) | chrome, como el header de Settings |
| Fondo del body / main | `--ctd-modal-body` (`#0e1218`) | — | lo más oscuro |
| **Card: comments + TERMINAL** | `--ctd-surface` (`#1c222c`) | `1px solid --ctd-border-card` | elevada, sombra `--ctd-shadow-card` |
| **Card: category** | `--ctd-surface` | igual | contiene los 3 pills |
| **Card: selecciona lenguaje** | `--ctd-surface` | igual | contiene los chips |
| **Card: difficulty** | `--ctd-surface` | igual | contiene los pills |
| **Cards de snippet** | `--ctd-surface`, borde superior de color por nivel | sombra elevada + hover | como ya están, pero un pelín más claras que el fondo para que no se fundan |

Cada card lleva su etiqueta `// category`, `// difficulty`, etc. en una franja superior tipo `--ctd-modal-cardhead` (`#171c24`) con borde inferior `#262d38`, igual que en Settings.

---

## 2. Botones / pills (dentro de las cards)

Reposo (igual que `.seg` de Settings dark):
```
background:#222a35; color:#c2cad6; border:1px solid #3a4453; border-radius:9px;
box-shadow:0 2px 6px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3);
```

Activo — rellena con el acento atenuado + glow, mismo patrón que Settings:
- **Categoría activa** (Programación/Idiomas/Mentalidad): azul `#2f6fed` → bg `rgba(47,111,237,.18)`, texto `#7aa6ff`, borde `#2f6fed`, glow `0 0 0 1px rgba(47,111,237,.5), 0 3px 10px rgba(47,111,237,.3)`.
- **Lenguaje activo** (ej. JavaScript): ámbar `#b8791b` → bg `rgba(184,121,27,.16)`, texto `#e6ad46`, borde `#b8791b`, glow igual patrón.
- **Dificultad activa** (BEGINNER): igual ámbar que el lenguaje (mantener el que ya tiene el diseño actual).
- Usa `data-variant` (`category|lang|difficulty`) si el JSX lo permite, igual que hicimos en settings.

---

## 3. Barra de comments + botón TERMINAL
- Card contenedora: `--ctd-surface`, borde `--ctd-border-card`, sombra `--ctd-shadow-card`.
- Pill `// OFF — sin comentarios`: mismo estilo `.seg` en reposo.
- Botón **TERMINAL**: mantiene su borde rojo/vino actual pero con sombra de profundidad: `box-shadow:0 4px 14px rgba(220,38,38,.35)` (o el rojo que ya usa), para que se note elevado, no solo un borde plano.

---

## 4. Cards de snippet
- Fondo `--ctd-surface`, un paso más claro que el body para que no se fundan con el fondo.
- Borde `1px solid --ctd-border-card`; borde superior 3px del color de nivel (verde `beginner`).
- Sombra `--ctd-shadow-card`; en hover, `translateY(-3px)` + glow verde `0 10px 26px rgba(21,151,78,.22)`.
- Badge de nivel (`beginner`): bg `rgba(21,151,78,.18)`, texto `#4cd08a`, borde `#15974e` (mismo patrón "activo" que el resto).

---

## 5. Navbar
- Fondo `--ctd-modal-chrome`, borde inferior `--ctd-border`.
- Botón **"editor"** activo: azul con relleno atenuado + borde, igual patrón que arriba.
- **"teclado off"**: si está OFF, usar rosa (`--ctd-rose`) en vez del rojo actual, para ser coherente con el código ON=verde/OFF=rosa que ya usamos en Settings; si prefieres mantener el rojo de alerta porque es una acción "apagar sonido", está bien dejarlo, indícalo como excepción.
- Iconos ⚙/🎧/❓ + slider de música/ambient: mismo tratamiento `.seg` con sombra sutil, en vez de planos.
- Botón sol (toggle claro/oscuro): recuadro `--ctd-seg` con sombra `--ctd-shadow-seg`.

---

## 6. Resumen de sombras a aplicar
- Card de sección: `--ctd-shadow-card` (`0 4px 14px rgba(0,0,0,.42), 0 1px 3px rgba(0,0,0,.3)`)
- Pills/botones: `--ctd-shadow-seg` (`0 2px 6px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)`)
- Activo: `0 0 0 1px <color>55, 0 3px 10px <color>33` (glow, igual que Settings)
- Snippet hover: `0 10px 26px rgba(21,151,78,.22)`

Con esto la home dark queda con el mismo lenguaje visual que Settings: recuadros que diferencian zonas, tonos que suben un escalón de claridad por elevación, y glow de color en lo activo — en vez del negro plano actual.
