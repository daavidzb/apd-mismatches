const errorHandler = (err, req, res, next) => {
    console.error('Error no manejado:', err);

    // Errores de MySQL
    if (err.code && err.code.startsWith('ER_')) {
        return res.status(503).json({
            error: 'Error de base de datos',
            message: 'Problema temporal con la base de datos',
            code: err.code
        });
    }

    // Errores de Multer
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'Error en la subida de archivos',
            message: err.message
        });
    }

    // Errores de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            message: err.message
        });
    }

    // Errores de archivos
    if (err.code === 'ENOENT') {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            message: 'El archivo solicitado no existe'
        });
    }

    // Error general
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' 
            ? 'Ha ocurrido un error inesperado' 
            : err.message
    });
};

module.exports = errorHandler;