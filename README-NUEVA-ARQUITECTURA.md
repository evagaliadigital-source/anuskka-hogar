# Anushka Hogar Dashboard - Nueva Arquitectura 🎉

## ✅ PROBLEMA RESUELTO DEFINITIVAMENTE

### El Problema Original
- Vite regeneraba `src/index.tsx` constantemente
- Se perdían módulos añadidos manualmente (Presupuestos, cambios de texto)
- Se necesitaban scripts de "reparación" constantes
- Frustración continua con cambios que desaparecían

### La Solución Final
**Separación completa de HTML y código Hono:**
- HTML vive en `public/static/index.html` (NUNCA se toca por Vite)
- JavaScript vive en `public/static/app.js` (NUNCA se toca por Vite)
- `src/index.tsx` solo importa el HTML y lo sirve (Vite puede regenerarlo sin problemas)

## 🏗️ Arquitectura Nueva

```
anushka-hogar/
├── src/
│   ├── index.tsx              # Solo backend + importa HTML
│   └── routes/
│       └── presupuestos.ts    # Rutas de presupuestos separadas
├── public/
│   └── static/
│       ├── index.html         # ⭐ HTML COMPLETO (nunca se pierde)
│       ├── app.js             # ⭐ JavaScript COMPLETO (nunca se pierde)
│       ├── logo.jpg
│       └── ...
├── migrations/                # Esquema D1 database
├── wrangler.jsonc            # Config Cloudflare
└── ecosystem.config.cjs      # Config PM2
```

## 🎯 Ventajas de la Nueva Arquitectura

✅ **Persistencia Total**
- HTML y JS en `public/static/` NUNCA se tocan por builds
- Vite puede regenerar `src/index.tsx` sin afectar nada
- NO se necesitan scripts de "reparación"

✅ **Simplicidad**
- Un solo archivo HTML con TODO el contenido
- Un solo archivo JS con TODA la lógica
- Fácil de mantener y modificar

✅ **Funcionalidad Completa**
- ✅ Presupuestos incluido de fábrica
- ✅ "Personal" en vez de "Empleadas"
- ✅ "Top Empleadas" eliminado
- ✅ Todos los módulos funcionando

## 📋 Módulos Incluidos

1. **Dashboard** - KPIs y gráficos
2. **Presupuestos** - Sistema completo con PDF
3. **Clientes** - Gestión de clientes
4. **Trabajos** - Gestión de servicios
5. **Personal** - Gestión de empleadas (antes "Empleadas")
6. **Stock** - Control de inventario
7. **Facturación** - Gestión de facturas
8. **Reportes** - Análisis mensuales

## 🚀 Desarrollo

### Build y Start
```bash
# Build del proyecto
npm run build

# Iniciar servidor de desarrollo
pm2 start ecosystem.config.cjs

# Ver logs
pm2 logs --nostream

# Reiniciar
pm2 restart anushka-hogar
```

### Hacer Cambios

#### Cambios en HTML (navegación, estructura):
```bash
# Editar directamente
nano public/static/index.html

# NO necesitas rebuild, solo:
pm2 restart anushka-hogar
```

#### Cambios en JavaScript (lógica, funciones):
```bash
# Editar directamente
nano public/static/app.js

# NO necesitas rebuild, solo:
pm2 restart anushka-hogar
```

#### Cambios en Backend (APIs, rutas):
```bash
# Editar
nano src/index.tsx
# o
nano src/routes/presupuestos.ts

# SÍ necesitas rebuild:
npm run build
pm2 restart anushka-hogar
```

## 🔧 Comandos Útiles

```bash
# Test APIs
curl http://localhost:3000/api/clientes
curl http://localhost:3000/api/presupuestos
curl http://localhost:3000/api/dashboard

# Test HTML contiene presupuestos
curl -s http://localhost:3000/ | grep -c "Presupuestos"

# Test HTML contiene "Personal"
curl -s http://localhost:3000/ | grep -c "Personal"

# Test NO contiene "Top Empleadas"
curl -s http://localhost:3000/ | grep -c "Top Empleadas"  # Debe ser 0
```

## 🎨 Cambios de Texto Aplicados

