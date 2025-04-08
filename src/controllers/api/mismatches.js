const connection = require("../../db/connection");

const get_mismatches_history = async (req, res) => {
  try {
    const { code } = req.params;
    const query = `
        SELECT 
          d.codigo_med,
          d.descripcion,
          d.descuadre,
          d.cantidad_farmatools,
          d.cantidad_armario_apd,
          r.fecha_reporte,
          mg.id_estado,
          ed.nombre as estado,
          mg.observaciones
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
        WHERE d.codigo_med = ?
        ORDER BY r.fecha_reporte ASC`;

    connection.query(query, [code], (error, results) => {
      if (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Detectar cambios en los descuadres
      const historyWithChanges = results.map((item, index, arr) => {
        if (index === 0) return { ...item, hasChange: false, change: 0 };

        const prevItem = arr[index - 1];
        const change = item.descuadre - prevItem.descuadre;
        const hasChange = change !== 0;

        return {
          ...item,
          hasChange,
          change,
        };
      });

      res.json(historyWithChanges);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const get_mismatches = async (req, res) => {
  try {
    const query = `
      WITH LastState AS (
        SELECT 
          d.codigo_med,
          d.descripcion,
          d.descuadre,
          r.fecha_reporte,
          mg.id_estado,
          ed.nombre as estado,
          ed.color,
          mg.observaciones,
          ROW_NUMBER() OVER (PARTITION BY d.codigo_med ORDER BY r.fecha_reporte DESC) as rn
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
      )
      SELECT * FROM LastState 
      WHERE rn = 1 
      ORDER BY fecha_reporte DESC`;

    connection.query(query, (error, results) => {
      if (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ mismatches: results });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  get_mismatches_history,
  get_mismatches,
};
