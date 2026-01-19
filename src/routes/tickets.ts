import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  RESEND_API_KEY: string
}

const tickets = new Hono<{ Bindings: Bindings }>()

// GET - Obtener todos los tickets
tickets.get('/', async (c) => {
  try {
    const estado = c.req.query('estado') || 'todos'
    const prioridad = c.req.query('prioridad') || ''
    
    let query = 'SELECT * FROM tickets WHERE 1=1'
    const params: any[] = []
    
    if (estado !== 'todos') {
      query += ' AND estado = ?'
      params.push(estado)
    }
    
    if (prioridad) {
      query += ' AND prioridad = ?'
      params.push(prioridad)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json(result.results || [], 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo tickets:', error)
    return c.json({ error: 'Error al obtener tickets' }, 500)
  }
})

// GET - Obtener un ticket por ID
tickets.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first()
    
    if (!result) {
      return c.json({ error: 'Ticket no encontrado' }, 404)
    }
    
    return c.json(result)
  } catch (error) {
    console.error('Error obteniendo ticket:', error)
    return c.json({ error: 'Error al obtener ticket' }, 500)
  }
})

// POST - Crear nuevo ticket
tickets.post('/', async (c) => {
  try {
    const data = await c.req.json()
    
    // Validar campos requeridos
    if (!data.asunto || !data.descripcion || !data.email_contacto) {
      return c.json({ 
        error: 'Campos requeridos: asunto, descripcion, email_contacto' 
      }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO tickets (
        asunto, descripcion, prioridad, estado, 
        email_contacto, nombre_contacto, telefono_contacto, categoria
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.asunto,
      data.descripcion,
      data.prioridad || 'media',
      'abierto',
      data.email_contacto,
      data.nombre_contacto || null,
      data.telefono_contacto || null,
      data.categoria || 'otro'
    ).run()
    
    // Enviar emails
    try {
      console.log('📧 Intentando enviar emails para ticket #', result.meta.last_row_id)
      console.log('🔑 RESEND_API_KEY presente:', !!c.env.RESEND_API_KEY)
      
      const { enviarEmailNuevoTicket, enviarEmailConfirmacionTicket } = await import('../utils/email')
      
      // Email a Eva (Galia Digital)
      console.log('📨 Enviando email a Eva...')
      await enviarEmailNuevoTicket(
        'eva.galiadigital@gmail.com',
        {
          id: result.meta.last_row_id,
          asunto: data.asunto,
          descripcion: data.descripcion,
          prioridad: data.prioridad || 'media',
          categoria: data.categoria || 'otro',
          email_contacto: data.email_contacto,
          nombre_contacto: data.nombre_contacto,
          telefono_contacto: data.telefono_contacto
        },
        c.env.RESEND_API_KEY
      )
      console.log('✅ Email a Eva enviado')
      
      // Email de confirmación al cliente
      console.log('📨 Enviando email de confirmación al cliente...')
      await enviarEmailConfirmacionTicket(
        {
          id: result.meta.last_row_id,
          asunto: data.asunto,
          email_contacto: data.email_contacto,
          nombre_contacto: data.nombre_contacto
        },
        c.env.RESEND_API_KEY
      )
      console.log('✅ Email de confirmación enviado')
      
      console.log('✅ Emails enviados correctamente para ticket #', result.meta.last_row_id)
    } catch (emailError: any) {
      console.error('⚠️ Error enviando emails:', emailError)
      console.error('⚠️ Error message:', emailError?.message)
      console.error('⚠️ Error stack:', emailError?.stack)
      // No fallar el ticket si falla el email
    }
    
    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: 'Ticket creado correctamente. Te hemos enviado un email de confirmación.'
    })
  } catch (error) {
    console.error('Error creando ticket:', error)
    return c.json({ error: 'Error al crear ticket' }, 500)
  }
})

// PUT - Actualizar ticket (responder, cambiar estado, etc.)
tickets.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const updates: string[] = []
    const params: any[] = []
    
    if (data.estado) {
      updates.push('estado = ?')
      params.push(data.estado)
    }
    
    if (data.prioridad) {
      updates.push('prioridad = ?')
      params.push(data.prioridad)
    }
    
    if (data.respuesta) {
      updates.push('respuesta = ?')
      params.push(data.respuesta)
      updates.push('respondido_en = datetime("now")')
      if (data.respondido_por) {
        updates.push('respondido_por = ?')
        params.push(data.respondido_por)
      }
    }
    
    updates.push('updated_at = datetime("now")')
    params.push(id)
    
    const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true, message: 'Ticket actualizado correctamente' })
  } catch (error) {
    console.error('Error actualizando ticket:', error)
    return c.json({ error: 'Error al actualizar ticket' }, 500)
  }
})

// DELETE - Eliminar ticket
tickets.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM tickets WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'Ticket eliminado correctamente' })
  } catch (error) {
    console.error('Error eliminando ticket:', error)
    return c.json({ error: 'Error al eliminar ticket' }, 500)
  }
})

export default tickets
