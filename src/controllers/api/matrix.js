const connection = require('../../db/connection')

const get_mismatches_matrix = async (req, res) => {
    try {
      const query = `
        WITH dates AS (
          SELECT DISTINCT DATE(fecha_reporte) as fecha
          FROM reportes
          WHERE fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          ORDER BY fecha DESC
        ),
        MedicineData AS (
          SELECT 
            d.codigo_med,
            d.descripcion,
            DATE(r.fecha_reporte) as fecha,
            d.descuadre,
            d.cantidad_farmatools,
            d.cantidad_armario_apd,
            LAG(d.descuadre) OVER (
              PARTITION BY d.codigo_med 
              ORDER BY r.fecha_reporte
            ) as prev_descuadre
          FROM descuadres d
          JOIN reportes r ON d.id_reporte = r.id_reporte
          WHERE r.fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        )
        SELECT 
          DISTINCT m.codigo_med,
          m.descripcion,
          GROUP_CONCAT(
            CONCAT(
              DATE(d.fecha), '|',
              COALESCE(md.descuadre, 0), '|',
              COALESCE(md.cantidad_farmatools, 0), '|',
              COALESCE(md.cantidad_armario_apd, 0), '|',
              CASE 
                WHEN ABS(COALESCE(md.descuadre, 0) - COALESCE(md.prev_descuadre, 0)) > 0 
                THEN 1 
                ELSE 0 
              END
            )
            ORDER BY d.fecha DESC
            SEPARATOR ';'
          ) as historial_data
        FROM MedicineData m
        CROSS JOIN dates d
        LEFT JOIN MedicineData md ON m.codigo_med = md.codigo_med 
          AND d.fecha = md.fecha
        GROUP BY m.codigo_med, m.descripcion
        ORDER BY m.descripcion`;
  
      connection.query(query, (error, results) => {
        if (error) {
          console.error("Error:", error);
          return res.status(500).json({ error: error.message });
        }
  
        // Procesar resultados
        const matrix = results.map(row => {
          const historial = row.historial_data.split(';').map(item => {
            const [fecha, descuadre, farmatools, apd, hasChange] = item.split('|');
            return {
              fecha,
              descuadre: parseInt(descuadre),
              farmatools: parseInt(farmatools),
              apd: parseInt(apd),
              hasChange: hasChange === '1'
            };
          });
  
          return {
            codigo_med: row.codigo_med,
            descripcion: row.descripcion,
            historial
          };
        });
  
        res.json({ matrix });
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
    }
  };

module.exports = {
  get_mismatches_matrix
}