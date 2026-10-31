# Orden

**Los pendientes de tu casa, en orden.** Una app web que se instala en el iPhone como cualquier app (sin App Store), funciona sin internet y guarda todo en el teléfono.

## Cómo tenerla en el iPhone

1. **Publicarla (una sola vez)** — en GitHub, repo `inetik/domain`:
   - **Activar Actions:** como el repo es un fork de `is-a-dev/register`, GitHub trae las Actions apagadas. Entrá a la pestaña *Actions* y tocá **“I understand my workflows, go ahead and enable them”**.
   - **Apagar los workflows heredados** de is-a.dev (no sirven en tu fork y algunos corren solos): en *Actions*, entrá a cada uno — *Pull Request Labeler* (corre cada 10 minutos), *StaleBOT*, *Publish*, *Raw API* y *Validation* — y en el menú **⋯ → Disable workflow**. Dejá prendido solo **“Orden · GitHub Pages”**.
   - *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
   - *Settings → Environments → github-pages → Deployment branches:* agregá `claude/home-tasks-web-app-pi7hsu` (o mergeá a `main`).
   - *Actions → “Orden · GitHub Pages” → Run workflow* (o hacé cualquier push en `orden/`).
2. **Abrirla en Safari:** `https://inetik.github.io/domain/`
3. **Instalarla enseguida:** Compartir → **Agregar a pantalla de inicio** → Agregar. Ojo: iOS guarda por separado los datos de Safari y los de la app instalada, así que cargá tus cosas **desde la app instalada** (si ya cargaste algo en Safari: Ajustes → Guardar copia, y después Restaurar desde la app).

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
npm run dev        # http://localhost:5173/domain/
npm test           # tests unitarios (Vitest)
npm run build      # build de producción en dist/
npm run e2e        # tests end-to-end en viewport de iPhone (Playwright)
npm run icons      # regenera los íconos
```

Stack: Vite · React 19 · TypeScript · Motion · Three.js + React Three Fiber · Dexie (IndexedDB) · vite-plugin-pwa · Tailwind 4 con tokens de diseño (`src/design/tokens.css`).
