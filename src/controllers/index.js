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
      title: "Descuadres",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// api resumen mensual
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

// api top medicinas 
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

// api subida de archivos excel 
const upload_excel = async (req, res) => {
  try {
    console.log("1. Iniciando proceso de subida de archivo");

    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => {
          console.log("2. Archivo recibido:", file.originalname);
          console.log("   Mimetype:", file.mimetype);
          callback(null, "./src/public/uploads/excel");
        },
        filename: (req, file, callback) => {
          console.log("3. Guardando archivo como:", file.originalname);
          callback(null, file.originalname);
        },
      }),
      fileFilter: (req, file, callback) => {
        let ext = path.extname(file.originalname);
        console.log("4. Validando extensión:", ext);
        console.log("   Tipo MIME:", file.mimetype);

        if (ext !== ".xlsx" && ext !== ".xls") {
          console.log("   ❌ Extensión no válida");
          return callback(
            new Error("Solo archivos .xlsx o .xls [SOLO EXCEL]"),
            false
          );
        }
        console.log("   ✅ Extensión válida");
        callback(null, true);
      },
    }).array("files");

    upload(req, res, async (error) => {
      if (error) {
        console.error("5. ❌ Error en upload:", error.message);
        return res.status(400).json({ error: error.message });
      }

      console.log("5. ✅ Archivos subidos correctamente");
      console.log("   Cantidad de archivos:", req.files?.length);

      const results = [];

      for (const file of req.files) {
        try {
          console.log("\n6. Procesando archivo:", file.originalname);
          console.log("   Path:", file.path);
          console.log("   Size:", file.size, "bytes");

          // Extraer fecha del nombre del archivo
          const dateMatch = file.originalname.match(
            /APD_descuadrado_(\d{4})_(\d{2})_(\d{2})/
          );
          if (!dateMatch) {
            results.push({
              filename: file.originalname,
              error: true,
              razon: "Formato de nombre inválido",
            });
            continue;
          }

          const reportDate = new Date(
            dateMatch[1],
            parseInt(dateMatch[2]) - 1,
            dateMatch[3]
          );

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
              detalles: `Ya existe un reporte para la fecha ${reportDate.toLocaleDateString()}`,
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
                    codigo:
                      rowValues[2]?.toString().trim().replace(/^0+/, "") || "",
                    descripcion: rowValues[3]?.toString().trim() || "",
                    razon: `${
                      rowValues[7]?.toString().trim() === "No existe"
                        ? "APD"
                        : "FarmaTools"
                    } no existe`,
                  };
                }

                const farmatools =
                  parseInt(
                    rowValues[5]?.toString().replace("FarmaTools=", "")
                  ) || 0;
                const armarioAPD =
                  parseInt(
                    rowValues[7]?.toString().replace("Armario_APD=", "")
                  ) || 0;
                const diferencia = farmatools - armarioAPD;
                const codigoMed =
                  rowValues[2]?.toString().trim().replace(/^0+/, "") || "";

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

          const validMedicines = processedData.filter(
            (item) => !item.isInvalid
          );
          const invalidMedicines = processedData.filter(
            (item) => item.isInvalid
          );

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
          // En la función upload_excel, modificar la inserción de descuadres:

          // Después de insertar los descuadres
          if (validMedicines.length > 0) {
            await new Promise((resolve, reject) => {
              // Primero, verificar si alguno de estos medicamentos tenía estado 'Resuelto'
              const codigos = validMedicines.map((item) => item.codigo_med);
              connection.query(
                `
                  SELECT DISTINCT d.codigo_med 
                  FROM descuadres d
                  JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
                  WHERE d.codigo_med IN (?) 
                  AND mg.id_estado = 3
                  AND mg.id_gestion = (
                      SELECT MAX(mg2.id_gestion)
                      FROM medicamentos_gestionados mg2
                      JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
                      WHERE d2.codigo_med = d.codigo_med
                  )`,
                [codigos],
                async (error, resueltos) => {
                  if (error) reject(error);

                  // Insertar descuadres
                  connection.query(
                    "INSERT INTO descuadres (id_reporte, num_almacen, codigo_med, descripcion, cantidad_farmatools, cantidad_armario_apd, descuadre) VALUES ?",
                    [
                      validMedicines.map((item) => [
                        reportResult.insertId,
                        item.num_almacen,
                        item.codigo_med,
                        item.descripcion,
                        item.cantidad_farmatools,
                        item.cantidad_armario_apd,
                        item.descuadre,
                      ]),
                    ],
                    async (error, result) => {
                      if (error) reject(error);

                      const firstId = result.insertId;
                      const resueltosSet = new Set(
                        resueltos.map((r) => r.codigo_med)
                      );

                      // Crear gestiones iniciales
                      const values = validMedicines.map((item, index) => [
                        firstId + index, // id_descuadre
                        req.user.id_usuario, // id_usuario
                        1, // id_estado siempre Pendiente (1)
                        null, // id_categoria
                        null, // id_motivo
                        resueltosSet.has(item.codigo_med)
                          ? "Reapertura automática - Medicamento previamente resuelto"
                          : "Descuadre inicial", // observaciones
                      ]);

                      // Insertar gestiones
                      connection.query(
                        "INSERT INTO medicamentos_gestionados (id_descuadre, id_usuario, id_estado, id_categoria, id_motivo, observaciones) VALUES ?",
                        [values],
                        (error) => {
                          if (error) reject(error);
                          resolve();
                        }
                      );
                    }
                  );
                }
              );
            });
          }

          results.push({
            filename: file.originalname,
            fecha: reportDate,
            procesado: true,
            medicamentosValidos: validMedicines.length,
            medicamentosInvalidos: invalidMedicines,
          });

          console.log("7. ✅ Archivo procesado correctamente");
        } catch (error) {
          console.error("7. ❌ Error procesando archivo:", error.message);
          results.push({
            filename: file.originalname,
            error: true,
            razon: "Error al procesar el archivo",
            detalles: error.message,
          });
        }
      }

      console.log("8. Proceso completado");
      res.json({ success: true, results });
    });
  } catch (error) {
    console.error("Error general:", error);
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

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      filterClause = `AND YEAR(r.fecha_reporte) = ${year} AND MONTH(r.fecha_reporte) = ${m}`;
    }

    const query = `
    WITH LastDescuadres AS (
      SELECT 
        d.codigo_med,
        d.descripcion,
        d.descuadre as ultimo_descuadre,
        r.fecha_reporte,
        ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY r.fecha_reporte DESC) as rn
      FROM descuadres d
      JOIN reportes r ON d.id_reporte = r.id_reporte
      ${
        month !== "all"
          ? `WHERE YEAR(r.fecha_reporte) = ${year} AND MONTH(r.fecha_reporte) = ${m}`
          : ""
      }
    ),
    PatronDescuadres AS (
      SELECT 
        d.codigo_med,
        COUNT(*) as total_apariciones,
        COUNT(DISTINCT d.descuadre) as valores_unicos,
        GROUP_CONCAT(DISTINCT d.descuadre ORDER BY d.descuadre) as descuadres,
        MIN(d.descuadre) = MAX(d.descuadre) as es_constante
      FROM descuadres d
      JOIN reportes r ON d.id_reporte = r.id_reporte
      GROUP BY d.codigo_med
    ),
    UltimaGestion AS (
      SELECT 
        d.codigo_med,
        mg.id_estado,
        mg.id_usuario,
        mg.fecha_gestion,
        u.nombre as gestionado_por,
        ed.nombre as estado_gestion,
        ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY mg.fecha_gestion DESC) as rn
      FROM descuadres d
      LEFT JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
      LEFT JOIN usuarios u ON mg.id_usuario = u.id_usuario
      LEFT JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
      WHERE d.id_descuadre IN (
        SELECT MAX(id_descuadre) FROM descuadres GROUP BY codigo_med
      )
    )
    SELECT 
      ld.codigo_med,
      ld.descripcion,
      ld.ultimo_descuadre,
      CASE 
        WHEN ug.id_estado = 4 OR 
             (pd.total_apariciones > 1 AND pd.es_constante = 1)
        THEN 'regular'
        WHEN pd.total_apariciones = 1 THEN 'temporal'
        ELSE 'cambios'
      END as tipo_patron,
      pd.total_apariciones,
      pd.valores_unicos,
      pd.descuadres,
      COALESCE(ug.gestionado_por, NULL) as gestionado_por,
      COALESCE(ug.estado_gestion, 'Pendiente') as estado_gestion,
      COALESCE(ug.fecha_gestion, NULL) as fecha_gestion
    FROM LastDescuadres ld
    JOIN PatronDescuadres pd ON ld.codigo_med = pd.codigo_med
    LEFT JOIN UltimaGestion ug ON ld.codigo_med = ug.codigo_med AND ug.rn = 1
    WHERE ld.rn = 1
    ORDER BY ld.descripcion`;

    connection.query(query, (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ analysis: results || [] });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_analysis_detail = async (req, res) => {
  try {
    const { month, code } = req.params;

    // Obtener información básica del medicamento
    const medicina = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT DISTINCT codigo_med, descripcion 
               FROM descuadres 
               WHERE codigo_med = ?`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results[0]);
        }
      );
    });

    // Primero obtenemos todos los descuadres históricos para análisis de tendencia
    const historialCompleto = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT 
                  DATE(r.fecha_reporte) as fecha,
                  d.descuadre
              FROM descuadres d
              JOIN reportes r ON d.id_reporte = r.id_reporte
              WHERE d.codigo_med = ?
              ORDER BY r.fecha_reporte ASC`,
        [code],
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // Luego obtenemos los detalles filtrados por mes si es necesario
    let whereClause = "";
    let params = [code];

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      whereClause =
        "AND YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params.push(year, m);
    }

    const details = await new Promise((resolve, reject) => {
      connection.query(
        `WITH DailyDescuadres AS (
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
                      WHEN ABS(descuadre - COALESCE(prev_descuadre, descuadre)) > ABS(COALESCE(prev_descuadre, descuadre) * 0.5) THEN 1
                      ELSE 0
                  END as cambio_tendencia
              FROM DailyDescuadres`,
        params,
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    // Analizar tendencia
    const tieneCambiosSignificativos =
      historialCompleto.length >= 2 &&
      historialCompleto.some((curr, i) => {
        if (i === 0) return false;
        const prev = historialCompleto[i - 1];
        return (
          Math.abs(curr.descuadre - prev.descuadre) >
          Math.abs(prev.descuadre * 0.5)
        );
      });

    res.json({
      medicina,
      details,
      analisis: {
        total_registros: historialCompleto.length,
        tiene_cambios_significativos: tieneCambiosSignificativos,
      },
    });
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

const get_managed_mismatches = async (req, res) => {
  try {
    const { status } = req.params;
    const query = `
          SELECT DISTINCT
              d.codigo_med,
              d.descripcion,
              d.descuadre as ultimo_descuadre,
              mg.fecha_gestion,
              u.nombre as usuario,
              ed.nombre as estado,
              cd.nombre as categoria,
              md.nombre as motivo,
              mg.observaciones,
              ed.color as estado_color
          FROM descuadres d
          JOIN medicamentos_gestionados mg ON d.id_descuadre = mg.id_descuadre
          JOIN usuarios u ON mg.id_usuario = u.id_usuario
          JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
          LEFT JOIN categorias_descuadre cd ON mg.id_categoria = cd.id_categoria
          LEFT JOIN motivos_descuadre md ON mg.id_motivo = md.id_motivo
          WHERE mg.id_gestion = (
              SELECT MAX(mg2.id_gestion)
              FROM medicamentos_gestionados mg2
              JOIN descuadres d2 ON mg2.id_descuadre = d2.id_descuadre
              WHERE d2.codigo_med = d.codigo_med
          )
          AND mg.id_estado = ?
          ORDER BY mg.fecha_gestion DESC`;

    connection.query(query, [status], (error, results) => {
      if (error) throw error;
      res.json({ managed: results });
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
    console.log('Iniciando actualización:', req.params, req.body);
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

      connection.query(query, [code], (error, results) => {
        if (error) {
          console.error('Error al obtener descuadre:', error);
          reject(error);
        }
        resolve(results);
      });
    });

    if (!descuadre) {
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

      console.log('Insertando gestión:', values);

      connection.query(insertQuery, values, (error) => {
        if (error) {
          console.error('Error al insertar gestión:', error);
          reject(error);
        }
        resolve();
      });
    });

    console.log('Gestión actualizada correctamente');
    res.json({ success: true });

  } catch (error) {
    console.error("Error en update_managed_mismatch:", error);
    res.status(500).json({ error: error.message });
  }
};

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

// Consulta para obtener medicamentos que pueden ser regularizados
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

const get_categorias = async (req, res) => {
  try {
    const query = `
          SELECT 
              id_categoria,
              nombre
          FROM categorias_descuadre 
          ORDER BY nombre`;

    connection.query(query, (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ categorias: results || [] });
    });
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
  get_analysis_all,
  get_categorias,
};
