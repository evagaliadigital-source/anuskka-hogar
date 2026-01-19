// Service Worker para Anushka Hogar PWA
const CACHE_NAME = 'anushka-hogar-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

// Archivos que se cachean al instalar
const STATIC_FILES = [
  '/',
  '/static/index.html',
  '/static/app-final.js',
  '/static/logo.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📦 Service Worker: Cacheando archivos estáticos')
      return cache.addAll(STATIC_FILES)
    })
  )
  
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activado')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('🗑️ Service Worker: Eliminando cache antiguo:', cache)
            return caches.delete(cache)
          }
        })
      )
    })
  )
  
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
  
  // Estrategia: Cache First, luego Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Encontrado en cache
        return cachedResponse
      }
      
      // No está en cache, hacer fetch
      return fetch(request).then((response) => {
        // No cachear respuestas no válidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }
        
        // Clonar la respuesta
        const responseToCache = response.clone()
        
        // Guardar en cache dinámico
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache)
        })
        
        return response
      }).catch((error) => {
        console.error('❌ Service Worker: Error en fetch:', error)
        
        // Si falla y es una página HTML, mostrar página offline
        if (request.headers.get('accept').includes('text/html')) {
          return new Response(
            `
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sin conexión - Anushka Hogar</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
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
            </html>
            `,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          )
        }
        
        throw error
      })
    })
  )
})

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('🚀 Service Worker: Cargado correctamente')
