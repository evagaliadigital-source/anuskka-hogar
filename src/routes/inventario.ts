import { Hono } from 'hono'
import OpenAI from 'openai'

type Bindings = {
  DB: D1Database
  GENSPARK_TOKEN: string
}

const inventario = new Hono<{ Bindings: Bindings }>()

// ============================================
// UTILIDAD: EXTRACCIÓN DE FACTURA CON IA
// ============================================

async function extraerDatosFacturaConIA(archivo_url: string, apiKey: string) {
  try {
    // Inicializar cliente OpenAI
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://www.genspark.ai/api/llm_proxy/v1'
    })

    const prompt = `Eres un experto en extraer datos de facturas de proveedores textiles.

Analiza esta imagen de factura y extrae TODA la información en formato JSON con esta estructura EXACTA:

{
  "proveedor": "Nombre del proveedor",
  "fecha": "YYYY-MM-DD",
  "numero_factura": "Número de factura",
  "lineas": [
    {
      "numero_linea": 1,
      "codigo_proveedor": "Código/Referencia del producto (ej: REF-8831, 8831, etc.)",
      "descripcion": "Descripción completa del producto",
      "cantidad": número entero o decimal,
      "precio_unitario": número decimal,
      "precio_total": número decimal,
      "unidad": "unidad" | "metro" | "juego" | "paquete"
    }
  ],
  "total_factura": número decimal
}

REGLAS IMPORTANTES:
1. Extrae TODAS las líneas de productos
2. Si no encuentras un código de proveedor, intenta identificar cualquier número de referencia
3. Convierte todos los precios a números decimales (sin símbolos de moneda)
4. Si la unidad no está clara, usa "unidad" por defecto
5. Infiere la unidad del contexto (ej: "metros", "uds", "paquetes")
6. Sé preciso con las cantidades y precios

Devuelve SOLO el JSON, sin texto adicional.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Modelo correcto con visión
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: archivo_url,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1 // Baja temperatura para más precisión
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No se pudo extraer contenido de la IA')
    }

    // Parsear JSON (limpiando posibles marcadores de código)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const datos = JSON.parse(jsonStr)

    return {
      success: true,
      datos
    }

  } catch (error) {
    console.error('Error extrayendo datos con IA:', error)
    return {
      success: false,
      error: error.message || 'Error al procesar factura con IA'
    }
  }
}

// GET /api/inventario/categorias - Obtener todas las categorías
inventario.get('/categorias', async (c) => {
  try {
    const categorias = await c.env.DB.prepare(`
      SELECT 
        c.*,
        cp.nombre as categoria_padre_nombre
      FROM categorias_inventario c
      LEFT JOIN categorias_inventario cp ON c.categoria_padre_id = cp.id
      WHERE c.activo = 1
      ORDER BY c.orden ASC
    `).all()

    // Organizar en árbol (padres e hijos)
    const principales = categorias.results.filter(cat => !cat.categoria_padre_id)
    const conHijos = principales.map(padre => ({
      ...padre,
      subcategorias: categorias.results.filter(cat => cat.categoria_padre_id === padre.id)
    }))

    return c.json({
      success: true,
      categorias: conHijos,
      total: categorias.results.length
    })
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    return c.json({ success: false, error: 'Error al obtener categorías' }, 500)
  }
})

// GET /api/inventario/categorias/:id - Obtener una categoría específica
inventario.get('/categorias/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const categoria = await c.env.DB.prepare(`
      SELECT * FROM categorias_inventario WHERE id = ? AND activo = 1
    `).bind(id).first()

    if (!categoria) {
      return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
    }

    return c.json({ success: true, categoria })
  } catch (error) {
    console.error('Error al obtener categoría:', error)
    return c.json({ success: false, error: 'Error al obtener categoría' }, 500)
  }
})

// ============================================
// PROVEEDORES
// ============================================

// GET /api/inventario/proveedores - Listar proveedores
inventario.get('/proveedores', async (c) => {
  try {
    const proveedores = await c.env.DB.prepare(`
      SELECT * FROM proveedores
      WHERE activo = 1
      ORDER BY nombre ASC
    `).all()

    return c.json({
      success: true,
      proveedores: proveedores.results
    })
  } catch (error) {
    console.error('Error al obtener proveedores:', error)
    return c.json({ success: false, error: 'Error al obtener proveedores' }, 500)
  }
})

// POST /api/inventario/proveedores - Crear proveedor
inventario.post('/proveedores', async (c) => {
  try {
    const { nombre, contacto, telefono, email, direccion, notas } = await c.req.json()

    if (!nombre) {
      return c.json({ success: false, error: 'El nombre es obligatorio' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(nombre, contacto || null, telefono || null, email || null, direccion || null, notas || null).run()

    return c.json({
      success: true,
      proveedor_id: result.meta.last_row_id,
      message: 'Proveedor creado correctamente'
    })
  } catch (error) {
    console.error('Error al crear proveedor:', error)
    return c.json({ success: false, error: 'Error al crear proveedor' }, 500)
  }
})

// DELETE /api/inventario/proveedores/:id - Eliminar proveedor (soft delete)
inventario.delete('/proveedores/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Soft delete
    await c.env.DB.prepare(`
      UPDATE proveedores 
      SET activo = 0 
      WHERE id = ?
    `).bind(id).run()

    return c.json({
      success: true,
      message: 'Proveedor eliminado correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar proveedor:', error)
    return c.json({ success: false, error: 'Error al eliminar proveedor' }, 500)
  }
})

// ============================================
// PRODUCTOS
// ============================================

// GET /api/inventario/productos - Listar productos
inventario.get('/productos', async (c) => {
  try {
    const categoria_id = c.req.query('categoria_id')
    const buscar = c.req.query('buscar')
    
    let query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        (SELECT COUNT(*) FROM producto_variantes WHERE producto_id = p.id AND activo = 1) as num_variantes
      FROM productos p
      LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
      WHERE p.activo = 1
    `
    
    const params = []
    
    if (categoria_id) {
      // Buscar si la categoría tiene subcategorías
      const subcategorias = await c.env.DB.prepare(`
        SELECT id FROM categorias_inventario 
        WHERE categoria_padre_id = ? AND activo = 1
      `).bind(categoria_id).all()
      
      if (subcategorias.results.length > 0) {
        // Es categoría padre - incluir ella Y sus subcategorías
        const ids = [categoria_id, ...subcategorias.results.map((s: any) => s.id)]
        const placeholders = ids.map(() => '?').join(',')
        query += ` AND p.categoria_id IN (${placeholders})`
        params.push(...ids)
      } else {
        // Es subcategoría - solo esa
        query += ` AND p.categoria_id = ?`
        params.push(categoria_id)
      }
    }
    
    if (buscar) {
      query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`
      params.push(`%${buscar}%`, `%${buscar}%`)
    }
    
    query += ` ORDER BY p.fecha_creacion DESC`
    
    const productos = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      productos: productos.results
    })
  } catch (error) {
    console.error('Error al obtener productos:', error)
    return c.json({ success: false, error: 'Error al obtener productos' }, 500)
  }
})

// GET /api/inventario/productos/:id - Obtener producto completo (con variantes)
inventario.get('/productos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Obtener producto base
    const producto = await c.env.DB.prepare(`
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.unidades_permitidas,
        c.permite_variantes
      FROM productos p
      LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
      WHERE p.id = ? AND p.activo = 1
    `).bind(id).first()

    if (!producto) {
      return c.json({ success: false, error: 'Producto no encontrado' }, 404)
    }

    // Si tiene variantes, obtenerlas
    let variantes = []
    if (producto.tiene_variantes) {
      const variantesResult = await c.env.DB.prepare(`
        SELECT * FROM producto_variantes
        WHERE producto_id = ? AND activo = 1
        ORDER BY medida_ancho ASC, medida_alto ASC
      `).bind(id).all()
      
      variantes = variantesResult.results
    }

    // Obtener códigos de proveedor (si existen)
    const codigosResult = await c.env.DB.prepare(`
      SELECT 
        ce.*,
        pr.nombre as proveedor_nombre
      FROM producto_codigos_externos ce
      LEFT JOIN proveedores pr ON ce.proveedor_id = pr.id
      WHERE (ce.producto_id = ? OR ce.variante_id IN (
        SELECT id FROM producto_variantes WHERE producto_id = ?
      ))
      AND ce.activo = 1
    `).bind(id, id).all()

    return c.json({
      success: true,
      producto: {
        ...producto,
        variantes,
        codigos_externos: codigosResult.results
      }
    })
  } catch (error) {
    console.error('Error al obtener producto:', error)
    return c.json({ success: false, error: 'Error al obtener producto' }, 500)
  }
})

// POST /api/inventario/productos - Crear producto (con variantes opcionales)
inventario.post('/productos', async (c) => {
  try {
    const data = await c.req.json()
    const { 
      nombre, 
      categoria_id, 
      descripcion, 
      precio_base, 
      stock_actual, 
      stock_minimo, 
      unidad,
      imagen_url,
      notas,
      tiene_variantes,
      variantes, // Array de variantes si tiene_variantes = 1
      // Nuevos campos de compra
      proveedor_id,
      codigo_proveedor,
      ean,
      coste_base
    } = data

    // Validaciones básicas
    if (!nombre || !categoria_id) {
      return c.json({ success: false, error: 'Nombre y categoría son obligatorios' }, 400)
    }

    // Insertar producto base
    const productoResult = await c.env.DB.prepare(`
      INSERT INTO productos (
        nombre, categoria_id, descripcion, precio_base, stock_actual, 
        stock_minimo, unidad, imagen_url, notas, tiene_variantes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nombre,
      categoria_id,
      descripcion || null,
      precio_base || null,
      stock_actual || 0,
      stock_minimo || 0,
      unidad || null,
      imagen_url || null,
      notas || null,
      tiene_variantes ? 1 : 0
    ).run()

    const producto_id = productoResult.meta.last_row_id

    // Si tiene código de proveedor, guardarlo
    if (proveedor_id && codigo_proveedor) {
      await c.env.DB.prepare(`
        INSERT INTO producto_codigos_externos (
          producto_id, variante_id, proveedor_id, codigo_proveedor, 
          ean, coste_ultima_compra, fecha_ultima_compra
        ) VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
      `).bind(
        producto_id,
        null, // Es del producto, no de variante
        proveedor_id,
        codigo_proveedor,
        ean || null,
        coste_base || null
      ).run()
    }

    // Si tiene variantes, insertarlas
    if (tiene_variantes && variantes && variantes.length > 0) {
      for (const variante of variantes) {
        const sku = variante.sku_interno || `SKU-${producto_id}-${Date.now()}`
        
        const varianteResult = await c.env.DB.prepare(`
          INSERT INTO producto_variantes (
            producto_id, sku_interno, nombre_variante, 
            medida_ancho, medida_alto, medida_texto,
            color, tejido, precio, stock_actual, stock_minimo, unidad
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          producto_id,
          sku,
          variante.nombre_variante || null,
          variante.medida_ancho || null,
          variante.medida_alto || null,
          variante.medida_texto || null,
          variante.color || null,
          variante.tejido || null,
          variante.precio,
          variante.stock_actual || 0,
          variante.stock_minimo || 0,
          variante.unidad
        ).run()
        
        const variante_id = varianteResult.meta.last_row_id
        
        // Si la variante tiene coste_unitario, guardarlo
        if (proveedor_id && variante.coste_unitario) {
          await c.env.DB.prepare(`
            INSERT INTO producto_codigos_externos (
              producto_id, variante_id, proveedor_id, codigo_proveedor, 
              ean, coste_ultima_compra, fecha_ultima_compra
            ) VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
          `).bind(
            producto_id,
            variante_id,
            proveedor_id,
            codigo_proveedor || `${codigo_proveedor}-${variante.medida_texto}`,
            ean || null,
            variante.coste_unitario
          ).run()
        }
      }
    }

    return c.json({
      success: true,
      producto_id,
      message: 'Producto creado correctamente'
    })
  } catch (error) {
    console.error('Error al crear producto:', error)
    return c.json({ success: false, error: 'Error al crear producto' }, 500)
  }
})

// PUT /api/inventario/productos/:id - Actualizar producto
inventario.put('/productos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const { 
      nombre, 
      categoria_id, 
      descripcion, 
      precio_base, 
      stock_actual, 
      stock_minimo, 
      unidad,
      imagen_url,
      notas
    } = data

    await c.env.DB.prepare(`
      UPDATE productos
      SET nombre = ?, categoria_id = ?, descripcion = ?, 
          precio_base = ?, stock_actual = ?, stock_minimo = ?, 
          unidad = ?, imagen_url = ?, notas = ?,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      nombre,
      categoria_id,
      descripcion || null,
      precio_base || null,
      stock_actual || 0,
      stock_minimo || 0,
      unidad || null,
      imagen_url || null,
      notas || null,
      id
    ).run()

    return c.json({
      success: true,
      message: 'Producto actualizado correctamente'
    })
  } catch (error) {
    console.error('Error al actualizar producto:', error)
    return c.json({ success: false, error: 'Error al actualizar producto' }, 500)
  }
})

