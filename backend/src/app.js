const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { UPLOAD_ROOT } = require('./config/uploads');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const productosRoutes = require('./routes/productos.routes');
const carritoRoutes = require('./routes/carrito.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Detrás de un proxy (despliegue), cuántos saltos confiar para que req.ip sea la IP del cliente.
// Lo usa el límite de intentos de /auth. En local es 0: se usa la IP de la conexión.
app.set('trust proxy', env.trustProxy);

// Cabeceras de seguridad (B1 · H-06): no anunciar Express, no adivinar el tipo de los archivos servidos
// (las imágenes de /uploads), no dejar que otra página incruste la API y no enviar la URL de origen.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  next();
});

// exposedHeaders: el frontend está en otro origen y necesita leer el nombre del archivo exportado (CU-18).
app.use(cors({ origin: env.corsOrigin, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_ROOT));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Bike Store API funciona' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
});

app.use(errorHandler);

module.exports = app;
