const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mismatches',
    multipleStatements: true
})
connection.connect((error) => {
    if (error) {
        console.error('connection failed: ' + error);
        return
    }
    console.log('connection with database established');
})

module.exports = connection;