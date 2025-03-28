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
const get_compare_months = async (req, res) => {
  try {
    const { month1, month2 } = req.params;
    const [year1, m1] = month1.split("-");
    const [year2, m2] = month2.split("-");

    // Obtener totales mensuales
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

    // Obtener top medicamentos
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
const update_medicine_management = async (req, res) => {
  try {
    console.log('Iniciando actualización de medicamento:', req.params.code);
    const { code } = req.params;
    const { id_estado, id_categoria, id_motivo, observaciones } = req.body;

    // Obtener el último descuadre del medicamento
    const [descuadre] = await new Promise((resolve, reject) => {
      const query = `
        SELECT d.id_descuadre 
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        WHERE d.codigo_med = ?
        ORDER BY r.fecha_reporte DESC, d.id_descuadre DESC
        LIMIT 1`;

      console.log('Query para obtener descuadre:', query);
      console.log('Código medicamento:', code);

      connection.query(query, [code], (error, results) => {
        if (error) {
          console.error('Error al obtener descuadre:', error);
          reject(error);
        }
        console.log('Resultado descuadre:', results);
        resolve(results);
      });
    });

    if (!descuadre) {
      console.log('No se encontró el descuadre para:', code);
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    // Insertar la nueva gestión
    await new Promise((resolve, reject) => {
      const insertQuery = `
        INSERT INTO medicamentos_gestionados 
        (id_descuadre, id_usuario, id_estado, id_categoria, id_motivo, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)`;

      const values = [
        descuadre.id_descuadre,
        req.user.id_usuario,
        id_estado,
        id_categoria,
        id_motivo,
        observaciones
      ];

      console.log('Query de inserción:', insertQuery);
      console.log('Valores a insertar:', values);

      connection.query(insertQuery, values, (error) => {
        if (error) {
          console.error('Error al insertar gestión:', error);
          reject(error);
        }
        console.log('Gestión insertada correctamente');
        resolve();
      });
    });

    console.log('Gestión actualizada correctamente para:', code);
    res.json({ success: true });

  } catch (error) {
    console.error("Error en update_medicine_management:", error);
    res.status(500).json({ error: error.message });
  }
};
const get_analysis_all = async (req, res) => {
  try {
    const query = `
          SELECT DISTINCT d.codigo_med, d.descripcion, 
                 d.descuadre as ultimo_descuadre,
                 r.fecha_reporte as fecha_ultimo_descuadre,
                 COALESCE(e.nombre, 'Pendiente') as estado_gestion,
                 (SELECT COUNT(*) > 1 AND 
                  ABS(STDDEV(d2.descuadre)) > 2
                  FROM descuadres d2 
                  WHERE d2.codigo_med = d.codigo_med) as tiene_cambios_tendencia
          FROM descuadres d
          LEFT JOIN reportes r ON d.id_reporte = r.id_reporte
          LEFT JOIN (
              SELECT mg.id_descuadre, e.nombre, mg.id_gestion
              FROM medicamentos_gestionados mg
              JOIN estados_descuadre e ON mg.id_estado = e.id_estado
              WHERE mg.id_gestion IN (
                  SELECT MAX(id_gestion)
                  FROM medicamentos_gestionados
                  GROUP BY id_descuadre
              )
          ) gestion ON d.id_descuadre = gestion.id_descuadre
          LEFT JOIN estados_descuadre e ON gestion.nombre = e.nombre
          WHERE r.fecha_reporte = (
              SELECT MAX(fecha_reporte)
              FROM reportes
              WHERE DATE_FORMAT(fecha_reporte, '%Y-%m') = ?
          )`;

    const [results] = await connection.query(query, [req.params.month]);
    res.json({ analysis: results });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al obtener datos" });
  }
};

module.exports = {
  get_categories_report,
  get_medicine_evolution,
  get_compare_months,
  update_medicine_management,
  get_analysis_all,
};
