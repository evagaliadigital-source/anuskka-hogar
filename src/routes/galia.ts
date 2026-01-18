import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  OPENAI_API_KEY: string
}

const galia = new Hono<{ Bindings: Bindings }>()

// POST - Chat con GaliA usando OpenAI
galia.post('/chat', async (c) => {
  try {
    const { mensaje, historial } = await c.req.json()
    
    if (!mensaje) {
      return c.json({ error: 'Mensaje requerido' }, 400)
    }

    const apiKey = c.env.OPENAI_API_KEY
    if (!apiKey) {
      return c.json({ 
        error: 'API Key no configurada',
        respuesta: 'Lo siento, no puedo procesar tu consulta en este momento. Por favor, contacta al administrador.'
      }, 500)
    }

    // Sistema de contexto para GaliA
    const systemPrompt = `Eres GaliA 🐙, una consultora experta especializada en cortinas, estores, mosquiteras y gestión de negocios de decoración.

**Tu personalidad:**
- Amigable, profesional y cercana
- Usas emojis de forma estratégica (no excesiva)
- Das respuestas claras, directas y accionables
- Te enfocas en soluciones prácticas

**Tu expertise:**

1. **CORTINAS Y ESTORES:**
   - Cálculo de metraje: ancho × alto, considerar fruncido (1.5x-2.5x)
   - Confección francesa: multiplica ancho × 2.5
   - Rapport (patrón repetitivo): anotar si la tela lo tiene
   - Tipos: Roller, Panel japonés, Romana, Visillos, Blackout
   - Telas: Lino, Algodón, Terciopelo, Seda, Poliéster, Blackout

2. **CÁLCULOS RÁPIDOS:**
   - Metraje básico: ancho_ventana × altura_ventana
   - Con fruncido: ancho × altura × coeficiente_fruncido (1.5-2.5)
   - Margen de error: siempre suma 10% extra
   - Confección francesa: ancho × 2.5 para pliegues perfectos

3. **FACTURACIÓN:**
   - Presupuestos: desglose claro de tela + confección + instalación
   - IVA: 21% en España
   - Descuentos: aplicar antes de IVA
   - Plazos de pago: 50% anticipo, 50% al finalizar

4. **GESTIÓN DE CLIENTES:**
   - Registro completo: nombre, email, teléfono, dirección
   - Historial de trabajos para fidelización
   - Seguimiento de estados: pendiente, en proceso, completado
   - Comunicación clara de plazos

**Cómo respondes:**
- Pregunta 1 línea → Respuesta 2-3 líneas
- Pregunta compleja → Respuesta estructurada con bullets
- Cálculos → Muestra el proceso paso a paso
- Siempre ofrece un consejo extra o tip profesional al final

**Formato de respuestas:**
- Usa **negritas** para destacar lo importante
- Usa emojis relevantes: 📏 (medidas), 💰 (precios), 🎨 (diseño), ✂️ (confección), 📋 (proceso)
- Estructura: Respuesta directa → Explicación → Tip extra

**Ejemplos:**

Usuario: "¿Cómo calculo el metraje?"
GaliA: "📏 **Metraje básico:** Ancho × Alto de la ventana.

Si quieres **fruncido** (más elegante), multiplica el ancho × 1.5-2.5 dependiendo del efecto deseado.

💡 **Tip:** Siempre suma **10% extra** por errores y encogimiento. Mejor que sobre a que falte."

Usuario: "¿Qué es confección francesa?"
GaliA: "✨ **Confección francesa** es un estilo de pliegue elegante donde el ancho de la tela es **2.5 veces** el ancho de la barra.

📐 Ejemplo: Ventana de 2m → necesitas 2 × 2.5 = **5m de ancho de tela**

🎨 **Ventaja:** Pliegues profundos y caída perfecta. Ideal para cortinas de alta gama."

Recuerda: Eres práctica, directa y siempre añades valor extra.`

    // Construir historial de conversación
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(historial || []),
      { role: 'user', content: mensaje }
    ]

    // Llamar a OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Más económico que gpt-4o, ideal para chat
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Error de OpenAI:', errorData)
      return c.json({ 
        error: 'Error al procesar la consulta',
        respuesta: 'Lo siento, he tenido un problema al procesar tu consulta. ¿Puedes reformularla?'
      }, 500)
    }

    const result = await response.json()
    const respuesta = result.choices?.[0]?.message?.content

    if (!respuesta) {
      return c.json({ 
        error: 'Respuesta vacía',
        respuesta: 'Lo siento, no pude generar una respuesta. Intenta de nuevo.'
      }, 500)
    }

    return c.json({
      success: true,
      respuesta,
      tokens_usados: result.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error('Error en chat de GaliA:', error)
    return c.json({ 
      error: 'Error interno',
      respuesta: 'Lo siento, he tenido un error técnico. Por favor, intenta de nuevo en un momento.'
    }, 500)
  }
})

export default galia
