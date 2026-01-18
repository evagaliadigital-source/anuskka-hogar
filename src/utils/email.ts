import { Resend } from 'resend'

export interface EmailConfig {
  resendApiKey: string
  fromEmail: string
  toEmail: string
}

export interface PresupuestoEmailData {
  numeroPresupuesto: string
  clienteNombre: string
  clienteEmail: string
  fechaCreacion: string
  total: number
  items: Array<{
    descripcion: string
    cantidad: number
    precio: number
    total: number
  }>
}

export interface TrabajoEmailData {
  numeroTrabajo: string
  clienteNombre: string
  clienteEmail: string
  titulo: string
  descripcion: string
  fechaInicio: string
  fechaFin?: string
  empleada: string
  estado: string
}

export interface FacturaEmailData {
  numeroFactura: string
  clienteNombre: string
  clienteEmail: string
  fecha: string
  total: number
  items: Array<{
    descripcion: string
    cantidad: number
    precio: number
    total: number
  }>
}

/**
 * Enviar email de nuevo presupuesto a Ana María
 */
export async function enviarEmailNuevoPresupuesto(
  config: EmailConfig,
  data: PresupuestoEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(config.resendApiKey)

    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.descripcion}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.precio.toFixed(2)}€</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${item.total.toFixed(2)}€</td>
      </tr>
    `).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevo Presupuesto - ${data.numeroPresupuesto}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Nuevo Presupuesto</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #667eea; margin-top: 0;">Detalles del Presupuesto</h2>
            <p><strong>Número:</strong> ${data.numeroPresupuesto}</p>
            <p><strong>Cliente:</strong> ${data.clienteNombre}</p>
            <p><strong>Email cliente:</strong> ${data.clienteEmail}</p>
            <p><strong>Fecha:</strong> ${data.fechaCreacion}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #667eea; margin-top: 0;">Conceptos</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Descripción</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Precio</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">TOTAL:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #667eea;">${data.total.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">
              <strong>💡 Recordatorio:</strong> Accede a Anushka Hogar para gestionar este presupuesto.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>Anushka Hogar - Sistema de Gestión</p>
          <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
      </body>
      </html>
    `

    const result = await resend.emails.send({
      from: config.fromEmail,
      to: config.toEmail,
      subject: `📋 Nuevo Presupuesto ${data.numeroPresupuesto} - ${data.clienteNombre}`,
      html: htmlContent,
    })

    return { success: true }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Enviar email de presupuesto aceptado
 */
export async function enviarEmailPresupuestoAceptado(
  config: EmailConfig,
  data: PresupuestoEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(config.resendApiKey)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Presupuesto Aceptado - ${data.numeroPresupuesto}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Presupuesto Aceptado</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin-top: 0;">¡Buenas noticias!</h2>
            <p style="font-size: 16px;">El cliente <strong>${data.clienteNombre}</strong> ha aceptado el presupuesto <strong>${data.numeroPresupuesto}</strong>.</p>
            <p><strong>Total:</strong> <span style="font-size: 20px; color: #10b981;">${data.total.toFixed(2)}€</span></p>
            <p><strong>Fecha:</strong> ${data.fechaCreacion}</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46;">
              <strong>📌 Próximo paso:</strong> Crear el trabajo asociado y asignar empleada.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>Anushka Hogar - Sistema de Gestión</p>
        </div>
      </body>
      </html>
    `

    const result = await resend.emails.send({
      from: config.fromEmail,
      to: config.toEmail,
      subject: `✅ Presupuesto Aceptado ${data.numeroPresupuesto} - ${data.clienteNombre}`,
      html: htmlContent,
    })

    return { success: true }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Enviar email de trabajo completado al cliente
 */
export async function enviarEmailTrabajoCompletado(
  config: EmailConfig,
  data: TrabajoEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(config.resendApiKey)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Trabajo Completado - ${data.numeroTrabajo}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Trabajo Completado</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #f59e0b; margin-top: 0;">Estimado/a ${data.clienteNombre},</h2>
            <p style="font-size: 16px;">Nos complace informarle que su trabajo <strong>${data.numeroTrabajo}</strong> ha sido completado exitosamente.</p>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Título:</strong> ${data.titulo}</p>
              ${data.descripcion ? `<p style="margin: 10px 0 0 0;"><strong>Descripción:</strong> ${data.descripcion}</p>` : ''}
              <p style="margin: 10px 0 0 0;"><strong>Realizado por:</strong> ${data.empleada}</p>
              <p style="margin: 10px 0 0 0;"><strong>Fecha finalización:</strong> ${data.fechaFin || 'Hoy'}</p>
            </div>

            <p>Gracias por confiar en Anushka Hogar. Esperamos que esté satisfecho/a con nuestro servicio.</p>
          </div>

          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">
              <strong>💬 ¿Alguna consulta?</strong> Puede contactarnos en anuskkahogar@gmail.com o llamarnos al 666 308 290.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>Anushka Hogar</p>
          <p>Av de Monelos nº109, 15009 A Coruña</p>
        </div>
      </body>
      </html>
    `

    const result = await resend.emails.send({
      from: config.fromEmail,
      to: data.clienteEmail,
      subject: `🎉 Trabajo Completado - ${data.numeroTrabajo}`,
      html: htmlContent,
    })

    return { success: true }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Enviar email de factura generada al cliente
 */
export async function enviarEmailFacturaGenerada(
  config: EmailConfig,
  data: FacturaEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(config.resendApiKey)

    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.descripcion}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.precio.toFixed(2)}€</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${item.total.toFixed(2)}€</td>
      </tr>
    `).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura ${data.numeroFactura}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🧾 Factura Generada</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #8b5cf6; margin-top: 0;">Estimado/a ${data.clienteNombre},</h2>
            <p style="font-size: 16px;">Adjuntamos la factura <strong>${data.numeroFactura}</strong> correspondiente a los servicios realizados.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Factura:</strong> ${data.numeroFactura}</p>
              <p style="margin: 10px 0 0 0;"><strong>Fecha:</strong> ${data.fecha}</p>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #8b5cf6; margin-top: 0;">Desglose</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Descripción</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Precio</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">TOTAL:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #8b5cf6;">${data.total.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background: #ede9fe; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
            <p style="margin: 0; color: #5b21b6;">
              <strong>💳 Forma de pago:</strong> Puede realizar el pago mediante transferencia bancaria o en efectivo.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>Anushka Hogar</p>
          <p>Av de Monelos nº109, 15009 A Coruña</p>
          <p>Email: anuskkahogar@gmail.com | Tel: 666 308 290</p>
        </div>
      </body>
      </html>
    `

    const result = await resend.emails.send({
      from: config.fromEmail,
      to: data.clienteEmail,
      subject: `🧾 Factura ${data.numeroFactura} - Anushka Hogar`,
      html: htmlContent,
    })

    return { success: true }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Enviar email de nuevo ticket a Ana María
 */
