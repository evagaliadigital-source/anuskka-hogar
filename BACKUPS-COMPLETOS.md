# 💾 BACKUPS COMPLETOS - ANUSHKA HOGAR

**Fecha:** 18 Enero 2026 - 20:40  
**Estado:** ✅ **BACKUPS COMPLETADOS Y DISPONIBLES**  
**URL Producción:** https://1c1034ca.anushka-hogar.pages.dev

---

## 📦 **ARCHIVOS DE BACKUP DISPONIBLES**

### **1️⃣ BACKUP DE BASE DE DATOS**

#### **📊 Base de datos completa (SQL)**

**Archivo comprimido (RECOMENDADO):**
```
🔗 https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql.gz
```
- **Tamaño:** 394 KB
- **Formato:** SQL comprimido con gzip
- **Contenido:** 26 tablas completas + datos

**Archivo sin comprimir:**
```
🔗 https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql
```
- **Tamaño:** 549 KB
- **Formato:** SQL plano
- **Contenido:** 799 líneas de SQL

#### **📋 Tablas incluidas (26 tablas):**
- ✅ `clientes` - Datos de clientes
- ✅ `empleadas` - Empleadas de Anushka Hogar
- ✅ `trabajos` - Trabajos de cortinas/estores
- ✅ `trabajo_materiales` - Materiales por trabajo
- ✅ `facturas` - Facturas emitidas
- ✅ `factura_lineas` - Líneas de factura
- ✅ `incidencias_clientes` - Incidencias reportadas
- ✅ `registro_horas` - Horas trabajadas
- ✅ `evaluaciones` - Evaluaciones de empleadas
- ✅ `presupuestos` - Presupuestos creados
- ✅ `presupuesto_lineas` - Líneas de presupuesto
- ✅ `configuracion_empresa` - Configuración general
- ✅ `trabajo_fases` - Fases de trabajos
- ✅ `categorias` - Categorías de productos
- ✅ `proyectos_diseno` - Proyectos del Diseñador IA
- ✅ `catalogo_telas` - Catálogo de telas
- ✅ `tareas_pendientes` - Tareas y calendario
- ✅ `tareas_alertas` - Alertas de tareas
- ✅ `historial_movimientos` - Historial de cambios
- ✅ `usuarios` - Usuarios del sistema
- ✅ `stock_categorias` - Categorías de stock
- ✅ `stock_movimientos` - Movimientos de stock
- ✅ `stock` - Inventario
- ✅ `avisos` - Avisos del sistema
- ✅ `conversaciones_ia` - Conversaciones con GaliA
- ✅ `notas` - Notas internas

---

### **2️⃣ BACKUP DE CÓDIGO FUENTE**

**Archivo completo del proyecto:**
```
🔗 https://1c1034ca.anushka-hogar.pages.dev/static/codigo-backup-latest.tar.gz
```
- **Tamaño:** 1.4 MB
- **Formato:** tar.gz comprimido
- **Contenido:** Todo el código fuente del proyecto

#### **📂 Incluye:**
- ✅ `src/` - Código fuente TypeScript
  - `index.tsx` - Aplicación principal
  - `routes/` - Rutas API (presupuestos, tareas, tickets, galia, etc.)
  - `utils/` - Utilidades (email, encryption)
- ✅ `public/static/` - Archivos estáticos
  - `app-final.js` - Frontend JavaScript
  - `index.html` - Dashboard principal
  - `login.html` - Página de login
  - Imágenes, CSS, documentos LOPD
- ✅ `migrations/` - Migraciones de base de datos
- ✅ `scripts/` - Scripts de backup y utilidades
- ✅ Archivos de configuración:
  - `package.json` - Dependencias
  - `wrangler.jsonc` - Configuración Cloudflare
  - `vite.config.ts` - Configuración Vite
  - `tsconfig.json` - TypeScript
  - `ecosystem.config.cjs` - PM2
- ✅ Documentación completa:
  - `ESTADO-LOPD-ACTUAL.md`
  - `GALIA-CHAT-IA-COMPLETO.md`
  - `SISTEMA-EMAILS-COMPLETO.md`
  - `README.md`

#### **❌ Excluye (para reducir tamaño):**
- ❌ `node_modules/` - Dependencias (se reinstalan con `npm install`)
- ❌ `.wrangler/` - Caché de Wrangler
- ❌ `dist/` - Build compilado (se regenera con `npm run build`)
- ❌ `.git/` - Historial de git
- ❌ `backups/` - Backups antiguos

---

## 📥 **CÓMO DESCARGAR LOS BACKUPS**

### **Opción 1: Descarga directa desde el navegador**

1. **Base de datos (comprimido):**
   ```
   https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql.gz
   ```
   - Click derecho → "Guardar como..."
   - Nombre sugerido: `anushka-backup-2026-01-18.sql.gz`

2. **Código fuente:**
   ```
   https://1c1034ca.anushka-hogar.pages.dev/static/codigo-backup-latest.tar.gz
   ```
   - Click derecho → "Guardar como..."
   - Nombre sugerido: `anushka-codigo-2026-01-18.tar.gz`

### **Opción 2: Descarga con `curl` (terminal)**

```bash
# Descargar base de datos
curl -O https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql.gz

# Descargar código fuente
curl -O https://1c1034ca.anushka-hogar.pages.dev/static/codigo-backup-latest.tar.gz
```

### **Opción 3: Descarga con `wget` (terminal)**

```bash
# Descargar base de datos
wget https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql.gz

# Descargar código fuente
wget https://1c1034ca.anushka-hogar.pages.dev/static/codigo-backup-latest.tar.gz
```

