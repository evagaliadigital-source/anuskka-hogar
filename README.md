# Anushka Hogar - Dashboard de Gestión Integral

## 🏠 Descripción del Proyecto

**Anushka Hogar** es un sistema completo de gestión para empresas de servicios domésticos y mantenimiento del hogar. Permite gestionar clientes, trabajos, stock, empleadas, facturación y obtener reportes automáticos con métricas clave.

## ✨ Características Completadas

### 📋 Sistema de Tareas Completo (NUEVO)
- **3 Vistas interactivas**:
  - 📝 **Vista Lista**: Tareas con filtros y acciones rápidas
  - 📊 **Vista Kanban**: Drag & drop entre estados (pendiente/proceso/completada)
  - 📅 **Vista Calendario**: Calendario mensual con tareas por día
- **Gestión completa**:
  - Crear, editar y eliminar tareas
  - Asignar tareas a usuarios (Ana Ramos, Tienda)
  - Prioridades: 🔥 Alta / 🟡 Media / 🟢 Baja
  - Estados: Pendiente / En Proceso / Completada
  - Fechas límite con recordatorios configurables
- **Sistema de alertas automáticas**:
  - Recordatorios X minutos antes del vencimiento
  - Integración con sistema de avisos (campana 🔔)
  - Endpoint automático para procesar alertas: POST `/api/tareas/alertas/procesar`
- **Estadísticas en header**: Pendientes, En Proceso, Urgentes (alta prioridad)
- **Filtros avanzados**: Por prioridad, asignado, estado
- **Kanban drag & drop**: Arrastra tareas entre columnas para cambiar estado
- **Calendario interactivo**: Click en cualquier día para ver tareas

### 🤖 Consultor IA - GALI
- **Agente especializado** integrado en el sistema
- **4 áreas de expertise**:
  - 🪡 Negocio de cortinas (metraje, confección, instalación)
  - 📄 Facturación y VerificaTu
  - 👥 Gestión de clientes y ventas
  - 🛠️ Uso de la herramienta Anushka Hogar
- **Chat interactivo** con respuestas contextuales
- **Preguntas rápidas** predefinidas para acceso rápido
- **Formato markdown** en respuestas (negritas, listas, enlaces)
- **Acceso universal** (disponible para todos los roles)
- Ver documentación completa: [GALI_CONSULTOR_IA.md](./GALI_CONSULTOR_IA.md)

### 🔐 Sistema de Autenticación y Roles
- **NUEVO**: Sistema de roles completo (Ana Ramos 👑 vs Tienda 🏪)
- **NUEVO**: Contraseña adicional "1984" para Ana Ramos (recordable por navegador)
- **NUEVO**: Pestañas sensibles invisibles para rol Tienda
- **NUEVO**: Control de permisos basado en rol
- Login con email y contraseña
- Sesión persistente en localStorage con información de rol
- Protección de rutas (redirección automática)
- Botón de logout en header
- Página de login profesional con diseño moderno
- Toggle de visibilidad de contraseña

### 📊 Panel de Control (Dashboard)
- KPIs en tiempo real: ingresos, trabajos activos, stock bajo, horas trabajadas, satisfacción
- Gráficos interactivos con Chart.js (trabajos por estado, ingresos diarios)
- Ranking de top empleadas del mes
- Vista general del rendimiento del negocio

### 👥 Gestión de Clientes
- Alta, edición y visualización de clientes
- Historial completo de servicios realizados
- Registro de facturas asociadas
- Sistema de incidencias y notas
- Datos de contacto y ubicación

### 💼 Gestión de Trabajos
- Creación de órdenes de trabajo
- Asignación de empleadas a trabajos
- Estados: pendiente, en proceso, completado, cancelado
- Prioridades: baja, normal, alta, urgente
- Calendario de trabajos programados
- Filtros por estado y fecha
- Registro de costes y tiempos
- Evaluación de satisfacción del cliente

### 📦 Control de Stock
- Inventario completo de materiales y herramientas
- **NUEVO**: Sistema de categorías dinámicas con colores e iconos
- **NUEVO**: Gestión CRUD completa de categorías
- **NUEVO**: Filtrado por categoría en inventario
- **NUEVO**: Creación de productos directamente desde categorías
- Alertas automáticas de stock bajo
- Gestión de proveedores
- Control de cantidades mínimas
- Categorización por tipo de producto
- Asignación de materiales a trabajos

### 👷 Gestión de Empleadas
- Datos personales y profesionales
- Especialidades y calificaciones
- Control de horas trabajadas
- Registro de disponibilidad
- Sistema de evaluaciones
- Historial de trabajos completados
- Cálculo de costes por empleada

