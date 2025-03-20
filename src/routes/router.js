const router = require('express').Router()

router.use('/', require('./web/').router)

module.exports.router = router