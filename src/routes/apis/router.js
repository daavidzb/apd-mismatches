const router = require('express').Router();
const api = require('../../controllers/api/apis')

router.get('/api/reports/categories/:month', api.get_categories_report);

module.exports.router = router