### 💰 Facturación
- Generación de facturas automáticas
- Numeración correlativa
- Estados: pendiente, pagada, vencida
- Asociación a clientes y trabajos
- Cálculo automático de IVA
- Registro de métodos de pago

### 📈 Reportes Mensuales
- Resumen financiero (ingresos, pendientes)
- Estadísticas de trabajos completados
- Horas trabajadas por empleada
- Servicios más demandados
- Análisis de satisfacción de clientes
- Filtrado por mes personalizado

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Backend**: Hono Framework (TypeScript)
- **Base de Datos**: Cloudflare D1 (SQLite distribuido)
- **Frontend**: HTML5 + TailwindCSS + Vanilla JavaScript
- **Gráficos**: Chart.js
- **Icons**: Font Awesome
- **Deploy**: Cloudflare Pages
- **HTTP Client**: Axios

### Estructura de Base de Datos
- `usuarios` - Sistema de autenticación con roles
- `categorias` - **NUEVO** - Categorías dinámicas para stock (colores, iconos, orden)
- `tareas_pendientes` - **NUEVO** - Sistema de tareas con alertas
- `tareas_alertas` - **NUEVO** - Recordatorios automáticos de tareas
- `clientes` - Información de clientes
- `empleadas` - Datos de empleadas
- `trabajos` - Órdenes de trabajo
- `stock` - Inventario de materiales (ahora con categoria_id)
- `trabajo_materiales` - Materiales usados en trabajos
- `facturas` - Facturación
- `incidencias_clientes` - Sistema de incidencias
- `registro_horas` - Control horario
- `evaluaciones` - Evaluaciones de empleadas

### API REST Endpoints
**Autenticación**: POST `/api/login`
**Consultor IA**: POST `/api/chat`
**Tareas**: GET, POST, PUT, DELETE `/api/tareas` - **NUEVO**
  - GET `/api/tareas/contador` - Contadores de tareas
  - GET `/api/tareas/calendario/mes` - Vista mensual
  - GET `/api/tareas/calendario/dia` - Tareas de un día
  - GET `/api/tareas/calendario/semana` - Tareas de rango
  - POST `/api/tareas/alertas/procesar` - Procesar alertas automáticas
  - PUT `/api/tareas/:id/estado` - Cambiar estado rápido
**Categorías**: GET, POST, PUT, DELETE `/api/categorias`
**Clientes**: GET, POST, PUT `/api/clientes`
**Empleadas**: GET, POST, PUT `/api/empleadas`
**Trabajos**: GET, POST, PUT `/api/trabajos`
**Stock**: GET (con filtro categoria_id), POST, PUT `/api/stock`
**Facturas**: GET, POST `/api/facturas`
**Dashboard**: GET `/api/dashboard`
**Reportes**: GET `/api/reportes/mensual`

## 🚀 Deployment Local

### Requisitos Previos
- Node.js 18+
- npm
- wrangler CLI

### Instalación y Ejecución

```bash
# 1. Inicializar base de datos local
npm run db:migrate:local

# 2. Cargar datos de ejemplo
npm run db:seed

# 3. Compilar el proyecto
npm run build

# 4. Iniciar servidor de desarrollo (PM2)
pm2 start ecosystem.config.cjs

# 5. Verificar funcionamiento
npm test

# 6. Ver logs
pm2 logs anushka-hogar --nostream

# 7. Detener servidor
pm2 delete anushka-hogar
```

### Comandos Útiles

```bash
# Resetear base de datos
npm run db:reset

# Ver estado de PM2
pm2 list

# Limpiar puerto 3000
npm run clean-port

# Ejecutar consulta SQL local
npx wrangler d1 execute anushka-hogar-production --local --command="SELECT * FROM clientes"
```

## 🔐 Credenciales de Acceso

**IMPORTANTE**: El sistema ahora requiere login con sistema de roles

### 👑 Ana Ramos (Propietaria - Acceso Total)
- **Email**: anuskka@galia.com
- **Contraseña**: Anushka2025!
- **Contraseña Adicional**: 1984 (recordable por navegador)
- **Acceso**: 8 pestañas completas (Dashboard, Clientes, Presupuestos, Trabajos, Stock, Personal, Facturación, Reportes)

### 🏪 Tienda (Acceso Limitado)
- **Email**: anuskka@galia.com
- **Contraseña**: Anushka2025!
- **Sin contraseña adicional**
- **Acceso**: 5 pestañas operativas (Dashboard, Clientes, Presupuestos, Trabajos, Stock)
- **Pestañas ocultas**: Personal, Facturación, Reportes

