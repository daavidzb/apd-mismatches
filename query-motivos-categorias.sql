-- 1. Desactivar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Limpiar y eliminar tablas en orden correcto
TRUNCATE TABLE medicamentos_gestionados;
DROP TABLE IF EXISTS medicamentos_gestionados;
DROP TABLE IF EXISTS motivos_descuadre;
DROP TABLE IF EXISTS categorias_descuadre;

-- 3. Recrear las tablas
CREATE TABLE categorias_descuadre (
    id_categoria INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE motivos_descuadre (
    id_motivo INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    id_categoria INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_motivo),
    FOREIGN KEY (id_categoria) REFERENCES categorias_descuadre(id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE medicamentos_gestionados (
    id_gestion INT NOT NULL AUTO_INCREMENT,
    id_descuadre INT NOT NULL,
    id_usuario INT NOT NULL,
    id_estado INT NOT NULL,
    id_categoria INT,
    id_motivo INT,
    observaciones TEXT,
    fecha_gestion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_gestion),
    FOREIGN KEY (id_descuadre) REFERENCES descuadres(id_descuadre),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_estado) REFERENCES estados_descuadre(id_estado),
    FOREIGN KEY (id_categoria) REFERENCES categorias_descuadre(id_categoria),
    FOREIGN KEY (id_motivo) REFERENCES motivos_descuadre(id_motivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Insertar nuevas categorías
INSERT INTO categorias_descuadre (nombre, descripcion) VALUES 
('Integración Dosis', 'Problemas relacionados con la integración de Dosis'),
('Integración externa', 'Problemas relacionados con integraciones externas'),
('Movimiento pendientes de procesar en la consola de FarmaTools', 'Movimientos pendientes en consola'),
('Uso inadecuado por parte del usuario', 'Errores de uso por parte del usuario'),
('Horario de comparación de stocks', 'Descuadres temporales');

-- 5. Insertar nuevos motivos
INSERT INTO motivos_descuadre (nombre, descripcion, id_categoria) VALUES 
-- Categoría 1: Integración Dosis
('Posibilidad de dejar stock negativo', 'Posibilidad de dejar stock negativo en una retirada a farmacia desde SADME', 1),
('Cálculo de cantidad de ajuste', 'Cálculo de la cantidad de ajuste cuando un usuario regulariza con una sección bloqueada', 1),
('Filtrado de movimientos a pacientes ficticios', 'Filtrado de movimientos a pacientes ficticios en HUNSC', 1),
('Envío incorrecto de cantidad en medicamentos multidosis', 'Envío incorrecto de cantidad en medicamentos multidosis en HUC', 1),

-- Categoría 2: Integración externa
('Movimiento con cantidad decimal', 'Movimiento con cantidad decimal y no puede procesarse en FarmaTools', 2),
('Movimiento no procesado', 'Movimiento no procesado en FarmaTools y no visible en consola de errores', 2),
('No se envía mensaje de entrada de proveedor', 'No se envía automáticamente mensaje de entrada de proveedor a Dosis', 2),
('Canal detenido por cierre de mes', 'Canal detenido por cierre de mes (posiblemente temporal)', 2),
('Fallo en conteo de fin de mes', 'Fallo al realizar la tarea de conteo de fin de mes', 2),

-- Categoría 3: Movimientos pendientes
('Almacén sin stock para intercambio', 'Almacén general de farmacia sin stock para realizar intercambio', 3),
('Descuadre previo en SADE', 'Descuadre previo en SADE, dispensador o dispensador virtual que no permite dar un consumo', 3),
('Medicamento no configurado', 'Medicamento no configurado en almacén para trabajo con dispensadores', 3),
('Unidad enfermería inexistente', 'Unidad enfermería inexistente en FarmaTools', 3),
('Servicio inexistente', 'Servicio inexistente en FarmaTools', 3),
('Datos con más de 10 caracteres', 'NHC, episodio, UE o servicio con más de 10 caracteres', 3),
('Fecha de movimiento anterior', 'Fecha de movimiento del mes anterior al actual', 3),

-- Categoría 4: Uso inadecuado
('Gestión manual de stock', 'Gestión manual de stock en FarmaTools', 4),
('Salida SADE sin reposición Virtual', 'Se realiza salida en el SADE, pero no se ejecuta la reposición en dispensador Virtual, o se ejecuta pero con cantidad incorrecta', 4),
('Salida SADE sin reposición', 'Se realiza salida en el SADE, pero no se ejecuta la reposición en dispensador, o se ejecuta pero con cantidad incorrecta', 4),
('Reposición sin salida SADE', 'Se realiza una reposición de estupefaciente en dispensador, sin haber realizado la salida correspondiente en el SADE', 4),
('Reposición Virtual sin salida SADE', 'Se realiza una reposición de estupefaciente en dispensador Virtual, sin haber realizado la salida correspondiente en el SADE', 4),
('Anulación sin retirada', 'Se realiza una anulación de reposición (devolución de dispensador) en el SADE, sin haber generado la retirada a SADE en el SADME', 4),

-- Categoría 5: Descuadres temporales
('Definición del fichero comparador', 'Por definición del fichero comparador', 5),
('Demora en envío de mensajería', 'Por demora en el tiempo de envío de la mensajería Dosis a FarmaTools', 5),
('Demora en procesamiento', 'Por demora en el tiempo de procesamiento e integración del mensaje en FarmaTools', 5),
('Demora en reposición', 'Demora del usuario en reponer un SADME con estupefacientes que provienen del SADE', 5),
('Demora en entrada de proveedor', 'Demora del usuario en efectuar la entrada de proveedor en el SADE', 5);

-- 6. Reactivar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;