export async function enviarEmailNuevoTicket(
  destinatario: string,
  ticket: {
    id: number
    asunto: string
    descripcion: string
    prioridad: string
    categoria: string
    email_contacto: string
    nombre_contacto?: string
    telefono_contacto?: string
  },
  resendApiKey: string
): Promise<void> {
  const resend = new Resend(resendApiKey)

  const prioridadColor = {
    'baja': '#10b981',
    'media': '#f59e0b',
    'alta': '#ef4444',
    'urgente': '#dc2626'
  }[ticket.prioridad] || '#6b7280'

  const prioridadEmoji = {
    'baja': '🟢',
    'media': '🟡',
    'alta': '🔴',
    'urgente': '🚨'
  }[ticket.prioridad] || '⚪'

  const categoriaEmoji = {
    'consulta': '❓',
    'soporte': '🛟',
    'reclamo': '⚠️',
    'sugerencia': '💡',
    'otro': '📋'
  }[ticket.categoria] || '📋'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nuevo Ticket - #${ticket.id}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎫 Nuevo Ticket de Soporte</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Ticket #${ticket.id}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; background: ${prioridadColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-right: 10px;">
            ${prioridadEmoji} ${ticket.prioridad.toUpperCase()}
          </span>
          <span style="display: inline-block; background: #6b7280; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
            ${categoriaEmoji} ${ticket.categoria}
          </span>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${prioridadColor};">
          <h2 style="color: #667eea; margin: 0 0 10px 0; font-size: 18px;">📋 Asunto</h2>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1f2937;">${ticket.asunto}</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 16px;">💬 Descripción</h3>
          <p style="margin: 0; white-space: pre-wrap; color: #374151;">${ticket.descripcion}</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px;">
          <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px;">👤 Datos de Contacto</h3>
          ${ticket.nombre_contacto ? `<p style="margin: 0 0 8px 0;"><strong>Nombre:</strong> ${ticket.nombre_contacto}</p>` : ''}
          <p style="margin: 0 0 8px 0;">
            <strong>📧 Email:</strong> <a href="mailto:${ticket.email_contacto}" style="color: #667eea;">${ticket.email_contacto}</a>
          </p>
          ${ticket.telefono_contacto ? `<p style="margin: 0;"><strong>📱 Teléfono:</strong> <a href="tel:${ticket.telefono_contacto}" style="color: #667eea;">${ticket.telefono_contacto}</a></p>` : ''}
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="https://anushka-hogar.pages.dev/" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                    font-weight: bold; font-size: 16px;">
            🎯 Ver Ticket en Dashboard
          </a>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>Anushka Hogar</p>
        <p>Email: anuskkahogar@gmail.com | Tel: 666 308 290</p>
      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: 'Anushka Hogar <onboarding@resend.dev>',
    to: destinatario,
    subject: `🎫 Nuevo Ticket #${ticket.id}: ${ticket.asunto}`,
    html,
  })
}

/**
 * Enviar email de confirmación al cliente que creó el ticket
 */
export async function enviarEmailConfirmacionTicket(
  ticket: {
    id: number
    asunto: string
    email_contacto: string
    nombre_contacto?: string
  },
  resendApiKey: string
): Promise<void> {
  const resend = new Resend(resendApiKey)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket Recibido - #${ticket.id}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Ticket Recibido</h1>
        <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">Ticket #${ticket.id}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            ${ticket.nombre_contacto ? `Hola <strong>${ticket.nombre_contacto}</strong>,` : 'Hola,'}
          </p>
          <p style="margin: 0 0 15px 0; color: #374151;">
            Hemos recibido tu ticket de soporte correctamente. Nuestro equipo lo revisará y te responderá lo antes posible.
          </p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
          <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 16px;">📋 Detalles de tu Ticket</h3>
          <p style="margin: 0 0 8px 0;">
            <strong>Número de Ticket:</strong> #${ticket.id}
          </p>
          <p style="margin: 0;">
            <strong>Asunto:</strong> ${ticket.asunto}
          </p>
        </div>

        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; color: #1e3a8a;">
            <strong>⏱️ Tiempo de respuesta estimado:</strong> Responderemos en un máximo de 24-48 horas.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>Anushka Hogar</p>
        <p>Email: anuskkahogar@gmail.com | Tel: 666 308 290</p>
      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: 'Anushka Hogar <onboarding@resend.dev>',
    to: ticket.email_contacto,
    subject: `✅ Ticket Recibido #${ticket.id}: ${ticket.asunto}`,
    html,
  })
}
