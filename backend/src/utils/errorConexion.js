// Texto legible para un error al conectar con PostgreSQL. Lo usan el arranque de la API (server.js)
// y el script que prepara la base de pruebas (npm run test:db).
// Con DB_HOST=localhost, Node intenta 127.0.0.1 y ::1; si fallan las dos, junta los errores en un
// AggregateError cuyo `message` es una cadena VACÍA. Por eso no basta con imprimir error.message.
const PISTAS = {
  ECONNREFUSED: ({ host, port, archivo }) =>
    `no hay PostgreSQL escuchando en ${host}:${port}. Revisa que la base esté encendida y que DB_PORT de tu ${archivo} sea el correcto (5433 con Docker, 5432 sin Docker)`,
  ENOTFOUND: ({ host, archivo }) => `no se encontró el servidor "${host}". Revisa DB_HOST en tu ${archivo}`,
  EAI_AGAIN: ({ host, archivo }) => `no se encontró el servidor "${host}". Revisa DB_HOST en tu ${archivo}`,
  ETIMEDOUT: ({ host, port, archivo }) => `${host}:${port} no respondió a tiempo. Revisa DB_HOST y DB_PORT en tu ${archivo}`
};

// destino: { host, port } a los que se intentó conectar y el archivo de configuración que los define.
function describirErrorConexion(error, { host, port, archivo = '.env' } = {}) {
  const codigo = error?.code;
  if (PISTAS[codigo]) return `${codigo}: ${PISTAS[codigo]({ host, port, archivo })}`;

  // Cualquier otro error (contraseña incorrecta, base inexistente...) ya trae un mensaje claro de pg.
  const mensaje =
    error?.message ||
    (error?.errors ?? []).map((e) => e?.message).filter(Boolean).join('; ');
  if (mensaje) return mensaje;
  return codigo ? String(codigo) : String(error);
}

module.exports = { describirErrorConexion };
