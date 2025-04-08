const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");
const connection = require("../../db/connection");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const validMimeTypes = [
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/excel",
    "application/x-excel",
    "application/x-msexcel",
    "application/octet-stream",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExt = [".xlsx", ".xls"].includes(ext);
  console.log("File MIME type:", file.mimetype);
  console.log("File extension:", ext);

  if (isValidExt || validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos Excel (.xlsx, .xls)"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por archivo
    files: 10, // 10 archivos
  },
}).array("files", 10); // hasta 10 archivos

const processUpload = (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "Archivo demasiado grande. Máximo 50MB" });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res
          .status(400)
          .json({ error: "Demasiados archivos. Máximo 10" });
      }
      console.error("Error de Multer:", err);
      return res.status(400).json({ error: err.message });
    } else if (err) {
      console.error("Error al subir:", err);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "No se han seleccionado archivos",
        });
      }

      console.log("Archivos recibidos:", req.files);

      const results = [];

      // Procesar archivos secuencialmente con async/await
      for (const file of req.files) {
        try {
          const dateMatch = file.originalname.match(
            /APD_descuadrado_(\d{4})_(\d{2})_(\d{2})/
          );
          if (!dateMatch) {
            results.push({
              fileName: file.originalname,
              status: "error",
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

          // Verificar duplicados usando Promise
          const existingReports = await new Promise((resolve, reject) => {
            connection.query(
              "SELECT id_reporte FROM reportes WHERE DATE(fecha_reporte) = DATE(?)",
              [reportDate],
              (error, results) => {
                if (error) reject(error);
                resolve(results);
              }
            );
          });

          if (existingReports && existingReports.length > 0) {
            results.push({
              fileName: file.originalname,
              status: "duplicate",
              date: reportDate,
              detalles: `Ya existe un reporte para la fecha ${reportDate.toLocaleDateString()}`,
            });
            continue;
          }

          // Procesar archivo Excel
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

          if (validMedicines.length === 0) {
            results.push({
              fileName: file.originalname,
              status: "error",
              error: true,
              razon: "No se encontraron datos válidos en el archivo",
            });
            continue;
          }

          //   console.log("Datos procesados:", validMedicines);

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

          const values = validMedicines.map((row) => [
            reportResult.insertId,
            row.num_almacen,
            row.codigo_med,
            row.descripcion,
            row.cantidad_farmatools,
            row.cantidad_armario_apd,
            row.descuadre,
          ]);

          await new Promise((resolve, reject) => {
            connection.query(
              `INSERT INTO descuadres 
               (id_reporte, num_almacen, codigo_med, descripcion, cantidad_farmatools, cantidad_armario_apd, descuadre) 
               VALUES ?`,
              [values],
              (error) => {
                if (error) reject(error);
                resolve();
              }
            );
          });

          results.push({
            fileName: file.originalname,
            status: "success",
            processed: {
              total: validMedicines.length,
              valid: validMedicines.length,
              invalid: invalidMedicines.length,
            },
            detalles: "Archivo procesado correctamente",
          });
        } catch (fileError) {
          console.error(`Error procesando ${file.originalname}:`, fileError);
          results.push({
            fileName: file.originalname,
            status: "error",
            error: true,
            razon: fileError.message || "Error al procesar el archivo",
          });
        }
      }

      res.json({
        message: "Archivos procesados",
        results: results,
      });
    } catch (error) {
      console.error("Error en processUpload:", error);
      res.status(500).json({
        error: "Error al procesar los archivos",
        details: error.message,
      });
    }
  });
};

module.exports = {
  processUpload,
};