### Página de Login
- **URL**: /static/login.html (auto-redirige si no estás logueado)
- **Características**:
  - ✅ Selector de rol (Ana Ramos 👑 / Tienda 🏪)
  - ✅ Contraseña adicional solo para Ana Ramos
  - ✅ Toggle para mostrar/ocultar contraseña
  - ✅ Validación de email, contraseña y rol
  - ✅ Sesión guardada en localStorage con rol
  - ✅ Botón de logout en el header
  - ✅ Protección de rutas (requiere login)
  - ✅ Tabs sensibles invisibles para Tienda

## 🌐 URLs del Proyecto

### Desarrollo Local
- **Login**: http://localhost:3000/static/login.html
- **Dashboard**: http://localhost:3000 (requiere login)
- **API Base**: http://localhost:3000/api

### Sandbox Environment (ACTIVO ✅)
- **URL Login**: https://3000-igloyhvlo0thgdvq5z280-8f57ffe2.sandbox.novita.ai/static/login.html
- **URL Dashboard**: https://3000-igloyhvlo0thgdvq5z280-8f57ffe2.sandbox.novita.ai
- **Estado**: Online y funcionando
- **Base de datos**: D1 local con datos de ejemplo cargados

### Producción (Para deploy futuro)
- **Comando**: `npm run deploy:prod`
- **URL**: Se generará en Cloudflare Pages
- **Formato**: https://anushka-hogar.pages.dev

## 📊 Modelos de Datos Principales

### Cliente
- Nombre completo, teléfono, email
- Dirección, ciudad, código postal
- Notas e historial de servicios

### Trabajo
- Cliente y empleada asignada
- Tipo de servicio, descripción
- Fecha programada, duración estimada/real
- Estado, prioridad, precio
- Satisfacción del cliente

### Empleada
- Datos personales (DNI, contacto)
- Fecha contratación, salario/hora
- Especialidades, disponibilidad
- Calificación promedio

### Stock
- Nombre, categoría, descripción
- Unidad de medida
- Cantidad actual vs mínima
- Precio unitario, proveedor

## 🎨 Diseño y UX

- **Interfaz limpia y moderna** con gradientes purple-blue
- **Responsive design** compatible con tablets y desktop
- **Navegación por pestañas** para acceso rápido
- **Modales** para formularios de creación/edición
- **Badges de estado** con colores intuitivos
- **Gráficos interactivos** para visualización de datos
- **Alertas de stock bajo** con indicadores visuales
- **Toast notifications** para feedback de acciones

## 🔮 Funcionalidades Pendientes / Roadmap

### Próximas Mejoras
- [ ] Sistema de presupuestos antes de trabajos
- [ ] Mantenimiento preventivo programado
- [ ] Notificaciones por email/SMS
- [ ] App móvil para empleadas
- [ ] Calendario visual drag-and-drop
- [ ] Geolocalización de trabajos
- [ ] Sistema de permisos y roles
- [ ] Integración con pasarelas de pago
- [ ] Exportación de reportes a PDF/Excel
- [ ] Dashboard de cliente (portal)

### Optimizaciones Técnicas
- [ ] Paginación en tablas largas
- [ ] Búsqueda y filtros avanzados
- [ ] Cache de datos en frontend
- [ ] Modo offline (PWA)
- [ ] Tests automatizados
- [ ] CI/CD con GitHub Actions

## 📝 Guía de Uso Rápida

1. **Login**: Elegir rol (Ana Ramos o Tienda) → Ingresar credenciales
2. **🤖 Consultar a GALI**: Click en "Consultor IA" → Pregunta lo que necesites sobre cortinas, facturación, ventas o el sistema
3. **📋 Gestionar Tareas**:
   - Ir a "Tareas" → Elegir vista (Lista/Kanban/Calendario)
   - **Nueva Tarea**: Botón "Nueva Tarea" → Rellenar título, prioridad, fecha límite
   - **Vista Kanban**: Arrastrar tareas entre columnas para cambiar estado
   - **Vista Calendario**: Click en día → Ver/editar tareas de ese día
   - **Recordatorios**: Configurar minutos antes del vencimiento para recibir alerta
4. **Gestionar Categorías**: Ir a "Stock" → "Categorías" → Crear/Editar categorías con colores e iconos
5. **Crear Productos desde Categoría**: En "Categorías" → Click en "Añadir Artículo" en cualquier categoría
6. **Crear Cliente**: Ir a "Clientes" → "Nuevo Cliente" → Rellenar formulario
7. **Crear Empleada**: Ir a "Personal" → "Nueva Empleada" → Rellenar datos (solo Ana Ramos)
8. **Programar Trabajo**: Ir a "Trabajos" → "Nuevo Trabajo" → Asignar cliente y empleada
9. **Gestionar Stock**: Ir a "Stock" → "Nuevo Artículo" → Seleccionar categoría → Configurar alertas
10. **Filtrar Stock**: Usar dropdown de categorías para filtrar inventario
11. **Generar Factura**: Ir a "Facturación" → "Nueva Factura" → Asociar a trabajo (solo Ana Ramos)
12. **Ver Reportes**: Ir a "Reportes" → Seleccionar mes → Ver métricas (solo Ana Ramos)

