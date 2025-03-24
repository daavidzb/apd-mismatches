-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 24-03-2025 a las 12:09:52
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `mismatches-hunj`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_descuadre`
--

CREATE TABLE `categorias_descuadre` (
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias_descuadre`
--

INSERT INTO `categorias_descuadre` (`id_categoria`, `nombre`, `descripcion`, `fecha_creacion`) VALUES
(1, 'Integración Dosis', 'Problemas relacionados con la integración de Dosis', '2025-03-24 11:08:26'),
(2, 'Integración externa', 'Problemas relacionados con integraciones externas', '2025-03-24 11:08:26'),
(3, 'Movimiento pendientes de procesar en la consola de FarmaTools', 'Movimientos pendientes en consola', '2025-03-24 11:08:26'),
(4, 'Uso inadecuado por parte del usuario', 'Errores de uso por parte del usuario', '2025-03-24 11:08:26'),
(5, 'Horario de comparación de stocks', 'Descuadres temporales', '2025-03-24 11:08:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `descuadres`
--

CREATE TABLE `descuadres` (
  `id_descuadre` int(11) NOT NULL,
  `id_reporte` int(11) NOT NULL,
  `num_almacen` int(11) NOT NULL,
  `codigo_med` varchar(50) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `cantidad_farmatools` int(11) NOT NULL,
  `cantidad_armario_apd` int(11) NOT NULL,
  `descuadre` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estados_descuadre`
--

CREATE TABLE `estados_descuadre` (
  `id_estado` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `color` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estados_descuadre`
--

INSERT INTO `estados_descuadre` (`id_estado`, `nombre`, `descripcion`, `color`) VALUES
(1, 'Pendiente', 'Descuadre sin gestionar', '#dc3545'),
(2, 'En proceso', 'Descuadre en gestión', '#ffc107'),
(3, 'Corregido', 'Descuadre corregido', '#198754');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `medicamentos_gestionados`
--

CREATE TABLE `medicamentos_gestionados` (
  `id_gestion` int(11) NOT NULL,
  `id_descuadre` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_estado` int(11) NOT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `id_motivo` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_gestion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `motivos_descuadre`
--

CREATE TABLE `motivos_descuadre` (
  `id_motivo` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `id_categoria` int(11) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `motivos_descuadre`
--

INSERT INTO `motivos_descuadre` (`id_motivo`, `nombre`, `descripcion`, `id_categoria`, `fecha_creacion`) VALUES
(1, 'Posibilidad de dejar stock negativo', 'Posibilidad de dejar stock negativo en una retirada a farmacia desde SADME', 1, '2025-03-24 11:08:26'),
(2, 'Cálculo de cantidad de ajuste', 'Cálculo de la cantidad de ajuste cuando un usuario regulariza con una sección bloqueada', 1, '2025-03-24 11:08:26'),
(3, 'Filtrado de movimientos a pacientes ficticios', 'Filtrado de movimientos a pacientes ficticios en HUNSC', 1, '2025-03-24 11:08:26'),
(4, 'Envío incorrecto de cantidad en medicamentos multidosis', 'Envío incorrecto de cantidad en medicamentos multidosis en HUC', 1, '2025-03-24 11:08:26'),
(5, 'Movimiento con cantidad decimal', 'Movimiento con cantidad decimal y no puede procesarse en FarmaTools', 2, '2025-03-24 11:08:26'),
(6, 'Movimiento no procesado', 'Movimiento no procesado en FarmaTools y no visible en consola de errores', 2, '2025-03-24 11:08:26'),
(7, 'No se envía mensaje de entrada de proveedor', 'No se envía automáticamente mensaje de entrada de proveedor a Dosis', 2, '2025-03-24 11:08:26'),
(8, 'Canal detenido por cierre de mes', 'Canal detenido por cierre de mes (posiblemente temporal)', 2, '2025-03-24 11:08:26'),
(9, 'Fallo en conteo de fin de mes', 'Fallo al realizar la tarea de conteo de fin de mes', 2, '2025-03-24 11:08:26'),
(10, 'Almacén sin stock para intercambio', 'Almacén general de farmacia sin stock para realizar intercambio', 3, '2025-03-24 11:08:26'),
(11, 'Descuadre previo en SADE', 'Descuadre previo en SADE, dispensador o dispensador virtual que no permite dar un consumo', 3, '2025-03-24 11:08:26'),
(12, 'Medicamento no configurado', 'Medicamento no configurado en almacén para trabajo con dispensadores', 3, '2025-03-24 11:08:26'),
(13, 'Unidad enfermería inexistente', 'Unidad enfermería inexistente en FarmaTools', 3, '2025-03-24 11:08:26'),
(14, 'Servicio inexistente', 'Servicio inexistente en FarmaTools', 3, '2025-03-24 11:08:26'),
(15, 'Datos con más de 10 caracteres', 'NHC, episodio, UE o servicio con más de 10 caracteres', 3, '2025-03-24 11:08:26'),
(16, 'Fecha de movimiento anterior', 'Fecha de movimiento del mes anterior al actual', 3, '2025-03-24 11:08:26'),
(17, 'Gestión manual de stock', 'Gestión manual de stock en FarmaTools', 4, '2025-03-24 11:08:26'),
(18, 'Salida SADE sin reposición Virtual', 'Se realiza salida en el SADE, pero no se ejecuta la reposición en dispensador Virtual, o se ejecuta pero con cantidad incorrecta', 4, '2025-03-24 11:08:26'),
(19, 'Salida SADE sin reposición', 'Se realiza salida en el SADE, pero no se ejecuta la reposición en dispensador, o se ejecuta pero con cantidad incorrecta', 4, '2025-03-24 11:08:26'),
(20, 'Reposición sin salida SADE', 'Se realiza una reposición de estupefaciente en dispensador, sin haber realizado la salida correspondiente en el SADE', 4, '2025-03-24 11:08:26'),
(21, 'Reposición Virtual sin salida SADE', 'Se realiza una reposición de estupefaciente en dispensador Virtual, sin haber realizado la salida correspondiente en el SADE', 4, '2025-03-24 11:08:26'),
(22, 'Anulación sin retirada', 'Se realiza una anulación de reposición (devolución de dispensador) en el SADE, sin haber generado la retirada a SADE en el SADME', 4, '2025-03-24 11:08:26'),
(23, 'Definición del fichero comparador', 'Por definición del fichero comparador', 5, '2025-03-24 11:08:26'),
(24, 'Demora en envío de mensajería', 'Por demora en el tiempo de envío de la mensajería Dosis a FarmaTools', 5, '2025-03-24 11:08:26'),
(25, 'Demora en procesamiento', 'Por demora en el tiempo de procesamiento e integración del mensaje en FarmaTools', 5, '2025-03-24 11:08:26'),
(26, 'Demora en reposición', 'Demora del usuario en reponer un SADME con estupefacientes que provienen del SADE', 5, '2025-03-24 11:08:26'),
(27, 'Demora en entrada de proveedor', 'Demora del usuario en efectuar la entrada de proveedor en el SADE', 5, '2025-03-24 11:08:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes`
--

CREATE TABLE `reportes` (
  `id_reporte` int(11) NOT NULL,
  `fecha_reporte` timestamp NOT NULL DEFAULT current_timestamp(),
  `nombre_archivo` varchar(255) NOT NULL,
  `total_descuadres` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `rol` varchar(20) NOT NULL DEFAULT 'user',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `username`, `password`, `nombre`, `rol`, `fecha_creacion`) VALUES
(3, 'admin', '$2b$10$IM9aAFjzx53MsMhIWAQ1Ue1nm8d9YirBZs1NxinWOv537Wpb2YKzO', 'Administrador', 'user', '2025-03-24 11:09:40');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias_descuadre`
--
ALTER TABLE `categorias_descuadre`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `descuadres`
--
ALTER TABLE `descuadres`
  ADD PRIMARY KEY (`id_descuadre`),
  ADD KEY `id_reporte` (`id_reporte`);

--
-- Indices de la tabla `estados_descuadre`
--
ALTER TABLE `estados_descuadre`
  ADD PRIMARY KEY (`id_estado`);

--
-- Indices de la tabla `medicamentos_gestionados`
--
ALTER TABLE `medicamentos_gestionados`
  ADD PRIMARY KEY (`id_gestion`),
  ADD KEY `id_descuadre` (`id_descuadre`),
  ADD KEY `id_estado` (`id_estado`),
  ADD KEY `id_categoria` (`id_categoria`),
  ADD KEY `id_motivo` (`id_motivo`);

--
-- Indices de la tabla `motivos_descuadre`
--
ALTER TABLE `motivos_descuadre`
  ADD PRIMARY KEY (`id_motivo`),
  ADD KEY `id_categoria` (`id_categoria`);

--
-- Indices de la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD PRIMARY KEY (`id_reporte`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias_descuadre`
--
ALTER TABLE `categorias_descuadre`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `descuadres`
--
ALTER TABLE `descuadres`
  MODIFY `id_descuadre` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `estados_descuadre`
--
ALTER TABLE `estados_descuadre`
  MODIFY `id_estado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `medicamentos_gestionados`
--
ALTER TABLE `medicamentos_gestionados`
  MODIFY `id_gestion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `motivos_descuadre`
--
ALTER TABLE `motivos_descuadre`
  MODIFY `id_motivo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de la tabla `reportes`
--
ALTER TABLE `reportes`
  MODIFY `id_reporte` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `descuadres`
--
ALTER TABLE `descuadres`
  ADD CONSTRAINT `descuadres_ibfk_1` FOREIGN KEY (`id_reporte`) REFERENCES `reportes` (`id_reporte`);

--
-- Filtros para la tabla `medicamentos_gestionados`
--
ALTER TABLE `medicamentos_gestionados`
  ADD CONSTRAINT `medicamentos_gestionados_ibfk_1` FOREIGN KEY (`id_descuadre`) REFERENCES `descuadres` (`id_descuadre`),
  ADD CONSTRAINT `medicamentos_gestionados_ibfk_2` FOREIGN KEY (`id_estado`) REFERENCES `estados_descuadre` (`id_estado`),
  ADD CONSTRAINT `medicamentos_gestionados_ibfk_3` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_descuadre` (`id_categoria`),
  ADD CONSTRAINT `medicamentos_gestionados_ibfk_4` FOREIGN KEY (`id_motivo`) REFERENCES `motivos_descuadre` (`id_motivo`);

--
-- Filtros para la tabla `motivos_descuadre`
--
ALTER TABLE `motivos_descuadre`
  ADD CONSTRAINT `motivos_descuadre_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_descuadre` (`id_categoria`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
