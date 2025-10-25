# Anushka Hogar - Dashboard de Gestión Integral

## 🏠 Descripción del Proyecto

**Anushka Hogar** es un sistema completo de gestión para empresas de servicios domésticos y mantenimiento del hogar. Permite gestionar clientes, trabajos, stock, empleadas, facturación y obtener reportes automáticos con métricas clave.

## ✨ Características Completadas

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
- `clientes` - Información de clientes
- `empleadas` - Datos de empleadas
- `trabajos` - Órdenes de trabajo
- `stock` - Inventario de materiales
- `trabajo_materiales` - Materiales usados en trabajos
- `facturas` - Facturación
- `incidencias_clientes` - Sistema de incidencias
- `registro_horas` - Control horario
- `evaluaciones` - Evaluaciones de empleadas

### API REST Endpoints
**Clientes**: GET, POST, PUT `/api/clientes`
**Empleadas**: GET, POST, PUT `/api/empleadas`
**Trabajos**: GET, POST, PUT `/api/trabajos`
**Stock**: GET, POST, PUT `/api/stock`
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

## 🌐 URLs del Proyecto

### Desarrollo Local
- **Dashboard**: http://localhost:3000
- **API Base**: http://localhost:3000/api

### Sandbox Environment (ACTIVO ✅)
- **URL Pública**: https://3000-igloyhvlo0thgdvq5z280-8f57ffe2.sandbox.novita.ai
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

1. **Crear Cliente**: Ir a "Clientes" → "Nuevo Cliente" → Rellenar formulario
2. **Crear Empleada**: Ir a "Empleadas" → "Nueva Empleada" → Rellenar datos
3. **Programar Trabajo**: Ir a "Trabajos" → "Nuevo Trabajo" → Asignar cliente y empleada
4. **Gestionar Stock**: Ir a "Stock" → "Nuevo Artículo" → Configurar alertas
5. **Generar Factura**: Ir a "Facturación" → "Nueva Factura" → Asociar a trabajo
6. **Ver Reportes**: Ir a "Reportes" → Seleccionar mes → Ver métricas

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

**Última actualización**: 2025-10-25  
**Estado**: ✅ Completado - Listo para uso local  
**Próximo paso**: Deploy a producción en Cloudflare Pages
