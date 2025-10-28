# 🎨 Diseñador Virtual de Cortinas - Especificaciones Completas

## 🎯 OBJETIVO

Crear un módulo revolucionario que permita a los clientes **visualizar cómo quedarán las cortinas en su espacio real** usando IA, aumentando la tasa de cierre de ventas del 30-40% al 70-80%.

---

## 💡 PROPUESTA DE VALOR

### Para el Cliente:
- ✅ **Ve el resultado antes de comprar** - Elimina incertidumbre
- ✅ **Prueba infinitas opciones** - Sin compromiso
- ✅ **Comparte con familia** - Decisión colaborativa
- ✅ **Presupuesto instantáneo** - Con foto incluida

### Para Ana (Propietaria):
- ✅ **Cierre x2** - Cliente convencido antes de comprar
- ✅ **Ticket medio +50%** - Upselling visual
- ✅ **Diferenciación brutal** - Única en su zona
- ✅ **Lead generation** - Captura automática de contactos
- ✅ **Viralizable** - Clientes comparten resultados

---

## 🔄 FLUJO COMPLETO DEL USUARIO

### PASO 1: Inicio de Proyecto
```
Usuario entra a "Diseñador Virtual"
├─ Ve galería de proyectos anteriores (si tiene)
├─ Botón grande: "Nuevo Proyecto"
└─ Click → Pantalla de upload
```

### PASO 2: Upload de Imagen
```
Pantalla de upload
├─ Zona drag & drop (arrastrar foto)
├─ Click para seleccionar desde galería
├─ Previsualización inmediata
└─ Botón "Analizar Espacio"
```

### PASO 3: Análisis con IA (Automático - 5 segundos)
```
Gemini Vision analiza:
├─ Detecta ventanas (ubicación y dimensiones)
├─ Identifica estilo decorativo (moderno/clásico/rústico)
├─ Extrae colores predominantes
├─ Evalúa nivel de luz natural
└─ Sugiere telas compatibles

Resultado mostrado:
"🏠 Salón moderno de 25m²
📏 Ventana detectada: 2.5m x 2.0m
🎨 Colores: Beige, gris claro
💡 Luz natural: Alta
✨ Te recomendamos: Lino, Algodón, Seda"
```

### PASO 4: Selección de Opciones
```
Interfaz dividida en 3 secciones:

[IZQUIERDA: Imagen Original]
- Foto del salón
- Marcadores de ventanas detectadas
- Dimensiones calculadas

[CENTRO: Configuración]
📦 Catálogo de Telas (filtrable)
├─ Por categoría (Telas, Forros)
├─ Por opacidad (Transparente/Traslúcida/Opaca/Blackout)
├─ Por color
└─ Por precio

Cada tela muestra:
- Foto/textura
- Nombre y referencia
- Precio por m²
- Características (opacidad, composición)
- Stock disponible

🎨 Tipo de Cortina
☐ Ondas francesas
☐ Panel japonés  
☐ Pliegues rectos
☐ Estor enrollable

⚙️ Opciones Extra
☐ Forro térmico (+15€/m²)
☐ Motorizada (+180€)
☐ Doble cortina (capa + blackout)

[DERECHA: Preview en tiempo real]
- Cálculo de metraje automático
- Precio estimado actualizado en vivo
- Botón "Generar Visualizaciones"
```

### PASO 5: Generación con IA (15-20 segundos)
```
IA genera 3 variantes:
1. Luz diurna (luz natural entrando)
2. Atardecer (luz cálida)
3. Noche (luz artificial interior)

Cada imagen:
- Fotorrealista
- Cortina integrada naturalmente
- Iluminación coherente
- Sombras y pliegues realistas
```

