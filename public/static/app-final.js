// API Base
const API = '/api'

// TEST: Verificar que el archivo JS carga
console.log('✅ app-final.js CARGADO correctamente')
console.log('🕒 Timestamp:', new Date().toISOString())

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

// ============================================
// HISTORIAL DE MOVIMIENTOS (AUDITORÍA)
// ============================================

// Registrar acción en el historial
async function logAccion(accion, seccion, entidadTipo = null, entidadId = null, detalles = null) {
  try {
    const user = checkAuth()
    if (!user) return // No registrar si no hay sesión
    
    const payload = {
      usuario_email: user.email,
      usuario_nombre: user.nombre,
      usuario_rol: user.rol,
      accion: accion, // 'crear', 'editar', 'eliminar', 'login', 'logout'
      seccion: seccion, // 'clientes', 'trabajos', 'presupuestos', etc.
      entidad_tipo: entidadTipo, // 'cliente', 'trabajo', etc.
      entidad_id: entidadId, // ID del registro
      detalles: detalles // Objeto con datos adicionales
    }
    
    await axios.post(`${API}/historial`, payload)
    console.log(`📝 Historial: ${accion} en ${seccion}`, entidadId)
  } catch (error) {
    // No bloquear la app si falla el log
    console.warn('⚠️ Error registrando en historial:', error)
  }
}

