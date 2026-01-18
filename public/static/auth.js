// ============================================
// SISTEMA DE AUTENTICACIÓN Y SEGURIDAD
// ============================================

const AUTH_TOKEN_KEY = 'auth_token'
const USER_DATA_KEY = 'usuario_data'

// ============================================
// GESTIÓN DE TOKEN JWT
// ============================================

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  // Configurar axios para enviar token en todas las requests
  if (typeof axios !== 'undefined') {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function removeAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  if (typeof axios !== 'undefined') {
    delete axios.defaults.headers.common['Authorization']
  }
}

function setUserData(usuario) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(usuario))
}

function getUserData() {
  const data = localStorage.getItem(USER_DATA_KEY)
  return data ? JSON.parse(data) : null
}

function removeUserData() {
  localStorage.removeItem(USER_DATA_KEY)
}

// ============================================
// VERIFICAR SI ESTÁ LOGUEADO
// ============================================

function isAuthenticated() {
  const token = getAuthToken()
  const usuario = getUserData()
  
  if (!token || !usuario) {
    return false
  }
  
  // Verificar si el token ha expirado
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp < Date.now()) {
      // Token expirado
      logout()
      return false
    }
    return true
  } catch (error) {
    console.error('Error verificando token:', error)
    logout()
    return false
  }
}

// ============================================
// LOGOUT
// ============================================

function logout() {
  removeAuthToken()
  removeUserData()
  window.location.href = '/login.html' // O reload para mostrar pantalla de login
}

// ============================================
// INTERCEPTOR DE AXIOS PARA ERRORES 401
// ============================================

if (typeof axios !== 'undefined') {
  // Interceptor para requests - agregar token
  axios.interceptors.request.use(
    (config) => {
      const token = getAuthToken()
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )
  
  // Interceptor para responses - manejar 401
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn('🔒 Sesión expirada o no autorizado')
        logout()
      }
      return Promise.reject(error)
    }
  )
}

// ============================================
// VERIFICAR PERMISOS POR ROL
// ============================================

function hasPermission(accion, recurso) {
  const usuario = getUserData()
  if (!usuario) return false
  
  const { rol } = usuario
  
  // Admin puede todo
  if (rol === 'admin') return true
  
  // Permisos por rol
  const permissions = {
    tienda: {
      read: ['clientes', 'trabajos', 'tareas', 'stock', 'presupuestos'],
      create: ['trabajos', 'tareas', 'presupuestos'],
      update: ['trabajos', 'tareas', 'stock'],
      delete: []
    },
    empleada: {
      read: ['clientes', 'trabajos', 'tareas'],
      create: ['tareas'],
      update: ['tareas'],
      delete: []
    },
    cliente: {
      read: ['own'], // Solo sus propios datos
      create: [],
      update: [],
      delete: []
    }
  }
  
  const rolPermissions = permissions[rol] || { read: [], create: [], update: [], delete: [] }
  
  if (!rolPermissions[accion]) return false
  
  // Verificar si tiene permiso para el recurso
  return rolPermissions[accion].includes(recurso) || rolPermissions[accion].includes('*')
}

// ============================================
// AUDITORÍA - REGISTRAR ACCIONES
// ============================================

async function registrarAuditoria(accion, tabla, registroId, detalles, datosAnteriores = null, datosNuevos = null) {
  try {
    const usuario = getUserData()
    if (!usuario) return
    
    await axios.post(`${API}/auditoria`, {
      usuario_id: usuario.id,
      accion,
      tabla,
      registro_id: registroId,
      detalles,
      datos_anteriores: datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datos_nuevos: datosNuevos ? JSON.stringify(datosNuevos) : null
    })
  } catch (error) {
    console.error('Error registrando auditoría:', error)
  }
}

// ============================================
// UI - MOSTRAR/OCULTAR SEGÚN PERMISOS
// ============================================

function actualizarUISegunPermisos() {
  const usuario = getUserData()
  if (!usuario) return
  
  // Ocultar botones según permisos
  document.querySelectorAll('[data-permission]').forEach(element => {
    const [accion, recurso] = element.dataset.permission.split(':')
    if (!hasPermission(accion, recurso)) {
      element.style.display = 'none'
    }
  })
  
  // Mostrar nombre de usuario y rol
  const userNameElements = document.querySelectorAll('.user-name')
  userNameElements.forEach(el => {
    el.textContent = usuario.nombre
  })
  
  const userRolElements = document.querySelectorAll('.user-rol')
  userRolElements.forEach(el => {
    const roles = {
      admin: '👑 Administrador',
      tienda: '🏪 Tienda',
      empleada: '👷 Empleada',
      cliente: '👤 Cliente'
    }
    el.textContent = roles[usuario.rol] || usuario.rol
  })
}

// ============================================
// INICIALIZAR AL CARGAR LA PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación
  if (!isAuthenticated() && !window.location.pathname.includes('login')) {
    // Redirigir a login si no está autenticado
    console.warn('🔒 No autenticado, redirigiendo a login...')
    // window.location.href = '/login.html' // Descomentar cuando exista login.html separado
  } else if (isAuthenticated()) {
    // Configurar token en axios
    const token = getAuthToken()
    if (token && typeof axios !== 'undefined') {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    
    // Actualizar UI según permisos
    actualizarUISegunPermisos()
  }
})

// Exponer funciones globalmente
window.setAuthToken = setAuthToken
window.getAuthToken = getAuthToken
window.removeAuthToken = removeAuthToken
window.setUserData = setUserData
window.getUserData = getUserData
window.isAuthenticated = isAuthenticated
window.logout = logout
window.hasPermission = hasPermission
window.registrarAuditoria = registrarAuditoria
window.actualizarUISegunPermisos = actualizarUISegunPermisos
