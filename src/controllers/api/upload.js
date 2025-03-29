const connection = require('../../db/connection')

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

module.exports = {
    upload_excel
}
