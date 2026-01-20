// Service Worker para Anushka Hogar PWA
const CACHE_VERSION = 'v2'
const CACHE_NAME = `anushka-hogar-${CACHE_VERSION}`
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`

// Archivos que se cachean al instalar
const STATIC_FILES = [
  '/',
  '/static/index.html',
  '/static/app-final.js',
  '/static/logo.jpg',
  '/static/icon-192.png',
  '/static/icon-512.png'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando v2...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📦 Service Worker: Cacheando archivos estáticos')
      return cache.addAll(STATIC_FILES).catch(error => {
        console.error('❌ Error cacheando archivos:', error)
      })
    })
  )
  
  // Forzar activación inmediata
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activado v2')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Eliminar caches antiguos
          if (!cache.includes(CACHE_VERSION)) {
            console.log('🗑️ Service Worker: Eliminando cache antiguo:', cache)
            return caches.delete(cache)
          }
        })
      )
    })
  )
  
  // Tomar control inmediatamente
  return self.clients.claim()
})

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // No cachear peticiones a la API
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(fetch(request))
  }
  
  // No cachear CDNs externos en el cache persistente
  if (url.hostname !== self.location.hostname && !url.hostname.includes('anushka-hogar')) {
    return event.respondWith(fetch(request))
  }
  
  // Estrategia: Network First para HTML, Cache First para assets
  if (request.headers.get('accept')?.includes('text/html')) {
    // Network First para páginas HTML
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clonar y cachear
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Si falla, intentar desde cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse
            
            // Página offline
            return new Response(
              `<!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sin conexión - Anushka Hogar</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                  }
                  .container {
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 400px;
                  }
                  h1 { font-size: 48px; margin: 0 0 20px 0; }
                  p { font-size: 18px; margin: 0 0 30px 0; }
                  button {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: transform 0.2s;
                  }
                  button:hover { transform: scale(1.05); }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📵 Sin conexión</h1>
                  <p>No hay conexión a Internet.<br>Por favor, verifica tu conexión.</p>
                  <button onclick="location.reload()">🔄 Reintentar</button>
                </div>
              </body>
              </html>`,
              {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              }
            )
          })
        })
    )
  } else {
    // Cache First para assets (JS, CSS, imágenes)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        
        return fetch(request).then((response) => {
          // Solo cachear respuestas válidas
          if (!response || response.status !== 200 || response.type === 'error') {
            return response
          }
          
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
          
          return response
        })
      })
    )
  }
})

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('🚀 Service Worker v2: Cargado correctamente')
