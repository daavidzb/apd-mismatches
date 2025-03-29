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

// Api lista de medicamentos
const get_medicines_list = async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT DISTINCT
          codigo_med,
          descripcion
        FROM descuadres
        ORDER BY descripcion ASC
        `,
        (error, results) => {
          if (error) {
            console.error("Database error:", error);
            reject(error);
          }
          resolve(results);
        }
      );
    });

    res.json({ medicines: results });
  } catch (error) {
    console.error("Error in get_medicines_list:", error);
    res.status(500).json({ error: error.message });
  }
};

// api comparativa meses para apexcharts
const get_compare_months = async (req, res) => {
  try {
    const { month1, month2 } = req.params;
    const [year1, m1] = month1.split("-");
    const [year2, m2] = month2.split("-");

    // query totales mensuales
    const totalsByMonth = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT 
          DATE_FORMAT(fecha_reporte, '%Y-%m') as mes,
          COUNT(*) as total_descuadres,
          SUM(ABS(descuadre)) as cantidad_total
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        WHERE (YEAR(fecha_reporte) = ? AND MONTH(fecha_reporte) = ?)
           OR (YEAR(fecha_reporte) = ? AND MONTH(fecha_reporte) = ?)
        GROUP BY DATE_FORMAT(fecha_reporte, '%Y-%m')
        `,
        [year1, m1, year2, m2],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // query top medicamentos
    const topMedicines = await new Promise((resolve, reject) => {
      connection.query(
        `
        WITH TopMedicines AS (
            SELECT 
                d.codigo_med,
                d.descripcion,
                SUM(CASE 
                    WHEN YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ? 
                    THEN 1 ELSE 0 
                END) as mes1_total,
                SUM(CASE 
                    WHEN YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ? 
                    THEN 1 ELSE 0 
                END) as mes2_total,
                COUNT(*) as total_general
            FROM descuadres d
            JOIN reportes r ON d.id_reporte = r.id_reporte
            WHERE (YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?)
               OR (YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?)
            GROUP BY d.codigo_med, d.descripcion
        )
        SELECT *
        FROM TopMedicines
        WHERE mes1_total > 0 OR mes2_total > 0
        ORDER BY total_general DESC
        LIMIT 10
        `,
        [year1, m1, year2, m2, year1, m1, year2, m2],
        (error, results) => {
          if (error) {
            console.error("Database error:", error);
            reject(error);
          }
          resolve(results);
        }
      );
    });

    res.json({
      labels: {
        month1: new Date(`${year1}-${m1}-01`).toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        }),
        month2: new Date(`${year2}-${m2}-01`).toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        }),
      },
      totals: {
        month1: totalsByMonth.find((m) => m.mes === month1) || {
          total_descuadres: 0,
          cantidad_total: 0,
        },
        month2: totalsByMonth.find((m) => m.mes === month2) || {
          total_descuadres: 0,
          cantidad_total: 0,
        },
      },
      topMedicines: topMedicines,
    });
  } catch (error) {
    console.error("Error in get_compare_months:", error);
    res.status(500).json({ error: error.message });
  }
};

// api top medicinas
const get_top_medicines = async (req, res) => {
  try {
    const month = req.params.month;

    // Query todos los períodos o un mes específico
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

// api resumen mensual
const get_month_report = async (req, res) => {
  try {
    const { month } = req.params;
    const query = `
      WITH UltimaGestion AS (
        SELECT 
          d.codigo_med,
          mg.id_estado,
          ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY mg.fecha_gestion DESC) as rn
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
        WHERE ${
          month === "all" ? "1=1" : 'DATE_FORMAT(r.fecha_reporte, "%Y-%m") = ?'
        }
      )
      SELECT
        COUNT(DISTINCT codigo_med) as total,
        SUM(CASE WHEN id_estado = 3 THEN 1 ELSE 0 END) as resueltos,
        SUM(CASE WHEN id_estado = 2 THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN id_estado = 4 THEN 1 ELSE 0 END) as regularizar,
        SUM(CASE WHEN id_estado IS NULL OR id_estado = 1 THEN 1 ELSE 0 END) as pendientes
      FROM UltimaGestion
      WHERE rn = 1`;

    const params = month === "all" ? [] : [month];

    // console.log("query:", query);
    // console.log("params:", params);

    const results = await new Promise((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) reject(error);
        const data = results[0] || {
          total: 0,
          resueltos: 0,
          en_proceso: 0,
          regularizar: 0,
          pendientes: 0,
        };
        // console.log("Query results:", data);
        resolve(data);
      });
    });

    res.json(results);
  } catch (error) {
    console.error("Error en get_month_report:", error);
    res.status(500).json({ error: error.message });
  }
};

// api histórico medicamentos
const get_medicine_evolution = async (req, res) => {
  try {
    const { code } = req.params;
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT 
          DATE(r.fecha_reporte) as fecha,
          d.descuadre,
          d.descripcion,
          d.codigo_med,
          COUNT(*) as veces_por_dia
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        WHERE d.codigo_med = ?
        GROUP BY DATE(r.fecha_reporte), d.descuadre, d.descripcion, d.codigo_med
        ORDER BY fecha ASC
        LIMIT 30  -- Mostrar últimos 30 días con descuadres
        `,
        [code],
        (error, results) => {
          if (error) {
            console.error("Database error:", error);
            reject(error);
          }
          resolve(results);
        }
      );
    });

    res.json({ evolution: results });
  } catch (error) {
    console.error("Error in get_medicine_evolution:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  get_categories_report,
  get_medicine_evolution,
  get_compare_months,
  get_top_medicines,
  get_month_report,
  get_medicines_list,
};
