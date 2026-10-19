-- =============================================================================
-- SMARTCHECK ENTERPRISE - ESQUEMA DE BASE DE DATOS POSTGRESQL (DDL + ÍNDICES + AUDITORÍA)
-- Cumple con la Sección 10 de Especificaciones.txt:
-- Tablas: Roles, Áreas, Usuarios, Empleados, Checklists, Preguntas,
--         Respuestas, Evidencias, Estadísticas, Auditoría
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: ROLES
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '[]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: ÁREAS (Arquitectura extensible sin modificar código principal)
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    descripcion TEXT,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    icono VARCHAR(50) NOT NULL DEFAULT 'Building2',
    responsable VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: USUARIOS (Cuentas de acceso y administradores de plataforma)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo VARCHAR(180) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: EMPLEADOS (Catálogo operativo vinculado a Número de Empleado y Área)
CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_empleado VARCHAR(40) NOT NULL UNIQUE,
    nombre_completo VARCHAR(180) NOT NULL,
    correo VARCHAR(150),
    puesto VARCHAR(120),
    area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    usuario_id UUID REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA: PREGUNTAS (Banco dinámico de preguntas por Área)
CREATE TABLE preguntas (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    texto TEXT NOT NULL,
    descripcion_ayuda TEXT,
    orden SMALLINT NOT NULL DEFAULT 1,
    criticidad VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (criticidad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: CHECKLISTS (Ejecuciones de checklist realizadas por empleado/fecha)
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio VARCHAR(40) NOT NULL UNIQUE,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_empleado VARCHAR(40) NOT NULL,
    nombre_empleado VARCHAR(180) NOT NULL,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_operacion DATE NOT NULL DEFAULT CURRENT_DATE,
    total_preguntas SMALLINT NOT NULL DEFAULT 0,
    total_si SMALLINT NOT NULL DEFAULT 0,
    total_no SMALLINT NOT NULL DEFAULT 0,
    porcentaje_cumplimiento NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    porcentaje_incidencias NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    duracion_segundos INTEGER DEFAULT 0,
    dispositivo VARCHAR(120),
    estado VARCHAR(30) NOT NULL DEFAULT 'COMPLETADO' CHECK (estado IN ('EN_PROGRESO', 'COMPLETADO', 'REVISADO')),
    observaciones_generales TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA: RESPUESTAS (Detalle por pregunta: Sí / No + Motivo obligatorio en No)
CREATE TABLE respuestas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON UPDATE CASCADE ON DELETE CASCADE,
    pregunta_id INTEGER NOT NULL REFERENCES preguntas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    respuesta BOOLEAN NOT NULL, -- TRUE = Sí (✅), FALSE = No (❌)
    motivo_no TEXT,
    estado_incidencia VARCHAR(30) DEFAULT 'ABIERTA' CHECK (estado_incidencia IN ('N/A', 'ABIERTA', 'EN_ATENCION', 'RESUELTA')),
    respondido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_motivo_obligatorio_en_no CHECK (
        (respuesta = TRUE) OR (respuesta = FALSE AND motivo_no IS NOT NULL AND LENGTH(TRIM(motivo_no)) > 0)
    ),
    UNIQUE (checklist_id, pregunta_id)
);

-- 8. TABLA: EVIDENCIAS (Fotografías asociadas a respuestas negativas - Azure Blob Storage / Local)
CREATE TABLE evidencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    respuesta_id UUID NOT NULL REFERENCES respuestas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON UPDATE CASCADE ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    formato VARCHAR(20) NOT NULL CHECK (formato IN ('JPG', 'JPEG', 'PNG', 'WEBP')),
    mime_type VARCHAR(60) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    tamano_bytes INTEGER NOT NULL DEFAULT 0,
    blob_url TEXT NOT NULL,
    origen_captura VARCHAR(30) NOT NULL DEFAULT 'GALERIA' CHECK (origen_captura IN ('CAMARA', 'GALERIA', 'DRAG_DROP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLA: ESTADÍSTICAS (Agregaciones consolidadas diarias, semanales y mensuales para BI)
CREATE TABLE estadisticas (
    id SERIAL PRIMARY KEY,
    periodo_tipo VARCHAR(20) NOT NULL CHECK (periodo_tipo IN ('DIARIO', 'SEMANAL', 'MENSUAL')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    total_checklists INTEGER NOT NULL DEFAULT 0,
    total_respuestas INTEGER NOT NULL DEFAULT 0,
    total_si INTEGER NOT NULL DEFAULT 0,
    total_no INTEGER NOT NULL DEFAULT 0,
    porcentaje_cumplimiento NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    porcentaje_incidencias NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    calculado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (periodo_tipo, fecha_inicio, area_id)
);

-- 10. TABLA: AUDITORÍA (Historial inmutable de operaciones y cambios en el sistema)
CREATE TABLE auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_identificador VARCHAR(120) NOT NULL,
    modulo VARCHAR(80) NOT NULL,
    accion VARCHAR(80) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id VARCHAR(120),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(60),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES DE RENDIMIENTO
-- =============================================================================
CREATE INDEX idx_empleados_numero ON empleados(numero_empleado);
CREATE INDEX idx_empleados_area ON empleados(area_id);
CREATE INDEX idx_empleados_activo ON empleados(activo);

CREATE INDEX idx_preguntas_area_orden ON preguntas(area_id, orden) WHERE activo = TRUE;

CREATE INDEX idx_checklists_fecha ON checklists(fecha_operacion DESC);
CREATE INDEX idx_checklists_area_fecha ON checklists(area_id, fecha_operacion DESC);
CREATE INDEX idx_checklists_empleado ON checklists(empleado_id, fecha_operacion DESC);

CREATE INDEX idx_respuestas_checklist ON respuestas(checklist_id);
CREATE INDEX idx_respuestas_incidencias ON respuestas(respuesta, respondido_en DESC) WHERE respuesta = FALSE;

CREATE INDEX idx_evidencias_respuesta ON evidencias(respuesta_id);
CREATE INDEX idx_evidencias_checklist ON evidencias(checklist_id);

CREATE INDEX idx_estadisticas_periodo ON estadisticas(periodo_tipo, fecha_inicio DESC);
CREATE INDEX idx_auditoria_fecha_modulo ON auditoria(created_at DESC, modulo);

-- =============================================================================
-- TRIGGER AUTOMÁTICO DE AUDITORÍA Y ACTUALIZACIÓN DE TIMESTAMPS
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_empleados_updated BEFORE UPDATE ON empleados FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_preguntas_updated BEFORE UPDATE ON preguntas FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON checklists FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- =============================================================================
-- DATOS SEMILLA INICIALES (ROLES Y ÁREAS OBLIGATORIAS)
-- =============================================================================
INSERT INTO roles (codigo, nombre, descripcion, permisos) VALUES
('ADMIN', 'Administrador', 'Acceso total al dashboard ejecutivo, usuarios, áreas, checklists y reportes.', '["*"]'),
('SUPERVISOR', 'Supervisor de Área', 'Consulta de estadísticas, incidencias y reportes de su área.', '["dashboard.read", "reports.export", "checklists.create"]'),
('OPERADOR', 'Empleado / Operador', 'Ejecución de checklists operativos y registro de evidencias.', '["checklists.create"]');

INSERT INTO areas (codigo, nombre, descripcion, color_hex, icono, responsable) VALUES
('INFRA', 'Infraestructura', 'Supervisión de instalaciones físicas, redes, servidores, energía y climatización.', '#2563EB', 'Server', 'Ing. Roberto Méndez'),
('CTRL', 'Control', 'Monitoreo de tableros de control, sensores, automatización, PLC y seguridad operativa.', '#7C3AED', 'Sliders', 'Ing. Laura Gómez'),
('MANT', 'Mantenimiento', 'Mantenimiento preventivo y correctivo de maquinaria, herramientas y equipos críticos.', '#059669', 'Wrench', 'Ing. Carlos Villarreal');
