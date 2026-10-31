import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Si se publicó una versión nueva mientras la app estaba abierta, un archivo viejo puede
// no existir más: recargamos para tomar la versión nueva en vez de romper la pantalla.
window.addEventListener('vite:preloadError', () => window.location.reload())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