// DELETE /api/inventario/productos/:id - Eliminar producto (soft delete)
inventario.delete('/productos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE productos SET activo = 0 WHERE id = ?
    `).bind(id).run()

    return c.json({
      success: true,
      message: 'Producto eliminado correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar producto:', error)
    return c.json({ success: false, error: 'Error al eliminar producto' }, 500)
  }
})

// ============================================
// VARIANTES
// ============================================

// POST /api/inventario/productos/:id/variantes - Añadir variante a producto
inventario.post('/productos/:id/variantes', async (c) => {
  try {
    const producto_id = c.req.param('id')
    const data = await c.req.json()
    
    const {
      nombre_variante,
      medida_ancho,
      medida_alto,
      medida_texto,
      color,
      tejido,
      precio,
      stock_actual,
      stock_minimo,
      unidad
    } = data

    // Generar SKU automático
    const sku = `SKU-${producto_id}-${Date.now()}`

    const result = await c.env.DB.prepare(`
      INSERT INTO producto_variantes (
        producto_id, sku_interno, nombre_variante, 
        medida_ancho, medida_alto, medida_texto,
        color, tejido, precio, stock_actual, stock_minimo, unidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      producto_id,
      sku,
      nombre_variante || null,
      medida_ancho || null,
      medida_alto || null,
      medida_texto || null,
      color || null,
      tejido || null,
      precio,
      stock_actual || 0,
      stock_minimo || 0,
      unidad
    ).run()

    // Actualizar flag tiene_variantes en producto
    await c.env.DB.prepare(`
      UPDATE productos SET tiene_variantes = 1 WHERE id = ?
    `).bind(producto_id).run()

    return c.json({
      success: true,
      variante_id: result.meta.last_row_id,
      message: 'Variante añadida correctamente'
    })
  } catch (error) {
    console.error('Error al añadir variante:', error)
    return c.json({ success: false, error: 'Error al añadir variante' }, 500)
  }
})

