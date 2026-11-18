// Consultas del tablero (CU-16, CU-17). Solo cuentan los pedidos en estado 'pagado'.
// Las fechas 'YYYY-MM-DD' se interpretan en la zona horaria de la sesión (DB_TIMEZONE).
const pool = require('../config/db');

function filtros({ desde, hasta, idCategoria }) {
  const valores = [];
  const condiciones = ["pe.estado = 'pagado'"];
  if (desde) {
    valores.push(desde);
    condiciones.push(`pe.created_at >= $${valores.length}::date`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`pe.created_at < ($${valores.length}::date + 1)`);
  }
  if (idCategoria) {
    valores.push(idCategoria);
    condiciones.push(`p.id_categoria = $${valores.length}`);
  }
  return { where: `WHERE ${condiciones.join(' AND ')}`, valores };
}

const FROM_VENTAS = `
  FROM pedidos pe
  JOIN detalle_pedido d ON d.id_pedido = pe.id_pedido
  JOIN productos p ON p.id_producto = d.id_producto`;

async function resumenVentas(criterios, db = pool) {
  const { where, valores } = filtros(criterios);
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS ventas_totales,
            COUNT(DISTINCT pe.id_pedido) AS cantidad_pedidos,
            COALESCE(SUM(d.cantidad), 0) AS unidades_vendidas
     ${FROM_VENTAS} ${where}`,
    valores
  );
  return rows[0];
}

async function masVendidos(criterios, limite = 5, db = pool) {
  const { where, valores } = filtros(criterios);
  valores.push(limite);
  const { rows } = await db.query(
    `SELECT p.id_producto, p.nombre, SUM(d.cantidad) AS unidades,
            SUM(d.cantidad * d.precio_unitario) AS ventas
     ${FROM_VENTAS} ${where}
     GROUP BY p.id_producto, p.nombre
     ORDER BY unidades DESC, ventas DESC
     LIMIT $${valores.length}`,
    valores
  );
  return rows;
}

// Alertas (decisión 16): todas por consulta, sin tablas propias.
async function productosStockBajo(umbral, db = pool) {
  const { rows } = await db.query(
    `SELECT id_producto, nombre, existencias FROM productos
     WHERE estado = 'activo' AND existencias > 0 AND existencias <= $1
     ORDER BY existencias, nombre`,
    [umbral]
  );
  return rows;
}

async function productosAgotados(db = pool) {
  const { rows } = await db.query(
    `SELECT id_producto, nombre FROM productos
     WHERE estado = 'activo' AND existencias = 0 ORDER BY nombre`
  );
  return rows;
}

async function inactivosEnCarritos(db = pool) {
  const { rows } = await db.query(
    `SELECT p.id_producto, p.nombre, COUNT(DISTINCT ci.id_carrito) AS carritos
     FROM carrito_items ci JOIN productos p ON p.id_producto = ci.id_producto
     WHERE p.estado = 'inactivo'
     GROUP BY p.id_producto, p.nombre ORDER BY carritos DESC`
  );
  return rows;
}

async function pedidosPorEstado(estado, db = pool) {
  const { rows } = await db.query(
    `SELECT id_pedido, numero_pedido, created_at FROM pedidos
     WHERE estado = $1 ORDER BY created_at DESC LIMIT 50`,
    [estado]
  );
  return rows;
}

module.exports = {
  resumenVentas,
  masVendidos,
  productosStockBajo,
  productosAgotados,
  inactivosEnCarritos,
  pedidosPorEstado
};
