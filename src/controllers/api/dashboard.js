const connection = require("../../db/connection");

// Endpoint para obtener datos del gráfico de tendencias (30 días)
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

// Endpoint para obtener distribución de estados
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

module.exports = {
    get_trend_data,
    get_state_distribution,
}
