# Guía de Consultas Rápidas para el Frontend

Prompts para copiar, completar lo que está entre `[corchetes]` y enviar al asistente. Cada uno ya trae las reglas de arquitectura, así no hay que repetirlas.

**Siempre:** empieza cada chat nuevo con el prompt 0 y adjunta los archivos que menciona.

---

## 0 · Contexto inicial (pegar al abrir un chat nuevo)

```
Soy el Dev Frontend de Bike Store (SENA). Monorepo: backend Express 5 + PostgreSQL ya implementado; frontend React 19 + Vite 7 + React Router 7 + Vitest, CSS puro, íconos lucide-react.
Reglas del frontend que debes respetar:
- pages/ orquesta; components/ solo recibe props y no hace fetch; services/ es el único que llama a la API usando api.js (agrega el Bearer token); context/ para estado global (AuthContext, CarritoContext, ToastContext); utils/ funciones puras (formatoCOP, urlImagen); data/ mocks.
- Respuestas de la API: éxito { ok: true, data, message? }; error { ok: false, message, code?, data? }. Reacciono a errores por `code` (ver tabla de códigos en API_CONTRATOS.md), no comparando textos.
- Dinero en COP como número; fechas en ISO UTC.
- URL base desde config/env.js (VITE_API_URL). Nada de URLs a mano.
- Mensajes al usuario con ToastContext (mostrar), nunca alert() ni confirm().
- Solo trabajo dentro de frontend/. No propongas cambios en backend/ ni database/: si algo falta en la API, ayúdame a redactar el pedido para el Dev Backend.
Adjunto: docs/ARQUITECTURA.md, docs/API_CONTRATOS.md y los archivos que voy a tocar.
Entrega por pasos: primero el plan y la lista de archivos a crear o modificar; espera mi aprobación antes de escribir código.
```

## 1 · Nuevo componente visual

```
Necesito el componente [NombreComponente] para [CU-XX / historia de usuario].
Debe mostrar: [datos]. Interacciones: [clics, estado vacío, cargando, error].
Recibe por props: [lista de props]. No hace fetch.
Ubicación: frontend/src/components/[NombreComponente].jsx. Estilos en [archivo .css], con clases BEM prefijadas por el componente.
Requisitos: accesible (labels, aria-label en botones que solo tienen ícono, foco visible), responsive desde 360 px.
Dame el código completo y un ejemplo de uso desde la página [Pagina].
```

## 2 · Consumir un endpoint (servicio + uso en página)

```
Contrato (copiado de docs/API_CONTRATOS.md):
[pega el bloque del endpoint, incluidos sus errores y codes]
Crea o actualiza frontend/src/services/[modulo].service.js con la función [nombreFuncion] usando api.js y devolviendo `respuesta.data`.
Luego muéstrame cómo usarla en pages/[Pagina].jsx manejando: cargando, error (mostrar el message del backend con ToastContext y reaccionar a estos codes: [lista]) y lista vacía.
No cambies la forma de los datos que define el contrato.
```

## 3 · Datos simulados mientras pruebo sin backend

```
Quiero trabajar la vista [Pagina] sin depender del backend corriendo.
Contrato: [pega el contrato].
Crea un mock en frontend/src/data/[modulo].mock.js con datos realistas de bicicletas y accesorios, y que services/[modulo].service.js devuelva una Promise con la misma forma { ok, data } (con un retardo simulado) cuando VITE_USAR_MOCK=true.
El cambio entre mock y API real no debe tocar los componentes.
```

## 4 · Estado global / contexto

```
Necesito manejar [qué estado: sesión, carrito, filtros...] compartido entre [componentes/páginas].
Archivo actual: [adjunta el contexto si existe].
Propón si va en un contexto existente o en uno nuevo, y justifica en 2 líneas. Expón solo funciones con nombres de negocio (agregar, eliminar), no setState.
Mantén compatibles las pruebas de frontend/src/test/ y dime cuáles hay que actualizar.
```

## 5 · Conectar el carrito a la API (Sprint 3)

