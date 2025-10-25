import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// API ENDPOINTS - CLIENTES
// ============================================

// Obtener todos los clientes
app.get('/api/clientes', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre
  `).all()
  return c.json(results)
})

// Obtener cliente por ID con historial
app.get('/api/clientes/:id', async (c) => {
  const id = c.req.param('id')
  
  const cliente = await c.env.DB.prepare(`
    SELECT * FROM clientes WHERE id = ?
  `).bind(id).first()
  
  const trabajos = await c.env.DB.prepare(`
    SELECT t.*, e.nombre as empleada_nombre, e.apellidos as empleada_apellidos
    FROM trabajos t
    LEFT JOIN empleadas e ON t.empleada_id = e.id
    WHERE t.cliente_id = ?
    ORDER BY t.fecha_programada DESC
  `).bind(id).all()
  
  const facturas = await c.env.DB.prepare(`
    SELECT * FROM facturas WHERE cliente_id = ? ORDER BY fecha_emision DESC
  `).bind(id).all()
  
  const incidencias = await c.env.DB.prepare(`
    SELECT * FROM incidencias_clientes WHERE cliente_id = ? ORDER BY fecha_creacion DESC
  `).bind(id).all()
  
  return c.json({
    cliente,
    trabajos: trabajos.results,
    facturas: facturas.results,
    incidencias: incidencias.results
  })
})

// Crear cliente
app.post('/api/clientes', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO clientes (nombre, apellidos, telefono, email, direccion, ciudad, codigo_postal, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email || null,
    data.direccion, data.ciudad, data.codigo_postal || null, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar cliente
app.put('/api/clientes/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE clientes 
    SET nombre = ?, apellidos = ?, telefono = ?, email = ?, 
        direccion = ?, ciudad = ?, codigo_postal = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email,
    data.direccion, data.ciudad, data.codigo_postal, data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - EMPLEADAS
// ============================================

// Obtener todas las empleadas
app.get('/api/empleadas', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM empleadas WHERE activa = 1 ORDER BY nombre
  `).all()
  return c.json(results)
})

// Obtener empleada por ID
app.get('/api/empleadas/:id', async (c) => {
  const id = c.req.param('id')
  
  const empleada = await c.env.DB.prepare(`
    SELECT * FROM empleadas WHERE id = ?
  `).bind(id).first()
  
  const trabajos = await c.env.DB.prepare(`
    SELECT t.*, c.nombre as cliente_nombre, c.apellidos as cliente_apellidos
    FROM trabajos t
    LEFT JOIN clientes c ON t.cliente_id = c.id
    WHERE t.empleada_id = ?
    ORDER BY t.fecha_programada DESC
    LIMIT 20
  `).bind(id).all()
  
  const horas = await c.env.DB.prepare(`
    SELECT * FROM registro_horas 
    WHERE empleada_id = ? 
    ORDER BY fecha DESC LIMIT 30
  `).bind(id).all()
  
  const evaluaciones = await c.env.DB.prepare(`
    SELECT * FROM evaluaciones 
    WHERE empleada_id = ? 
    ORDER BY fecha DESC LIMIT 10
  `).bind(id).all()
  
  return c.json({
    empleada,
    trabajos: trabajos.results,
    horas: horas.results,
    evaluaciones: evaluaciones.results
  })
})

