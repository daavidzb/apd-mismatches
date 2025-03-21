-- truncate 

-- 1. Desactivar restricciones de clave foránea
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Eliminar las tablas en orden
DROP TABLE IF EXISTS medicamentos_gestionados;
DROP TABLE IF EXISTS seguimiento_medicamentos;
DROP TABLE IF EXISTS descuadres;
DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS motivos_descuadre;
DROP TABLE IF EXISTS categorias_descuadre;
DROP TABLE IF EXISTS estados_descuadre;

-- 3. Crear tablas de nuevo en orden correcto
CREATE TABLE estados_descuadre (
    id_estado INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) NOT NULL,
    PRIMARY KEY (id_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE reportes (
    id_reporte INT NOT NULL AUTO_INCREMENT,
    fecha_reporte TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nombre_archivo VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_reporte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE descuadres (
    id_descuadre INT NOT NULL AUTO_INCREMENT,
    id_reporte INT NOT NULL,
    num_almacen INT NOT NULL,
    codigo_med VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    cantidad_farmatools INT NOT NULL,
    cantidad_armario_apd INT NOT NULL,
    descuadre INT NOT NULL,
    PRIMARY KEY (id_descuadre),
    FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)
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
    FOREIGN KEY (id_estado) REFERENCES estados_descuadre(id_estado),
    FOREIGN KEY (id_categoria) REFERENCES categorias_descuadre(id_categoria),
    FOREIGN KEY (id_motivo) REFERENCES motivos_descuadre(id_motivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Insertar datos de configuración
INSERT INTO estados_descuadre (nombre, descripcion, color) VALUES 
('Pendiente', 'Descuadre sin gestionar', '#dc3545'),
('En proceso', 'Descuadre en gestión', '#ffc107'),
('Corregido', 'Descuadre corregido', '#198754');

INSERT INTO categorias_descuadre (nombre, descripcion) VALUES 
('Error de sistema', 'Problemas relacionados con el software o hardware'),
('Error humano', 'Errores cometidos por el personal'),
('Proceso incompleto', 'Procesos que no se completaron correctamente'),
('Otros', 'Categoría para casos especiales o no categorizados');

INSERT INTO motivos_descuadre (nombre, descripcion, id_categoria) VALUES 
('Fallo de sincronización', 'Error en la sincronización entre sistemas', 1),
('Error de sistema', 'Fallo en el software o hardware', 1),
('Error de conteo', 'Error en el conteo físico de medicamentos', 2),
('Error de registro', 'Error al registrar movimientos', 2),
('Devolución pendiente', 'Pendiente de procesar devolución', 3),
('Dispensación sin registro', 'Medicamento dispensado sin registro en el sistema', 3),
('Otros motivos', 'Otros motivos no categorizados', 4);

-- 5. Reactivar restricciones de clave foránea
SET FOREIGN_KEY_CHECKS = 1;



