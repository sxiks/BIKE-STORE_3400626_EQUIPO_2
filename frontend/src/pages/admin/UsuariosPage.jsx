import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { cambiarEstado, cambiarRol, listarUsuarios } from '../../services/usuarios.service';
import { nombreRol } from '../../utils/usuarios';
import UsuariosFiltros from '../../components/UsuariosFiltros';
import UsuariosTabla from '../../components/UsuariosTabla';
import DialogoConfirmacion from '../../components/DialogoConfirmacion';
import '../../assets/usuarios.css';

// Panel de usuarios del administrador (F1.4 · CU-19, CU-20, CU-21).
// La página orquesta; la tabla, los filtros y el diálogo solo reciben props.

// Texto del diálogo según la acción pedida.
function describirAccion({ tipo, usuario, nuevo }) {
  if (tipo === 'rol') {
    return nuevo === 'admin'
      ? {
          titulo: 'Cambiar rol',
          mensaje: `¿Hacer administrador a ${usuario.nombre}? Podrá gestionar usuarios, productos y el tablero.`,
          textoConfirmar: 'Sí, hacer administrador',
          peligro: false
        }
      : {
          titulo: 'Cambiar rol',
          mensaje: `¿Cambiar a ${usuario.nombre} a cliente? Perderá el acceso al panel de administración.`,
          textoConfirmar: 'Sí, hacer cliente',
          peligro: true
        };
  }
  return nuevo === 'inactivo'
    ? {
        titulo: 'Desactivar cuenta',
        mensaje: `¿Desactivar la cuenta de ${usuario.nombre}? No podrá iniciar sesión y su sesión actual se cerrará.`,
        textoConfirmar: 'Sí, desactivar',
        peligro: true
      }
    : {
        titulo: 'Activar cuenta',
        mensaje: `¿Activar la cuenta de ${usuario.nombre}? Podrá iniciar sesión de nuevo.`,
        textoConfirmar: 'Sí, activar',
        peligro: false
      };
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const { mostrar } = useToast();

  const [filtros, setFiltros] = useState({ q: '', rol: '', estado: '' });
  const [usuarios, setUsuarios] = useState(null); // null = aún no llega la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [version, setVersion] = useState(0); // subirlo vuelve a pedir el listado (Reintentar, 404)
  const [pendiente, setPendiente] = useState(null); // { tipo: 'rol' | 'estado', usuario, nuevo }
  const [guardando, setGuardando] = useState(false);

  // El texto se envía a la API 350 ms después de la última tecla; los selects aplican al instante.
  const qRetrasado = useDebounce(filtros.q);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga(null);

    listarUsuarios({ q: qRetrasado, rol: filtros.rol, estado: filtros.estado })
      .then(({ data }) => {
        if (cancelado) return;
        setUsuarios(data);
      })
      .catch((error) => {
        // Si el admin siguió escribiendo, la respuesta de la búsqueda vieja se descarta (cancelado).
        if (cancelado) return;
        setErrorCarga(error.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [qRetrasado, filtros.rol, filtros.estado, version]);

  const cambiarFiltro = useCallback((campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const cancelar = useCallback(() => setPendiente(null), []);

  function pedirCambioRol(usuario) {
    setPendiente({ tipo: 'rol', usuario, nuevo: usuario.rol === 'admin' ? 'cliente' : 'admin' });
  }

  function pedirCambioEstado(usuario) {
    setPendiente({ tipo: 'estado', usuario, nuevo: usuario.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  // Reacciona por `code` (API_CONTRATOS.md), nunca por el texto del mensaje.
  function manejarError(error) {
    if (error.code === 'ACCION_SOBRE_SI_MISMO') {
      mostrar(error.message); // D5 / D6: la interfaz ya lo evita, pero el backend manda.
    } else if (error.status === 404) {
      mostrar(error.message);
      setVersion((v) => v + 1); // el usuario ya no existe: se refresca el listado
    } else {
      mostrar(error.message);
    }
  }

  async function confirmar() {
    const { tipo, usuario, nuevo } = pendiente;
    setGuardando(true);
    try {
      const { data } = await (tipo === 'rol' ? cambiarRol : cambiarEstado)(usuario.id_usuario, nuevo);
      // Solo se reemplaza la fila con lo que respondió el backend; no se vuelve a pedir todo el listado.
      setUsuarios((prev) => prev.map((u) => (u.id_usuario === data.id_usuario ? data : u)));
      mostrar(
        tipo === 'rol'
          ? `${data.nombre} ahora es ${nombreRol(data.rol).toLowerCase()}.`
          : `La cuenta de ${data.nombre} quedó ${data.estado === 'activo' ? 'activa' : 'desactivada'}.`
      );
    } catch (error) {
      manejarError(error);
    } finally {
      setGuardando(false);
      setPendiente(null);
    }
  }

  const hayFiltros = Boolean(filtros.q.trim() || filtros.rol || filtros.estado);
  const dialogo = pendiente ? describirAccion(pendiente) : null;

  return (
    <main className="contenedor contenedor--panel">
      <header className="panel__encabezado">
        <h1>Usuarios</h1>
        <p>Busca usuarios y cambia su rol o el estado de su cuenta. No puedes cambiar tu propia cuenta.</p>
      </header>

      <UsuariosFiltros q={filtros.q} rol={filtros.rol} estado={filtros.estado} onCambiar={cambiarFiltro} />

      {/* Primera carga */}
      {usuarios === null && cargando && (
        <p className="usuarios__mensaje" role="status">
          Cargando usuarios…
        </p>
      )}

      {/* Error al cargar: se muestra el mensaje y se ofrece reintentar */}
      {errorCarga && (
        <div className="usuarios__error">
          <p className="alerta alerta--error" role="alert">
            {errorCarga}
          </p>
          <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {/* Lista vacía: se distingue "nadie coincide" de "no hay usuarios" */}
      {!errorCarga && usuarios !== null && usuarios.length === 0 && (
        <p className="usuarios__mensaje tarjeta" role="status">
          {hayFiltros
            ? 'Ningún usuario coincide con tu búsqueda. Prueba con otros datos o quita los filtros.'
            : 'Aún no hay usuarios registrados.'}
        </p>
      )}

      {/* Listado: mientras se refresca por un filtro se conserva la lista anterior, atenuada */}
      {!errorCarga && usuarios !== null && usuarios.length > 0 && (
        <>
          <p className="usuarios__total" role="status">
            {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'}
          </p>
          <div className="usuarios__contenedor" aria-busy={cargando}>
            <UsuariosTabla
              usuarios={usuarios}
              idPropio={user?.id_usuario}
              idOcupado={guardando ? pendiente?.usuario.id_usuario : null}
              onCambiarRol={pedirCambioRol}
              onCambiarEstado={pedirCambioEstado}
            />
          </div>
        </>
      )}

      {dialogo && (
        <DialogoConfirmacion
          titulo={dialogo.titulo}
          mensaje={dialogo.mensaje}
          textoConfirmar={dialogo.textoConfirmar}
          peligro={dialogo.peligro}
          ocupado={guardando}
          onConfirmar={confirmar}
          onCancelar={cancelar}
        />
      )}
    </main>
  );
}
