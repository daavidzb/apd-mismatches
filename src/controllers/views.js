const connection = require("../db/connection");

const dashboard_view = async (req, res) => {
  try {
    // Combinar todas las consultas en una sola operación paralela
    const [basicStats, estadosData] = await Promise.all([
      // Consulta 1: Estadísticas básicas (hoy y ayer) combinadas
      new Promise((resolve, reject) => {
        connection.query(
          `
            SELECT 
              SUM(CASE WHEN DATE(fecha_reporte) = CURDATE() THEN total_descuadres ELSE 0 END) as hoy,
              SUM(CASE WHEN DATE(fecha_reporte) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN total_descuadres ELSE 0 END) as ayer
            FROM reportes 
            WHERE fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0] || { hoy: 0, ayer: 0 });
          }
        );
      }),

      // Consulta 2: Estados optimizada con índices
      new Promise((resolve, reject) => {
        connection.query(
          `
            WITH UltimaGestion AS (
              SELECT 
                d.codigo_med,
                mg.id_estado,
                ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY mg.fecha_gestion DESC) as rn
              FROM descuadres d
              LEFT JOIN (
                SELECT d2.codigo_med, mg.id_estado, mg.fecha_gestion
                FROM medicamentos_gestionados mg
                JOIN descuadres d2 ON mg.id_descuadre = d2.id_descuadre
                WHERE mg.id_gestion = (
                  SELECT MAX(mg2.id_gestion)
                  FROM medicamentos_gestionados mg2
                  WHERE mg2.id_descuadre = d2.id_descuadre
                )
              ) mg ON d.codigo_med = mg.codigo_med
              WHERE d.id_descuadre IN (
                SELECT MAX(id_descuadre)
                FROM descuadres
                GROUP BY codigo_med
              )
            )
            SELECT
              COUNT(DISTINCT codigo_med) as total,
              SUM(CASE WHEN id_estado = 3 THEN 1 ELSE 0 END) as resueltos,
              SUM(CASE WHEN id_estado = 2 THEN 1 ELSE 0 END) as en_proceso,
              SUM(CASE WHEN id_estado = 4 THEN 1 ELSE 0 END) as regularizar,
              SUM(CASE WHEN id_estado = 1 OR id_estado IS NULL THEN 1 ELSE 0 END) as pendientes
            FROM UltimaGestion
            WHERE rn = 1`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0]);
          }
        );
      }),
    ]);

    const { hoy, ayer } = basicStats;
    const {
      total = 0,
      resueltos = 0,
      en_proceso = 0,
      regularizar = 0,
      pendientes = 0,
    } = estadosData || {};

    // Calcular porcentajes de manera eficiente
    const calcularPorcentaje = (valor) =>
      total ? Math.round((valor / total) * 100) : 0;
    const hoyVsAyer = ayer ? Math.round(((hoy - ayer) / ayer) * 100) : 0;

    // Renderizar la vista
    res.render("dashboard", {
      title: "Dashboard",
      active: "dashboard",
      user: req.user,
      stats: {
        hoy,
        ayer,
        hoyVsAyer,
        total,
        resueltos,
        porcentajeResueltos: calcularPorcentaje(resueltos),
        enProceso: en_proceso,
        porcentajeEnProceso: calcularPorcentaje(en_proceso),
        regularizar,
        porcentajeRegularizar: calcularPorcentaje(regularizar),
        pendientes,
        porcentajePendientes: calcularPorcentaje(pendientes),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const analysis_view = async (req, res) => {
  try {
    res.render("analysis", {
      title: "Análisis de Descuadres",
      active: "analysis",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const managed_view = async (req, res) => {
  try {
    res.render("managed", {
      title: "Gestionar Descuadres",
      active: "managed",
      user: req.user,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const upload_view = async (req, res) => {
  try {
    res.render("upload-view", {
      title: "Subir Archivos",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};
const matrix_view = async (req, res) => {
  try {
    res.render("matrix", {
      title: "Matriz",
      active: 'matrix',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};
const mismatches_view = async (req, res) => {
  try {
    const query = `
      WITH LastState AS (
        SELECT 
          d.codigo_med,
          d.descripcion,
          d.descuadre,
          r.fecha_reporte,
          mg.id_estado,
          ed.nombre as estado,
          ed.color,
          mg.observaciones,
          ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY r.fecha_reporte DESC) as rn
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        LEFT JOIN (
          SELECT mg2.* 
          FROM medicamentos_gestionados mg2
          INNER JOIN (
            SELECT id_descuadre, MAX(fecha_gestion) as max_fecha
            FROM medicamentos_gestionados
            GROUP BY id_descuadre
          ) mg3 ON mg2.id_descuadre = mg3.id_descuadre 
          AND mg2.fecha_gestion = mg3.max_fecha
        ) mg ON d.id_descuadre = mg.id_descuadre
        LEFT JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
      )
      SELECT * FROM LastState 
      WHERE rn = 1
      ORDER BY fecha_reporte DESC`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    res.render("mismatches", {
      title: "Inventario Detallado",
      active: "mismatches",
      mismatches: results || [], // Aseguramos que siempre haya un array
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const reports_view = async (req, res) => {
  try {
    res.render("reports", {
      title: "Reportes",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  dashboard_view,
  analysis_view,
  managed_view,
  upload_view,
  mismatches_view,
  reports_view,
  matrix_view,
};
