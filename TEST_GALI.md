# 🧪 Testing de GALI - Consultor IA

## ⏱️ Test Rápido (2 minutos)

### 🌐 URL de Acceso
**Login:** https://3000-igloyhvlo0thgdvq5z280-8f57ffe2.sandbox.novita.ai/static/login.html

---

## ✅ TEST 1: Acceso al Chat (30 segundos)

**Pasos:**
1. **Login** con tus credenciales (Ana Ramos o Tienda)
2. Busca la pestaña **"Consultor IA"** (icono 🤖)
3. **Click** en la pestaña

**✅ Resultado esperado:**
- Se abre interfaz de chat con header morado/azul
- Ves el mensaje de bienvenida de GALI
- Hay 4 badges: Cortinas, Facturación, Clientes, Tips
- Input de texto al fondo con botones rápidos

---

## ✅ TEST 2: Pregunta sobre Cortinas (1 minuto)

**Escribe en el chat:**
```
¿Cómo calculo el metraje para cortinas?
```

**✅ Resultado esperado:**
- Aparece tu mensaje a la derecha (fondo morado)
- GALI muestra "escribiendo..." (3 puntitos animados)
- Respuesta de GALI aparece a la izquierda (fondo blanco)
- Respuesta incluye:
  - 📏 Icono de regla
  - Fórmula del ancho (x2 o x2.5)
  - Fórmula del alto (+ dobladillos)
  - Ejemplo práctico con números
  - Tips profesionales con 💡

---

## ✅ TEST 3: Pregunta sobre VerificaTu (1 minuto)

**Click en botón rápido:**
```
📄 VerificaTu
```

**✅ Resultado esperado:**
- Mensaje enviado automáticamente
- Respuesta de GALI con:
  - 📄 Explicación de qué es VerificaTu
  - Pasos para implementarlo
  - Cómo usarlo en Anushka Hogar
  - Tips prácticos

---

## ✅ TEST 4: Pregunta sobre Ventas (1 minuto)

**Click en botón rápido:**
```
💰 Tips de venta
```

**✅ Resultado esperado:**
- Respuesta estructurada con:
  - 5 técnicas numeradas
  - Consejos específicos para cortinas
  - Cómo manejar objeciones
  - Técnica del "Sí escalonado"
  - Referencia a la herramienta

---

## ✅ TEST 5: Pregunta sobre la Herramienta (1 minuto)

**Escribe:**
```
¿Cómo uso el sistema de categorías?
```

**✅ Resultado esperado:**
- Respuesta detallada sobre:
  - Cómo crear/editar categorías
  - Las 7 categorías pre-cargadas
  - Cómo añadir productos a categorías
  - Cómo filtrar inventario
  - Ventajas del sistema

---

## ✅ TEST 6: Pregunta Genérica (30 segundos)

**Escribe:**
```
hola
```

**✅ Resultado esperado:**
- Mensaje de bienvenida general
- Lista de las 4 especialidades
- Preguntas frecuentes sugeridas
- Invitación a preguntar

---

## 🎯 Checklist Visual

Verifica que:
- [ ] Header del chat es morado/azul degradado
- [ ] Avatar de GALI es un robot 🤖 morado
- [ ] Tus mensajes aparecen a la DERECHA (fondo morado)
- [ ] Mensajes de GALI a la IZQUIERDA (fondo blanco)
- [ ] Botones rápidos están debajo del input
- [ ] Input tiene placeholder descriptivo
- [ ] Botón "Enviar" tiene icono de avioncito ✈️
- [ ] Animación de "escribiendo..." funciona
- [ ] Scroll automático al final al enviar mensaje

---

## 🔥 Test de Funcionalidades Avanzadas

### Test de Enter para Enviar
1. Escribe un mensaje
2. Presiona **Enter** (sin hacer click en botón)
3. ✅ Debe enviarse el mensaje

### Test de Múltiples Preguntas
1. Haz 3 preguntas seguidas:
   - "¿Cómo calculo metraje?"
   - "¿Qué es VerificaTu?"
   - "Dame tips de venta"
2. ✅ Todas deben responderse correctamente
3. ✅ Historial se mantiene visible

### Test de Formato Markdown
1. Pregunta: "Dame tips de venta"
2. Verifica que la respuesta tenga:
   - ✅ **Negritas** en títulos
   - ✅ Números y viñetas
   - ✅ Emojis visibles
   - ✅ Saltos de línea correctos

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: No aparece la pestaña "Consultor IA"
**Causa:** Error al cargar la página  
**Solución:** Refresca el navegador (F5)

### Problema 2: GALI no responde
**Causa:** Error en el endpoint API  
**Solución:** 
```bash
# Ver logs del servicio
pm2 logs anushka-hogar --nostream

# Reiniciar servicio
pm2 restart anushka-hogar
```

### Problema 3: Respuesta aparece mal formateada
**Causa:** Problema con el formateo de markdown  
**Solución:** Es cosmético, no afecta funcionalidad

### Problema 4: Input no responde al Enter
**Causa:** Error en event listener  
**Solución:** Usa el botón "Enviar"

---

## 📊 Métricas de Éxito

**Test APROBADO si:**
- ✅ 5 de 6 tests funcionan correctamente
- ✅ Chat responde en menos de 1 segundo
- ✅ Respuestas son coherentes y útiles
- ✅ Formato es legible y estructurado
- ✅ No hay errores en consola JavaScript

**Test FALLIDO si:**
- ❌ GALI no responde a ninguna pregunta
- ❌ Interfaz no carga
- ❌ Errores críticos en consola

---

## 🚀 Próximos Pasos Después del Test

Si todo funciona:
1. ✅ **Prueba preguntas reales** de tu negocio
2. ✅ **Comparte con tu equipo** para que lo prueben
3. ✅ **Documenta preguntas frecuentes** que no estén cubiertas
4. ✅ **Sugiere mejoras** para respuestas específicas

---

## 📞 Reporte de Errores

Si encuentras algún problema:

**Formato de reporte:**
```
🐛 ERROR ENCONTRADO

Pregunta hecha: [tu pregunta]
Respuesta esperada: [lo que esperabas]
Respuesta obtenida: [lo que pasó]
Captura de pantalla: [si es posible]
```

---

## 💡 Preguntas de Prueba Sugeridas

**Para probar más a fondo:**

1. **Negocio de Cortinas:**
   - "¿Qué tela recomiendas para un salón soleado?"
   - "¿Cuántos ganchos necesito por metro?"
   - "¿Cómo instalo rieles en techo de pladur?"

2. **Facturación:**
   - "¿Qué IVA aplico a instalación de cortinas?"
   - "¿Cómo hago una factura rectificativa?"
   - "¿Cuánto tiempo guardo las facturas?"

3. **Ventas:**
   - "Cliente dice que es muy caro, ¿qué hago?"
   - "¿Cómo fidelizo a mis clientes?"
   - "Dame técnicas de cierre de venta"

4. **Herramienta:**
   - "¿Cómo creo un presupuesto?"
   - "¿Para qué sirve el filtro de categorías?"
   - "¿Cómo genero un reporte mensual?"

---

**Estado:** ✅ Listo para testing  
**Fecha:** 2025-10-28  
**Versión:** 1.0
