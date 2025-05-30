const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const body_parser = require("body-parser");
const config = require("./src/config/config");
const router = require("./src/routes/router");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
require("./src/auth/passport");

app.set("view engine", "ejs");
app.use(cors(config.cors_options));
app.set("views", path.join(__dirname, "src/views"));
app.use(body_parser.urlencoded({ extended: true }));
app.use(express.json());

// Configuración mejorada de sesión
app.use(
  session({
    secret:
      config.session.secret ||
      "hwY9$2Z7!r@fYq8#NtE@D4KsPX3&x5vLz^uJkWz8eQGZL3mT", // Usar el secret de la configuración
    resave: true,
    saveUninitialized: true,
    name: "sessionId", // Nombre de la cookie
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000,
      rolling: true,
    },
    store: new session.MemoryStore(), // Opcional: para desarrollo
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.use(router.router);
app.set("port", config.port);

app.use("/public", express.static(path.join(__dirname, "src/public")));
app.use("/auth", require("./src/routes/auth"));

app.listen(config.port, () => {
  console.log(`apd mismatches working on port ${config.port}`);
});

module.exports = app;
