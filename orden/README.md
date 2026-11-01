# Orden

**Los pendientes de tu casa, en orden.** Una app web que se instala en el iPhone como cualquier app (sin App Store), funciona sin internet y guarda todo en el teléfono.

## Dónde vive

- **Código:** en este repo de GitHub, **privado**. Nadie más lo ve.
- **App publicada:** en Cloudflare Pages, que lee el repo privado y publica sola cada cambio que llega a `main`. Está cerrada con **Cloudflare Access**: para abrirla hay que poner tu email y el código que te llega. No aparece en buscadores.
- **Tus pendientes:** en el iPhone. No están en GitHub ni en Cloudflare.

## Cómo publicarla (una sola vez)

1. **Guardá tus datos** si ya usabas la app en la dirección vieja (`inetik.github.io/domain`): en la app, Ajustes → **Guardar copia** → Guardar en Archivos. La dirección nueva arranca de cero y después restaurás la copia.
2. **Repo privado.** En GitHub, este repo → *Settings* → al fondo, *Danger Zone*:
   - **Leave fork network**: un fork de un repo público no se puede hacer privado sin esto.
   - **Change visibility → Make private**. La página vieja de github.io se apaga sola.
3. **Cloudflare Pages.** En [dash.cloudflare.com](https://dash.cloudflare.com), con la cuenta gratis:
   1. *Workers & Pages → Create → Pages → Connect to Git*. Si te ofrece crear un Worker, buscá la pestaña o el link de **Pages**.
   2. Autorizá GitHub **solo para este repo** y elegilo.
   3. Configurá:
      | Campo | Valor |
      |---|---|
      | Project name | uno difícil de adivinar, ej. `orden-k7q2` (la app queda en `orden-k7q2.pages.dev`) |
      | Production branch | `main` |
      | Framework preset | None |
      | Build command | `npm test && npm run build` |
      | Build output directory | `dist` |
      | Root directory | `orden` |
      | Environment variable | `NODE_VERSION` = `22` |
   4. **Save and Deploy**.
4. **Login por email (Cloudflare Access).**
   1. En el panel de Cloudflare entrá a *Zero Trust*. Elegí un nombre de equipo y el plan **Free**; puede pedirte un medio de pago aunque no cobre.
   2. *Access → Applications → Add an application → Self-hosted*:
      - **Domain:** `orden-k7q2.pages.dev`. Agregá también `*.orden-k7q2.pages.dev` para las vistas previas.
      - **Session duration:** 1 month.
      - **Policy:** Action *Allow* → Include → *Emails* → tu email.
      - **Login method:** One-time PIN.
   3. Ojo: el botón *Enable access policy* dentro del proyecto de Pages protege solo las vistas previas, no la app. Por eso se crea la aplicación a mano.
5. **En el iPhone:**
   1. Abrí `https://orden-k7q2.pages.dev` en **Safari**, poné tu email y el código que te llega.
   2. Compartir → **Agregar a pantalla de inicio**.
   3. Abrila desde el ícono. Puede pedirte el código una vez más dentro de la app.
   4. Ajustes → **Restaurar copia** (si guardaste una en el paso 1).
   5. Borrá el ícono viejo de Orden.

iOS guarda por separado los datos de Safari y los de la app instalada: cargá tus cosas siempre **desde la app instalada**.

**Si algo falla con el login en la app instalada** (el código se pide en loop o el ícono sale como captura de pantalla), tenés dos salidas:
- En Access agregá otra aplicación *Self-hosted* con *Action: Bypass* solo para estas rutas, que no tienen datos tuyos: `orden-k7q2.pages.dev/manifest.webmanifest`, `orden-k7q2.pages.dev/icons/*` y `orden-k7q2.pages.dev/favicon.svg`.
- Si sigue fallando, apagá Access. La app queda solo con la dirección secreta y fuera de buscadores.

## Qué tiene

| Capa | Qué hace |
|---|---|
| **Casa 3D** | Plano isométrico (Three.js). Cada ambiente brilla con un orbe por pendiente; lo resuelto se apila como bloques. Tocá un ambiente para hacer zoom y ver sus tareas. |
| **Índice de Orden** | % de la casa resuelto, ponderado por tiempo estimado. |
| **El Capataz** | Supervisor local: te dice por dónde arrancar (urgentes, agrupar por ambiente, vuelta a la ferretería, trabajos eléctricos juntos, coordinar con Nacho, tareas trabadas, racha). |
| **¿Qué hago ahora?** | Elegís tiempo y energía → te propone una tarea con una carta que gira. |
| **Pendientes** | Deslizá → para terminar, ← para mañana. Filtros por ambiente y tipo, búsqueda, “Deshacer”. |
| **Carga rápida** | Escribí natural: `colgar espejo baño con Nacho 30min !` detecta ambiente, persona, tiempo y prioridad (`!` importante, `!!` urgente, `mañana`, `finde`, `lunes`…). |
| **Detalle** | Pasos, materiales, fotos antes/después, notas, personas, listas, fecha, historial y aviso de seguridad eléctrica. |
| **Listas** | Inteligentes (Rápidas, Prioritarias, Electricidad, Este finde, En curso, Con Nacho…) y propias con emoji y color. |
| **Ferretería** | Lista de compras armada sola con los materiales de todas las tareas; se comparte por WhatsApp. |
| **Registro** | Línea de tiempo de todo, mapa de actividad, racha, horas invertidas, progreso por ambiente. |

## Tus datos

- Viven en el teléfono (IndexedDB). Instalada en la pantalla de inicio, iOS no los borra (en Safari sin instalar, sí puede borrarlos tras una semana sin uso).
- Todo cambio queda en el **Registro**; una tarea borrada se puede restaurar tocándola ahí.
- **Copias de seguridad:** Ajustes → *Guardar copia* (elegí “Guardar en Archivos” / iCloud Drive). *Restaurar* combina o reemplaza.
- **Nube opcional (Supabase, gratis):** Ajustes → Nube. Copiás el SQL que te da la app, pegás URL + clave (la app prueba la conexión) y creás una cuenta. Sincroniza entre dispositivos con “última escritura gana”; los 13 pendientes iniciales no se duplican entre teléfonos. Las fotos quedan en el teléfono.

## Para desarrollar

```bash
cd orden
npm install
npm run dev        # http://localhost:5173/
npm test           # tests unitarios (Vitest)
npm run build      # build de producción en dist/
npm run e2e        # tests end-to-end en viewport de iPhone (Playwright)
npm run icons      # regenera los íconos
```

Stack: Vite · React 19 · TypeScript · Motion · Three.js + React Three Fiber · Dexie (IndexedDB) · vite-plugin-pwa · Tailwind 4 con tokens de diseño (`src/design/tokens.css`).