```
Quiero que CarritoContext deje de usar localStorage y data/productos.js y use la API /carrito (contrato adjunto).
Requisitos: exige sesión (si no hay, llevar a /login); el estado del carrito es la respuesta del backend (no recalcules totales en el front); mostrar los ítems con disponible=false según su `motivo`; STOCK_MAXIMO -> toast "máximo disponible"; CANTIDAD_MINIMA -> toast con botón "Sí, eliminar" que llama a DELETE; el botón de comprar se deshabilita si puede_comprar=false.
Adjunto: CarritoContext.jsx, CarritoPanel.jsx, ProductCard.jsx, CantidadInput.jsx, test/carrito.test.jsx.
Dime qué pruebas del archivo de test cambian y por qué.
```

## 6 · Formulario con validaciones

```
Formulario de [registro / producto / checkout / restablecer contraseña] para CU-[XX].
Campos y reglas: [campo: obligatorio, formato, mínimo/máximo...]. Contraseñas: mínimo 8 caracteres, con mayúscula, minúscula y número (D7).
Mensajes de error junto a cada campo y un toast al enviar. Deshabilitar el botón mientras se envía.
Si el backend responde { ok:false, message, code }, mostrar ese mensaje.
Envío mediante services/[modulo].service.js. Para imágenes: FormData con el campo `imagen` (api.js ya omite el Content-Type).
```

## 7 · Recuperación de contraseña con el token de desarrollo

```
Implementa las pantallas "Olvidé mi contraseña" (/recuperar) y "Restablecer" (/restablecer?token=...) para CU-11.
Contrato: POST /auth/recuperar y POST /auth/restablecer (adjunto).
Reglas:
- Mostrar siempre el message del backend.
- Si la respuesta trae data.token_desarrollo Y import.meta.env.DEV es true, mostrar un aviso "Modo desarrollo" con un enlace a /restablecer?token=<token>. Nunca en producción.
- /restablecer lee el token de la URL, pide la contraseña dos veces y valida D7; con code TOKEN_INVALIDO muestra un enlace para pedir otro.
Referencia: docs/GUIA_DESARROLLO_LOCAL.md §7.
```

## 8 · Ruta protegida o vista por rol

```
La vista [Pagina] debe ser accesible solo para el rol [admin/cliente] (CU-22).
Archivos actuales: App.jsx, components/ProtectedRoute.jsx, context/AuthContext.jsx.
Extiende ProtectedRoute para aceptar roles permitidos: sin sesión redirige a /login; con un rol que no coincide muestra "No autorizado".
Además, si cualquier petición responde 403 con code CUENTA_DESACTIVADA (o 401), cerrar la sesión y llevar a /login.
Recuerda: ocultar botones no es seguridad; el backend también valida el rol.
```

## 9 · Error de integración con el backend

```
Al llamar [MÉTODO /ruta] desde [Pagina] obtengo: [status, cuerpo de la respuesta, captura de Network/Console].
Request enviado: [body/headers]. Contrato esperado: [pega contrato].
Determina si el problema está en el frontend (servicio, token, formato, CORS) o en el backend. Si es del backend, redacta el reporte para el Dev Backend en lugar de modificar backend/.
```

## 10 · Pruebas de un componente

```
Escribe pruebas Vitest + Testing Library para [Componente/Página] en frontend/src/test/[nombre].test.jsx.
Casos: [lista, ej. muestra el estado vacío, deshabilita el botón sin stock, muestra el toast de error con code X].
Mockea services/ con vi.mock; no hagas llamadas reales. Usa consultas accesibles (getByRole, getByLabelText).
```

## 11 · Conflicto de merge

```
Al hacer git merge origin/develop en mi rama feature/front-[modulo] tengo conflicto en [archivo].
Pego el bloque con las marcas <<<<<<< ======= >>>>>>>:
[bloque]
Explícame qué trae cada lado y propón la versión final que conserve ambos cambios. Luego dame los comandos para terminar el merge sin usar --force.
```

## 12 · Revisión antes de abrir el PR

```
Revisa este diff antes de abrir el PR hacia develop:
[pega git diff origin/develop...HEAD -- frontend/]
Verifica: fetch fuera de services/, URLs a mano, alert()/confirm(), console.log olvidados, archivos fuera de frontend/, lógica de negocio en componentes que debería estar en un contexto, errores manejados por code, accesibilidad básica.
Devuélveme una lista corta de problemas y un título + descripción para el PR según .github/pull_request_template.md.
```
