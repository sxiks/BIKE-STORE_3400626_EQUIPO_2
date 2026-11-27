-- =====================================================================
-- 006_producto_imagenes.sql
-- Bike Store - galeria de imagenes por producto (tarea B2.2, decision M).
-- PostgreSQL 15+. Ejecutar conectado a la base, DESPUES de la 005.
--
-- La portada sigue en productos.imagen: catalogo, carrito, pedidos y tablero no cambian.
-- Esta tabla guarda solo las imagenes ADICIONALES (maximo 4, total 5 con la portada;
-- el limite lo aplica productos.services porque depende de la portada).
--   - orden      : posicion en la galeria (1, 2, 3...). La reordena PATCH /productos/:id/imagenes/orden.
--   - ON DELETE CASCADE: si se elimina el producto (solo los nunca usados), sus filas se borran
--                  solas; los archivos los borra el backend despues del COMMIT.
-- Todo en una transaccion: si algo falla, la base queda como estaba.
-- No se puede ejecutar dos veces (CREATE TABLE fallaria): se aplica una sola vez por base.
-- =====================================================================
BEGIN;

CREATE TABLE producto_imagenes (
    id_imagen    SERIAL       PRIMARY KEY,
    id_producto  INT          NOT NULL,
    imagen       VARCHAR(255) NOT NULL,                       -- solo nombre de archivo
    orden        SMALLINT     NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_producto_imagenes_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_producto_imagenes_orden CHECK (orden >= 1)
);

-- La galeria de un producto siempre se lee por producto y en orden.
CREATE INDEX ix_producto_imagenes_producto ON producto_imagenes (id_producto, orden);

COMMIT;
