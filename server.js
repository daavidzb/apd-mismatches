const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
const body_parser = require('body-parser')
const config = require('./src/config/config')
const router = require('./src/routes/router')

app.set('view engine', 'ejs')
app.use(cors(config.cors_options))
app.set('views', path.join(__dirname, 'src/views'))
app.use(body_parser.urlencoded({extended: true}))
app.use(express.json())
app.use(router.router)
app.set('port', config.port)

app.use('/public', express.static(path.join(__dirname, 'src/public')))

app.listen(config.port, () => {
    console.log(`apd mismatches working on port ${config.port}`)
})

module.exports = app