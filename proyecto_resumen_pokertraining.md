# PROYECTO_RESUMEN — PokerTraining

> Documento generado a partir de una lectura directa del código fuente actual (2026-07-11). Describe lo que existe realmente, no lo que "debería" existir.

## 1. IDENTIDAD

**PokerTraining** — una app web de Texas Hold'em de un solo jugador (héroe) contra 5 rivales controlados por una IA muy simple, ambientada en un "torneo" simulado de 500 jugadores con estructura de ciegas y tabla de premios. Es una SPA de práctica/visualización, no un motor de poker completo ni un simulador ICM real.

## 2. STACK TÉCNICO

- **Framework**: Next.js (`"next": "latest"`, App Router) + React 18/19 (`"react": "latest"`, `"react-dom": "latest"`)
- **Lenguaje**: TypeScript (`strict: true` en `tsconfig.json`)
- **Estilos**: Tailwind CSS v4.3.0 (`@tailwindcss/postcss`) + `tailwind.config.js` con paleta custom (`poker.green`, `poker.dark`, `poker.gold`) + `postcss.config.js` + `autoprefixer`
- **Animación**: GSAP (`gsap`, "latest") para reparto de cartas y cartas comunitarias
- **Iconos**: `lucide-react`
- **Utilidades**: `clsx`, `tailwind-merge` (están en dependencias pero no se usan realmente en el código — ver sección 7)
- **Frontend only**: no hay backend, ni API routes (`src/app/api` no existe), ni servidor propio más allá del de Next.js
- **Base de datos**: ninguna. No hay Prisma, ni SQLite, ni fetch a ninguna API externa. Todo el estado vive en memoria (React `useState`) y se pierde al recargar la página
- **Autenticación**: no existe
- **Cómo correr en local**:
  ```
  npm install
  npm run dev     # next dev, puerto 3000 por defecto
  npm run build   # next build
  npm run start   # next start
  ```
  Verificado: `npx tsc --noEmit` pasa sin errores sobre el estado actual del código.

## 3. ESTRUCTURA DE CARPETAS

```
PokerTraining/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Pantalla única = TODO el juego (estado, lógica de mano, UI)
│   │   ├── layout.tsx        # Layout raíz mínimo (fuente Inter, fondo oscuro)
│   │   ├── globals.css       # @tailwind base/components/utilities
│   │   └── game/page.tsx     # Ruta muerta: solo hace redirect a "/"
│   ├── components/
│   │   ├── PokerTable.tsx    # Mesa, sprites de cartas, chip stacks, pods de jugador
│   │   ├── BettingPanel.tsx  # Panel de apuestas del héroe (slider, presets, FOLD/CALL/RAISE)
│   │   └── TournamentPanel.tsx # Panel lateral: lista de 500 jugadores, premios, nivel de ciegas
│   └── lib/
│       ├── poker.ts          # Tipos, mazo, evaluador de manos, torneo, posiciones de mesa
│       └── names.ts          # 150 nombres random para rivales/jugadores del torneo
├── public/img/                # Assets que usa la app (mesa.png, cards_Poker.png, etc.) — IGNORADO por git
├── img/                        # ~26.000 capturas de pantalla de "zerospoker" (rangos preflop) — NO usado por el código
├── tailwind.config.js, postcss.config.js, tsconfig.json, next.config.mjs
```

No hay carpeta `tests/`, `pages/` (usa App Router), ni `api/`.

## 4. FUNCIONALIDADES IMPLEMENTADAS (estado real)