## 🔐 Seguridad

- Base de datos local para desarrollo (D1 local)
- Validación de datos en backend
- CORS configurado para APIs
- Prepared statements para prevenir SQL injection

## 📞 Soporte

Para consultas o problemas con el sistema:
- Revisar logs: `pm2 logs anushka-hogar`
- Resetear base de datos: `npm run db:reset`
- Verificar estado: `pm2 list`

## 📄 Licencia

Dashboard desarrollado para uso interno de Anushka Hogar.

---

**Última actualización**: 2026-01-15  
**Estado**: ✅ Sistema de Tareas Completo con 3 vistas (Lista, Kanban, Calendario)  
**Nueva URL de Producción**: https://c7dda5c7.anushka-hogar.pages.dev  
**Próximo paso**: Testear sistema de alertas automáticas y configurar job periódico

---

## 🆕 Cambios Recientes (15/01/2026)

### 📋 Sistema de Tareas Completo (NUEVO)
✅ **Backend completo** - Endpoints CRUD + alertas  
✅ **3 Vistas interactivas**: Lista, Kanban (drag & drop), Calendario  
✅ **Sistema de alertas automáticas** con recordatorios configurables  
✅ **Integración con avisos** (campana 🔔)  
✅ **Estadísticas en header**: Pendientes, En Proceso, Urgentes  
✅ **Filtros avanzados**: Prioridad, asignado, estado  
✅ **Calendario mensual interactivo** con tareas por día  
✅ **Kanban con drag & drop** entre estados  
✅ **Endpoint automático**: POST `/api/tareas/alertas/procesar`

**Características técnicas:**
- Tabla `tareas_pendientes` con todos los campos necesarios
- Tabla `tareas_alertas` para recordatorios automáticos
- 13 endpoints REST completos
- Drag & Drop HTML5 nativo
- Calendario generado dinámicamente
- Contadores en tiempo real

**Ejemplos de uso:**
- Crear tarea urgente: Prioridad Alta + Fecha hoy + Recordatorio 60min
- Vista Kanban: Arrastra de "Pendiente" a "En Proceso"
- Vista Calendario: Click en día para ver/editar tareas

### 🤖 Consultor IA - GALI
✅ **Agente especializado** integrado en el sistema  
✅ **4 áreas de expertise**: Cortinas, Facturación, Ventas, Herramienta  
✅ Chat interactivo con respuestas contextuales  
✅ Preguntas rápidas predefinidas  
✅ Formato markdown en respuestas  
✅ Acceso universal (todos los roles)  
✅ Endpoint API: POST `/api/chat`  
✅ Sistema de keywords inteligente  
✅ Respuestas estructuradas y prácticas

**Ejemplos de uso:**
- "¿Cómo calculo el metraje para cortinas?"
- "¿Qué es VerificaTu y cómo lo uso?"
- "Dame tips para cerrar más ventas"
- "¿Cómo gestiono mejor el stock?"

### Sistema de Roles Completo
✅ Implementado sistema de roles con dos niveles de acceso  
✅ Ana Ramos (propietaria) - Acceso total con contraseña adicional "1984"  
✅ Tienda - Acceso limitado a 6 pestañas operativas (incluye Consultor IA)  
✅ Tabs sensibles invisibles para rol Tienda  
✅ Contraseña 1984 recordable por navegador (autocomplete)

### Sistema de Categorías Dinámicas
✅ Tabla `categorias` creada con colores, iconos y orden  
✅ 7 categorías pre-cargadas para negocio de cortinas  
✅ CRUD completo de categorías (crear, editar, eliminar)  
✅ Validación de eliminación (no se puede borrar si tiene productos)  
✅ Filtro por categoría en inventario  
✅ Badges visuales con colores e iconos en listado de stock  
✅ Botón "Añadir Artículo" en cada tarjeta de categoría  
✅ Formulario de productos usa categorías dinámicas desde BD  
✅ Pre-selección de categoría al crear producto desde categoría

### Mejoras de UX
✅ Categorías visuales con colores personalizables  
✅ Iconos Font Awesome para cada categoría  
✅ Creación rápida de productos desde gestión de categorías  
✅ Flujo integrado: Categorías → Añadir Artículo → Formulario con categoría preseleccionada  
✅ **Chat IA con interfaz moderna** y animaciones suaves
