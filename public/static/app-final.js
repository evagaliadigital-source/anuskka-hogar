// API Base
const API = '/api'

// Estado global
let currentData = {
  dashboard: null,
  clientes: [],
  trabajos: [],
  personal: [],
  stock: [],
  facturas: []
}

// ============================================
// AUTENTICACIÓN Y SISTEMA DE ROLES
// ============================================

// Verificar si el usuario está logueado
function checkAuth() {
  const user = localStorage.getItem('anushka_user')
  if (!user) {
    window.location.href = '/static/login.html'
    return null
  }
  return JSON.parse(user)
}

// Obtener rol del usuario actual
function getUserRole() {
  const user = checkAuth()
  return user ? user.rol : null
}

// Verificar si el usuario es dueña
function isDuena() {
  return getUserRole() === 'duena'
}

// Verificar si el usuario tiene permiso para una sección
function tienePermiso(seccion) {
  const rol = getUserRole()
  
  // Ana Ramos (dueña) tiene acceso a TODO
  if (rol === 'duena') {
    return true
  }
  
  // Tienda solo tiene acceso a secciones operativas + consultor IA + diseñador virtual
  const seccionesTienda = ['dashboard', 'clientes', 'presupuestos', 'trabajos', 'stock', 'consultor', 'disenador']
  return seccionesTienda.includes(seccion)
}

// Logout
function logout() {
  localStorage.removeItem('anushka_user')
  sessionStorage.clear() // Limpiar también las contraseñas guardadas
  window.location.href = '/static/login.html'
}

// ============================================
// UTILIDADES - MODAL Y TOAST
// ============================================

// Mostrar modal
function showModal(content, maxWidth = 'max-w-2xl') {
  // Crear overlay
  const overlay = document.createElement('div')
  overlay.id = 'modal-overlay'
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  }
  
  // Crear modal
  const modal = document.createElement('div')
  modal.className = `bg-white rounded-xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`
  modal.innerHTML = `
    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
      <h3 class="text-xl font-bold text-gray-800">Detalles</h3>
      <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
        <i class="fas fa-times text-xl"></i>
      </button>
    </div>
    <div class="p-6">
      ${content}
    </div>
    <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
      <button onclick="closeModal()" class="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
        Cerrar
      </button>
    </div>
  `
  
  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'
}

// Cerrar modal
function closeModal() {
  const overlay = document.getElementById('modal-overlay')
  if (overlay) {
    overlay.remove()
    document.body.style.overflow = 'auto'
  }
}

// Mostrar toast notification
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  }
  
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-fade-in`
  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <span>${message}</span>
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.5s'
    setTimeout(() => toast.remove(), 500)
  }, 3000)
}

// Cargar nombre de usuario en header
function loadUserInfo() {
  const user = checkAuth()
  if (user) {
    const userNameElement = document.querySelector('header p.font-semibold')
    if (userNameElement) {
      if (user.rol === 'duena') {
        // Para Ana Ramos: solo mostrar "Ana Ramos 👑"
        userNameElement.textContent = 'Ana Ramos 👑'
      } else {
        // Para Tienda: mostrar "Tienda 🏪"
        userNameElement.textContent = 'Tienda 🏪'
      }
    }
  }
}

// ============================================
// NAVEGACIÓN
// ============================================

function showTab(tabName) {
  console.log('🔄 showTab called:', tabName)
  
  // VERIFICAR PERMISOS ANTES DE CAMBIAR DE TAB
  if (!tienePermiso(tabName)) {
    showToast(`❌ No tienes permiso para acceder a ${tabName}`, 'error')
    console.log(`🚫 Acceso denegado a: ${tabName}`)
    return
  }
  
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active')
  })
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active')
  })
  
  // Mostrar tab seleccionado
  const tabElement = document.getElementById(`${tabName}-tab`)
  if (!tabElement) {
    console.error(`❌ Tab ${tabName}-tab no encontrado`)
    return
  }
  tabElement.classList.add('active')
  
  // Activar botón correspondiente (buscar por onclick que contenga el tabName)
  document.querySelectorAll('.tab-button').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(`'${tabName}'`)) {
      btn.classList.add('active')
    }
  })
  
  // Cargar datos según tab
  console.log('✅ Loading data for:', tabName)
  switch(tabName) {
    case 'dashboard':
      loadDashboard()
      break
    case 'clientes':
      loadClientes()
      break
    case 'presupuestos':
      loadPresupuestos()
      break
    case 'trabajos':
      loadTrabajos()
      break
    case 'personal':
      loadPersonal()
      break
    case 'stock':
      loadStock()
      break
    case 'facturas':
      loadFacturas()
      break
    case 'reportes':
      loadInformes()
      loadReporte()
      break
    case 'disenador':
      loadProyectosDiseño()
      break
  }
}

// ============================================
// SISTEMA DE PERMISOS POR ROL
// ============================================
// Las secciones sensibles (Personal, Facturación, Reportes) 
// solo son accesibles para usuarios con rol 'duena'.
// El sistema de permisos se maneja en tienePermiso() y ocultarPestanasSegunRol()

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  try {
    const { data } = await axios.get(`${API}/dashboard`)
    currentData.dashboard = data
    
    // Actualizar KPIs principales
    document.getElementById('kpi-trabajos').textContent = data.trabajos_activos || 0
    document.getElementById('kpi-presupuestos').textContent = data.presupuestos_pendientes || 0
    document.getElementById('kpi-fases').textContent = data.fases_en_proceso || 0
    document.getElementById('kpi-completados').textContent = data.trabajos_completados_mes || 0
    
    // Gráficos enfocados en operaciones
    renderChartTrabajos(data.trabajos_por_estado)
    renderChartFases(data.fases_resumen)
    renderChartPresupuestos(data.presupuestos_por_estado)
    
  } catch (error) {
    console.error('Error cargando dashboard:', error)
    showError('Error al cargar el dashboard')
  }
}

// Variable global para guardar instancias de charts
let chartTrabajosInstance = null
let chartFasesInstance = null
let chartPresupuestosInstance = null
let chartIngresosInstance = null

function renderChartTrabajos(data) {
  const ctx = document.getElementById('chartTrabajos')
  if (!ctx) {
    console.warn('⚠️ Canvas chartTrabajos no encontrado')
    return
  }
  
  // Verificar que Chart.js está disponible
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js no está cargado')
    return
  }
  
  // Destruir chart anterior si existe
  if (chartTrabajosInstance) {
    chartTrabajosInstance.destroy()
    chartTrabajosInstance = null
  }
  
  // Validar que hay datos
  if (!data || data.length === 0) {
    console.warn('⚠️ No hay datos para renderizar chartTrabajos')
    return
  }
  
  const labels = data.map(d => {
    const estados = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    }
    return estados[d.estado] || d.estado
  })
  const values = data.map(d => d.total)
  
  console.log('📊 Renderizando chartTrabajos con', data.length, 'estados')
  
  chartTrabajosInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  })
}

function renderChartFases(data) {
  const ctx = document.getElementById('chartFases')
  if (!ctx) return
  
  if (typeof Chart === 'undefined') return
  
  if (chartFasesInstance) {
    chartFasesInstance.destroy()
    chartFasesInstance = null
  }
  
  if (!data || data.length === 0) return
  
  const labels = data.map(d => {
    const fases = {
      'mediciones': '📏 Mediciones',
      'pedidos': '📦 Pedidos',
      'confeccion': '✂️ Confección',
      'instalacion': '🔨 Instalación'
    }
    return fases[d.fase] || d.fase
  })
  const values = data.map(d => d.total)
  
  chartFasesInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trabajos en esta fase',
        data: values,
        backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  })
}

function renderChartPresupuestos(data) {
  const ctx = document.getElementById('chartPresupuestos')
  if (!ctx) return
  
  if (typeof Chart === 'undefined') return
  
  if (chartPresupuestosInstance) {
    chartPresupuestosInstance.destroy()
    chartPresupuestosInstance = null
  }
  
  if (!data || data.length === 0) return
  
  const labels = data.map(d => {
    const estados = {
      'pendiente': 'Pendiente',
      'enviado': 'Enviado',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado'
    }
    return estados[d.estado] || d.estado
  })
  const values = data.map(d => d.total)
  
  chartPresupuestosInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  })
}

function renderChartIngresos(data) {
  const ctx = document.getElementById('chartIngresos')
  if (!ctx) {
    console.warn('⚠️ Canvas chartIngresos no encontrado')
    return
  }
  
  // Verificar que Chart.js está disponible
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js no está cargado')
    return
  }
  
  // Destruir chart anterior si existe
  if (chartIngresosInstance) {
    chartIngresosInstance.destroy()
    chartIngresosInstance = null
  }
  
  // Validar que hay datos
  if (!data || data.length === 0) {
    console.warn('⚠️ No hay datos para renderizar chartIngresos')
    return
  }
  
  const labels = data.map(d => new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }))
  const values = data.map(d => d.total)
  
  console.log('📊 Renderizando chartIngresos con', data.length, 'días')
  
  chartIngresosInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ingresos (€)',
        data: values,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  })
}

// Cargar informes (incluye gráfica de ingresos)
async function loadInformes() {
  try {
    const { data } = await axios.get(`${API}/dashboard`)
    // Renderizar gráfica de ingresos
    renderChartIngresos(data.ingresos_diarios)
  } catch (error) {
    console.error('Error cargando informes:', error)
  }
}

// FUNCIÓN DESHABILITADA - Sección "Top Empleadas del Mes" eliminada del dashboard
/*
function renderTopEmpleadas(data) {
  const container = document.getElementById('top-empleadas')
  if (!container) return
  
  container.innerHTML = data.map((e, index) => `
    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div class="flex items-center space-x-4">
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center">
          ${index + 1}
        </div>
        <div>
          <p class="font-semibold text-gray-800">${e.nombre} ${e.apellidos}</p>
          <p class="text-sm text-gray-600">${e.trabajos_completados} trabajos completados</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-yellow-600 font-semibold">${e.calificacion.toFixed(1)} ⭐</p>
      </div>
    </div>
  `).join('')
}
*/

// ============================================
// CLIENTES
// ============================================

async function loadClientes() {
  console.log('🔄 loadClientes() iniciando...')
  try {
    console.log('📡 Fetching:', `${API}/clientes`)
    const { data } = await axios.get(`${API}/clientes`)
    console.log('✅ Data recibida:', data.length, 'clientes')
    currentData.clientes = data
    
    const container = document.getElementById('clientes-lista')
    if (!container) {
      console.error('❌ Container clientes-lista NO encontrado')
      return
    }
    console.log('✅ Container encontrado, renderizando tabla...')
    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(c => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">${c.nombre} ${c.apellidos}</div>
                ${c.email ? `<div class="text-sm text-gray-500">${c.email}</div>` : ''}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.telefono}</td>
              <td class="px-6 py-4 text-sm text-gray-900">${c.direccion}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.ciudad}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="viewCliente(${c.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editCliente(${c.id})" class="text-green-600 hover:text-green-800 mr-3" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="showClientePresupuestos(${c.id})" class="text-purple-600 hover:text-purple-800" title="Ver presupuestos">
                  <i class="fas fa-file-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } catch (error) {
    console.error('Error cargando clientes:', error)
    showError('Error al cargar clientes')
  }
}

async function showClienteForm(id = null) {
  const isEdit = id !== null
  let cliente = { nombre: '', apellidos: '', telefono: '', email: '', direccion: '', ciudad: '', codigo_postal: '', notas: '' }
  
  if (isEdit) {
    const { data } = await axios.get(`${API}/clientes/${id}`)
    cliente = data.cliente
  }
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Editar' : 'Nuevo'} Cliente</h3>
        <form id="cliente-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${cliente.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input type="text" name="apellidos" value="${cliente.apellidos}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input type="tel" name="telefono" value="${cliente.telefono}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${cliente.email || ''}" 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
            <input type="text" name="direccion" value="${cliente.direccion}" required 
                   class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
              <input type="text" name="ciudad" value="${cliente.ciudad}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <input type="text" name="codigo_postal" value="${cliente.codigo_postal || ''}" 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows="3" 
                      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-700">${cliente.notas || ''}</textarea>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
              <i class="fas fa-save mr-2"></i>Guardar
            </button>
            <button type="button" onclick="closeModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('cliente-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    try {
      if (isEdit) {
        await axios.put(`${API}/clientes/${id}`, data)
      } else {
        await axios.post(`${API}/clientes`, data)
      }
      closeModal()
      loadClientes()
      showSuccess('Cliente guardado correctamente')
    } catch (error) {
      showError('Error al guardar cliente')
    }
  })
}

// ============================================
// TRABAJOS
// ============================================

async function loadTrabajos() {
  try {
    const estado = document.getElementById('filter-estado')?.value || ''
    const fecha = document.getElementById('filter-fecha')?.value || ''
    
    const params = new URLSearchParams()
    if (estado) params.append('estado', estado)
    if (fecha) params.append('fecha', fecha)
    
    const { data } = await axios.get(`${API}/trabajos?${params}`)
    currentData.trabajos = data
    
    const container = document.getElementById('trabajos-lista')
    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleada</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(t => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${new Date(t.fecha_programada).toLocaleDateString('es-ES')}
                <div class="text-xs text-gray-500">${new Date(t.fecha_programada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${t.cliente_nombre} ${t.cliente_apellidos}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">${t.tipo_servicio.replace('_', ' ')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${t.empleada_nombre ? `${t.empleada_nombre} ${t.empleada_apellidos}` : '<span class="text-gray-400">Sin asignar</span>'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${getEstadoBadge(t.estado)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">€${t.precio_cliente.toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="viewTrabajo(${t.id})" class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editTrabajo(${t.id})" class="text-green-600 hover:text-green-800" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } catch (error) {
    console.error('Error cargando trabajos:', error)
    showError('Error al cargar trabajos')
  }
}

function getEstadoBadge(estado) {
  const badges = {
    'pendiente': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>',
    'en_proceso': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">En Proceso</span>',
    'completado': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completado</span>',
    'cancelado': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Cancelado</span>'
  }
  return badges[estado] || estado
}

async function viewTrabajo(id) {
  try {
    const { data: trabajo } = await axios.get(`${API}/trabajos/${id}`)
    const { data: fases } = await axios.get(`${API}/trabajos/${id}/fases`)
    const { data: personalList } = await axios.get(`${API}/personal`)
    
    // Calcular progreso
    const fasesCompletadas = fases.filter(f => f.estado === 'completado').length
    const progresoPercent = (fasesCompletadas / fases.length) * 100
    
    const faseIcons = {
      mediciones: '📏',
      pedidos: '📦',
      confeccion: '✂️',
      instalacion: '🔨'
    }
    
    const faseLabels = {
      mediciones: 'Mediciones',
      pedidos: 'Pedidos',
      confeccion: 'Confección',
      instalacion: 'Instalación'
    }
    
    const html = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) closeModal()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-briefcase text-teal-600 mr-2"></i>
              Detalles del Trabajo
            </h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          
          ${trabajo.presupuesto_id ? `
            <div class="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p class="text-sm text-purple-700">
                <i class="fas fa-link mr-2"></i>
                <strong>Generado desde presupuesto</strong>
                <button onclick="closeModal(); showTab('presupuestos'); setTimeout(() => viewPresupuesto(${trabajo.presupuesto_id}), 300)" 
                        class="ml-2 text-purple-600 hover:text-purple-800 underline">
                  Ver presupuesto original
                </button>
              </p>
            </div>
          ` : ''}
          
          <!-- TIMELINE DE FASES -->
          <div class="mb-6 bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-lg border border-teal-200">
            <h4 class="font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span><i class="fas fa-tasks mr-2 text-teal-600"></i>Fases del Trabajo</span>
              <span class="text-sm font-normal text-gray-600">${progresoPercent.toFixed(0)}% Completado</span>
            </h4>
            
            <!-- Barra de progreso -->
            <div class="mb-6 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div class="bg-gradient-to-r from-teal-500 to-green-500 h-full transition-all duration-500" style="width: ${progresoPercent}%"></div>
            </div>
            
            <!-- Timeline con control manual -->
            <div class="space-y-3">
              ${fases.map((fase, idx) => `
                <div class="bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md
                  ${fase.estado === 'completado' ? 'border-green-500' : 'border-gray-200'}">
                  <div class="flex items-start gap-4">
                    <!-- Checkbox manual -->
                    <div class="flex-shrink-0 pt-1">
                      <input type="checkbox" 
                             id="fase-${fase.id}"
                             ${fase.estado === 'completado' ? 'checked' : ''}
                             onchange="toggleFase(${id}, ${fase.id}, '${fase.fase}', this.checked)"
                             class="w-6 h-6 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer">
                    </div>
                    
                    <!-- Icon decorativo -->
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl
                      ${fase.estado === 'completado' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}">
                      ${faseIcons[fase.fase]}
                    </div>
                    
                    <!-- Contenido -->
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <label for="fase-${fase.id}" class="font-bold text-gray-800 cursor-pointer hover:text-teal-600">
                          ${faseLabels[fase.fase]}
                        </label>
                        ${fase.estado === 'completado' ? 
                          `<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">✓ Hecha</span>` :
                          `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">Pendiente</span>`
                        }
                      </div>
                      
                      <!-- Selector de personal asignado -->
                      <div class="mb-2">
                        <label class="text-xs text-gray-600 mb-1 block">
                          <i class="fas fa-user mr-1"></i>Personal asignado:
                        </label>
                        <select 
                          id="personal-fase-${fase.id}" 
                          onchange="asignarPersonalAFase(${id}, ${fase.id}, this.value)"
                          class="w-full text-sm px-3 py-1.5 border rounded bg-white focus:ring-2 focus:ring-teal-500">
                          <option value="">Sin asignar</option>
                          ${personalList.map(p => `
                            <option value="${p.id}" ${fase.personal_id == p.id ? 'selected' : ''}>
                              ${p.nombre} ${p.apellidos}
                            </option>
                          `).join('')}
                        </select>
                        ${fase.personal_nombre ? `
                          <p class="text-xs text-teal-600 mt-1">
                            <i class="fas fa-check-circle mr-1"></i>Asignado a: ${fase.personal_nombre} ${fase.personal_apellidos}
                          </p>
                        ` : ''}
                      </div>
                      
                      ${fase.fecha_completado ? `
                        <p class="text-xs text-gray-500 mb-2">
                          <i class="far fa-calendar-check mr-1"></i>
                          Completado: ${new Date(fase.fecha_completado).toLocaleDateString('es-ES')} a las ${new Date(fase.fecha_completado).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      ` : ''}
                      
                      ${fase.notas ? `
                        <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 mt-2">
                          <i class="far fa-sticky-note mr-1 text-gray-400"></i>${fase.notas}
                        </p>
                      ` : ''}
                      
                      <!-- Botón para agregar/editar notas -->
                      <button onclick="editarNotasFase(${id}, ${fase.id}, '${fase.fase}', \`${fase.notas || ''}\`)" 
                              class="mt-2 text-xs text-teal-600 hover:text-teal-700 hover:underline">
                        <i class="fas fa-edit mr-1"></i>${fase.notas ? 'Editar notas' : 'Agregar notas'}
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Cliente</p>
              <p class="font-semibold text-gray-900">${trabajo.cliente_nombre} ${trabajo.cliente_apellidos}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Estado</p>
              ${getEstadoBadge(trabajo.estado)}
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Fecha Programada</p>
              <p class="font-semibold text-gray-900">${new Date(trabajo.fecha_programada).toLocaleString('es-ES')}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Empleada Asignada</p>
              <p class="font-semibold text-gray-900">
                ${trabajo.empleada_nombre ? `${trabajo.empleada_nombre} ${trabajo.empleada_apellidos}` : '<span class="text-gray-400">Sin asignar</span>'}
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Tipo de Servicio</p>
              <p class="font-semibold text-gray-900">${trabajo.tipo_servicio.replace('_', ' ')}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Precio Cliente</p>
              <p class="font-semibold text-green-600 text-xl">€${trabajo.precio_cliente.toFixed(2)}</p>
            </div>
          </div>
          
          ${trabajo.descripcion ? `
            <div class="mb-4">
              <h4 class="font-semibold text-gray-700 mb-2">Descripción</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <pre class="text-sm text-gray-700 whitespace-pre-wrap font-sans">${trabajo.descripcion}</pre>
              </div>
            </div>
          ` : ''}
          
          <div class="flex gap-3 mt-6">
            <button onclick="closeModal(); editTrabajo(${id})" 
                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-medium">
              <i class="fas fa-edit mr-2"></i>Editar Trabajo
            </button>
            <button onclick="closeModal()" 
                    class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
  } catch (error) {
    console.error('Error al cargar trabajo:', error)
    showToast('Error al cargar detalles del trabajo', 'error')
  }
}

