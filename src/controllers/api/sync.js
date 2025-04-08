const connection = require("../../db/connection");

const get_analysis = async (req, res) => {
  try {
    const { month } = req.params;
    let filterClause = "";
    let params = [];

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      filterClause = "WHERE YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params = [year, m];
    }

    const query = `
    WITH LastDescuadres AS (
      SELECT 
        d.codigo_med,
        d.descripcion,
        d.descuadre as ultimo_descuadre,
        r.fecha_reporte as fecha_ultimo_reporte,
        ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY r.fecha_reporte DESC) as rn
      FROM descuadres d
      JOIN reportes r ON d.id_reporte = r.id_reporte
      ${filterClause}
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
      ld.fecha_ultimo_reporte,
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
    ORDER BY ld.fecha_ultimo_reporte DESC, ld.descripcion`;

    const results = await new Promise((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    res.json({ analysis: results || [] });

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
    console.log("Iniciando actualización de medicamento:", req.params.code);
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

      console.log("Query para obtener descuadre:", query);
      console.log("Código medicamento:", code);

      connection.query(query, [code], (error, results) => {
        if (error) {
          console.error("Error al obtener descuadre:", error);
          reject(error);
        }
        console.log("Resultado descuadre:", results);
        resolve(results);
      });
    });

    if (!descuadre) {
      console.log("No se encontró el descuadre para:", code);
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
        observaciones,
      ];

      console.log("Query de inserción:", insertQuery);
      console.log("Valores a insertar:", values);

      connection.query(insertQuery, values, (error) => {
        if (error) {
          console.error("Error al insertar gestión:", error);
          reject(error);
        }
        console.log("Gestión insertada correctamente");
        resolve();
      });
    });

    console.log("Gestión actualizada correctamente para:", code);
    res.json({ success: true });
  } catch (error) {
    console.error("Error en update_medicine_management:", error);
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

const get_medicine_history = async (req, res) => {
  try {
    const { code, month } = req.params;
    let filterClause = "";
    let params = [code];

    if (month && month !== "all") {
      const [year, m] = month.split("-");
      filterClause =
        "AND YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?";
      params.push(year, m);
    }

    const query = `
      SELECT 
        d.codigo_med,
        d.descripcion,
        d.descuadre,
        r.fecha_reporte,
        mg.id_estado,
        ed.nombre as estado,
        COALESCE(mg.observaciones, 'Sin observaciones') as observaciones
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
      WHERE d.codigo_med = ? ${filterClause}
      ORDER BY r.fecha_reporte ASC`;

    connection.query(query, params, (error, results) => {
      if (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(results);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  get_analysis,
  get_analysis_all,
  get_analysis_detail,
  get_medicine_management,
  update_medicine_management,
  update_medicine_status,
  get_medicine_history,
};
