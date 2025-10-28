#!/bin/bash
# Script para verificar y restaurar presupuestos si Vite lo borra

echo "🔍 Verificando presupuestos en src/index.tsx..."

if grep -q "presupuestos" src/index.tsx; then
  echo "✅ Presupuestos OK"
  exit 0
else
  echo "❌ PRESUPUESTOS FALTA - Restaurando desde backup..."
  cp src/index.tsx.PRESUPUESTOS_OK src/index.tsx
  echo "✅ Restaurado desde src/index.tsx.PRESUPUESTOS_OK"
  exit 1
fi
