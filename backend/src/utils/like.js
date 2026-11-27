// En un patrón LIKE/ILIKE, % y _ son comodines y \ es el carácter de escape (el predeterminado de PostgreSQL).
// Se escapan para que el texto del usuario se busque como texto literal ("contiene"), no como patrón.
// La usan las búsquedas de usuarios (B1.2) y de productos del panel (B2.1).
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Patrón "contiene" listo para pasar como parámetro: '%texto%'.
function patronContiene(texto) {
  return `%${escaparLike(texto)}%`;
}

module.exports = { escaparLike, patronContiene };
