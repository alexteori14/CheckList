-- =============================================================================
-- SMARTCHECK ENTERPRISE — ESQUEMA FÍSICO DE BASE DE DATOS PARA MYSQL SERVER 8.0+
-- Motor: InnoDB | Codificación: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Cumple con Tercera Forma Normal (3FN) y Reglas de Integridad Referencial
-- Total de Entidades: 9 Tablas (Sin tabla de roles, sin rol en empleados y sin notificaciones)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. BASE DE DATOS
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `smartcheck_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smartcheck_db`;

-- -----------------------------------------------------------------------------
-- 2. TABLA: areas (Catálogo de Departamentos Oficiales y Ventana Horaria)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `areas`;
CREATE TABLE `areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `descripcion` TEXT NULL,
  `color_hex` VARCHAR(20) NOT NULL DEFAULT '#2563EB',
  `icono` VARCHAR(50) NOT NULL DEFAULT 'Building2',
  `responsable` VARCHAR(150) NULL,
  `hora_inicio` VARCHAR(10) NOT NULL DEFAULT '07:00',
  `hora_fin` VARCHAR(10) NOT NULL DEFAULT '08:30',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_areas_codigo` (`codigo`),
  UNIQUE KEY `uk_areas_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: usuarios (Cuentas de Acceso Administrativo al Centro de Control - Rol Embebido)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(80) NOT NULL,
  `email` VARCHAR(150) NULL,
  `password_hash` TEXT NOT NULL,
  `nombre_completo` VARCHAR(180) NOT NULL,
  `rol` VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  `area_id` INT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` DATETIME(3) NULL,
  `intentos_fallidos` SMALLINT NOT NULL DEFAULT 0,
  `bloqueado_hasta` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_usuarios_username` (`username`),
  UNIQUE KEY `uk_usuarios_email` (`email`),
  KEY `idx_usuarios_rol` (`rol`),
  KEY `idx_usuarios_area_id` (`area_id`),
  CONSTRAINT `fk_usuarios_areas` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: empleados (Padrón Operativo — SIN ROL DE SISTEMA)
-- Regla de Negocio: Máximo 2 áreas por colaborador (area_id y area_id_secundaria)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `empleados`;
CREATE TABLE `empleados` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `numero_empleado` VARCHAR(40) NOT NULL,
  `nombre_completo` VARCHAR(180) NOT NULL,
  `correo` VARCHAR(150) NULL,
  `puesto` VARCHAR(120) NULL,
  `area_id` INT NOT NULL,
  `area_id_secundaria` INT NULL,
  `usuario_id` CHAR(36) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_empleados_numero` (`numero_empleado`),
  KEY `idx_empleados_numero` (`numero_empleado`),
  KEY `idx_empleados_area` (`area_id`),
  KEY `idx_empleados_area_sec` (`area_id_secundaria`),
  KEY `idx_empleados_usuario` (`usuario_id`),
  KEY `idx_empleados_activo` (`activo`),
  CONSTRAINT `fk_empleados_areas_primaria` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_empleados_areas_secundaria` FOREIGN KEY (`area_id_secundaria`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_empleados_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLA: preguntas (Banco de Reactivos Técnicos por Área)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `preguntas`;
CREATE TABLE `preguntas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `area_id` INT NOT NULL,
  `codigo` VARCHAR(50) NOT NULL,
  `categoria` VARCHAR(100) NOT NULL,
  `texto` TEXT NOT NULL,
  `descripcion_ayuda` TEXT NULL,
  `orden` SMALLINT NOT NULL DEFAULT 1,
  `criticidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_preguntas_codigo` (`codigo`),
  KEY `idx_preguntas_area_orden` (`area_id`, `orden`, `activo`),
  CONSTRAINT `fk_preguntas_areas` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABLA: checklists (Cabecera de Inspecciones Realizadas en Planta)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `checklists`;