// PUT /api/inventario/variantes/:id - Actualizar variante
inventario.put('/variantes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const {
      nombre_variante,
      medida_ancho,
      medida_alto,
      medida_texto,
      color,
      tejido,
      precio,
      stock_actual,
      stock_minimo
    } = data

    await c.env.DB.prepare(`
      UPDATE producto_variantes
      SET nombre_variante = ?, medida_ancho = ?, medida_alto = ?, 
          medida_texto = ?, color = ?, tejido = ?, precio = ?,
          stock_actual = ?, stock_minimo = ?
      WHERE id = ?
    `).bind(
      nombre_variante || null,
      medida_ancho || null,
      medida_alto || null,
      medida_texto || null,
      color || null,
      tejido || null,
      precio,
      stock_actual || 0,
      stock_minimo || 0,
      id
    ).run()

    return c.json({
      success: true,
      message: 'Variante actualizada correctamente'
    })
  } catch (error) {
    console.error('Error al actualizar variante:', error)
    return c.json({ success: false, error: 'Error al actualizar variante' }, 500)
  }
})

// DELETE /api/inventario/variantes/:id - Eliminar variante
inventario.delete('/variantes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE producto_variantes SET activo = 0 WHERE id = ?
    `).bind(id).run()

    return c.json({
      success: true,
      message: 'Variante eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar variante:', error)
    return c.json({ success: false, error: 'Error al eliminar variante' }, 500)
  }
})

// ============================================
// ACTUALIZAR STOCK (usado por importación de facturas)
// ============================================

// POST /api/inventario/actualizar-stock - Actualizar stock de producto/variante
inventario.post('/actualizar-stock', async (c) => {
  try {
    const { producto_id, variante_id, cantidad, operacion } = await c.req.json()
    // operacion: 'sumar' o 'restar' o 'establecer'

    if (!operacion || !cantidad) {
      return c.json({ success: false, error: 'Operación y cantidad son obligatorios' }, 400)
    }

    let query = ''
    let id = null

    if (variante_id) {
      // Actualizar stock de variante
      id = variante_id
      if (operacion === 'sumar') {
        query = `UPDATE producto_variantes SET stock_actual = stock_actual + ? WHERE id = ?`
      } else if (operacion === 'restar') {
        query = `UPDATE producto_variantes SET stock_actual = stock_actual - ? WHERE id = ?`
      } else {
        query = `UPDATE producto_variantes SET stock_actual = ? WHERE id = ?`
      }
    } else if (producto_id) {
      // Actualizar stock de producto
      id = producto_id
      if (operacion === 'sumar') {
        query = `UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?`
      } else if (operacion === 'restar') {
        query = `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`
      } else {
        query = `UPDATE productos SET stock_actual = ? WHERE id = ?`
      }
    } else {
      return c.json({ success: false, error: 'Debe especificar producto_id o variante_id' }, 400)
    }

    await c.env.DB.prepare(query).bind(cantidad, id).run()

    return c.json({
      success: true,
      message: 'Stock actualizado correctamente'
    })
  } catch (error) {
    console.error('Error al actualizar stock:', error)
    return c.json({ success: false, error: 'Error al actualizar stock' }, 500)
  }
})

export default inventario

// ============================================
// IMPORTAR FACTURA CON IA
// ============================================

// POST /api/inventario/importar-factura - Procesar factura con IA
inventario.post('/importar-factura', async (c) => {
  try {
    const { archivo_url, proveedor_id } = await c.req.json()
    
    if (!archivo_url) {
      return c.json({ success: false, error: 'Se requiere el archivo de la factura' }, 400)
    }

    console.log('🤖 Procesando factura con IA Vision...')
    console.log('📄 URL:', archivo_url)
    
    // Extraer datos con GPT-4o Vision
    const extraccionResult = await extraerDatosFacturaConIA(archivo_url, c.env.GENSPARK_TOKEN)
    
    if (!extraccionResult.success) {
      return c.json({ 
        success: false, 
        error: 'Error al extraer datos de la factura: ' + extraccionResult.error 
      }, 500)
    }

    const datosFactura = extraccionResult.datos
    const lineasExtraidas = datosFactura.lineas || []
    
    console.log(`✅ Extraídas ${lineasExtraidas.length} líneas de la factura`)
    console.log('📊 Proveedor detectado:', datosFactura.proveedor)
    console.log('📅 Fecha:', datosFactura.fecha)
    
    // NUEVO: Buscar si el proveedor existe en la BD
    let proveedorEncontrado = null
    if (proveedor_id) {
      // Usuario ya seleccionó proveedor manualmente
      const prov = await c.env.DB.prepare(`
        SELECT * FROM proveedores WHERE id = ? AND activo = 1
      `).bind(proveedor_id).first()
      proveedorEncontrado = prov
    } else if (datosFactura.proveedor) {
      // Buscar por nombre similar
      const prov = await c.env.DB.prepare(`
        SELECT * FROM proveedores 
        WHERE activo = 1 
        AND (
          LOWER(nombre) LIKE LOWER(?)
          OR LOWER(?) LIKE LOWER(nombre)
        )
        LIMIT 1
      `).bind(`%${datosFactura.proveedor}%`, `%${datosFactura.proveedor}%`).first()
      
      if (prov) {
        proveedorEncontrado = prov
        console.log(`✅ Proveedor encontrado en BD: ${prov.nombre} (ID: ${prov.id})`)
      } else {
        console.log(`⚠️ Proveedor "${datosFactura.proveedor}" NO encontrado en BD`)
      }
    }

    // Intentar matching automático con productos existentes
    const lineasConMatching = []
    
    for (const linea of lineasExtraidas) {
      let productoEncontrado = null
      let varianteEncontrada = null
      
      // Buscar por código de proveedor si existe proveedor_id
      if (proveedor_id && linea.codigo_proveedor) {
        const codigoResult = await c.env.DB.prepare(`
          SELECT 
            ce.*,
            p.nombre as producto_nombre,
            p.tiene_variantes,
            v.id as variante_id,
            v.nombre_variante,
            v.medida_texto
          FROM producto_codigos_externos ce
          LEFT JOIN productos p ON ce.producto_id = p.id
          LEFT JOIN producto_variantes v ON ce.variante_id = v.id
          WHERE ce.proveedor_id = ? 
            AND ce.codigo_proveedor = ?
            AND ce.activo = 1
        `).bind(proveedor_id, linea.codigo_proveedor).first()
        
        if (codigoResult) {
          productoEncontrado = {
            producto_id: codigoResult.producto_id,
            producto_nombre: codigoResult.producto_nombre,
            variante_id: codigoResult.variante_id,
            variante_nombre: codigoResult.variante_nombre || codigoResult.medida_texto
          }
        }
      }
      
      // Si no se encontró, buscar por similitud de nombre
      if (!productoEncontrado) {
        // Buscar productos con nombre similar
        const similarResult = await c.env.DB.prepare(`
          SELECT 
            p.id as producto_id,
            p.nombre as producto_nombre,
            p.tiene_variantes,
            v.id as variante_id,
            v.nombre_variante,
            v.medida_texto
          FROM productos p
          LEFT JOIN producto_variantes v ON p.id = v.producto_id
          WHERE p.activo = 1
            AND (
              p.nombre LIKE ? 
              OR v.nombre_variante LIKE ?
              OR v.medida_texto LIKE ?
            )
          LIMIT 5
        `).bind(
          `%${linea.descripcion.split(' ')[0]}%`,
          `%${linea.descripcion.split(' ')[0]}%`,
          `%${linea.descripcion.split(' ')[0]}%`
        ).all()
        
        if (similarResult.results && similarResult.results.length > 0) {
          // Retornar sugerencias
          productoEncontrado = {
            sugerencias: similarResult.results.map(r => ({
              producto_id: r.producto_id,
              producto_nombre: r.producto_nombre,
              variante_id: r.variante_id,
              variante_nombre: r.variante_nombre || r.medida_texto
            }))
          }
        }
      }
      
      // Formato esperado por el frontend
      const lineaFormateada: any = {
        numero_linea: linea.numero_linea || lineasConMatching.length + 1,
        codigo_proveedor: linea.codigo_proveedor,
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        precio_total: linea.precio_total || (linea.cantidad * linea.precio_unitario),
        coincidencia: null,
        sugerencias: []
      }
      
      if (productoEncontrado) {
        if (productoEncontrado.sugerencias) {
          // Tiene sugerencias pero no coincidencia exacta
          lineaFormateada.sugerencias = productoEncontrado.sugerencias.map((sug: any, idx: number) => ({
            producto_id: sug.producto_id,
            variante_id: sug.variante_id,
            nombre: `${sug.producto_nombre}${sug.variante_nombre ? ' - ' + sug.variante_nombre : ''}`,
            similitud: 0.9 - (idx * 0.1) // Simulamos un score de similitud
          }))
        } else {
          // Coincidencia exacta
          lineaFormateada.coincidencia = {
            tipo: 'codigo_proveedor',
            producto_id: productoEncontrado.producto_id,
            variante_id: productoEncontrado.variante_id,
            nombre_producto: productoEncontrado.producto_nombre,
            medida: productoEncontrado.variante_nombre
          }
        }
      }
      
      lineasConMatching.push(lineaFormateada)
    }

    const totalCoincidencias = lineasConMatching.filter(l => l.coincidencia !== null).length

    return c.json({
      success: true,
      lineas: lineasConMatching,
      total_lineas: lineasExtraidas.length,
      total_coincidencias: totalCoincidencias,
      total_sin_coincidencia: lineasExtraidas.length - totalCoincidencias,
      info_factura: {
        proveedor: datosFactura.proveedor,
        fecha: datosFactura.fecha,
        numero_factura: datosFactura.numero_factura,
        total: datosFactura.total_factura
      },
      // NUEVO: Info del proveedor
      proveedor_encontrado: proveedorEncontrado ? {
        id: proveedorEncontrado.id,
        nombre: proveedorEncontrado.nombre,
        existe: true
      } : {
        nombre: datosFactura.proveedor,
        existe: false,
        sugerencia: 'Crear proveedor antes de continuar'
      }
    })
    
  } catch (error) {
    console.error('Error procesando factura:', error)
    return c.json({ success: false, error: 'Error al procesar factura' }, 500)
  }
})

// POST /api/inventario/confirmar-importacion - Confirmar y actualizar stock
inventario.post('/confirmar-importacion', async (c) => {
  try {
    const { lineas, proveedor_id } = await c.req.json()
    
    if (!lineas || !Array.isArray(lineas)) {
      return c.json({ success: false, error: 'Se requieren las líneas de la factura' }, 400)
    }

    let actualizadas = 0
    let errores = []

    for (const linea of lineas) {
      try {
        const { producto_id, variante_id, cantidad, precio_unitario, codigo_proveedor } = linea
        
        if (!producto_id && !variante_id) {
          errores.push(`Línea sin producto asignado: ${linea.descripcion}`)
          continue
        }

        // Actualizar stock
        if (variante_id) {
          await c.env.DB.prepare(`
            UPDATE producto_variantes 
            SET stock_actual = stock_actual + ?
            WHERE id = ?
          `).bind(cantidad, variante_id).run()
        } else if (producto_id) {
          await c.env.DB.prepare(`
            UPDATE productos 
            SET stock_actual = stock_actual + ?
            WHERE id = ?
          `).bind(cantidad, producto_id).run()
        }

        // Guardar/actualizar código de proveedor si no existe
        if (proveedor_id && codigo_proveedor) {
          const existeCodigo = await c.env.DB.prepare(`
            SELECT id FROM producto_codigos_externos
            WHERE proveedor_id = ? AND codigo_proveedor = ?
          `).bind(proveedor_id, codigo_proveedor).first()

          if (!existeCodigo) {
            await c.env.DB.prepare(`
              INSERT INTO producto_codigos_externos (
                producto_id, variante_id, proveedor_id, 
                codigo_proveedor, coste_ultima_compra, fecha_ultima_compra
              ) VALUES (?, ?, ?, ?, ?, DATE('now'))
            `).bind(
              producto_id || null,
              variante_id || null,
              proveedor_id,
              codigo_proveedor,
              precio_unitario
            ).run()
          } else {
            // Actualizar coste
            await c.env.DB.prepare(`
              UPDATE producto_codigos_externos
              SET coste_ultima_compra = ?,
                  fecha_ultima_compra = DATE('now')
              WHERE proveedor_id = ? AND codigo_proveedor = ?
            `).bind(precio_unitario, proveedor_id, codigo_proveedor).run()
          }
        }

        actualizadas++
        
      } catch (error) {
        console.error('Error procesando línea:', error)
        errores.push(`Error en: ${linea.descripcion}`)
      }
    }

    return c.json({
      success: true,
      actualizadas,
      errores,
      message: `Stock actualizado: ${actualizadas} productos`
    })
    
  } catch (error) {
    console.error('Error confirmando importación:', error)
    return c.json({ success: false, error: 'Error al confirmar importación' }, 500)
  }
})
