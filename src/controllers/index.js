const xlsx = require("xlsx");
const multer = require("multer");
const path = require("path");
const connection = require("../db/connection");

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

const mismatches_view = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.fecha_reporte,
        COUNT(*) OVER (PARTITION BY r.id_reporte) as total_descuadres,
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

    res.render("mismatches", { 
      descuadres: results,
      title: 'Descuadres' 
    });
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
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          callback(null, "./src/public/uploads/excel");
        },
        filename: (req, file, callback) => {
          callback(null, file.originalname);
        },
      }),
      fileFilter: (req, file, callback) => {
        let ext = path.extname(file.originalname);
        if (ext !== ".xlsx" && ext !== ".xls") {
          return callback(new Error("Solo archivos .xlsx o .xls [SOLO EXCEL]"), false);
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
        try {
          // Extraer fecha del nombre del archivo
          const dateMatch = file.originalname.match(/APD_descuadrado_(\d{4})_(\d{2})_(\d{2})/);
          if (!dateMatch) {
            results.push({
              filename: file.originalname,
              error: true,
              razon: "Formato de nombre inválido"
            });
            continue;
          }

          const reportDate = new Date(dateMatch[1], parseInt(dateMatch[2]) - 1, dateMatch[3]);

          // Verificar reporte existente
          const existingReport = await new Promise((resolve, reject) => {
            connection.query(
              "SELECT id_reporte FROM reportes WHERE DATE(fecha_reporte) = DATE(?)",
              [reportDate],
              (error, results) => {
                if (error) reject(error);
                resolve(results[0]);
              }
            );
          });

          if (existingReport) {
            results.push({
              filename: file.originalname,
              error: true,
              razon: "Reporte duplicado",
              detalles: `Ya existe un reporte para la fecha ${reportDate.toLocaleDateString()}`
            });
            continue;
          }

          // Procesar el archivo usando el método que funciona
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
                  return {
                    isInvalid: true,
                    codigo: rowValues[2]?.toString().trim().replace(/^0+/, "") || "",
                    descripcion: rowValues[3]?.toString().trim() || "",
                    razon: `${rowValues[7]?.toString().trim() === "No existe" ? "APD" : "FarmaTools"} no existe`
                  };
                }

                const farmatools = parseInt(rowValues[5]?.toString().replace("FarmaTools=", "")) || 0;
                const armarioAPD = parseInt(rowValues[7]?.toString().replace("Armario_APD=", "")) || 0;
                const diferencia = farmatools - armarioAPD;
                const codigoMed = rowValues[2]?.toString().trim().replace(/^0+/, "") || "";

                return {
                  isInvalid: false,
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

          const validMedicines = processedData.filter(item => !item.isInvalid);
          const invalidMedicines = processedData.filter(item => item.isInvalid);

          // Insertar reporte
          const reportResult = await new Promise((resolve, reject) => {
            connection.query(
              "INSERT INTO reportes (fecha_reporte, nombre_archivo, total_descuadres) VALUES (?, ?, ?)",
              [reportDate, file.originalname, validMedicines.length],
              (error, result) => {
                if (error) reject(error);
                resolve(result);
              }
            );
          });

          // Insertar descuadres
          if (validMedicines.length > 0) {
            await new Promise((resolve, reject) => {
              connection.query(
                "INSERT INTO descuadres (id_reporte, num_almacen, codigo_med, descripcion, cantidad_farmatools, cantidad_armario_apd, descuadre) VALUES ?",
                [validMedicines.map(item => [
                  reportResult.insertId,
                  item.num_almacen,
                  item.codigo_med,
                  item.descripcion,
                  item.cantidad_farmatools,
                  item.cantidad_armario_apd,
                  item.descuadre
                ])],
                (error) => {
                  if (error) reject(error);
                  resolve();
                }
              );
            });
          }

          results.push({
            filename: file.originalname,
            fecha: reportDate,
            procesado: true,
            medicamentosValidos: validMedicines.length,
            medicamentosInvalidos: invalidMedicines
          });

        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            error: true,
            razon: "Error al procesar el archivo",
            detalles: error.message
          });
        }
      }

      res.json({ success: true, results });
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