// Crear empleada
app.post('/api/empleadas', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO empleadas (nombre, apellidos, telefono, email, dni, fecha_contratacion, 
                          salario_hora, especialidades, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email || null, data.dni,
    data.fecha_contratacion, data.salario_hora, 
    JSON.stringify(data.especialidades || []), data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar empleada
app.put('/api/empleadas/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE empleadas 
    SET nombre = ?, apellidos = ?, telefono = ?, email = ?, 
        salario_hora = ?, especialidades = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email,
    data.salario_hora, JSON.stringify(data.especialidades || []), 
    data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - TRABAJOS
// ============================================

// Obtener todos los trabajos
app.get('/api/trabajos', async (c) => {
  const estado = c.req.query('estado')
  const fecha = c.req.query('fecha')
  
  let query = `
    SELECT t.*, 
           c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
           e.nombre as empleada_nombre, e.apellidos as empleada_apellidos
    FROM trabajos t
    LEFT JOIN clientes c ON t.cliente_id = c.id
    LEFT JOIN empleadas e ON t.empleada_id = e.id
    WHERE 1=1
  `
  const bindings: any[] = []
  
  if (estado) {
    query += ' AND t.estado = ?'
    bindings.push(estado)
  }
  
  if (fecha) {
    query += ' AND DATE(t.fecha_programada) = ?'
    bindings.push(fecha)
  }
  
  query += ' ORDER BY t.fecha_programada DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
  return c.json(results)
})

// Crear trabajo
app.post('/api/trabajos', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO trabajos (cliente_id, empleada_id, tipo_servicio, descripcion, direccion,
                         fecha_programada, duracion_estimada, estado, prioridad, precio_cliente, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cliente_id, data.empleada_id || null, data.tipo_servicio, data.descripcion || null,
    data.direccion, data.fecha_programada, data.duracion_estimada || 120,
    data.estado || 'pendiente', data.prioridad || 'normal', data.precio_cliente, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar trabajo
app.put('/api/trabajos/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE trabajos 
    SET empleada_id = ?, tipo_servicio = ?, descripcion = ?, fecha_programada = ?,
        duracion_estimada = ?, estado = ?, prioridad = ?, precio_cliente = ?, 
        fecha_inicio = ?, fecha_finalizacion = ?, duracion_real = ?, satisfaccion_cliente = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.empleada_id, data.tipo_servicio, data.descripcion, data.fecha_programada,
    data.duracion_estimada, data.estado, data.prioridad, data.precio_cliente,
    data.fecha_inicio || null, data.fecha_finalizacion || null, data.duracion_real || null,
    data.satisfaccion_cliente || null, data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - STOCK
// ============================================

// Obtener todo el stock
app.get('/api/stock', async (c) => {
  const bajo_stock = c.req.query('bajo_stock')
  
  let query = 'SELECT * FROM stock WHERE activo = 1'
  if (bajo_stock === 'true') {
    query += ' AND cantidad_actual <= cantidad_minima'
  }
  query += ' ORDER BY categoria, nombre'
  
  const { results } = await c.env.DB.prepare(query).all()
  return c.json(results)
})

// Crear item de stock
app.post('/api/stock', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO stock (nombre, descripcion, categoria, unidad, cantidad_actual, 
                      cantidad_minima, precio_unitario, proveedor, ubicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, data.descripcion || null, data.categoria, data.unidad,
    data.cantidad_actual, data.cantidad_minima, data.precio_unitario,
    data.proveedor || null, data.ubicacion || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar stock
app.put('/api/stock/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE stock 
    SET nombre = ?, descripcion = ?, categoria = ?, unidad = ?, 
        cantidad_actual = ?, cantidad_minima = ?, precio_unitario = ?,
        proveedor = ?, ubicacion = ?
    WHERE id = ?
  `).bind(
    data.nombre, data.descripcion, data.categoria, data.unidad,
    data.cantidad_actual, data.cantidad_minima, data.precio_unitario,
    data.proveedor, data.ubicacion, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - DASHBOARD / MÉTRICAS
// ============================================

app.get('/api/dashboard', async (c) => {
  // Ingresos del mes
  const ingresos = await c.env.DB.prepare(`
    SELECT SUM(total) as total
    FROM facturas
    WHERE estado = 'pagada' 
    AND strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', 'now')
  `).first()
  
  // Trabajos activos
  const trabajosActivos = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM trabajos
    WHERE estado IN ('pendiente', 'en_proceso')
  `).first()
  
  // Stock bajo
  const stockBajo = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM stock
    WHERE cantidad_actual <= cantidad_minima AND activo = 1
  `).first()
  
  // Horas trabajadas esta semana
  const horasSemanales = await c.env.DB.prepare(`
    SELECT SUM(horas_trabajadas) as total
    FROM registro_horas
    WHERE fecha >= date('now', '-7 days')
  `).first()
  
  // Satisfacción promedio
  const satisfaccion = await c.env.DB.prepare(`
    SELECT AVG(satisfaccion_cliente) as promedio
    FROM trabajos
    WHERE satisfaccion_cliente IS NOT NULL
    AND fecha_finalizacion >= date('now', '-30 days')
  `).first()
  
  // Trabajos por estado
  const trabajosPorEstado = await c.env.DB.prepare(`
    SELECT estado, COUNT(*) as total
    FROM trabajos
    WHERE fecha_programada >= date('now', '-30 days')
    GROUP BY estado
  `).all()
  
  // Ingresos por día (últimos 7 días)
  const ingresosDiarios = await c.env.DB.prepare(`
    SELECT DATE(fecha_pago) as fecha, SUM(total) as total
    FROM facturas
    WHERE estado = 'pagada' AND fecha_pago >= date('now', '-7 days')
    GROUP BY DATE(fecha_pago)
    ORDER BY fecha
  `).all()
  
  // Top empleadas
  const topEmpleadas = await c.env.DB.prepare(`
    SELECT e.id, e.nombre, e.apellidos, e.calificacion,
           COUNT(t.id) as trabajos_completados
    FROM empleadas e
    LEFT JOIN trabajos t ON e.id = t.empleada_id AND t.estado = 'completado'
    WHERE e.activa = 1
    GROUP BY e.id
    ORDER BY trabajos_completados DESC, e.calificacion DESC
    LIMIT 5
  `).all()
  
  return c.json({
    ingresos: ingresos?.total || 0,
    trabajos_activos: trabajosActivos?.total || 0,
    stock_bajo: stockBajo?.total || 0,
    horas_semanales: horasSemanales?.total || 0,
    satisfaccion_promedio: satisfaccion?.promedio || 0,
    trabajos_por_estado: trabajosPorEstado.results,
    ingresos_diarios: ingresosDiarios.results,
    top_empleadas: topEmpleadas.results
  })
})

// ============================================
// API ENDPOINTS - FACTURAS
// ============================================

app.get('/api/facturas', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT f.*, c.nombre as cliente_nombre, c.apellidos as cliente_apellidos
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    ORDER BY f.fecha_emision DESC
  `).all()
  return c.json(results)
})

app.post('/api/facturas', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO facturas (cliente_id, trabajo_id, numero_factura, fecha_emision,
                         fecha_vencimiento, subtotal, iva, total, estado, metodo_pago, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cliente_id, data.trabajo_id || null, data.numero_factura, data.fecha_emision,
    data.fecha_vencimiento || null, data.subtotal, data.iva || 0, data.total,
    data.estado || 'pendiente', data.metodo_pago || null, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// ============================================
// API ENDPOINTS - REPORTES
// ============================================

app.get('/api/reportes/mensual', async (c) => {
  const mes = c.req.query('mes') || new Date().toISOString().slice(0, 7)
  
  // Resumen financiero
  const financiero = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_facturas,
      SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as ingresos,
      SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as pendiente_cobro
    FROM facturas
    WHERE strftime('%Y-%m', fecha_emision) = ?
  `).bind(mes).first()
  
  // Trabajos realizados
  const trabajos = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
      AVG(CASE WHEN satisfaccion_cliente IS NOT NULL THEN satisfaccion_cliente END) as satisfaccion
    FROM trabajos
    WHERE strftime('%Y-%m', fecha_programada) = ?
  `).bind(mes).first()
  
  // Horas trabajadas
  const horas = await c.env.DB.prepare(`
    SELECT e.nombre, e.apellidos, SUM(rh.horas_trabajadas) as total_horas
    FROM registro_horas rh
    JOIN empleadas e ON rh.empleada_id = e.id
    WHERE strftime('%Y-%m', rh.fecha) = ?
    GROUP BY e.id
    ORDER BY total_horas DESC
  `).bind(mes).all()
  
  // Servicios más demandados
  const servicios = await c.env.DB.prepare(`
    SELECT tipo_servicio, COUNT(*) as total, SUM(precio_cliente) as ingresos
    FROM trabajos
    WHERE strftime('%Y-%m', fecha_programada) = ?
    GROUP BY tipo_servicio
    ORDER BY total DESC
  `).bind(mes).all()
  
  return c.json({
    mes,
    financiero,
    trabajos,
    horas: horas.results,
    servicios: servicios.results
  })
})

// ============================================
// FRONTEND - HTML
// ============================================

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anushka Hogar - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .tab-button.active { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-xl">
                        <i class="fas fa-home text-white text-2xl"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Anushka Hogar</h1>
                        <p class="text-sm text-gray-600">Sistema de Gestión Integral</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-600">Bienvenida</p>
                    <p class="font-semibold text-gray-800">Admin</p>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="container mx-auto px-6 mt-6">
        <div class="bg-white rounded-xl shadow-md p-2 flex flex-wrap gap-2">
            <button onclick="showTab('dashboard')" class="tab-button active px-6 py-3 rounded-lg font-medium transition-all">
                <i class="fas fa-chart-line mr-2"></i>Dashboard
            </button>
            <button onclick="showTab('clientes')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-users mr-2"></i>Clientes
            </button>
            <button onclick="showTab('trabajos')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-briefcase mr-2"></i>Trabajos
            </button>
            <button onclick="showTab('empleadas')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-user-tie mr-2"></i>Empleadas
            </button>
            <button onclick="showTab('stock')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-boxes mr-2"></i>Stock
            </button>
            <button onclick="showTab('facturas')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-file-invoice-dollar mr-2"></i>Facturación
            </button>
            <button onclick="showTab('reportes')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-chart-bar mr-2"></i>Reportes
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-6">
        
        <!-- DASHBOARD TAB -->
        <div id="dashboard-tab" class="tab-content active">
            <!-- KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Ingresos Mes</p>
                            <p class="text-2xl font-bold text-green-600" id="kpi-ingresos">€0</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-euro-sign text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Trabajos Activos</p>
                            <p class="text-2xl font-bold text-blue-600" id="kpi-trabajos">0</p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-tasks text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Stock Bajo</p>
                            <p class="text-2xl font-bold text-red-600" id="kpi-stock">0</p>
                        </div>
                        <div class="bg-red-100 p-3 rounded-full">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Horas Semanales</p>
                            <p class="text-2xl font-bold text-purple-600" id="kpi-horas">0h</p>
                        </div>
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-clock text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Satisfacción</p>
                            <p class="text-2xl font-bold text-yellow-600" id="kpi-satisfaccion">0</p>
                        </div>
                        <div class="bg-yellow-100 p-3 rounded-full">
                            <i class="fas fa-star text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Trabajos por Estado</h3>
                    <canvas id="chartTrabajos"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Ingresos Últimos 7 Días</h3>
                    <canvas id="chartIngresos"></canvas>
                </div>
            </div>

            <!-- Top Empleadas -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Top Empleadas del Mes</h3>
                <div id="top-empleadas" class="space-y-3"></div>
            </div>
        </div>

        <!-- CLIENTES TAB -->
        <div id="clientes-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                    <button onclick="showClienteForm()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nuevo Cliente
                    </button>
                </div>
                <div id="clientes-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- TRABAJOS TAB -->
        <div id="trabajos-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Trabajos</h2>
                    <button onclick="showTrabajoForm()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nuevo Trabajo
                    </button>
                </div>
                
                <!-- Filtros -->
                <div class="mb-6 flex gap-4">
                    <select id="filter-estado" onchange="loadTrabajos()" class="px-4 py-2 border rounded-lg">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    <input type="date" id="filter-fecha" onchange="loadTrabajos()" class="px-4 py-2 border rounded-lg">
                </div>
                
                <div id="trabajos-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- EMPLEADAS TAB -->
        <div id="empleadas-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Empleadas</h2>
                    <button onclick="showEmpleadaForm()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nueva Empleada
                    </button>
                </div>
                <div id="empleadas-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- STOCK TAB -->
        <div id="stock-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Control de Inventario</h2>
                    <div class="flex gap-3">
                        <button onclick="loadStock(true)" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                            <i class="fas fa-exclamation-circle mr-2"></i>Bajo Stock
                        </button>
                        <button onclick="showStockForm()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                            <i class="fas fa-plus mr-2"></i>Nuevo Artículo
                        </button>
                    </div>
                </div>
                <div id="stock-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- FACTURAS TAB -->
        <div id="facturas-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Facturación</h2>
                    <button onclick="showFacturaForm()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nueva Factura
                    </button>
                </div>
                <div id="facturas-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- REPORTES TAB -->
        <div id="reportes-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Reportes Mensuales</h2>
                    <input type="month" id="reporte-mes" onchange="loadReporte()" 
                           class="px-4 py-2 border rounded-lg" value="${new Date().toISOString().slice(0, 7)}">
                </div>
                <div id="reporte-contenido"></div>
            </div>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `)
})

export default app
