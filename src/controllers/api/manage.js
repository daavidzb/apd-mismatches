const connection = require("../../db/connection");

const get_managed_mismatches = async (req, res) => {
  try {
    const { status } = req.params;
    const query = `
      WITH UltimoReporte AS (
        SELECT MAX(fecha_reporte) as fecha_ultimo 
        FROM reportes
      ),
      UltimosDescuadres AS (
        SELECT 
          d.codigo_med,
          d.descripcion,
          d.descuadre,
          d.cantidad_farmatools,
          d.cantidad_armario_apd,
          r.fecha_reporte,
          COALESCE(mg.id_estado, 1) as id_estado,
          mg.fecha_gestion,
          mg.observaciones,
          u.nombre as gestionado_por,
          cd.nombre as categoria,
          ed.nombre as estado,
          ed.color as estado_color
        FROM descuadres d
        JOIN reportes r ON d.id_reporte = r.id_reporte
        JOIN UltimoReporte ur ON r.fecha_reporte = ur.fecha_ultimo
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
        LEFT JOIN usuarios u ON mg.id_usuario = u.id_usuario
        LEFT JOIN estados_descuadre ed ON mg.id_estado = ed.id_estado
        LEFT JOIN categorias_descuadre cd ON mg.id_categoria = cd.id_categoria
      )
      SELECT * FROM UltimosDescuadres 
      WHERE id_estado = ? OR (? = 1 AND (id_estado IS NULL OR id_estado = 1))
      ORDER BY fecha_gestion DESC, descripcion ASC`;

    connection.query(query, [status, status], (error, results) => {
      if (error) {
        console.error("Error en consulta:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ managed: results });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
const update_managed_mismatch = async (req, res) => {
  try {
    console.log("Iniciando actualización:", req.params, req.body);
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
          console.error("Error al obtener descuadre:", error);
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
        observaciones,
      ];

      console.log("Insertando gestión:", values);

      connection.query(insertQuery, values, (error) => {
        if (error) {
          console.error("Error al insertar gestión:", error);
          reject(error);
        }
        resolve();
      });
    });

    console.log("Gestión actualizada correctamente");
    res.json({ success: true });
  } catch (error) {
    console.error("Error en update_managed_mismatch:", error);
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
  get_managed_details,
  update_managed_mismatch,
  get_managed_mismatches,
  get_categorias,
};
