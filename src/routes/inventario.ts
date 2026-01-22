import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const inventario = new Hono<{ Bindings: Bindings }>()

// ============================================
// CATEGORÍAS
// ============================================

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
      query += ` AND p.categoria_id = ?`
      params.push(categoria_id)
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
      variantes // Array de variantes si tiene_variantes = 1
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

    // Si tiene variantes, insertarlas
    if (tiene_variantes && variantes && variantes.length > 0) {
      for (const variante of variantes) {
        const sku = variante.sku_interno || `SKU-${producto_id}-${Date.now()}`
        
        await c.env.DB.prepare(`
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