✅ **"Empleadas" → "Personal"** en:
- Botón de navegación
- Título de la página
- Botón "Nueva Empleada" → "Nuevo Personal"

✅ **Eliminado:**
- Sección "Top Empleadas del Mes" del dashboard

✅ **Incluido permanentemente:**
- Botón "Presupuestos" en navegación (segundo botón)
- Tab completo de Presupuestos con formulario
- API endpoints `/api/presupuestos/*`
- Funcionalidad de descarga PDF

## 📊 Base de Datos

### D1 Database Local
```bash
# Aplicar migraciones
wrangler d1 migrations apply anushka-hogar-production --local

# Cargar datos de prueba
wrangler d1 execute anushka-hogar-production --local --file=seed-simple.sql

# Resetear database
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
npm run db:seed
```

## 🌐 URLs

### Desarrollo Local
- **Dashboard**: http://localhost:3000
- **API Base**: http://localhost:3000/api/
- **Clientes**: http://localhost:3000/api/clientes
- **Presupuestos**: http://localhost:3000/api/presupuestos

### Producción (Sandbox)
- **URL Pública**: https://3000-igloyhvlo0thgdvq5z280-8f57ffe2.sandbox.novita.ai

## ⚡ Performance

### Primera Carga
- HTML: ~15KB (inline completo)
- app.js: ~95KB (toda la lógica)
- Chart.js: ~220KB (CDN)
- Total: ~330KB inicial

### Cacheable
- ✅ app.js (browser cache)
- ✅ Chart.js (CDN cache)
- ✅ TailwindCSS (CDN cache)
- ✅ FontAwesome (CDN cache)
- ✅ Logo (public/static/)

## 🔒 Seguridad

### Autenticación
- Email: anuskka@galia.com
- Password: Anushka2025!
- Usuario: Ana Ramos

### Tokens
- LocalStorage: `anushka_user`
- Session check en cada carga

## 📝 Próximos Pasos

Si necesitas agregar un nuevo módulo (ej: "Proveedores"):

1. **Agregar HTML** en `public/static/index.html`:
```html
<!-- Botón navegación -->
<button onclick="showTab('proveedores')" class="tab-button ...">
  <i class="fas fa-truck mr-2"></i>Proveedores
</button>

<!-- Tab content -->
<div id="proveedores-tab" class="tab-content">
  <div class="bg-white rounded-xl shadow-md p-6">
    <h2>Gestión de Proveedores</h2>
    <div id="proveedores-lista"></div>
  </div>
</div>
```

2. **Agregar JavaScript** en `public/static/app.js`:
```javascript
// En showTab() switch:
case 'proveedores':
  loadProveedores()
  break

// Nueva función:
async function loadProveedores() {
  const { data } = await axios.get(`${API}/proveedores`)
  // ... renderizar ...
}
```

3. **Agregar Backend** en `src/index.tsx`:
```typescript
app.get('/api/proveedores', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM proveedores
  `).all()
  return c.json(results)
})
```

4. **Restart**:
```bash
npm run build
pm2 restart anushka-hogar
```

## 🎉 Estado Final

```
✅ Presupuestos - Incluido permanentemente
✅ Personal - Texto corregido
✅ Top Empleadas - Eliminado
✅ Clientes - Funcionando
✅ Dashboard - Gráficos OK
✅ APIs - Todas respondiendo
✅ Scripts de reparación - YA NO NECESARIOS
✅ Arquitectura - A PRUEBA DE VITE
```

## 💡 ¿Por Qué Funciona?

**Antes:**
```
Vite → Regenera src/index.tsx → Pierde cambios → 😭
```

**Ahora:**
```
Vite → Regenera src/index.tsx ✓
     → Importa public/static/index.html (intacto) ✓
     → HTML carga public/static/app.js (intacto) ✓
     → TODO FUNCIONA SIEMPRE ✓ 🎉
```

---

**Creado**: 2025-10-27
**Problema**: Presupuestos y cambios desaparecían
**Solución**: Separación HTML/JS de código Hono
**Resultado**: ✅ NUNCA MÁS SE PERDERÁN CAMBIOS
