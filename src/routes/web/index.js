const router = require('express').Router();
const { isAuthenticated } = require('../../auth/middleware');
const reports = require('../../controllers/api/reports.js')
const views = require('../../controllers/views.js')
const upload = require('../../controllers/api/upload.js')
const sync = require('../../controllers/api/sync.js')
const manage = require('../../controllers/api/manage.js')
const dashboard = require('../../controllers/api/dashboard.js')

// Vistas 

router.get('/', isAuthenticated, (req, res) => {
    res.redirect('/dashboard');
});
router.get('/mismatches', isAuthenticated, views.mismatches_view)  
router.get('/upload', isAuthenticated, views.upload_view)  
router.get('/reports', isAuthenticated, views.reports_view)
router.get('/analysis', isAuthenticated, views.analysis_view);
router.get('/managed', isAuthenticated, views.managed_view);
router.get('/dashboard', isAuthenticated, views.dashboard_view);

// api subida archivos
router.post('/api/upload', upload.upload_excel)

// apis para reportes
router.get('/api/reports/categories/:month', reports.get_categories_report);
router.get('/api/reports/top-medicines/:month', reports.get_top_medicines);
router.get('/api/reports/month/:month', reports.get_month_report);
router.get('/api/reports/evolution/:code', reports.get_medicine_evolution);
router.get('/api/reports/medicines', reports.get_medicines_list);
router.get('/api/reports/compare/:month1/:month2', reports.get_compare_months);

// apis para sincronizar inventario
router.get('/api/analysis/:month?', sync.get_analysis);
router.get('/api/analysis/all/:month?', sync.get_analysis_all); 
router.get('/api/analysis/detail/:month/:code', sync.get_analysis_detail);
router.get('/api/analysis/manage/:code', sync.get_medicine_management);
router.put('/api/analysis/manage/:code', sync.update_medicine_management);
router.put('/api/analysis/update/:code', sync.update_medicine_status);
router.get('/api/analysis/history/:code/:month?', sync.get_medicine_history);


router.get('/api/managed/:status', manage.get_managed_mismatches);
router.put('/api/managed/update/:code', manage.update_managed_mismatch);
router.get('/api/managed/details/:codigo', manage.get_managed_details);
router.get('/api/managed/categorias', manage.get_categorias);

router.get('/api/dashboard/trend', dashboard.get_trend_data);
router.get('/api/dashboard/states', dashboard.get_state_distribution);


module.exports.router = router
