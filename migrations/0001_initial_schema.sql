-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  codigo_postal TEXT,
  notas TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  activo INTEGER DEFAULT 1
);

-- EMPLEADAS
CREATE TABLE IF NOT EXISTS empleadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  dni TEXT UNIQUE,
  fecha_contratacion DATE NOT NULL,
  salario_hora REAL NOT NULL,
  disponibilidad TEXT, -- JSON: {"lunes": true, "martes": true, ...}
  especialidades TEXT, -- JSON: ["limpieza", "plancha", "cocina"]
  calificacion REAL DEFAULT 5.0,
  activa INTEGER DEFAULT 1,
  notas TEXT
);

-- TRABAJOS
CREATE TABLE IF NOT EXISTS trabajos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  empleada_id INTEGER,
  tipo_servicio TEXT NOT NULL, -- limpieza, plancha, mantenimiento, etc.
  descripcion TEXT,
  direccion TEXT NOT NULL,
  fecha_programada DATETIME NOT NULL,
  fecha_inicio DATETIME,
  fecha_finalizacion DATETIME,
  duracion_estimada INTEGER, -- en minutos
  duracion_real INTEGER, -- en minutos
  estado TEXT DEFAULT 'pendiente', -- pendiente, en_proceso, completado, cancelado
  prioridad TEXT DEFAULT 'normal', -- baja, normal, alta, urgente
  coste_materiales REAL DEFAULT 0,
  coste_mano_obra REAL DEFAULT 0,
  precio_cliente REAL NOT NULL,
  notas TEXT,
  satisfaccion_cliente INTEGER, -- 1-5 estrellas
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (empleada_id) REFERENCES empleadas(id)
);

-- STOCK / INVENTARIO
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL, -- limpieza, mantenimiento, herramientas, etc.
  unidad TEXT NOT NULL, -- unidades, litros, kilos, etc.
  cantidad_actual REAL NOT NULL DEFAULT 0,
  cantidad_minima REAL NOT NULL DEFAULT 10,
  precio_unitario REAL NOT NULL,
  proveedor TEXT,
  ubicacion TEXT,
  fecha_ultima_compra DATE,
  activo INTEGER DEFAULT 1
);

-- MATERIALES USADOS EN TRABAJOS
CREATE TABLE IF NOT EXISTS trabajo_materiales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trabajo_id INTEGER NOT NULL,
  stock_id INTEGER NOT NULL,
  cantidad_usada REAL NOT NULL,
  coste REAL NOT NULL,
  fecha_uso DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id),
  FOREIGN KEY (stock_id) REFERENCES stock(id)
);

-- FACTURACIÓN
CREATE TABLE IF NOT EXISTS facturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  trabajo_id INTEGER,
  numero_factura TEXT UNIQUE NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  subtotal REAL NOT NULL,
  iva REAL DEFAULT 0,
  total REAL NOT NULL,
  estado TEXT DEFAULT 'pendiente', -- pendiente, pagada, vencida
  metodo_pago TEXT, -- efectivo, tarjeta, transferencia
  fecha_pago DATE,
  notas TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id)
);

-- INCIDENCIAS CLIENTES
CREATE TABLE IF NOT EXISTS incidencias_clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  trabajo_id INTEGER,
  tipo TEXT NOT NULL, -- queja, sugerencia, consulta
  descripcion TEXT NOT NULL,
  estado TEXT DEFAULT 'abierta', -- abierta, en_revision, resuelta
  prioridad TEXT DEFAULT 'normal',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion DATETIME,
  resolucion TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id)
);

-- REGISTRO DE HORAS EMPLEADAS
CREATE TABLE IF NOT EXISTS registro_horas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleada_id INTEGER NOT NULL,
  trabajo_id INTEGER,
  fecha DATE NOT NULL,
  horas_trabajadas REAL NOT NULL,
  tipo TEXT DEFAULT 'trabajo', -- trabajo, formacion, reunion
  notas TEXT,
  FOREIGN KEY (empleada_id) REFERENCES empleadas(id),
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id)
);

-- EVALUACIONES DE EMPLEADAS
CREATE TABLE IF NOT EXISTS evaluaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleada_id INTEGER NOT NULL,
  trabajo_id INTEGER,
  fecha DATE NOT NULL,
  puntuacion INTEGER NOT NULL, -- 1-5
  comentarios TEXT,
  evaluador TEXT, -- cliente, supervisor
  FOREIGN KEY (empleada_id) REFERENCES empleadas(id),
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id)
);

-- ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_trabajos_cliente ON trabajos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_empleada ON trabajos(empleada_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_fecha ON trabajos(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_trabajos_estado ON trabajos(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_stock_categoria ON stock(categoria);
CREATE INDEX IF NOT EXISTS idx_incidencias_cliente ON incidencias_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_registro_horas_empleada ON registro_horas(empleada_id);
CREATE INDEX IF NOT EXISTS idx_registro_horas_fecha ON registro_horas(fecha);
