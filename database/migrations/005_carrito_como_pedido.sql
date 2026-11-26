-- =====================================================================
-- 005_carrito_como_pedido.sql
-- Bike Store - el carrito pasa a ser un pedido en estado 'carrito' (paso 2 de 2).
-- PostgreSQL 15+. Ejecutar conectado a la base, DESPUES de la 004 (ya confirmada).
--
-- Decision del equipo: un carrito es un pedido en borrador. Se eliminan las tablas
-- carritos y carrito_items; las lineas del carrito viven en detalle_pedido.
--   - estado 'carrito'   : borrador del cliente (CU-03 a CU-06). Sin numero ni fecha ni envio.
--   - al confirmar       : pasa a 'pendiente' en un solo UPDATE; el trigger asigna
--                          fecha_pedido y numero_pedido (CU-07, CU-08; R3, R4).
--   - un carrito por cliente: indice unico parcial (R2).
-- Todo en una transaccion: si algo falla, la base queda como estaba.
-- =====================================================================
BEGIN;

-- 1. pedidos: el carrito no tiene numero ni datos de envio; nueva fecha de confirmacion.
ALTER TABLE pedidos ALTER COLUMN numero_pedido      DROP NOT NULL;   -- sigue UNIQUE (admite varios NULL)
ALTER TABLE pedidos ALTER COLUMN envio_nombre       DROP NOT NULL;
ALTER TABLE pedidos ALTER COLUMN envio_telefono     DROP NOT NULL;
ALTER TABLE pedidos ALTER COLUMN envio_departamento DROP NOT NULL;
ALTER TABLE pedidos ALTER COLUMN envio_ciudad       DROP NOT NULL;
ALTER TABLE pedidos ALTER COLUMN envio_direccion    DROP NOT NULL;
ALTER TABLE pedidos ADD COLUMN fecha_pedido TIMESTAMPTZ NULL;         -- momento de confirmacion (carrito -> pendiente)
ALTER TABLE pedidos ALTER COLUMN estado SET DEFAULT 'carrito';
COMMENT ON COLUMN pedidos.fecha_pedido IS 'Momento de confirmacion del pedido (carrito -> pendiente). NULL mientras es carrito.';
COMMENT ON COLUMN pedidos.created_at   IS 'Auditoria: cuando se creo la fila (en un carrito, cuando se empezo).';

-- 2. Pedidos que ya existian: su fecha de pedido era created_at.
UPDATE pedidos SET fecha_pedido = created_at WHERE fecha_pedido IS NULL;

-- 3. El numero se asigna cuando el pedido SALE del estado 'carrito' (no en el INSERT del carrito).
--    Va antes de convertir datos para que el trigger anterior no numere los carritos convertidos.
CREATE OR REPLACE FUNCTION fn_asignar_numero_pedido() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado <> 'carrito' THEN
    IF NEW.fecha_pedido IS NULL THEN NEW.fecha_pedido := CURRENT_TIMESTAMP; END IF;
    IF NEW.numero_pedido IS NULL THEN
      NEW.numero_pedido := 'BS-' || to_char(NEW.fecha_pedido, 'YYYY') || '-'
        || lpad(NEW.id_pedido::text, greatest(6, length(NEW.id_pedido::text)), '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER trg_pedidos_numero ON pedidos;
CREATE TRIGGER trg_pedidos_numero BEFORE INSERT OR UPDATE OF estado ON pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_asignar_numero_pedido();

-- 4. Conversion de datos: cada carrito CON items pasa a ser un pedido 'carrito' con su detalle,
--    usando el precio vigente del producto. Si carritos esta vacia, estas sentencias no insertan nada.
--    Los carritos sin items no se convierten: no hay nada que conservar.
INSERT INTO pedidos (id_usuario, estado, created_at)
SELECT c.id_usuario, 'carrito', c.created_at
FROM carritos c
WHERE EXISTS (SELECT 1 FROM carrito_items ci WHERE ci.id_carrito = c.id_carrito);

INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, created_at)
SELECT pe.id_pedido, ci.id_producto, ci.cantidad, p.precio, ci.created_at
FROM carrito_items ci
JOIN carritos c  ON c.id_carrito = ci.id_carrito
JOIN pedidos pe  ON pe.id_usuario = c.id_usuario AND pe.estado = 'carrito'
JOIN productos p ON p.id_producto = ci.id_producto;

-- 5. Se eliminan las tablas del carrito (con ellas caen sus indices y llaves foraneas).
DROP TABLE carrito_items;
DROP TABLE carritos;

-- 6. Un pedido que ya no es carrito debe tener numero, fecha y datos de envio completos.
ALTER TABLE pedidos ADD CONSTRAINT ck_pedidos_confirmado CHECK (
  estado = 'carrito' OR (
    numero_pedido IS NOT NULL AND fecha_pedido IS NOT NULL
    AND envio_nombre IS NOT NULL AND envio_telefono IS NOT NULL
    AND envio_departamento IS NOT NULL AND envio_ciudad IS NOT NULL
    AND envio_direccion IS NOT NULL));

-- 7. Un carrito por cliente (R2).
CREATE UNIQUE INDEX uq_pedidos_carrito_usuario ON pedidos (id_usuario) WHERE estado = 'carrito';

-- 8. El tablero filtra por fecha de pedido (CU-16, CU-17).
DROP INDEX ix_pedidos_estado_fecha;
CREATE INDEX ix_pedidos_estado_fecha_pedido ON pedidos (estado, fecha_pedido);

COMMIT;
