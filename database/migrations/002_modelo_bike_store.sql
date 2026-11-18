-- =====================================================================
-- 002_modelo_bike_store.sql
-- Bike Store - modelo completo. PostgreSQL 15+ (base nueva y vacia).
-- Ejecutar conectado a la base bike_store.
-- La 001 (sintaxis MySQL) NO se ejecuta en PostgreSQL.
-- No se crea la tabla heredada "equipos".
-- =====================================================================
BEGIN;

-- ---------- Tipos ENUM ----------
CREATE TYPE rol_usuario      AS ENUM ('admin', 'cliente');                                -- CU-20, CU-22
CREATE TYPE estado_registro  AS ENUM ('activo', 'inactivo');                              -- CU-14, CU-21
CREATE TYPE estado_pedido    AS ENUM ('pendiente', 'pagado', 'fallido');                  -- CU-08
CREATE TYPE medio_pago_tipo  AS ENUM ('tarjeta_credito', 'tarjeta_debito', 'cuenta_bancaria'); -- CU-08, R5
CREATE TYPE estado_pago      AS ENUM ('aprobado', 'rechazado');                           -- CU-08

-- ---------- usuarios (CU-09, CU-10, CU-19 a CU-22) ----------
CREATE TABLE usuarios (
    id_usuario  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(100)    NOT NULL,
    email       VARCHAR(150)    NOT NULL,
    password    VARCHAR(255)    NOT NULL,                      -- hash bcrypt
    rol         rol_usuario     NOT NULL DEFAULT 'cliente',
    estado      estado_registro NOT NULL DEFAULT 'activo',     -- cuenta desactivada no entra (RF-29)
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (lower(email));

-- ---------- categorias (CU-02, CU-12, CU-17) ----------
CREATE TABLE categorias (
    id_categoria INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_categorias_nombre ON categorias (lower(nombre));

-- ---------- productos (CU-01, CU-02, CU-12 a CU-15) ----------
CREATE TABLE productos (
    id_producto  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria INT             NOT NULL,
    nombre       VARCHAR(150)    NOT NULL,
    descripcion  TEXT,
    precio       NUMERIC(10,2)   NOT NULL,
    existencias  INT             NOT NULL DEFAULT 0,
    imagen       VARCHAR(255)    NOT NULL,                      -- solo nombre de archivo
    estado       estado_registro NOT NULL DEFAULT 'activo',     -- borrado logico (CU-14)
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria)
        REFERENCES categorias (id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_productos_precio      CHECK (precio > 0),       -- R1
    CONSTRAINT ck_productos_existencias CHECK (existencias >= 0)  -- R1
);
-- CU-12: criterio de unicidad (sin distinguir mayusculas)
CREATE UNIQUE INDEX uq_productos_categoria_nombre ON productos (id_categoria, lower(nombre));
-- CU-01/CU-02/R8: catalogo por estado, categoria y precio
CREATE INDEX ix_productos_catalogo      ON productos (estado, id_categoria, precio);
CREATE INDEX ix_productos_estado_precio ON productos (estado, precio);

-- ---------- carritos (CU-03 a CU-06; R2) ----------
CREATE TABLE carritos (
    id_carrito  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario  INT          NOT NULL UNIQUE,                   -- un carrito por cliente
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_carritos_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------- carrito_items: asociativa N:M carritos-productos (CU-04, CU-05, CU-06) ----------
CREATE TABLE carrito_items (
    id_carrito_item INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_carrito      INT         NOT NULL,
    id_producto     INT         NOT NULL,
    cantidad        INT         NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_carrito_items_carrito FOREIGN KEY (id_carrito)
        REFERENCES carritos (id_carrito) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_carrito_items_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_carrito_items_cantidad CHECK (cantidad >= 1),             -- R1, CU-05
    CONSTRAINT uq_carrito_items_carrito_producto UNIQUE (id_carrito, id_producto)  -- R2
);
CREATE INDEX ix_carrito_items_producto ON carrito_items (id_producto);      -- CU-06, alertas

-- ---------- pedidos (CU-07, CU-08, CU-16, CU-17; R4, R8, R9) ----------
CREATE TABLE pedidos (
    id_pedido          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_pedido      VARCHAR(20)   NOT NULL UNIQUE,           -- lo asigna el trigger (R4)
    id_usuario         INT           NOT NULL,
    estado             estado_pedido NOT NULL DEFAULT 'pendiente',
    -- direccion de envio (atributo compuesto, copia en el pedido, R9)
    envio_nombre       VARCHAR(100)  NOT NULL,
    envio_telefono     VARCHAR(20)   NOT NULL,
    envio_departamento VARCHAR(100)  NOT NULL,
    envio_ciudad       VARCHAR(100)  NOT NULL,
    envio_direccion    VARCHAR(255)  NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- fecha del pedido
    CONSTRAINT fk_pedidos_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX ix_pedidos_estado_fecha ON pedidos (estado, created_at);   -- CU-16, CU-17
CREATE INDEX ix_pedidos_usuario      ON pedidos (id_usuario);

-- R4: numero de pedido BS-AAAA-NNNNNN, distinto del id interno
CREATE FUNCTION fn_asignar_numero_pedido() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.numero_pedido := 'BS-' || to_char(NEW.created_at, 'YYYY') || '-'
        || lpad(NEW.id_pedido::text, greatest(6, length(NEW.id_pedido::text)), '0');
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_pedidos_numero
    BEFORE INSERT ON pedidos
    FOR EACH ROW EXECUTE FUNCTION fn_asignar_numero_pedido();

-- ---------- detalle_pedido: asociativa N:M pedidos-productos (CU-07, CU-16; R3) ----------
CREATE TABLE detalle_pedido (
    id_detalle_pedido INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido         INT           NOT NULL,
    id_producto       INT           NOT NULL,
    cantidad          INT           NOT NULL,
    precio_unitario   NUMERIC(10,2) NOT NULL,                   -- copia del precio al comprar (R3)
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detalle_pedido_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_pedido_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detalle_pedido_cantidad CHECK (cantidad >= 1),            -- R1
    CONSTRAINT ck_detalle_pedido_precio   CHECK (precio_unitario > 0),      -- R1
    CONSTRAINT uq_detalle_pedido_pedido_producto UNIQUE (id_pedido, id_producto)
);
CREATE INDEX ix_detalle_pedido_producto ON detalle_pedido (id_producto);    -- CU-16, CU-17

-- ---------- pagos (CU-08; R5) ----------
CREATE TABLE pagos (
    id_pago     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido   INT             NOT NULL,
    medio_pago  medio_pago_tipo NOT NULL,
    ultimos4    CHAR(4)         NOT NULL,                       -- nunca el numero completo (R5)
    valor       NUMERIC(12,2)   NOT NULL,
    estado      estado_pago     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- fecha del pago
    CONSTRAINT fk_pagos_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_pagos_ultimos4 CHECK (ultimos4 ~ '^[0-9]{4}$'),
    CONSTRAINT ck_pagos_valor    CHECK (valor > 0)
);
CREATE INDEX ix_pagos_pedido ON pagos (id_pedido);
-- un pedido solo puede tener un pago aprobado
CREATE UNIQUE INDEX uq_pagos_pedido_aprobado ON pagos (id_pedido) WHERE estado = 'aprobado';

-- ---------- tokens_recuperacion (CU-11) ----------
CREATE TABLE tokens_recuperacion (
    id_token    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario  INT          NOT NULL,
    token_hash  CHAR(64)     NOT NULL UNIQUE,                   -- SHA-256 en hexadecimal
    expira_en   TIMESTAMPTZ  NOT NULL,
    usado_en    TIMESTAMPTZ,                                    -- un solo uso
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tokens_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_tokens_expira CHECK (expira_en > created_at)
);
CREATE INDEX ix_tokens_usuario ON tokens_recuperacion (id_usuario);

COMMIT;