const get_analysis = async (req, res) => {
  try {
    const { month } = req.params;
    let filterClause = "";
    let year, m;

    if (month && month !== "all") {
      [year, m] = month.split("-");
      filterClause = `AND YEAR(r.fecha_reporte) = ${year} AND MONTH(r.fecha_reporte) = ${m}`;
    }

    const query = `
      WITH DailyChanges AS (
          SELECT 
              d.codigo_med,
              d.descripcion,
              d.descuadre,
              DATE(r.fecha_reporte) as fecha,
              d.cantidad_farmatools,
              d.cantidad_armario_apd,
              LAG(d.descuadre) OVER (PARTITION BY d.codigo_med ORDER BY DATE(r.fecha_reporte)) as prev_descuadre
          FROM descuadres d
          JOIN reportes r ON d.id_reporte = r.id_reporte
          WHERE d.descuadre != 0 ${filterClause}
      ),
      LastDescuadre AS (
          SELECT
              d.codigo_med,
              d.descuadre as ultimo_descuadre,
              d.cantidad_farmatools,
              d.cantidad_armario_apd,
              r.fecha_reporte
          FROM descuadres d
          JOIN reportes r ON d.id_reporte = r.id_reporte
          WHERE (d.codigo_med, r.fecha_reporte) IN (
              SELECT 
                  d2.codigo_med,
                  MAX(r2.fecha_reporte)
              FROM descuadres d2
              JOIN reportes r2 ON d2.id_reporte = r2.id_reporte
              ${month !== "all" ? `WHERE YEAR(r2.fecha_reporte) = ${year} AND MONTH(r2.fecha_reporte) = ${m}` : ''}
              GROUP BY d2.codigo_med
          )
      ),
      ModaCalculation AS (
          SELECT
              d.codigo_med,
              d.descuadre as moda
          FROM descuadres d
          JOIN reportes r ON d.id_reporte = r.id_reporte
          ${month !== "all" ? `WHERE YEAR(r.fecha_reporte) = ${year} AND MONTH(r.fecha_reporte) = ${m}` : ''}
          GROUP BY d.codigo_med, d.descuadre
          HAVING COUNT(*) = (
              SELECT COUNT(*)
              FROM descuadres d2
              JOIN reportes r2 ON d2.id_reporte = r2.id_reporte
              WHERE d2.codigo_med = d.codigo_med
              GROUP BY d2.descuadre
              ORDER BY COUNT(*) DESC
              LIMIT 1
          )
      ),
      GestionInfo AS (
          SELECT 
              d.codigo_med,
              u.nombre as gestionado_por,
              mg.id_estado,
              mg.fecha_gestion,
              CASE 
                  WHEN mg.id_estado = 3 THEN 'Corregido'
                  WHEN mg.id_estado = 2 THEN 'En proceso'
                  ELSE 'Pendiente'
              END as estado_gestion
          FROM medicamentos_gestionados mg
          JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
          JOIN usuarios u ON mg.id_usuario = u.id_usuario
          WHERE (d.codigo_med, mg.fecha_gestion) IN (
              SELECT codigo_med, MAX(fecha_gestion)
              FROM medicamentos_gestionados mg2
              JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
              GROUP BY codigo_med
          )
      )
      SELECT DISTINCT
          ld.codigo_med,
          d.descripcion,
          ld.ultimo_descuadre,
          ld.cantidad_farmatools as ultima_cantidad_farmatools,
          ld.cantidad_armario_apd as ultima_cantidad_armario_apd,
          mc.moda,
          CASE WHEN COUNT(DISTINCT dc.descuadre) > 1 THEN 1 ELSE 0 END as tiene_cambios_tendencia,
          COALESCE(gi.gestionado_por, NULL) as gestionado_por,
          COALESCE(gi.estado_gestion, 'Pendiente') as estado_gestion,
          COALESCE(gi.fecha_gestion, NULL) as fecha_gestion
      FROM LastDescuadre ld
      JOIN descuadres d ON ld.codigo_med = d.codigo_med
      LEFT JOIN DailyChanges dc ON d.codigo_med = dc.codigo_med
      LEFT JOIN ModaCalculation mc ON d.codigo_med = mc.codigo_med
      LEFT JOIN GestionInfo gi ON d.codigo_med = gi.codigo_med
      GROUP BY 
          ld.codigo_med, 
          d.descripcion, 
          ld.ultimo_descuadre, 
          ld.cantidad_farmatools,
          ld.cantidad_armario_apd, 
          mc.moda, 
          gi.gestionado_por, 
          gi.estado_gestion, 
          gi.fecha_gestion
      ORDER BY d.descripcion`;

    connection.query(query, [], (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ analysis: results });
    });
  } catch (error) {
    console.error("Error:", error);
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
    const { id_estado, id_categoria, id_motivo, observaciones } = req.body;

    // Verificar si el medicamento ya está siendo gestionado
    const [existingManagement] = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT mg.id_gestion, mg.id_usuario, u.nombre as nombre_usuario, mg.id_descuadre
                 FROM medicamentos_gestionados mg
                 JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
                 JOIN usuarios u ON mg.id_usuario = u.id_usuario
                 WHERE d.codigo_med = ?
                 ORDER BY mg.fecha_gestion DESC
                 LIMIT 1`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // Si existe gestión previa
    if (existingManagement) {
      // Si es otro usuario quien lo gestiona
      if (existingManagement.id_usuario !== req.user.id_usuario) {
        return res.status(400).json({
          error: "Este medicamento está siendo gestionado por otro usuario",
          isAlreadyManaged: true,
          managedBy: existingManagement.nombre_usuario,
        });
      }

      // Si es el mismo usuario, actualizar la gestión existente
      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE medicamentos_gestionados 
                     SET id_estado = ?, id_categoria = ?, id_motivo = ?, 
                         observaciones = ?, fecha_gestion = CURRENT_TIMESTAMP
                     WHERE id_gestion = ?`,
          [
            id_estado,
            id_categoria,
            id_motivo,
            observaciones,
            existingManagement.id_gestion,
          ],
          (error) => {
            if (error) reject(error);
            resolve();
          }
        );
      });

      return res.json({
        success: true,
        message: "Gestión actualizada correctamente",
      });
    }

    // Si no existe gestión previa, obtener el último descuadre
    const [lastMismatch] = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT id_descuadre 
                 FROM descuadres 
                 WHERE codigo_med = ? 
                 ORDER BY id_reporte DESC 
                 LIMIT 1`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // Insertar nueva gestión
    await new Promise((resolve, reject) => {
      connection.query(
        `INSERT INTO medicamentos_gestionados 
                 (id_descuadre, id_usuario, id_estado, id_categoria, id_motivo, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?)`,
        [
          lastMismatch.id_descuadre,
          req.user.id_usuario,
          id_estado,
          id_categoria,
          id_motivo,
          observaciones,
        ],
        (error) => {
          if (error) reject(error);
          resolve();
        }
      );
    });

    res.json({ success: true, message: "Gestión creada correctamente" });
  } catch (error) {
    console.error("Error:", error);
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
          COALESCE(mg.id_categoria, NULL) as id_categoria,
          COALESCE(mg.id_motivo, NULL) as id_motivo,
          COALESCE(mg.id_estado, NULL) as id_estado,
          COALESCE(mg.observaciones, '') as observaciones
        FROM descuadres d
        LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
        WHERE d.codigo_med = ?
        ORDER BY mg.fecha_gestion DESC
        LIMIT 1
        `,
        [code],
        (error, results) => {
          if (error) reject(error);
          // Si no hay resultados, devolver un objeto con valores por defecto
          resolve(
            results[0] || {
              codigo_med: code,
              descripcion: "",
              id_categoria: null,
              id_motivo: null,
              id_estado: null,
              observaciones: "",
            }
          );
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
      title: "Gestionar Descuadres",
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

    const query = `
      SELECT DISTINCT
        d.codigo_med,
        d.descripcion,
        d.descuadre,
        mg.fecha_gestion,
        u.nombre as usuario,
        ed.nombre as estado,
        cd.nombre as categoria,
        md.nombre as motivo,
        mg.observaciones,
        ed.color as estado_color
      FROM medicamentos_gestionados mg
      JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
      JOIN usuarios u ON mg.id_usuario = u.id_usuario
      JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
      LEFT JOIN categorias_descuadre cd ON mg.id_categoria = cd.id_categoria
      LEFT JOIN motivos_descuadre md ON mg.id_motivo = md.id_motivo
      WHERE mg.id_estado = ?
      ORDER BY mg.fecha_gestion DESC`;

    connection.query(query, [status], (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Si no hay resultados, devolver array vacío en lugar de error
      res.json({ managed: results || [] });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_managed_details = async (req, res) => {
  try {
    const { codigo } = req.params;
    const query = `
            SELECT DISTINCT
                d.codigo_med,
                d.descripcion,
                d.descuadre,
                mg.fecha_gestion,
                u.nombre as usuario,
                ed.nombre as estado,
                ed.color as estado_color,
                cd.nombre as categoria,
                md.nombre as motivo,
                mg.observaciones,
                mg.id_estado,
                mg.id_categoria,
                mg.id_motivo
            FROM medicamentos_gestionados mg
            JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
            JOIN usuarios u ON mg.id_usuario = u.id_usuario
            JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
            LEFT JOIN categorias_descuadre cd ON mg.id_categoria = cd.id_categoria
            LEFT JOIN motivos_descuadre md ON mg.id_motivo = md.id_motivo
            WHERE d.codigo_med = ?
            ORDER BY mg.fecha_gestion DESC
            LIMIT 1`;

    connection.query(query, [codigo], (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }
      if (!results.length) {
        return res
          .status(404)
          .json({ error: "No se encontraron detalles para este medicamento" });
      }
      res.json(results[0]);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const update_managed_mismatch = async (req, res) => {
  try {
    const { code } = req.params;
    const { id_estado, id_categoria, id_motivo, observaciones } = req.body;

    // Obtener el último descuadre del medicamento
    const [descuadre] = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT d.id_descuadre, mg.id_gestion
         FROM descuadres d
         JOIN reportes r ON d.id_reporte = r.id_reporte
         LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
         WHERE d.codigo_med = ?
         ORDER BY r.fecha_reporte DESC, d.id_descuadre DESC
         LIMIT 1`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    if (!descuadre) {
      return res.status(404).json({ error: "Descuadre no encontrado" });
    }

    // Actualizar o insertar en medicamentos_gestionados
    const query = descuadre.id_gestion
      ? `UPDATE medicamentos_gestionados 
       SET id_estado = ?, id_categoria = ?, id_motivo = ?, 
           observaciones = ?, fecha_gestion = CURRENT_TIMESTAMP
       WHERE id_gestion = ?`
      : `INSERT INTO medicamentos_gestionados 
       (id_descuadre, id_usuario, id_estado, id_categoria, id_motivo, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`;

    const params = descuadre.id_gestion
      ? [
          id_estado,
          id_categoria,
          id_motivo,
          observaciones,
          descuadre.id_gestion,
        ]
      : [
          descuadre.id_descuadre,
          req.user.id_usuario,
          id_estado,
          id_categoria,
          id_motivo,
          observaciones,
        ];

    await new Promise((resolve, reject) => {
      connection.query(query, params, (error) => {
        if (error) reject(error);
        resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error in update_managed_mismatch:", error);
    res.status(500).json({ error: error.message });
  }
};

const dashboard_view = async (req, res) => {
  try {
    // Obtener estadísticas
    const stats = await Promise.all([
      // Descuadres de hoy (distinct)
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total 
           FROM descuadres d 
           JOIN reportes r ON d.id_reporte = r.id_reporte 
           WHERE DATE(r.fecha_reporte) = CURDATE()`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
      // Descuadres de ayer (distinct)
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total 
           FROM descuadres d 
           JOIN reportes r ON d.id_reporte = r.id_reporte 
           WHERE DATE(r.fecha_reporte) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
      // Resueltos (último estado)
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total 
           FROM medicamentos_gestionados mg 
           JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
           WHERE mg.id_estado = 3 
           AND mg.id_gestion IN (
             SELECT MAX(mg2.id_gestion)
             FROM medicamentos_gestionados mg2
             JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
             GROUP BY d2.codigo_med
           )`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
      // En proceso (último estado)
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total 
           FROM medicamentos_gestionados mg 
           JOIN descuadres d ON mg.id_descuadre = d.id_descuadre
           WHERE mg.id_estado = 2
           AND mg.id_gestion IN (
             SELECT MAX(mg2.id_gestion)
             FROM medicamentos_gestionados mg2
             JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
             GROUP BY d2.codigo_med
           )`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
      // Total último mes (distinct)
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total 
           FROM descuadres d 
           JOIN reportes r ON d.id_reporte = r.id_reporte 
           WHERE r.fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
      // Total pendientes
      new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(DISTINCT d.codigo_med) as total
           FROM descuadres d
           LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
           WHERE mg.id_gestion IS NULL
           OR d.codigo_med NOT IN (
             SELECT d2.codigo_med
             FROM medicamentos_gestionados mg2
             JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
           )`,
          (error, results) => {
            if (error) reject(error);
            resolve(results[0].total);
          }
        );
      }),
    ]);

    const [hoy, ayer, resueltos, enProceso, total, pendientes] = stats;
    const hoyVsAyer = ayer ? Math.round(((hoy - ayer) / ayer) * 100) : 0;
    const porcentajeResueltos = total ? Math.round((resueltos / total) * 100) : 0;
    const porcentajeEnProceso = total ? Math.round((enProceso / total) * 100) : 0;
    const porcentajePendientes = total ? Math.round((pendientes / total) * 100) : 0;

    res.render("dashboard", {
      title: "Dashboard",
      active: "dashboard",
      user: req.user,
      stats: {
        hoy,
        ayer,
        hoyVsAyer,
        resueltos,
        porcentajeResueltos,
        enProceso,
        porcentajeEnProceso,
        pendientes,
        porcentajePendientes,
        total,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint para obtener datos del gráfico de tendencia
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
        `SELECT 
           COALESCE(ed.nombre, 'Pendiente') as nombre,
           COUNT(DISTINCT d.codigo_med) as total
         FROM descuadres d
         LEFT JOIN (
           SELECT d2.codigo_med, mg.id_estado
           FROM medicamentos_gestionados mg
           JOIN descuadres d2 ON mg.id_descuadre = d2.id_descuadre
           WHERE mg.id_gestion IN (
             SELECT MAX(mg2.id_gestion)
             FROM medicamentos_gestionados mg2
             JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
             GROUP BY d2.codigo_med
           )
         ) latest_status ON d.codigo_med = latest_status.codigo_med
         LEFT JOIN estados_descuadre ed ON latest_status.id_estado = ed.id_estado
         GROUP BY COALESCE(ed.nombre, 'Pendiente')
         ORDER BY 
           CASE 
             WHEN nombre = 'Pendiente' THEN 1
             WHEN nombre = 'En proceso' THEN 2
             WHEN nombre = 'Corregido' THEN 3
             ELSE 4
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
  get_managed_details,
  update_managed_mismatch,
  dashboard_view,
  get_trend_data,
  get_state_distribution,
};
