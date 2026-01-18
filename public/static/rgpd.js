// ============================================
// SISTEMA RGPD - FRONTEND
// ============================================

// ============================================
// MODAL DE POLÍTICA DE PRIVACIDAD
// ============================================

function abrirPoliticaPrivacidad() {
  document.getElementById('modal-politica-privacidad').classList.remove('hidden')
}

function cerrarPoliticaPrivacidad() {
  document.getElementById('modal-politica-privacidad').classList.add('hidden')
}

// ============================================
// REGISTRAR CONSENTIMIENTO
// ============================================

async function registrarConsentimiento(clienteId, tipo, aceptado) {
  try {
    await axios.post(`${API}/rgpd/consentimiento`, {
      cliente_id: clienteId,
      tipo: tipo,
      aceptado: aceptado,
      version_politica: 'v1.0'
    })
    
    console.log(`✅ Consentimiento ${tipo} registrado`)
  } catch (error) {
    console.error('Error registrando consentimiento:', error)
  }
}

// ============================================
// PORTAL RGPD DEL CLIENTE
// ============================================

function abrirPortalRGPD(clienteId) {
  document.getElementById('modal-portal-rgpd').classList.remove('hidden')
  cargarDatosCliente(clienteId)
}

function cerrarPortalRGPD() {
  document.getElementById('modal-portal-rgpd').classList.add('hidden')
}

async function cargarDatosCliente(clienteId) {
  try {
    const { data } = await axios.get(`${API}/clientes/${clienteId}`)
    
    // Mostrar datos
    document.getElementById('rgpd-cliente-nombre').textContent = `${data.nombre} ${data.apellidos}`
    document.getElementById('rgpd-cliente-email').textContent = data.email || 'Sin email'
    document.getElementById('rgpd-cliente-telefono').textContent = data.telefono || 'Sin teléfono'
    document.getElementById('rgpd-cliente-direccion').textContent = data.direccion || 'Sin dirección'
    
    // Cargar consentimientos
    const { data: consentimientos } = await axios.get(`${API}/rgpd/consentimientos/${clienteId}`)
    renderizarConsentimientos(consentimientos)
    
  } catch (error) {
    console.error('Error cargando datos del cliente:', error)
    showNotification('Error al cargar datos', 'error')
  }
}

