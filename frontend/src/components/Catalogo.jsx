import { PRODUCTOS } from "../data/productos";
import ProductCard from "./ProductCard";

// Catálogo de la tienda (aún con datos simulados; F2.2 lo conecta a la API).
// `busqueda` filtra por nombre, sin distinguir mayúsculas ni tildes.
const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function Catalogo({ busqueda = "" }) {
  const termino = normalizar(busqueda);
  const productos = termino ? PRODUCTOS.filter((p) => normalizar(p.nombre).includes(termino)) : PRODUCTOS;

  return (
    <section aria-labelledby="titulo-catalogo">
      <div className="catalogo__cabecera">
        <h2 id="titulo-catalogo" className="catalogo__titulo">
          {termino ? `Resultados para "${busqueda.trim()}"` : "Productos típicos de la región"}
        </h2>
        <span className="catalogo__conteo" role="status">
          {productos.length} {productos.length === 1 ? "producto" : "productos"}
        </span>
      </div>
      {productos.length === 0 ? (
        <p className="catalogo__vacio tarjeta">Ningún producto coincide con tu búsqueda. Prueba con otra palabra.</p>
      ) : (
        <div className="catalogo__grid">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </section>
  );
}
