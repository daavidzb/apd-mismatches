const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { isAuthenticated, isNotAuthenticated } = require('../auth/middleware');
const connection = require('../db/connection');

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        // Usar promesas con connection.query
        const query = 'SELECT * FROM usuarios WHERE username = ?';
        return new Promise((resolve, reject) => {
            connection.query(query, [username], async (error, results) => {
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
        });
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id_usuario);
});

passport.deserializeUser((id, done) => {
    const query = 'SELECT * FROM usuarios WHERE id_usuario = ?';
    connection.query(query, [id], (error, results) => {
        if (error) return done(error);
        done(null, results[0]);
    });
});

router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', { message: req.flash('error') });
});

router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('auth/register');
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: info.message || 'Error de autenticación' 
            });
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.json({ 
                success: true, 
                message: 'Inicio de sesión exitoso' 
            });
        });
    })(req, res, next);
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, nombre } = req.body;
        
        // Verificar si el usuario ya existe
        connection.query('SELECT * FROM usuarios WHERE username = ?', [username], async (error, results) => {
            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al verificar usuario'
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de usuario ya está en uso'
                });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                
                connection.query(
                    'INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)',
                    [username, hashedPassword, nombre, 'user'],
                    (error) => {
                        if (error) {
                            return res.status(500).json({
                                success: false,
                                message: 'Error al registrar usuario'
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Registro exitoso'
                        });
                    }
                );
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: 'Error al procesar el registro'
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
});

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.redirect('/');
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;