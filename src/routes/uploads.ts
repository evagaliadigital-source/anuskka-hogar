import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
}

const uploads = new Hono<{ Bindings: Bindings }>()

// ============================================
// UPLOAD DE IMÁGENES A R2
// ============================================

// POST - Upload imagen (base64 o multipart/form-data)
uploads.post('/imagen', async (c) => {
  try {
    const { imagen_base64, carpeta, nombre_archivo } = await c.req.json()
    
    if (!imagen_base64) {
      return c.json({ error: 'Imagen no proporcionada' }, 400)
    }
    
    // Extraer el base64 real (sin el prefijo data:image/...)
    const matches = imagen_base64.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return c.json({ error: 'Formato de imagen inválido' }, 400)
    }
    
    const extension = matches[1] // jpg, png, jpeg, webp, etc.
    const base64Data = matches[2]
    
    // Convertir base64 a ArrayBuffer
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Generar nombre único si no se proporciona
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const fileName = nombre_archivo || `${timestamp}-${random}.${extension}`
    const folder = carpeta || 'general'
    const key = `${folder}/${fileName}`
    
    // Subir a R2
    if (c.env.IMAGES) {
      await c.env.IMAGES.put(key, bytes, {
        httpMetadata: {
          contentType: `image/${extension}`
        },
        customMetadata: {
          uploadedAt: new Date().toISOString()
        }
      })
      
      // URL pública (en producción con custom domain)
      const publicUrl = `https://images.anushkahogar.com/${key}`
      
      return c.json({
        success: true,
        url: publicUrl,
        key: key,
        size: bytes.length,
        message: 'Imagen subida correctamente a R2'
      })
    } else {
      // Fallback: Guardar como base64 en BD (desarrollo sin R2)
      console.warn('⚠️ R2 no disponible, usando base64 temporal')
      return c.json({
        success: true,
        url: imagen_base64, // Devolver base64 original
        key: key,
        size: base64Data.length,
        message: '⚠️ Imagen guardada como base64 (R2 no disponible en desarrollo)',
        temporal: true
      })
    }
    
  } catch (error) {
    console.error('Error subiendo imagen:', error)
    return c.json({ error: 'Error al subir imagen' }, 500)
  }
})

// GET - Obtener imagen de R2
uploads.get('/imagen/:carpeta/:nombre', async (c) => {
  try {
    const carpeta = c.req.param('carpeta')
    const nombre = c.req.param('nombre')
    const key = `${carpeta}/${nombre}`
    
    if (!c.env.IMAGES) {
      return c.json({ error: 'R2 no disponible' }, 503)
    }
    
    const object = await c.env.IMAGES.get(key)
    
    if (!object) {
      return c.json({ error: 'Imagen no encontrada' }, 404)
    }
    
    // Servir imagen con headers correctos
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // 1 año
        'ETag': object.httpEtag
      }
    })
  } catch (error) {
    console.error('Error obteniendo imagen:', error)
    return c.json({ error: 'Error al obtener imagen' }, 500)
  }
})

// DELETE - Eliminar imagen de R2
uploads.delete('/imagen/:carpeta/:nombre', async (c) => {
  try {
    const carpeta = c.req.param('carpeta')
    const nombre = c.req.param('nombre')
    const key = `${carpeta}/${nombre}`
    
    if (!c.env.IMAGES) {
      return c.json({ error: 'R2 no disponible' }, 503)
    }
    
    await c.env.IMAGES.delete(key)
    
    return c.json({
      success: true,
      message: 'Imagen eliminada correctamente'
    })
  } catch (error) {
    console.error('Error eliminando imagen:', error)
    return c.json({ error: 'Error al eliminar imagen' }, 500)
  }
})

// GET - Listar imágenes de una carpeta
uploads.get('/imagenes/:carpeta', async (c) => {
  try {
    const carpeta = c.req.param('carpeta')
    
    if (!c.env.IMAGES) {
      return c.json({ error: 'R2 no disponible' }, 503)
    }
    
    const list = await c.env.IMAGES.list({
      prefix: `${carpeta}/`,
      limit: 100
    })
    
    const imagenes = list.objects.map(obj => ({
      key: obj.key,
      url: `https://images.anushkahogar.com/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded,
      httpEtag: obj.httpEtag
    }))
    
    return c.json({
      success: true,
      carpeta: carpeta,
      total: imagenes.length,
      imagenes: imagenes
    })
  } catch (error) {
    console.error('Error listando imágenes:', error)
    return c.json({ error: 'Error al listar imágenes' }, 500)
  }
})

export default uploads
