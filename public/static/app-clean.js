// API Base
const API = '/api'

// Estado global
let currentData = {
  dashboard: null,
  clientes: [],
  trabajos: [],
  empleadas: [],
  stock: [],
  facturas: []
}

// ============================================
// AUTENTICACIÓN
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

// Logout
function logout() {
  localStorage.removeItem('anushka_user')
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
      userNameElement.textContent = user.nombre
    }
  }
}

// ============================================
// NAVEGACIÓN
// ============================================

function showTab(tabName) {
  console.log('🔄 showTab called:', tabName)
  
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
    case 'empleadas':
      loadEmpleadas()
      break
    case 'stock':
      loadStock()
      break
    case 'facturas':
      loadFacturas()
      break
    case 'reportes':
      loadReporte()
      break
  }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  try {
    const { data } = await axios.get(`${API}/dashboard`)
    currentData.dashboard = data
    
    // Actualizar KPIs
    document.getElementById('kpi-ingresos').textContent = `€${(data.ingresos || 0).toFixed(2)}`
    document.getElementById('kpi-trabajos').textContent = data.trabajos_activos || 0
    document.getElementById('kpi-stock').textContent = data.stock_bajo || 0
    document.getElementById('kpi-horas').textContent = `${(data.horas_semanales || 0).toFixed(1)}h`
    document.getElementById('kpi-satisfaccion').textContent = `${(data.satisfaccion_promedio || 0).toFixed(1)} ⭐`
    
    // Gráfico de trabajos por estado
    renderChartTrabajos(data.trabajos_por_estado)
    
    // Gráfico de ingresos
    renderChartIngresos(data.ingresos_diarios)
    
    // Top empleadas (COMENTADO - sección eliminada del dashboard)
    // renderTopEmpleadas(data.top_empleadas)
    
  } catch (error) {
    console.error('Error cargando dashboard:', error)
    showError('Error al cargar el dashboard')
  }
}

// Variable global para guardar instancias de charts
let chartTrabajosInstance = null
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
                <button onclick="viewCliente(${c.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editCliente(${c.id})" class="text-green-600 hover:text-green-800">
                  <i class="fas fa-edit"></i>
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
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="editTrabajo(${t.id})" class="text-green-600 hover:text-green-800">
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

