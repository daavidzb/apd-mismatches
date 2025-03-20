const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const connection = require('../db/connection');

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        return connection.query('SELECT * FROM usuarios WHERE username = ?', [username], async (error, results) => {
            if (error) return done(error);
            
            const user = results[0];
            if (!user) return done(null, false, { message: 'Usuario no encontrado' });
            
            try {
                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) return done(null, false, { message: 'Contraseña incorrecta' });
                
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        });
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id_usuario);
});

passport.deserializeUser((id, done) => {
    connection.query('SELECT * FROM usuarios WHERE id_usuario = ?', [id], (error, results) => {
        if (error) return done(error);
        done(null, results[0]);
    });
});

module.exports = passport;