- **Reparto de cartas**: ✅ funciona. `startHand()` en `src/app/page.tsx:155` reparte 2 cartas por jugador con animación GSAP (`PokerTable.tsx` — `gsap.from('.dealt-card', …)`).
- **Gestión de turnos / orden de acción**: ⚠️ a medias. Hay un orden fijo (rivales 1→5 en preflop, luego héroe), no un orden posicional real de poker (no respeta "empieza a la izquierda de la BB"), y no hay re-apertura de rondas de apuestas: cada rival actúa **una sola vez** por calle, nunca reacciona a un raise posterior de otro rival o del héroe.
- **Lógica de decisión de los bots**: ⚠️ a medias — es puramente basada en umbrales + `Math.random()`, no en rangos GTO ni en el pot. Ver detalle en sección 5.
- **Estructura de ciegas / niveles / torneo**: ✅ funciona a nivel de datos. 13 niveles definidos en `BLIND_LEVELS` (`src/lib/poker.ts:56`), sube de nivel cada `HANDS_PER_LEVEL` (15) manos jugadas por el héroe. ⚠️ Pero el "torneo" de 500 jugadores es una simulación cosmética: `simulateTournamentProgress()` (`src/app/page.tsx:137`) elimina entre 1 y 3 rivales aleatorios cada mano sin jugar ninguna mano real entre ellos — no hay motor de torneo multi-mesa.
- **Sistema de fichas / stacks / apuestas**: ✅ funciona para la mesa del héroe (6 jugadores). Ciegas, all-in cap (`Math.min(bet, chips)`), bote acumulado, todo correcto en el flujo normal.
- **Detección de ganador / showdown**: ✅ funciona. `resolveWinner()` (`src/app/page.tsx:362`) evalúa las mejores 5 cartas de cada jugador activo y reparte el bote al de mayor `score`. Soporta victoria por fold de todos los rivales.
- **Interfaz de mesa**: ✅ funciona. Asientos fijos para 6 jugadores (`TABLE_POSITIONS` en `poker.ts:211`), botón de dealer (D), badges SB/BB, chip stacks direccionales hacia el centro, avatar del héroe, avatares con inicial para rivales, badges de última acción (FOLD/CHECK/CALL/RAISE), countdown circular de 30s para el héroe con auto-fold.
- **Feedback / stats / entrenamiento**: ❌ no existe. No hay ningún sistema que le diga al usuario si jugó bien o mal, ni estadísticas de VPIP/PFR, ni tracking de manos jugadas, ni comparación contra rangos GTO — pese a que el nombre del proyecto y las imágenes de `img/` (screenshots de rangos preflop de "zerospoker") sugieren que esa era la intención.
- **Autenticación / persistencia**: ❌ no existe. Todo el estado (torneo, fichas, manos) vive en memoria del componente y se pierde al recargar o cerrar la pestaña. No hay `localStorage`, cookies, ni base de datos.
- **Selector de mesa / overlay de rangos**: ✅ funciona como visual. Botón "MESA" cambia la imagen de fondo entre 3 opciones; botón "RANGOS" abre un panel lateral que simplemente muestra `img/win.png` (una imagen estática con la escalera de jugadas), no un análisis de rangos interactivo.

## 5. LÓGICA DE JUEGO — DETALLE

- **Dónde vive la lógica de una mano**: casi toda en `src/app/page.tsx`, en las funciones `startHand()` (reparto + acción preflop de rivales), `heroAction()` (fold/call/raise del héroe), `dealFlop()` y `nextPhase()` (acción de rivales en flop/turn/river), y `resolveWinner()` (showdown). No hay una máquina de estados de poker separada ni un motor reutilizable; toda la lógica está entrelazada con `setState` de React dentro de un único componente de ~730 líneas.

- **Representación de cartas/manos**: `CardData = { suit: string; value: string }` (`src/lib/poker.ts:5`), con `suit` en `'s'|'d'|'c'|'h'` y `value` en `'2'..'10','J','Q','K','A'`. El mazo (`generateDeck()`) genera las 52 combinaciones y las baraja con Fisher-Yates. No hay clase `Card`/`Hand`, son objetos planos.

- **Evaluador de manos** (`getBestHand()` + `eval5()` + `getCombos5()` en `poker.ts:113-165`): genera todas las combinaciones de 5 cartas de las 7 disponibles (2 hole + 5 comunitarias) y evalúa cada una con una función `eval5()` que detecta escalera (incluye la escalera A-5 "rueda"), color, grupos por valor (para pares/tríos/full/póker), y calcula un `score` numérico comparable para desempatar. Esto es un evaluador completo y correcto de las 10 categorías de mano estándar (de "Carta Alta" a "Escalera Real"), aunque de fuerza bruta (ineficiente para producción real, pero funciona bien a esta escala: máximo 21 combinaciones por mano).

- **Lógica de decisión de los bots (IA de rivales)** — **no hay IA real, ni rangos, ni GTO**. Es puramente heurística basada en `estimateHandStrength()` (`poker.ts:169`) + números aleatorios:
  - `estimateHandStrength()` da un score 0–1 a las 2 cartas del jugador: pares dan 0.40–1.00 según altura, combos "premium" (AK, AQ, KQ, etc.) tienen valores hardcodeados en una tabla `premiums`, el resto usa una fórmula lineal `(hi+lo-4)/24` con bonus por ser suited o conectadas.
  - **Preflop** (`page.tsx:198-220`): si `strength < 0.35`, o `strength < 0.55` con 40% de probabilidad → fold. Si `strength > 0.70` con 55% de probabilidad → sube `min(highBet * 3, chips)`. Si no → iguala la apuesta actual.
  - **Flop/Turn/River** (`page.tsx:294-308`, `dealFlop`/`nextPhase`): ya **no mira la fuerza de la mano ni las cartas comunitarias en absoluto** — es un tiro de moneda puro: 28% de foldear en flop, 18% en turn/river, resto siempre "check" (nunca apuestan ni suben post-flop). Esto significa que un rival nunca va a apostar en el flop/turn/river, solo puede foldear o pasar.
  - No hay cálculo de equity contra el rango del héroe, ni pot odds, ni position awareness real (el "orden" de actuación es fijo por índice de asiento, no por posición relativa al botón).

- **Cálculo de equity / pot odds**: no existe en ningún lado del código. `estimateHandStrength()` es la única "evaluación" preflop y es una tabla heurística fija, no un cálculo de equity real (no simula showdowns, no usa Monte Carlo ni tablas de rangos).

## 6. DATOS

Todos los datos son **hardcodeados en TypeScript**, no hay JSON externo, base de datos, ni API.

