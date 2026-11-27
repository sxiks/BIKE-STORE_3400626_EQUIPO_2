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
