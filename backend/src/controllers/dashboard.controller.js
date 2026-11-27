const dashboardService = require('../services/dashboard.services');
const { ok } = require('../utils/respuesta');

async function metricas(req, res) {
  ok(res, await dashboardService.metricas(req.query));
}

async function alertas(req, res) {
  ok(res, await dashboardService.alertas());
}

// CU-18: responde el archivo (no JSON). Los errores (400) siguen saliendo como JSON por el manejador global.
async function exportar(req, res) {
  const { contenido, tipo, nombreArchivo } = await dashboardService.exportar(req.query);
  res.set({
    'Content-Type': tipo,
    'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    'Content-Length': contenido.length
  });
  res.send(contenido);
}

module.exports = { metricas, alertas, exportar };