### PASO 6: Comparador Visual
```
Galería de resultados:
┌──────────┬──────────┬──────────┬──────────┐
│ Original │ Diurna   │ Atardecer│  Noche   │
└──────────┴──────────┴──────────┴──────────┘

Funcionalidades:
- Click para ampliar
- Slider antes/después
- Botón "Me gusta" (marca favorita)
- Botón "Probar otra tela" (volver atrás)
- Botón "Generar Presupuesto"
```

### PASO 7: Presupuesto Automático
```
Al hacer click en "Generar Presupuesto":

Sistema calcula:
├─ Metraje total (ancho x2.5 x alto + dobladillos)
├─ Precio tela (metraje x precio/m²)
├─ Accesorios (rieles, ganchos, soportes)
├─ Confección (horas x tarifa)
├─ Instalación (complejidad x tarifa)
└─ Total con IVA

PDF generado incluye:
- Foto "antes" y "después"
- Desglose detallado
- Características de la tela
- Garantía y condiciones
- QR para aprobar online
- Logo Anushka Hogar
```

### PASO 8: Compartir y Guardar
```
Opciones finales:
📱 Compartir por WhatsApp
   "¡Mira cómo quedarán nuestras cortinas! 😍"
   [Imagen + Link al presupuesto]

📧 Enviar por Email
   - A cliente
   - A familiar/pareja para opinión
   - Incluye presupuesto adjunto

💾 Guardar Proyecto
   - En galería personal
   - Accesible desde cualquier dispositivo
   - Puede editarlo después

✅ Confirmar y Crear Trabajo
   - Convierte a trabajo real
   - Asigna empleada
   - Programa fecha instalación
```

---

## 🎨 DISEÑO DE LA INTERFAZ

### Estilo Visual:
- **Header:** Degradado morado/azul (como GALI)
- **Cards:** Blancas con sombras suaves
- **Botones principales:** Gradient purple→blue
- **Botones secundarios:** Gray outline
- **Estados:**
  - Cargando: Spinner con "Analizando con IA..."
  - Éxito: Check verde con mensaje
  - Error: X rojo con retry

### Iconografía:
- 📷 Upload: Icono cámara
- 🔍 Análisis: Icono lupa con IA
- 🎨 Telas: Icono paleta
- ⚙️ Opciones: Icono engranaje
- ✨ Generar: Icono varita mágica
- 📊 Presupuesto: Icono calculadora
- 📱 Compartir: Icono share

---

## 🤖 INTEGRACIÓN DE IAs

### 1. Gemini Vision (Análisis)
**Endpoint:** `POST /api/diseno/analizar`

**Input:**
```json
{
  "image_url": "https://r2.cloudflare.com/...",
  "cliente_id": 123
}
```

**Prompt a Gemini:**
```
Analiza esta imagen de un espacio interior donde se instalarán cortinas.

Extrae:
1. Dimensiones aproximadas de ventanas (ancho x alto en metros)
2. Estilo decorativo (moderno/clásico/rústico/minimalista/bohemio)
3. Colores predominantes (códigos hex)
4. Nivel de luz natural (bajo/medio/alto)
5. Materiales existentes (madera/metal/textil)
6. Características especiales (techos altos, ventanales grandes, etc.)

Responde en JSON:
{
  "ventanas": [{
    "ubicacion": "pared frontal",
    "ancho_aprox": 2.5,
    "alto_aprox": 2.0,
    "forma": "rectangular"
  }],
  "estilo": "moderno",
  "colores": ["#F5F5DC", "#36454F"],
  "luz_natural": "alta",
  "materiales": ["madera", "textil"],
  "recomendaciones": ["Lino natural", "Algodón"]
}
```

**Output:**
```json
{
  "success": true,
  "analisis": { ... },
  "proyecto_id": 456
}
```

---

### 2. Image Generation (Visualización)
**Endpoint:** `POST /api/diseno/generar`

**Opciones de IA a usar:**

**OPCIÓN A: fal-ai/nano-banana (RECOMENDADO)**
- Mejor para edición de imágenes existentes
- Inpainting preciso
- Mantiene coherencia con foto original
- Rápido (15-20s)
- Precio: ~$0.03/imagen

