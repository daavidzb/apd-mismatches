const xlsx = require("xlsx");
const multer = require("multer");
const path = require("path");
const connection = require("../db/connection");

const upload_view = async (req, res) => {
  try {
    res.render("upload-view");
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

const reports_view = async (req, res) => {
  try {
    res.render("reports");
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
      SELECT 
        r.fecha_reporte,
        r.total_descuadres,
        d.codigo_med,
        d.descripcion,
        d.cantidad_farmatools,
        d.cantidad_armario_apd,
        d.descuadre
      FROM reportes r 
      JOIN descuadres d ON r.id_reporte = d.id_reporte 
      ORDER BY r.fecha_reporte DESC, d.codigo_med ASC
    `;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    res.render("mismatches", { descuadres: results });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const get_month_report = async (req, res) => {
  try {
    const [year, month] = req.params.month.split("-");
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT 
          DATE(fecha_reporte) as fecha, 
          COUNT(*) as total
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        WHERE YEAR(fecha_reporte) = ? AND MONTH(fecha_reporte) = ?
        GROUP BY DATE(fecha_reporte)
        ORDER BY fecha_reporte
        `,
        [year, month],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // fechas en formato ISO
    const formattedResults = results.map((row) => ({
      ...row,
      fecha: row.fecha.toISOString().split("T")[0],
      total: parseInt(row.total),
    }));

    res.json({ daily: formattedResults });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_top_medicines = async (req, res) => {
  try {
    const [year, month] = req.params.month.split("-");
    console.log(`Fetching top medicines for ${year}-${month}`); // Debug log

    const results = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT 
          d.codigo_med,
          d.descripcion,
          COUNT(*) as total_descuadres,
          COUNT(*) * 100.0 / (
            SELECT COUNT(*)
            FROM descuadres d2
            JOIN reportes r2 ON d2.id_reporte = r2.id_reporte
            WHERE YEAR(r2.fecha_reporte) = ? AND MONTH(r2.fecha_reporte) = ?
          ) as frecuencia
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        WHERE YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?
        GROUP BY d.codigo_med, d.descripcion
        ORDER BY total_descuadres DESC
        LIMIT 10
        `,
        [year, month, year, month],
        (error, results) => {
          if (error) {
            console.error("Database error:", error);
            reject(error);
          }
          resolve(results);
        }
      );
    });

    console.log(`Found ${results.length} results`); // Debug log
    res.json({ medicines: results });
  } catch (error) {
    console.error("Error in get_top_medicines:", error);
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

const upload_excel = async (req, res) => {
  try {
    let upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          callback(null, "./src/public/uploads/excel");
        },
        filename: (req, file, callback) => {
          const fileName =
            file.originalname.split(".")[0] +
            "-" +
            Date.now() +
            path.extname(file.originalname);
          callback(null, fileName);
        },
      }),
      fileFilter: (req, file, callback) => {
        let ext = path.extname(file.originalname);
        if (ext !== ".xlsx" && ext !== ".xls") {
          return callback(
            new Error("solo archivos .xlsx o .xls [SOLO EXCEL]"),
            false
          );
        }
        callback(null, true);
      },
    }).array("files");

    upload(req, res, async (error) => {
      if (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }

      const results = [];
      for (const file of req.files) {
        const workbook = xlsx.readFile(file.path);
        const sheet_name_list = workbook.SheetNames;

        const rawData = xlsx.utils.sheet_to_json(
          workbook.Sheets[sheet_name_list[0]],
          {
            raw: false,
            defval: "",
            header: 1,
          }
        );

        const processedData = rawData
          .filter((row) => row.length > 0)
          .map((rowValues) => {
            const firstCell = rowValues[0]?.toString().trim() || "";
            if (firstCell === "Almacen=") {
              if (
                rowValues[5]?.toString().trim() === "No existe" ||
                rowValues[7]?.toString().trim() === "No existe"
              ) {
                return null;
              }

              const farmatools =
                parseInt(rowValues[5]?.toString().replace("FarmaTools=", "")) ||
                0;
              const armarioAPD =
                parseInt(
                  rowValues[7]?.toString().replace("Armario_APD=", "")
                ) || 0;
              const diferencia = farmatools - armarioAPD;
              const codigoMed =
                rowValues[2]?.toString().trim().replace(/^0+/, "") || "";

              return {
                num_almacen: parseInt(rowValues[1]?.toString().trim()) || 0,
                codigo_med: codigoMed,
                descripcion: rowValues[3]?.toString().trim() || "",
                cantidad_farmatools: farmatools,
                cantidad_armario_apd: armarioAPD,
                descuadre: diferencia,
              };
            }
            return null;
          })
          .filter((item) => item !== null);

        const totalDescuadres = processedData.filter(
          (item) => item.descuadre !== 0
        ).length;

        const reporteQuery =
          "INSERT INTO reportes (fecha_reporte, total_descuadres) VALUES (?, ?)";
        const reporteResult = await new Promise((resolve, reject) => {
          connection.query(
            reporteQuery,
            [new Date(), totalDescuadres],
            (error, result) => {
              if (error) reject(error);
              resolve(result);
            }
          );
        });

        const id_reporte = reporteResult.insertId;

        for (const item of processedData) {
          const descuadreQuery = `
            INSERT INTO descuadres 
            (id_reporte, num_almacen, codigo_med, descripcion, 
             cantidad_farmatools, cantidad_armario_apd, descuadre)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          await new Promise((resolve, reject) => {
            connection.query(
              descuadreQuery,
              [
                id_reporte,
                item.num_almacen,
                item.codigo_med,
                item.descripcion,
                item.cantidad_farmatools,
                item.cantidad_armario_apd,
                item.descuadre,
              ],
              (error, result) => {
                if (error) reject(error);
                resolve(result);
              }
            );
          });
        }

        results.push({
          filename: file.filename,
          data: processedData,
          totalMedicamentos: processedData.length,
          totalDescuadres: totalDescuadres,
          fecha: new Date().toISOString(),
          id_reporte: id_reporte,
        });
      }

      res.status(200).json({
        message:
          "Archivos procesados y guardados en la base de datos correctamente",
        results,
      });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
    });
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

const get_analysis = async (req, res) => {
  try {
    const { month } = req.params;
    let whereClause = "";
    let params = [];

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      whereClause =
        "WHERE YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params = [year, m, year, m, year, m];
    }

    const query = `
        WITH DailyChanges AS (
            SELECT 
                d.codigo_med,
                d.descripcion,
                d.descuadre,
                DATE(r.fecha_reporte) as fecha,
                LAG(d.descuadre) OVER (
                    PARTITION BY d.codigo_med 
                    ORDER BY DATE(r.fecha_reporte)
                ) as prev_descuadre
            FROM descuadres d
            JOIN reportes r ON d.id_reporte = r.id_reporte
            ${whereClause}
        ),
        ChangeDates AS (
            SELECT 
                codigo_med,
                GROUP_CONCAT(
                    DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') 
                    ORDER BY fecha
                ) as fechas_cambio
            FROM DailyChanges
            WHERE descuadre != COALESCE(prev_descuadre, descuadre)
            GROUP BY codigo_med
        ),
        LastDescuadre AS (
            SELECT 
                d.codigo_med,
                d.descuadre as ultimo_descuadre
            FROM descuadres d
            JOIN reportes r ON d.id_reporte = r.id_reporte
            WHERE (d.codigo_med, r.fecha_reporte) IN (
                SELECT codigo_med, MAX(fecha_reporte)
                FROM reportes r2
                JOIN descuadres d2 ON r2.id_reporte = d2.id_reporte
                GROUP BY codigo_med
            )
        ),
        ModaCalculation AS (
            SELECT 
                d.codigo_med,
                d.descuadre as moda
            FROM descuadres d
            JOIN reportes r ON d.id_reporte = r.id_reporte
            ${whereClause}
            GROUP BY d.codigo_med, d.descuadre
            HAVING COUNT(*) >= ALL (
                SELECT COUNT(*)
                FROM descuadres d2
                JOIN reportes r2 ON d2.id_reporte = r2.id_reporte
                WHERE d2.codigo_med = d.codigo_med
                GROUP BY d2.descuadre
            )
        )
        SELECT DISTINCT
            dc.codigo_med,
            dc.descripcion,
            ld.ultimo_descuadre,
            mc.moda
        FROM DailyChanges dc
        LEFT JOIN LastDescuadre ld ON dc.codigo_med = ld.codigo_med
        LEFT JOIN ModaCalculation mc ON dc.codigo_med = mc.codigo_med
        LEFT JOIN ChangeDates cd ON dc.codigo_med = cd.codigo_med
        WHERE cd.fechas_cambio IS NOT NULL
        GROUP BY dc.codigo_med
        ORDER BY ld.ultimo_descuadre DESC`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) {
          console.error("Database error:", error);
          reject(error);
        }
        resolve(results);
      });
    });

    res.json({ analysis: results });
  } catch (error) {
    console.error("Error in get_analysis:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_analysis_detail = async (req, res) => {
  try {
    const { month, code } = req.params;
    let whereClause = "";
    let params = [code];

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      whereClause =
        "AND YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params.push(year, m);
    }

    // Get medicine info
    const medicina = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT DISTINCT codigo_med, descripcion FROM descuadres WHERE codigo_med = ?`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results[0]);
        }
      );
    });

    // Get details
    const details = await new Promise((resolve, reject) => {
      connection.query(
        `
            WITH DailyDescuadres AS (
                SELECT 
                    DATE(r.fecha_reporte) as fecha,
                    d.descuadre,
                    LAG(d.descuadre) OVER (ORDER BY DATE(r.fecha_reporte)) as prev_descuadre
                FROM descuadres d
                JOIN reportes r ON d.id_reporte = r.id_reporte
                WHERE d.codigo_med = ? ${whereClause}
                GROUP BY DATE(r.fecha_reporte), d.descuadre
                ORDER BY fecha ASC
            )
            SELECT 
                fecha,
                descuadre,
                CASE 
                    WHEN descuadre != COALESCE(prev_descuadre, descuadre) THEN 1
                    ELSE 0
                END as cambio_tendencia
            FROM DailyDescuadres
            `,
        params,
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    res.json({ medicina, details });
  } catch (error) {
    console.error("Error in get_analysis_detail:", error);
    res.status(500).json({ error: error.message });
  }
};

const update_medicine_status = async (req, res) => {
  try {
    const { code } = req.params;
    const { id_categoria, id_motivo, id_estado, observaciones } = req.body;

    await new Promise((resolve, reject) => {
      connection.query(
        `
        UPDATE descuadres
        SET 
            id_categoria = ?,
            id_motivo = ?,
            id_estado = ?,
            observaciones = ?,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE codigo_med = ?
        `,
        [id_categoria, id_motivo, id_estado, observaciones, code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error in update_medicine_status:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_medicine_management = async (req, res) => {
  try {
    const { code } = req.params;

    // Obtener datos del medicamento
    const medicamento = await new Promise((resolve, reject) => {
      connection.query(
        `
        SELECT DISTINCT 
          d.codigo_med,
          d.descripcion,
          d.id_categoria,
          d.id_motivo,
          d.id_estado,
          d.observaciones
        FROM descuadres d
        WHERE d.codigo_med = ?
        LIMIT 1
        `,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results[0]);
        }
      );
    });

    // Obtener categorías, motivos y estados
    const [categorias, motivos, estados] = await Promise.all([
      new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM categorias_descuadre ORDER BY nombre",
          (error, results) => {
            if (error) reject(error);
            resolve(results);
          }
        );
      }),
      new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM motivos_descuadre ORDER BY nombre",
          (error, results) => {
            if (error) reject(error);
            resolve(results);
          }
        );
      }),
      new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM estados_descuadre ORDER BY nombre",
          (error, results) => {
            if (error) reject(error);
            resolve(results);
          }
        );
      }),
    ]);

    res.json({
      medicamento,
      categorias,
      motivos,
      estados,
    });
  } catch (error) {
    console.error("Error in get_medicine_management:", error);
    res.status(500).json({ error: error.message });
  }
};

const update_medicine_management = async (req, res) => {
  try {
    const { code } = req.params;
    const { id_estado, id_categoria, id_motivo, observaciones } = req.body;

    await new Promise((resolve, reject) => {
      connection.query(
        `
        UPDATE descuadres
        SET 
          id_estado = ?,
          id_categoria = ?,
          id_motivo = ?,
          observaciones = ?,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE codigo_med = ?
        `,
        [id_estado, id_categoria, id_motivo, observaciones, code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error in update_medicine_management:", error);
    res.status(500).json({ error: error.message });
  }
};

const managed_view = async (req, res) => {
  try {
    res.render("managed", {
      title: "Descuadres Gestionados",
      active: "managed",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_managed_mismatches = async (req, res) => {
  try {
    const { status } = req.params;

    const results = await new Promise((resolve, reject) => {
      connection.query(
        `
                SELECT 
                    d.codigo_med,
                    d.descripcion,
                    d.descuadre,
                    c.nombre as categoria,
                    m.nombre as motivo,
                    d.observaciones,
                    d.fecha_actualizacion,
                    e.nombre as estado,
                    e.color as estado_color
                FROM descuadres d
                JOIN estados_descuadre e ON d.id_estado = e.id_estado
                LEFT JOIN categorias_descuadre c ON d.id_categoria = c.id_categoria
                LEFT JOIN motivos_descuadre m ON d.id_motivo = m.id_motivo
                WHERE e.nombre = ?
                ORDER BY d.fecha_actualizacion DESC
                `,
        [status],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    res.json({ mismatches: results });
  } catch (error) {
    console.error("Error in get_managed_mismatches:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  upload_view,
  upload_excel,
  mismatches_view,
  reports_view,
  get_month_report,
  get_top_medicines,
  get_medicine_evolution,
  get_medicines_list,
  get_compare_months,
  analysis_view,
  get_analysis,
  get_analysis_detail,
  update_medicine_status,
  get_medicine_management,
  update_medicine_management,
  managed_view,
  get_managed_mismatches,
};
