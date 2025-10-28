# 📄 Generación de PDF - Presupuestos

## ✨ Características Implementadas

### 🎨 Diseño Profesional
- **Header con logo** de Anushka Hogar
- **Datos de empresa**: Dirección, ciudad
- **Colores corporativos**: Gray-800 (primario), Green-500 (acento)
- **Tipografía estructurada**: Títulos bold, textos normal, secundarios en gris

### 📋 Contenido del PDF

#### 1. Header
- Logo Anushka Hogar (placeholder)
- Datos de empresa (esquina superior derecha)
- Línea separadora decorativa

#### 2. Título del Documento
- **PRESUPUESTO** (grande, bold)
- Número de presupuesto (color verde, derecha)

#### 3. Información del Cliente
- Nombre completo
- Dirección completa
- Teléfono y email
- **Fecha de emisión**
- **Estado actual** (pendiente/enviado/aceptado/rechazado)

#### 4. Título y Descripción del Presupuesto
- Título destacado
- Descripción completa (texto largo adaptado)

#### 5. Líneas del Presupuesto - Organizadas por Categorías

Cada categoría se muestra en una tabla profesional:

##### 🧵 TELAS
- Concepto | Cantidad | metros | Precio/m | Subtotal

##### 🔧 MATERIALES
- Concepto | Cantidad | ud | Precio/ud | Subtotal

##### ✂️ CONFECCIÓN
- Concepto | Cantidad | horas | Precio/h | Subtotal

##### 🔨 INSTALACIÓN
- Concepto | Cantidad | horas | Precio/h | Subtotal

#### 6. Totales
- **Subtotal**: Total antes de descuentos e IVA
- **Descuento**: Porcentaje y monto (si aplica)
- **IVA**: Porcentaje y monto
- **TOTAL FINAL**: Destacado en verde con fondo

#### 7. Notas y Condiciones
- **Notas**: Observaciones del presupuesto
- **Condiciones**: Términos y condiciones
- **Forma de pago**: Método de pago acordado

#### 8. Pie de Página (en todas las páginas)
- Número de página (ej: "Página 1 de 2")
- Datos de contacto de Anushka Hogar

### 🔧 Implementación Técnica

**Librerías utilizadas:**
- **jsPDF 2.5.1**: Generación del PDF base
- **jsPDF-AutoTable 3.8.2**: Tablas profesionales automáticas

**CDN incluidos en index.tsx:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
```

**Función principal:**
```javascript
async function downloadPresupuestoPDF(id)
```

**Ubicación:** `/public/static/app-v2.js` (línea ~1917)

### 📊 Características Avanzadas

1. **Paginación Automática**
   - Detecta cuando el contenido excede una página
   - Crea páginas adicionales automáticamente
   - Mantiene el pie de página en todas las páginas

2. **Adaptación de Texto**
   - Descripciones largas se dividen automáticamente
   - Respeta márgenes y legibilidad

3. **Tablas Profesionales**
   - Headers con fondo gris-800
   - Alineación inteligente (números a la derecha, texto a la izquierda)
   - Columnas con anchos optimizados

4. **Nombre de Archivo Inteligente**
   - Formato: `Presupuesto_2025-0001_Rodriguez.pdf`
   - Incluye número de presupuesto y apellido del cliente

### 🎯 Flujo de Uso

1. Usuario hace click en botón 📄 "Descargar PDF"
2. JavaScript hace `GET /api/presupuestos/{id}` para obtener datos completos
3. Se agrupan las líneas por tipo (tela, material, confección, instalación)
4. Se genera el PDF con jsPDF
5. Se crea cada sección con formato profesional
6. Se añaden tablas con autoTable
7. Se calculan y muestran totales
8. Se añade pie de página a todas las páginas
9. Se descarga automáticamente con nombre descriptivo

### ✅ Testing

**Test manual:**
1. Ir a tab "Presupuestos"
2. Click en botón 📄 junto al presupuesto 2025-0001
3. Verificar descarga automática
4. Abrir PDF y verificar:
   - ✅ Header con logo
   - ✅ Datos de cliente correctos
   - ✅ 4 secciones de líneas (telas, materiales, confección, instalación)
   - ✅ Totales correctos (€1,884.03)
   - ✅ Descuento 5% aplicado
   - ✅ IVA 21% aplicado
   - ✅ Notas y condiciones completas
   - ✅ Pie de página en todas las páginas

### 🚀 Mejoras Futuras (Opcionales)

- [ ] **Logo real**: Cargar logo desde `/static/logo.jpg` como imagen
- [ ] **Firma digital**: Espacio para firma del cliente
- [ ] **QR Code**: Para validación online del presupuesto
- [ ] **Colores personalizables**: Según marca del cliente
- [ ] **Plantillas**: Diferentes estilos de PDF
- [ ] **Envío por email**: Integración con servicio de email
- [ ] **Preview antes de descargar**: Modal con vista previa

### 📁 Archivos Modificados

- ✅ `/src/index.tsx` - Añadidos scripts CDN de jsPDF
- ✅ `/public/static/app-v2.js` - Implementada función completa de generación

### 🎨 Paleta de Colores Usada

```javascript
primaryColor: [31, 41, 55]      // gray-800 (textos principales)
secondaryColor: [107, 114, 128]  // gray-500 (textos secundarios)
accentColor: [34, 197, 94]       // green-500 (destacados, total)
```

### 📏 Especificaciones del PDF

- **Tamaño**: A4 (210mm x 297mm)
- **Orientación**: Vertical (portrait)
- **Márgenes**: 20mm izquierda/derecha
- **Fuente**: Helvetica (estándar jsPDF)
- **Tamaños de fuente**:
  - Título: 16pt
  - Subtítulos: 10-12pt
  - Texto normal: 8-9pt
  - Pie de página: 7pt

---

**Fecha de implementación**: 2025-10-27  
**Status**: ✅ Completado y funcionando  
**Probado con**: Presupuesto 2025-0001 (15 líneas, 4 categorías)
