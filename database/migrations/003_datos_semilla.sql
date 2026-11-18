-- =====================================================================
-- 003_datos_semilla.sql  (PostgreSQL 15+)
-- Categorias y productos de ejemplo. Se puede ejecutar mas de una vez.
-- Precios en pesos colombianos (COP). Sin usuarios: sus contrasenas
-- necesitan un hash bcrypt generado por el backend.
-- =====================================================================
BEGIN;

INSERT INTO categorias (nombre) VALUES
    ('Bicicletas de montaña'),
    ('Bicicletas de ruta'),
    ('Bicicletas urbanas'),
    ('Cascos y protección'),
    ('Accesorios')
ON CONFLICT (lower(nombre)) DO NOTHING;

INSERT INTO productos (id_categoria, nombre, descripcion, precio, existencias, imagen, estado)
SELECT c.id_categoria, v.nombre, v.descripcion, v.precio, v.existencias, v.imagen, v.estado::estado_registro
FROM (VALUES
    ('Bicicletas de montaña', 'MTB Sierra 29',          'Bicicleta de montaña aro 29, cuadro de aluminio y 21 velocidades.',        2890000.00,  8, 'mtb-sierra-29.jpg',        'activo'),
    ('Bicicletas de montaña', 'MTB Páramo 27.5',        'Bicicleta de montaña aro 27.5 con suspensión delantera.',                  2350000.00,  3, 'mtb-paramo-275.jpg',       'activo'),
    ('Bicicletas de ruta',    'Ruta Velox Carbono',     'Bicicleta de ruta con cuadro de carbono y 22 velocidades.',                7950000.00,  2, 'ruta-velox-carbono.jpg',   'activo'),
    ('Bicicletas urbanas',    'Urbana Ciudad 700c',     'Bicicleta urbana cómoda para el diario, con guardabarros y portabultos.',  1650000.00, 12, 'urbana-ciudad-700c.jpg',   'activo'),
    ('Bicicletas urbanas',    'Urbana Plegable 20',     'Bicicleta plegable aro 20, ideal para transporte combinado.',              1890000.00,  0, 'urbana-plegable-20.jpg',   'activo'),
    ('Cascos y protección',   'Casco Ruta Aero',        'Casco liviano con ventilación para ciclismo de ruta.',                      289000.00, 25, 'casco-ruta-aero.jpg',      'activo'),
    ('Cascos y protección',   'Casco MTB Trail',        'Casco con visera y mayor cobertura para montaña.',                          249000.00, 18, 'casco-mtb-trail.jpg',      'activo'),
    ('Accesorios',            'Luces LED recargables',  'Juego de luz delantera y trasera recargables por USB.',                      79000.00, 40, 'luces-led-recargables.jpg','activo'),
    ('Accesorios',            'Candado en U reforzado', 'Candado de acero en U con dos llaves.',                                      95000.00, 30, 'candado-u-reforzado.jpg',   'activo'),
    ('Accesorios',            'Bomba de piso',          'Bomba de piso con manómetro (producto inactivo de ejemplo).',                69000.00, 20, 'bomba-de-piso.jpg',        'inactivo')
) AS v(categoria, nombre, descripcion, precio, existencias, imagen, estado)
JOIN categorias c ON lower(c.nombre) = lower(v.categoria)
ON CONFLICT (id_categoria, lower(nombre)) DO NOTHING;

COMMIT;
