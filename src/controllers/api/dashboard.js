const connection = require("../../db/connection");

const get_trend_data = async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT 
             DATE(r.fecha_reporte) as fecha,
             COUNT(*) as total
           FROM descuadres d
           JOIN reportes r ON d.id_reporte = r.id_reporte
           WHERE r.fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY DATE(r.fecha_reporte)
           ORDER BY fecha`,
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const get_state_distribution = async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
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
            nombre,
            COUNT(DISTINCT codigo_med) as total,
            ROUND(COUNT(DISTINCT codigo_med) * 100.0 / total_general, 1) as porcentaje,
            color
          FROM (
            SELECT 
              codigo_med,
              CASE 
                WHEN id_estado = 3 THEN 'Resuelto'
                WHEN id_estado = 2 THEN 'En proceso'
                WHEN id_estado = 4 THEN 'Regularizar'
                ELSE 'Pendiente'
              END as nombre,
              CASE 
                WHEN id_estado = 3 THEN '#198754'  -- Verde
                WHEN id_estado = 2 THEN '#ffc107'  -- Amarillo
                WHEN id_estado = 4 THEN '#00b8d4'  -- Turquesa (antes era morado #6f42c1)
                ELSE '#dc3545'  -- Rojo
              END as color
            FROM UltimaGestion
            WHERE rn = 1
          ) estados
          CROSS JOIN (
            SELECT COUNT(DISTINCT codigo_med) as total_general 
            FROM descuadres
          ) totales
          GROUP BY nombre, color, total_general
          ORDER BY 
            CASE nombre
              WHEN 'Pendiente' THEN 1
              WHEN 'En proceso' THEN 2
              WHEN 'Resuelto' THEN 3
              WHEN 'Regularizar' THEN 4
            END`,
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });
    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const get_month_report = async (req, res) => {
  try {
    const month = req.params.month;

    // Si el mes es 'all', obtener datos de todos los períodos
    const query =
      month === "all"
        ? `WITH DescuadresPorMes AS (
                SELECT 
                    DATE_FORMAT(r.fecha_reporte, '%Y-%m') as mes,
                    COUNT(DISTINCT d.codigo_med) as total_descuadres,
                    COUNT(DISTINCT CASE WHEN mg.id_estado = 3 THEN d.codigo_med END) as resueltos,
                    COUNT(DISTINCT CASE WHEN mg.id_estado = 2 THEN d.codigo_med END) as en_proceso,
                    COUNT(DISTINCT CASE WHEN mg.id_estado = 1 OR mg.id_estado IS NULL THEN d.codigo_med END) as pendientes
                FROM descuadres d
                JOIN reportes r ON d.id_reporte = r.id_reporte
                LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
                GROUP BY DATE_FORMAT(r.fecha_reporte, '%Y-%m')
            )
            SELECT 
                SUM(total_descuadres) as total,
                SUM(resueltos) as resueltos,
                SUM(en_proceso) as en_proceso,
                SUM(pendientes) as pendientes
            FROM DescuadresPorMes`
        : `SELECT 
                COUNT(DISTINCT d.codigo_med) as total,
                COUNT(DISTINCT CASE WHEN mg.id_estado = 3 THEN d.codigo_med END) as resueltos,
                COUNT(DISTINCT CASE WHEN mg.id_estado = 2 THEN d.codigo_med END) as en_proceso,
                COUNT(DISTINCT CASE WHEN mg.id_estado = 1 OR mg.id_estado IS NULL THEN d.codigo_med END) as pendientes
            FROM descuadres d
            JOIN reportes r ON d.id_reporte = r.id_reporte
            LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
            WHERE DATE_FORMAT(r.fecha_reporte, '%Y-%m') = ?`;

    const params = month === "all" ? [] : [month];

    const results = await new Promise((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) reject(error);
        resolve(results[0]);
      });
    });

    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const get_top_medicines = async (req, res) => {
  try {
    const month = req.params.month;

    // Query base para todos los períodos o un mes específico
    const query =
      month === "all"
        ? `WITH MedicineStats AS (
                SELECT 
                    d.codigo_med,
                    d.descripcion,
                    COUNT(*) as dias_con_descuadre,
                    MIN(d.descuadre) as min_descuadre,
                    MAX(d.descuadre) as max_descuadre,
                    AVG(ABS(d.descuadre)) as promedio_descuadre,
                    COUNT(DISTINCT DATE(r.fecha_reporte)) as total_dias_mes
                FROM descuadres d
                JOIN reportes r ON d.id_reporte = r.id_reporte
                GROUP BY d.codigo_med, d.descripcion
                ORDER BY dias_con_descuadre DESC
                LIMIT 10
            )
            SELECT *
            FROM MedicineStats`
        : `WITH MedicineStats AS (
                SELECT 
                    d.codigo_med,
                    d.descripcion,
                    COUNT(*) as dias_con_descuadre,
                    MIN(d.descuadre) as min_descuadre,
                    MAX(d.descuadre) as max_descuadre,
                    AVG(ABS(d.descuadre)) as promedio_descuadre,
                    (
                        SELECT COUNT(DISTINCT DATE(r2.fecha_reporte))
                        FROM reportes r2
                        WHERE DATE_FORMAT(r2.fecha_reporte, '%Y-%m') = ?
                    ) as total_dias_mes
                FROM descuadres d
                JOIN reportes r ON d.id_reporte = r.id_reporte
                WHERE DATE_FORMAT(r.fecha_reporte, '%Y-%m') = ?
                GROUP BY d.codigo_med, d.descripcion
                ORDER BY dias_con_descuadre DESC
                LIMIT 10
            )
            SELECT *
            FROM MedicineStats`;

    const params = month === "all" ? [] : [month, month];

    const results = await new Promise((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    res.json({ medicines: results });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    get_trend_data,
    get_state_distribution,
    get_month_report,
    get_top_medicines,
}