**OPCIÓN B: flux-pro/kontext/pro**
- Excelente calidad
- Bueno para múltiples referencias
- Más caro pero resultados top
- Precio: ~$0.10/imagen

**Input:**
```json
{
  "proyecto_id": 456,
  "image_url": "https://r2.cloudflare.com/original.jpg",
  "tela": {
    "nombre": "Lino Natural Beige",
    "textura_url": "/static/telas/lino-beige.jpg",
    "color": "#F5F5DC",
    "opacidad": "traslúcida"
  },
  "tipo_cortina": "ondas_francesas",
  "iluminacion": "diurna"
}
```

**Prompt para IA:**
```
Edit this interior photo to add curtains to the window.

Curtain specifications:
- Fabric: Linen texture, beige color (#F5F5DC)
- Style: French pleats, hanging from ceiling
- Opacity: Semi-translucent (light filtering)
- Length: Floor-length
- Lighting: Daytime natural light

Requirements:
- Photorealistic integration
- Natural shadows and folds
- Maintain original room details
- Coherent lighting across scene
- Professional interior design quality

DO NOT change anything else in the room.
```

**Output:**
```json
{
  "success": true,
  "imagenes": [
    "https://r2.cloudflare.com/generated-diurna.jpg",
    "https://r2.cloudflare.com/generated-atardecer.jpg",
    "https://r2.cloudflare.com/generated-noche.jpg"
  ],
  "tiempo_generacion": 18.5
}
```

---

## 📊 BASE DE DATOS

### Tabla: `proyectos_diseno`
```sql
CREATE TABLE proyectos_diseno (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER,
  nombre_proyecto TEXT,
  imagen_original_url TEXT,
  analisis_ia TEXT, -- JSON
  tela_nombre TEXT,
  tipo_cortina TEXT,
  imagenes_generadas TEXT, -- JSON array
  imagen_seleccionada_url TEXT,
  metraje_calculado REAL,
  precio_total REAL,
  estado TEXT, -- borrador/compartido/presupuestado
  presupuesto_id INTEGER,
  created_at DATETIME
);
```

### Tabla: `catalogo_telas`
```sql
CREATE TABLE catalogo_telas (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  referencia TEXT UNIQUE,
  categoria_id INTEGER,
  opacidad TEXT,
  color_principal TEXT,
  color_hex TEXT,
  textura TEXT,
  imagen_muestra_url TEXT,
  precio_metro REAL,
  stock_metros REAL,
  veces_usado INTEGER,
  created_at DATETIME
);
```

---

## 📱 RESPONSIVE DESIGN

### Desktop (1920x1080)
- 3 columnas (Original | Config | Preview)
- Galería de resultados en grid 2x2
- Comparador lado a lado

### Tablet (768x1024)
- 2 columnas (Original+Config | Preview)
- Galería en carousel horizontal
- Comparador apilado

### Mobile (375x667)
- 1 columna vertical
- Steps wizard (paso a paso)
- Swipe entre opciones
- Botones fijos en bottom

---

## 🔐 PERMISOS Y ACCESO

**Ana Ramos (Propietaria):**
- ✅ Ver todos los proyectos
- ✅ Crear proyectos
- ✅ Editar catálogo de telas
- ✅ Ver estadísticas de uso
- ✅ Exportar proyectos

**Tienda (Empleados):**
- ✅ Ver proyectos propios
- ✅ Crear proyectos
- ✅ Ver catálogo de telas
- ❌ No editar catálogo
- ❌ No ver estadísticas globales

---

## 📈 MÉTRICAS Y ANALYTICS

**Tracking automático:**
- Proyectos creados por día
- Telas más visualizadas
- Telas más convertidas (proyecto → presupuesto)
- Tiempo medio de decisión
- Tasa de conversión (proyecto → venta)
- Proyectos compartidos vs no compartidos
- Precio medio de proyectos cerrados

