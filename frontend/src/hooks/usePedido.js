import { useCallback, useEffect, useState } from 'react';
import { obtenerPedido } from '../services/pedidos.service';

// Carga un pedido por su número con GET /pedidos/:numero. Lo usan el detalle del cliente (F3.2) y el del
// admin (F4 · decisión N). Devuelve { pedido, cargando, error, status, reintentar }; status 404 = no existe.
export function usePedido(numero) {
  const [pedido, setPedido] = useState(null);
  const [estado, setEstado] = useState({ cargando: true, error: null, status: 0 });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado({ cargando: true, error: null, status: 0 });
    obtenerPedido(numero)
      .then(({ data }) => {
        if (cancelado) return;
        setPedido(data);
        setEstado({ cargando: false, error: null, status: 0 });
      })
      .catch((err) => {
        if (!cancelado) setEstado({ cargando: false, error: err.message, status: err.status ?? 0 });
      });
    return () => {
      cancelado = true;
    };
  }, [numero, version]);

  const reintentar = useCallback(() => setVersion((v) => v + 1), []);
  return { pedido, ...estado, reintentar };
}
