import ProductCard from "./ProductCard";

// Lista de productos del catálogo (F2.2). Solo props: la página trae los datos de la API.
//   productos: [Producto] ya filtrados por categoría y orden desde la API
//   busqueda: texto de la barra; filtra por nombre los productos cargados (la API pública no busca por texto)
//   titulo: encabezado de la sección
const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function Catalogo({ productos, busqueda = "", titulo = "Bicicletas y accesorios" }) {
  const termino = normalizar(busqueda);
  const visibles = termino ? productos.filter((p) => normalizar(p.nombre).includes(termino)) : productos;

  return (
    <section aria-labelledby="titulo-catalogo">
      <div className="catalogo__cabecera">
        <h2 id="titulo-catalogo" className="catalogo__titulo">
          {termino ? `Resultados para "${busqueda.trim()}"` : titulo}
        </h2>
        <span className="catalogo__conteo" role="status">
          {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
        </span>
      </div>
      {visibles.length === 0 ? (
        <p className="catalogo__vacio tarjeta">
          {termino
            ? "Ningún producto coincide con tu búsqueda. Prueba con otra palabra."
            : "No hay productos en esta categoría por ahora."}
        </p>
      ) : (
        <div className="catalogo__grid">
          {visibles.map((p) => (
            <ProductCard key={p.id_producto} producto={p} />
          ))}
        </div>
      )}
    </section>
  );
}
