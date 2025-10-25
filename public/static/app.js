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
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active')
  })
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active')
  })
  
  // Mostrar tab seleccionado
  document.getElementById(`${tabName}-tab`).classList.add('active')
  event.target.classList.add('active')
  
  // Cargar datos según tab
  switch(tabName) {
    case 'dashboard':
      loadDashboard()
      break
    case 'clientes':
      loadClientes()
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
    
    // Top empleadas
    renderTopEmpleadas(data.top_empleadas)
    
  } catch (error) {
    console.error('Error cargando dashboard:', error)
    showError('Error al cargar el dashboard')
  }
}

function renderChartTrabajos(data) {
  const ctx = document.getElementById('chartTrabajos')
  if (!ctx) return
  
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
  
  new Chart(ctx, {
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
  if (!ctx) return
  
  const labels = data.map(d => new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }))
  const values = data.map(d => d.total)
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ingresos (€)',
        data: values,
        backgroundColor: 'rgba(103, 126, 234, 0.8)',
        borderColor: 'rgba(103, 126, 234, 1)',
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

// ============================================
// CLIENTES
// ============================================

async function loadClientes() {
  try {
    const { data } = await axios.get(`${API}/clientes`)
    currentData.clientes = data
    
    const container = document.getElementById('clientes-lista')
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
