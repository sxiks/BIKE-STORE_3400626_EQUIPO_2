const dashboardService = require('../services/dashboard.services');
const { ok } = require('../utils/respuesta');

async function metricas(req, res) {
  ok(res, await dashboardService.metricas(req.query));
}

async function alertas(req, res) {
  ok(res, await dashboardService.alertas());
}

module.exports = { metricas, alertas };