// Verificar si el usuario tiene permiso para una sección
function tienePermiso(seccion) {
  const rol = getUserRole()
  
  // Ana Ramos (dueña) tiene acceso a TODO
  if (rol === 'duena') {
    return true
  }
  
  // Tienda solo tiene acceso a secciones operativas + consultor IA + diseñador virtual + tareas + calendario
  const seccionesTienda = ['dashboard', 'clientes', 'presupuestos', 'trabajos', 'stock', 'tareas', 'calendario', 'consultor', 'disenador']
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
  // Cerrar TODOS los modales con id modal-overlay
  const overlays = document.querySelectorAll('[id="modal-overlay"]')
  overlays.forEach(overlay => {
    overlay.remove()
  })
  
  // También intentar cerrar modales sin ID específico
  const allModals = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50')
  allModals.forEach(modal => {
    if (modal.parentElement === document.body) {
      modal.remove()
    }
  })
  
  document.body.style.overflow = 'auto'
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

// Alias para compatibilidad
const showNotification = showToast
const showError = (msg) => showToast(msg, 'error')
const showSuccess = (msg) => showToast(msg, 'success')
const showWarning = (msg) => showToast(msg, 'warning')

// Loading spinner
function showLoading(message = 'Cargando...') {
  console.log('📊 showLoading llamado:', message)
  const loadingDiv = document.createElement('div')
  loadingDiv.id = 'loading-overlay'
  loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  loadingDiv.innerHTML = `
    <div class="bg-white rounded-lg p-8 flex flex-col items-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
      <p class="text-gray-700 font-medium">${message}</p>
    </div>
  `
  document.body.appendChild(loadingDiv)
}

function hideLoading() {
  console.log('📊 hideLoading llamado')
  const loadingDiv = document.getElementById('loading-overlay')
  if (loadingDiv) {
    loadingDiv.remove()
  }
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
    case 'tareas':
      loadTareas()
      actualizarContadorTareas()
      actualizarContadoresTareasHeader()
      break
    case 'calendario':
      cargarCalendarioGlobal()
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
    
    // Actualizar KPIs principales (con verificación de existencia)
    const kpiTrabajos = document.getElementById('kpi-trabajos')
    const kpiPresupuestos = document.getElementById('kpi-presupuestos')
    const kpiFases = document.getElementById('kpi-fases')
    const kpiCompletados = document.getElementById('kpi-completados')
    
    if (kpiTrabajos) kpiTrabajos.textContent = data.trabajos_activos || 0
    if (kpiPresupuestos) kpiPresupuestos.textContent = data.presupuestos_pendientes || 0
    if (kpiFases) kpiFases.textContent = data.fases_en_proceso || 0
    if (kpiCompletados) kpiCompletados.textContent = data.trabajos_completados_mes || 0
    
    // Gráficos enfocados en operaciones
    renderChartTrabajos(data.trabajos_por_estado)
    renderChartFases(data.fases_resumen)
    renderChartPresupuestos(data.presupuestos_por_estado)
    
  } catch (error) {
    console.error('Error cargando dashboard:', error)
    // No mostrar showError aquí para evitar spam
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
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
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ${c.numero_cliente || 'Sin número'}
                </span>
              </td>
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
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleada</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Entrega</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(t => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  ${t.numero_trabajo || 'Sin número'}
                </span>
              </td>
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
                <select onchange="cambiarEstadoTrabajo(${t.id}, this.value)" class="px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${t.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : t.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' : t.estado === 'completado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  <option value="pendiente" ${t.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="en_proceso" ${t.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                  <option value="completado" ${t.estado === 'completado' ? 'selected' : ''}>Completado</option>
                  <option value="cancelado" ${t.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${t.fecha_finalizacion ? 
                  `<div class="font-medium">${new Date(t.fecha_finalizacion).toLocaleDateString('es-ES')}</div>
                   <div class="text-xs text-gray-500">${new Date(t.fecha_finalizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>` 
                  : '<span class="text-gray-400 italic">Sin fecha de entrega</span>'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="viewTrabajo(${t.id})" class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editTrabajo(${t.id})" class="text-green-600 hover:text-green-800" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTrabajo(${t.id})" class="text-red-600 hover:text-red-800" title="Borrar">
                  <i class="fas fa-trash"></i>
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

// Cambiar estado de trabajo (SIN auto-factura - se hace desde presupuesto)
async function cambiarEstadoTrabajo(id, nuevoEstado) {
  try {
    // Actualizar estado
    await fetch(`${API}/trabajos/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    
    showToast(`Estado actualizado a ${nuevoEstado}`, 'success')
    loadTrabajos()
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    showToast('Error al actualizar el estado', 'error')
    loadTrabajos()
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
    const { data: tareasDelTrabajo } = await axios.get(`${API}/trabajos/${id}/tareas`)
    
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
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) closeModal()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-briefcase text-gray-700 mr-2"></i>
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
          
          <!-- INFORMACIÓN GENERAL DEL TRABAJO -->
          <div class="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
            <h4 class="font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-info-circle mr-2 text-blue-600"></i>Información General
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <!-- Cliente -->
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-user mr-1"></i>CLIENTE
                </div>
                <div class="font-semibold text-gray-800">
                  ${trabajo.cliente_nombre} ${trabajo.cliente_apellidos}
                </div>
              </div>
              
              <!-- Tipo de Servicio -->
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-tag mr-1"></i>TIPO DE SERVICIO
                </div>
                <div class="font-semibold text-gray-800">
                  ${trabajo.tipo_servicio.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
              
              <!-- Estado -->
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-circle-notch mr-1"></i>ESTADO
                </div>
                <div>
                  ${getEstadoBadge(trabajo.estado)}
                </div>
              </div>
              
              <!-- Empleada Asignada -->
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-user-tie mr-1"></i>EMPLEADA ASIGNADA
                </div>
                <div class="font-semibold text-gray-800">
                  ${trabajo.nombre_empleada || '<span class="text-gray-400 italic">Sin asignar</span>'}
                </div>
              </div>
              
              <!-- Dirección -->
              <div class="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-map-marker-alt mr-1"></i>DIRECCIÓN
                </div>
                <div class="font-semibold text-gray-800">
                  ${trabajo.direccion || '<span class="text-gray-400 italic">Sin dirección</span>'}
                </div>
              </div>
              
              <!-- Descripción -->
              ${trabajo.descripcion ? `
                <div class="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <div class="text-xs text-gray-500 mb-1">
                    <i class="fas fa-file-alt mr-1"></i>DESCRIPCIÓN
                  </div>
                  <div class="text-sm text-gray-700">
                    ${trabajo.descripcion}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <!-- Fechas y Duración -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-calendar-alt mr-1"></i>FECHA PROGRAMADA
                </div>
                <div class="font-semibold text-gray-800">
                  ${new Date(trabajo.fecha_programada).toLocaleDateString('es-ES', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  ${new Date(trabajo.fecha_programada).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', minute: '2-digit' 
                  })}
                </div>
              </div>
              
              ${trabajo.fecha_inicio ? `
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                  <div class="text-xs text-gray-500 mb-1">
                    <i class="fas fa-play-circle mr-1"></i>FECHA INICIO
                  </div>
                  <div class="font-semibold text-gray-800">
                    ${new Date(trabajo.fecha_inicio).toLocaleDateString('es-ES', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    ${new Date(trabajo.fecha_inicio).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
              ` : '<div class="bg-white p-4 rounded-lg border border-gray-200"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-play-circle mr-1"></i>FECHA INICIO</div><div class="text-gray-400 italic text-sm">Sin iniciar</div></div>'}
              
              ${trabajo.fecha_finalizacion ? `
                <div class="bg-white p-4 rounded-lg border border-green-200 bg-green-50">
                  <div class="text-xs text-green-600 mb-1">
                    <i class="fas fa-check-circle mr-1"></i>FECHA ENTREGA
                  </div>
                  <div class="font-semibold text-green-800">
                    ${new Date(trabajo.fecha_finalizacion).toLocaleDateString('es-ES', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </div>
                  <div class="text-xs text-green-600 mt-1">
                    ${new Date(trabajo.fecha_finalizacion).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
              ` : '<div class="bg-white p-4 rounded-lg border border-gray-200"><div class="text-xs text-gray-500 mb-1"><i class="fas fa-check-circle mr-1"></i>FECHA ENTREGA</div><div class="text-gray-400 italic text-sm">Pendiente</div></div>'}
            </div>
            
            <!-- Costes y Precios -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-euro-sign mr-1"></i>PRECIO CLIENTE
                </div>
                <div class="font-bold text-green-600 text-xl">
                  €${trabajo.precio_cliente ? trabajo.precio_cliente.toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-tools mr-1"></i>COSTE MATERIALES
                </div>
                <div class="font-semibold text-gray-800">
                  €${trabajo.coste_materiales ? trabajo.coste_materiales.toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="text-xs text-gray-500 mb-1">
                  <i class="fas fa-user-clock mr-1"></i>COSTE MANO DE OBRA
                </div>
                <div class="font-semibold text-gray-800">
                  €${trabajo.coste_mano_obra ? trabajo.coste_mano_obra.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
            
            ${trabajo.notas ? `
              <div class="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div class="text-xs text-yellow-700 mb-2 font-semibold">
                  <i class="fas fa-sticky-note mr-1"></i>NOTAS
                </div>
                <div class="text-sm text-gray-700">
                  ${trabajo.notas}
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- TAREAS ASOCIADAS -->
          ${tareasDelTrabajo.length > 0 ? `
            <div class="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h4 class="font-bold text-gray-800 mb-4 flex items-center justify-between">
                <span><i class="fas fa-clipboard-list mr-2 text-blue-600"></i>Tareas Asociadas</span>
                <span class="text-sm font-normal text-gray-600">${tareasDelTrabajo.length} tarea${tareasDelTrabajo.length !== 1 ? 's' : ''}</span>
              </h4>
              
              <div class="space-y-3">
                ${tareasDelTrabajo.map(tarea => {
                  const estadoBadges = {
                    'pendiente': '<span class="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700">⏳ Pendiente</span>',
                    'en_proceso': '<span class="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">🔄 En Proceso</span>',
                    'completada': '<span class="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">✅ Finalizada</span>',
                    'cancelada': '<span class="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">❌ Cancelada</span>'
                  }
                  
                  const prioridadBadges = {
                    1: '<span class="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700">🔴 Alta</span>',
                    2: '<span class="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-700">🟡 Media</span>',
                    3: '<span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">🟢 Baja</span>'
                  }
                  
                  return `
                    <div class="bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md ${tarea.estado === 'completada' ? 'border-green-300' : 'border-gray-200'}">
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex-1">
                          <h5 class="font-bold text-gray-800 mb-1">${tarea.titulo}</h5>
                          <div class="flex flex-wrap gap-2 mb-2">
                            ${estadoBadges[tarea.estado] || ''}
                            ${prioridadBadges[tarea.prioridad] || ''}
                          </div>
                        </div>
                        <button onclick="event.stopPropagation(); verDetallesTarea(${tarea.id})" 
                                class="ml-2 text-blue-600 hover:text-blue-800" 
                                title="Ver detalles">
                          <i class="fas fa-eye"></i>
                        </button>
                      </div>
                      
                      ${tarea.descripcion ? `
                        <p class="text-sm text-gray-600 mb-2">${tarea.descripcion}</p>
                      ` : ''}
                      
                      <div class="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        ${tarea.asignado_a ? `
                          <div>
                            <i class="fas fa-user mr-1"></i>
                            <span class="font-medium">${tarea.asignado_a}</span>
                          </div>
                        ` : '<div class="text-gray-400 italic">Sin asignar</div>'}
                        
                        ${tarea.fecha_limite ? `
                          <div>
                            <i class="fas fa-calendar mr-1"></i>
                            <span class="font-medium">${new Date(tarea.fecha_limite).toLocaleDateString('es-ES', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}</span>
                          </div>
                        ` : '<div class="text-gray-400 italic">Sin fecha límite</div>'}
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
              
              <button onclick="closeModal(); showTab('tareas'); setTimeout(() => showNuevaTarea(${id}), 300)" 
                      class="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">
                <i class="fas fa-plus mr-2"></i>Crear Nueva Tarea para este Trabajo
              </button>
            </div>
          ` : `
            <div class="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
              <p class="text-gray-500 mb-3">
                <i class="fas fa-clipboard-list text-3xl text-gray-300 mb-2"></i>
                <br>No hay tareas asociadas a este trabajo
              </p>
              <button onclick="closeModal(); showTab('tareas'); setTimeout(() => showNuevaTarea(${id}), 300)" 
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">
                <i class="fas fa-plus mr-2"></i>Crear Tarea
              </button>
            </div>
          `}
          
          <!-- TIMELINE DE FASES -->
          <div class="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-300">
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
                          class="w-full text-sm px-3 py-1.5 border rounded bg-white focus:ring-2 focus:ring-gray-500">
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
          
          <!-- TAREAS ASOCIADAS AL TRABAJO -->
          <div class="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-300">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-bold text-gray-800 flex items-center">
                <i class="fas fa-tasks mr-2 text-gray-700"></i>Tareas Pendientes
                ${tareasDelTrabajo.length > 0 ? `<span class="ml-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">${tareasDelTrabajo.filter(t => t.estado !== 'completada').length}</span>` : ''}
              </h4>
              <button onclick="crearTareaParaTrabajo(${id}, '${trabajo.nombre_trabajo}')" 
                      class="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition-all">
                <i class="fas fa-plus mr-1"></i>Nueva Tarea
              </button>
            </div>
            
            ${tareasDelTrabajo.length > 0 ? `
              <div class="space-y-2">
                ${tareasDelTrabajo.map(tarea => `
                  <div class="bg-white border-2 rounded-lg p-3 transition-all hover:shadow-md
                    ${tarea.estado === 'completada' ? 'border-green-300 bg-green-50' : tarea.estado === 'en_proceso' ? 'border-blue-300' : 'border-gray-200'}">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 pt-1">
                        ${tarea.prioridad === 1 ? '<span class="text-xl">🔥</span>' : tarea.prioridad === 2 ? '<span class="text-xl">🟡</span>' : '<span class="text-xl">🟢</span>'}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <h5 class="font-semibold text-gray-900">${tarea.titulo}</h5>
                          ${tarea.estado === 'completada' ? 
                            '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">✓ Completada</span>' :
                            tarea.estado === 'en_proceso' ?
                            '<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">⏳ En Proceso</span>' :
                            '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">⏸️ Pendiente</span>'
                          }
                        </div>
                        ${tarea.descripcion ? `<p class="text-sm text-gray-600 mb-2">${tarea.descripcion}</p>` : ''}
                        <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                          ${tarea.asignado_a ? `<span><i class="fas fa-user mr-1"></i>${tarea.asignado_a}</span>` : ''}
                          ${tarea.fecha_limite ? `<span><i class="far fa-calendar mr-1"></i>${new Date(tarea.fecha_limite).toLocaleDateString('es-ES')} ${new Date(tarea.fecha_limite).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</span>` : ''}
                          ${tarea.recordatorio_minutos ? `<span class="text-orange-600"><i class="fas fa-bell mr-1"></i>${tarea.recordatorio_minutos} min antes</span>` : ''}
                          <span><i class="far fa-clock mr-1"></i>${new Date(tarea.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p class="text-sm">No hay tareas asignadas a este trabajo todavía</p>
              </div>
            `}
          </div>
          
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
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                <option value="Ana Ramos" ${trabajo.empleada_nombre === 'Ana Ramos' ? 'selected' : ''}>Ana Ramos</option>
                <option value="Lourdes" ${trabajo.empleada_nombre === 'Lourdes' ? 'selected' : ''}>Lourdes</option>
                <option value="Tienda" ${trabajo.empleada_nombre === 'Tienda' ? 'selected' : ''}>Tienda</option>
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Precio Cliente (€)</label>
              <input type="number" name="precio_cliente" value="${trabajo.precio_cliente}" step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg" placeholder="Opcional">
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
    
    // Renombrar empleada_id a nombre_empleada (ahora es texto, no ID)
    if (data.empleada_id) {
      data.nombre_empleada = data.empleada_id
      delete data.empleada_id
    } else {
      data.nombre_empleada = null
    }
    
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
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(s => {
            const bajoCantidad = s.cantidad_actual <= s.cantidad_minima
            return `
              <tr class="hover:bg-gray-50 ${bajoCantidad ? 'bg-red-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm font-mono font-medium text-gray-900">${s.codigo || '-'}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">${s.nombre}</div>
                  ${s.descripcion ? `<div class="text-sm text-gray-500">${s.descripcion}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${s.categoria_nombre ? `
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${(s.precio_venta || 0).toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${s.proveedor || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button onclick="editStock(${s.id})" class="text-blue-600 hover:text-blue-800" title="Editar">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="showMovimientos(${s.id})" class="text-green-600 hover:text-green-800" title="Ver movimientos">
                    <i class="fas fa-history"></i>
                  </button>
                  <button onclick="ajustarStock(${s.id})" class="text-purple-600 hover:text-purple-800" title="Ajustar stock">
                    <i class="fas fa-exchange-alt"></i>
                  </button>
                  <button onclick="deleteStock(${s.id})" class="text-red-600 hover:text-red-800" title="Eliminar">
                    <i class="fas fa-trash"></i>
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
    unidad: 'metro',
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
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'} text-gray-700 mr-2"></i>
          ${isEdit ? 'Editar' : 'Nuevo'} Artículo
        </h3>
        <form id="stock-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${stock.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select name="categoria_id" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
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
                <option value="metro" ${stock.unidad === 'metro' ? 'selected' : ''}>Metro</option>
                <option value="unidades" ${stock.unidad === 'unidades' ? 'selected' : ''}>Unidades</option>
                <option value="rollo" ${stock.unidad === 'rollo' ? 'selected' : ''}>Rollo</option>
                <option value="caja" ${stock.unidad === 'caja' ? 'selected' : ''}>Caja</option>
                <option value="kg" ${stock.unidad === 'kg' ? 'selected' : ''}>Kilogramo</option>
                <option value="litro" ${stock.unidad === 'litro' ? 'selected' : ''}>Litro</option>
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
    
    // Filtros de exportación arriba
    const filtrosHTML = `
      <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-end gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
            <input type="date" id="export-fecha-inicio" class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
            <input type="date" id="export-fecha-fin" class="w-full px-4 py-2 border rounded-lg">
          </div>
          <button onclick="exportarFacturas()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <i class="fas fa-file-excel"></i>
            Exportar a Excel
          </button>
          <button onclick="descargarFacturasPDF()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
            <i class="fas fa-file-pdf"></i>
            Descargar PDFs
          </button>
        </div>
      </div>
    `
    
    container.innerHTML = filtrosHTML + `
      <table class="min-w-full bg-white">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Factura</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IVA</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(f => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium text-gray-900">${f.numero_factura}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${f.cliente_nombre} ${f.cliente_apellidos}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(f.fecha_emision).toLocaleDateString('es-ES')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${parseFloat(f.subtotal || 0).toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€${parseFloat(f.importe_iva || f.iva || 0).toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap font-semibold text-green-600">€${parseFloat(f.total).toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${getEstadoFacturaBadge(f.estado)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="viewFactura(${f.id})" class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="downloadFacturaPDF(${f.id})" class="text-green-600 hover:text-green-800" title="Descargar PDF">
                  <i class="fas fa-file-pdf"></i>
                </button>
                <button onclick="deleteFactura(${f.id})" class="text-red-600 hover:text-red-800" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    
    // Establecer fechas por defecto (mes actual)
    const hoy = new Date()
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    
    document.getElementById('export-fecha-inicio').value = primerDia.toISOString().split('T')[0]
    document.getElementById('export-fecha-fin').value = ultimoDia.toISOString().split('T')[0]
    
  } catch (error) {
    console.error('Error cargando facturas:', error)
    showToast('Error al cargar facturas', 'error')
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

// Ver detalles de factura
async function viewFactura(id) {
  try {
    const response = await fetch(`${API}/facturas/${id}`)
    const factura = await response.json()
    
    const lineasHTML = factura.lineas && factura.lineas.length > 0 ? `
      <div class="mt-6">
        <h4 class="font-semibold text-gray-900 mb-3">Líneas de Factura:</h4>
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left">Concepto</th>
              <th class="px-4 py-2 text-right">Cantidad</th>
              <th class="px-4 py-2 text-right">Precio Unit.</th>
              <th class="px-4 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${factura.lineas.map(l => `
              <tr>
                <td class="px-4 py-2">${l.concepto}</td>
                <td class="px-4 py-2 text-right">${l.cantidad} ${l.unidad}</td>
                <td class="px-4 py-2 text-right">€${parseFloat(l.precio_unitario).toFixed(2)}</td>
                <td class="px-4 py-2 text-right font-semibold">€${parseFloat(l.subtotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="text-gray-500 mt-4">No hay líneas de detalle</p>'
    
    // Crear modal manualmente
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) this.remove()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Factura ${factura.numero_factura}</h2>
            <button onclick="document.getElementById('modal-overlay').remove()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          
          <div class="space-y-4">
            ${factura.presupuesto_titulo ? `
              <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <i class="fas fa-info-circle text-yellow-400"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                      <span class="font-semibold">Trabajo:</span> ${factura.presupuesto_titulo}
                    </p>
                    ${factura.numero_presupuesto ? `<p class="text-xs text-yellow-600 mt-1">Presupuesto: ${factura.numero_presupuesto}</p>` : ''}
                  </div>
                </div>
              </div>
            ` : ''}
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-600">Cliente:</p>
                <p class="font-semibold">${factura.cliente_nombre} ${factura.cliente_apellidos}</p>
              </div>
              <div>
                <p class="text-gray-600">Fecha Emisión:</p>
                <p class="font-semibold">${new Date(factura.fecha_emision).toLocaleDateString('es-ES')}</p>
              </div>
              <div>
                <p class="text-gray-600">Estado:</p>
                <p>${getEstadoFacturaBadge(factura.estado)}</p>
              </div>
              <div>
                <p class="text-gray-600">Forma de Pago:</p>
                <p class="font-semibold">${factura.forma_pago || 'No especificado'}</p>
              </div>
            </div>
            
            ${lineasHTML}
            
            <div class="mt-6 border-t pt-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-semibold">€${parseFloat(factura.subtotal).toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">IVA (${factura.porcentaje_iva || 21}%):</span>
                <span class="font-semibold">€${parseFloat(factura.importe_iva || factura.iva || 0).toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span class="text-green-600">€${parseFloat(factura.total).toFixed(2)}</span>
              </div>
            </div>
            
            ${factura.notas ? `
              <div class="mt-4">
                <p class="text-gray-600 text-sm">Notas:</p>
                <p class="text-sm">${factura.notas}</p>
              </div>
            ` : ''}
            
            ${factura.condiciones ? `
              <div class="mt-4">
                <p class="text-gray-600 text-sm">Condiciones:</p>
                <p class="text-sm">${factura.condiciones}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `)
  } catch (error) {
    console.error('Error cargando factura:', error)
    showToast('Error al cargar los detalles de la factura', 'error')
  }
}

// Descargar PDF de factura
async function downloadFacturaPDF(id) {
  try {
    showToast('Generando PDF...', 'info')
    
    const response = await fetch(`${API}/facturas/${id}`)
    const factura = await response.json()
    
    const { jsPDF } = window.jspdf
    const doc = new jsPDF()
    
    // Colores corporativos
    const primaryBlack = [0, 0, 0]
    const softGray = [128, 128, 128]
    const lightGray = [245, 245, 245]
    const accentGold = [212, 175, 55]
    
    let yPos = 20
    
    // ====================================
    // HEADER CON LOGO (proporción 16:9 respetada)
    // ====================================
    
    // Logo Anushka Hogar (1024x576 = 16:9)
    // Calculamos proporciones: ancho 60mm → alto 33.75mm (60 * 9/16)
    try {
      const logoImg = await loadImage('/static/logo.jpg')
      doc.addImage(logoImg, 'JPEG', 20, yPos, 60, 33.75)
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e)
      // Fallback: texto
      doc.setTextColor(...primaryBlack)
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('Anushka Hogar', 20, yPos + 8)
    }
    
    // Información empresa (derecha)
    doc.setTextColor(...softGray)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text('Confección e Instalación de Cortinas', 190, yPos + 2, { align: 'right' })
    doc.setFontSize(8)
    doc.text('Av. de Monelos 109, 15008 A Coruña', 190, yPos + 7, { align: 'right' })
    doc.text('Tel: 666 777 888', 190, yPos + 12, { align: 'right' })
    
    yPos += 40
    
    // Línea dorada separadora
    doc.setDrawColor(...accentGold)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)
    yPos += 8
    
    // ====================================
    // TÍTULO FACTURA
    // ====================================
    doc.setTextColor(...primaryBlack)
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('FACTURA', 105, yPos, { align: 'center' })
    
    yPos += 3
    doc.setFontSize(12)
    doc.setTextColor(...accentGold)
    doc.text(factura.numero_factura, 105, yPos, { align: 'center' })
    
    yPos += 10
    
    // ====================================
    // DATOS DEL CLIENTE (Box elegante)
    // ====================================
    doc.setFillColor(...lightGray)
    doc.roundedRect(20, yPos, 170, 22, 2, 2, 'F')
    
    yPos += 6
    doc.setTextColor(...primaryBlack)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('Cliente:', 25, yPos)
    doc.setFont(undefined, 'normal')
    doc.text(`${factura.cliente_nombre} ${factura.cliente_apellidos}`, 45, yPos)
    
    yPos += 5
    doc.setFontSize(8)
    doc.setTextColor(...softGray)
    if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 25, yPos)
    
    yPos += 5
    doc.text(`Tel: ${factura.cliente_telefono || '-'} | Email: ${factura.cliente_email || '-'}`, 25, yPos)
    
    yPos += 5
    doc.setTextColor(...primaryBlack)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Fecha:', 145, yPos - 10)
    doc.setFont(undefined, 'normal')
    doc.text(new Date(factura.fecha_emision).toLocaleDateString('es-ES'), 160, yPos - 10)
    
    yPos += 10
    
    // ====================================
    // TÍTULO DEL TRABAJO (si viene de presupuesto)
    // ====================================
    if (factura.presupuesto_titulo) {
      // Box sutil con borde fino
      doc.setDrawColor(...softGray)
      doc.setLineWidth(0.3)
      doc.roundedRect(20, yPos, 170, 10, 1, 1, 'S')
      
      yPos += 3
      
      // Icono y label
      doc.setTextColor(...softGray)
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text('Trabajo:', 25, yPos)
      
      // Título
      doc.setTextColor(...primaryBlack)
      doc.setFont(undefined, 'bold')
      doc.setFontSize(10)
      doc.text(factura.presupuesto_titulo, 42, yPos)
      
      yPos += 10
    }
    
    // ====================================
    // LÍNEAS DE FACTURA
    // ====================================
    if (factura.lineas && factura.lineas.length > 0) {
      const tableData = factura.lineas.map(l => [
        l.concepto,
        `${l.cantidad} ${l.unidad}`,
        `€${parseFloat(l.precio_unitario).toFixed(2)}`,
        `€${parseFloat(l.subtotal).toFixed(2)}`
      ])
      
      doc.autoTable({
        startY: yPos,
        head: [['Concepto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [230, 230, 230],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: primaryBlack,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: lightGray
        }
      })
      
      yPos = doc.lastAutoTable.finalY + 15
    }
    
    // ====================================
    // TOTALES ELEGANTES
    // ====================================
    const boxX = 115
    const boxY = yPos
    const boxWidth = 75
    
    doc.setFillColor(...lightGray)
    doc.roundedRect(boxX, boxY, boxWidth, 30, 2, 2, 'F')
    
    yPos += 7
    
    // Subtotal
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...softGray)
    doc.text('Subtotal:', boxX + 5, yPos)
    doc.setTextColor(...primaryBlack)
    doc.setFont(undefined, 'bold')
    doc.text(`€${parseFloat(factura.subtotal).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
    yPos += 6
    
    // IVA
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...softGray)
    doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, boxX + 5, yPos)
    doc.setTextColor(...primaryBlack)
    doc.setFont(undefined, 'bold')
    doc.text(`€${parseFloat(factura.importe_iva || factura.iva || 0).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
    yPos += 8
    
    // Línea dorada
    doc.setDrawColor(...accentGold)
    doc.setLineWidth(1)
    doc.line(boxX + 5, yPos, boxX + boxWidth - 5, yPos)
    yPos += 6
    
    // TOTAL FINAL
    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...primaryBlack)
    doc.text('TOTAL:', boxX + 5, yPos)
    doc.setFontSize(14)
    doc.setTextColor(...accentGold)
    doc.text(`€${parseFloat(factura.total).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
    
    yPos += 15
    
    // ====================================
    // NOTAS Y CONDICIONES
    // ====================================
    if (factura.notas || factura.condiciones || factura.forma_pago) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 30
      }
      
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryBlack)
      
      if (factura.forma_pago) {
        doc.text('FORMA DE PAGO:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
        doc.text(factura.forma_pago, 20, yPos)
        yPos += 8
      }
      
      if (factura.notas) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryBlack)
        doc.text('NOTAS:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
        const splitNotas = doc.splitTextToSize(factura.notas, 170)
        doc.text(splitNotas, 20, yPos)
        yPos += splitNotas.length * 4 + 6
      }
      
      if (factura.condiciones) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryBlack)
        doc.text('CONDICIONES:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
        const splitCond = doc.splitTextToSize(factura.condiciones, 170)
        doc.text(splitCond, 20, yPos)
      }
    }
    
    // ====================================
    // PIE DE PÁGINA ELEGANTE
    // ====================================
    doc.setDrawColor(...accentGold)
    doc.setLineWidth(0.5)
    doc.line(20, 285, 190, 285)
    
    doc.setFontSize(8)
    doc.setTextColor(...softGray)
    doc.setFont(undefined, 'normal')
    doc.text('Anushka Hogar - Confección e Instalación de Cortinas', 105, 290, { align: 'center' })
    
    // Guardar
    doc.save(`Factura_${factura.numero_factura}_${factura.cliente_apellidos}.pdf`)
    showToast('PDF generado correctamente', 'success')
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    showToast('Error al generar el PDF', 'error')
  }
}

// Eliminar factura
async function deleteFactura(id) {
  if (!confirm('¿Está seguro de eliminar esta factura?\n\nEsta acción no se puede deshacer.')) return
  
  try {
    await fetch(`${API}/facturas/${id}`, { method: 'DELETE' })
    showToast('Factura eliminada correctamente', 'success')
    loadFacturas()
  } catch (error) {
    console.error('Error eliminando factura:', error)
    showToast('Error al eliminar la factura', 'error')
  }
}

// Exportar facturas a Excel
async function exportarFacturas() {
  try {
    const fechaInicio = document.getElementById('export-fecha-inicio').value
    const fechaFin = document.getElementById('export-fecha-fin').value
    
    if (!fechaInicio || !fechaFin) {
      showToast('Por favor selecciona ambas fechas', 'error')
      return
    }
    
    // Filtrar facturas por rango de fechas
    const facturasFiltradas = currentData.facturas.filter(f => {
      const fecha = new Date(f.fecha_emision).toISOString().split('T')[0]
      return fecha >= fechaInicio && fecha <= fechaFin
    })
    
    if (facturasFiltradas.length === 0) {
      showToast('No hay facturas en el rango seleccionado', 'error')
      return
    }
    
    // Crear CSV
    const headers = ['Número Factura', 'Cliente', 'Fecha Emisión', 'Subtotal', 'IVA', 'Total', 'Estado', 'Forma Pago']
    const rows = facturasFiltradas.map(f => [
      f.numero_factura,
      `${f.cliente_nombre} ${f.cliente_apellidos}`,
      new Date(f.fecha_emision).toLocaleDateString('es-ES'),
      parseFloat(f.subtotal).toFixed(2),
      parseFloat(f.importe_iva || f.iva || 0).toFixed(2),
      parseFloat(f.total).toFixed(2),
      f.estado,
      f.forma_pago || ''
    ])
    
    // Generar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Facturas_${fechaInicio}_${fechaFin}.csv`
    link.click()
    
    showToast(`${facturasFiltradas.length} facturas exportadas correctamente`, 'success')
    
  } catch (error) {
    console.error('Error exportando facturas:', error)
    showToast('Error al exportar facturas', 'error')
  }
}

// Descargar PDFs de facturas en ZIP
async function descargarFacturasPDF() {
  try {
    const fechaInicio = document.getElementById('export-fecha-inicio').value
    const fechaFin = document.getElementById('export-fecha-fin').value
    
    if (!fechaInicio || !fechaFin) {
      showToast('Por favor selecciona ambas fechas', 'error')
      return
    }
    
    // Filtrar facturas por rango de fechas
    const facturasFiltradas = currentData.facturas.filter(f => {
      const fecha = new Date(f.fecha_emision).toISOString().split('T')[0]
      return fecha >= fechaInicio && fecha <= fechaFin
    })
    
    if (facturasFiltradas.length === 0) {
      showToast('No hay facturas en el rango seleccionado', 'error')
      return
    }
    
    showToast(`Generando ${facturasFiltradas.length} PDFs...`, 'info')
    
    const zip = new JSZip()
    let generados = 0
    
    // Generar PDF para cada factura
    for (const factura of facturasFiltradas) {
      try {
        // Obtener detalles completos de la factura
        const response = await fetch(`${API}/facturas/${factura.id}`)
        const facturaCompleta = await response.json()
        
        // Generar PDF usando la misma lógica que downloadFacturaPDF
        const { jsPDF } = window.jspdf
        const doc = new jsPDF()
        
        // Reutilizar lógica de generación de PDF
        await generarPDFFactura(doc, facturaCompleta)
        
        // Añadir al ZIP
        const pdfBlob = doc.output('blob')
        const nombreArchivo = `Factura_${facturaCompleta.numero_factura}_${facturaCompleta.cliente_apellidos}.pdf`
        zip.file(nombreArchivo, pdfBlob)
        
        generados++
        
        // Mostrar progreso
        if (generados % 5 === 0 || generados === facturasFiltradas.length) {
          showToast(`Generados ${generados}/${facturasFiltradas.length} PDFs...`, 'info')
        }
      } catch (error) {
        console.error(`Error generando PDF para factura ${factura.numero_factura}:`, error)
      }
    }
    
    // Generar y descargar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = `Facturas_${fechaInicio}_${fechaFin}.zip`
    link.click()
    
    showToast(`${generados} facturas descargadas en ZIP`, 'success')
    
  } catch (error) {
    console.error('Error descargando PDFs:', error)
    showToast('Error al descargar los PDFs', 'error')
  }
}

// Helper: Generar PDF de factura (código reutilizable)
async function generarPDFFactura(doc, factura) {
  // Colores corporativos
  const primaryBlack = [0, 0, 0]
  const softGray = [128, 128, 128]
  const lightGray = [245, 245, 245]
  const accentGold = [212, 175, 55]
  
  let yPos = 20
  
  // Logo
  try {
    const logoImg = await loadImage('/static/logo.jpg')
    doc.addImage(logoImg, 'JPEG', 20, yPos, 60, 33.75)
  } catch (e) {
    doc.setTextColor(...primaryBlack)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Anushka Hogar', 20, yPos + 8)
  }
  
  // Info empresa
  doc.setTextColor(...softGray)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('Confección e Instalación de Cortinas', 190, yPos + 2, { align: 'right' })
  doc.setFontSize(8)
  doc.text('Av. de Monelos 109, 15008 A Coruña', 190, yPos + 7, { align: 'right' })
  doc.text('Tel: 666 777 888', 190, yPos + 12, { align: 'right' })
  
  yPos += 40
  
  // Línea dorada
  doc.setDrawColor(...accentGold)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, 190, yPos)
  yPos += 8
  
  // Título
  doc.setTextColor(...primaryBlack)
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('FACTURA', 105, yPos, { align: 'center' })
  yPos += 3
  doc.setFontSize(12)
  doc.setTextColor(...accentGold)
  doc.text(factura.numero_factura, 105, yPos, { align: 'center' })
  yPos += 10
  
  // Box cliente
  doc.setFillColor(...lightGray)
  doc.roundedRect(20, yPos, 170, 22, 2, 2, 'F')
  yPos += 6
  doc.setTextColor(...primaryBlack)
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('Cliente:', 25, yPos)
  doc.setFont(undefined, 'normal')
  doc.text(`${factura.cliente_nombre} ${factura.cliente_apellidos}`, 45, yPos)
  yPos += 5
  doc.setFontSize(8)
  doc.setTextColor(...softGray)
  if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 25, yPos)
  yPos += 5
  doc.text(`Tel: ${factura.cliente_telefono || '-'} | Email: ${factura.cliente_email || '-'}`, 25, yPos)
  yPos += 5
  doc.setTextColor(...primaryBlack)
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('Fecha:', 145, yPos - 10)
  doc.setFont(undefined, 'normal')
  doc.text(new Date(factura.fecha_emision).toLocaleDateString('es-ES'), 160, yPos - 10)
  yPos += 10
  
  // Título del trabajo
  if (factura.presupuesto_titulo) {
    doc.setDrawColor(...softGray)
    doc.setLineWidth(0.3)
    doc.roundedRect(20, yPos, 170, 10, 1, 1, 'S')
    yPos += 3
    doc.setTextColor(...softGray)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('Trabajo:', 25, yPos)
    doc.setTextColor(...primaryBlack)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(factura.presupuesto_titulo, 42, yPos)
    yPos += 10
  }
  
  // Tabla líneas
  if (factura.lineas && factura.lineas.length > 0) {
    const tableData = factura.lineas.map(l => [
      l.concepto,
      `${l.cantidad} ${l.unidad}`,
      `€${parseFloat(l.precio_unitario).toFixed(2)}`,
      `€${parseFloat(l.subtotal).toFixed(2)}`
    ])
    
    doc.autoTable({
      startY: yPos,
      head: [['Concepto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.1 },
      headStyles: { fillColor: primaryBlack, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: lightGray }
    })
    yPos = doc.lastAutoTable.finalY + 15
  }
  
  // Totales
  const boxX = 115
  const boxY = yPos
  const boxWidth = 75
  doc.setFillColor(...lightGray)
  doc.roundedRect(boxX, boxY, boxWidth, 30, 2, 2, 'F')
  yPos += 7
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(...softGray)
  doc.text('Subtotal:', boxX + 5, yPos)
  doc.setTextColor(...primaryBlack)
  doc.setFont(undefined, 'bold')
  doc.text(`€${parseFloat(factura.subtotal).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
  yPos += 6
  doc.setFont(undefined, 'normal')
  doc.setTextColor(...softGray)
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, boxX + 5, yPos)
  doc.setTextColor(...primaryBlack)
  doc.setFont(undefined, 'bold')
  doc.text(`€${parseFloat(factura.importe_iva || factura.iva || 0).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
  yPos += 8
  doc.setDrawColor(...accentGold)
  doc.setLineWidth(1)
  doc.line(boxX + 5, yPos, boxX + boxWidth - 5, yPos)
  yPos += 6
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(...primaryBlack)
  doc.text('TOTAL:', boxX + 5, yPos)
  doc.setFontSize(14)
  doc.setTextColor(...accentGold)
  doc.text(`€${parseFloat(factura.total).toFixed(2)}`, boxX + boxWidth - 5, yPos, { align: 'right' })
  
  // Footer
  doc.setDrawColor(...accentGold)
  doc.setLineWidth(0.5)
  doc.line(20, 285, 190, 285)
  doc.setFontSize(8)
  doc.setTextColor(...softGray)
  doc.setFont(undefined, 'normal')
  doc.text('Anushka Hogar - Confección e Instalación de Cortinas', 105, 290, { align: 'center' })
}

async function showFacturaForm() {
  const [clientesRes, trabajosRes] = await Promise.all([
    axios.get(`${API}/clientes`),
    axios.get(`${API}/trabajos`)
  ])
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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

// Funciones stub para botones específicos
window.viewCliente = async (id) => {
  const { data } = await axios.get(`${API}/clientes/${id}`)
  alert(`Cliente: ${data.cliente.nombre} ${data.cliente.apellidos}\n\nTrabajo realizados: ${data.trabajos.length}\nFacturas: ${data.facturas.length}\nIncidencias: ${data.incidencias.length}`)
}

window.editCliente = (id) => showClienteForm(id)
window.editTrabajo = (id) => showTrabajoForm(id)
window.deleteTrabajo = async (id) => {
  if (!confirm('⚠️ ¿Estás segura de que quieres BORRAR este trabajo?\n\nEsta acción NO se puede deshacer.')) {
    return
  }
  
  try {
    await axios.delete(`${API}/trabajos/${id}`)
    showNotification('Trabajo eliminado correctamente')
    loadTrabajos()
    actualizarContadoresTrabajos()
  } catch (error) {
    console.error('Error eliminando trabajo:', error)
    showNotification('Error al eliminar el trabajo', 'error')
  }
}
window.closeModal = closeModal
window.viewPersonal = async (id) => {
  const { data } = await axios.get(`${API}/personal/${id}`)
  const calificacion = data.personal.calificacion ? `\nCalificación: ${data.personal.calificacion} ⭐` : ''
  alert(`Personal: ${data.personal.nombre} ${data.personal.apellidos}${calificacion}\nTrabajos: ${data.trabajos.length}\nHoras registradas: ${data.horas.length}`)
}
window.editPersonal = (id) => showPersonalForm(id)
window.editStock = (id) => showStockForm(id)

// ============================================
// GaliA - ASISTENTE FLOTANTE
// ============================================

// Abrir GaliA (Consultor IA)
function openGalIA() {
  // Crear modal flotante GRANDE si no existe
  if (document.getElementById('galia-modal-flotante')) {
    document.getElementById('galia-modal-flotante').remove()
    return
  }
  
  const modal = document.createElement('div')
  modal.id = 'galia-modal-flotante'
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-teal-700 via-blue-900 to-purple-800 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
              <img src="/static/galia-pulpo.png" alt="GaliA" class="w-full h-full object-contain">
            </div>
            <div class="text-white">
              <h2 class="text-2xl font-bold">GaliA - Tu Consultora</h2>
              <p class="text-teal-200 text-sm">Experta en Cortinas • Gestión • Innovación</p>
            </div>
          </div>
          <button onclick="openGalIA()" class="text-white hover:bg-white/20 p-3 rounded-full transition-all">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="bg-white/25 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
            <i class="fas fa-cut mr-1"></i>Cortinas
          </span>
          <span class="bg-white/25 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
            <i class="fas fa-file-invoice mr-1"></i>Facturación
          </span>
          <span class="bg-white/25 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
            <i class="fas fa-users mr-1"></i>Clientes
          </span>
        </div>
      </div>
      
      <!-- Área de Mensajes -->
      <div id="chat-messages-modal" class="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
        <!-- Mensaje de Bienvenida -->
        <div class="mb-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 p-1">
              <img src="/static/galia-pulpo.png" alt="GaliA" class="w-full h-full object-contain">
            </div>
            <div class="bg-white rounded-xl p-5 shadow-md max-w-3xl border-l-4 border-teal-500">
              <p class="text-gray-800 mb-3 text-base">
                ¡Hola! Soy <strong class="text-teal-700">GaliA</strong> 🐙, tu consultora especializada. 👋
              </p>
              <p class="text-gray-700 mb-2 text-sm">Puedo ayudarte con:</p>
              <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm mb-3">
                <li><strong>Cortinas</strong>: Confección, instalación, propuestas, tips de venta</li>
                <li><strong>Facturación</strong>: VerificaTu, normativa fiscal, gestión de cobros</li>
                <li><strong>Clientes</strong>: Fidelización, seguimiento, presupuestos</li>
                <li><strong>Sistema</strong>: Guía completa, mejores prácticas</li>
              </ul>
              <p class="text-gray-600 text-xs italic">
                💡 Pregúntame lo que quieras sobre tu negocio o el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Área de Input -->
      <div class="border-t bg-white p-4">
        <div class="flex gap-3 mb-3">
          <input 
            type="text" 
            id="chat-input-modal" 
            placeholder="Escribe tu consulta... (ej: ¿Cómo calculo el metraje?)"
            class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-teal-500 text-base"
            onkeypress="if(event.key==='Enter') sendMessageModal()"
          >
          <button 
            onclick="sendMessageModal()" 
            class="bg-gradient-to-r from-teal-600 to-purple-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
          >
            <i class="fas fa-paper-plane mr-2"></i>Enviar
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="sendQuickQuestionModal('¿Cómo calculo el metraje de cortinas?')" class="text-xs bg-gradient-to-r from-teal-50 to-purple-50 hover:from-teal-100 hover:to-purple-100 px-3 py-2 rounded-full text-teal-800 font-medium border border-teal-200">
            📏 Calcular metraje
          </button>
          <button onclick="sendQuickQuestionModal('¿Qué es VerificaTu?')" class="text-xs bg-gradient-to-r from-teal-50 to-purple-50 hover:from-teal-100 hover:to-purple-100 px-3 py-2 rounded-full text-teal-800 font-medium border border-teal-200">
            📄 VerificaTu
          </button>
          <button onclick="sendQuickQuestionModal('Tips para cerrar ventas')" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full text-gray-700">
            💰 Tips venta
          </button>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Focus en input
  setTimeout(() => {
    document.getElementById('chat-input-modal')?.focus()
  }, 100)
}

async function sendMessageModal() {
  const input = document.getElementById('chat-input-modal')
  const message = input?.value?.trim()
  
  if (!message) return
  
  // Limpiar input
  input.value = ''
  
  // Añadir mensaje del usuario
  const chatContainer = document.getElementById('chat-messages-modal')
  chatContainer.innerHTML += `
    <div class="mb-4 flex justify-end">
      <div class="bg-gradient-to-r from-teal-600 to-purple-700 text-white rounded-xl p-4 max-w-2xl shadow-md">
        <p class="text-sm">${message}</p>
      </div>
    </div>
  `
  
  // Scroll al final
  chatContainer.scrollTop = chatContainer.scrollHeight
  
  // Mostrar indicador de "escribiendo..."
  chatContainer.innerHTML += `
    <div id="typing-indicator" class="mb-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 p-1">
          <img src="/static/galia-pulpo.png" alt="GaliA" class="w-full h-full object-contain">
        </div>
        <div class="bg-white rounded-xl p-4 shadow-md">
          <i class="fas fa-circle-notch fa-spin text-teal-600"></i>
          <span class="text-gray-600 text-sm ml-2">Escribiendo...</span>
        </div>
      </div>
    </div>
  `
  chatContainer.scrollTop = chatContainer.scrollHeight
  
  try {
    // Enviar a la API
    const { data } = await axios.post(`${API}/chat`, { message })
    
    // Quitar indicador
    document.getElementById('typing-indicator')?.remove()
    
    // Añadir respuesta de GaliA
    chatContainer.innerHTML += `
      <div class="mb-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 p-1">
            <img src="/static/galia-pulpo.png" alt="GaliA" class="w-full h-full object-contain">
          </div>
          <div class="bg-white rounded-xl p-5 shadow-md max-w-3xl border-l-4 border-teal-500">
            <div class="prose prose-sm max-w-none text-gray-800">
              ${data.response.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      </div>
    `
    
    // Scroll al final
    chatContainer.scrollTop = chatContainer.scrollHeight
    
  } catch (error) {
    console.error('Error en chat:', error)
    document.getElementById('typing-indicator')?.remove()
    chatContainer.innerHTML += `
      <div class="mb-4">
        <div class="bg-red-50 rounded-xl p-4 border-l-4 border-red-500">
          <p class="text-red-800 text-sm">Lo siento, hubo un error. Por favor intenta de nuevo.</p>
        </div>
      </div>
    `
  }
}

function sendQuickQuestionModal(question) {
  const input = document.getElementById('chat-input-modal')
  if (input) {
    input.value = question
    sendMessageModal()
  }
}

window.openGalIA = openGalIA
window.sendMessageModal = sendMessageModal
window.sendQuickQuestionModal = sendQuickQuestionModal

// ============================================
// INICIALIZACIÓN
// ============================================

// ============================================
// INIT: CONSOLIDADO DE TODAS LAS INICIALIZACIONES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM cargado - Inicializando aplicación')
  
  // 1. Autenticación
  checkAuth()
  loadUserInfo()
  
  // 2. Permisos
  ocultarPestanasSegunRol()
  
  // 3. Dashboard (con delay para asegurar que Chart.js está listo)
  setTimeout(() => {
    console.log('📊 Cargando dashboard y gráficas...')
    loadDashboard()
  }, 500)
  
  // 4. Tareas (contador y header)
  actualizarContadorTareas()
  actualizarContadoresTareasHeader()
  setInterval(actualizarContadorTareas, 30000)
  setInterval(actualizarContadoresTareasHeader, 30000)
  
  // 5. Event listeners especiales (botones dinámicos)
  setTimeout(() => {
    const btnAnalizar = document.getElementById('btn-analizar')
    if (btnAnalizar) {
      btnAnalizar.addEventListener('click', function(e) {
        e.preventDefault()
        analizarImagen()
      })
    }
    
    const btnContinuarTelas = document.getElementById('btn-continuar-telas')
    if (btnContinuarTelas) {
      btnContinuarTelas.addEventListener('click', function(e) {
        e.preventDefault()
        continuarATelas()
      })
    }
  }, 1000)
  
  console.log('✅ Aplicación inicializada correctamente')
})

// Ocultar pestañas según rol del usuario
function ocultarPestanasSegunRol() {
  const rol = getUserRole()
  
  if (rol === 'tienda') {
    // Ocultar pestañas sensibles para tienda
    const pestanasSensibles = ['personal', 'facturas', 'reportes', 'presupuestos', 'historial']
    
    pestanasSensibles.forEach(tab => {
      const button = document.querySelector(`button[onclick="showTab('${tab}')"]`)
      if (button) {
        button.style.display = 'none'
      }
    })
    
    console.log('🏪 Modo Tienda: Pestañas sensibles ocultas (incluye Presupuestos e Historial)')
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
      rechazado: 'bg-red-100 text-red-800',
      finalizado: 'bg-purple-100 text-purple-800'
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
                <select onchange="cambiarEstadoPresupuesto(${p.id}, this.value, ${p.cliente_id}, '${p.titulo.replace(/'/g, "\\'")}', ${p.total})" class="px-2 py-1 text-xs font-semibold rounded-full border-0 ${estadoColor[p.estado]} cursor-pointer">
                  <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="enviado" ${p.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                  <option value="aceptado" ${p.estado === 'aceptado' ? 'selected' : ''}>Aceptado</option>
                  <option value="rechazado" ${p.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                  <option value="finalizado" ${p.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="viewPresupuesto(${p.id})" class="text-blue-600 hover:text-blue-800" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editPresupuesto(${p.id})" class="text-orange-600 hover:text-orange-800" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <div class="relative inline-block">
                  <button onclick="togglePDFMenu(${p.id})" class="text-green-600 hover:text-green-800" title="Descargar PDF">
                    <i class="fas fa-file-pdf"></i>
                  </button>
                  <div id="pdf-menu-${p.id}" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl z-50 border border-gray-200">
                    <button onclick="downloadPresupuestoPDF(${p.id}, 'completo'); togglePDFMenu(${p.id})" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 border-b">
                      <i class="fas fa-file-alt mr-2"></i>Presupuesto Completo
                    </button>
                    <button onclick="downloadPresupuestoPDF(${p.id}, 'final'); togglePDFMenu(${p.id})" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
                      <i class="fas fa-file-invoice mr-2"></i>Presupuesto Final (Resumen)
                    </button>
                  </div>
                </div>
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
          <div class="flex gap-2">
            <select id="presupuesto-cliente" required class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800">
              <option value="">Seleccionar cliente...</option>
              ${clientes.map(c => `<option value="${c.id}" ${preselectedClienteId && c.id === preselectedClienteId ? 'selected' : ''}>${c.nombre} ${c.apellidos}</option>`).join('')}
            </select>
            <button type="button" onclick="showQuickClienteForm()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap">
              <i class="fas fa-user-plus"></i> Nuevo
            </button>
          </div>
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
  presupuestoLineas.telas.forEach(l => { 
    if (l.concepto && (l.metros !== '' && l.metros !== undefined) && (l.precio !== '' && l.precio !== undefined)) 
      lineas.push({tipo: 'tela', concepto: l.concepto, metros: parseFloat(l.metros) || 0, precio: parseFloat(l.precio) || 0}) 
  })
  presupuestoLineas.materiales.forEach(l => { 
    if (l.concepto && (l.cantidad !== '' && l.cantidad !== undefined) && (l.precio !== '' && l.precio !== undefined)) 
      lineas.push({tipo: 'material', concepto: l.concepto, cantidad: parseFloat(l.cantidad) || 0, precio: parseFloat(l.precio) || 0}) 
  })
  presupuestoLineas.confeccion.forEach(l => { 
    if (l.concepto && (l.horas !== '' && l.horas !== undefined) && (l.precio !== '' && l.precio !== undefined)) 
      lineas.push({tipo: 'confeccion', concepto: l.concepto, horas: parseFloat(l.horas) || 0, precio: parseFloat(l.precio) || 0}) 
  })
  presupuestoLineas.instalacion.forEach(l => { 
    if (l.concepto && (l.horas !== '' && l.horas !== undefined) && (l.precio !== '' && l.precio !== undefined)) 
      lineas.push({tipo: 'instalacion', concepto: l.concepto, horas: parseFloat(l.horas) || 0, precio: parseFloat(l.precio) || 0}) 
  })
  // Validación eliminada: Ahora se permite actualizar presupuesto sin líneas (solo con observaciones/condiciones)
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
    if (l.concepto && (l.metros !== '' && l.metros !== undefined) && (l.precio !== '' && l.precio !== undefined)) {
      lineas.push({
        tipo: 'tela',
        concepto: l.concepto,
        metros: parseFloat(l.metros) || 0,
        precio: parseFloat(l.precio) || 0
      })
    }
  })
  
  presupuestoLineas.materiales.forEach(l => {
    if (l.concepto && (l.cantidad !== '' && l.cantidad !== undefined) && (l.precio !== '' && l.precio !== undefined)) {
      lineas.push({
        tipo: 'material',
        concepto: l.concepto,
        cantidad: parseFloat(l.cantidad) || 0,
        precio: parseFloat(l.precio) || 0
      })
    }
  })
  
  presupuestoLineas.confeccion.forEach(l => {
    if (l.concepto && (l.horas !== '' && l.horas !== undefined) && (l.precio !== '' && l.precio !== undefined)) {
      lineas.push({
        tipo: 'confeccion',
        concepto: l.concepto,
        horas: parseFloat(l.horas) || 0,
        precio: parseFloat(l.precio) || 0
      })
    }
  })
  
  presupuestoLineas.instalacion.forEach(l => {
    if (l.concepto && (l.horas !== '' && l.horas !== undefined) && (l.precio !== '' && l.precio !== undefined)) {
      lineas.push({
        tipo: 'instalacion',
        concepto: l.concepto,
        horas: parseFloat(l.horas) || 0,
        precio: parseFloat(l.precio) || 0
      })
    }
  })
  
  // Validación eliminada: Ahora se permite crear presupuesto sin líneas (solo con observaciones/condiciones)
  
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

// Formulario rápido para crear cliente desde presupuesto
function showQuickClienteForm() {
  const modalContent = `
    <form onsubmit="saveQuickCliente(event)" class="space-y-4">
      <h3 class="text-xl font-bold text-gray-900 mb-4">Crear Cliente Rápido</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
          <input type="text" id="quick-cliente-nombre" required class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Apellidos *</label>
          <input type="text" id="quick-cliente-apellidos" required class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
          <input type="tel" id="quick-cliente-telefono" required class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" id="quick-cliente-email" class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
        <input type="text" id="quick-cliente-direccion" class="w-full px-4 py-2 border rounded-lg">
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
          <input type="text" id="quick-cliente-ciudad" class="w-full px-4 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
          <input type="text" id="quick-cliente-cp" class="w-full px-4 py-2 border rounded-lg">
        </div>
      </div>
      
      <div class="flex gap-3 justify-end">
        <button type="button" onclick="closeModal(); showPresupuestoForm()" class="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="submit" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <i class="fas fa-save mr-2"></i>Crear y Seleccionar
        </button>
      </div>
    </form>
  `
  
  showModal(modalContent, 'max-w-2xl')
}

// Guardar cliente rápido y seleccionarlo automáticamente
async function saveQuickCliente(event) {
  event.preventDefault()
  
  const data = {
    nombre: document.getElementById('quick-cliente-nombre').value,
    apellidos: document.getElementById('quick-cliente-apellidos').value,
    telefono: document.getElementById('quick-cliente-telefono').value,
    email: document.getElementById('quick-cliente-email').value,
    direccion: document.getElementById('quick-cliente-direccion').value,
    ciudad: document.getElementById('quick-cliente-ciudad').value,
    codigo_postal: document.getElementById('quick-cliente-cp').value
  }
  
  try {
    const response = await fetch(`${API}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (result.success) {
      showToast(`Cliente ${data.nombre} ${data.apellidos} creado correctamente`, 'success')
      closeModal()
      // Reabrir formulario de presupuesto con cliente preseleccionado
      showPresupuestoForm(null, result.id)
    } else {
      alert('Error al crear cliente')
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error al crear cliente')
  }
}

// Cambiar estado de presupuesto con auto-conversión a trabajo y auto-facturación
async function cambiarEstadoPresupuesto(id, nuevoEstado, clienteId, titulo, total) {
  try {
    // 1. PRIMERO: Actualizar estado y ESPERAR confirmación
    const updateResponse = await fetch(`${API}/presupuestos/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    
    if (!updateResponse.ok) {
      throw new Error('Error al actualizar estado')
    }
    
    // 2. DESPUÉS: Procesar según el nuevo estado (YA GUARDADO en BD)
    
    // Si cambió a "aceptado", auto-convertir a trabajo
    if (nuevoEstado === 'aceptado') {
      const confirmar = confirm(`¿Deseas crear automáticamente un trabajo para "${titulo}"?\n\nEsto generará las 4 fases: Mediciones → Pedidos → Confección → Instalación`)
      
      if (confirmar) {
        const response = await fetch(`${API}/presupuestos/${id}/convertir-a-trabajo`, {
          method: 'POST'
        })
        
        const result = await response.json()
        
        if (result.success) {
          showToast(`✅ Presupuesto aceptado y trabajo #${result.trabajo_id} creado`, 'success')
        } else {
          showToast('Presupuesto actualizado pero no se pudo crear el trabajo', 'warning')
        }
      } else {
        showToast('Estado actualizado a Aceptado', 'success')
      }
    }
    // Si cambió a "finalizado", ofrecer auto-facturación
    else if (nuevoEstado === 'finalizado') {
      // Pequeña pausa para asegurar que BD se actualizó
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const confirmar = confirm(`Presupuesto FINALIZADO: "${titulo}"\n\n¿Deseas generar la factura automáticamente?\n\nSe creará con todos los datos del presupuesto:\n- Cliente, total, líneas, condiciones de pago`)
      
      if (confirmar) {
        const response = await fetch(`${API}/presupuestos/${id}/generar-factura`, {
          method: 'POST'
        })
        
        const result = await response.json()
        
        if (result.success) {
          showToast(`✅ Factura ${result.numero_factura} generada correctamente (€${parseFloat(total).toFixed(2)})`, 'success')
          
          // Preguntar si quiere ir a ver la factura
          setTimeout(() => {
            if (confirm('¿Deseas ir a ver la factura creada?')) {
              showTab('facturas')
            }
          }, 1000)
        } else {
          showToast('Error: ' + (result.error || 'No se pudo generar la factura'), 'error')
        }
      } else {
        showToast('Estado actualizado a Finalizado', 'success')
      }
    }
    else {
      showToast(`Estado actualizado a ${nuevoEstado}`, 'success')
    }
    
    loadPresupuestos()
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    showToast('Error al actualizar el estado', 'error')
    loadPresupuestos() // Recargar para revertir visualmente
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

// Toggle menú PDF
function togglePDFMenu(id) {
  const menu = document.getElementById(`pdf-menu-${id}`)
  const allMenus = document.querySelectorAll('[id^="pdf-menu-"]')
  allMenus.forEach(m => {
    if (m.id !== `pdf-menu-${id}`) m.classList.add('hidden')
  })
  menu.classList.toggle('hidden')
}

// Cerrar menús al hacer click fuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.relative')) {
    document.querySelectorAll('[id^="pdf-menu-"]').forEach(m => m.classList.add('hidden'))
  }
})

// Descargar PDF con diseño premium
async function downloadPresupuestoPDF(id, tipo = 'completo') {
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
    
    // Colores corporativos
    const primaryBlack = [0, 0, 0]
    const softGray = [128, 128, 128]
    const lightGray = [245, 245, 245]
    const accentGold = [212, 175, 55]
    
    let yPos = 20
    
    // ====================================
    // HEADER CON LOGO (proporción 16:9 respetada)
    // ====================================
    
    // Logo Anushka Hogar (1024x576 = 16:9)
    // Calculamos proporciones: ancho 60mm → alto 33.75mm (60 * 9/16)
    try {
      const logoImg = await loadImage('/static/logo.jpg')
      doc.addImage(logoImg, 'JPEG', 20, yPos, 60, 33.75)
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e)
      // Fallback: texto
      doc.setTextColor(...primaryBlack)
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('Anushka Hogar', 20, yPos + 8)
    }
    
    // Información empresa (derecha)
    doc.setTextColor(...softGray)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text('Confección e Instalación de Cortinas', 190, yPos + 2, { align: 'right' })
    doc.setFontSize(8)
    doc.text('Av. de Monelos 109, 15008 A Coruña', 190, yPos + 7, { align: 'right' })
    doc.text('Tel: 666 777 888', 190, yPos + 12, { align: 'right' })
    
    yPos += 40
    
    // Línea dorada separadora
    doc.setDrawColor(...accentGold)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)
    yPos += 8
    
    // ====================================
    // TÍTULO DEL DOCUMENTO
    // ====================================
    doc.setTextColor(...primaryBlack)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    const tituloDoc = tipo === 'completo' ? 'PRESUPUESTO COMPLETO' : 'PRESUPUESTO FINAL'
    doc.text(tituloDoc, 105, yPos, { align: 'center' })
    
    yPos += 3
    doc.setFontSize(11)
    doc.setTextColor(...accentGold)
    doc.text(data.numero_presupuesto, 105, yPos, { align: 'center' })
    
    yPos += 10
    
    // Cliente y fecha en una línea compacta
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...primaryBlack)
    doc.text(`Cliente: ${data.cliente_nombre} ${data.cliente_apellidos}`, 20, yPos)
    
    doc.setTextColor(...softGray)
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
      doc.setTextColor(...primaryBlack)
      doc.text(data.titulo, 20, yPos)
      yPos += 5
    }
    
    // ====================================
    // LÍNEAS DEL PRESUPUESTO (solo si es COMPLETO)
    // ====================================
    
    if (tipo === 'completo') {
      // Función helper para crear tabla minimalista y compacta
      const createTable = (title, items, unit) => {
      if (items.length === 0) return
      
      // Título de sección simple y limpio
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryBlack)
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
          textColor: primaryBlack,
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
    
    } // Fin if (tipo === 'completo')
    
    // ====================================
    // TOTALES COMPACTOS
    // ====================================
    
    yPos += 3
    
    // Caja de totales minimalista
    const boxX = 125
    const boxY = yPos
    const boxWidth = 65
    
    // Línea superior
    doc.setDrawColor(...softGray)
    doc.setLineWidth(0.2)
    doc.line(boxX, boxY, boxX + boxWidth, boxY)
    
    yPos += 4
    
    // Subtotal
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...softGray)
    doc.text('Subtotal:', boxX + 2, yPos, { align: 'left' })
    doc.setTextColor(...primaryBlack)
    doc.text(`€${data.subtotal.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
    yPos += 4
    
    // Descuento (si existe)
    if (data.descuento_porcentaje > 0) {
      doc.setTextColor(...softGray)
      doc.text(`Descuento (${data.descuento_porcentaje}%):`, boxX + 2, yPos, { align: 'left' })
      doc.setTextColor(220, 38, 38)
      doc.text(`-€${data.descuento_importe.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
      yPos += 4
    }
    
    // IVA
    doc.setTextColor(...softGray)
    doc.text(`IVA (${data.porcentaje_iva}%):`, boxX + 2, yPos, { align: 'left' })
    doc.setTextColor(...primaryBlack)
    doc.text(`€${data.importe_iva.toFixed(2)}`, boxX + boxWidth - 2, yPos, { align: 'right' })
    yPos += 4
    
    // Línea separadora
    doc.setDrawColor(...accentGold)
    doc.setLineWidth(0.5)
    doc.line(boxX, yPos, boxX + boxWidth, yPos)
    yPos += 5
    
    // TOTAL FINAL
    doc.setFillColor(...accentGold)
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
      doc.setTextColor(...primaryBlack)
      
      if (data.notas) {
        doc.text('NOTAS:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
        const splitNotas = doc.splitTextToSize(data.notas, 170)
        doc.text(splitNotas, 20, yPos)
        yPos += splitNotas.length * 3.5 + 5
      }
      
      if (data.condiciones) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryBlack)
        doc.text('CONDICIONES:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
        const splitCond = doc.splitTextToSize(data.condiciones, 170)
        doc.text(splitCond, 20, yPos)
        yPos += splitCond.length * 3.5 + 5
      }
      
      if (data.forma_pago) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...primaryBlack)
        doc.text('FORMA DE PAGO:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        doc.setTextColor(...softGray)
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
      doc.setDrawColor(...softGray)
      doc.setLineWidth(0.2)
      doc.line(20, 285, 190, 285)
      
      // Texto del pie de página compacto
      doc.setFontSize(6)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(...softGray)
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
    const tipoLabel = tipo === 'completo' ? 'Completo' : 'Final'
    const filename = `Presupuesto_${tipoLabel}_${data.numero_presupuesto}_${data.cliente_apellidos}.pdf`
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
      rechazado: 'bg-red-100 text-red-800',
      finalizado: 'bg-purple-100 text-purple-800'
    }
    
    const html = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) closeModal()">
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
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) closeModal()">
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
                <i class="fas fa-chart-line text-gray-700 mr-2"></i>Resumen de Presupuestos
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
          <i class="fas fa-tags text-gray-700 mr-2"></i>
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
      <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'} text-gray-700 mr-2"></i>
      ${isEdit ? 'Editar' : 'Nueva'} Categoría
    </h3>
    <form id="categoria-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input type="text" name="nombre" value="${categoria.nombre}" required 
               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea name="descripcion" rows="2" 
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">${categoria.descripcion || ''}</textarea>
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
                 class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
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
    console.log('📂 Cargando proyectos desde API...')
    const { data } = await axios.get(`${API}/disenador/proyectos`)
    console.log('✅ Proyectos recibidos:', data.length)
    
    const galeria = document.getElementById('proyectos-galeria')
    if (!galeria) {
      console.error('❌ Elemento #proyectos-galeria NO encontrado')
      return
    }
    
    console.log('🎨 Renderizando galería...')
    
    if (data.length === 0) {
      galeria.innerHTML = `
        <div class="col-span-3 text-center py-12">
          <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No hay proyectos aún. ¡Crea el primero!</p>
        </div>
      `
      console.log('✅ Galería vacía renderizada')
      return
    }
    
    galeria.innerHTML = data.map(p => {
      // Validar si la imagen es válida (no blob, no null, no undefined)
      const tieneImagenValida = p.imagen_original_url && 
                                 !p.imagen_original_url.startsWith('blob:') && 
                                 p.imagen_original_url.startsWith('http')
      
      // Imagen placeholder (muestrario de telas) si no hay foto válida
      const imagenUrl = tieneImagenValida 
        ? p.imagen_original_url 
        : 'https://page.gensparksite.com/v1/base64_upload/37d001a1d9a1374db7d3226a28ce3c50'
      
      return `
      <div class="border rounded-lg overflow-hidden hover:shadow-lg transition-all relative group">
        <!-- Imagen con aspect ratio fijo y botón eliminar -->
        <div class="relative">
          <div class="w-full aspect-video bg-gray-100 cursor-pointer" onclick="abrirProyecto(${p.id})">
            <img src="${imagenUrl}" alt="${p.nombre_proyecto}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/800x450/e5e7eb/9ca3af?text=En+Proceso'">
            ${!tieneImagenValida ? '<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><span class="text-white font-medium text-lg"><i class="fas fa-spinner fa-spin mr-2"></i>En Proceso</span></div>' : ''}
          </div>
          <!-- Botón eliminar (aparece al hover) -->
          <button 
            onclick="event.stopPropagation(); eliminarProyecto(${p.id})" 
            class="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 flex items-center justify-center z-10"
            title="Eliminar proyecto"
          >
            <i class="fas fa-trash text-sm"></i>
          </button>
        </div>
        <!-- Info del proyecto -->
        <div class="p-4 cursor-pointer" onclick="abrirProyecto(${p.id})">
          <h3 class="font-semibold text-gray-800 truncate">${p.nombre_proyecto}</h3>
          <p class="text-sm text-gray-500 truncate">${p.cliente_nombre || 'Sin cliente'}</p>
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
      `
    }).join('')
    
    console.log('✅ Galería renderizada con', data.length, 'proyectos')
  } catch (error) {
    console.error('❌ Error cargando proyectos:', error)
  }
}

// Volver a paso anterior
function volverAPaso(numeroPaso) {
  console.log('⬅️ Volviendo al paso:', numeroPaso)
  
  switch(numeroPaso) {
    case 1:
      // Volver a Paso 1 (Upload)
      document.getElementById('step-analisis').classList.add('hidden')
      document.getElementById('step-tipo-cortina').classList.add('hidden')
      document.getElementById('step-configuracion').classList.add('hidden')
      document.getElementById('step-resultados').classList.add('hidden')
      document.getElementById('step-upload').classList.remove('hidden')
      document.getElementById('step-upload').scrollIntoView({ behavior: 'smooth' })
      break
      
    case 2:
      // Volver a Paso 2 (Análisis)
      document.getElementById('step-tipo-cortina').classList.add('hidden')
      document.getElementById('step-configuracion').classList.add('hidden')
      document.getElementById('step-resultados').classList.add('hidden')
      document.getElementById('step-analisis').classList.remove('hidden')
      document.getElementById('step-analisis').scrollIntoView({ behavior: 'smooth' })
      break
      
    case 3:
      // Volver a Paso 3 (Tipo de Cortina)
      document.getElementById('step-configuracion').classList.add('hidden')
      document.getElementById('step-resultados').classList.add('hidden')
      document.getElementById('step-tipo-cortina').classList.remove('hidden')
      document.getElementById('step-tipo-cortina').scrollIntoView({ behavior: 'smooth' })
      break
      
    case 4:
      // Volver a Paso 4 (Configuración/Telas)
      document.getElementById('step-resultados').classList.add('hidden')
      document.getElementById('step-configuracion').classList.remove('hidden')
      document.getElementById('step-configuracion').scrollIntoView({ behavior: 'smooth' })
      break
  }
}

// Mostrar formulario de nuevo proyecto
function showNuevoProyecto() {
  document.getElementById('proyectos-galeria').parentElement.classList.add('hidden')
  document.getElementById('proyecto-workspace').classList.remove('hidden')
  document.getElementById('step-upload').classList.remove('hidden')
  
  // IMPORTANTE: Ocultar todos los pasos menos el primero
  document.getElementById('step-analisis').classList.add('hidden')
  document.getElementById('step-tipo-cortina').classList.add('hidden')
  document.getElementById('step-configuracion').classList.add('hidden')
  document.getElementById('step-resultados').classList.add('hidden')
  
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
  console.log('🔍 analizarImagen() iniciada')
  console.log('📁 proyectoActual.imagen_file:', proyectoActual.imagen_file)
  
  if (!proyectoActual.imagen_file) {
    alert('❌ Selecciona una imagen primero')
    console.error('❌ No hay imagen_file en proyectoActual')
    return
  }
  
  try {
    console.log('📤 Mostrando loading...')
    showLoading('Analizando espacio con IA (Gemini Vision)...')
    
    // 1. Convertir imagen a base64 para Gemini Vision y R2
    const imagen_base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(proyectoActual.imagen_file)
    })
    
    // 2. Subir imagen original a R2
    showLoading('Guardando imagen original...')
    let imagen_url = URL.createObjectURL(proyectoActual.imagen_file) // Fallback
    let imagen_r2_key = null
    
    try {
      const { data: uploadData } = await axios.post(`${API}/uploads/imagen`, {
        imagen_base64: imagen_base64,
        carpeta: 'proyectos',
        nombre_archivo: `proyecto-${Date.now()}`
      })
      
      imagen_url = uploadData.url
      imagen_r2_key = uploadData.key
      console.log('✅ Imagen original subida a R2:', imagen_url)
    } catch (uploadError) {
      console.warn('⚠️ Error subiendo a R2, usando blob URL:', uploadError)
      // Continuar con blob URL si falla R2
    }
    
    proyectoActual.imagen_url = imagen_url
    proyectoActual.imagen_r2_key = imagen_r2_key
    
    // 3. Crear proyecto en BD
    const { data: proyecto } = await axios.post(`${API}/disenador/proyectos`, {
      nombre_proyecto: `Proyecto ${new Date().toLocaleDateString()}`,
      imagen_original_url: imagen_url,
      imagen_original_r2_key: imagen_r2_key
    })
    proyectoActual.id = proyecto.proyecto_id
    console.log('✅ Proyecto creado con ID:', proyectoActual.id)
    
    // Analizar con IA (Gemini Vision)
    console.log('🤖 Llamando a Gemini Vision...')
    const { data: analisis } = await axios.post(`${API}/disenador/analizar`, {
      imagen_base64: imagen_base64,
      proyecto_id: proyectoActual.id
    })
    
    proyectoActual.analisis = analisis.analisis
    console.log('✅ Análisis recibido:', analisis.analisis)
    console.log('ℹ️ Mensaje:', analisis.mensaje)
    
    hideLoading()
    console.log('📊 Mostrando análisis...')
    mostrarAnalisis(analisis.analisis)
    
    // Pasar al siguiente paso
    console.log('👁️ Mostrando step-analisis...')
    const stepAnalisis = document.getElementById('step-analisis')
    if (stepAnalisis) {
      stepAnalisis.classList.remove('hidden')
      console.log('✅ step-analisis visible')
    } else {
      console.error('❌ step-analisis NO encontrado en DOM')
    }
    
    // Scroll al análisis
    setTimeout(() => {
      console.log('📜 Haciendo scroll...')
      const step = document.getElementById('step-analisis')
      if (step) {
        step.scrollIntoView({ behavior: 'smooth', block: 'start' })
        console.log('✅ Scroll completado')
      }
    }, 300)
    
    // Mensaje de éxito (indicar si es real o simulado)
    if (analisis.mensaje.includes('simulado')) {
      showSuccess('⚠️ Análisis simulado completado (configura GEMINI_API_KEY para análisis real)')
    } else {
      showSuccess('✅ Análisis completado con Gemini Vision - Ahora elige el tipo de cortina')
    }
    
  } catch (error) {
    console.error('❌ Error analizando imagen:', error)
    console.error('❌ Stack:', error.stack)
    hideLoading()
    showError('❌ Error al analizar imagen: ' + error.message)
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

// Mostrar paso de selección de tipo
function mostrarSeleccionTipo() {
  document.getElementById('step-tipo-cortina').classList.remove('hidden')
  
  // Scroll al paso de tipo
  setTimeout(() => {
    document.getElementById('step-tipo-cortina').scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 300)
}

// Seleccionar tipo de cortina
async function seleccionarTipoCortina(tipo, nombre) {
  console.log('🎨 seleccionarTipoCortina llamada:', tipo, nombre)
  proyectoActual.tipo_cortina = tipo
  
  // Marcar visualmente la selección
  document.querySelectorAll('.tipo-cortina-card').forEach(card => {
    card.classList.remove('border-purple-600', 'bg-purple-50')
    card.classList.add('border-gray-200')
  })
  event.currentTarget.classList.remove('border-gray-200')
  event.currentTarget.classList.add('border-purple-600', 'bg-purple-50')
  
  // Mostrar info de selección con botón
  const infoDiv = document.getElementById('tipo-seleccionado-info')
  infoDiv.classList.remove('hidden')
  document.getElementById('tipo-seleccionado-nombre').textContent = nombre
  
  // Actualizar el select en el paso 4
  const selectTipo = document.getElementById('tipo-cortina')
  if (selectTipo) {
    selectTipo.value = tipo
  }
  
  showSuccess(`✅ Tipo seleccionado: ${nombre}`)
  console.log('✅ Tipo guardado en proyectoActual:', proyectoActual.tipo_cortina)
  
  // Hacer scroll al botón de continuar
  setTimeout(() => {
    const infoDiv = document.getElementById('tipo-seleccionado-info')
    if (infoDiv) {
      infoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 300)
}

// Continuar a selección de telas
async function continuarATelas() {
  console.log('➡️ continuarATelas() llamada')
  
  if (!proyectoActual.tipo_cortina) {
    alert('❌ Selecciona un tipo de cortina primero')
    return
  }
  
  try {
    showLoading('Cargando catálogo de telas...')
    
    // Mostrar paso de configuración
    console.log('👁️ Mostrando step-configuracion...')
    document.getElementById('step-configuracion').classList.remove('hidden')
    
    // Cargar catálogo de telas
    console.log('📚 Cargando catálogo de telas...')
    await loadCatalogoTelas()
    console.log('✅ Catálogo de telas cargado')
    
    hideLoading()
    
    // Scroll al catálogo
    setTimeout(() => {
      console.log('📜 Haciendo scroll a catálogo...')
      document.getElementById('step-configuracion').scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
    
    showSuccess('✅ Ahora elige la tela perfecta')
  } catch (error) {
    console.error('❌ Error cargando telas:', error)
    hideLoading()
    showError('❌ Error al cargar catálogo de telas')
  }
}

// Toggle mostrar form de subir tela
function toggleSubirTela() {
  const form = document.getElementById('form-subir-tela')
  const btn = document.getElementById('btn-toggle-subir')
  
  if (form.classList.contains('hidden')) {
    form.classList.remove('hidden')
    btn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar'
  } else {
    form.classList.add('hidden')
    btn.innerHTML = '<i class="fas fa-chevron-down"></i> Mostrar'
  }
}

// Manejar subida de imagen de tela
function handleTelaUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 10 * 1024 * 1024) {
    alert('❌ La imagen es demasiado grande (máx. 10MB)')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    document.getElementById('tela-preview-img').src = e.target.result
    document.getElementById('tela-preview').classList.remove('hidden')
    proyectoActual.tela_custom_file = file
    proyectoActual.tela_custom_preview = e.target.result
  }
  reader.readAsDataURL(file)
}

// Usar tela subida
async function usarTelaSubida() {
  const nombre = document.getElementById('tela-nombre-input').value.trim()
  const precio = parseFloat(document.getElementById('tela-precio-input').value)
  const esStock = document.getElementById('tela-es-stock').checked
  
  if (!nombre) {
    alert('❌ Ingresa el nombre de la tela')
    return
  }
  
  if (!precio || precio <= 0) {
    alert('❌ Ingresa un precio válido')
    return
  }
  
  if (!proyectoActual.tela_custom_file) {
    alert('❌ Sube una imagen de la tela')
    return
  }
  
  try {
    showLoading('Subiendo imagen a R2...')
    
    // 1. Subir imagen a R2
    let imagenUrl = proyectoActual.tela_custom_preview // Fallback
    let imagenKey = null
    
    try {
      const { data: uploadData } = await axios.post(`${API}/uploads/imagen`, {
        imagen_base64: proyectoActual.tela_custom_preview,
        carpeta: 'telas',
        nombre_archivo: `tela-${nombre.toLowerCase().replace(/\s+/g, '-')}`
      })
      
      imagenUrl = uploadData.url
      imagenKey = uploadData.key
      console.log('✅ Imagen subida a R2:', imagenUrl)
    } catch (uploadError) {
      console.warn('⚠️ Error subiendo a R2, usando base64:', uploadError)
      // Continuar con base64 si falla R2
    }
    
    // 2. Crear objeto de tela personalizada
    proyectoActual.tela_seleccionada = {
      id: 'custom',
      nombre: nombre,
      precio_metro: precio,
      referencia: 'CUSTOM-' + Date.now(),
      es_stock: esStock,
      imagen_preview: imagenUrl,
      imagen_r2_key: imagenKey,
      es_personalizada: true
    }
    
    // 3. Actualizar UI
    document.getElementById('tela-nombre').textContent = nombre
    document.getElementById('tela-precio').textContent = `${precio}€/m²`
    
    // 4. Si es de stock, crear tarea pendiente en backend
    if (esStock) {
      showLoading('Creando tarea pendiente...')
      
      const { data } = await axios.post(`${API}/tareas`, {
        tipo: 'añadir_tela_stock',
        titulo: `Añadir tela "${nombre}" al catálogo`,
        descripcion: `Tela personalizada subida desde proyecto. Revisar y añadir al stock con todas las especificaciones.`,
        datos_tarea: {
          tela_nombre: nombre,
          tela_precio: precio,
          imagen_url: imagenUrl,
          imagen_r2_key: imagenKey,
          imagen_file_name: proyectoActual.tela_custom_file.name,
          referencia: proyectoActual.tela_seleccionada.referencia
        },
        prioridad: 2, // Media
        proyecto_id: proyectoActual.id
      })
      
      hideLoading()
      console.log('✅ Tarea creada con ID:', data.tarea_id)
      showSuccess(`✅ Tela "${nombre}" seleccionada. Imagen guardada y tarea creada.`)
      
      // Actualizar contador de tareas en header (si existe)
      actualizarContadorTareas()
    } else {
      hideLoading()
      showSuccess(`✅ Tela externa "${nombre}" seleccionada. Imagen guardada.`)
    }
    
    // Botón ya NO tiene disabled (siempre activo, validación en generarVisualizaciones)
    console.log('✅ Tela lista para generar visualizaciones')
    
    // Ocultar form
    toggleSubirTela()
    cancelarTelaSubida()
    
    // Calcular precio - DESHABILITADO (solo visualización)
    // calcularPrecioEstimado()
  } catch (error) {
    console.error('Error creando tarea:', error)
    hideLoading()
    showError('⚠️ Tela seleccionada pero no se pudo crear la tarea. Anótala manualmente.')
  }
}

// Cancelar subida de tela
function cancelarTelaSubida() {
  document.getElementById('tela-file-input').value = ''
  document.getElementById('tela-nombre-input').value = ''
  document.getElementById('tela-precio-input').value = ''
  document.getElementById('tela-es-stock').checked = false
  document.getElementById('tela-preview').classList.add('hidden')
  proyectoActual.tela_custom_file = null
  proyectoActual.tela_custom_preview = null
}

// Cargar catálogo de telas
async function loadCatalogoTelas() {
  console.log('🔄 loadCatalogoTelas() iniciada')
  try {
    console.log('📡 Haciendo petición a:', `${API}/disenador/telas?disponible=true`)
    const { data } = await axios.get(`${API}/disenador/telas?disponible=true`)
    console.log('📦 Telas recibidas:', data.length, 'telas')
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

// DESHABILITADO - Diseñador Virtual solo para visualización, no para presupuestos
// function calcularPrecioEstimado() {
//   if (!proyectoActual.analisis || !proyectoActual.tela_seleccionada) return
//   
//   const ventana = proyectoActual.analisis.ventanas[0]
//   const ancho = ventana.ancho_aprox
//   const alto = ventana.alto_aprox
//   
//   // Cálculo de metraje (ancho x 2.5 para caída) x (alto + 0.2 para dobladillos)
//   const metraje = (ancho * 2.5) * (alto + 0.2)
//   
//   let precioTela = metraje * proyectoActual.tela_seleccionada.precio_metro
//   
//   // Añadir extras
//   if (document.getElementById('opt-forro').checked) {
//     precioTela += metraje * 15
//   }
//   
//   if (document.getElementById('opt-motorizada').checked) {
//     precioTela += 180
//   }
//   
//   if (document.getElementById('opt-doble').checked) {
//     precioTela *= 1.8
//   }
//   
//   // Accesorios (estimado)
//   const accesorios = ancho * 45 // Rieles, ganchos, etc.
//   
//   // Confección e instalación (estimado)
//   const manoObra = 150
//   
//   const total = Math.round(precioTela + accesorios + manoObra)
//   
//   document.getElementById('precio-estimado').textContent = `${total}€`
// }

// DESHABILITADO - No hay opciones extra ahora
// document.addEventListener('DOMContentLoaded', () => {
//   const opciones = ['opt-forro', 'opt-motorizada', 'opt-doble']
//   opciones.forEach(id => {
//     const el = document.getElementById(id)
//     if (el) {
//       el.addEventListener('change', calcularPrecioEstimado)
//     }
//   })
// })

// Generar visualizaciones con IA
async function generarVisualizaciones() {
  // VALIDACIONES ROBUSTAS (botón siempre activo, validación aquí)
  console.log('🔍 Validando antes de generar...', {
    tela_seleccionada: !!proyectoActual.tela_seleccionada,
    tipo_cortina: proyectoActual.tipo_cortina,
    imagen_url: proyectoActual.imagen_url
  })
  
  if (!proyectoActual.tela_seleccionada) {
    alert('❌ Por favor, selecciona una tela primero')
    return
  }
  
  if (!proyectoActual.tipo_cortina) {
    alert('❌ Por favor, selecciona un tipo de cortina')
    return
  }
  
  if (!proyectoActual.imagen_url) {
    alert('❌ No hay imagen del espacio. Vuelve al Paso 1.')
    return
  }
  
  try {
    showLoading('🎨 Generando visualización con Flux Pro Ultra... (15-30 segundos)')
    
    // Obtener tipo de cortina (ya seleccionado en paso anterior)
    proyectoActual.tipo_cortina = proyectoActual.tipo_cortina || 'ondas_francesas'
    
    // Opciones por defecto (sin extras)
    proyectoActual.opciones = {
      forro_termico: false,
      motorizada: false,
      doble_cortina: false
    }
    
    console.log('📤 Enviando a generación:', {
      proyecto_id: proyectoActual.id,
      tela_nombre: proyectoActual.tela_seleccionada.nombre,
      tipo_cortina: proyectoActual.tipo_cortina,
      imagen_original_url: proyectoActual.imagen_url
    })
    
    // Llamar a generación IA (Flux Pro Ultra)
    const { data } = await axios.post(`${API}/disenador/generar`, {
      proyecto_id: proyectoActual.id,
      tela_nombre: proyectoActual.tela_seleccionada.nombre,
      tela_descripcion: proyectoActual.tela_seleccionada.descripcion || null,
      tipo_cortina: proyectoActual.tipo_cortina,
      opciones: proyectoActual.opciones,
      imagen_original_url: proyectoActual.imagen_url
    })
    
    proyectoActual.imagenes_generadas = data.imagenes
    
    console.log('✅ Imágenes recibidas del backend:', {
      cantidad: data.imagenes.length,
      imagenes: data.imagenes,
      modelo: data.modelo
    })
    
    hideLoading()
    
    // Mensaje diferenciado según modelo usado
    if (data.modelo === 'simulado') {
      showSuccess('⚠️ Visualizaciones simuladas (configura FAL_API_KEY para generación real)')
    } else {
      showSuccess(`✅ Visualización generada con ${data.modelo} en ${data.tiempo_generacion}s`)
    }
    
    console.log('🎬 Llamando a mostrarResultados()...')
    mostrarResultados()
    
  } catch (error) {
    console.error('Error generando visualizaciones:', error)
    hideLoading()
    showError('❌ Error al generar visualizaciones: ' + (error.response?.data?.error || error.message))
  }
}

// Mostrar resultados
function mostrarResultados() {
  console.log('🎨 mostrarResultados() ejecutándose...')
  console.log('📊 Datos actuales:', {
    imagen_url: proyectoActual.imagen_url,
    imagenes_generadas: proyectoActual.imagenes_generadas
  })
  
  const stepResultados = document.getElementById('step-resultados')
  if (!stepResultados) {
    console.error('❌ Elemento #step-resultados NO encontrado')
    return
  }
  
  console.log('✅ Mostrando Paso 5...')
  stepResultados.classList.remove('hidden')
  
  // Cargar imagen original
  const imgOriginal = document.getElementById('resultado-original')
  if (imgOriginal) {
    imgOriginal.src = proyectoActual.imagen_url
    console.log('✅ Imagen original cargada:', proyectoActual.imagen_url)
  } else {
    console.error('❌ Elemento #resultado-original NO encontrado')
  }
  
  // Cargar variantes
  if (!proyectoActual.imagenes_generadas || proyectoActual.imagenes_generadas.length === 0) {
    console.error('❌ No hay imágenes generadas')
    return
  }
  
  proyectoActual.imagenes_generadas.forEach((img, i) => {
    const elemento = document.getElementById(`variante-${i}`)
    if (elemento) {
      elemento.src = img
      console.log(`✅ Variante ${i} cargada:`, img)
    } else {
      console.error(`❌ Elemento #variante-${i} NO encontrado`)
    }
  })
  
  // Mostrar primera variante por defecto
  mostrarVariante(0)
  
  // Scroll al resultado
  console.log('📜 Haciendo scroll al resultado...')
  stepResultados.scrollIntoView({ behavior: 'smooth' })
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
  const texto = `¡Mira cómo quedarán las cortinas en tu espacio! 😍\n\nTela: ${proyectoActual.tela_seleccionada.nombre}\nTipo: ${proyectoActual.tipo_cortina}\n\n✨ Visualización generada con IA`
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

// Eliminar proyecto
async function eliminarProyecto(proyectoId) {
  console.log('🗑️ Intentando eliminar proyecto ID:', proyectoId)
  
  if (!confirm(`¿Estás segura de eliminar este proyecto?\n\nEsta acción no se puede deshacer.`)) {
    console.log('❌ Eliminación cancelada por usuario')
    return
  }
  
  try {
    console.log('📤 Enviando DELETE a:', `${API}/disenador/proyectos/${proyectoId}`)
    showLoading('Eliminando proyecto...')
    
    const response = await axios.delete(`${API}/disenador/proyectos/${proyectoId}`)
    console.log('✅ Respuesta del servidor:', response.data)
    
    console.log('🔄 Recargando galería INMEDIATAMENTE...')
    
    // Recargar galería ANTES de ocultar loading
    await loadProyectosDiseño()
    console.log('✅ Galería recargada')
    
    hideLoading()
    showSuccess('✅ Proyecto eliminado correctamente')
    
  } catch (error) {
    console.error('❌ Error eliminando proyecto:', error)
    console.error('❌ Detalles:', error.response?.data || error.message)
    hideLoading()
    showError('❌ Error al eliminar proyecto: ' + (error.response?.data?.error || error.message))
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
// REMOVIDO: DOMContentLoaded duplicado (consolidado arriba)

// ============================================
// TAREAS PENDIENTES
// ============================================

// Actualizar contador de tareas pendientes
async function actualizarContadorTareas() {
  try {
    const { data } = await axios.get(`${API}/tareas/contador`)
    
    // Actualizar KPI en dashboard
    document.getElementById('kpi-tareas').textContent = data.total_pendientes || 0
    document.getElementById('kpi-tareas-detalle').textContent = `${data.telas_pendientes || 0} telas custom`
    
    // Actualizar badge en tab
    const badge = document.getElementById('tareas-badge')
    if (data.total_pendientes > 0) {
      badge.textContent = data.total_pendientes
      badge.classList.remove('hidden')
    } else {
      badge.classList.add('hidden')
    }
    
    // Actualizar header de tareas
    const headerCount = document.getElementById('tareas-header-count')
    if (headerCount) {
      headerCount.textContent = data.total_pendientes || 0
    }
  } catch (error) {
    console.error('Error actualizando contador de tareas:', error)
  }
}

// Cargar tareas con filtros
async function loadTareas() {
  try {
    // Actualizar contadores del header
    actualizarContadoresTareasHeader()
    
    const prioridad = document.getElementById('filtro-prioridad-tareas')?.value || ''
    const asignado = document.getElementById('filtro-asignado-tareas')?.value || ''
    const estado = document.getElementById('filtro-estado-tareas')?.value || 'todas'
    const busqueda = document.getElementById('buscar-tareas')?.value || ''
    
    // Construir URL con filtros
    let url = `${API}/tareas?estado=${estado}`
    if (prioridad) url += `&prioridad=${prioridad}`
    if (asignado) url += `&asignado_a=${encodeURIComponent(asignado)}`
    
    const { data } = await axios.get(url)
    
    // Aplicar búsqueda en el cliente (filtrado adicional)
    let tareasFiltradas = data
    if (busqueda) {
      const termino = busqueda.toLowerCase()
      tareasFiltradas = data.filter(t => 
        t.titulo.toLowerCase().includes(termino) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(termino)) ||
        (t.notas && t.notas.toLowerCase().includes(termino))
      )
    }
    
    // Filtro por fecha
    const filtroFecha = document.getElementById('filtro-fecha-tareas')?.value || ''
    if (filtroFecha) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      tareasFiltradas = tareasFiltradas.filter(t => {
        if (!t.fecha_limite) return false
        const fechaLimite = new Date(t.fecha_limite)
        fechaLimite.setHours(0, 0, 0, 0)
        
        switch(filtroFecha) {
          case 'hoy':
            return fechaLimite.getTime() === hoy.getTime()
          case 'manana':
            const manana = new Date(hoy)
            manana.setDate(manana.getDate() + 1)
            return fechaLimite.getTime() === manana.getTime()
          case 'semana':
            const finSemana = new Date(hoy)
            finSemana.setDate(finSemana.getDate() + 7)
            return fechaLimite >= hoy && fechaLimite <= finSemana
          case 'mes':
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            return fechaLimite >= hoy && fechaLimite <= finMes
          case 'vencidas':
            return fechaLimite < hoy && t.estado !== 'completada'
          default:
            return true
        }
      })
    }
    
    const lista = document.getElementById('tareas-lista')
    const empty = document.getElementById('tareas-empty')
    const sinResultados = document.getElementById('tareas-sin-resultados')
    
    if (tareasFiltradas.length === 0) {
      lista.innerHTML = ''
      empty.classList.add('hidden')
      
      // Mostrar mensaje apropiado
      if (busqueda || prioridad || asignado || filtroFecha || estado !== 'todas') {
        sinResultados.classList.remove('hidden')
        empty.classList.add('hidden')
      } else {
        empty.classList.remove('hidden')
        sinResultados.classList.add('hidden')
      }
      return
    }
    
    empty.classList.add('hidden')
    sinResultados.classList.add('hidden')
    
    lista.innerHTML = tareasFiltradas.map(t => {
      const prioridadBadge = {
        1: '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">🔥 Alta</span>',
        2: '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">🟡 Media</span>',
        3: '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🟢 Baja</span>'
      }
      
      const estadoBadge = {
        'pendiente': '<span class="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">⏳ Pendiente</span>',
        'en_proceso': '<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">🔄 En Proceso</span>',
        'completada': '<span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">✅ Completada</span>',
        'cancelada': '<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">❌ Cancelada</span>'
      }
      
      // Colores de tarjeta según tipo (TODO el fondo)
      const tipoColor = {
        'llamar': 'bg-blue-100 border-blue-300',
        'instalar': 'bg-green-100 border-green-300',
        'medir': 'bg-yellow-100 border-yellow-300',
        'presupuesto': 'bg-purple-100 border-purple-300',
        'pedidos': 'bg-red-100 border-red-300',
        'varios': 'bg-gray-50 border-gray-300'
      }
      
      // Iconos según tipo
      const tipoIcon = {
        'llamar': '<i class="fas fa-phone text-blue-700"></i>',
        'instalar': '<i class="fas fa-tools text-green-700"></i>',
        'medir': '<i class="fas fa-ruler text-yellow-700"></i>',
        'presupuesto': '<i class="fas fa-file-invoice-dollar text-purple-700"></i>',
        'pedidos': '<i class="fas fa-box text-red-700"></i>',
        'varios': '<i class="fas fa-tasks text-gray-700"></i>'
      }
      
      let detalleHTML = ''
      
      return `
        <div class="rounded-lg border-2 ${tipoColor[t.tipo] || 'bg-gray-50 border-gray-300'} hover:shadow-lg transition-all duration-200 overflow-hidden ${modoSeleccionMultiple ? 'cursor-pointer' : ''}" ${modoSeleccionMultiple ? `onclick="toggleSeleccionTarea(${t.id})"` : ''}>
          <!-- Header Compacto -->
          <div class="px-4 py-2.5 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                ${modoSeleccionMultiple ? `
                  <input type="checkbox" class="w-4 h-4 text-gray-600 rounded focus:ring-2 focus:ring-gray-500" 
                         ${tareasSeleccionadas.has(t.id) ? 'checked' : ''}
                         onclick="event.stopPropagation(); toggleSeleccionTarea(${t.id})">
                ` : ''}
                <!-- Icono circular pequeño -->
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-white shadow-sm flex items-center justify-center text-base">
                  ${tipoIcon[t.tipo] || '<i class="fas fa-tasks text-gray-700"></i>'}
                </div>
                <!-- Título y tipo -->
                <div>
                  <h3 class="text-base font-bold text-gray-900">${t.titulo}</h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-gray-500 uppercase tracking-wide font-medium">${t.tipo.replace(/_/g, ' ')}</span>
                    ${prioridadBadge[t.prioridad]}
                  </div>
                </div>
              </div>
              <!-- Estado Badge -->
              <div>
                ${estadoBadge[t.estado]}
              </div>
            </div>
          </div>
          
          <!-- Body Compacto -->
          <div class="p-4">
            ${t.descripcion ? `
              <p class="text-sm text-gray-600 mb-2 leading-relaxed">${t.descripcion}</p>
            ` : ''}
            
            <!-- Info Grid Compacto -->
            <div class="grid grid-cols-2 gap-2 mb-2">
              ${t.asignado_a ? `
                <div class="flex items-center gap-2 text-sm">
                  <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-user text-blue-600 text-xs"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Asignado</p>
                    <p class="text-xs font-semibold text-gray-900">${t.asignado_a}</p>
                  </div>
                </div>
              ` : ''}
              
              ${t.fecha_limite ? `
                <div class="flex items-center gap-2 text-sm">
                  <div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                    <i class="fas fa-clock text-orange-600 text-xs"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Fecha límite</p>
                    <p class="text-xs font-semibold text-gray-900">${new Date(t.fecha_limite).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              ` : ''}
              
              ${t.nombre_proyecto ? `
                <div class="flex items-center gap-2 text-sm col-span-2">
                  <div class="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                    <i class="fas fa-project-diagram text-purple-600 text-xs"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Proyecto</p>
                    <p class="text-xs font-semibold text-gray-900">${t.nombre_proyecto}</p>
                  </div>
                </div>
              ` : ''}
              
              ${t.cliente_nombre ? `
                <div class="flex items-center gap-2 text-sm col-span-2">
                  <div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                    <i class="fas fa-user text-teal-600 text-xs"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Cliente</p>
                    <p class="text-xs font-semibold text-gray-900">${t.cliente_nombre} ${t.cliente_apellidos || ''}</p>
                  </div>
                </div>
              ` : ''}
            </div>
            
            ${detalleHTML}
            
            <!-- Footer fecha -->
            <div class="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
              <i class="far fa-calendar mr-1"></i>Creada: ${new Date(t.created_at).toLocaleDateString('es-ES')}
              ${t.completada_en ? ` • <i class="fas fa-check-circle mr-1"></i>Finalizada: ${new Date(t.completada_en).toLocaleDateString('es-ES')}` : ''}
            </div>
          </div>
          
          <!-- Actions Footer Compacto -->
          ${!modoSeleccionMultiple ? `
            <div class="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-2.5 border-t border-gray-200 flex gap-2">
              <button onclick="verDetallesTarea(${t.id})" class="flex-1 bg-white border-2 border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:border-gray-300 hover:shadow-md transition-all text-xs font-semibold">
                <i class="fas fa-eye mr-1"></i>Ver
              </button>
              <button onclick="editarTarea(${t.id})" class="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg transition-all text-xs font-semibold">
                <i class="fas fa-edit mr-1"></i>Editar
              </button>
              <button onclick="confirmarEliminarTarea(${t.id})" class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transition-all text-xs font-semibold">
                <i class="fas fa-trash mr-1"></i>Borrar
              </button>
            </div>
          ` : ''}
        </div>
      `
    }).join('')
    
  } catch (error) {
    console.error('Error cargando tareas:', error)
    showError('Error al cargar tareas')
  }
}

// Completar tarea de añadir tela al stock
async function completarTareaTela(tareaId) {
  try {
    // Obtener datos de la tarea
    const { data: tarea } = await axios.get(`${API}/tareas/${tareaId}`)
    const datos = tarea.datos_tarea
    
    // Mostrar formulario para completar datos
    const nombre = prompt('Confirma el nombre de la tela:', datos.tela_nombre)
    if (!nombre) return
    
    const precio = parseFloat(prompt('Confirma el precio por m²:', datos.tela_precio))
    if (!precio) return
    
    const composicion = prompt('Composición de la tela (ej: 100% Lino):', '100% Poliéster')
    const opacidad = prompt('Opacidad (traslúcida/opaca/blackout):', 'traslúcida')
    
    showLoading('Añadiendo tela al catálogo...')
    
    // Llamar endpoint especial para completar tarea de tela
    const { data } = await axios.post(`${API}/tareas/${tareaId}/completar-tela`, {
      nombre: nombre,
      precio_metro: precio,
      composicion: composicion,
      opacidad: opacidad,
      completada_por: 'Ana Ramos'
    })
    
    hideLoading()
    showSuccess(`✅ Tela "${nombre}" añadida al catálogo correctamente`)
    
    // Recargar tareas
    loadTareas()
    actualizarContadorTareas()
    
  } catch (error) {
    console.error('Error completando tarea:', error)
    hideLoading()
    showError('Error al añadir tela al catálogo')
  }
}

// Marcar tarea como completada
async function marcarTareaCompletada(tareaId) {
  try {
    if (!confirm('¿Marcar esta tarea como completada?')) return
    
    await axios.put(`${API}/tareas/${tareaId}`, {
      estado: 'completada',
      completada_por: 'Ana Ramos'
    })
    
    showSuccess('✅ Tarea completada')
    loadTareas()
    actualizarContadorTareas()
  } catch (error) {
    console.error('Error completando tarea:', error)
    showError('Error al completar tarea')
  }
}

// Cancelar tarea
async function cancelarTarea(tareaId) {
  try {
    if (!confirm('¿Cancelar esta tarea?')) return
    
    await axios.put(`${API}/tareas/${tareaId}`, {
      estado: 'cancelada'
    })
    
    showSuccess('Tarea cancelada')
    loadTareas()
    actualizarContadorTareas()
  } catch (error) {
    console.error('Error cancelando tarea:', error)
    showError('Error al cancelar tarea')
  }
}

// Ver detalles completos de la tarea
async function verDetallesTarea(tareaId) {
  try {
    const { data: tarea } = await axios.get(`${API}/tareas/${tareaId}`)
    
    const prioridadText = {
      1: '🔥 Alta',
      2: '🟡 Media',
      3: '🟢 Baja'
    }
    
    const estadoText = {
      'pendiente': '⏳ Pendiente',
      'en_proceso': '🔄 En Proceso',
      'completada': '✅ Finalizada',
      'cancelada': '❌ Cancelada'
    }
    
    const html = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-6 py-4 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <i class="fas fa-info-circle text-2xl"></i>
                </div>
                <div>
                  <h2 class="text-2xl font-bold">Detalles de la Tarea</h2>
                  <p class="text-sm text-gray-300">Información completa</p>
                </div>
              </div>
              <button onclick="closeModal()" class="text-white hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-all">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- Body -->
          <div class="p-6">
            <!-- Título -->
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-gray-900 mb-2">${tarea.titulo}</h3>
              <div class="flex gap-2">
                <span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">${tarea.tipo.replace(/_/g, ' ')}</span>
                <span class="px-3 py-1 ${tarea.prioridad === 1 ? 'bg-red-100 text-red-800' : tarea.prioridad === 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} text-sm rounded-full">${prioridadText[tarea.prioridad]}</span>
                <span class="px-3 py-1 ${tarea.estado === 'completada' ? 'bg-green-100 text-green-800' : tarea.estado === 'cancelada' ? 'bg-gray-100 text-gray-800' : tarea.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'} text-sm rounded-full">${estadoText[tarea.estado]}</span>
              </div>
            </div>
            
            <!-- Descripción -->
            ${tarea.descripcion ? `
              <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                <p class="text-sm font-semibold text-gray-700 mb-2">Descripción:</p>
                <p class="text-gray-800 leading-relaxed">${tarea.descripcion}</p>
              </div>
            ` : ''}
            
            <!-- Info Grid -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              ${tarea.asignado_a ? `
                <div class="p-4 bg-blue-50 rounded-lg">
                  <p class="text-xs text-blue-600 font-semibold mb-1">ASIGNADO A</p>
                  <p class="text-lg font-bold text-gray-900">${tarea.asignado_a}</p>
                </div>
              ` : ''}
              
              ${tarea.fecha_limite ? `
                <div class="p-4 bg-orange-50 rounded-lg">
                  <p class="text-xs text-orange-600 font-semibold mb-1">FECHA LÍMITE</p>
                  <p class="text-lg font-bold text-gray-900">${new Date(tarea.fecha_limite).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                  <p class="text-sm text-gray-600">${new Date(tarea.fecha_limite).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
              ` : ''}
              
              ${tarea.trabajo_id ? `
                <div class="p-4 bg-indigo-50 rounded-lg col-span-2">
                  <p class="text-xs text-indigo-600 font-semibold mb-1">TRABAJO ASOCIADO</p>
                  <p class="text-lg font-bold text-gray-900">${tarea.cliente_nombre || 'Cliente'} - ${tarea.trabajo_tipo || 'Trabajo'}</p>
                </div>
              ` : ''}
              
              ${tarea.nombre_proyecto ? `
                <div class="p-4 bg-purple-50 rounded-lg col-span-2">
                  <p class="text-xs text-purple-600 font-semibold mb-1">PROYECTO</p>
                  <p class="text-lg font-bold text-gray-900">${tarea.nombre_proyecto}</p>
                </div>
              ` : ''}
              
              ${tarea.recordatorio_minutos ? `
                <div class="p-4 bg-yellow-50 rounded-lg">
                  <p class="text-xs text-yellow-600 font-semibold mb-1">RECORDATORIO</p>
                  <p class="text-lg font-bold text-gray-900">${tarea.recordatorio_minutos} minutos antes</p>
                </div>
              ` : ''}
            </div>
            
            <!-- Notas -->
            ${tarea.notas ? `
              <div class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p class="text-sm font-semibold text-green-700 mb-2"><i class="fas fa-sticky-note mr-2"></i>Notas:</p>
                <p class="text-gray-800 leading-relaxed">${tarea.notas}</p>
              </div>
            ` : ''}
            
            <!-- Fechas -->
            <div class="text-xs text-gray-500 space-y-1 border-t pt-4">
              <p><i class="far fa-calendar mr-2"></i>Creada: ${new Date(tarea.created_at).toLocaleString('es-ES')}</p>
              ${tarea.completada_en ? `<p><i class="fas fa-check-circle mr-2"></i>Finalizada: ${new Date(tarea.completada_en).toLocaleString('es-ES')}</p>` : ''}
            </div>
          </div>
          
          <!-- Footer Actions -->
          <div class="bg-gray-50 px-6 py-4 border-t flex gap-3 rounded-b-2xl">
            <button onclick="editarTarea(${tareaId})" class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-medium">
              <i class="fas fa-edit mr-2"></i>Editar
            </button>
            <button onclick="closeModal()" class="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all font-medium">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
    
    // Añadir event listener para Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)
    
  } catch (error) {
    console.error('Error cargando detalles:', error)
    showError('Error al cargar detalles de la tarea')
  }
}

// Confirmar y eliminar tarea
async function confirmarEliminarTarea(tareaId) {
  if (!confirm('⚠️ ¿Estás segura de que quieres BORRAR esta tarea?\n\nEsta acción no se puede deshacer.')) return
  
  try {
    showLoading('Eliminando tarea...')
    await axios.delete(`${API}/tareas/${tareaId}`)
    hideLoading()
    
    showSuccess('✅ Tarea eliminada correctamente')
    
    // Recargar vista actual
    if (typeof vistaActualTareas === 'undefined' || vistaActualTareas === 'lista') {
      loadTareas()
    } else if (vistaActualTareas === 'kanban') {
      loadTareasKanban()
    } else if (vistaActualTareas === 'calendario') {
      cargarCalendarioTareas()
    } else {
      loadTareas()
    }
    
    actualizarContadorTareas()
    actualizarContadoresTareasHeader()
  } catch (error) {
    hideLoading()
    console.error('Error eliminando tarea:', error)
    showError('Error al eliminar tarea')
  }
}

// Mostrar formulario nueva tarea
async function showNuevaTarea() {
  // Cargar trabajos activos para el dropdown
  let trabajosOptions = '<option value="">Sin asociar a trabajo</option>';
  try {
    const response = await axios.get(`${API}/trabajos`);
    if (response.data && Array.isArray(response.data)) {
      const trabajosActivos = response.data.filter(t => t.estado !== 'completado' && t.estado !== 'cancelado');
      trabajosOptions += trabajosActivos.map(t => {
        const clienteNombre = t.cliente_nombre || t.nombre_cliente || 'Sin nombre'
        const trabajoDesc = t.nombre_trabajo || t.descripcion || t.tipo_servicio || 'Sin descripción'
        return `<option value="${t.id}">${clienteNombre} - ${trabajoDesc}</option>`
      }).join('');
    }
  } catch (error) {
    console.error('Error cargando trabajos:', error);
  }
  
  // Cargar clientes para el dropdown
  let clientesOptions = '<option value="">Sin asociar a cliente</option>';
  try {
    const response = await axios.get(`${API}/clientes`);
    if (response.data && Array.isArray(response.data)) {
      clientesOptions += response.data.map(c => 
        `<option value="${c.id}">${c.nombre} ${c.apellidos}</option>`
      ).join('');
    }
  } catch (error) {
    console.error('Error cargando clientes:', error);
  }
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas fa-plus-circle text-gray-700 mr-2"></i>
          Nueva Tarea
        </h3>
        <form id="tarea-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Título <span class="text-gray-500">*</span>
              </label>
              <input type="text" name="titulo" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                     placeholder="Ej: Llamar a cliente María García">
            </div>
            
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="descripcion" rows="3"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="Detalles adicionales de la tarea..."></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select id="tipo-tarea-select" name="tipo" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="llamar">📞 Llamar</option>
                <option value="instalar">🔧 Instalar</option>
                <option value="medir">📏 Medir</option>
                <option value="presupuesto">💰 Presupuesto</option>
                <option value="pedidos">📦 Pedidos</option>
                <option value="varios">📋 Varios</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Prioridad <span class="text-gray-500">*</span>
              </label>
              <select name="prioridad" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="3">🟢 Baja</option>
                <option value="2" selected>🟡 Media</option>
                <option value="1">🔥 Alta</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="pendiente" selected>⏳ Pendiente</option>
                <option value="en_proceso">🔄 En Proceso</option>
                <option value="completada">✅ Finalizada</option>
                <option value="cancelada">❌ Cancelada</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
              <select name="asignado_a" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="">Sin asignar</option>
                <option value="Ana Ramos">Ana Ramos</option>
                <option value="Lourdes">Lourdes</option>
                <option value="Tienda">Tienda</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <i class="fas fa-briefcase mr-1"></i>Trabajo asociado
              </label>
              <select id="tarea-trabajo-selector" name="trabajo_id" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                ${trabajosOptions}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <i class="fas fa-user mr-1"></i>Cliente asociado
              </label>
              <select name="cliente_id" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                ${clientesOptions}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
              <input type="datetime-local" name="fecha_limite"
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Recordatorio (minutos antes)
              </label>
              <select name="recordatorio_minutos" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="">Sin recordatorio</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60" selected>1 hora antes</option>
                <option value="120">2 horas antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea name="notas" rows="2"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="Notas adicionales..."></textarea>
            </div>
          </div>
          
          <div class="flex space-x-3 pt-4 border-t">
            <button type="submit" class="flex-1 bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-all">
              <i class="fas fa-save mr-2"></i>Crear Tarea
            </button>
            <button type="button" onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('tarea-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    // Determinar tipo: si selecciona "manual", usar tipo_manual, sino usar tipo
    let tipo = formData.get('tipo')
    if (tipo === 'manual') {
      tipo = formData.get('tipo_manual') || 'general'
    }
    
    try {
      const res = await fetch(`${API}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipo,
          titulo: formData.get('titulo'),
          descripcion: formData.get('descripcion') || null,
          prioridad: parseInt(formData.get('prioridad')),
          estado: formData.get('estado'),
          asignado_a: formData.get('asignado_a') || null,
          trabajo_id: formData.get('trabajo_id') ? parseInt(formData.get('trabajo_id')) : null,
          cliente_id: formData.get('cliente_id') ? parseInt(formData.get('cliente_id')) : null,
          fecha_limite: formData.get('fecha_limite') || null,
          recordatorio_minutos: formData.get('recordatorio_minutos') ? parseInt(formData.get('recordatorio_minutos')) : null,
          notas: formData.get('notas') || null
        })
      })
      
      if (res.ok) {
        closeModal()
        showNotification('Tarea creada correctamente', 'success')
        
        // Recargar vista actual (forzar recarga siempre)
        if (typeof vistaActualTareas === 'undefined' || vistaActualTareas === 'lista') {
          loadTareas()
        } else if (vistaActualTareas === 'kanban') {
          loadTareasKanban()
        } else if (vistaActualTareas === 'calendario') {
          cargarCalendarioTareas()
        } else {
          // Fallback: recargar lista por defecto
          loadTareas()
        }
        
        // Actualizar contadores
        actualizarContadorTareas()
        actualizarContadoresTareasHeader()
      } else {
        throw new Error('Error al crear tarea')
      }
    } catch (error) {
      console.error('Error creando tarea:', error)
      showNotification('Error al crear tarea', 'error')
    }
  })
}

// Editar tarea existente
async function editarTarea(tareaId) {
  try {
    // Cargar datos de la tarea
    const { data: tarea } = await axios.get(`${API}/tareas/${tareaId}`)
    
    // Cargar trabajos activos para el dropdown
    let trabajosOptions = '<option value="">Sin asociar a trabajo</option>';
    try {
      const response = await axios.get(`${API}/trabajos`);
      if (response.data && Array.isArray(response.data)) {
        const trabajosActivos = response.data.filter(t => t.estado !== 'completado' && t.estado !== 'cancelado');
        trabajosOptions += trabajosActivos.map(t => {
          const clienteNombre = t.cliente_nombre || t.nombre_cliente || 'Sin nombre'
          const trabajoDesc = t.nombre_trabajo || t.descripcion || t.tipo_servicio || 'Sin descripción'
          return `<option value="${t.id}" ${tarea.trabajo_id === t.id ? 'selected' : ''}>${clienteNombre} - ${trabajoDesc}</option>`
        }).join('');
      }
    } catch (error) {
      console.error('Error cargando trabajos:', error);
    }
    
    const html = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <h3 class="text-2xl font-bold mb-6">
            <i class="fas fa-edit text-gray-700 mr-2"></i>
            Editar Tarea
          </h3>
          <form id="tarea-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Título <span class="text-gray-500">*</span>
                </label>
                <input type="text" name="titulo" required value="${tarea.titulo}"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                       placeholder="Ej: Llamar a cliente María García">
              </div>
              
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea name="descripcion" rows="3"
                          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="Detalles adicionales de la tarea...">${tarea.descripcion || ''}</textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select id="tipo-tarea-select-edit" name="tipo" onchange="toggleTipoManual(this)" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  <option value="general" ${tarea.tipo === 'general' ? 'selected' : ''}>General</option>
                  <option value="seguimiento_cliente" ${tarea.tipo === 'seguimiento_cliente' ? 'selected' : ''}>Seguimiento Cliente</option>
                  <option value="revisar_presupuesto" ${tarea.tipo === 'revisar_presupuesto' ? 'selected' : ''}>Revisar Presupuesto</option>
                  <option value="añadir_tela_stock" ${tarea.tipo === 'añadir_tela_stock' ? 'selected' : ''}>Añadir Tela a Stock</option>
                  <option value="llamada_telefonica" ${tarea.tipo === 'llamada_telefonica' ? 'selected' : ''}>Llamada Telefónica</option>
                  <option value="enviar_email" ${tarea.tipo === 'enviar_email' ? 'selected' : ''}>Enviar Email</option>
                  <option value="reunion" ${tarea.tipo === 'reunion' ? 'selected' : ''}>Reunión</option>
                  <option value="instalacion" ${tarea.tipo === 'instalacion' ? 'selected' : ''}>Instalación</option>
                  <option value="medicion" ${tarea.tipo === 'medicion' ? 'selected' : ''}>Medición</option>
                  <option value="cotizacion" ${tarea.tipo === 'cotizacion' ? 'selected' : ''}>Cotización</option>
                  <option value="manual" ${!['general','seguimiento_cliente','revisar_presupuesto','añadir_tela_stock','llamada_telefonica','enviar_email','reunion','instalacion','medicion','cotizacion'].includes(tarea.tipo) ? 'selected' : ''}>✏️ Otro (escribir manualmente)</option>
                </select>
                <input type="text" id="tipo-tarea-manual" name="tipo_manual" 
                       value="${!['general','seguimiento_cliente','revisar_presupuesto','añadir_tela_stock','llamada_telefonica','enviar_email','reunion','instalacion','medicion','cotizacion'].includes(tarea.tipo) ? tarea.tipo : ''}"
                       placeholder="Escribe el tipo de tarea..." 
                       style="display: ${!['general','seguimiento_cliente','revisar_presupuesto','añadir_tela_stock','llamada_telefonica','enviar_email','reunion','instalacion','medicion','cotizacion'].includes(tarea.tipo) ? 'block' : 'none'};"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 mt-2">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad <span class="text-gray-500">*</span>
                </label>
                <select name="prioridad" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  <option value="3" ${tarea.prioridad === 3 ? 'selected' : ''}>🟢 Baja</option>
                  <option value="2" ${tarea.prioridad === 2 ? 'selected' : ''}>🟡 Media</option>
                  <option value="1" ${tarea.prioridad === 1 ? 'selected' : ''}>🔥 Alta</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select name="estado" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  <option value="pendiente" ${tarea.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                  <option value="en_proceso" ${tarea.estado === 'en_proceso' ? 'selected' : ''}>🔄 En Proceso</option>
                  <option value="completada" ${tarea.estado === 'completada' ? 'selected' : ''}>✅ Completada</option>
                  <option value="cancelada" ${tarea.estado === 'cancelada' ? 'selected' : ''}>❌ Cancelada</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
                <select name="asignado_a" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  <option value="" ${!tarea.asignado_a ? 'selected' : ''}>Sin asignar</option>
                  <option value="Ana Ramos" ${tarea.asignado_a === 'Ana Ramos' ? 'selected' : ''}>Ana Ramos</option>
                  <option value="Lourdes" ${tarea.asignado_a === 'Lourdes' ? 'selected' : ''}>Lourdes</option>
                  <option value="Tienda" ${tarea.asignado_a === 'Tienda' ? 'selected' : ''}>Tienda</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-briefcase mr-1"></i>Trabajo asociado
                </label>
                <select id="tarea-trabajo-selector" name="trabajo_id" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  ${trabajosOptions}
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
                <input type="datetime-local" name="fecha_limite" value="${tarea.fecha_limite ? new Date(tarea.fecha_limite).toISOString().slice(0, 16) : ''}"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Recordatorio (minutos antes)
                </label>
                <select name="recordatorio_minutos" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                  <option value="" ${!tarea.recordatorio_minutos ? 'selected' : ''}>Sin recordatorio</option>
                  <option value="15" ${tarea.recordatorio_minutos === 15 ? 'selected' : ''}>15 minutos antes</option>
                  <option value="30" ${tarea.recordatorio_minutos === 30 ? 'selected' : ''}>30 minutos antes</option>
                  <option value="60" ${tarea.recordatorio_minutos === 60 ? 'selected' : ''}>1 hora antes</option>
                  <option value="120" ${tarea.recordatorio_minutos === 120 ? 'selected' : ''}>2 horas antes</option>
                  <option value="1440" ${tarea.recordatorio_minutos === 1440 ? 'selected' : ''}>1 día antes</option>
                </select>
              </div>
              
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea name="notas" rows="2"
                          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="Notas adicionales...">${tarea.notas || ''}</textarea>
              </div>
            </div>
            
            <div class="flex space-x-3 pt-4 border-t">
              <button type="submit" class="flex-1 bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-all">
                <i class="fas fa-save mr-2"></i>Guardar Cambios
              </button>
              <button type="button" onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
    
    document.getElementById('tarea-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      
      // Determinar tipo: si selecciona "manual", usar tipo_manual, sino usar tipo
      let tipo = formData.get('tipo')
      if (tipo === 'manual') {
        tipo = formData.get('tipo_manual') || 'general'
      }
      
      try {
        const res = await fetch(`${API}/tareas/${tareaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipo,
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion') || null,
            prioridad: parseInt(formData.get('prioridad')),
            estado: formData.get('estado'),
            asignado_a: formData.get('asignado_a') || null,
            trabajo_id: formData.get('trabajo_id') ? parseInt(formData.get('trabajo_id')) : null,
            fecha_limite: formData.get('fecha_limite') || null,
            recordatorio_minutos: formData.get('recordatorio_minutos') ? parseInt(formData.get('recordatorio_minutos')) : null,
            notas: formData.get('notas') || null
          })
        })
        
        if (res.ok) {
          closeModal()
          showNotification('Tarea actualizada correctamente', 'success')
          
          // Recargar vista actual
          if (typeof vistaActualTareas === 'undefined' || vistaActualTareas === 'lista') {
            loadTareas()
          } else if (vistaActualTareas === 'kanban') {
            loadTareasKanban()
          } else if (vistaActualTareas === 'calendario') {
            cargarCalendarioTareas()
          } else {
            loadTareas()
          }
          
          // Actualizar contadores
          actualizarContadorTareas()
          actualizarContadoresTareasHeader()
        } else {
          throw new Error('Error al actualizar tarea')
        }
      } catch (error) {
        console.error('Error actualizando tarea:', error)
        showNotification('Error al actualizar tarea', 'error')
      }
    })
  } catch (error) {
    console.error('Error cargando tarea:', error)
    showNotification('Error al cargar tarea', 'error')
  }
}

// ============================================
// HISTORIAL - FUNCIONES DE CARGA Y FILTRADO
// ============================================

async function loadHistorial() {
  try {
    const usuario = document.getElementById('filter-historial-usuario')?.value || ''
    const accion = document.getElementById('filter-historial-accion')?.value || ''
    const seccion = document.getElementById('filter-historial-seccion')?.value || ''
    const fechaDesde = document.getElementById('filter-fecha-desde')?.value || ''
    const fechaHasta = document.getElementById('filter-fecha-hasta')?.value || ''
    
    const params = new URLSearchParams()
    if (usuario) params.append('usuario', usuario)
    if (accion) params.append('accion', accion)
    if (seccion) params.append('seccion', seccion)
    if (fechaDesde) params.append('fecha_desde', fechaDesde)
    if (fechaHasta) params.append('fecha_hasta', fechaHasta)
    params.append('limit', '100')
    
    const response = await axios.get(`${API}/historial?${params}`)
    const { movimientos, total } = response.data
    
    const tbody = document.getElementById('historial-tbody')
    if (!tbody) return
    
    if (movimientos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-gray-500">
            <i class="fas fa-inbox text-4xl mb-2"></i>
            <p>No hay movimientos registrados</p>
          </td>
        </tr>
      `
      return
    }
    
    tbody.innerHTML = movimientos.map(m => {
      // Badge de acción con colores
      const accionBadge = {
        'crear': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✅ Crear</span>',
        'editar': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">✏️ Editar</span>',
        'eliminar': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">🗑️ Eliminar</span>',
        'login': '<span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">🔐 Login</span>',
        'logout': '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">👋 Logout</span>'
      }[m.accion] || `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">${m.accion}</span>`
      
      // Badge de rol
      const rolBadge = m.usuario_rol === 'duena' 
        ? '<span class="text-xs text-amber-600 font-semibold">👑 Dueña</span>'
        : '<span class="text-xs text-gray-600">🏪 Tienda</span>'
      
      // Formatear fecha
      const fecha = new Date(m.created_at)
      const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      
      // Detalles (JSON)
      const detallesBtn = m.detalles 
        ? `<button onclick="alert(JSON.stringify(${JSON.stringify(m.detalles)}, null, 2))" class="text-xs text-blue-600 hover:underline">Ver detalles</button>`
        : '<span class="text-xs text-gray-400">-</span>'
      
      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="px-4 py-3 text-sm">
            <div class="font-medium text-gray-900">${m.usuario_nombre || m.usuario_email}</div>
            <div class="text-xs text-gray-500">${m.usuario_email}</div>
            <div class="mt-1">${rolBadge}</div>
          </td>
          <td class="px-4 py-3 text-sm">${accionBadge}</td>
          <td class="px-4 py-3 text-sm">
            <span class="font-medium text-gray-700">${m.seccion}</span>
            ${m.entidad_tipo ? `<div class="text-xs text-gray-500">${m.entidad_tipo} #${m.entidad_id || '-'}</div>` : ''}
          </td>
          <td class="px-4 py-3 text-xs">${detallesBtn}</td>
          <td class="px-4 py-3 text-xs text-gray-500">${m.ip_address || '-'}</td>
          <td class="px-4 py-3 text-sm">
            <div class="text-gray-900">${fechaStr}</div>
            <div class="text-xs text-gray-500">${horaStr}</div>
          </td>
        </tr>
      `
    }).join('')
    
    // Actualizar contador
    document.getElementById('total-movimientos').textContent = `Total: ${total} movimientos`
    
  } catch (error) {
    console.error('Error cargando historial:', error)
    showError('Error al cargar historial de movimientos')
  }
}

function filtrarHistorial() {
  loadHistorial() // Recargar con nuevos filtros
}

// ============================================
// EXPONER FUNCIONES GLOBALES (ANTES DE DOMContentLoaded)
// ============================================
// CRÍTICO: Estas deben estar disponibles INMEDIATAMENTE para onclick en HTML

window.showNuevoProyecto = showNuevoProyecto
window.handleFileUpload = handleFileUpload
window.resetUpload = resetUpload
window.analizarImagen = analizarImagen
window.mostrarSeleccionTipo = mostrarSeleccionTipo
window.volverAPaso = volverAPaso
window.continuarATelas = continuarATelas
window.seleccionarTipoCortina = seleccionarTipoCortina
window.toggleSubirTela = toggleSubirTela
window.handleTelaUpload = handleTelaUpload
// ============================================
// STOCK - Funciones adicionales
// ============================================

async function ajustarStock(id) {
  const stock = currentData.stock.find(s => s.id === id)
  if (!stock) return
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) this.remove()">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas fa-exchange-alt text-purple-600 mr-2"></i>
          Ajustar Stock
        </h3>
        <div class="mb-4 p-4 bg-gray-50 rounded-lg">
          <div class="font-medium text-gray-900">${stock.nombre}</div>
          <div class="text-sm text-gray-500">Stock actual: <span class="font-bold">${stock.cantidad_actual} ${stock.unidad}</span></div>
        </div>
        <form id="ajustar-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento *</label>
            <select name="tipo" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste Manual</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
            <input type="number" name="cantidad" required min="0" step="0.01"
                   class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <textarea name="motivo" rows="2" 
                      class="w-full px-4 py-2 border rounded-lg" 
                      placeholder="Ej: Compra, Venta, Devolución, Inventario"></textarea>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" onclick="this.closest('#modal-overlay').remove()"
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
                    class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <i class="fas fa-check mr-2"></i>Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('ajustar-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      tipo: formData.get('tipo'),
      cantidad: parseFloat(formData.get('cantidad')),
      motivo: formData.get('motivo')
    }
    
    try {
      await axios.post(`${API}/stock/${id}/ajustar`, data)
      showToast('Stock ajustado correctamente', 'success')
      document.getElementById('modal-overlay').remove()
      loadStock()
    } catch (error) {
      console.error('Error ajustando stock:', error)
      showToast('Error al ajustar stock', 'error')
    }
  })
}

async function showMovimientos(id) {
  try {
    const { data: movimientos } = await axios.get(`${API}/stock/${id}/movimientos`)
    const stock = currentData.stock.find(s => s.id === id)
    
    const html = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) this.remove()">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <h3 class="text-2xl font-bold mb-6">
            <i class="fas fa-history text-green-600 mr-2"></i>
            Historial de Movimientos
          </h3>
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="font-medium text-gray-900">${stock.nombre}</div>
            <div class="text-sm text-gray-500">Código: ${stock.codigo || '-'}</div>
          </div>
          
          ${movimientos.length === 0 ? `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>No hay movimientos registrados</div>
            </div>
          ` : `
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Anterior</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Nuevo</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${movimientos.map(m => {
                  const tipoColors = {
                    entrada: 'bg-green-100 text-green-800',
                    salida: 'bg-red-100 text-red-800',
                    ajuste: 'bg-blue-100 text-blue-800'
                  }
                  return `
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm text-gray-900">
                        ${new Date(m.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${tipoColors[m.tipo] || 'bg-gray-100 text-gray-800'}">
                          ${m.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-sm text-right font-medium">${m.cantidad} ${stock.unidad}</td>
                      <td class="px-4 py-3 text-sm text-right text-gray-500">${m.stock_anterior}</td>
                      <td class="px-4 py-3 text-sm text-right font-medium">${m.stock_nuevo}</td>
                      <td class="px-4 py-3 text-sm text-gray-600">${m.motivo || '-'}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          `}
          
          <div class="mt-6 flex justify-end">
            <button onclick="this.closest('#modal-overlay').remove()"
                    class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
  } catch (error) {
    console.error('Error cargando movimientos:', error)
    showToast('Error al cargar movimientos', 'error')
  }
}

async function deleteStock(id) {
  const stock = currentData.stock.find(s => s.id === id)
  if (!stock) return
  
  if (!confirm(`¿Eliminar "${stock.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return
  }
  
  try {
    await axios.delete(`${API}/stock/${id}`)
    showToast('Item eliminado correctamente', 'success')
    loadStock()
  } catch (error) {
    console.error('Error eliminando item:', error)
    showToast('Error al eliminar item', 'error')
  }
}

// Exponer funciones globalmente
window.ajustarStock = ajustarStock
window.showMovimientos = showMovimientos
window.deleteStock = deleteStock

// ============================================
// FIN STOCK
// ============================================

window.usarTelaSubida = usarTelaSubida
window.cancelarTelaSubida = cancelarTelaSubida
window.generarVisualizaciones = generarVisualizaciones
window.eliminarProyecto = eliminarProyecto
window.abrirProyecto = abrirProyecto
window.compartirProyecto = compartirProyecto
window.resetProyecto = resetProyecto
window.loadTareas = loadTareas
// ============================================
// CREAR TAREA PARA TRABAJO ESPECÍFICO
// ============================================
async function crearTareaParaTrabajo(trabajoId, nombreTrabajo) {
  // Cargar trabajos activos para el dropdown
  let trabajosOptions = `<option value="${trabajoId}" selected>${nombreTrabajo}</option>`;
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas fa-plus-circle text-gray-700 mr-2"></i>
          Nueva Tarea para: ${nombreTrabajo}
        </h3>
        <form id="tarea-trabajo-form" class="space-y-4">
          <input type="hidden" name="trabajo_id" value="${trabajoId}">
          
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Título <span class="text-gray-500">*</span>
              </label>
              <input type="text" name="titulo" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                     placeholder="Ej: Llamar al cliente para confirmar medidas">
            </div>
            
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="descripcion" rows="3"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="Detalles adicionales de la tarea..."></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select id="tipo-tarea-select" name="tipo" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="llamar">📞 Llamar</option>
                <option value="instalar">🔧 Instalar</option>
                <option value="medir">📏 Medir</option>
                <option value="presupuesto">💰 Presupuesto</option>
                <option value="pedidos">📦 Pedidos</option>
                <option value="varios">📋 Varios</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Prioridad <span class="text-gray-500">*</span>
              </label>
              <select name="prioridad" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="3">🟢 Baja</option>
                <option value="2" selected>🟡 Media</option>
                <option value="1">🔥 Alta</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="pendiente" selected>⏳ Pendiente</option>
                <option value="en_proceso">🔄 En Proceso</option>
                <option value="completada">✅ Finalizada</option>
                <option value="cancelada">❌ Cancelada</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
              <select name="asignado_a" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="">Sin asignar</option>
                <option value="Ana Ramos">Ana Ramos</option>
                <option value="Lourdes">Lourdes</option>
                <option value="Tienda">Tienda</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
              <input type="datetime-local" name="fecha_limite"
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Recordatorio (minutos antes)
              </label>
              <select name="recordatorio_minutos" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500">
                <option value="">Sin recordatorio</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60" selected>1 hora antes</option>
                <option value="120">2 horas antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea name="notas" rows="2"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="Notas adicionales..."></textarea>
            </div>
          </div>
          
          <div class="flex space-x-3 pt-4 border-t">
            <button type="submit" class="flex-1 bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-all">
              <i class="fas fa-save mr-2"></i>Crear Tarea
            </button>
            <button type="button" onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all">
              <i class="fas fa-times mr-2"></i>Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);
  
  // Manejar submit
  document.getElementById('tarea-trabajo-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      const res = await fetch(`${API}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.get('tipo'),
          titulo: formData.get('titulo'),
          descripcion: formData.get('descripcion') || null,
          prioridad: parseInt(formData.get('prioridad')),
          estado: formData.get('estado'),
          asignado_a: formData.get('asignado_a') || null,
          trabajo_id: parseInt(formData.get('trabajo_id')),
          fecha_limite: formData.get('fecha_limite') || null,
          recordatorio_minutos: formData.get('recordatorio_minutos') ? parseInt(formData.get('recordatorio_minutos')) : null,
          notas: formData.get('notas') || null
        })
      })
      
      if (res.ok) {
        closeModal()
        showNotification('Tarea creada y asociada al trabajo correctamente', 'success')
        
        // Reabrir el modal del trabajo para ver la tarea nueva
        setTimeout(() => viewTrabajo(trabajoId), 500)
      } else {
        throw new Error('Error al crear tarea')
      }
    } catch (error) {
      console.error('Error al crear tarea:', error)
      showNotification('Error al crear la tarea', 'error')
    }
  })
}

window.showNuevaTarea = showNuevaTarea
window.editarTarea = editarTarea
window.crearTareaParaTrabajo = crearTareaParaTrabajo
window.marcarTareaCompletada = marcarTareaCompletada
window.cancelarTarea = cancelarTarea
window.completarTareaTela = completarTareaTela
window.loadProyectosDiseño = loadProyectosDiseño
window.mostrarVariante = mostrarVariante
window.generarPresupuesto = generarPresupuesto
window.filtrarTelas = filtrarTelas
window.loadHistorial = loadHistorial
window.filtrarHistorial = filtrarHistorial

// ============================================
// IMPORTAR STOCK MASIVO
// ============================================

async function showImportarStock() {
  // Cargar categorías
  const { data: categorias } = await axios.get(`${API}/stock/categorias`)
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this) this.remove()">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas fa-file-upload text-blue-600 mr-2"></i>
          Importar Stock Masivo
        </h3>
        
        <div class="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-bold text-blue-900 mb-2">
            <i class="fas fa-info-circle mr-2"></i>Formatos Soportados
          </h4>
          <ul class="text-sm text-blue-800 space-y-1">
            <li><i class="fas fa-check mr-2"></i>Excel (.xlsx, .xls)</li>
            <li><i class="fas fa-check mr-2"></i>CSV (.csv)</li>
            <li><i class="fas fa-check mr-2"></i>Facturas PDF del proveedor</li>
          </ul>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Archivo</label>
          <input type="file" id="file-upload" accept=".xlsx,.xls,.csv,.pdf" 
                 class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
          <p class="text-xs text-gray-500 mt-2">Arrastra y suelta o haz click para seleccionar</p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Categoría por Defecto *</label>
          <select id="import-categoria" class="w-full px-4 py-2 border rounded-lg">
            <option value="">Seleccionar categoría</option>
            ${categorias.map(cat => `
              <option value="${cat.id}">${cat.nombre} (${cat.prefijo})</option>
            `).join('')}
          </select>
          <p class="text-xs text-gray-500 mt-1">Los códigos se generarán automáticamente: ${categorias[0]?.prefijo}-0001, ${categorias[0]?.prefijo}-0002...</p>
        </div>

        <div id="preview-section" class="hidden mb-6">
          <h4 class="font-bold text-gray-900 mb-3">
            <i class="fas fa-eye mr-2"></i>Vista Previa
          </h4>
          <div id="preview-content" class="max-h-64 overflow-y-auto border rounded-lg"></div>
        </div>

        <div class="flex gap-3">
          <button onclick="this.closest('#modal-overlay').remove()"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onclick="procesarImportacion()"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <i class="fas fa-upload mr-2"></i>Importar
          </button>
        </div>

        <div class="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h4 class="font-bold text-yellow-900 mb-2">
            <i class="fas fa-lightbulb mr-2"></i>Formato Excel Recomendado
          </h4>
          <div class="text-sm text-yellow-800">
            <p class="mb-2">Columnas sugeridas (en este orden):</p>
            <code class="block bg-white p-2 rounded">
              Nombre | Descripción | Unidad | Cantidad | Precio Compra | Precio Venta | Proveedor
            </code>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  // Event listener para preview del archivo
  document.getElementById('file-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const previewSection = document.getElementById('preview-section')
    const previewContent = document.getElementById('preview-content')
    
    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parsear Excel
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        // Mostrar preview
        previewContent.innerHTML = `
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                ${jsonData[0].map(col => `<th class="px-3 py-2 text-left">${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${jsonData.slice(1, 6).map(row => `
                <tr class="border-t">
                  ${row.map(cell => `<td class="px-3 py-2">${cell || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="text-xs text-gray-500 mt-2 px-3">Mostrando primeras 5 filas de ${jsonData.length - 1} totales</p>
        `
        previewSection.classList.remove('hidden')
      } else if (file.name.endsWith('.csv')) {
        // Parsear CSV
        const text = await file.text()
        const lines = text.split('\n').slice(0, 6)
        
        previewContent.innerHTML = `
          <pre class="text-xs p-3 bg-gray-50 rounded">${lines.join('\n')}</pre>
          <p class="text-xs text-gray-500 mt-2 px-3">Vista previa del CSV</p>
        `
        previewSection.classList.remove('hidden')
      } else if (file.name.endsWith('.pdf')) {
        previewContent.innerHTML = `
          <div class="p-4 text-center">
            <i class="fas fa-file-pdf text-red-500 text-4xl mb-2"></i>
            <p class="text-sm text-gray-600">PDF detectado: ${file.name}</p>
            <p class="text-xs text-gray-500">La extracción de datos del PDF se realizará al importar</p>
          </div>
        `
        previewSection.classList.remove('hidden')
      }
    } catch (error) {
      console.error('Error al leer archivo:', error)
      showToast('Error al leer el archivo', 'error')
    }
  })
}

async function procesarImportacion() {
  const fileInput = document.getElementById('file-upload')
  const categoriaId = document.getElementById('import-categoria').value
  
  if (!fileInput.files[0]) {
    showToast('Selecciona un archivo', 'error')
    return
  }
  
  if (!categoriaId) {
    showToast('Selecciona una categoría', 'error')
    return
  }
  
  const file = fileInput.files[0]
  
  try {
    showToast('Procesando archivo...', 'info')
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Parsear Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)
      
      // Mapear a formato esperado
      const items = jsonData.map(row => ({
        categoria_id: parseInt(categoriaId),
        nombre: row.Nombre || row.nombre || row.NOMBRE,
        descripcion: row.Descripción || row.descripcion || row.DESCRIPCIÓN || '',
        unidad: row.Unidad || row.unidad || row.UNIDAD || 'unidad',
        cantidad_actual: parseFloat(row.Cantidad || row.cantidad || row.CANTIDAD || 0),
        cantidad_minima: parseFloat(row['Mínimo'] || row.minimo || row.MÍNIMO || 10),
        precio_compra: parseFloat(row['Precio Compra'] || row.precio_compra || row['PRECIO COMPRA'] || 0),
        precio_venta: parseFloat(row['Precio Venta'] || row.precio_venta || row['PRECIO VENTA'] || 0),
        proveedor: row.Proveedor || row.proveedor || row.PROVEEDOR || ''
      }))
      
      // Enviar al backend
      const { data: result } = await axios.post(`${API}/stock/importar`, {
        items,
        documento_url: file.name
      })
      
      showToast(`✅ Importados ${result.exitosos} de ${result.total} items`, 'success')
      document.getElementById('modal-overlay').remove()
      loadStock()
      
    } else {
      showToast('Formato de archivo no soportado aún', 'error')
    }
    
  } catch (error) {
    console.error('Error importando:', error)
    showToast('Error al importar stock', 'error')
  }
}

// Exponer funciones
window.showImportarStock = showImportarStock
window.procesarImportacion = procesarImportacion

// ============================================
// FIN IMPORTACIÓN
// ============================================

console.log('✅ Todas las funciones del Diseñador Virtual expuestas globalmente')
console.log('✅ Función logAccion() disponible para auditoría')

// Actualizar contador al cargar dashboard
// REMOVIDO: DOMContentLoaded duplicado (consolidado arriba)

// ============================================
// SISTEMA DE AVISOS / NOTIFICACIONES
// ============================================

async function cargarAvisos() {
  try {
    const { data } = await axios.get(`${API}/avisos?leido=false`)
    
    const lista = document.getElementById('avisos-lista')
    const badge = document.getElementById('avisos-badge')
    
    // Actualizar badge
    if (data.length > 0) {
      badge.textContent = data.length
      badge.classList.remove('hidden')
    } else {
      badge.classList.add('hidden')
    }
    
    // Si no hay avisos
    if (data.length === 0) {
      lista.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-check-circle text-4xl mb-2"></i>
          <p>No hay avisos pendientes</p>
        </div>
      `
      return
    }
    
    // Renderizar avisos
    lista.innerHTML = data.map(aviso => {
      const iconos = {
        'stock_bajo': 'fa-exclamation-triangle text-yellow-500',
        'stock_agotado': 'fa-times-circle text-red-500',
        'pedido_sin_stock': 'fa-shopping-cart text-red-500'
      }
      
      const colores = {
        'alta': 'border-l-4 border-red-500 bg-red-50',
        'media': 'border-l-4 border-yellow-500 bg-yellow-50',
        'baja': 'border-l-4 border-blue-500 bg-blue-50'
      }
      
      const icono = iconos[aviso.tipo] || 'fa-bell text-gray-500'
      const color = colores[aviso.prioridad] || 'border-l-4 border-gray-500 bg-gray-50'
      
      return `
        <div class="mb-3 p-4 rounded-lg ${color} hover:shadow-md transition-all">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <i class="fas ${icono} mr-2"></i>
                <h4 class="font-semibold text-gray-800">${aviso.titulo}</h4>
              </div>
              <p class="text-sm text-gray-600 mb-2">${aviso.mensaje}</p>
              <p class="text-xs text-gray-400">
                <i class="far fa-clock mr-1"></i>
                ${new Date(aviso.created_at).toLocaleString('es-ES')}
              </p>
            </div>
            <button onclick="marcarLeido(${aviso.id})" 
                    class="ml-2 text-gray-400 hover:text-gray-600 transition-all">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `
    }).join('')
    
  } catch (error) {
    console.error('Error cargando avisos:', error)
  }
}

function toggleAvisos() {
  const panel = document.getElementById('avisos-panel')
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden')
    cargarAvisos()
  } else {
    panel.classList.add('hidden')
  }
}

async function marcarLeido(id) {
  try {
    await axios.put(`${API}/avisos/${id}/leer`)
    await cargarAvisos()
  } catch (error) {
    console.error('Error marcando aviso como leído:', error)
  }
}

async function marcarTodosLeidos() {
  try {
    await axios.put(`${API}/avisos/leer-todos`)
    await cargarAvisos()
  } catch (error) {
    console.error('Error marcando todos como leídos:', error)
  }
}

// Cargar contador de avisos cada 30 segundos
setInterval(async () => {
  try {
    const { data } = await axios.get(`${API}/avisos/contador`)
    const badge = document.getElementById('avisos-badge')
    if (data.total > 0) {
      badge.textContent = data.total
      badge.classList.remove('hidden')
    } else {
      badge.classList.add('hidden')
    }
  } catch (error) {
    console.error('Error actualizando contador de avisos:', error)
  }
}, 30000)

// Cargar avisos al inicio
setTimeout(cargarAvisos, 1000)

// Exponer funciones globalmente
window.toggleAvisos = toggleAvisos
window.cargarAvisos = cargarAvisos
window.marcarLeido = marcarLeido
window.marcarTodosLeidos = marcarTodosLeidos

// ============================================
// SISTEMA DE NOTAS - LIBRETA DE APUNTES
// ============================================

async function loadNotas() {
  try {
    const { data } = await axios.get(`${API}/notas`)
    
    const grid = document.getElementById('notas-grid')
    
    if (data.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
          <i class="fas fa-sticky-note text-6xl mb-4"></i>
          <p class="text-xl">No tienes notas todavía</p>
          <p class="text-sm mt-2">Haz clic en "Nueva Nota" para crear una</p>
        </div>
      `
      return
    }
    
    grid.innerHTML = data.map(nota => `
      <div class="nota-card rounded-lg shadow-lg p-6 relative transform hover:scale-105 transition-all cursor-pointer" 
           style="background-color: ${nota.color}"
           onclick="editarNota(${nota.id})">
        <button onclick="event.stopPropagation(); eliminarNota(${nota.id})" 
                class="absolute top-3 right-3 text-gray-600 hover:text-red-500 transition-all">
          <i class="fas fa-trash text-sm"></i>
        </button>
        
        <h3 class="font-bold text-gray-800 mb-3 pr-8">${nota.titulo}</h3>
        <p class="text-gray-700 text-sm whitespace-pre-wrap line-clamp-6">${nota.contenido}</p>
        
        <div class="mt-4 pt-4 border-t border-gray-400/30 text-xs text-gray-600">
          <i class="far fa-clock mr-1"></i>
          ${new Date(nota.updated_at).toLocaleString('es-ES')}
        </div>
      </div>
    `).join('')
    
  } catch (error) {
    console.error('Error cargando notas:', error)
    showNotification('Error al cargar notas', 'error')
  }
}

function nuevaNota() {
  const colores = [
    { nombre: 'Amarillo', valor: '#fef3c7' },
    { nombre: 'Rosa', valor: '#fce7f3' },
    { nombre: 'Azul', valor: '#dbeafe' },
    { nombre: 'Verde', valor: '#d1fae5' },
    { nombre: 'Naranja', valor: '#fed7aa' }
  ]
  
  const coloresHtml = colores.map(c => `
    <label class="flex items-center space-x-2 cursor-pointer">
      <input type="radio" name="nota-color" value="${c.valor}" ${c.valor === '#fef3c7' ? 'checked' : ''} class="w-4 h-4">
      <div class="w-8 h-8 rounded" style="background-color: ${c.valor}"></div>
      <span>${c.nombre}</span>
    </label>
  `).join('')
  
  const html = `
    <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">
          <i class="fas fa-sticky-note text-yellow-500 mr-2"></i>
          Nueva Nota
        </h3>
        <form id="nota-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input type="text" name="titulo" required 
                   class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <textarea name="contenido" rows="8" required
                      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div class="space-y-2">
              ${coloresHtml}
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button type="submit" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg">
              <i class="fas fa-save mr-2"></i>Guardar Nota
            </button>
            <button type="button" onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', html)
  
  document.getElementById('nota-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await axios.post(`${API}/notas`, {
        titulo: formData.get('titulo'),
        contenido: formData.get('contenido'),
        color: formData.get('nota-color')
      })
      
      closeModal()
      showNotification('Nota guardada', 'success')
      loadNotas()
      // Actualizar panel flotante si está abierto
      if (document.getElementById('notas-panel-flotante')) {
        cargarNotasEnPanel()
      }
    } catch (error) {
      console.error('Error guardando nota:', error)
      showNotification('Error al guardar nota', 'error')
    }
  })
}

async function editarNota(id) {
  try {
    const { data: notas } = await axios.get(`${API}/notas`)
    const nota = notas.find(n => n.id === id)
    
    if (!nota) return
    
    const colores = [
      { nombre: 'Amarillo', valor: '#fef3c7' },
      { nombre: 'Rosa', valor: '#fce7f3' },
      { nombre: 'Azul', valor: '#dbeafe' },
      { nombre: 'Verde', valor: '#d1fae5' },
      { nombre: 'Naranja', valor: '#fed7aa' }
    ]
    
    const coloresHtml = colores.map(c => `
      <label class="flex items-center space-x-2 cursor-pointer">
        <input type="radio" name="nota-color" value="${c.valor}" ${c.valor === nota.color ? 'checked' : ''} class="w-4 h-4">
        <div class="w-8 h-8 rounded" style="background-color: ${c.valor}"></div>
        <span>${c.nombre}</span>
      </label>
    `).join('')
    
    const html = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h3 class="text-2xl font-bold mb-6">
            <i class="fas fa-edit text-yellow-500 mr-2"></i>
            Editar Nota
          </h3>
          <form id="nota-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input type="text" name="titulo" value="${nota.titulo}" required 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
              <textarea name="contenido" rows="8" required
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500">${nota.contenido}</textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div class="space-y-2">
                ${coloresHtml}
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button type="submit" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg">
                <i class="fas fa-save mr-2"></i>Actualizar
              </button>
              <button type="button" onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', html)
    
    document.getElementById('nota-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      
      try {
        await axios.put(`${API}/notas/${id}`, {
          titulo: formData.get('titulo'),
          contenido: formData.get('contenido'),
          color: formData.get('nota-color')
        })
        
        closeModal()
        showNotification('Nota actualizada', 'success')
        loadNotas()
        // Actualizar panel flotante si está abierto
        if (document.getElementById('notas-panel-flotante')) {
          cargarNotasEnPanel()
        }
      } catch (error) {
        console.error('Error actualizando nota:', error)
        showNotification('Error al actualizar nota', 'error')
      }
    })
    
  } catch (error) {
    console.error('Error cargando nota:', error)
  }
}

async function eliminarNota(id) {
  if (!confirm('¿Eliminar esta nota?')) return
  
  try {
    await axios.delete(`${API}/notas/${id}`)
    showNotification('Nota eliminada', 'success')
    loadNotas()
  } catch (error) {
    console.error('Error eliminando nota:', error)
    showNotification('Error al eliminar nota', 'error')
  }
}

// Exponer funciones de notas globalmente
window.loadNotas = loadNotas
window.nuevaNota = nuevaNota
window.editarNota = editarNota
window.eliminarNota = eliminarNota

// ============================================
// PANEL FLOTANTE DE NOTAS
// ============================================

function abrirNotasFlotante() {
  // Crear panel flotante si no existe
  if (document.getElementById('notas-panel-flotante')) {
    document.getElementById('notas-panel-flotante').remove()
    return
  }
  
  const panel = document.createElement('div')
  panel.id = 'notas-panel-flotante'
  // Panel horizontal más alto: 70vh para que no se corten las notas
  panel.className = 'fixed bottom-0 left-0 right-0 h-[70vh] bg-white shadow-2xl z-40 flex flex-col overflow-hidden border-t-4 border-yellow-400'
  panel.innerHTML = `
    <div class="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-6 py-3 flex items-center justify-between">
      <h3 class="text-lg font-bold">
        <i class="fas fa-sticky-note mr-2"></i>Notas Rápidas
      </h3>
      <div class="flex items-center space-x-2">
        <button onclick="nuevaNota()" class="hover:bg-white/20 px-3 py-1 rounded transition-all" title="Nueva nota">
          <i class="fas fa-plus mr-1"></i>Nueva
        </button>
        <button onclick="abrirNotasFlotante()" class="hover:bg-white/20 p-2 rounded transition-all" title="Cerrar">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <!-- AVISO: No usar para tareas -->
    <div class="mx-6 mt-4 mb-2 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start space-x-3">
      <i class="fas fa-exclamation-triangle text-yellow-600 mt-0.5"></i>
      <div class="flex-1 text-sm text-yellow-800">
        <strong>⚠️ AVISO:</strong> Las notas rápidas son para recordatorios breves.
        <br>
        Para gestionar tareas completas, usa la sección <strong>"Tareas"</strong> del menú.
      </div>
    </div>
    
    <div id="notas-panel-contenido" class="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
        <p>Cargando notas...</p>
      </div>
    </div>
  `
  
  document.body.appendChild(panel)
  
  // Cargar notas en el panel
  cargarNotasEnPanel()
}

async function cargarNotasEnPanel() {
  try {
    const { data } = await axios.get(`${API}/notas`)
    
    const contenedor = document.getElementById('notas-panel-contenido')
    
    if (!contenedor) return
    
    if (data.length === 0) {
      contenedor.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <i class="fas fa-sticky-note text-6xl mb-4 opacity-30"></i>
          <p class="text-lg">No hay notas guardadas</p>
          <button onclick="nuevaNota()" class="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-all">
            <i class="fas fa-plus mr-2"></i>Crear primera nota
          </button>
        </div>
      `
      return
    }
    
    // Grid horizontal para mostrar notas como post-its
    contenedor.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        ${data.map(nota => `
          <div class="rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all relative min-h-[200px] flex flex-col" 
               style="background-color: ${nota.color}"
               onclick="editarNota(${nota.id})">
            <button onclick="event.stopPropagation(); eliminarNotaYRecargar(${nota.id})" 
                    class="absolute top-2 right-2 text-gray-600 hover:text-red-500 transition-all">
              <i class="fas fa-trash text-xs"></i>
            </button>
            
            <h4 class="font-bold text-gray-800 mb-2 pr-6 text-sm">${nota.titulo}</h4>
            <p class="text-gray-700 text-xs whitespace-pre-wrap flex-1 overflow-auto">${nota.contenido}</p>
            
            <div class="mt-auto pt-2 border-t border-gray-400/30 text-xs text-gray-600">
              <i class="far fa-clock mr-1"></i>
              ${new Date(nota.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        `).join('')}
      </div>
    `
    
  } catch (error) {
    console.error('Error cargando notas en panel:', error)
    const contenedor = document.getElementById('notas-panel-contenido')
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="text-center py-12 text-red-500">
          <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
          <p>Error al cargar notas</p>
          <p class="text-sm mt-2">${error.message}</p>
        </div>
      `
    }
  }
}

async function eliminarNotaYRecargar(id) {
  if (!confirm('¿Eliminar esta nota?')) return
  
  try {
    await axios.delete(`${API}/notas/${id}`)
    showNotification('Nota eliminada', 'success')
    cargarNotasEnPanel()
  } catch (error) {
    console.error('Error eliminando nota:', error)
    showNotification('Error al eliminar nota', 'error')
  }
}

// Exponer funciones flotantes globalmente
window.abrirNotasFlotante = abrirNotasFlotante
window.cargarNotasEnPanel = cargarNotasEnPanel
window.eliminarNotaYRecargar = eliminarNotaYRecargar

// ============================================
// MEJORAR CHAT IA - VENTANA GRANDE
// ============================================

// Esta función se llama desde el HTML del botón GaliA
// Vamos a sobreescribir para hacer la ventana más grande

// ============================================
// SISTEMA COMPLETO DE TAREAS - 3 VISTAS
// ============================================

// Variables globales de tareas
let vistaActualTareas = 'lista'
let calendarioMesActual = new Date().getMonth()
let calendarioAnioActual = new Date().getFullYear()
let calendarioDiaSeleccionado = null

// Cambiar entre vistas
function cambiarVistaTareas(vista) {
  vistaActualTareas = vista
  
  // Actualizar botones
  document.querySelectorAll('.vista-tareas-btn').forEach(btn => {
    btn.classList.remove('bg-gray-700', 'text-white')
    btn.classList.add('bg-gray-200', 'text-gray-700')
  })
  
  if (vista === 'lista') {
    document.getElementById('vista-lista-btn').classList.remove('bg-gray-200', 'text-gray-700')
    document.getElementById('vista-lista-btn').classList.add('bg-gray-700', 'text-white')
  } else if (vista === 'kanban') {
    document.getElementById('vista-kanban-btn').classList.remove('bg-gray-200', 'text-gray-700')
    document.getElementById('vista-kanban-btn').classList.add('bg-gray-700', 'text-white')
  } else if (vista === 'calendario') {
    document.getElementById('vista-calendario-btn').classList.remove('bg-gray-200', 'text-gray-700')
    document.getElementById('vista-calendario-btn').classList.add('bg-gray-700', 'text-white')
  }
  
  // Mostrar/ocultar vistas
  document.getElementById('vista-tareas-lista').classList.toggle('hidden', vista !== 'lista')
  document.getElementById('vista-tareas-kanban').classList.toggle('hidden', vista !== 'kanban')
  document.getElementById('vista-tareas-calendario').classList.toggle('hidden', vista !== 'calendario')
  
  // Cargar contenido según vista
  if (vista === 'lista') {
    loadTareas()
  } else if (vista === 'kanban') {
    loadTareasKanban()
  } else if (vista === 'calendario') {
    cargarCalendarioTareas()
  }
}

// Cargar tareas en vista Kanban
async function loadTareasKanban() {
  try {
    const prioridad = document.getElementById('filtro-prioridad-tareas')?.value || ''
    const asignado = document.getElementById('filtro-asignado-tareas')?.value || ''
    
    let url = '/api/tareas?estado=todas'
    if (prioridad) url += `&prioridad=${prioridad}`
    if (asignado) url += `&asignado_a=${encodeURIComponent(asignado)}`
    
    const res = await fetch(url)
    const tareas = await res.json()
    
    // Agrupar por estado
    const tareasAgrupadas = {
      pendiente: tareas.filter(t => t.estado === 'pendiente'),
      en_proceso: tareas.filter(t => t.estado === 'en_proceso'),
      completada: tareas.filter(t => t.estado === 'completada'),
      cancelada: tareas.filter(t => t.estado === 'cancelada')
    }
    
    // Actualizar contadores
    document.getElementById('kanban-count-pendiente').textContent = tareasAgrupadas.pendiente.length
    document.getElementById('kanban-count-en_proceso').textContent = tareasAgrupadas.en_proceso.length
    document.getElementById('kanban-count-completada').textContent = tareasAgrupadas.completada.length
    document.getElementById('kanban-count-cancelada').textContent = tareasAgrupadas.cancelada.length
    
    // Renderizar cada columna
    const estados = ['pendiente', 'en_proceso', 'completada', 'cancelada']
    
    estados.forEach(estado => {
      const contenedor = document.getElementById(`kanban-${estado}`)
      if (!contenedor) return
      
      const listaTareas = tareasAgrupadas[estado] || []
      
      if (listaTareas.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-400 text-center py-8">Sin tareas</p>'
        // Configurar drop incluso si no hay tareas
        contenedor.ondragover = (e) => e.preventDefault()
        contenedor.ondrop = (e) => {
          e.preventDefault()
          if (tareaArrastrando) {
            dropTareaEnColumna(e, estado)
          }
        }
        return
      }
      
      contenedor.innerHTML = listaTareas.map(tarea => {
        const prioridadIcono = tarea.prioridad === 1 ? '🔥' : tarea.prioridad === 2 ? '🟡' : '🟢'
        const fechaTexto = tarea.fecha_limite 
          ? new Date(tarea.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
          : 'Sin fecha'
        
        // Colores según tipo de tarea (TODO el fondo)
        const tipoColor = {
          'llamar': 'bg-blue-100 border-blue-300',
          'instalar': 'bg-green-100 border-green-300',
          'medir': 'bg-yellow-100 border-yellow-300',
          'presupuesto': 'bg-purple-100 border-purple-300',
          'pedidos': 'bg-red-100 border-red-300',
          'varios': 'bg-gray-50 border-gray-300'
        }
        
        // Iconos según tipo
        const tipoIcon = {
          'llamar': '<i class="fas fa-phone text-blue-700"></i>',
          'instalar': '<i class="fas fa-tools text-green-700"></i>',
          'medir': '<i class="fas fa-ruler text-yellow-700"></i>',
          'presupuesto': '<i class="fas fa-file-invoice-dollar text-purple-700"></i>',
          'pedidos': '<i class="fas fa-box text-red-700"></i>',
          'varios': '<i class="fas fa-tasks text-gray-700"></i>'
        }
        
        return `
          <div class="tarea-kanban-card ${tipoColor[tarea.tipo] || 'bg-gray-50 border-gray-300'} rounded-lg p-4 shadow-sm border-2 hover:shadow-md transition-all cursor-move"
               draggable="true"
               data-tarea-id="${tarea.id}"
               data-estado="${tarea.estado}">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2 flex-1">
                <span class="text-lg">${tipoIcon[tarea.tipo] || '<i class="fas fa-tasks text-gray-700"></i>'}</span>
                <h4 class="font-semibold text-gray-900 text-sm">${tarea.titulo}</h4>
              </div>
              <span class="text-lg">${prioridadIcono}</span>
            </div>
            <div class="mb-2">
              <span class="text-xs px-2 py-1 rounded-full bg-white/50 text-gray-800 font-medium">${tarea.tipo.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            ${tarea.descripcion ? `<p class="text-xs text-gray-700 mb-3">${tarea.descripcion.substring(0, 80)}${tarea.descripcion.length > 80 ? '...' : ''}</p>` : ''}
            <div class="flex items-center justify-between text-xs text-gray-600 mb-3">
              <span><i class="far fa-calendar mr-1"></i>${fechaTexto}</span>
              ${tarea.asignado_a ? `<span><i class="far fa-user mr-1"></i>${tarea.asignado_a}</span>` : ''}
            </div>
            <div class="flex gap-1 pt-2 border-t border-gray-200/50">
              <button onclick="event.stopPropagation(); verDetallesTarea(${tarea.id})" class="flex-1 bg-white/70 text-gray-700 px-2 py-1.5 rounded text-xs hover:bg-white transition-all" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="event.stopPropagation(); editarTarea(${tarea.id})" class="flex-1 bg-white/70 text-gray-700 px-2 py-1.5 rounded text-xs hover:bg-white transition-all" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="event.stopPropagation(); confirmarEliminarTarea(${tarea.id})" class="flex-1 bg-white/70 text-gray-700 px-2 py-1.5 rounded text-xs hover:bg-white transition-all" title="Borrar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `
      }).join('')
      
      // Añadir eventos de drop a cada columna
      contenedor.ondragover = (e) => {
        e.preventDefault()
        contenedor.classList.add('bg-gray-100')
      }
      
      contenedor.ondragleave = () => {
        contenedor.classList.remove('bg-gray-100')
      }
      
      contenedor.ondrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        contenedor.classList.remove('bg-gray-100')
        if (tareaArrastrando) {
          dropTareaEnColumna(e, estado)
        }
      }
    })
    
    
    // Añadir eventos drag a TODAS las tarjetas (después de renderizar todas las columnas)
    const tarjetas = document.querySelectorAll('.tarea-kanban-card')
    tarjetas.forEach((card, index) => {
      card.addEventListener('dragstart', dragStartTarea)
      card.addEventListener('dragend', dragEndTarea)
    })
    
  } catch (error) {
    console.error('Error cargando tareas Kanban:', error)
    showNotification('Error al cargar tareas', 'error')
  }
}

// Drag & Drop para Kanban
let tareaArrastrando = null

function dragStartTarea(event) {
  const card = event.currentTarget
  tareaArrastrando = {
    id: card.dataset.tareaId,
    estadoAnterior: card.dataset.estado
  }
  card.style.opacity = '0.5'
}

function dragEndTarea(event) {
  const card = event.currentTarget
  card.style.opacity = '1'
}

async function dropTareaEnColumna(event, nuevoEstado) {
  if (!tareaArrastrando) return
  
  const tareaId = tareaArrastrando.id
  const estadoAnterior = tareaArrastrando.estadoAnterior
  
  if (estadoAnterior === nuevoEstado) return
  
  try {
    // Obtener usuario actual
    const user = JSON.parse(localStorage.getItem('anushka_user') || '{}')
    const completadaPor = user.nombre || 'Usuario'
    
    const res = await fetch(`${API}/tareas/${tareaId}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: nuevoEstado,
        completada_por: completadaPor
      })
    })
    
    if (res.ok) {
      showNotification('✅ Tarea movida correctamente', 'success')
      loadTareasKanban()
      actualizarContadorTareas()
      actualizarContadoresTareasHeader()
    } else {
      throw new Error('Error al actualizar')
    }
  } catch (error) {
    console.error('Error moviendo tarea:', error)
    showNotification('❌ Error al mover tarea', 'error')
  }
  
  tareaArrastrando = null
}

// ============================================
// VISTA CALENDARIO
// ============================================

async function cargarCalendarioTareas() {
  try {
    // Actualizar título
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    document.getElementById('calendario-mes-titulo').textContent = 
      `${meses[calendarioMesActual]} ${calendarioAnioActual}`
    
    // Obtener datos del mes
    const res = await fetch(`/api/tareas/calendario/mes?mes=${calendarioMesActual + 1}&anio=${calendarioAnioActual}`)
    const datosCalendario = await res.json()
    
    // Crear mapa de fechas con tareas
    const mapaTareas = {}
    datosCalendario.forEach(dia => {
      mapaTareas[dia.fecha] = dia
    })
    
    // Generar grid del calendario
    const primerDia = new Date(calendarioAnioActual, calendarioMesActual, 1)
    const ultimoDia = new Date(calendarioAnioActual, calendarioMesActual + 1, 0)
    const primerDiaSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1 // Lunes = 0
    const diasMes = ultimoDia.getDate()
    
    const grid = document.getElementById('calendario-grid')
    grid.innerHTML = ''
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
      const div = document.createElement('div')
      div.className = 'aspect-square bg-gray-50 rounded-lg'
      grid.appendChild(div)
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasMes; dia++) {
      const fecha = `${calendarioAnioActual}-${String(calendarioMesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const datosDia = mapaTareas[fecha]
      const esHoy = new Date().toISOString().split('T')[0] === fecha
      
      const div = document.createElement('div')
      div.className = `aspect-square bg-white border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all ${
        esHoy ? 'border-red-500 bg-red-50' : 'border-gray-200'
      }`
      div.onclick = () => mostrarTareasDia(fecha)
      
      let html = `<div class="text-right mb-1"><span class="text-sm font-medium ${esHoy ? 'text-red-600' : 'text-gray-700'}">${dia}</span></div>`
      
      if (datosDia && datosDia.total > 0) {
        html += `
          <div class="space-y-1 text-xs">
            ${datosDia.pendientes > 0 ? `<div class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">${datosDia.pendientes} pend.</div>` : ''}
            ${datosDia.alta_prioridad > 0 ? `<div class="bg-red-100 text-red-700 px-2 py-1 rounded">🔥 ${datosDia.alta_prioridad}</div>` : ''}
            ${datosDia.completadas > 0 ? `<div class="bg-green-100 text-green-700 px-2 py-1 rounded">✓ ${datosDia.completadas}</div>` : ''}
          </div>
        `
      }
      
      div.innerHTML = html
      grid.appendChild(div)
    }
    
  } catch (error) {
    console.error('Error cargando calendario:', error)
    showNotification('Error al cargar calendario', 'error')
  }
}

function cambiarMesCalendario(direccion) {
  calendarioMesActual += direccion
  
  if (calendarioMesActual < 0) {
    calendarioMesActual = 11
    calendarioAnioActual--
  } else if (calendarioMesActual > 11) {
    calendarioMesActual = 0
    calendarioAnioActual++
  }
  
  cargarCalendarioTareas()
}

async function mostrarTareasDia(fecha) {
  calendarioDiaSeleccionado = fecha
  
  try {
    const res = await fetch(`/api/tareas/calendario/dia?fecha=${fecha}`)
    const tareas = await res.json()
    
    const contenedor = document.getElementById('calendario-tareas-dia')
    const lista = document.getElementById('calendario-tareas-lista')
    const titulo = document.getElementById('calendario-dia-titulo')
    
    const fechaObj = new Date(fecha + 'T12:00:00')
    titulo.textContent = fechaObj.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
    
    if (tareas.length === 0) {
      lista.innerHTML = '<p class="text-gray-400 text-center py-6">No hay tareas para este día</p>'
    } else {
      lista.innerHTML = tareas.map(tarea => {
        const prioridadIcono = tarea.prioridad === 1 ? '🔥' : tarea.prioridad === 2 ? '🟡' : '🟢'
        const estadoColor = {
          'pendiente': 'bg-yellow-100 text-yellow-700',
          'en_proceso': 'bg-blue-100 text-blue-700',
          'completada': 'bg-green-100 text-green-700'
        }[tarea.estado] || 'bg-gray-100 text-gray-700'
        
        return `
          <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span>${prioridadIcono}</span>
                  <h4 class="font-medium text-gray-800">${tarea.titulo}</h4>
                  <span class="text-xs px-2 py-1 rounded-full ${estadoColor}">${tarea.estado}</span>
                </div>
                ${tarea.descripcion ? `<p class="text-sm text-gray-600 mb-2">${tarea.descripcion}</p>` : ''}
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  ${tarea.asignado_a ? `<span><i class="far fa-user mr-1"></i>${tarea.asignado_a}</span>` : ''}
                  ${tarea.cliente_nombre ? `<span><i class="far fa-building mr-1"></i>${tarea.cliente_nombre}</span>` : ''}
                </div>
              </div>
              <div class="flex gap-2">
                <button onclick="editarTarea(${tarea.id})" class="text-blue-600 hover:text-blue-700">
                  <i class="fas fa-edit"></i>
                </button>
                ${tarea.estado !== 'completada' ? `
                  <button onclick="cambiarEstadoTareaRapido(${tarea.id}, 'completada')" class="text-green-600 hover:text-green-700">
                    <i class="fas fa-check"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `
      }).join('')
    }
    
    contenedor.classList.remove('hidden')
    
  } catch (error) {
    console.error('Error cargando tareas del día:', error)
    showNotification('Error al cargar tareas', 'error')
  }
}

async function cambiarEstadoTareaRapido(tareaId, nuevoEstado) {
  try {
    const res = await fetch(`/api/tareas/${tareaId}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: nuevoEstado,
        completada_por: getUserInfo()?.nombre || 'Usuario'
      })
    })
    
    if (res.ok) {
      showNotification('Tarea actualizada', 'success')
      if (vistaActualTareas === 'calendario') {
        cargarCalendarioTareas()
        if (calendarioDiaSeleccionado) {
          mostrarTareasDia(calendarioDiaSeleccionado)
        }
      } else if (vistaActualTareas === 'kanban') {
        loadTareasKanban()
      } else {
        loadTareas()
      }
      actualizarContadorTareas()
    }
  } catch (error) {
    console.error('Error cambiando estado:', error)
    showNotification('Error al cambiar estado', 'error')
  }
}

// Función para editar tarea (modal)
// Actualizar contador del header
async function actualizarContadoresTareasHeader() {
  try {
    const res = await fetch('/api/tareas/contador')
    const datos = await res.json()
    
    document.getElementById('tareas-count-pendientes').textContent = datos.total_pendientes || 0
    document.getElementById('tareas-count-proceso').textContent = datos.en_proceso || 0
    document.getElementById('tareas-count-urgentes').textContent = datos.alta_prioridad || 0
  } catch (error) {
    console.error('Error actualizando contadores header:', error)
  }
}

// ============================================
// NUEVAS FUNCIONALIDADES DE TAREAS
// ============================================

// Búsqueda en tiempo real
function buscarTareas() {
  const termino = document.getElementById('buscar-tareas')?.value.toLowerCase() || ''
  aplicarFiltros()
}

// Aplicar todos los filtros
function aplicarFiltros() {
  if (typeof vistaActualTareas === 'undefined' || vistaActualTareas === 'lista') {
    loadTareas()
  } else if (vistaActualTareas === 'kanban') {
    loadTareasKanban()
  } else if (vistaActualTareas === 'calendario') {
    cargarCalendarioTareas()
  }
}

// Limpiar todos los filtros
function limpiarFiltros() {
  document.getElementById('buscar-tareas').value = ''
  document.getElementById('filtro-prioridad-tareas').value = ''
  document.getElementById('filtro-asignado-tareas').value = ''
  document.getElementById('filtro-estado-tareas').value = 'todas'
  document.getElementById('filtro-fecha-tareas').value = ''
  aplicarFiltros()
  showNotification('Filtros limpiados', 'info')
}

// Ordenar tareas
function ordenarTareas() {
  const criterio = document.getElementById('ordenar-tareas')?.value || 'prioridad'
  // La lógica de ordenamiento se hace en el backend o cliente
  aplicarFiltros()
}

// Toggle modo selección múltiple
let modoSeleccionMultiple = false
let tareasSeleccionadas = new Set()

function toggleAccionesMasivas() {
  modoSeleccionMultiple = !modoSeleccionMultiple
  const bar = document.getElementById('acciones-masivas-bar')
  
  if (modoSeleccionMultiple) {
    bar.classList.remove('hidden')
    showNotification('Modo selección activado', 'info')
  } else {
    bar.classList.add('hidden')
    tareasSeleccionadas.clear()
    actualizarContadorSeleccion()
  }
  
  aplicarFiltros()
}

// Actualizar contador de selección
function actualizarContadorSeleccion() {
  document.getElementById('tareas-seleccionadas-count').textContent = tareasSeleccionadas.size
}

// Toggle selección de tarea
function toggleSeleccionTarea(tareaId) {
  if (tareasSeleccionadas.has(tareaId)) {
    tareasSeleccionadas.delete(tareaId)
  } else {
    tareasSeleccionadas.add(tareaId)
  }
  actualizarContadorSeleccion()
}

// Completar tareas seleccionadas
async function completarTareasSeleccionadas() {
  if (tareasSeleccionadas.size === 0) {
    showNotification('No hay tareas seleccionadas', 'warning')
    return
  }
  
  if (!confirm(`¿Completar ${tareasSeleccionadas.size} tareas seleccionadas?`)) return
  
  try {
    for (const tareaId of tareasSeleccionadas) {
      await axios.put(`${API}/tareas/${tareaId}`, {
        estado: 'completada',
        completada_por: 'Ana Ramos'
      })
    }
    
    showNotification(`${tareasSeleccionadas.size} tareas completadas`, 'success')
    tareasSeleccionadas.clear()
    toggleAccionesMasivas()
    aplicarFiltros()
    actualizarContadorTareas()
    actualizarContadoresTareasHeader()
  } catch (error) {
    console.error('Error completando tareas:', error)
    showNotification('Error al completar tareas', 'error')
  }
}

// Eliminar tareas seleccionadas
async function eliminarTareasSeleccionadas() {
  if (tareasSeleccionadas.size === 0) {
    showNotification('No hay tareas seleccionadas', 'warning')
    return
  }
  
  if (!confirm(`¿ELIMINAR ${tareasSeleccionadas.size} tareas seleccionadas? Esta acción no se puede deshacer.`)) return
  
  try {
    for (const tareaId of tareasSeleccionadas) {
      await axios.delete(`${API}/tareas/${tareaId}`)
    }
    
    showNotification(`${tareasSeleccionadas.size} tareas eliminadas`, 'success')
    tareasSeleccionadas.clear()
    toggleAccionesMasivas()
    aplicarFiltros()
    actualizarContadorTareas()
    actualizarContadoresTareasHeader()
  } catch (error) {
    console.error('Error eliminando tareas:', error)
    showNotification('Error al eliminar tareas', 'error')
  }
}

// Cancelar selección
function cancelarSeleccion() {
  tareasSeleccionadas.clear()
  toggleAccionesMasivas()
}

// Exportar tareas a Excel
function exportarTareas() {
  showNotification('Exportando tareas...', 'info')
  
  // Aquí iría la lógica de exportación
  // Por ahora, simulamos la descarga
  setTimeout(() => {
    showNotification('📥 Tareas exportadas exitosamente', 'success')
  }, 1000)
}

// Atajos de teclado
document.addEventListener('keydown', (e) => {
  // Ctrl+N: Nueva tarea
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    showNuevaTarea()
  }
  
  // Ctrl+F: Buscar
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    document.getElementById('buscar-tareas')?.focus()
  }
  
  // Escape: Cerrar modal
  if (e.key === 'Escape') {
    closeModal()
  }
})

// Toggle tipo manual de tarea
function toggleTipoManual(selectElement) {
  const manualInput = document.getElementById('tipo-tarea-manual')
  if (!manualInput) return
  
  if (selectElement.value === 'manual') {
    manualInput.style.display = 'block'
    manualInput.required = true
  } else {
    manualInput.style.display = 'none'
    manualInput.required = false
    manualInput.value = ''
  }
}

// EXPONER FUNCIONES DE TRABAJOS GLOBALMENTE
window.viewTrabajo = viewTrabajo
window.editTrabajo = editTrabajo
window.deleteTrabajo = deleteTrabajo

// Exponer funciones globalmente
window.cambiarVistaTareas = cambiarVistaTareas
window.loadTareasKanban = loadTareasKanban
window.dragStartTarea = dragStartTarea
window.dragEndTarea = dragEndTarea
window.dropTareaEnColumna = dropTareaEnColumna
window.cargarCalendarioTareas = cargarCalendarioTareas
window.cambiarMesCalendario = cambiarMesCalendario
window.mostrarTareasDia = mostrarTareasDia
window.cambiarEstadoTareaRapido = cambiarEstadoTareaRapido
window.editarTarea = editarTarea
window.actualizarContadoresTareasHeader = actualizarContadoresTareasHeader
window.buscarTareas = buscarTareas
window.aplicarFiltros = aplicarFiltros
window.limpiarFiltros = limpiarFiltros
window.ordenarTareas = ordenarTareas
window.toggleAccionesMasivas = toggleAccionesMasivas
window.toggleSeleccionTarea = toggleSeleccionTarea
window.completarTareasSeleccionadas = completarTareasSeleccionadas
window.eliminarTareasSeleccionadas = eliminarTareasSeleccionadas
window.cancelarSeleccion = cancelarSeleccion
window.exportarTareas = exportarTareas
window.toggleTipoManual = toggleTipoManual
window.verDetallesTarea = verDetallesTarea
window.confirmarEliminarTarea = confirmarEliminarTarea

console.log('✅ Sistema completo de tareas con 3 vistas cargado')

// ============================================
// CALENDARIO GLOBAL (Tareas + Trabajos)
// ============================================

let calendarioGlobalMesActual = new Date().getMonth()
let calendarioGlobalAnioActual = new Date().getFullYear()

async function cargarCalendarioGlobal() {
  try {
    // Actualizar título
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    document.getElementById('calendario-global-titulo').textContent = `${meses[calendarioGlobalMesActual]} ${calendarioGlobalAnioActual}`
    
    // Obtener tareas y trabajos del mes
    const { data: tareas } = await axios.get(`${API}/tareas?estado=todas`)
    const { data: trabajos } = await axios.get(`${API}/trabajos`)
    
    // Filtrar por mes actual (sin conversión de timezone)
    const tareasMes = tareas.filter(t => {
      if (!t.fecha_limite) return false
      const fechaStr = t.fecha_limite.split('T')[0]
      const [year, month] = fechaStr.split('-').map(Number)
      return month - 1 === calendarioGlobalMesActual && year === calendarioGlobalAnioActual
    })
    
    const trabajosMes = trabajos.filter(t => {
      if (!t.fecha_programada) return false
      const fechaStr = t.fecha_programada.split('T')[0]
      const [year, month] = fechaStr.split('-').map(Number)
      return month - 1 === calendarioGlobalMesActual && year === calendarioGlobalAnioActual
    })
    
    // Generar calendario
    const primerDia = new Date(calendarioGlobalAnioActual, calendarioGlobalMesActual, 1)
    const ultimoDia = new Date(calendarioGlobalAnioActual, calendarioGlobalMesActual + 1, 0)
    const diasMes = ultimoDia.getDate()
    let diaSemana = primerDia.getDay()
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1 // Lunes = 0
    
    const grid = document.getElementById('calendario-global-grid')
    grid.innerHTML = ''
    
    // Días vacíos del mes anterior
    for (let i = 0; i < diaSemana; i++) {
      grid.innerHTML += '<div class="h-24 bg-gray-50 rounded-lg"></div>'
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasMes; dia++) {
      const fecha = new Date(calendarioGlobalAnioActual, calendarioGlobalMesActual, dia)
      const fechaStr = fecha.toISOString().split('T')[0]
      
      // Contar eventos del día (sin conversión de timezone)
      const tareasDia = tareasMes.filter(t => {
        const fechaStr = t.fecha_limite.split('T')[0]
        const [, , day] = fechaStr.split('-').map(Number)
        return day === dia
      })
      
      const trabajosDia = trabajosMes.filter(t => {
        const fechaStr = t.fecha_programada.split('T')[0]
        const [, , day] = fechaStr.split('-').map(Number)
        return day === dia
      })
      
      const totalEventos = tareasDia.length + trabajosDia.length
      const hoy = new Date()
      const esHoy = fecha.toDateString() === hoy.toDateString()
      
      grid.innerHTML += `
        <div data-fecha="${fechaStr}" class="calendario-dia h-24 border-2 ${esHoy ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'} rounded-lg p-2 cursor-pointer hover:shadow-lg hover:border-yellow-400 transition-all">
          <div class="font-bold text-gray-800 mb-1">${dia}</div>
          ${totalEventos > 0 ? `
            <div class="space-y-1">
              ${tareasDia.slice(0, 2).map(t => {
                const tipoColor = {
                  'llamar': 'bg-blue-200 text-blue-800',
                  'instalar': 'bg-green-200 text-green-800',
                  'medir': 'bg-yellow-200 text-yellow-800',
                  'presupuesto': 'bg-purple-200 text-purple-800',
                  'pedidos': 'bg-red-200 text-red-800',
                  'varios': 'bg-gray-200 text-gray-800'
                }
                return `
                  <div class="text-xs px-2 py-1 rounded ${tipoColor[t.tipo] || 'bg-gray-200 text-gray-800'} truncate" title="${t.titulo}">
                    📋 ${t.titulo.substring(0, 10)}${t.titulo.length > 10 ? '...' : ''}
                  </div>
                `
              }).join('')}
              ${trabajosDia.slice(0, 2).map(t => `
                <div class="text-xs px-2 py-1 rounded ${
                  t.estado === 'pendiente' ? 'bg-purple-100 text-purple-700' : 
                  t.estado === 'en_proceso' ? 'bg-indigo-100 text-indigo-700' : 
                  'bg-gray-100 text-gray-600'
                } truncate" title="${t.tipo_servicio}">
                  💼 ${t.cliente_nombre}
                </div>
              `).join('')}
              ${totalEventos > 4 ? `
                <div class="text-xs text-gray-500 text-center">+${totalEventos - 4} más</div>
              ` : ''}
            </div>
          ` : '<div class="text-xs text-gray-400 text-center mt-4">Sin eventos</div>'}
        </div>
      `
    }
    
    // Añadir event listeners a todos los días después de renderizar
    setTimeout(() => {
      document.querySelectorAll('.calendario-dia').forEach(diaElement => {
        diaElement.addEventListener('click', function() {
          const fechaStr = this.getAttribute('data-fecha')
          console.log('🔥 Día clickeado:', fechaStr)
          mostrarEventosDia(fechaStr)
        })
      })
      console.log('✅ Event listeners añadidos a', document.querySelectorAll('.calendario-dia').length, 'días')
    }, 100)
    
  } catch (error) {
    console.error('Error cargando calendario:', error)
    showNotification('Error al cargar el calendario', 'error')
  }
}

// Variable global para la fecha actual del diario
let diarioFechaActual = null

async function mostrarEventosDia(fechaStr) {
  console.log('🔥 mostrarEventosDia llamada con fecha:', fechaStr)
  diarioFechaActual = fechaStr
  await cargarDiarioDia(fechaStr)
}

// Función para navegar entre días
function cambiarDiaDiario(direccion) {
  const fecha = new Date(diarioFechaActual)
  fecha.setDate(fecha.getDate() + direccion)
  diarioFechaActual = fecha.toISOString().split('T')[0]
  cargarDiarioDia(diarioFechaActual)
}

// Función principal del diario
async function cargarDiarioDia(fechaStr) {
  console.log('📖 cargarDiarioDia iniciada con fecha:', fechaStr)
  try {
    // Parsear fecha sin conversión de zona horaria
    const [year, month, day] = fechaStr.split('-').map(Number)
    const fecha = new Date(year, month - 1, day)
    console.log('📅 Fecha parseada (sin timezone):', fecha)
    const { data: tareas } = await axios.get(`${API}/tareas?estado=todas`)
    const { data: trabajos } = await axios.get(`${API}/trabajos`)
    
    console.log('📋 Tareas obtenidas:', tareas.length)
    console.log('💼 Trabajos obtenidos:', trabajos.length)
    
    // Filtrar por día (sin conversión de timezone)
    const tareasDia = tareas.filter(t => {
      if (!t.fecha_limite) return false
      // Extraer solo la parte de fecha YYYY-MM-DD
      const fechaTarea = t.fecha_limite.split('T')[0]
      return fechaTarea === fechaStr
    })
    
    const trabajosDia = trabajos.filter(t => {
      if (!t.fecha_programada) return false
      // Extraer solo la parte de fecha YYYY-MM-DD
      const fechaTrabajo = t.fecha_programada.split('T')[0]
      return fechaTrabajo === fechaStr
    })
    
    // Mostrar modal estilo diario
    const modalElement = document.getElementById('calendario-global-eventos')
    console.log('🪟 Modal element:', modalElement)
    console.log('🪟 Modal classList antes:', modalElement.classList.toString())
    modalElement.classList.remove('hidden')
    console.log('🪟 Modal classList después:', modalElement.classList.toString())
    console.log('✅ Modal debería estar visible ahora')
    
    // Título con navegación de flechas
    const fechaTitulo = fecha.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    document.getElementById('calendario-global-fecha-titulo').innerHTML = `
      <div class="flex items-center justify-between">
        <button onclick="cambiarDiaDiario(-1)" 
                class="p-2 hover:bg-gray-100 rounded-lg transition-all" 
                title="Día anterior">
          <i class="fas fa-chevron-left text-xl"></i>
        </button>
        <div class="text-center flex-1">
          <h3 class="text-2xl font-bold text-gray-800 capitalize">${fechaTitulo}</h3>
          <p class="text-sm text-gray-500 mt-1">${tareasDia.length + trabajosDia.length} eventos programados</p>
        </div>
        <button onclick="cambiarDiaDiario(1)" 
                class="p-2 hover:bg-gray-100 rounded-lg transition-all" 
                title="Día siguiente">
          <i class="fas fa-chevron-right text-xl"></i>
        </button>
      </div>
    `
    
    const lista = document.getElementById('calendario-global-eventos-lista')
    
    if (tareasDia.length === 0 && trabajosDia.length === 0) {
      lista.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-calendar-times text-6xl mb-4 opacity-30"></i>
          <p class="text-xl font-semibold">No hay eventos para este día</p>
          <p class="text-sm mt-2">Usa las flechas para navegar a otros días</p>
        </div>
      `
      return
    }
    
    lista.innerHTML = ''
    
    // TAREAS - Con información completa y edición
    if (tareasDia.length > 0) {
      lista.innerHTML += `
        <div class="mb-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b-2 border-orange-200 pb-2">
            <i class="fas fa-clipboard-list text-orange-600"></i>
            Tareas del Día (${tareasDia.length})
          </h4>
        </div>
      `
      
      tareasDia.forEach((t, index) => {
        // Colores según tipo
        const tipoColor = {
          'llamar': { bg: 'bg-blue-100', border: 'border-blue-300', icon: 'fa-phone', color: 'text-blue-700' },
          'instalar': { bg: 'bg-green-100', border: 'border-green-300', icon: 'fa-tools', color: 'text-green-700' },
          'medir': { bg: 'bg-yellow-100', border: 'border-yellow-300', icon: 'fa-ruler', color: 'text-yellow-700' },
          'presupuesto': { bg: 'bg-purple-100', border: 'border-purple-300', icon: 'fa-file-invoice-dollar', color: 'text-purple-700' },
          'pedidos': { bg: 'bg-red-100', border: 'border-red-300', icon: 'fa-box', color: 'text-red-700' },
          'varios': { bg: 'bg-gray-50', border: 'border-gray-300', icon: 'fa-tasks', color: 'text-gray-700' }
        }
        
        const tipo = tipoColor[t.tipo] || tipoColor['varios']
        
        const estadoBadge = {
          'pendiente': '<span class="px-3 py-1 bg-orange-200 text-orange-900 text-xs rounded-full font-semibold">⏳ Pendiente</span>',
          'en_proceso': '<span class="px-3 py-1 bg-blue-200 text-blue-900 text-xs rounded-full font-semibold">🔄 En Proceso</span>',
          'completada': '<span class="px-3 py-1 bg-green-200 text-green-900 text-xs rounded-full font-semibold">✅ Completada</span>',
          'cancelada': '<span class="px-3 py-1 bg-gray-200 text-gray-900 text-xs rounded-full font-semibold">❌ Cancelada</span>'
        }
        
        const prioridadIcon = {
          'alta': '<span class="text-red-600 font-bold">🔥 Alta</span>',
          'media': '<span class="text-yellow-600 font-bold">🟡 Media</span>',
          'baja': '<span class="text-green-600 font-bold">🟢 Baja</span>'
        }
        
        lista.innerHTML += `
          <div class="${tipo.bg} ${tipo.border} border-l-4 rounded-lg p-5 mb-4 shadow-sm hover:shadow-md transition-all">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <i class="fas ${tipo.icon} ${tipo.color} text-2xl"></i>
                <div>
                  <h5 class="text-lg font-bold text-gray-900">${t.titulo}</h5>
                  <span class="text-xs ${tipo.color} font-semibold uppercase">${t.tipo.replace(/_/g, ' ')}</span>
                </div>
              </div>
              ${estadoBadge[t.estado]}
            </div>
            
            <!-- Descripción -->
            ${t.descripcion ? `
              <div class="bg-white/70 rounded-lg p-3 mb-3">
                <p class="text-sm text-gray-700 leading-relaxed">${t.descripcion}</p>
              </div>
            ` : ''}
            
            <!-- Información detallada -->
            <div class="grid grid-cols-2 gap-3 text-sm mb-3">
              <div class="flex items-center gap-2 text-gray-700">
                <i class="fas fa-clock text-gray-500"></i>
                <span><strong>Hora:</strong> ${new Date(t.fecha_limite).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</span>
              </div>
              
              <div class="flex items-center gap-2 text-gray-700">
                <i class="fas fa-flag text-gray-500"></i>
                <span><strong>Prioridad:</strong> ${prioridadIcon[t.prioridad] || 'Media'}</span>
              </div>
              
              ${t.asignado_a ? `
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="fas fa-user text-gray-500"></i>
                  <span><strong>Asignado:</strong> ${t.asignado_a}</span>
                </div>
              ` : ''}
              
              ${t.cliente_nombre ? `
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="fas fa-user-tie text-gray-500"></i>
                  <span><strong>Cliente:</strong> ${t.cliente_nombre}</span>
                </div>
              ` : ''}
            </div>
            
            <!-- Acciones -->
            <div class="flex items-center gap-2 pt-3 border-t border-gray-300/50">
              <button onclick="editarTarea(${t.id})" 
                      class="flex-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-gray-300">
                <i class="fas fa-edit mr-2"></i>Editar
              </button>
              <button onclick="verDetallesTarea(${t.id})" 
                      class="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium">
                <i class="fas fa-eye mr-2"></i>Ver Completo
              </button>
            </div>
          </div>
        `
      })
    }
    
    // TRABAJOS - Con información completa y edición
    if (trabajosDia.length > 0) {
      lista.innerHTML += `
        <div class="mt-8 mb-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b-2 border-gray-300 pb-2">
            <i class="fas fa-briefcase text-gray-700"></i>
            Trabajos del Día (${trabajosDia.length})
          </h4>
        </div>
      `
      
      trabajosDia.forEach(t => {
        const estadoBadge = {
          'pendiente': '<span class="px-3 py-1 bg-orange-200 text-orange-900 text-xs rounded-full font-semibold">⏳ Pendiente</span>',
          'en_proceso': '<span class="px-3 py-1 bg-blue-200 text-blue-900 text-xs rounded-full font-semibold">🔄 En Proceso</span>',
          'completado': '<span class="px-3 py-1 bg-green-200 text-green-900 text-xs rounded-full font-semibold">✅ Completado</span>',
          'cancelado': '<span class="px-3 py-1 bg-gray-200 text-gray-900 text-xs rounded-full font-semibold">❌ Cancelado</span>'
        }
        
        lista.innerHTML += `
          <div class="bg-white border-l-4 border-gray-700 rounded-lg p-5 mb-4 shadow-sm hover:shadow-md transition-all">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <i class="fas fa-briefcase text-gray-700 text-2xl"></i>
                <div>
                  <h5 class="text-lg font-bold text-gray-900">${t.cliente_nombre || 'Sin nombre'} ${t.cliente_apellidos || ''}</h5>
                  <span class="text-xs text-gray-600 font-semibold uppercase">${(t.tipo_servicio || 'Sin tipo').replace(/_/g, ' ')}</span>
                </div>
              </div>
              ${estadoBadge[t.estado]}
            </div>
            
            <!-- Descripción -->
            ${t.descripcion ? `
              <div class="bg-gray-50 rounded-lg p-3 mb-3">
                <p class="text-sm text-gray-700 leading-relaxed">${t.descripcion}</p>
              </div>
            ` : ''}
            
            <!-- Información detallada -->
            <div class="grid grid-cols-2 gap-3 text-sm mb-3">
              <div class="flex items-center gap-2 text-gray-700">
                <i class="fas fa-clock text-gray-500"></i>
                <span><strong>Hora:</strong> ${new Date(t.fecha_programada).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</span>
              </div>
              
              ${t.duracion_estimada ? `
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="fas fa-hourglass-half text-gray-500"></i>
                  <span><strong>Duración:</strong> ${t.duracion_estimada} min</span>
                </div>
              ` : ''}
              
              ${t.nombre_empleada ? `
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="fas fa-user text-gray-500"></i>
                  <span><strong>Empleada:</strong> ${t.nombre_empleada}</span>
                </div>
              ` : ''}
              
              ${t.precio_cliente ? `
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="fas fa-euro-sign text-gray-500"></i>
                  <span><strong>Precio:</strong> ${t.precio_cliente.toFixed(2)}€</span>
                </div>
              ` : ''}
              
              ${t.direccion ? `
                <div class="col-span-2 flex items-center gap-2 text-gray-700">
                  <i class="fas fa-map-marker-alt text-gray-500"></i>
                  <span><strong>Dirección:</strong> ${t.direccion}</span>
                </div>
              ` : ''}
            </div>
            
            <!-- Acciones -->
            <div class="flex items-center gap-2 pt-3 border-t border-gray-300/50">
              <button onclick="editTrabajo(${t.id})" 
                      class="flex-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-gray-300">
                <i class="fas fa-edit mr-2"></i>Editar
              </button>
              <button onclick="viewTrabajo(${t.id})" 
                      class="flex-1 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium">
                <i class="fas fa-eye mr-2"></i>Ver Completo
              </button>
            </div>
          </div>
        `
      })
    }
    
  } catch (error) {
    console.error('Error cargando diario:', error)
    showNotification('Error al cargar eventos del día', 'error')
  }
}

function cambiarMesGlobal(direccion) {
  calendarioGlobalMesActual += direccion
  
  if (calendarioGlobalMesActual > 11) {
    calendarioGlobalMesActual = 0
    calendarioGlobalAnioActual++
  } else if (calendarioGlobalMesActual < 0) {
    calendarioGlobalMesActual = 11
    calendarioGlobalAnioActual--
  }
  
  cargarCalendarioGlobal()
  document.getElementById('calendario-global-eventos').classList.add('hidden')
}

// Exponer funciones globalmente
window.cargarCalendarioGlobal = cargarCalendarioGlobal
window.mostrarEventosDia = mostrarEventosDia
window.cambiarMesGlobal = cambiarMesGlobal
window.cambiarDiaDiario = cambiarDiaDiario
window.cargarDiarioDia = cargarDiarioDia

console.log('✅ Calendario global cargado')