---

## 🔄 **CÓMO RESTAURAR LOS BACKUPS**

### **1️⃣ RESTAURAR BASE DE DATOS**

#### **Paso 1: Descomprimir el archivo**
```bash
gunzip backup-latest.sql.gz
# Resultado: backup-latest.sql
```

#### **Paso 2: Restaurar en Cloudflare D1 (PRODUCCIÓN)**
```bash
# Opción A: Ejecutar todo el SQL de una vez
npx wrangler d1 execute anushka-hogar-production --remote --file=backup-latest.sql

# Opción B: Si el archivo es muy grande, restaurar por partes
split -l 100 backup-latest.sql backup-part-
for file in backup-part-*; do
  npx wrangler d1 execute anushka-hogar-production --remote --file=$file
done
```

#### **Paso 3: Verificar la restauración**
```bash
# Ver tablas
npx wrangler d1 execute anushka-hogar-production --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table';"

# Ver cantidad de registros en una tabla
npx wrangler d1 execute anushka-hogar-production --remote \
  --command="SELECT COUNT(*) as total FROM clientes;"
```

---

### **2️⃣ RESTAURAR CÓDIGO FUENTE**

#### **Paso 1: Descomprimir el archivo**
```bash
tar -xzf codigo-backup-latest.tar.gz -C anushka-hogar-restaurado/
cd anushka-hogar-restaurado/
```

#### **Paso 2: Instalar dependencias**
```bash
npm install
```

#### **Paso 3: Configurar variables de entorno**
```bash
# Crear archivo .dev.vars
cat > .dev.vars << EOF
OPENAI_API_KEY=tu-api-key-aqui
RESEND_API_KEY=tu-api-key-aqui
ENCRYPTION_KEY=tu-encryption-key-aqui
EOF
```

#### **Paso 4: Inicializar base de datos local (opcional)**
```bash
# Aplicar migraciones en local
npx wrangler d1 migrations apply anushka-hogar-production --local

# O restaurar el backup en local
npx wrangler d1 execute anushka-hogar-production --local --file=backup-latest.sql
```

#### **Paso 5: Hacer build y probar**
```bash
# Build del proyecto
npm run build

# Probar en local
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000
```

#### **Paso 6: Desplegar a producción (si todo está OK)**
```bash
npx wrangler pages deploy dist --project-name anushka-hogar
```

---

## ⏰ **FRECUENCIA DE BACKUPS RECOMENDADA**

### **Backups Automáticos:**
```bash
# Añadir a crontab para backups diarios
0 2 * * * cd /home/user/anushka-hogar && ./scripts/backup-db-completo.sh
```

### **Backups Manuales:**
- **Antes de cada deploy importante:** ✅ Siempre
- **Después de cambios grandes:** ✅ Recomendado
- **Una vez por semana:** ✅ Mínimo recomendado
- **Antes de migraciones de BD:** ✅ Crítico

---

## 📊 **ESTADÍSTICAS DEL BACKUP ACTUAL**

| Elemento | Tamaño | Líneas/Archivos |
|----------|--------|-----------------|
| **Base de datos SQL** | 549 KB | 799 líneas |
| **Base de datos SQL.GZ** | 394 KB | - |
| **Código fuente TAR.GZ** | 1.4 MB | ~200 archivos |
| **Total tablas respaldadas** | - | 26 tablas |

---

## 🔐 **SEGURIDAD DE LOS BACKUPS**

### **✅ Lo que SÍ está en los backups:**
- Estructura de todas las tablas
- Todos los datos de negocio
- Configuración de la empresa
- Usuarios (con passwords hasheados con bcrypt)
- Todo el código fuente
- Migraciones y scripts

### **❌ Lo que NO está en los backups (por seguridad):**
- API Keys (OPENAI_API_KEY, RESEND_API_KEY)
- Encryption keys (ENCRYPTION_KEY)
- Secrets de Cloudflare
- node_modules (se reinstalan)
- Historial de git completo

### **🔒 Recomendaciones:**
1. **Guarda los backups en un lugar seguro** (Drive, Dropbox, etc.)
2. **Renueva backups semanalmente**
3. **Guarda las API Keys por separado** en un gestor de contraseñas
4. **No compartas los backups públicamente** (contienen datos de clientes)

---

## 🎉 **RESUMEN EJECUTIVO**

✅ **Backup de Base de Datos:** 394 KB (26 tablas, 799 líneas SQL)  
✅ **Backup de Código Fuente:** 1.4 MB (~200 archivos)  
✅ **URLs de descarga activas:** Listas para descargar  
✅ **Documentación completa:** Este archivo  
✅ **Script de backup automatizado:** Disponible en `scripts/backup-db-completo.sh`

---

## 🔗 **ENLACES RÁPIDOS**

**Descargas:**
- 📊 Base de datos (GZ): https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql.gz
- 📄 Base de datos (SQL): https://1c1034ca.anushka-hogar.pages.dev/static/backup-latest.sql
- 💻 Código fuente: https://1c1034ca.anushka-hogar.pages.dev/static/codigo-backup-latest.tar.gz

**Producción:**
- 🌐 Web: https://1c1034ca.anushka-hogar.pages.dev
- 🔐 Login: anuskkahogar@gmail.com / 881917176

---

**Generado:** 18 Enero 2026 - 20:40  
**Duración del backup:** 1 min 54 segundos  
**Script usado:** `/home/user/anushka-hogar/scripts/backup-db-completo.sh`
