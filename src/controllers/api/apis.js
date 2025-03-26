const connection = require("../../db/connection");

const get_categories_report = async (req, res) => {
  try {
    const { month } = req.params;
    let whereClause = "";
    let params = [];

    if (month !== "all") {
      const [year, m] = month.split("-");
      whereClause =
        "AND YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params = [year, m];
    }

    const query = `
            WITH StatsData AS (
                SELECT 
                    c.nombre as categoria,
                    m.nombre as motivo,
                    COUNT(*) as total_descuadres,
                    DATE(r.fecha_reporte) as fecha,
                    ABS(d.descuadre) as magnitud_descuadre
                FROM medicamentos_gestionados mg
                JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
                JOIN reportes r ON d.id_reporte = r.id_reporte
                JOIN categorias_descuadre c ON mg.id_categoria = c.id_categoria
                JOIN motivos_descuadre m ON mg.id_motivo = m.id_motivo
                WHERE 1=1 ${whereClause}
                GROUP BY c.nombre, m.nombre, DATE(r.fecha_reporte)
            )
            SELECT 
                categoria,
                motivo,
                SUM(total_descuadres) as total,
                AVG(total_descuadres) as promedio_diario,
                AVG(magnitud_descuadre) as magnitud_promedio
            FROM StatsData
            GROUP BY categoria, motivo
            ORDER BY total DESC`;

    connection.query(query, params, (error, results) => {
      if (error) throw error;

      const stats = {
        categories: {},
        motives: {},
        dailyAverage: [],
      };

      results.forEach((row) => {
        if (!stats.categories[row.categoria]) {
          stats.categories[row.categoria] = 0;
        }
        stats.categories[row.categoria] += row.total;

        if (!stats.motives[row.motivo]) {
          stats.motives[row.motivo] = 0;
        }
        stats.motives[row.motivo] += row.total;
      });

      res.json(stats);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  get_categories_report,
};