function renderizarConsentimientos(consentimientos) {
  const lista = document.getElementById('lista-consentimientos')
  
  if (!consentimientos || consentimientos.length === 0) {
    lista.innerHTML = '<p class="text-gray-500 text-sm">No hay consentimientos registrados</p>'
    return
  }
  
  lista.innerHTML = consentimientos.map(c => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p class="font-medium text-gray-800">${getTipoConsentimiento(c.tipo)}</p>
        <p class="text-xs text-gray-500">
          ${c.aceptado ? '✅ Aceptado' : '❌ Rechazado'} - 
          ${new Date(c.fecha_aceptacion).toLocaleDateString('es-ES')}
        </p>
      </div>
      ${c.aceptado && !c.revocado ? `
        <button onclick="revocarConsentimiento(${c.id})" 
                class="text-red-600 hover:text-red-700 text-sm">
          Revocar
        </button>
      ` : ''}
    </div>
  `).join('')
}

function getTipoConsentimiento(tipo) {
  const tipos = {
    'privacidad': '🔒 Política de Privacidad',
    'marketing': '📧 Comunicaciones Comerciales',
    'comunicaciones': '📱 Comunicaciones Informativas'
  }
  return tipos[tipo] || tipo
}

async function revocarConsentimiento(consentimientoId) {
  if (!confirm('¿Estás segura de revocar este consentimiento?')) return
  
  try {
    await axios.put(`${API}/rgpd/consentimientos/${consentimientoId}/revocar`)
    showNotification('Consentimiento revocado', 'success')
    // Recargar
    const clienteId = document.getElementById('rgpd-cliente-id').value
    cargarDatosCliente(clienteId)
  } catch (error) {
    console.error('Error revocando consentimiento:', error)
    showNotification('Error al revocar consentimiento', 'error')
  }
}

// ============================================
// SOLICITUDES RGPD
// ============================================

async function solicitarAccesoDatos(clienteId) {
  try {
    await axios.post(`${API}/rgpd/solicitud`, {
      cliente_id: clienteId,
      tipo: 'acceso',
      notas: 'Solicitud de acceso a datos personales'
    })
    
    showNotification('✅ Solicitud de acceso registrada. Te contactaremos en 30 días.', 'success')
  } catch (error) {
    console.error('Error en solicitud de acceso:', error)
    showNotification('Error al procesar solicitud', 'error')
  }
}

async function solicitarRectificacion(clienteId) {
  const motivo = prompt('¿Qué datos necesitas rectificar?')
  if (!motivo) return
  
  try {
    await axios.post(`${API}/rgpd/solicitud`, {
      cliente_id: clienteId,
      tipo: 'rectificacion',
      notas: motivo
    })
    
    showNotification('✅ Solicitud de rectificación registrada', 'success')
  } catch (error) {
    console.error('Error en solicitud de rectificación:', error)
    showNotification('Error al procesar solicitud', 'error')
  }
}

async function solicitarSupresion(clienteId) {
  const confirmacion = confirm(
    '⚠️ DERECHO AL OLVIDO\n\n' +
    'Al solicitar la supresión de tus datos:\n' +
    '- Se eliminarán TODOS tus datos personales\n' +
    '- No podrás acceder a tu historial\n' +
    '- Esta acción es IRREVERSIBLE\n\n' +
    '¿Estás segura de continuar?'
  )
  
  if (!confirmacion) return
  
  const motivo = prompt('Motivo de la solicitud (opcional):')
  
  try {
    await axios.post(`${API}/rgpd/solicitud`, {
      cliente_id: clienteId,
      tipo: 'supresion',
      notas: motivo || 'Ejercicio del derecho al olvido'
    })
    
    showNotification('✅ Solicitud de supresión registrada. Te contactaremos en 30 días.', 'info')
    cerrarPortalRGPD()
  } catch (error) {
    console.error('Error en solicitud de supresión:', error)
    showNotification('Error al procesar solicitud', 'error')
  }
}

async function descargarDatos(clienteId) {
  try {
    const { data } = await axios.get(`${API}/clientes/${clienteId}`)
    
    // Crear JSON con todos los datos
    const datosCliente = {
      informacion_personal: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        ciudad: data.ciudad,
        codigo_postal: data.codigo_postal
      },
      fecha_registro: data.fecha_creacion,
      numero_cliente: data.numero_cliente,
      notas: data.notas,
      exportado_en: new Date().toISOString()
    }
    
    // Descargar como JSON
    const blob = new Blob([JSON.stringify(datosCliente, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mis-datos-anushka-${data.numero_cliente}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    showNotification('✅ Datos descargados correctamente', 'success')
    
    // Registrar descarga
    await registrarAuditoria('exportar', 'clientes', clienteId, 'Descarga de datos personales (portabilidad)')
    
  } catch (error) {
    console.error('Error descargando datos:', error)
    showNotification('Error al descargar datos', 'error')
  }
}

// ============================================
// VALIDAR CONSENTIMIENTOS EN FORMULARIOS
// ============================================

function validarConsentimientosFormulario(form) {
  const checkboxPrivacidad = form.querySelector('[name="acepta_privacidad"]')
  
  if (!checkboxPrivacidad || !checkboxPrivacidad.checked) {
    showNotification('⚠️ Debes aceptar la política de privacidad', 'warning')
    return false
  }
  
  return true
}

// Exponer funciones globalmente
window.abrirPoliticaPrivacidad = abrirPoliticaPrivacidad
window.cerrarPoliticaPrivacidad = cerrarPoliticaPrivacidad
window.registrarConsentimiento = registrarConsentimiento
window.abrirPortalRGPD = abrirPortalRGPD
window.cerrarPortalRGPD = cerrarPortalRGPD
window.solicitarAccesoDatos = solicitarAccesoDatos
window.solicitarRectificacion = solicitarRectificacion
window.solicitarSupresion = solicitarSupresion
window.descargarDatos = descargarDatos
window.revocarConsentimiento = revocarConsentimiento
window.validarConsentimientosFormulario = validarConsentimientosFormulario