- **Ciegas** (`BLIND_LEVELS`, `poker.ts:56`):
  ```ts
  { small:25, big:50, ante:0 },
  { small:50, big:100, ante:0 },
  ...
  { small:2000, big:4000, ante:500 },
  ```
- **Premios** (`PRIZE_TABLE`, `poker.ts:72`): 20 posiciones hardcodeadas, ej. `{ position:1, prize:50000, label:'1°' }`.
- **Nombres de rivales** (`POKER_NAMES`, `src/lib/names.ts`): array estático de ~150 strings tipo `'AceHunter99'`, `'BluffKing777'`; se seleccionan sin repetir vía `generateUniqueName()`.
- **Tabla de fuerza preflop** (`premiums`, `poker.ts:186`): objeto hardcodeado `{'14-13':0.85, '14-12':0.78, ...}` (14=As, 13=Rey, etc.), usado solo por la heurística de los bots, no por el héroe.
- **Assets de imagen**: `public/img/` contiene el sprite de cartas (`cards_Poker.png`, grid 13×5), reversos, mesas, avatar del héroe. Estas imágenes **no están en el repositorio git** — `.gitignore:37` excluye explícitamente `/public/img/`, así que si alguien clona el repo desde cero, la app no tendrá cartas ni mesa visibles hasta copiar manualmente esas imágenes.
- **Carpeta `img/` en la raíz** (fuera de `src`/`public`): contiene miles de capturas de pantalla (`screencapture-zerospoker-preflop-*.png`) organizadas en subcarpetas como `1 open raise`, `2 raise over limpers`, `3 3bet-call`, `4 call vs open-push`, `5 squeeze-call`, `6 cold4bet-farha`, más una carpeta `cash games- all casinos`. Son capturas de rangos preflop de una herramienta externa ("zerospoker"), aparentemente material de referencia para futuras funcionalidades de entrenamiento de rangos — **no están conectadas al código en absoluto** (confirmado por grep, ningún archivo de `src/` las referencia).

## 7. LO QUE FALTA / PROBLEMAS CONOCIDOS

- **No hay sistema de entrenamiento/feedback real**, que es presumiblemente el objetivo del proyecto a juzgar por su nombre y por las miles de capturas de rangos en `img/`. Hoy es solo una mesa jugable contra bots muy simples, sin ningún análisis de las decisiones del usuario.
- **IA de rivales post-flop es un tiro de moneda**, no considera cartas comunitarias ni fuerza de mano — los rivales nunca apuestan ni suben después del preflop, solo check o fold. Esto rompe el realismo del entrenamiento (no se puede practicar contra un rival que farolea o value-bet).
- **El "torneo de 500 jugadores" es cosmético**: no se juegan manos reales entre los 500, solo se eliminan aleatoriamente 1-3 rivales "fuera de cámara" cada vez que el héroe termina una mano (`simulateTournamentProgress`). No hay mesas paralelas, ni ICM real, ni re-siembra de mesas cuando faltan jugadores en la mesa del héroe (los oponentes de la mesa del héroe simplemente son los primeros 5 no-eliminados de la lista, `buildTablePlayers`, sin rotar cuando alguno de esos 5 sería eliminado por la simulación de fondo — de hecho los oponentes de mesa nunca cambian ni son eliminados realmente, porque `simulateTournamentProgress` solo marca `eliminated` en `tourPlayers`, pero la mesa visual (`players`) no vuelve a llamar a `buildTablePlayers` tras la mano 0, así que los 5 rivales sentados con el héroe son siempre los mismos).
- **No hay lógica de side-pots**: si un jugador va all-in por menos que la apuesta actual, el código igual mete toda su ficha en el mismo `pot` compartido (`Math.min(currentBet, p.chips)`), sin crear un bote lateral — un jugador con más fichas que ganó el showdown se llevaría fichas que un jugador corto no podía igualar.
- **Ruta muerta**: `src/app/game/page.tsx` solo redirige a `/`, no aporta nada; posible resto de una refactorización anterior.
- **Dependencias sin uso aparente**: `clsx` y `tailwind-merge` están en `package.json` pero no se encontró ningún `import` de ellas en `src/` (búsqueda no exhaustiva pero no aparecieron en los 6 archivos fuente).
- **Versionado de dependencias en `"latest"`**: `next`, `react`, `react-dom`, `gsap`, `lucide-react`, y casi todo `devDependencies` usan `"latest"` en vez de versiones fijas — riesgo de builds no reproducibles entre máquinas/tiempo.
- **Imágenes del juego no versionadas**: `.gitignore` excluye `/public/img/` completo, así que la app depende de que esas imágenes ya existan localmente; no hay README ni script que las genere o copie desde `img/`.
- **Sin pruebas**: no existe carpeta `tests/` ni ningún archivo `*.test.ts(x)` — cero cobertura de tests automatizados.
- **Componente único gigante**: toda la lógica de juego vive en `src/app/page.tsx` (~730 líneas) mezclando estado, efectos y JSX — no hay separación entre "motor de poker" y "UI", lo que hace difícil testear la lógica de forma aislada.