async function showTrabajoForm(id = null) {
  // Cargar clientes y personal para los selects
  const [clientesRes, personalRes] = await Promise.all([
    axios.get(`${API}/clientes`),
    axios.get(`${API}/personal`)
  ])
  
  const isEdit = id !== null
  let trabajo = {
    cliente_id: '',
    empleada_id: '',
    tipo_servicio: '',
    descripcion: '',
    direccion: '',
    fecha_programada: '',
    duracion_estimada: 120,
    estado: 'pendiente',
    prioridad: 'normal',
    precio_cliente: '',
    notas: ''
  }
  
  if (isEdit) {
    const { data } = await axios.get(`${API}/trabajos?estado=`)
    trabajo = data.find(t => t.id === id)
  }
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Editar' : 'Nuevo'} Trabajo</h3>
        <form id="trabajo-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select name="cliente_id" required class="w-full px-4 py-2 border rounded-lg">
                <option value="">Seleccionar cliente</option>
                ${clientesRes.data.map(c => `
                  <option value="${c.id}" ${trabajo.cliente_id == c.id ? 'selected' : ''}>
                    ${c.nombre} ${c.apellidos}
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Personal Asignado</label>
              <select name="empleada_id" class="w-full px-4 py-2 border rounded-lg">
                <option value="">Sin asignar</option>
                ${personalRes.data.map(e => `
                  <option value="${e.id}" ${trabajo.empleada_id == e.id ? 'selected' : ''}>
                    ${e.nombre} ${e.apellidos}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio *</label>
              <select name="tipo_servicio" required class="w-full px-4 py-2 border rounded-lg">
                <option value="">Seleccionar</option>
                <option value="limpieza_basica" ${trabajo.tipo_servicio === 'limpieza_basica' ? 'selected' : ''}>Limpieza Básica</option>
                <option value="limpieza_completa" ${trabajo.tipo_servicio === 'limpieza_completa' ? 'selected' : ''}>Limpieza Completa</option>
                <option value="plancha" ${trabajo.tipo_servicio === 'plancha' ? 'selected' : ''}>Plancha</option>
                <option value="mantenimiento" ${trabajo.tipo_servicio === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                <option value="organizacion" ${trabajo.tipo_servicio === 'organizacion' ? 'selected' : ''}>Organización</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Precio Cliente (€) *</label>
              <input type="number" name="precio_cliente" value="${trabajo.precio_cliente}" required step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
            <input type="text" name="direccion" value="${trabajo.direccion}" required 
                   class="w-full px-4 py-2 border rounded-lg">
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora *</label>
              <input type="datetime-local" name="fecha_programada" 
                     value="${trabajo.fecha_programada ? new Date(trabajo.fecha_programada).toISOString().slice(0, 16) : ''}" 
                     required class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
              <input type="number" step="0.5" name="duracion_horas" value="${trabajo.duracion_estimada ? (trabajo.duracion_estimada / 60).toFixed(1) : ''}" 
                     class="w-full px-4 py-2 border rounded-lg" placeholder="Ej: 2.5">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select name="prioridad" class="w-full px-4 py-2 border rounded-lg">
                <option value="baja" ${trabajo.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                <option value="normal" ${trabajo.prioridad === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="alta" ${trabajo.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                <option value="urgente" ${trabajo.prioridad === 'urgente' ? 'selected' : ''}>Urgente</option>
              </select>
            </div>
          </div>
          
          ${isEdit ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" class="w-full px-4 py-2 border rounded-lg">
                <option value="pendiente" ${trabajo.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="en_proceso" ${trabajo.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                <option value="completado" ${trabajo.estado === 'completado' ? 'selected' : ''}>Completado</option>
                <option value="cancelado" ${trabajo.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          ` : ''}
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="descripcion" rows="2" 
                      class="w-full px-4 py-2 border rounded-lg">${trabajo.descripcion || ''}</textarea>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
              <i class="fas fa-save mr-2"></i>Guardar
            </button>
            <button type="button" onclick="closeModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('trabajo-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    // Convertir horas a minutos para el backend
    if (data.duracion_horas) {
      data.duracion_estimada = Math.round(parseFloat(data.duracion_horas) * 60)
      delete data.duracion_horas
    }
    
    // Convertir valores vacíos a null
    if (!data.empleada_id) data.empleada_id = null
    
    try {
      if (isEdit) {
        await axios.put(`${API}/trabajos/${id}`, data)
      } else {
        await axios.post(`${API}/trabajos`, data)
      }
      closeModal()
      loadTrabajos()
      showSuccess('Trabajo guardado correctamente')
    } catch (error) {
      console.error(error)
      showError('Error al guardar trabajo')
    }
  })
}

// ============================================
// PERSONAL
// ============================================

// Función para controlar las sub-pestañas de Personal
function showPersonalSubTab(subtab) {
  // Remover clase active de todos los botones
  document.querySelectorAll('.personal-subtab').forEach(btn => {
    btn.classList.remove('active', 'bg-gradient-to-r', 'from-gray-800', 'to-gray-900', 'text-white')
    btn.classList.add('text-gray-700', 'hover:bg-gray-100')
  })
  
  // Ocultar todos los contenidos
  document.querySelectorAll('.personal-subtab-content').forEach(content => {
    content.style.display = 'none'
  })
  
  // Activar botón seleccionado
  const btn = document.getElementById(`personal-subtab-${subtab}`)
  btn.classList.add('active', 'bg-gradient-to-r', 'from-gray-800', 'to-gray-900', 'text-white')
  btn.classList.remove('text-gray-700', 'hover:bg-gray-100')
  
  // Mostrar contenido correspondiente
  const content = document.getElementById(`personal-subtab-${subtab}-content`)
  content.style.display = 'block'
  
  // Cargar datos según sub-tab
  if (subtab === 'nuevo') {
    showPersonalFormInContainer()
  } else if (subtab === 'gestion') {
    loadPersonalLista()
  }
}

// Cargar pestaña Personal (llamada desde showTab)
async function loadPersonal() {
  // Por defecto mostrar sub-tab de Nuevo Personal
  showPersonalSubTab('nuevo')
}

// Mostrar formulario en el contenedor de Nuevo Personal
async function showPersonalFormInContainer() {
  const container = document.getElementById('personal-form-container')
  
  container.innerHTML = `
    <form id="personal-form-inline" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input type="text" name="nombre" required 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
          <input type="text" name="apellidos" required 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
          <input type="tel" name="telefono" required 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
          <input type="text" name="dni" required 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="email" 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Contratación</label>
          <input type="date" name="fecha_contratacion" 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Salario/Hora (€)</label>
          <input type="number" name="salario_hora" step="0.01" 
                 class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
        <div class="grid grid-cols-3 gap-3">
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="corte" class="rounded text-teal-600">
            <span class="text-sm">✂️ Corte</span>
          </label>
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="confeccion" class="rounded text-teal-600">
            <span class="text-sm">🧵 Confección</span>
          </label>
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="ventas" class="rounded text-teal-600">
            <span class="text-sm">💼 Ventas</span>
          </label>
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="atencion_cliente" class="rounded text-teal-600">
            <span class="text-sm">📞 Atención al Cliente</span>
          </label>
          <label class="flex items-center space-x-2 bg-green-50 p-3 rounded border-2 border-green-300 hover:bg-green-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="instalacion" class="rounded text-green-600">
            <span class="text-sm font-semibold">🔨 Instalación</span>
          </label>
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="plancha" class="rounded text-teal-600">
            <span class="text-sm">👔 Plancha</span>
          </label>
          <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" name="especialidades" value="apoyo" class="rounded text-teal-600">
            <span class="text-sm">🤝 Apoyo</span>
          </label>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea name="notas" rows="3" 
                  class="w-full px-4 py-2 border rounded-lg"></textarea>
      </div>
      
      <div class="flex gap-3 pt-4">
        <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
          <i class="fas fa-save mr-2"></i>Guardar Personal
        </button>
        <button type="button" onclick="showPersonalFormInContainer()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
          Limpiar
        </button>
      </div>
    </form>
  `
  
  // Event listener para el formulario inline
  document.getElementById('personal-form-inline').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    // Procesar especialidades (checkboxes múltiples)
    data.especialidades = Array.from(e.target.querySelectorAll('input[name="especialidades"]:checked'))
      .map(cb => cb.value)
    
    try {
      await axios.post(`${API}/personal`, data)
      showToast('✓ Personal añadido correctamente', 'success')
      showPersonalFormInContainer() // Limpiar formulario
      // Si está en sub-tab gestión, recargar lista
      const gestionVisible = document.getElementById('personal-subtab-gestion-content').style.display !== 'none'
      if (gestionVisible) {
        loadPersonalLista()
      }
    } catch (error) {
      console.error(error)
      showToast('❌ Error al guardar personal', 'error')
    }
  })
}

// Cargar lista de personal en sub-tab Gestión
async function loadPersonalLista() {
  try {
    const { data } = await axios.get(`${API}/personal`)
    currentData.personal = data
    
    const container = document.getElementById('personal-lista')
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">No hay personal registrado</p>'
      return
    }
    
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${data.map(e => `
          <div class="bg-white border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${e.nombre} ${e.apellidos}</h3>
                <p class="text-sm text-gray-600">${e.telefono}</p>
              </div>
              ${e.calificacion ? `<div class="text-yellow-600 font-semibold">${e.calificacion.toFixed(1)} ⭐</div>` : ''}
            </div>
            
            <div class="space-y-2 mb-4">
              <p class="text-sm"><span class="font-medium">Email:</span> ${e.email || 'N/A'}</p>
              <p class="text-sm"><span class="font-medium">DNI:</span> ${e.dni}</p>
              ${e.salario_hora ? `<p class="text-sm"><span class="font-medium">Salario/hora:</span> €${e.salario_hora.toFixed(2)}</p>` : ''}
              ${e.fecha_contratacion ? `<p class="text-sm"><span class="font-medium">Contratada:</span> ${new Date(e.fecha_contratacion).toLocaleDateString('es-ES')}</p>` : ''}
            </div>
            
            <div class="flex gap-2">
              <button onclick="viewPersonal(${e.id})" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                <i class="fas fa-eye mr-2"></i>Ver
              </button>
              <button onclick="editPersonal(${e.id})" class="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                <i class="fas fa-edit mr-2"></i>Editar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `
  } catch (error) {
    console.error('Error cargando personal:', error)
    showToast('❌ Error al cargar personal', 'error')
  }
}

// Mostrar formulario de edición de personal en modal
async function showPersonalForm(id = null) {
  const isEdit = id !== null
  let personal = {
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    dni: '',
    fecha_contratacion: '',
    salario_hora: '',
    especialidades: [],
    notas: ''
  }
  
  if (isEdit) {
    const { data } = await axios.get(`${API}/personal/${id}`)
    personal = data.personal
    try {
      personal.especialidades = JSON.parse(personal.especialidades || '[]')
    } catch {
      personal.especialidades = []
    }
  }
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Editar' : 'Nuevo'} Personal</h3>
        <form id="personal-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${personal.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input type="text" name="apellidos" value="${personal.apellidos}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input type="tel" name="telefono" value="${personal.telefono}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
              <input type="text" name="dni" value="${personal.dni}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${personal.email || ''}" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Contratación</label>
              <input type="date" name="fecha_contratacion" value="${personal.fecha_contratacion || ''}" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Salario/Hora (€)</label>
              <input type="number" name="salario_hora" value="${personal.salario_hora || ''}" step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="corte" 
                       ${personal.especialidades.includes('corte') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">✂️ Corte</span>
              </label>
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="confeccion" 
                       ${personal.especialidades.includes('confeccion') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">🧵 Confección</span>
              </label>
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="ventas" 
                       ${personal.especialidades.includes('ventas') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">💼 Ventas</span>
              </label>
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="atencion_cliente" 
                       ${personal.especialidades.includes('atencion_cliente') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">📞 Atención al Cliente</span>
              </label>
              <label class="flex items-center space-x-2 bg-green-50 p-3 rounded border-2 border-green-300 hover:bg-green-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="instalacion" 
                       ${personal.especialidades.includes('instalacion') ? 'checked' : ''} class="rounded text-green-600">
                <span class="text-sm font-semibold">🔨 Instalación</span>
              </label>
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="plancha" 
                       ${personal.especialidades.includes('plancha') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">👔 Plancha</span>
              </label>
              <label class="flex items-center space-x-2 bg-gray-50 p-3 rounded border hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" name="especialidades" value="apoyo" 
                       ${personal.especialidades.includes('apoyo') ? 'checked' : ''} class="rounded text-teal-600">
                <span class="text-sm">🤝 Apoyo</span>
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows="3" 
                      class="w-full px-4 py-2 border rounded-lg">${personal.notas || ''}</textarea>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
              <i class="fas fa-save mr-2"></i>Guardar
            </button>
            <button type="button" onclick="closeModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('personal-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    // Procesar especialidades (checkboxes múltiples)
    data.especialidades = Array.from(e.target.querySelectorAll('input[name="especialidades"]:checked'))
      .map(cb => cb.value)
    
    try {
      if (isEdit) {
        await axios.put(`${API}/personal/${id}`, data)
      } else {
        await axios.post(`${API}/personal`, data)
      }
      closeModal()
      loadPersonalLista()
      showToast('✓ Personal guardado correctamente', 'success')
    } catch (error) {
      console.error(error)
      showToast('❌ Error al guardar personal', 'error')
    }
  })
}

// ============================================
// STOCK
// ============================================

async function loadStock(bajoStock = false) {
  try {
    // Cargar categorías para el filtro
    await loadCategorias()
    const filterSelect = document.getElementById('filter-categoria')
    if (filterSelect && filterSelect.options.length === 1) {
      categoriasCache.forEach(cat => {
        const option = document.createElement('option')
        option.value = cat.id
        option.textContent = cat.nombre
        filterSelect.appendChild(option)
      })
    }
    
    // Construir URL con filtros
    let url = `${API}/stock`
    const params = []
    if (bajoStock) params.push('bajo_stock=true')
    
    const categoriaId = filterSelect?.value
    if (categoriaId) params.push(`categoria_id=${categoriaId}`)
    
    if (params.length > 0) url += '?' + params.join('&')
    
    const { data } = await axios.get(url)
    currentData.stock = data
    
    const container = document.getElementById('stock-lista')
    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(s => {
            const bajoCantidad = s.cantidad_actual <= s.cantidad_minima
            return `
              <tr class="hover:bg-gray-50 ${bajoCantidad ? 'bg-red-50' : ''}">
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">${s.nombre}</div>
                  ${s.descripcion ? `<div class="text-sm text-gray-500">${s.descripcion}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${s.categoria_nombre ? `
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
                          style="background-color: ${s.categoria_color}20; color: ${s.categoria_color}">
                      <i class="fas ${s.categoria_icono}"></i>
                      ${s.categoria_nombre}
                    </span>
                  ` : '<span class="text-gray-400">Sin categoría</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm font-medium ${bajoCantidad ? 'text-red-600' : 'text-gray-900'}">
                    ${s.cantidad_actual} ${s.unidad}
                    ${bajoCantidad ? ' ⚠️' : ''}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${s.cantidad_minima} ${s.unidad}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${s.precio_unitario.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${s.proveedor || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button onclick="editStock(${s.id})" class="text-green-600 hover:text-green-800">
                    <i class="fas fa-edit"></i>
                  </button>
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    `
  } catch (error) {
    console.error('Error cargando stock:', error)
    showToast('Error al cargar stock', 'error')
  }
}

async function showStockForm(id = null, preselectedCategoriaId = null) {
  const isEdit = id !== null
  let stock = {
    nombre: '',
    descripcion: '',
    categoria: '',
    categoria_id: preselectedCategoriaId || null,
    unidad: 'unidades',
    cantidad_actual: 0,
    cantidad_minima: 10,
    precio_unitario: 0,
    proveedor: '',
    ubicacion: ''
  }
  
  if (isEdit) {
    const { data } = await axios.get(`${API}/stock`)
    stock = data.find(s => s.id === id)
  }
  
  // Cargar categorías dinámicamente
  await loadCategorias()
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'} text-teal-600 mr-2"></i>
          ${isEdit ? 'Editar' : 'Nuevo'} Artículo
        </h3>
        <form id="stock-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${stock.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select name="categoria_id" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
                <option value="">Seleccionar</option>
                ${categoriasCache.map(cat => `
                  <option value="${cat.id}" ${stock.categoria_id == cat.id ? 'selected' : ''}>
                    ${cat.nombre}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="descripcion" rows="2" 
                      class="w-full px-4 py-2 border rounded-lg">${stock.descripcion || ''}</textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
              <select name="unidad" required class="w-full px-4 py-2 border rounded-lg">
                <option value="unidades" ${stock.unidad === 'unidades' ? 'selected' : ''}>Unidades</option>
                <option value="litros" ${stock.unidad === 'litros' ? 'selected' : ''}>Litros</option>
                <option value="kilos" ${stock.unidad === 'kilos' ? 'selected' : ''}>Kilos</option>
                <option value="cajas" ${stock.unidad === 'cajas' ? 'selected' : ''}>Cajas</option>
                <option value="rollos" ${stock.unidad === 'rollos' ? 'selected' : ''}>Rollos</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Precio Unitario (€) *</label>
              <input type="number" name="precio_unitario" value="${stock.precio_unitario}" required step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad Actual *</label>
              <input type="number" name="cantidad_actual" value="${stock.cantidad_actual}" required step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad Mínima *</label>
              <input type="number" name="cantidad_minima" value="${stock.cantidad_minima}" required step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" name="proveedor" value="${stock.proveedor || ''}" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input type="text" name="ubicacion" value="${stock.ubicacion || ''}" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
              <i class="fas fa-save mr-2"></i>Guardar
            </button>
            <button type="button" onclick="closeModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('stock-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    try {
      if (isEdit) {
        await axios.put(`${API}/stock/${id}`, data)
      } else {
        await axios.post(`${API}/stock`, data)
      }
      closeModal()
      loadStock()
      showSuccess('Artículo guardado correctamente')
    } catch (error) {
      console.error(error)
      showError('Error al guardar artículo')
    }
  })
}

// ============================================
// FACTURAS
// ============================================

async function loadFacturas() {
  try {
    const { data } = await axios.get(`${API}/facturas`)
    currentData.facturas = data
    
    const container = document.getElementById('facturas-lista')
    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Factura</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IVA</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(f => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">${f.numero_factura}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${f.cliente_nombre} ${f.cliente_apellidos}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(f.fecha_emision).toLocaleDateString('es-ES')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${f.subtotal.toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${f.iva.toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">€${f.total.toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${getEstadoFacturaBadge(f.estado)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } catch (error) {
    console.error('Error cargando facturas:', error)
    showError('Error al cargar facturas')
  }
}

function getEstadoFacturaBadge(estado) {
  const badges = {
    'pendiente': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>',
    'pagada': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Pagada</span>',
    'vencida': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencida</span>'
  }
  return badges[estado] || estado
}

async function showFacturaForm() {
  const [clientesRes, trabajosRes] = await Promise.all([
    axios.get(`${API}/clientes`),
    axios.get(`${API}/trabajos`)
  ])
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">Nueva Factura</h3>
        <form id="factura-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nº Factura *</label>
              <input type="text" name="numero_factura" required 
                     placeholder="AH-2025-XXX"
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión *</label>
              <input type="date" name="fecha_emision" value="${new Date().toISOString().slice(0, 10)}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select name="cliente_id" required class="w-full px-4 py-2 border rounded-lg">
              <option value="">Seleccionar cliente</option>
              ${clientesRes.data.map(c => `
                <option value="${c.id}">${c.nombre} ${c.apellidos}</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Trabajo (opcional)</label>
            <select name="trabajo_id" class="w-full px-4 py-2 border rounded-lg">
              <option value="">Sin trabajo asociado</option>
              ${trabajosRes.data.map(t => `
                <option value="${t.id}">${t.tipo_servicio} - ${new Date(t.fecha_programada).toLocaleDateString('es-ES')}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Subtotal (€) *</label>
              <input type="number" name="subtotal" required step="0.01" 
                     oninput="calcularTotal()"
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">IVA (€)</label>
              <input type="number" name="iva" value="0" step="0.01" 
                     oninput="calcularTotal()"
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Total (€)</label>
              <input type="number" name="total" required step="0.01" readonly
                     class="w-full px-4 py-2 border rounded-lg bg-gray-50">
            </div>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg">
              <i class="fas fa-save mr-2"></i>Guardar
            </button>
            <button type="button" onclick="closeModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  // Función para calcular total
  window.calcularTotal = function() {
    const form = document.getElementById('factura-form')
    const subtotal = parseFloat(form.subtotal.value) || 0
    const iva = parseFloat(form.iva.value) || 0
    form.total.value = (subtotal + iva).toFixed(2)
  }
  
  document.getElementById('factura-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    if (!data.trabajo_id) data.trabajo_id = null
    
    try {
      await axios.post(`${API}/facturas`, data)
      closeModal()
      loadFacturas()
      showSuccess('Factura creada correctamente')
    } catch (error) {
      console.error(error)
      showError('Error al crear factura')
    }
  })
}

// ============================================
// REPORTES
// ============================================

async function loadReporte() {
  try {
    const mes = document.getElementById('reporte-mes').value
    const { data } = await axios.get(`${API}/reportes/mensual?mes=${mes}`)
    
    const container = document.getElementById('reporte-contenido')
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Resumen Financiero -->
        <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">📊 Resumen Financiero</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-white rounded-lg p-4">
              <p class="text-sm text-gray-600">Total Facturas</p>
              <p class="text-2xl font-bold text-gray-800">${data.financiero.total_facturas}</p>
            </div>
            <div class="bg-white rounded-lg p-4">
              <p class="text-sm text-gray-600">Ingresos</p>
              <p class="text-2xl font-bold text-green-600">€${(data.financiero.ingresos || 0).toFixed(2)}</p>
            </div>
            <div class="bg-white rounded-lg p-4">
              <p class="text-sm text-gray-600">Pendiente Cobro</p>
              <p class="text-2xl font-bold text-orange-600">€${(data.financiero.pendiente_cobro || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <!-- Trabajos -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">🛠️ Trabajos Realizados</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-3xl font-bold text-blue-600">${data.trabajos.total}</p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <p class="text-sm text-gray-600">Completados</p>
              <p class="text-3xl font-bold text-green-600">${data.trabajos.completados}</p>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <p class="text-sm text-gray-600">Satisfacción</p>
              <p class="text-3xl font-bold text-yellow-600">${(data.trabajos.satisfaccion || 0).toFixed(1)} ⭐</p>
            </div>
          </div>
        </div>
        
        <!-- Horas Trabajadas por Empleada -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">👷 Horas Trabajadas</h3>
          <div class="space-y-3">
            ${data.horas.map(h => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span class="font-medium text-gray-800">${h.nombre} ${h.apellidos}</span>
                <span class="font-bold text-gray-700">${(h.total_horas || 0).toFixed(1)}h</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Servicios Más Demandados -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">🔥 Servicios Más Demandados</h3>
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">Servicio</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">Cantidad</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-600">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              ${data.servicios.map(s => `
                <tr class="border-t">
                  <td class="px-4 py-2 text-gray-800">${s.tipo_servicio.replace('_', ' ')}</td>
                  <td class="px-4 py-2 font-semibold text-blue-600">${s.total}</td>
                  <td class="px-4 py-2 font-semibold text-green-600">€${(s.ingresos || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  } catch (error) {
    console.error('Error cargando reporte:', error)
    showError('Error al cargar reporte')
  }
}

// ============================================
// UTILIDADES
// ============================================

function closeModal() {
  const modals = document.querySelectorAll('.fixed.inset-0')
  modals.forEach(modal => modal.remove())
}

function showSuccess(message) {
  showToast(message, 'success')
}

function showError(message) {
  showToast(message, 'error')
}

function showToast(message, type) {
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500'
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
  
  const toast = document.createElement('div')
  toast.className = `fixed bottom-6 right-6 ${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 z-50 animate-slide-up`
  toast.innerHTML = `
    <i class="fas ${icon} text-xl"></i>
    <span class="font-medium">${message}</span>
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// Funciones stub para botones específicos
window.viewCliente = async (id) => {
  const { data } = await axios.get(`${API}/clientes/${id}`)
  alert(`Cliente: ${data.cliente.nombre} ${data.cliente.apellidos}\n\nTrabajo realizados: ${data.trabajos.length}\nFacturas: ${data.facturas.length}\nIncidencias: ${data.incidencias.length}`)
}

window.editCliente = (id) => showClienteForm(id)
window.editTrabajo = (id) => showTrabajoForm(id)
window.viewPersonal = async (id) => {
  const { data } = await axios.get(`${API}/personal/${id}`)
  const calificacion = data.personal.calificacion ? `\nCalificación: ${data.personal.calificacion} ⭐` : ''
  alert(`Personal: ${data.personal.nombre} ${data.personal.apellidos}${calificacion}\nTrabajos: ${data.trabajos.length}\nHoras registradas: ${data.horas.length}`)
}
window.editPersonal = (id) => showPersonalForm(id)
window.editStock = (id) => showStockForm(id)

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación
  checkAuth()
  loadUserInfo()
  
  // Ocultar pestañas según rol
  ocultarPestanasSegunRol()
  
  // Cargar dashboard
  loadDashboard()
})

// Ocultar pestañas según rol del usuario
function ocultarPestanasSegunRol() {
  const rol = getUserRole()
  
  if (rol === 'tienda') {
    // Ocultar pestañas sensibles para tienda
    const pestanasSensibles = ['personal', 'facturas', 'reportes']
    
    pestanasSensibles.forEach(tab => {
      const button = document.querySelector(`button[onclick="showTab('${tab}')"]`)
      if (button) {
        button.style.display = 'none'
      }
    })
    
    console.log('🏪 Modo Tienda: Pestañas sensibles ocultas')
  } else if (rol === 'duena') {
    console.log('👑 Modo Ana Ramos: Acceso completo')
  }
}

// ============================================
// PRESUPUESTOS
// ============================================

// Estado para líneas del presupuesto
let presupuestoLineas = {
  telas: [],
  materiales: [],
  confeccion: [],
  instalacion: []
}

// Cargar lista de presupuestos
async function loadPresupuestos() {
  try {
    const estado = document.getElementById('filter-estado-presupuesto')?.value || ''
    const url = estado ? `${API}/presupuestos?estado=${estado}` : `${API}/presupuestos`
    
    const response = await fetch(url)
    const presupuestos = await response.json()
    
    const lista = document.getElementById('presupuestos-lista')
    if (!presupuestos || presupuestos.length === 0) {
      lista.innerHTML = '<p class="text-center text-gray-500 py-8">No hay presupuestos registrados</p>'
      return
    }
    
    const estadoColor = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      enviado: 'bg-blue-100 text-blue-800',
      aceptado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }
    
    lista.innerHTML = `
      <table class="min-w-full bg-white">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${presupuestos.map(p => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.numero_presupuesto}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <a href="#" onclick="event.preventDefault(); showClienteInfo(${p.cliente_id})" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  ${p.cliente_nombre} ${p.cliente_apellidos}
                </a>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">${p.titulo}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(p.fecha_emision).toLocaleDateString()}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">€${parseFloat(p.total).toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${estadoColor[p.estado]}">${p.estado}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="viewPresupuesto(${p.id})" class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editPresupuesto(${p.id})" class="text-orange-600 hover:text-orange-800" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="downloadPresupuestoPDF(${p.id})" class="text-green-600 hover:text-green-800" title="Descargar PDF">
                  <i class="fas fa-file-pdf"></i>
                </button>
                ${p.estado === 'aceptado' && !p.trabajo_id ? `
                  <button onclick="convertirPresupuestoATrabajo(${p.id})" class="text-teal-600 hover:text-teal-800" title="Convertir a Trabajo">
                    <i class="fas fa-tasks"></i>
                  </button>
                ` : ''}
                ${p.trabajo_id ? `
                  <button onclick="showTab('trabajos'); setTimeout(() => viewTrabajo(${p.trabajo_id}), 300)" class="text-purple-600 hover:text-purple-800" title="Ver Trabajo">
                    <i class="fas fa-check-circle"></i>
                  </button>
                ` : ''}
                <button onclick="deletePresupuesto(${p.id})" class="text-red-600 hover:text-red-800" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } catch (error) {
    console.error('Error cargando presupuestos:', error)
    alert('Error al cargar presupuestos')
  }
}

// Ver detalles de presupuesto
async function viewPresupuesto(id) {
  try {
    const response = await fetch(`${API}/presupuestos/${id}`)
    const data = await response.json()
    
    const lineas = data.lineas || []
    const telas = lineas.filter(l => l.tipo === 'tela')
    const materiales = lineas.filter(l => l.tipo === 'material')
    const confeccion = lineas.filter(l => l.tipo === 'confeccion')
    const instalacion = lineas.filter(l => l.tipo === 'instalacion')
    
    const renderLineas = (items, titulo) => {
      if (items.length === 0) return ''
      return `
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 mb-2">${titulo}</h4>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">Concepto</th>
                <th class="px-4 py-2 text-right">Cantidad</th>
                <th class="px-4 py-2 text-right">Precio Unit.</th>
                <th class="px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr class="border-t">
                  <td class="px-4 py-2">${item.concepto}</td>
                  <td class="px-4 py-2 text-right">${item.cantidad} ${item.unidad}</td>
                  <td class="px-4 py-2 text-right">€${parseFloat(item.precio_unitario).toFixed(2)}</td>
                  <td class="px-4 py-2 text-right font-semibold">€${parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    }
    
    showModal(`
      <div class="space-y-6">
        <div class="border-b pb-4">
          <h3 class="text-2xl font-bold text-gray-800">${data.numero_presupuesto}</h3>
          <p class="text-gray-600">${data.titulo}</p>
          <p class="text-sm text-gray-500 mt-2">Cliente: ${data.cliente_nombre} ${data.cliente_apellidos}</p>
          <p class="text-sm text-gray-500">Fecha: ${new Date(data.fecha_emision).toLocaleDateString()}</p>
        </div>
        
        ${data.descripcion ? `<p class="text-gray-700">${data.descripcion}</p>` : ''}
        
        ${renderLineas(telas, '🧵 Telas')}
        ${renderLineas(materiales, '🔩 Materiales')}
        ${renderLineas(confeccion, '✂️ Confección')}
        ${renderLineas(instalacion, '🔧 Instalación')}
        
        <div class="border-t pt-4 space-y-2">
          <div class="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span class="font-semibold">€${parseFloat(data.subtotal).toFixed(2)}</span>
          </div>
          ${data.descuento_porcentaje > 0 ? `
            <div class="flex justify-between text-gray-700">
              <span>Descuento (${data.descuento_porcentaje}%):</span>
              <span class="font-semibold text-red-600">-€${parseFloat(data.descuento_importe).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between text-gray-700">
            <span>IVA (${data.porcentaje_iva}%):</span>
            <span class="font-semibold">€${parseFloat(data.importe_iva).toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
            <span>TOTAL:</span>
            <span class="text-green-600">€${parseFloat(data.total).toFixed(2)}</span>
          </div>
        </div>
        
        ${data.forma_pago ? `<p class="text-sm text-gray-600"><strong>Forma de pago:</strong> ${data.forma_pago}</p>` : ''}
        ${data.notas ? `<p class="text-sm text-gray-600"><strong>Notas:</strong> ${data.notas}</p>` : ''}
        ${data.condiciones ? `<p class="text-sm text-gray-500 text-xs mt-4">${data.condiciones}</p>` : ''}
      </div>
    `, 'max-w-4xl')
  } catch (error) {
    console.error('Error cargando presupuesto:', error)
    alert('Error al cargar presupuesto')
  }
}

// Mostrar formulario de nuevo presupuesto
async function showPresupuestoForm(presupuestoId = null, preselectedClienteId = null) {
  // Cargar clientes para el selector
  const clientesResponse = await fetch(`${API}/clientes`)
  const clientes = await clientesResponse.json()
  
  // Resetear líneas
  presupuestoLineas = {
    telas: [],
    materiales: [],
    confeccion: [],
    instalacion: []
  }
  
  showModal(`
    <form onsubmit="savePresupuesto(event)" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
          <select id="presupuesto-cliente" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800">
            <option value="">Seleccionar cliente...</option>
            ${clientes.map(c => `<option value="${c.id}" ${preselectedClienteId && c.id === preselectedClienteId ? 'selected' : ''}>${c.nombre} ${c.apellidos}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
          <select id="presupuesto-estado" class="w-full px-4 py-2 border rounded-lg">
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
        <input type="text" id="presupuesto-titulo" required class="w-full px-4 py-2 border rounded-lg">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
        <textarea id="presupuesto-descripcion" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea>
      </div>
      
      <!-- TELAS -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-semibold text-gray-700">🧵 Telas</h4>
          <button type="button" onclick="addLineaTela()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900">
            <i class="fas fa-plus mr-1"></i>Añadir
          </button>
        </div>
        <div id="telas-container"></div>
      </div>
      
      <!-- MATERIALES -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-semibold text-gray-700">🔩 Materiales</h4>
          <button type="button" onclick="addLineaMaterial()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900">
            <i class="fas fa-plus mr-1"></i>Añadir
          </button>
        </div>
        <div id="materiales-container"></div>
      </div>
      
      <!-- CONFECCIÓN -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-semibold text-gray-700">✂️ Confección</h4>
          <button type="button" onclick="addLineaConfeccion()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900">
            <i class="fas fa-plus mr-1"></i>Añadir
          </button>
        </div>
        <div id="confeccion-container"></div>
      </div>
      
      <!-- INSTALACIÓN -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-semibold text-gray-700">🔧 Instalación</h4>
          <button type="button" onclick="addLineaInstalacion()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900">
            <i class="fas fa-plus mr-1"></i>Añadir
          </button>
        </div>
        <div id="instalacion-container"></div>
      </div>
      
      <!-- TOTALES -->
      <div class="border-t pt-4 space-y-2">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Descuento (%)</label>
            <input type="number" id="presupuesto-descuento" value="0" min="0" max="100" step="0.1" 
                   oninput="calcularTotalesPresupuesto()" class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">IVA (%)</label>
            <input type="number" id="presupuesto-iva" value="21" min="0" max="100" step="0.1"
                   oninput="calcularTotalesPresupuesto()" class="w-full px-4 py-2 border rounded-lg">
          </div>
        </div>
        
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span id="total-subtotal" class="font-semibold">€0.00</span>
          </div>
          <div class="flex justify-between text-gray-700">
            <span>Descuento:</span>
            <span id="total-descuento" class="font-semibold text-red-600">€0.00</span>
          </div>
          <div class="flex justify-between text-gray-700">
            <span>IVA:</span>
            <span id="total-iva" class="font-semibold">€0.00</span>
          </div>
          <div class="flex justify-between text-xl font-bold text-gray-900 border-t mt-2 pt-2">
            <span>TOTAL:</span>
            <span id="total-final" class="text-green-600">€0.00</span>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
        <input type="text" id="presupuesto-forma-pago" placeholder="Ej: 50% Señal + 50% Final" class="w-full px-4 py-2 border rounded-lg">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Notas</label>
        <textarea id="presupuesto-notas" rows="2" class="w-full px-4 py-2 border rounded-lg"></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Condiciones</label>
        <textarea id="presupuesto-condiciones" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea>
      </div>
      
      <div class="flex gap-3 justify-end">
        <button type="button" onclick="closeModal()" class="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:shadow-lg">Guardar Presupuesto</button>
      </div>
    </form>
  `, 'max-w-6xl')
}

// Editar presupuesto existente
async function editPresupuesto(id) {
  try {
    const response = await fetch(`${API}/presupuestos/${id}`)
    const presupuesto = await response.json()
    const clientesResponse = await fetch(`${API}/clientes`)
    const clientes = await clientesResponse.json()
    const lineas = presupuesto.lineas || []
    presupuestoLineas = {
      telas: lineas.filter(l => l.tipo === 'tela').map(l => ({concepto: l.concepto, metros: l.cantidad, precio: l.precio_unitario})),
      materiales: lineas.filter(l => l.tipo === 'material').map(l => ({concepto: l.concepto, cantidad: l.cantidad, precio: l.precio_unitario})),
      confeccion: lineas.filter(l => l.tipo === 'confeccion').map(l => ({concepto: l.concepto, horas: l.cantidad, precio: l.precio_unitario})),
      instalacion: lineas.filter(l => l.tipo === 'instalacion').map(l => ({concepto: l.concepto, horas: l.cantidad, precio: l.precio_unitario}))
    }
    showModal(`
      <form onsubmit="updatePresupuesto(event, ${id})" class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-blue-800"><i class="fas fa-info-circle mr-2"></i>Editando presupuesto <strong>${presupuesto.numero_presupuesto}</strong></p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
            <select id="presupuesto-cliente" required class="w-full px-4 py-2 border rounded-lg">
              ${clientes.map(c => `<option value="${c.id}" ${c.id === presupuesto.cliente_id ? 'selected' : ''}>${c.nombre} ${c.apellidos}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select id="presupuesto-estado" class="w-full px-4 py-2 border rounded-lg">
              <option value="pendiente" ${presupuesto.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="enviado" ${presupuesto.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
              <option value="aceptado" ${presupuesto.estado === 'aceptado' ? 'selected' : ''}>Aceptado</option>
              <option value="rechazado" ${presupuesto.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
          <input type="text" id="presupuesto-titulo" required value="${presupuesto.titulo || ''}" class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
          <textarea id="presupuesto-descripcion" rows="3" class="w-full px-4 py-2 border rounded-lg">${presupuesto.descripcion || ''}</textarea>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">🧵 Telas</h4>
            <button type="button" onclick="addLineaTela()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"><i class="fas fa-plus mr-1"></i>Añadir</button>
          </div>
          <div id="telas-container"></div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">🔩 Materiales</h4>
            <button type="button" onclick="addLineaMaterial()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"><i class="fas fa-plus mr-1"></i>Añadir</button>
          </div>
          <div id="materiales-container"></div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">✂️ Confección</h4>
            <button type="button" onclick="addLineaConfeccion()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"><i class="fas fa-plus mr-1"></i>Añadir</button>
          </div>
          <div id="confeccion-container"></div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">🔧 Instalación</h4>
            <button type="button" onclick="addLineaInstalacion()" class="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"><i class="fas fa-plus mr-1"></i>Añadir</button>
          </div>
          <div id="instalacion-container"></div>
        </div>
        <div class="border-t pt-4 space-y-2">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Descuento (%)</label>
              <input type="number" id="presupuesto-descuento" value="${presupuesto.descuento_porcentaje || 0}" min="0" max="100" step="0.1" oninput="calcularTotalesPresupuesto()" class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">IVA (%)</label>
              <input type="number" id="presupuesto-iva" value="${presupuesto.porcentaje_iva || 21}" min="0" max="100" step="0.1" oninput="calcularTotalesPresupuesto()" class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="flex justify-between text-gray-700"><span>Subtotal:</span><span id="total-subtotal" class="font-semibold">€0.00</span></div>
            <div class="flex justify-between text-gray-700"><span>Descuento:</span><span id="total-descuento" class="font-semibold text-red-600">€0.00</span></div>
            <div class="flex justify-between text-gray-700"><span>IVA:</span><span id="total-iva" class="font-semibold">€0.00</span></div>
            <div class="flex justify-between text-xl font-bold text-gray-900 border-t mt-2 pt-2"><span>TOTAL:</span><span id="total-final" class="text-green-600">€0.00</span></div>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
          <input type="text" id="presupuesto-forma-pago" value="${presupuesto.forma_pago || ''}" placeholder="Ej: 50% Señal + 50% Final" class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notas</label>
          <textarea id="presupuesto-notas" rows="2" class="w-full px-4 py-2 border rounded-lg">${presupuesto.notas || ''}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Condiciones</label>
          <textarea id="presupuesto-condiciones" rows="3" class="w-full px-4 py-2 border rounded-lg">${presupuesto.condiciones || ''}</textarea>
        </div>
        <div class="flex gap-3 justify-end">
          <button type="button" onclick="closeModal()" class="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" class="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:shadow-lg"><i class="fas fa-save mr-2"></i>Actualizar Presupuesto</button>
        </div>
      </form>
    `, 'max-w-6xl')
    renderLineasTelas()
    renderLineasMateriales()
    renderLineasConfeccion()
    renderLineasInstalacion()
    calcularTotalesPresupuesto()
  } catch (error) {
    console.error('Error cargando presupuesto:', error)
    alert('Error al cargar presupuesto para editar')
  }
}

async function updatePresupuesto(event, id) {
  event.preventDefault()
  const lineas = []
  presupuestoLineas.telas.forEach(l => { if (l.concepto && l.metros && l.precio) lineas.push({tipo: 'tela', concepto: l.concepto, metros: parseFloat(l.metros), precio: parseFloat(l.precio)}) })
  presupuestoLineas.materiales.forEach(l => { if (l.concepto && l.cantidad && l.precio) lineas.push({tipo: 'material', concepto: l.concepto, cantidad: parseFloat(l.cantidad), precio: parseFloat(l.precio)}) })
  presupuestoLineas.confeccion.forEach(l => { if (l.concepto && l.horas && l.precio) lineas.push({tipo: 'confeccion', concepto: l.concepto, horas: parseFloat(l.horas), precio: parseFloat(l.precio)}) })
  presupuestoLineas.instalacion.forEach(l => { if (l.concepto && l.horas && l.precio) lineas.push({tipo: 'instalacion', concepto: l.concepto, horas: parseFloat(l.horas), precio: parseFloat(l.precio)}) })
  if (lineas.length === 0) { alert('Debe añadir al menos una línea al presupuesto'); return }
  const data = {
    cliente_id: parseInt(document.getElementById('presupuesto-cliente').value),
    estado: document.getElementById('presupuesto-estado').value,
    titulo: document.getElementById('presupuesto-titulo').value,
    descripcion: document.getElementById('presupuesto-descripcion').value,
    descuento_porcentaje: parseFloat(document.getElementById('presupuesto-descuento').value || 0),
    porcentaje_iva: parseFloat(document.getElementById('presupuesto-iva').value || 21),
    forma_pago: document.getElementById('presupuesto-forma-pago').value,
    notas: document.getElementById('presupuesto-notas').value,
    condiciones: document.getElementById('presupuesto-condiciones').value,
    lineas: lineas
  }
  try {
    const response = await fetch(`${API}/presupuestos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const result = await response.json()
    if (result.success) {
      showToast('Presupuesto actualizado correctamente', 'success')
      closeModal()
      loadPresupuestos()
    } else {
      alert('Error al actualizar: ' + (result.message || 'Error desconocido'))
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error al actualizar presupuesto')
  }
}

// Funciones para añadir líneas
function addLineaTela() {
  presupuestoLineas.telas.push({ concepto: '', metros: '', precio: '' })
  renderLineasTelas()
}

function addLineaMaterial() {
  presupuestoLineas.materiales.push({ concepto: '', cantidad: '', precio: '' })
  renderLineasMateriales()
}

function addLineaConfeccion() {
  presupuestoLineas.confeccion.push({ concepto: '', horas: '', precio: '' })
  renderLineasConfeccion()
}

function addLineaInstalacion() {
  presupuestoLineas.instalacion.push({ concepto: '', horas: '', precio: '' })
  renderLineasInstalacion()
}

// Funciones para eliminar líneas
function removeLineaTela(idx) {
  presupuestoLineas.telas.splice(idx, 1)
  renderLineasTelas()
}

function removeLineaMaterial(idx) {
  presupuestoLineas.materiales.splice(idx, 1)
  renderLineasMateriales()
}

function removeLineaConfeccion(idx) {
  presupuestoLineas.confeccion.splice(idx, 1)
  renderLineasConfeccion()
}

function removeLineaInstalacion(idx) {
  presupuestoLineas.instalacion.splice(idx, 1)
  renderLineasInstalacion()
}

// Renderizar líneas
function renderLineasTelas() {
  const container = document.getElementById('telas-container')
  if (!presupuestoLineas.telas.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">No hay telas añadidas</p>'
    calcularTotalesPresupuesto()
    return
  }
  
  container.innerHTML = presupuestoLineas.telas.map((l, i) => `
    <div class="grid grid-cols-12 gap-2 mb-2">
      <input type="text" placeholder="Concepto" value="${l.concepto || ''}"
             oninput="presupuestoLineas.telas[${i}].concepto = this.value"
             class="col-span-5 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="Metros" value="${l.metros || ''}" step="0.01"
             oninput="presupuestoLineas.telas[${i}].metros = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="€/m" value="${l.precio || ''}" step="0.01"
             oninput="presupuestoLineas.telas[${i}].precio = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <button type="button" onclick="removeLineaTela(${i})" class="col-span-1 text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('')
  
  calcularTotalesPresupuesto()
}

function renderLineasMateriales() {
  const container = document.getElementById('materiales-container')
  if (!presupuestoLineas.materiales.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">No hay materiales añadidos</p>'
    calcularTotalesPresupuesto()
    return
  }
  
  container.innerHTML = presupuestoLineas.materiales.map((l, i) => `
    <div class="grid grid-cols-12 gap-2 mb-2">
      <input type="text" placeholder="Concepto" value="${l.concepto || ''}"
             oninput="presupuestoLineas.materiales[${i}].concepto = this.value"
             class="col-span-5 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="Cantidad" value="${l.cantidad || ''}" step="0.01"
             oninput="presupuestoLineas.materiales[${i}].cantidad = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="€/ud" value="${l.precio || ''}" step="0.01"
             oninput="presupuestoLineas.materiales[${i}].precio = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <button type="button" onclick="removeLineaMaterial(${i})" class="col-span-1 text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('')
  
  calcularTotalesPresupuesto()
}

function renderLineasConfeccion() {
  const container = document.getElementById('confeccion-container')
  if (!presupuestoLineas.confeccion.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">No hay confección añadida</p>'
    calcularTotalesPresupuesto()
    return
  }
  
  container.innerHTML = presupuestoLineas.confeccion.map((l, i) => `
    <div class="grid grid-cols-12 gap-2 mb-2">
      <input type="text" placeholder="Concepto" value="${l.concepto || ''}"
             oninput="presupuestoLineas.confeccion[${i}].concepto = this.value"
             class="col-span-5 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="Horas" value="${l.horas || ''}" step="0.01"
             oninput="presupuestoLineas.confeccion[${i}].horas = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="€/h" value="${l.precio || ''}" step="0.01"
             oninput="presupuestoLineas.confeccion[${i}].precio = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <button type="button" onclick="removeLineaConfeccion(${i})" class="col-span-1 text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('')
  
  calcularTotalesPresupuesto()
}

function renderLineasInstalacion() {
  const container = document.getElementById('instalacion-container')
  if (!presupuestoLineas.instalacion.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">No hay instalación añadida</p>'
    calcularTotalesPresupuesto()
    return
  }
  
  container.innerHTML = presupuestoLineas.instalacion.map((l, i) => `
    <div class="grid grid-cols-12 gap-2 mb-2">
      <input type="text" placeholder="Concepto" value="${l.concepto || ''}"
             oninput="presupuestoLineas.instalacion[${i}].concepto = this.value"
             class="col-span-5 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="Horas" value="${l.horas || ''}" step="0.01"
             oninput="presupuestoLineas.instalacion[${i}].horas = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <input type="number" placeholder="€/h" value="${l.precio || ''}" step="0.01"
             oninput="presupuestoLineas.instalacion[${i}].precio = parseFloat(this.value) || 0; calcularTotalesPresupuesto()"
             class="col-span-3 px-3 py-2 border rounded text-sm">
      <button type="button" onclick="removeLineaInstalacion(${i})" class="col-span-1 text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('')
  
  calcularTotalesPresupuesto()
}

// Calcular totales
function calcularTotalesPresupuesto() {
  let subtotal = 0
  
  // Sumar telas
  presupuestoLineas.telas.forEach(l => {
    subtotal += (l.metros || 0) * (l.precio || 0)
  })
  
  // Sumar materiales
  presupuestoLineas.materiales.forEach(l => {
    subtotal += (l.cantidad || 0) * (l.precio || 0)
  })
  
  // Sumar confección
  presupuestoLineas.confeccion.forEach(l => {
    subtotal += (l.horas || 0) * (l.precio || 0)
  })
  
  // Sumar instalación
  presupuestoLineas.instalacion.forEach(l => {
    subtotal += (l.horas || 0) * (l.precio || 0)
  })
  
  const descuentoPct = parseFloat(document.getElementById('presupuesto-descuento')?.value || 0)
  const ivaPct = parseFloat(document.getElementById('presupuesto-iva')?.value || 21)
  
  const descuento = subtotal * (descuentoPct / 100)
  const baseImponible = subtotal - descuento
  const iva = baseImponible * (ivaPct / 100)
  const total = baseImponible + iva
  
  document.getElementById('total-subtotal').textContent = `€${subtotal.toFixed(2)}`
  document.getElementById('total-descuento').textContent = `€${descuento.toFixed(2)}`
  document.getElementById('total-iva').textContent = `€${iva.toFixed(2)}`
  document.getElementById('total-final').textContent = `€${total.toFixed(2)}`
}

// Guardar presupuesto
async function savePresupuesto(event) {
  event.preventDefault()
  
  // Recopilar todas las líneas
  const lineas = []
  
  presupuestoLineas.telas.forEach(l => {
    if (l.concepto && l.metros && l.precio) {
      lineas.push({
        tipo: 'tela',
        concepto: l.concepto,
        metros: parseFloat(l.metros),
        precio: parseFloat(l.precio)
      })
    }
  })
  
  presupuestoLineas.materiales.forEach(l => {
    if (l.concepto && l.cantidad && l.precio) {
      lineas.push({
        tipo: 'material',
        concepto: l.concepto,
        cantidad: parseFloat(l.cantidad),
        precio: parseFloat(l.precio)
      })
    }
  })
  
  presupuestoLineas.confeccion.forEach(l => {
    if (l.concepto && l.horas && l.precio) {
      lineas.push({
        tipo: 'confeccion',
        concepto: l.concepto,
        horas: parseFloat(l.horas),
        precio: parseFloat(l.precio)
      })
    }
  })
  
  presupuestoLineas.instalacion.forEach(l => {
    if (l.concepto && l.horas && l.precio) {
      lineas.push({
        tipo: 'instalacion',
        concepto: l.concepto,
        horas: parseFloat(l.horas),
        precio: parseFloat(l.precio)
      })
    }
  })
  
  if (lineas.length === 0) {
    alert('Debe añadir al menos una línea al presupuesto')
    return
  }
  
  const data = {
    cliente_id: parseInt(document.getElementById('presupuesto-cliente').value),
    estado: document.getElementById('presupuesto-estado').value,
    titulo: document.getElementById('presupuesto-titulo').value,
    descripcion: document.getElementById('presupuesto-descripcion').value,
    descuento_porcentaje: parseFloat(document.getElementById('presupuesto-descuento').value || 0),
    porcentaje_iva: parseFloat(document.getElementById('presupuesto-iva').value || 21),
    forma_pago: document.getElementById('presupuesto-forma-pago').value,
    notas: document.getElementById('presupuesto-notas').value,
    condiciones: document.getElementById('presupuesto-condiciones').value,
    lineas: lineas
  }
  
  try {
    const response = await fetch(`${API}/presupuestos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (result.success) {
      alert('Presupuesto guardado correctamente: ' + result.numero_presupuesto)
      closeModal()
      loadPresupuestos()
    } else {
      alert('Error al guardar presupuesto')
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error al guardar presupuesto')
  }
}

// Eliminar presupuesto
async function deletePresupuesto(id) {
  if (!confirm('¿Está seguro de eliminar este presupuesto?')) return
  
  try {
    await fetch(`${API}/presupuestos/${id}`, { method: 'DELETE' })
    loadPresupuestos()
  } catch (error) {
    console.error('Error eliminando presupuesto:', error)
    alert('Error al eliminar presupuesto')
  }
}

// Helper: Cargar imagen como base64
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg'))
    }
    img.onerror = reject
    img.src = url
  })
}

// Descargar PDF con diseño premium
async function downloadPresupuestoPDF(id) {
  try {
    // Obtener datos del presupuesto
    const response = await axios.get(`${API}/presupuestos/${id}`)
    const data = response.data
    
    // Agrupar líneas por tipo
    const lineas = data.lineas || []
    const telas = lineas.filter(l => l.tipo === 'tela')
    const materiales = lineas.filter(l => l.tipo === 'material')
    const confeccion = lineas.filter(l => l.tipo === 'confeccion')
    const instalacion = lineas.filter(l => l.tipo === 'instalacion')
    
    // Crear PDF
    const { jsPDF } = window.jspdf
    const doc = new jsPDF()
    
    // Configuración de colores minimalistas
    const primaryColor = [45, 55, 72] // gray-800
    const secondaryColor = [113, 128, 150] // gray-500
    const accentColor = [56, 178, 172] // teal-500
    const lightGray = [247, 250, 252] // gray-50
    const darkGray = [26, 32, 44] // gray-900
    
    let yPos = 10
    
    // ====================================
    // HEADER COMPACTO Y LIMPIO
    // ====================================
    
    // Logo de Anushka Hogar (más pequeño)
    try {
      const logoImg = await loadImage('/static/logo.jpg')
      doc.addImage(logoImg, 'JPEG', 20, yPos, 28, 20)
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e)
      // Fallback: texto estilizado
      doc.setFillColor(...primaryColor)
      doc.rect(20, yPos, 28, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('ANUSHKA', 34, yPos + 11, { align: 'center' })
      doc.setFontSize(7)
      doc.text('HOGAR', 34, yPos + 16, { align: 'center' })
    }
    
    // Datos de empresa (compactos)
    doc.setTextColor(...primaryColor)
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.text('Anushka Hogar', 190, yPos + 2, { align: 'right' })
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...secondaryColor)
    doc.text('Av. de Monelos 109, 15008 A Coruña', 190, yPos + 7, { align: 'right' })
    doc.text('Tel: 666777888', 190, yPos + 11, { align: 'right' })
    
    yPos += 22
    
    // ====================================
    // TÍTULO Y DATOS COMPACTOS
    // ====================================
    doc.setDrawColor(...secondaryColor)
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 190, yPos)
    yPos += 5
    
    // Título presupuesto
    doc.setTextColor(...primaryColor)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('PRESUPUESTO', 20, yPos)
    
    doc.setFontSize(10)
    doc.setTextColor(...accentColor)
    doc.text(data.numero_presupuesto, 190, yPos, { align: 'right' })
    
    yPos += 6
    
    // Cliente y fecha en una línea compacta
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...primaryColor)
    doc.text(`Cliente: ${data.cliente_nombre} ${data.cliente_apellidos}`, 20, yPos)
    
    doc.setTextColor(...secondaryColor)
    doc.text(`Fecha: ${new Date(data.fecha_emision).toLocaleDateString('es-ES')}`, 190, yPos, { align: 'right' })
    
    yPos += 4
    
    // Dirección compacta
    doc.setFontSize(7)
    doc.text(`${data.cliente_direccion || ''}, ${data.cliente_ciudad || ''} - Tel: ${data.cliente_telefono || '666777888'} | Email: ${data.cliente_email || '-'}`, 20, yPos)
    
    yPos += 5
    
    // Título del trabajo
    if (data.titulo) {
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryColor)
      doc.text(data.titulo, 20, yPos)
      yPos += 5
    }
    
    // ====================================
    // LÍNEAS DEL PRESUPUESTO
    // ====================================
    
    // Función helper para crear tabla minimalista y compacta
    const createTable = (title, items, unit) => {
      if (items.length === 0) return
      
      // Título de sección simple y limpio
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryColor)
      doc.text(title.toUpperCase(), 20, yPos)
      yPos += 5
      
      // Tabla compacta con diseño minimalista
      const tableData = items.map(item => [
        item.concepto,
        item.cantidad.toFixed(2),
        unit,
        `€${item.precio_unitario.toFixed(2)}`,
        `€${item.subtotal.toFixed(2)}`
      ])
      
      doc.autoTable({
        startY: yPos,
        head: [['Concepto', 'Cant.', 'Unidad', 'Precio', 'Subtotal']],
        body: tableData,
        theme: 'plain',
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [230, 230, 230],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: lightGray,
          textColor: primaryColor,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7
        },
        columnStyles: {
          0: { cellWidth: 90, halign: 'left' },
          1: { cellWidth: 18, halign: 'right' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
      })
      
      yPos = doc.lastAutoTable.finalY + 5
    }
    
    // Telas
    if (telas.length > 0) {
      createTable('Telas', telas, 'metros')
    }
    
    // Materiales
    if (materiales.length > 0) {
      createTable('Materiales', materiales, 'ud')
    }
    
    // Confección
    if (confeccion.length > 0) {
      createTable('Confeccion', confeccion, 'horas')
    }
    
    // Instalación
    if (instalacion.length > 0) {
      createTable('Instalacion', instalacion, 'horas')
    }
    
    // ====================================
    // TOTALES COMPACTOS
    // ====================================
    
    yPos += 3
    
    // Caja de totales minimalista
    const boxX = 125
    const boxY = yPos
    const boxWidth = 65
    
    // Línea superior
    doc.setDrawColor(...secondaryColor)
    doc.setLineWidth(0.2)
    doc.line(boxX, boxY, boxX + boxWidth, boxY)
    
    yPos += 4
    
    // Subtotal
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...secondaryColor)
    doc.text('Subtotal:', boxX + 2, yPos, { align: 'left' })
    doc.setTextColor(...primaryColor)
    doc.text(`€${data.subtotal.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
    yPos += 4
    
    // Descuento (si existe)
    if (data.descuento_porcentaje > 0) {
      doc.setTextColor(...secondaryColor)
      doc.text(`Descuento (${data.descuento_porcentaje}%):`, boxX + 2, yPos, { align: 'left' })
      doc.setTextColor(220, 38, 38)
      doc.text(`-€${data.descuento_importe.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
      yPos += 4
    }
    
    // IVA
    doc.setTextColor(...secondaryColor)
    doc.text(`IVA (${data.porcentaje_iva}%):`, boxX + 2, yPos, { align: 'left' })
    doc.setTextColor(...primaryColor)
    doc.text(`€${data.importe_iva.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
    yPos += 4
    
    // Línea separadora
    doc.setDrawColor(...accentColor)
    doc.setLineWidth(0.5)
    doc.line(boxX, yPos, boxX + boxWidth, yPos)
    yPos += 5
    
    // TOTAL FINAL
    doc.setFillColor(...accentColor)
    doc.rect(boxX, yPos - 4, boxWidth, 8, 'F')
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL:', boxX + 2, yPos, { align: 'left' })
    doc.setFontSize(11)
    doc.text(`€${data.total.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
    
    yPos += 15
    
    // ====================================
    // NOTAS Y CONDICIONES
    // ====================================
    
    if (data.notas || data.condiciones || data.forma_pago) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryColor)
      
      if (data.notas) {
        doc.text('NOTAS:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...secondaryColor)
        const splitNotas = doc.splitTextToSize(data.notas, 170)
        doc.text(splitNotas, 20, yPos)
        yPos += splitNotas.length * 3.5 + 5
      }
      
      if (data.condiciones) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryColor)
        doc.text('CONDICIONES:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...secondaryColor)
        const splitCond = doc.splitTextToSize(data.condiciones, 170)
        doc.text(splitCond, 20, yPos)
        yPos += splitCond.length * 3.5 + 5
      }
      
      if (data.forma_pago) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryColor)
        doc.text('FORMA DE PAGO:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...secondaryColor)
        doc.text(data.forma_pago, 20, yPos)
      }
    }
    
    // ====================================
    // PIE DE PÁGINA MINIMALISTA
    // ====================================
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      // Línea superior simple
      doc.setDrawColor(...secondaryColor)
      doc.setLineWidth(0.2)
      doc.line(20, 285, 190, 285)
      
      // Texto del pie de página compacto
      doc.setFontSize(6)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(...secondaryColor)
      doc.text(
        `Anushka Hogar - Av. de Monelos 109, 15008 A Coruña - Tel: 666777888`,
        105,
        289,
        { align: 'center' }
      )
      
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        292,
        { align: 'center' }
      )
    }
    
    // ====================================
    // DESCARGAR PDF
    // ====================================
    const filename = `Presupuesto_${data.numero_presupuesto}_${data.cliente_apellidos}.pdf`
    doc.save(filename)
    
    showToast('PDF generado correctamente', 'success')
    
  } catch (error) {
    console.error('Error al generar PDF:', error)
    showToast('Error al generar el PDF', 'error')
  }
}

// ============================================
// NAVEGACIÓN BIDIRECCIONAL CLIENTES ↔ PRESUPUESTOS
// ============================================

// Ver presupuestos de un cliente específico
async function showClientePresupuestos(clienteId) {
  try {
    // Obtener datos del cliente
    const clienteResponse = await axios.get(`${API}/clientes/${clienteId}`)
    const cliente = clienteResponse.data.cliente
    
    // Obtener presupuestos del cliente
    const presupuestosResponse = await axios.get(`${API}/presupuestos?cliente_id=${clienteId}`)
    const presupuestos = presupuestosResponse.data
    
    const estadoColor = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      enviado: 'bg-blue-100 text-blue-800',
      aceptado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }
    
    const html = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) closeModal()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="text-2xl font-bold text-gray-800">
                <i class="fas fa-file-alt text-purple-600 mr-2"></i>
                Presupuestos de ${cliente.nombre} ${cliente.apellidos}
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-phone mr-1"></i>${cliente.telefono}
                ${cliente.email ? `<span class="ml-3"><i class="fas fa-envelope mr-1"></i>${cliente.email}</span>` : ''}
              </p>
            </div>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          
          ${presupuestos.length === 0 ? `
            <div class="text-center py-12">
              <i class="fas fa-inbox text-gray-300 text-6xl mb-4"></i>
              <p class="text-gray-500 text-lg mb-6">Este cliente no tiene presupuestos aún</p>
              <button onclick="closeModal(); showPresupuestoForm(null, ${clienteId})" 
                      class="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:shadow-lg">
                <i class="fas fa-plus mr-2"></i>Crear Primer Presupuesto
              </button>
            </div>
          ` : `
            <div class="mb-4">
              <button onclick="closeModal(); showPresupuestoForm(null, ${clienteId})" 
                      class="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:shadow-lg text-sm">
                <i class="fas fa-plus mr-2"></i>Nuevo Presupuesto
              </button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white border rounded-lg">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  ${presupuestos.map(p => `
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">${p.numero_presupuesto}</td>
                      <td class="px-4 py-3 text-sm text-gray-900">${p.titulo}</td>
                      <td class="px-4 py-3 text-sm text-gray-500">${new Date(p.fecha_emision).toLocaleDateString()}</td>
                      <td class="px-4 py-3 text-sm font-semibold text-green-600">€${parseFloat(p.total).toFixed(2)}</td>
                      <td class="px-4 py-3">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${estadoColor[p.estado]}">${p.estado}</span>
                      </td>
                      <td class="px-4 py-3 text-sm space-x-2">
                        <button onclick="event.stopPropagation(); viewPresupuesto(${p.id})" 
                                class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="event.stopPropagation(); closeModal(); editPresupuesto(${p.id})" 
                                class="text-orange-600 hover:text-orange-800" title="Editar">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); downloadPresupuestoPDF(${p.id})" 
                                class="text-green-600 hover:text-green-800" title="Descargar PDF">
                          <i class="fas fa-file-pdf"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p class="text-2xl font-bold text-gray-800">${presupuestos.length}</p>
                  <p class="text-sm text-gray-600">Total Presupuestos</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-green-600">
                    €${presupuestos.reduce((sum, p) => sum + parseFloat(p.total), 0).toFixed(2)}
                  </p>
                  <p class="text-sm text-gray-600">Valor Total</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-teal-600">
                    ${presupuestos.filter(p => p.estado === 'aceptado').length}
                  </p>
                  <p class="text-sm text-gray-600">Aceptados</p>
                </div>
              </div>
            </div>
          `}
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
  } catch (error) {
    console.error('Error al cargar presupuestos del cliente:', error)
    showToast('Error al cargar presupuestos del cliente', 'error')
  }
}

// Ver información del cliente desde presupuestos
async function showClienteInfo(clienteId) {
  try {
    const response = await axios.get(`${API}/clientes/${clienteId}`)
    const cliente = response.data.cliente
    
    // Obtener cantidad de presupuestos del cliente
    const presupuestosResponse = await axios.get(`${API}/presupuestos?cliente_id=${clienteId}`)
    const presupuestos = presupuestosResponse.data
    
    const html = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) closeModal()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-user text-blue-600 mr-2"></i>
              Información del Cliente
            </h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          
          <div class="space-y-4 mb-6">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-lg font-bold text-gray-800 mb-3">
                ${cliente.nombre} ${cliente.apellidos}
              </h4>
              <div class="space-y-2 text-sm">
                ${cliente.telefono ? `
                  <p><i class="fas fa-phone w-5 text-gray-400"></i> ${cliente.telefono}</p>
                ` : ''}
                ${cliente.email ? `
                  <p><i class="fas fa-envelope w-5 text-gray-400"></i> ${cliente.email}</p>
                ` : ''}
                ${cliente.direccion ? `
                  <p><i class="fas fa-map-marker-alt w-5 text-gray-400"></i> ${cliente.direccion}</p>
                ` : ''}
                ${cliente.ciudad ? `
                  <p><i class="fas fa-city w-5 text-gray-400"></i> ${cliente.ciudad} ${cliente.codigo_postal ? `(${cliente.codigo_postal})` : ''}</p>
                ` : ''}
              </div>
            </div>
            
            ${cliente.notas ? `
              <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p class="text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-sticky-note text-yellow-600 mr-2"></i>Notas
                </p>
                <p class="text-sm text-gray-600">${cliente.notas}</p>
              </div>
            ` : ''}
            
            <div class="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <p class="text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-chart-line text-teal-600 mr-2"></i>Resumen de Presupuestos
              </p>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-2xl font-bold text-gray-800">${presupuestos.length}</p>
                  <p class="text-xs text-gray-600">Total presupuestos</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-green-600">${presupuestos.filter(p => p.estado === 'aceptado').length}</p>
                  <p class="text-xs text-gray-600">Aceptados</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button onclick="closeModal(); showClientePresupuestos(${clienteId})" 
                    class="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-medium">
              <i class="fas fa-file-alt mr-2"></i>Ver Todos los Presupuestos
            </button>
            <button onclick="closeModal(); showPresupuestoForm(null, ${clienteId})" 
                    class="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:shadow-lg font-medium">
              <i class="fas fa-plus mr-2"></i>Nuevo Presupuesto
            </button>
          </div>
          
          <button onclick="closeModal()" 
                  class="w-full mt-3 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
            Cerrar
          </button>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
  } catch (error) {
    console.error('Error al cargar información del cliente:', error)
    showToast('Error al cargar información del cliente', 'error')
  }
}

// ============================================
// CONVERTIR PRESUPUESTO A TRABAJO
// ============================================

async function convertirPresupuestoATrabajo(presupuestoId) {
  if (!confirm('¿Convertir este presupuesto aceptado en un trabajo?\n\nSe creará un trabajo pendiente con todas las fases del presupuesto.')) {
    return
  }
  
  try {
    const response = await axios.post(`${API}/presupuestos/${presupuestoId}/convertir-a-trabajo`)
    
    if (response.data.success) {
      showToast('¡Trabajo creado correctamente!', 'success')
      loadPresupuestos()
      
      // Preguntar si quiere ir al trabajo
      if (confirm('¿Quieres ver el trabajo creado?')) {
        showTab('trabajos')
        setTimeout(() => {
          viewTrabajo(response.data.trabajo_id)
        }, 500)
      }
    }
  } catch (error) {
    console.error('Error al convertir presupuesto:', error)
    const mensaje = error.response?.data?.error || 'Error al convertir presupuesto a trabajo'
    showToast(mensaje, 'error')
  }
}

// ============================================
// GESTIÓN DE FASES DE TRABAJO (CONTROL MANUAL)
// ============================================

// Toggle manual de fase (checkbox)
async function toggleFase(trabajoId, faseId, nombreFase, checked) {
  try {
    const nuevoEstado = checked ? 'completado' : 'pendiente'
    
    await axios.put(`${API}/trabajos/${faseId}/fases/${faseId}`, {
      estado: nuevoEstado,
      notas: '' // Las notas se mantienen
    })
    
    showToast(checked ? `✓ ${nombreFase} marcada como completada` : `${nombreFase} marcada como pendiente`, 'success')
    
    // Recargar modal para actualizar UI
    closeModal()
    setTimeout(() => viewTrabajo(trabajoId), 300)
    
    // Recargar lista de trabajos
    if (document.querySelector('.tab-button[onclick*="trabajos"]')?.classList.contains('active')) {
      loadTrabajos()
    }
  } catch (error) {
    console.error('Error al cambiar estado de fase:', error)
    showToast('Error al actualizar la fase', 'error')
    // Revertir checkbox
    const checkbox = document.getElementById(`fase-${faseId}`)
    if (checkbox) checkbox.checked = !checked
  }
}

// Editar notas de una fase
async function editarNotasFase(trabajoId, faseId, nombreFase, notasActuales) {
  const notas = prompt(`Notas para "${nombreFase}":`, notasActuales)
  
  if (notas === null) return // Usuario canceló
  
  try {
    // Obtener estado actual de la fase
    const { data: fases } = await axios.get(`${API}/trabajos/${trabajoId}/fases`)
    const fase = fases.find(f => f.id === faseId)
    
    await axios.put(`${API}/trabajos/${trabajoId}/fases/${faseId}`, {
      estado: fase.estado,
      notas: notas
    })
    
    showToast('Notas actualizadas correctamente', 'success')
    
    // Recargar modal
    closeModal()
    setTimeout(() => viewTrabajo(trabajoId), 300)
  } catch (error) {
    console.error('Error al actualizar notas:', error)
    showToast('Error al guardar las notas', 'error')
  }
}

// Asignar personal a una fase
async function asignarPersonalAFase(trabajoId, faseId, personalId) {
  try {
    // Obtener estado actual de la fase
    const { data: fases } = await axios.get(`${API}/trabajos/${trabajoId}/fases`)
    const fase = fases.find(f => f.id === faseId)
    
    if (!fase) {
      showToast('Error: Fase no encontrada', 'error')
      return
    }
    
    await axios.put(`${API}/trabajos/${trabajoId}/fases/${faseId}`, {
      estado: fase.estado,
      notas: fase.notas,
      personal_id: personalId || null
    })
    
    if (personalId) {
      showToast('✓ Personal asignado correctamente', 'success')
    } else {
      showToast('Personal removido de la fase', 'success')
    }
    
    // Recargar modal
    closeModal()
    setTimeout(() => viewTrabajo(trabajoId), 300)
  } catch (error) {
    console.error('Error al asignar personal:', error)
    showToast('Error al asignar personal a la fase', 'error')
  }
}

// ============================================
// GESTIÓN DE CATEGORÍAS
// ============================================

let categoriasCache = []

async function loadCategorias() {
  try {
    const { data } = await axios.get(`${API}/categorias`)
    categoriasCache = data
    return data
  } catch (error) {
    console.error('Error cargando categorías:', error)
    return []
  }
}

async function showGestionCategorias() {
  await loadCategorias()
  
  showModal(`
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold">
          <i class="fas fa-tags text-teal-600 mr-2"></i>
          Gestión de Categorías
        </h3>
        <button onclick="showCategoriaForm()" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          <i class="fas fa-plus mr-2"></i>Nueva Categoría
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="categorias-grid">
        ${categoriasCache.map(cat => `
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow" style="border-left: 4px solid ${cat.color}">
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background-color: ${cat.color}20">
                  <i class="fas ${cat.icono} text-xl" style="color: ${cat.color}"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-900">${cat.nombre}</h4>
                  <p class="text-xs text-gray-500">Orden: ${cat.orden}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button onclick="editCategoria(${cat.id})" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCategoria(${cat.id}, '${cat.nombre}')" class="text-red-600 hover:text-red-800">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            ${cat.descripcion ? `<p class="text-sm text-gray-600 mt-2">${cat.descripcion}</p>` : ''}
            
            <div class="mt-3 pt-3 border-t border-gray-200">
              <button onclick="closeModal(); setTimeout(() => showStockForm(null, ${cat.id}), 300)" 
                      class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>Añadir Artículo en ${cat.nombre}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `, 'max-w-4xl')
}

async function showCategoriaForm(id = null) {
  const isEdit = id !== null
  let categoria = {
    nombre: '',
    descripcion: '',
    color: '#6B7280',
    icono: 'fa-box',
    orden: 0
  }
  
  if (isEdit) {
    categoria = categoriasCache.find(c => c.id === id)
  }
  
  showModal(`
    <h3 class="text-xl font-bold mb-6">
      <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'} text-teal-600 mr-2"></i>
      ${isEdit ? 'Editar' : 'Nueva'} Categoría
    </h3>
    <form id="categoria-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input type="text" name="nombre" value="${categoria.nombre}" required 
               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea name="descripcion" rows="2" 
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">${categoria.descripcion || ''}</textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input type="color" name="color" value="${categoria.color}" 
                 class="w-full h-10 px-2 py-1 border rounded-lg cursor-pointer">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
          <input type="number" name="orden" value="${categoria.orden}" min="0"
                 class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Icono (FontAwesome)</label>
        <div class="grid grid-cols-6 gap-2">
          ${['fa-box', 'fa-cut', 'fa-grip-lines', 'fa-paperclip', 'fa-layer-group', 'fa-scissors', 
             'fa-tools', 'fa-ruler', 'fa-paint-brush', 'fa-store', 'fa-tag', 'fa-shopping-bag'].map(icon => `
            <button type="button" onclick="selectIcon('${icon}')" 
                    class="icon-selector p-3 border rounded-lg hover:bg-gray-50 ${categoria.icono === icon ? 'bg-teal-50 border-teal-500' : ''}"
                    data-icon="${icon}">
              <i class="fas ${icon} text-xl"></i>
            </button>
          `).join('')}
        </div>
        <input type="hidden" name="icono" id="selected-icon" value="${categoria.icono}">
      </div>
      
      <div class="flex justify-end gap-3 mt-6">
        <button type="button" onclick="closeModal()" 
                class="px-6 py-2 border rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" 
                class="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          <i class="fas ${isEdit ? 'fa-save' : 'fa-plus'} mr-2"></i>
          ${isEdit ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  `, 'max-w-2xl')
  
  // Handler para el formulario
  document.getElementById('categoria-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    
    try {
      if (isEdit) {
        await axios.put(`${API}/categorias/${id}`, data)
        showToast('✓ Categoría actualizada correctamente', 'success')
      } else {
        await axios.post(`${API}/categorias`, data)
        showToast('✓ Categoría creada correctamente', 'success')
      }
      closeModal()
      showGestionCategorias()
    } catch (error) {
      console.error('Error guardando categoría:', error)
      showToast('Error al guardar la categoría', 'error')
    }
  })
}

function selectIcon(icon) {
  document.getElementById('selected-icon').value = icon
  document.querySelectorAll('.icon-selector').forEach(btn => {
    btn.classList.remove('bg-teal-50', 'border-teal-500')
  })
  event.target.closest('.icon-selector').classList.add('bg-teal-50', 'border-teal-500')
}

async function editCategoria(id) {
  closeModal()
  setTimeout(() => showCategoriaForm(id), 300)
}

async function deleteCategoria(id, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?\n\nNota: Solo se puede eliminar si no tiene productos asociados.`)) {
    return
  }
  
  try {
    const response = await axios.delete(`${API}/categorias/${id}`)
    showToast('✓ Categoría eliminada correctamente', 'success')
    showGestionCategorias()
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      showToast(error.response.data.message, 'error')
    } else {
      showToast('Error al eliminar la categoría', 'error')
    }
  }
}

// ============================================
// CONSULTOR IA - GALI
// ============================================

// Enviar mensaje al chat
async function sendMessage() {
  const input = document.getElementById('chat-input')
  const message = input.value.trim()
  
  if (!message) return
  
  // Limpiar input
  input.value = ''
  
  // Mostrar mensaje del usuario
  addMessageToChat('user', message)
  
  // Mostrar indicador de "escribiendo..."
  addTypingIndicator()
  
  try {
    // Obtener contexto del sistema
    const context = {
      clientes_total: currentData.clientes.length,
      trabajos_activos: currentData.trabajos.filter(t => t.estado === 'pendiente' || t.estado === 'en_proceso').length,
      stock_bajo: currentData.stock.filter(s => s.cantidad_actual <= s.cantidad_minima).length
    }
    
    // Llamar a la API
    const response = await axios.post(`${API}/chat`, {
      message: message,
      context: context
    })
    
    // Eliminar indicador de escribiendo
    removeTypingIndicator()
    
    // Mostrar respuesta de GALI
    if (response.data.success) {
      addMessageToChat('gali', response.data.response)
    } else {
      addMessageToChat('gali', 'Lo siento, hubo un error. Por favor intenta de nuevo.')
    }
    
  } catch (error) {
    console.error('Error en chat:', error)
    removeTypingIndicator()
    addMessageToChat('gali', 'Lo siento, hubo un error de conexión. Por favor intenta de nuevo.')
  }
  
  // Scroll al final
  scrollChatToBottom()
}

// Enviar pregunta rápida (botones predefinidos)
function sendQuickQuestion(question) {
  const input = document.getElementById('chat-input')
  input.value = question
  sendMessage()
}

// Añadir mensaje al chat
function addMessageToChat(sender, text) {
  const chatMessages = document.getElementById('chat-messages')
  
  const messageDiv = document.createElement('div')
  messageDiv.className = 'mb-4 animate-fade-in'
  
  if (sender === 'user') {
    messageDiv.innerHTML = `
      <div class="flex items-start gap-3 justify-end">
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 shadow-sm max-w-xl">
          <p class="text-white">${escapeHtml(text)}</p>
        </div>
        <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fas fa-user text-white"></i>
        </div>
      </div>
    `
  } else {
    // Convertir markdown básico a HTML
    const formattedText = formatMarkdown(text)
    
    messageDiv.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fas fa-robot text-white"></i>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm max-w-3xl">
          ${formattedText}
        </div>
      </div>
    `
  }
  
  chatMessages.appendChild(messageDiv)
}

// Añadir indicador de "escribiendo..."
function addTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages')
  
  const typingDiv = document.createElement('div')
  typingDiv.id = 'typing-indicator'
  typingDiv.className = 'mb-4'
  typingDiv.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
        <i class="fas fa-robot text-white"></i>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `
  
  chatMessages.appendChild(typingDiv)
  scrollChatToBottom()
}

// Eliminar indicador de "escribiendo..."
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator')
  if (indicator) {
    indicator.remove()
  }
}

// Scroll al final del chat
function scrollChatToBottom() {
  const chatMessages = document.getElementById('chat-messages')
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// Escapar HTML para evitar XSS
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Formatear markdown básico a HTML
function formatMarkdown(text) {
  let html = escapeHtml(text)
  
  // Negritas: **texto** o __texto__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  
  // Cursiva: *texto* o _texto_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')
  
  // Saltos de línea
  html = html.replace(/\n\n/g, '</p><p class="mt-3">')
  html = html.replace(/\n/g, '<br>')
  
  // Enlaces: [texto](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-purple-600 underline">$1</a>')
  
  // Listas con viñetas: - item o * item
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4">$1</li>')
  html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 text-gray-700 my-2">$1</ul>')
  
  // Listas numeradas: 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
  
  // Títulos: ## Título
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 mt-3 mb-2">$1</h3>')
  
  // Código inline: `código`
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm text-purple-600">$1</code>')
  
  // Emojis y iconos (mantener tal cual)
  
  return '<div class="text-gray-800">' + html + '</div>'
}

// ============================================
// DISEÑADOR VIRTUAL DE CORTINAS
// ============================================

let proyectoActual = {
  id: null,
  imagen_url: null,
  imagen_file: null,
  analisis: null,
  tela_seleccionada: null,
  tipo_cortina: 'ondas_francesas',
  opciones: {
    forro_termico: false,
    motorizada: false,
    doble_cortina: false
  },
  imagenes_generadas: [],
  variante_actual: 0
}

let catalogoTelas = []

// Cargar proyectos existentes
async function loadProyectosDiseño() {
  try {
    const { data } = await axios.get(`${API}/disenador/proyectos`)
    const galeria = document.getElementById('proyectos-galeria')
    
    if (data.length === 0) {
      galeria.innerHTML = `
        <div class="col-span-3 text-center py-12">
          <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No hay proyectos aún. ¡Crea el primero!</p>
        </div>
      `
      return
    }
    
    galeria.innerHTML = data.map(p => `
      <div class="border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer" onclick="abrirProyecto(${p.id})">
        <img src="${p.imagen_original_url}" alt="${p.nombre_proyecto}" class="w-full h-48 object-cover">
        <div class="p-4">
          <h3 class="font-semibold text-gray-800">${p.nombre_proyecto}</h3>
          <p class="text-sm text-gray-500">${p.cliente_nombre || 'Sin cliente'}</p>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs px-2 py-1 rounded-full ${
              p.estado === 'presupuestado' ? 'bg-green-100 text-green-800' :
              p.estado === 'compartido' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }">${p.estado}</span>
            <span class="text-sm text-gray-600">${new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('Error cargando proyectos:', error)
  }
}

// Mostrar formulario de nuevo proyecto
function showNuevoProyecto() {
  document.getElementById('proyectos-galeria').parentElement.classList.add('hidden')
  document.getElementById('proyecto-workspace').classList.remove('hidden')
  document.getElementById('step-upload').classList.remove('hidden')
  
  // Reset proyecto
  proyectoActual = {
    id: null,
    imagen_url: null,
    imagen_file: null,
    analisis: null,
    tela_seleccionada: null,
    tipo_cortina: 'ondas_francesas',
    opciones: {
      forro_termico: false,
      motorizada: false,
      doble_cortina: false
    },
    imagenes_generadas: [],
    variante_actual: 0
  }
}

// Manejar upload de archivo
async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Validar tamaño (10MB máx)
  if (file.size > 10 * 1024 * 1024) {
    alert('❌ La imagen es demasiado grande (máx. 10MB)')
    return
  }
  
  // Mostrar preview
  const reader = new FileReader()
  reader.onload = (e) => {
    document.getElementById('preview-img').src = e.target.result
    document.getElementById('image-preview').classList.remove('hidden')
    document.getElementById('upload-zone').classList.add('hidden')
    proyectoActual.imagen_file = file
  }
  reader.readAsDataURL(file)
}

// Reset upload
function resetUpload() {
  document.getElementById('image-preview').classList.add('hidden')
  document.getElementById('upload-zone').classList.remove('hidden')
  document.getElementById('file-input').value = ''
  proyectoActual.imagen_file = null
}

// Analizar imagen con IA
async function analizarImagen() {
  if (!proyectoActual.imagen_file) {
    alert('❌ Selecciona una imagen primero')
    return
  }
  
  try {
    showLoading('Analizando espacio con IA...')
    
    // Simular upload a R2 (en producción, aquí subirías a Cloudflare R2)
    const imagen_url = URL.createObjectURL(proyectoActual.imagen_file)
    proyectoActual.imagen_url = imagen_url
    
    // Crear proyecto en BD
    const { data: proyecto } = await axios.post(`${API}/disenador/proyectos`, {
      nombre_proyecto: `Proyecto ${new Date().toLocaleDateString()}`,
      imagen_original_url: imagen_url
    })
    proyectoActual.id = proyecto.proyecto_id
    
    // Analizar con IA
    const { data: analisis } = await axios.post(`${API}/disenador/analizar`, {
      imagen_url: imagen_url,
      proyecto_id: proyectoActual.id
    })
    
    proyectoActual.analisis = analisis.analisis
    
    hideLoading()
    mostrarAnalisis(analisis.analisis)
    
    // Pasar al siguiente paso
    document.getElementById('step-analisis').classList.remove('hidden')
    document.getElementById('step-configuracion').classList.remove('hidden')
    
    // Cargar catálogo de telas
    await loadCatalogoTelas()
    
    showSuccess('✅ Análisis completado')
    
  } catch (error) {
    console.error('Error analizando imagen:', error)
    hideLoading()
    showError('❌ Error al analizar imagen')
  }
}

// Mostrar resultado del análisis
function mostrarAnalisis(analisis) {
  const container = document.getElementById('analisis-resultado')
  container.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-blue-50 rounded-lg p-4">
        <i class="fas fa-ruler-combined text-blue-600 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">Dimensiones</p>
        <p class="font-bold">${analisis.ventanas[0].ancho_aprox}m x ${analisis.ventanas[0].alto_aprox}m</p>
      </div>
      <div class="bg-purple-50 rounded-lg p-4">
        <i class="fas fa-paint-brush text-purple-600 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">Estilo</p>
        <p class="font-bold capitalize">${analisis.estilo}</p>
      </div>
      <div class="bg-yellow-50 rounded-lg p-4">
        <i class="fas fa-sun text-yellow-600 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">Luz Natural</p>
        <p class="font-bold capitalize">${analisis.luz_natural}</p>
      </div>
      <div class="bg-green-50 rounded-lg p-4">
        <i class="fas fa-palette text-green-600 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">Colores</p>
        <div class="flex gap-1 mt-1">
          ${analisis.colores.map(c => `<div class="w-6 h-6 rounded-full border" style="background-color: ${c}"></div>`).join('')}
        </div>
      </div>
    </div>
    
    <div class="bg-purple-50 border-l-4 border-purple-600 p-4 mt-4">
      <p class="text-sm text-gray-700 mb-2"><strong>💡 Recomendaciones de GALI:</strong></p>
      <p class="text-sm text-gray-600">
        Para un espacio ${analisis.estilo} con ${analisis.luz_natural} luz natural, te recomendamos: 
        <strong>${analisis.recomendaciones.join(', ')}</strong>
      </p>
    </div>
  `
}

// Cargar catálogo de telas
async function loadCatalogoTelas() {
  try {
    const { data } = await axios.get(`${API}/disenador/telas?disponible=true`)
    catalogoTelas = data
    renderCatalogoTelas(data)
    
    // Cargar categorías en filtro
    const categorias = [...new Set(data.map(t => t.categoria_nombre).filter(Boolean))]
    const filterCat = document.getElementById('filter-categoria-tela')
    filterCat.innerHTML = '<option value="">Todas las categorías</option>' + 
      categorias.map(c => `<option value="${c}">${c}</option>`).join('')
    
  } catch (error) {
    console.error('Error cargando telas:', error)
  }
}

// Renderizar catálogo de telas
function renderCatalogoTelas(telas) {
  const container = document.getElementById('catalogo-telas')
  container.innerHTML = telas.map(t => `
    <div class="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all ${proyectoActual.tela_seleccionada?.id === t.id ? 'ring-2 ring-purple-600' : ''}"
         onclick="seleccionarTela(${t.id})">
      <div class="h-32 bg-gray-200 flex items-center justify-center" style="background-color: ${t.color_hex}40">
        <i class="fas fa-cut text-4xl" style="color: ${t.color_hex}"></i>
      </div>
      <div class="p-3">
        <h4 class="font-semibold text-sm">${t.nombre}</h4>
        <p class="text-xs text-gray-500">${t.referencia}</p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs px-2 py-1 rounded-full bg-gray-100">${t.opacidad}</span>
          <span class="text-sm font-bold text-purple-600">${t.precio_metro}€/m²</span>
        </div>
      </div>
    </div>
  `).join('')
}

// Filtrar telas
function filtrarTelas() {
  const opacidad = document.getElementById('filter-opacidad').value
  const categoria = document.getElementById('filter-categoria-tela').value
  
  const telasFiltradas = catalogoTelas.filter(t => {
    if (opacidad && t.opacidad !== opacidad) return false
    if (categoria && t.categoria_nombre !== categoria) return false
    return true
  })
  
  renderCatalogoTelas(telasFiltradas)
}

// Seleccionar tela
function seleccionarTela(telaId) {
  const tela = catalogoTelas.find(t => t.id === telaId)
  if (!tela) return
  
  proyectoActual.tela_seleccionada = tela
  
  // Actualizar UI
  document.getElementById('tela-nombre').textContent = tela.nombre
  document.getElementById('tela-precio').textContent = `${tela.precio_metro}€/m² - ${tela.opacidad}`
  
  // Habilitar botón de generar
  document.getElementById('btn-generar').disabled = false
  
  // Actualizar precio estimado
  calcularPrecioEstimado()
  
  // Re-render para mostrar selección
  renderCatalogoTelas(catalogoTelas)
}

// Calcular precio estimado
function calcularPrecioEstimado() {
  if (!proyectoActual.analisis || !proyectoActual.tela_seleccionada) return
  
  const ventana = proyectoActual.analisis.ventanas[0]
  const ancho = ventana.ancho_aprox
  const alto = ventana.alto_aprox
  
  // Cálculo de metraje (ancho x 2.5 para caída) x (alto + 0.2 para dobladillos)
  const metraje = (ancho * 2.5) * (alto + 0.2)
  
  let precioTela = metraje * proyectoActual.tela_seleccionada.precio_metro
  
  // Añadir extras
  if (document.getElementById('opt-forro').checked) {
    precioTela += metraje * 15
  }
  
  if (document.getElementById('opt-motorizada').checked) {
    precioTela += 180
  }
  
  if (document.getElementById('opt-doble').checked) {
    precioTela *= 1.8
  }
  
  // Accesorios (estimado)
  const accesorios = ancho * 45 // Rieles, ganchos, etc.
  
  // Confección e instalación (estimado)
  const manoObra = 150
  
  const total = Math.round(precioTela + accesorios + manoObra)
  
  document.getElementById('precio-estimado').textContent = `${total}€`
}

// Actualizar precio al cambiar opciones
document.addEventListener('DOMContentLoaded', () => {
  const opciones = ['opt-forro', 'opt-motorizada', 'opt-doble']
  opciones.forEach(id => {
    const el = document.getElementById(id)
    if (el) {
      el.addEventListener('change', calcularPrecioEstimado)
    }
  })
})

// Generar visualizaciones con IA
async function generarVisualizaciones() {
  if (!proyectoActual.tela_seleccionada) {
    alert('❌ Selecciona una tela primero')
    return
  }
  
  try {
    showLoading('Generando visualizaciones con IA... (15-20 segundos)')
    
    // Recoger opciones
    proyectoActual.tipo_cortina = document.getElementById('tipo-cortina').value
    proyectoActual.opciones = {
      forro_termico: document.getElementById('opt-forro').checked,
      motorizada: document.getElementById('opt-motorizada').checked,
      doble_cortina: document.getElementById('opt-doble').checked
    }
    
    // Llamar a generación IA
    const { data } = await axios.post(`${API}/disenador/generar`, {
      proyecto_id: proyectoActual.id,
      tela_id: proyectoActual.tela_seleccionada.id,
      tipo_cortina: proyectoActual.tipo_cortina,
      opciones: proyectoActual.opciones
    })
    
    proyectoActual.imagenes_generadas = data.imagenes
    
    hideLoading()
    mostrarResultados()
    showSuccess('✅ Visualizaciones generadas')
    
  } catch (error) {
    console.error('Error generando visualizaciones:', error)
    hideLoading()
    showError('❌ Error al generar visualizaciones')
  }
}

// Mostrar resultados
function mostrarResultados() {
  document.getElementById('step-resultados').classList.remove('hidden')
  
  // Cargar imagen original
  document.getElementById('resultado-original').src = proyectoActual.imagen_url
  
  // Cargar variantes
  proyectoActual.imagenes_generadas.forEach((img, i) => {
    document.getElementById(`variante-${i}`).src = img
  })
  
  // Mostrar primera variante por defecto
  mostrarVariante(0)
  
  // Scroll al resultado
  document.getElementById('step-resultados').scrollIntoView({ behavior: 'smooth' })
}

// Mostrar variante específica
function mostrarVariante(index) {
  proyectoActual.variante_actual = index
  document.getElementById('resultado-generado').src = proyectoActual.imagenes_generadas[index]
  
  // Actualizar borde de selección
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById(`variante-${i}`)?.parentElement
    if (btn) {
      if (i === index) {
        btn.classList.add('border-purple-600')
        btn.classList.remove('border-transparent')
      } else {
        btn.classList.remove('border-purple-600')
        btn.classList.add('border-transparent')
      }
    }
  }
}

// Generar presupuesto desde diseño
async function generarPresupuesto() {
  try {
    showLoading('Generando presupuesto...')
    
    // TODO: Integrar con sistema de presupuestos
    // Por ahora mostramos mensaje
    
    hideLoading()
    showSuccess('✅ Función en desarrollo - Próximamente integrada con Presupuestos')
    
  } catch (error) {
    console.error('Error generando presupuesto:', error)
    hideLoading()
    showError('❌ Error al generar presupuesto')
  }
}

// Compartir proyecto
async function compartirProyecto() {
  const modal = `
    <div class="space-y-4">
      <h3 class="text-xl font-bold">Compartir Proyecto</h3>
      <div class="space-y-3">
        <button onclick="compartirWhatsApp()" class="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600">
          <i class="fab fa-whatsapp mr-2"></i>Compartir por WhatsApp
        </button>
        <button onclick="compartirEmail()" class="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
          <i class="fas fa-envelope mr-2"></i>Enviar por Email
        </button>
        <button onclick="descargarImagen()" class="w-full bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600">
          <i class="fas fa-download mr-2"></i>Descargar Imagen
        </button>
      </div>
    </div>
  `
  showModal(modal)
}

function compartirWhatsApp() {
  const texto = `¡Mira cómo quedarán las cortinas en tu espacio! 😍\n\nTela: ${proyectoActual.tela_seleccionada.nombre}\nPresupuesto estimado: ${document.getElementById('precio-estimado').textContent}`
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
  window.open(url, '_blank')
  closeModal()
}

function compartirEmail() {
  showSuccess('✅ Función en desarrollo')
  closeModal()
}

function descargarImagen() {
  const link = document.createElement('a')
  link.href = proyectoActual.imagenes_generadas[proyectoActual.variante_actual]
  link.download = `cortinas-${proyectoActual.tela_seleccionada.referencia}.jpg`
  link.click()
  showSuccess('✅ Imagen descargada')
  closeModal()
}

// Reset proyecto (volver al inicio)
function resetProyecto() {
  if (confirm('¿Quieres crear un nuevo proyecto? Se perderá el progreso actual.')) {
    document.getElementById('proyecto-workspace').classList.add('hidden')
    document.getElementById('proyectos-galeria').parentElement.classList.remove('hidden')
    
    // Reset todos los pasos
    document.getElementById('step-upload').classList.add('hidden')
    document.getElementById('step-analisis').classList.add('hidden')
    document.getElementById('step-configuracion').classList.add('hidden')
    document.getElementById('step-resultados').classList.add('hidden')
    
    resetUpload()
    loadProyectosDiseño()
  }
}

// Abrir proyecto existente
async function abrirProyecto(proyectoId) {
  try {
    showLoading('Cargando proyecto...')
    const { data } = await axios.get(`${API}/disenador/proyectos/${proyectoId}`)
    
    proyectoActual = {
      id: data.id,
      imagen_url: data.imagen_original_url,
      analisis: data.analisis_ia,
      tela_seleccionada: catalogoTelas.find(t => t.referencia === data.tela_referencia),
      tipo_cortina: data.tipo_cortina || 'ondas_francesas',
      opciones: {
        forro_termico: data.forro_termico === 1,
        motorizada: data.motorizada === 1,
        doble_cortina: data.doble_cortina === 1
      },
      imagenes_generadas: data.imagenes_generadas || [],
      variante_actual: 0
    }
    
    // Mostrar workspace
    document.getElementById('proyectos-galeria').parentElement.classList.add('hidden')
    document.getElementById('proyecto-workspace').classList.remove('hidden')
    
    // Cargar datos en UI
    if (data.imagenes_generadas && data.imagenes_generadas.length > 0) {
      document.getElementById('step-resultados').classList.remove('hidden')
      mostrarResultados()
    } else if (data.tela_referencia) {
      document.getElementById('step-configuracion').classList.remove('hidden')
      await loadCatalogoTelas()
    } else if (data.analisis_ia) {
      document.getElementById('step-analisis').classList.remove('hidden')
      mostrarAnalisis(data.analisis_ia)
    }
    
    hideLoading()
  } catch (error) {
    console.error('Error cargando proyecto:', error)
    hideLoading()
    showError('❌ Error al cargar proyecto')
  }
}

// Cargar proyectos al entrar al tab
document.addEventListener('DOMContentLoaded', () => {
  // Este código se ejecutará cuando se cargue el tab
})