**Dashboard de Ana:**
```
📊 Diseñador Virtual - Últimos 30 días

Proyectos creados: 47
Presupuestos generados: 32 (68% conversión)
Ventas cerradas: 19 (59% cierre)

🏆 Telas Top 3:
1. Lino Natural Beige - 12 ventas
2. Terciopelo Gris - 8 ventas
3. Blackout Gris Perla - 6 ventas

💰 Ticket medio: €487 (+€87 vs sin diseñador)

📱 Proyectos compartidos: 38 (81%)
   └─ WhatsApp: 29 (76%)
   └─ Email: 9 (24%)
```

---

## 💸 COSTOS OPERATIVOS

### Por Proyecto:
- Gemini Vision (análisis): **GRATIS** (preview hasta mid-2025)
- Image Generation (3 variantes): **€0.09** ($0.03 x 3)
- Cloudflare R2 Storage: **€0.001** (negligible)
- **Total por proyecto: ~€0.10**

### Mensual (estimado 50 proyectos):
- Generaciones: **€4.50**
- Storage: **€0.50**
- **Total mensual: €5.00**

### ROI:
- Inversión: €5/mes
- Incremento ticket medio: +€87/venta
- Ventas extra por mes: +5 (conservador)
- Ingresos adicionales: **+€435/mes**
- **ROI: 8,700%**

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Infraestructura (4 horas)
- ✅ Migración BD creada
- ⏳ Endpoints API básicos
- ⏳ Upload a Cloudflare R2
- ⏳ Integración Gemini Vision

### Fase 2: Frontend Core (6 horas)
- ⏳ Pestaña Diseñador Virtual
- ⏳ Upload de imágenes
- ⏳ Catálogo de telas
- ⏳ Configuración de opciones

### Fase 3: IA Generativa (4 horas)
- ⏳ Integración image generation
- ⏳ Procesamiento background
- ⏳ Galería de resultados
- ⏳ Comparador visual

### Fase 4: Conversión (3 horas)
- ⏳ Cálculo automático de presupuestos
- ⏳ PDF con foto incluida
- ⏳ Compartir por WhatsApp/Email
- ⏳ Guardar en galería

### Fase 5: Testing y Docs (3 horas)
- ⏳ Testing end-to-end
- ⏳ Documentación de uso
- ⏳ Video tutorial para Ana
- ⏳ Deploy a producción

**TOTAL: 20 horas = 2.5 días laborables**

---

## 🎓 DOCUMENTACIÓN PARA ANA

### Manual de Uso:
1. **Cómo crear un proyecto** (con cliente en tienda)
2. **Cómo elegir la mejor tela** (guía rápida)
3. **Cómo interpretar el análisis de IA**
4. **Cómo generar presupuesto desde diseño**
5. **Cómo compartir con cliente**
6. **Cómo gestionar el catálogo de telas**
7. **Cómo ver estadísticas**

### Video Tutorial (5 minutos):
- Caso real: Cliente entra a tienda
- Proceso completo filmado
- Tips de venta durante el proceso
- Cierre de venta con presupuesto visual

---

## 🔮 ROADMAP FUTURO (v2.0)

**Mejoras planificadas:**
- [ ] Detección automática de múltiples ventanas
- [ ] Generación de video (cortina moviéndose)
- [ ] Realidad Aumentada (AR) en móvil
- [ ] Recomendador inteligente de telas por estilo
- [ ] Integración con Instagram (subir directamente)
- [ ] Marketplace de inspiración (galería pública)
- [ ] Comparador de presupuestos (2-3 opciones lado a lado)
- [ ] Calculadora de ahorro energético (con forro térmico)

---

**Estado:** 📝 Especificaciones completas  
**Próximo paso:** Empezar implementación (Fase 1)  
**Tiempo estimado total:** 2.5 días  
**Fecha entrega:** 30-31 octubre 2025
