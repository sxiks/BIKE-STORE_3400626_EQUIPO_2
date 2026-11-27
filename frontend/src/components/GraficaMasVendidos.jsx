import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatoCOP } from '../utils/formato';
import '../assets/tablero.css';

// Gráfica de barras horizontales de los más vendidos (F4.1), con recharts. Es solo visual: los mismos datos
// están en la tabla que la acompaña, así que se oculta a los lectores de pantalla (aria-hidden) y no recibe
// el foco (accessibilityLayer desactivado). Colores y textos salen de tablero.css (variables de tokens.css).
//   productos: [{ id_producto, nombre, unidades, ventas }] (máximo 5, ya ordenados)
function Detalle({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tablero-grafica__detalle">
      <strong>{p.nombre}</strong>
      <span>
        {p.unidades} {p.unidades === 1 ? 'unidad' : 'unidades'} · {formatoCOP(p.ventas)}
      </span>
    </div>
  );
}

export default function GraficaMasVendidos({ productos }) {
  return (
    <div className="tablero-grafica" aria-hidden="true">
      <ResponsiveContainer width="100%" height={productos.length * 48 + 16}>
        <BarChart data={productos} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} accessibilityLayer={false}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" width={150} tickLine={false} axisLine={false} />
          <Tooltip content={<Detalle />} cursor={{ className: 'tablero-grafica__cursor' }} isAnimationActive={false} />
          <Bar dataKey="unidades" className="tablero-grafica__barra" radius={[0, 6, 6, 0]} barSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