CREATE TABLE `checklists` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `folio` VARCHAR(40) NOT NULL,
  `empleado_id` CHAR(36) NOT NULL,
  `numero_empleado` VARCHAR(40) NOT NULL,
  `nombre_empleado` VARCHAR(180) NOT NULL,
  `area_id` INT NOT NULL,
  `fecha_operacion` DATE NOT NULL,
  `hora_registro` VARCHAR(10) NOT NULL,
  `estado_tiempo` ENUM('EN_TIEMPO', 'FUERA_DE_TIEMPO') NOT NULL DEFAULT 'EN_TIEMPO',
  `total_preguntas` SMALLINT NOT NULL DEFAULT 0,
  `total_si` SMALLINT NOT NULL DEFAULT 0,
  `total_no` SMALLINT NOT NULL DEFAULT 0,
  `porcentaje_cumplimiento` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `porcentaje_incidencias` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `duracion_segundos` INT DEFAULT 0,
  `dispositivo` VARCHAR(120) NULL,
  `estado` ENUM('EN_PROGRESO', 'COMPLETADO', 'REVISADO') NOT NULL DEFAULT 'COMPLETADO',
  `observaciones_generales` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_checklists_folio` (`folio`),
  KEY `idx_checklists_fecha` (`fecha_operacion` DESC),
  KEY `idx_checklists_area_fecha` (`area_id`, `fecha_operacion` DESC),
  KEY `idx_checklists_empleado` (`empleado_id`, `fecha_operacion` DESC),
  KEY `idx_checklists_estado_tiempo` (`estado_tiempo`, `fecha_operacion` DESC),
  CONSTRAINT `fk_checklists_empleados` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_checklists_areas` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TABLA: respuestas (Detalle Atómico Ítem por Ítem e Incidencias)
