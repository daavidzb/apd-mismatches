require("dotenv").config();

module.exports = {
  // Servidor
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || "development",
  secret: process.env.SECRET_KEY,

  // Base de datos
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  },

  // Configuración de sesión
  session: {
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: parseInt(process.env.SESSION_MAX_AGE),
      secure: process.env.COOKIE_SECURE === "true",
      httpOnly: process.env.COOKIE_HTTP_ONLY === "true",
    },
  },

  // Configuración CORS
  cors_options: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: (
      process.env.CORS_METHODS || "GET,HEAD,PUT,PATCH,POST,DELETE"
    ).split(","),
    credentials: process.env.CORS_CREDENTIALS === "true",
  },

  // Configuración de archivos
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE),
    path: process.env.UPLOAD_PATH,
  },
};
