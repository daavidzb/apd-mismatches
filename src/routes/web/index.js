const router = require('express').Router();
const controller = require('../../controllers/index.js')
const { isAuthenticated } = require('../../auth/middleware');

router.get('/', isAuthenticated, controller.mismatches_view)  
router.get('/mismatches', controller.mismatches_view)  
router.get('/upload', isAuthenticated, controller.upload_view)  
router.get('/reports', isAuthenticated, controller.reports_view)
router.get('/analysis', isAuthenticated, controller.analysis_view);
router.get('/managed', isAuthenticated, controller.managed_view);
router.post('/upload-files', controller.upload_excel)

// Apis

router.get('/api/managed/:status', controller.get_managed_mismatches);
router.get('/api/reports/summary/:month', controller.get_month_report)
router.get('/api/reports/top-medicines/:month', controller.get_top_medicines);
router.get('/api/reports/evolution/:code', controller.get_medicine_evolution);
router.get('/api/reports/medicines', controller.get_medicines_list);
router.get('/api/reports/compare/:month1/:month2', controller.get_compare_months);
router.get('/api/analysis/:month?', controller.get_analysis);
router.get('/api/analysis/detail/:month/:code', controller.get_analysis_detail);
router.get('/api/analysis/manage/:code', controller.get_medicine_management);
router.post('/api/analysis/manage/:code', controller.update_medicine_management);
router.post('/api/analysis/update/:code', controller.update_medicine_status);
router.get('/api/managed/details/:codigo', controller.get_managed_details);

module.exports.router = router