-- Regla de Integridad: motivo_no es obligatorio si respuesta = 0 (No Cumple)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `respuestas`;
CREATE TABLE `respuestas` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `checklist_id` CHAR(36) NOT NULL,
  `pregunta_id` INT NOT NULL,
  `respuesta` TINYINT(1) NOT NULL, -- 1 = Sí Cumple (Conforme), 0 = No Cumple (Incidencia)
  `motivo_no` TEXT NULL,
  `estado_incidencia` ENUM('N/A', 'ABIERTA', 'EN_ATENCION', 'RESUELTA') NOT NULL DEFAULT 'ABIERTA',
  `respondido_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_respuestas_checklist_pregunta` (`checklist_id`, `pregunta_id`),
  KEY `idx_respuestas_checklist` (`checklist_id`),
  KEY `idx_respuestas_pregunta` (`pregunta_id`),
  KEY `idx_respuestas_incidencias` (`respuesta`, `respondido_en` DESC),
  CONSTRAINT `fk_respuestas_checklists` FOREIGN KEY (`checklist_id`) REFERENCES `checklists` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_respuestas_preguntas` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_motivo_obligatorio_en_no` CHECK (
    (`respuesta` = 1) OR 
    (`respuesta` = 0 AND `motivo_no` IS NOT NULL AND CHAR_LENGTH(TRIM(`motivo_no`)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. TABLA: evidencias (Soporte Multimedia Fotográfico de Incidencias)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `evidencias`;
CREATE TABLE `evidencias` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `respuesta_id` CHAR(36) NOT NULL,
  `checklist_id` CHAR(36) NOT NULL,
  `nombre_archivo` VARCHAR(255) NOT NULL,
  `formato` ENUM('JPG', 'JPEG', 'PNG', 'WEBP') NOT NULL,
  `mime_type` VARCHAR(60) NOT NULL,
  `tamano_bytes` INT NOT NULL DEFAULT 0,
  `blob_url` MEDIUMTEXT NOT NULL,
  `origen_captura` ENUM('CAMARA', 'GALERIA', 'DRAG_DROP') NOT NULL DEFAULT 'GALERIA',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY `idx_evidencias_respuesta` (`respuesta_id`),
  KEY `idx_evidencias_checklist` (`checklist_id`),
  CONSTRAINT `fk_evidencias_respuestas` FOREIGN KEY (`respuesta_id`) REFERENCES `respuestas` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_evidencias_checklists` FOREIGN KEY (`checklist_id`) REFERENCES `checklists` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. TABLA: estadisticas (Consolidación Precalculada de KPIs / Business Intelligence)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `estadisticas`;
CREATE TABLE `estadisticas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `periodo_tipo` ENUM('DIARIO', 'SEMANAL', 'MENSUAL') NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `area_id` INT NULL, -- NULL indica consolidado global de toda la planta
  `total_checklists` INT NOT NULL DEFAULT 0,
  `total_respuestas` INT NOT NULL DEFAULT 0,
  `total_si` INT NOT NULL DEFAULT 0,
  `total_no` INT NOT NULL DEFAULT 0,
  `porcentaje_cumplimiento` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `porcentaje_incidencias` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `calculado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_estadisticas_periodo_fecha_area` (`periodo_tipo`, `fecha_inicio`, `area_id`),
  KEY `idx_estadisticas_periodo` (`periodo_tipo`, `fecha_inicio` DESC),
  KEY `idx_estadisticas_area` (`area_id`),
  CONSTRAINT `fk_estadisticas_areas` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. TABLA: auditoria (Bitácora Inmutable de Operaciones y Seguridad)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `auditoria`;
CREATE TABLE `auditoria` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` CHAR(36) NULL,
  `actor_identificador` VARCHAR(120) NOT NULL,
  `modulo` VARCHAR(80) NOT NULL,
  `accion` VARCHAR(80) NOT NULL,
  `entidad` VARCHAR(80) NOT NULL,
  `entidad_id` VARCHAR(120) NULL,
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `ip_address` VARCHAR(60) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_fecha_modulo` (`created_at` DESC, `modulo`),
  CONSTRAINT `fk_auditoria_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- DATOS SEMILLA INICIALES (7 ÁREAS INDUSTRIALES, ADMIN Y EMPLEADOS)
-- =============================================================================

-- 1. Las 7 Áreas Oficiales con Ventana Horaria de Vigencia
INSERT INTO `areas` (`id`, `codigo`, `nombre`, `descripcion`, `color_hex`, `icono`, `responsable`, `hora_inicio`, `hora_fin`) VALUES
(1, 'MES', 'MES', 'Sistemas de ejecución de manufactura, trazabilidad de piezas, control de órdenes y OEE.', '#2563EB', 'Cpu', 'Ing. Roberto Méndez', '07:00', '08:30'),
(2, 'IND4', 'Ind. 4.0', 'Tecnologías de Industria 4.0, IoT industrial, visión artificial, gemelos digitales y telemetría.', '#7C3AED', 'Activity', 'Ing. Laura Gómez', '07:00', '08:30'),
(3, 'INFRA', 'Infraestructura', 'Infraestructura de servidores físicos, virtualización, redes OT/IT, centros de datos y respaldo eléctrico.', '#059669', 'Server', 'Ing. Carlos Villarreal', '07:00', '08:30'),
(4, 'STAF', 'Staff IT', 'Soporte informático corporativo, estaciones de trabajo ejecutivas, servicios de usuario y telecomunicaciones.', '#0891B2', 'Users', 'Lic. Fernando Castillo', '07:00', '08:30'),
(5, 'DIGI', 'Digitalizacion', 'Automatización de procesos digitales, flujos de trabajo sin papel, portales web e integraciones.', '#D97706', 'Smartphone', 'Ing. Sofía Hernández', '07:00', '08:30'),
(6, 'SAP', 'SAP', 'ERP SAP corporativo, módulos productivos, interfaces RFC/IDoc y gestión de inventarios.', '#4F46E5', 'Database', 'Ing. Valeria Ramírez', '07:00', '08:30'),
(7, 'SMAN', 'Soporte Manufactura', 'Soporte técnico directo en líneas de ensamble, computadoras industriales y bancos de prueba.', '#E11D48', 'Wrench', 'Ing. Miguel Ángel Torres', '07:00', '08:30');

-- 2. Cuenta de Usuario del Administrador General (Oscar Mercado - Rol Directo ADMIN)
-- Password por defecto: 'admin123' hasheado
INSERT INTO `usuarios` (`id`, `username`, `email`, `password_hash`, `nombre_completo`, `rol`, `area_id`) VALUES
('usr-admin-1000', 'admin', 'oscar.mercado@empresa.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Oscar Mercado', 'ADMIN', 3);

-- 3. Padrón de Empleados Operativos (SIN ROL DE SISTEMA — Adscripción Multi-Área)
INSERT INTO `empleados` (`id`, `numero_empleado`, `nombre_completo`, `correo`, `puesto`, `area_id`, `area_id_secundaria`, `usuario_id`, `activo`) VALUES
('emp-1000', '1000', 'Oscar Mercado', 'oscar.mercado@empresa.com', 'Administrador General de Sistemas', 3, 4, 'usr-admin-1000', 1),
('emp-2001', '2001', 'Alejandro Puente', 'puentealejandro491@gmail.com', 'Especialista en Infraestructura y Tecnologías 4.0', 3, 2, NULL, 1),
('emp-1001', '1001', 'Ing. Roberto Méndez', 'roberto.mendez@empresa.com', 'Jefe de Sistemas MES', 1, NULL, NULL, 1),
('emp-1002', '1002', 'Ing. Laura Gómez', 'laura.gomez@empresa.com', 'Jefa de Industria 4.0', 2, NULL, NULL, 1),
('emp-1003', '1003', 'Ing. Carlos Villarreal', 'carlos.villarreal@empresa.com', 'Jefe de Infraestructura', 3, NULL, NULL, 1),
('emp-2002', '2002', 'Sofía Hernández', 'sofia.hernandez@empresa.com', 'Ingeniera de Digitalización y Automatización', 5, 1, NULL, 1),
('emp-2003', '2003', 'Miguel Ángel Torres', 'miguel.torres@empresa.com', 'Ingeniero de Soporte a Manufactura', 7, NULL, NULL, 1),
('emp-2004', '2004', 'Valeria Ramírez', 'valeria.ramirez@empresa.com', 'Especialista en Módulos SAP', 6, NULL, NULL, 1),
('emp-2005', '2005', 'Fernando Castillo', 'fernando.castillo@empresa.com', 'Líder de Mesa de Ayuda Staff IT', 4, NULL, NULL, 1),
('emp-2006', '2006', 'Diana Morales', 'diana.morales@empresa.com', 'Técnica de Soporte y Conectividad', 7, 6, NULL, 1);

-- 4. Muestra de Reactivos Técnicos por Área (Banco Dinámico de Preguntas)
INSERT INTO `preguntas` (`id`, `area_id`, `codigo`, `categoria`, `texto`, `descripcion_ayuda`, `orden`, `criticidad`, `activo`) VALUES
-- MES (areaId = 1)
(101, 1, 'MES-01', 'Conectividad y Servidores', '¿El servidor principal de MES se encuentra en línea y respondiendo a los clientes de piso?', 'Verificar estado de servicios core y tiempo de respuesta ICMP < 5ms.', 1, 'CRITICA', 1),
(102, 1, 'MES-02', 'Trazabilidad y Escáneres', '¿Los escáneres de código de barras 2D en las estaciones de empaque leen correctamente?', 'Validar lectura con etiqueta muestra en estación 3 y 4.', 2, 'ALTA', 1),
(103, 1, 'MES-03', 'Sincronización de Órdenes', '¿Las órdenes de producción se están sincronizando en tiempo real sin encolamiento?', 'Revisar cola de mensajería RabbitMQ/ActiveMQ.', 3, 'ALTA', 1),

-- Ind. 4.0 (areaId = 2)
(201, 2, 'IND-01', 'Gateways IoT y Telemetría', '¿Los gateways IoT industriales comunican telemetría al broker MQTT principal?', 'Comprobar tasa de mensajes por segundo en el dashboard de telemetría.', 1, 'CRITICA', 2),
(202, 2, 'IND-02', 'Cámaras de Visión Artificial', '¿Las cámaras de inspección óptica operan sin alarmas de lente sucio o descalibración?', 'Revisar porcentaje de falsos rechazos en la línea A.', 2, 'ALTA', 1),
(203, 2, 'IND-03', 'Modelos Predictivos Edge', '¿El módulo de inferencia en el Edge PC reporta latencias dentro del rango (< 120 ms)?', 'Validar log de inferencias del contenedor Docker.', 3, 'MEDIA', 1),

-- Infraestructura (areaId = 3)
(301, 3, 'INF-01', 'Climatización Data Center', '¿La temperatura en el Centro de Cómputo principal se mantiene entre 18°C y 22°C?', 'Inspeccionar termohigrómetro de pared y tablero del HVAC redundante.', 1, 'CRITICA', 1),
(302, 3, 'INF-02', 'Sistemas UPS y Baterías', '¿El sistema de alimentación ininterrumpida (UPS) opera en modo normal sin alarmas de batería?', 'Comprobar voltaje de banco de baterías y autonomía mínima > 45 min.', 2, 'CRITICA', 1),
(303, 3, 'INF-03', 'Enlaces de Fibra Óptica', '¿Los enlaces troncales de fibra óptica entre Site A y Site B presentan cero pérdidas de paquetes?', 'Revisar estado de puertos SFP+ en el switch core perimetral.', 3, 'ALTA', 1),

-- Staff IT (areaId = 4)
(401, 4, 'STF-01', 'Active Directory y DNS', '¿Los controladores de dominio replican correctamente y resuelven peticiones DNS internas?', 'Comprobar diagnósticos de replicación dcdiag sin errores críticos.', 1, 'ALTA', 1),
(402, 4, 'STF-02', 'VPN y Enlace Corporativo', '¿El concentrador de túneles VPN corporativo opera con capacidad de conexiones disponible?', 'Validar umbral de túneles activos < 80% del límite de licencias.', 2, 'MEDIA', 1),

-- Digitalizacion (areaId = 5)
(501, 5, 'DIG-01', 'Portales Web Operativos', '¿El portal de solicitudes internas y formularios digitales responde con HTTP 200?', 'Verificar comprobación de salud /healthz del servicio web.', 1, 'ALTA', 1),

-- SAP (areaId = 6)
(601, 6, 'SAP-01', 'Conectores RFC / IDoc', '¿Las interfaces de integración RFC con piso de producción no tienen mensajes en cola de error?', 'Revisar transacciones SM58 y SM59 en el mandante productivo.', 1, 'CRITICA', 1),

-- Soporte Manufactura (areaId = 7)
(701, 7, 'MAN-01', 'Terminales Industriales', '¿Las computadoras industriales de montaje en panel responden al tacto y periféricos?', 'Inspeccionar sellado IP65 y calibración táctil de pantallas.', 1, 'ALTA', 1);
