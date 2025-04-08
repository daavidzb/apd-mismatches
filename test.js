const get_analysis = async (req, res) => {
    try {
      const { month } = req.params;
      let filterClause = "";
      let params = [];
  
      // Corregir el manejo del filtro por mes
      if (month && month !== "all") {
        const [year, m] = month.split("-");
        filterClause = `AND YEAR(r.fecha_reporte) = ? AND MONTH(r.fecha_reporte) = ?`;
        params = [year, m];
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
        WHERE 1=1 ${filterClause}
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
  
      connection.query(query, params, (error, results) => {
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