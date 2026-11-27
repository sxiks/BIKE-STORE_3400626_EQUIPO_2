import { nombreEstado, nombreRol } from '../utils/usuarios';
import '../assets/usuarios.css';

// Tabla de usuarios (CU-19) con las acciones de CU-20 (rol) y CU-21 (estado).
// Solo props: no llama a la API. La fila del propio administrador tiene las acciones deshabilitadas (D5 y D6).
//   usuarios: [Usuario] · idPropio: id del admin con sesión · idOcupado: id de la fila que se está guardando
//   onCambiarRol(usuario) · onCambiarEstado(usuario): piden la acción; quien usa la tabla confirma y guarda.
export default function UsuariosTabla({ usuarios, idPropio, idOcupado = null, onCambiarRol, onCambiarEstado }) {
  return (
    <table className="usuarios-tabla">
      <caption className="solo-lector">Listado de usuarios</caption>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Correo</th>
          <th scope="col">Rol</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((usuario) => {
          const esPropio = usuario.id_usuario === idPropio;
          const ocupado = usuario.id_usuario === idOcupado;
          const bloqueado = esPropio || ocupado;
          const esAdmin = usuario.rol === 'admin';
          const estaActivo = usuario.estado === 'activo';
          const idNota = `usuarios-nota-${usuario.id_usuario}`;

          return (
            <tr key={usuario.id_usuario}>
              <td data-etiqueta="Nombre">
                {usuario.nombre}
                {esPropio && <span className="etiqueta etiqueta--acento usuarios-tabla__yo">Tú</span>}
              </td>
              <td data-etiqueta="Correo">{usuario.email}</td>
              <td data-etiqueta="Rol">
                <span className={`etiqueta usuarios-tabla__rol usuarios-tabla__rol--${usuario.rol}`}>
                  {nombreRol(usuario.rol)}
                </span>
              </td>
              <td data-etiqueta="Estado">
                <span className={`etiqueta ${estaActivo ? 'etiqueta--exito' : 'etiqueta--error'}`}>
                  {nombreEstado(usuario.estado)}
                </span>
              </td>
              <td data-etiqueta="Acciones">
                <div className="usuarios-tabla__acciones">
                  <button
                    type="button"
                    className="btn btn--suave"
                    disabled={bloqueado}
                    aria-describedby={esPropio ? idNota : undefined}
                    aria-label={`${esAdmin ? 'Hacer cliente' : 'Hacer administrador'} a ${usuario.nombre}`}
                    onClick={() => onCambiarRol(usuario)}
                  >
                    {esAdmin ? 'Hacer cliente' : 'Hacer administrador'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--suave"
                    disabled={bloqueado}
                    aria-describedby={esPropio ? idNota : undefined}
                    aria-label={`${estaActivo ? 'Desactivar' : 'Activar'} a ${usuario.nombre}`}
                    onClick={() => onCambiarEstado(usuario)}
                  >
                    {estaActivo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
                {esPropio && (
                  <p id={idNota} className="usuarios-tabla__nota">
                    Es tu cuenta: no puedes cambiar tu propio rol ni tu estado.
                  </p>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