async function showTrabajoForm(id = null) {
  // Cargar clientes y empleadas para los selects
  const [clientesRes, empleadasRes] = await Promise.all([
    axios.get(`${API}/clientes`),
    axios.get(`${API}/empleadas`)
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Empleada</label>
              <select name="empleada_id" class="w-full px-4 py-2 border rounded-lg">
                <option value="">Sin asignar</option>
                ${empleadasRes.data.map(e => `
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <input type="number" name="duracion_estimada" value="${trabajo.duracion_estimada}" 
                     class="w-full px-4 py-2 border rounded-lg">
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
// EMPLEADAS
// ============================================

async function loadEmpleadas() {
  try {
    const { data } = await axios.get(`${API}/empleadas`)
    currentData.empleadas = data
    
    const container = document.getElementById('empleadas-lista')
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${data.map(e => `
          <div class="bg-white border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${e.nombre} ${e.apellidos}</h3>
                <p class="text-sm text-gray-600">${e.telefono}</p>
              </div>
              <div class="text-yellow-600 font-semibold">${e.calificacion.toFixed(1)} ⭐</div>
            </div>
            
            <div class="space-y-2 mb-4">
              <p class="text-sm"><span class="font-medium">Email:</span> ${e.email || 'N/A'}</p>
              <p class="text-sm"><span class="font-medium">DNI:</span> ${e.dni}</p>
              <p class="text-sm"><span class="font-medium">Salario/hora:</span> €${e.salario_hora.toFixed(2)}</p>
              <p class="text-sm"><span class="font-medium">Contratada:</span> ${new Date(e.fecha_contratacion).toLocaleDateString('es-ES')}</p>
            </div>
            
            <div class="flex gap-2">
              <button onclick="viewEmpleada(${e.id})" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                <i class="fas fa-eye mr-2"></i>Ver
              </button>
              <button onclick="editEmpleada(${e.id})" class="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                <i class="fas fa-edit mr-2"></i>Editar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `
  } catch (error) {
    console.error('Error cargando empleadas:', error)
    showError('Error al cargar empleadas')
  }
}

async function showEmpleadaForm(id = null) {
  const isEdit = id !== null
  let empleada = {
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    dni: '',
    fecha_contratacion: new Date().toISOString().slice(0, 10),
    salario_hora: 12.00,
    especialidades: [],
    notas: ''
  }
  
  if (isEdit) {
    const { data } = await axios.get(`${API}/empleadas/${id}`)
    empleada = data.empleada
    try {
      empleada.especialidades = JSON.parse(empleada.especialidades || '[]')
    } catch {
      empleada.especialidades = []
    }
  }
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Editar' : 'Nueva'} Empleada</h3>
        <form id="empleada-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${empleada.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input type="text" name="apellidos" value="${empleada.apellidos}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input type="tel" name="telefono" value="${empleada.telefono}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
              <input type="text" name="dni" value="${empleada.dni}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${empleada.email || ''}" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Contratación *</label>
              <input type="date" name="fecha_contratacion" value="${empleada.fecha_contratacion}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Salario/Hora (€) *</label>
              <input type="number" name="salario_hora" value="${empleada.salario_hora}" required step="0.01" 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center space-x-2">
                <input type="checkbox" name="especialidades" value="limpieza" 
                       ${empleada.especialidades.includes('limpieza') ? 'checked' : ''} class="rounded">
                <span class="text-sm">Limpieza</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="checkbox" name="especialidades" value="plancha" 
                       ${empleada.especialidades.includes('plancha') ? 'checked' : ''} class="rounded">
                <span class="text-sm">Plancha</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="checkbox" name="especialidades" value="cocina" 
                       ${empleada.especialidades.includes('cocina') ? 'checked' : ''} class="rounded">
                <span class="text-sm">Cocina</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="checkbox" name="especialidades" value="mantenimiento" 
                       ${empleada.especialidades.includes('mantenimiento') ? 'checked' : ''} class="rounded">
                <span class="text-sm">Mantenimiento</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="checkbox" name="especialidades" value="organizacion" 
                       ${empleada.especialidades.includes('organizacion') ? 'checked' : ''} class="rounded">
                <span class="text-sm">Organización</span>
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows="3" 
                      class="w-full px-4 py-2 border rounded-lg">${empleada.notas || ''}</textarea>
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
  
  document.getElementById('empleada-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    // Procesar especialidades (checkboxes múltiples)
    data.especialidades = Array.from(e.target.querySelectorAll('input[name="especialidades"]:checked'))
      .map(cb => cb.value)
    
    try {
      if (isEdit) {
        await axios.put(`${API}/empleadas/${id}`, data)
      } else {
        await axios.post(`${API}/empleadas`, data)
      }
      closeModal()
      loadEmpleadas()
      showSuccess('Empleada guardada correctamente')
    } catch (error) {
      console.error(error)
      showError('Error al guardar empleada')
    }
  })
}

// ============================================
// STOCK
// ============================================

async function loadStock(bajoStock = false) {
  try {
    const params = bajoStock ? '?bajo_stock=true' : ''
    const { data } = await axios.get(`${API}/stock${params}`)
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${s.categoria}</td>
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
    showError('Error al cargar stock')
  }
}

async function showStockForm(id = null) {
  const isEdit = id !== null
  let stock = {
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad: '',
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
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Editar' : 'Nuevo'} Artículo</h3>
        <form id="stock-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value="${stock.nombre}" required 
                     class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select name="categoria" required class="w-full px-4 py-2 border rounded-lg">
                <option value="">Seleccionar</option>
                <option value="limpieza" ${stock.categoria === 'limpieza' ? 'selected' : ''}>Limpieza</option>
                <option value="mantenimiento" ${stock.categoria === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                <option value="proteccion" ${stock.categoria === 'proteccion' ? 'selected' : ''}>Protección</option>
                <option value="herramientas" ${stock.categoria === 'herramientas' ? 'selected' : ''}>Herramientas</option>
                <option value="consumibles" ${stock.categoria === 'consumibles' ? 'selected' : ''}>Consumibles</option>
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
window.viewEmpleada = async (id) => {
  const { data } = await axios.get(`${API}/empleadas/${id}`)
  alert(`Empleada: ${data.empleada.nombre} ${data.empleada.apellidos}\n\nCalificación: ${data.empleada.calificacion} ⭐\nTrabajos: ${data.trabajos.length}\nHoras registradas: ${data.horas.length}`)
}
window.editEmpleada = (id) => showEmpleadaForm(id)
window.editStock = (id) => showStockForm(id)

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación
  checkAuth()
  loadUserInfo()
  
  // Cargar dashboard
  loadDashboard()
})

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
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.cliente_nombre} ${p.cliente_apellidos}</td>
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
                <button onclick="downloadPresupuestoPDF(${p.id})" class="text-green-600 hover:text-green-800" title="Descargar PDF">
                  <i class="fas fa-file-pdf"></i>
                </button>
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
async function showPresupuestoForm() {
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
            ${clientes.map(c => `<option value="${c.id}">${c.nombre} ${c.apellidos}</option>`).join('')}
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

// Descargar PDF (placeholder - implementar según necesidades)
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
    
    // Configuración de colores
    const primaryColor = [31, 41, 55] // gray-800
    const secondaryColor = [107, 114, 128] // gray-500
    const accentColor = [34, 197, 94] // green-500
    
    let yPos = 20
    
    // ====================================
    // HEADER - Logo y datos de empresa
    // ====================================
    
    // Logo (si existe) - Placeholder por ahora
    doc.setFillColor(...primaryColor)
    doc.rect(20, yPos, 40, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('ANUSHKA', 40, yPos + 9, { align: 'center' })
    doc.setFontSize(8)
    doc.text('HOGAR', 40, yPos + 13, { align: 'center' })
    
    // Datos de empresa
    doc.setTextColor(...primaryColor)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text('Anushka Hogar', 170, yPos + 2, { align: 'right' })
    doc.setFontSize(8)
    doc.setTextColor(...secondaryColor)
    doc.text('Av. de Monelos 109', 170, yPos + 7, { align: 'right' })
    doc.text('15008 A Coruña', 170, yPos + 11, { align: 'right' })
    
    yPos += 25
    
    // ====================================
    // TÍTULO DEL DOCUMENTO
    // ====================================
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)
    yPos += 8
    
    doc.setTextColor(...primaryColor)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('PRESUPUESTO', 20, yPos)
    
    doc.setFontSize(12)
    doc.setTextColor(...accentColor)
    doc.text(data.numero_presupuesto, 190, yPos, { align: 'right' })
    
    yPos += 10
    
    // ====================================
    // INFORMACIÓN DEL CLIENTE
    // ====================================
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('CLIENTE', 20, yPos)
    
    yPos += 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text(`${data.cliente_nombre} ${data.cliente_apellidos}`, 20, yPos)
    yPos += 5
    doc.setTextColor(...secondaryColor)
    doc.text(data.cliente_direccion || '', 20, yPos)
    yPos += 5
    doc.text(`${data.cliente_ciudad || ''} - ${data.cliente_codigo_postal || ''}`, 20, yPos)
    yPos += 5
    doc.text(`Tel: ${data.cliente_telefono || ''} | Email: ${data.cliente_email || ''}`, 20, yPos)
    
    // Fecha y estado
    yPos -= 15
    doc.setTextColor(...primaryColor)
    doc.setFont(undefined, 'bold')
    doc.text('FECHA:', 130, yPos)
    doc.setFont(undefined, 'normal')
    doc.text(new Date(data.fecha_emision).toLocaleDateString('es-ES'), 150, yPos)
    
    yPos += 5
    doc.setFont(undefined, 'bold')
    doc.text('ESTADO:', 130, yPos)
    doc.setFont(undefined, 'normal')
    const estados = {
      'pendiente': 'Pendiente',
      'enviado': 'Enviado',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado'
    }
    doc.text(estados[data.estado] || data.estado, 150, yPos)
    
    yPos += 15
    
    // ====================================
    // TÍTULO DEL PRESUPUESTO
    // ====================================
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...primaryColor)
    doc.text(data.titulo || 'Presupuesto', 20, yPos)
    yPos += 7
    
    if (data.descripcion) {
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(...secondaryColor)
      const splitDesc = doc.splitTextToSize(data.descripcion, 170)
      doc.text(splitDesc, 20, yPos)
      yPos += splitDesc.length * 4 + 5
    }
    
    // ====================================
    // LÍNEAS DEL PRESUPUESTO
    // ====================================
    
    // Función helper para crear tabla
    const createTable = (title, items, unit) => {
      if (items.length === 0) return
      
      // Título de sección
      doc.setFillColor(240, 240, 240)
      doc.rect(20, yPos, 170, 8, 'F')
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryColor)
      doc.text(title, 22, yPos + 5.5)
      yPos += 10
      
      // Tabla
      const tableData = items.map(item => [
        item.concepto,
        item.cantidad.toFixed(2),
        unit,
        `€${item.precio_unitario.toFixed(2)}`,
        `€${item.subtotal.toFixed(2)}`
      ])
      
      doc.autoTable({
        startY: yPos,
        head: [['Concepto', 'Cantidad', 'Unidad', 'Precio', 'Subtotal']],
        body: tableData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 20, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      })
      
      yPos = doc.lastAutoTable.finalY + 8
    }
    
    // Telas
    if (telas.length > 0) {
      createTable('🧵 TELAS', telas, 'metros')
    }
    
    // Materiales
    if (materiales.length > 0) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }
      createTable('🔧 MATERIALES', materiales, 'ud')
    }
    
    // Confección
    if (confeccion.length > 0) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }
      createTable('✂️ CONFECCIÓN', confeccion, 'horas')
    }
    
    // Instalación
    if (instalacion.length > 0) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }
      createTable('🔨 INSTALACIÓN', instalacion, 'horas')
    }
    
    // ====================================
    // TOTALES
    // ====================================
    
    // Verificar espacio para totales
    if (yPos > 230) {
      doc.addPage()
      yPos = 20
    }
    
    yPos += 5
    
    // Subtotal
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...secondaryColor)
    doc.text('Subtotal:', 140, yPos, { align: 'right' })
    doc.setTextColor(...primaryColor)
    doc.text(`€${data.subtotal.toFixed(2)}`, 190, yPos, { align: 'right' })
    yPos += 6
    
    // Descuento
    if (data.descuento_porcentaje > 0) {
      doc.setTextColor(...secondaryColor)
      doc.text(`Descuento (${data.descuento_porcentaje}%):`, 140, yPos, { align: 'right' })
      doc.setTextColor(...accentColor)
      doc.text(`-€${data.descuento_importe.toFixed(2)}`, 190, yPos, { align: 'right' })
      yPos += 6
    }
    
    // IVA
    doc.setTextColor(...secondaryColor)
    doc.text(`IVA (${data.porcentaje_iva}%):`, 140, yPos, { align: 'right' })
    doc.setTextColor(...primaryColor)
    doc.text(`€${data.importe_iva.toFixed(2)}`, 190, yPos, { align: 'right' })
    yPos += 8
    
    // Línea separadora
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(120, yPos, 190, yPos)
    yPos += 8
    
    // TOTAL FINAL
    doc.setFillColor(...accentColor)
    doc.rect(120, yPos - 6, 70, 10, 'F')
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL:', 140, yPos, { align: 'right' })
    doc.setFontSize(14)
    doc.text(`€${data.total.toFixed(2)}`, 188, yPos, { align: 'right' })
    
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
    // PIE DE PÁGINA (en todas las páginas)
    // ====================================
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(...secondaryColor)
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        287,
        { align: 'center' }
      )
      doc.text(
        'Anushka Hogar - Av. de Monelos 109, 15008 A Coruña',
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
