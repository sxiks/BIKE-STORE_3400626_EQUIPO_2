# Guía de trabajo en equipo · Gitflow simplificado

Equipo: **Dev Backend** y **Dev Frontend**, trabajando en paralelo sobre el mismo repositorio.

## 1. Ramas

| Rama | Propósito | ¿Quién escribe? |
|------|-----------|-----------------|
| `main` | Versión estable / entregable. Solo recibe merges desde `develop` al cerrar un sprint. | Nadie directamente (solo PR `develop → main`) |
| `develop` | Integración. Todo PR de trabajo apunta aquí. | Nadie directamente (solo PR) |
| `feature/back-<modulo>` | Trabajo del backend. Ej: `feature/back-auth-api`, `feature/back-productos-crud` | Dev Backend |
| `feature/front-<modulo>` | Trabajo del frontend. Ej: `feature/front-login-view`, `feature/front-catalogo` | Dev Frontend |
| `docs/<tema>` | Cambios solo de documentación compartida. Ej: `docs/contrato-carrito` | Cualquiera |
| `fix/<descripcion>` | Corrección de un error ya integrado en `develop`. | Quien lo encuentre |

Nombres en minúscula, palabras separadas por guion, sin tildes ni espacios.

## 2. Propiedad de carpetas (la regla que más conflictos evita)

| Carpeta / archivo | Dueño | El otro integrante… |
|-------------------|-------|---------------------|
| `backend/**`, `database/**` | Dev Backend | no la modifica; si necesita algo, lo pide en un issue o comentario de PR |
| `frontend/**` | Dev Frontend | no la modifica |
| [`docs/diseno-tecnico/API_CONTRATOS.md`](docs/diseno-tecnico/API_CONTRATOS.md) | Dev Backend redacta; Dev Frontend **aprueba** | propone cambios en el PR |
| `README.md`, `CONTRIBUTING.md`, resto de `docs/`, `.gitignore` | Compartido | se cambia solo en una rama `docs/...` con PR revisado por ambos |

Si ambos tocan carpetas distintas, Git nunca genera conflicto entre sus ramas.

## 3. Contrato primero

1. El Dev Backend abre una rama `docs/contrato-<modulo>` y documenta en `docs/diseno-tecnico/API_CONTRATOS.md` los endpoints del módulo (método, URL, rol, request, respuestas).
2. El Dev Frontend revisa y aprueba ese PR. Desde ese momento el contrato es la fuente de verdad.
3. En paralelo:
   - Backend implementa el contrato en `feature/back-<modulo>`.
   - Frontend construye la vista en `feature/front-<modulo>` usando un **mock** (`frontend/src/data/` o una función de `services/` que devuelve datos falsos con la misma forma del contrato).
4. Cuando el backend está en `develop`, el frontend cambia el mock por la llamada real (solo cambia `services/`; los componentes no se tocan).
5. ¿Hay que cambiar el contrato? Se cambia primero el documento (nuevo PR `docs/...`), luego el código. Nunca al revés.

## 4. Ciclo diario de una tarea

```bash
# 0) Siempre partir de develop actualizado
git switch develop
git pull origin develop

# 1) Crear la rama de la tarea
git switch -c feature/back-auth-api            # o feature/front-login-view

# 2) Trabajar en commits pequeños
git add backend/src/...
git commit -m "feat(auth): validar formato de correo en registro"

# 3) Antes de abrir el PR: traer lo nuevo de develop a TU rama
git fetch origin
git merge origin/develop                       # resuelve conflictos aquí, en tu rama, no en develop
npm test                                        # (frontend) o prueba tus endpoints (backend)

# 4) Subir la rama
git push -u origin feature/back-auth-api
```

Luego en GitHub: **Compare & pull request** → base `develop` ← compare `feature/...` → llenar la plantilla.

## 5. Pull Requests

- Un PR = una tarea. Pequeño (idealmente < 400 líneas cambiadas).
- Base siempre `develop` (excepto el PR de cierre de sprint `develop → main`).
- El otro integrante revisa y aprueba. Nadie aprueba su propio PR.
- Tipo de merge: **Squash and merge** (un commit limpio por tarea en `develop`).
- Después del merge: borrar la rama remota (botón en GitHub) y la local:

```bash
git switch develop
git pull origin develop
git branch -d feature/back-auth-api
```

### Si GitHub dice "This branch has conflicts"

```bash
git switch feature/front-login-view
git fetch origin
git merge origin/develop
# Git marca los archivos en conflicto. Ábrelos, busca <<<<<<< ======= >>>>>>>,
# deja el código correcto y borra las marcas.
git status                      # lista lo que falta resolver
git add <archivo-resuelto>
git commit                      # cierra el merge
npm test                        # verifica que todo sigue funcionando
git push
```

Nunca uses `git push --force` sobre `develop` o `main`.

## 6. Reglas anti-conflictos

1. Nunca hacer commit directo en `develop` ni en `main` (protegidas en GitHub).
2. Respetar la propiedad de carpetas ([sección 2](#2-propiedad-de-carpetas-la-regla-que-más-conflictos-evita)).
3. Contrato de API antes que código ([sección 3](#3-contrato-primero)).
4. Hacer `git merge origin/develop` en tu rama al menos una vez al día y siempre antes del PR.
5. Migraciones SQL: un archivo nuevo por cambio (`004_...sql`, `005_...sql`). Nunca editar uno ya integrado. El PR debe decir "Requiere aplicar la migración 00N" y cada integrante la aplica con `psql` (ver `database/README.md`).
6. `package-lock.json` **se versiona**: garantiza que ambos instalan exactamente las mismas versiones.
   - Para instalar (después de clonar, de un `git pull` o de cambiar de rama) usa **`npm ci`**: instala lo que dice el lockfile y no lo modifica.
   - `npm install` solo se usa para agregar o quitar una dependencia (regla 7) o para resolver un conflicto en el lockfile. Si lo ejecutaste sin cambiar dependencias y `git status` muestra `package-lock.json` modificado, descarta ese cambio con `git restore package-lock.json`.
   - Si hay conflicto en él: acepta la versión de `develop` y regenéralo (`git checkout --theirs package-lock.json && npm install`).
7. Para instalar una dependencia nueva, hazlo en un commit aparte (`chore(deps): agregar zod`) para que el conflicto, si lo hay, sea trivial.
8. Formato: `.editorconfig` y `.gitattributes` fijan LF y 2 espacios. No reformatees archivos que no estás cambiando.
9. Nunca subir `.env`. Si agregas una variable nueva, agrégala también a `.env.example` con un valor de ejemplo.

## 7. Mensajes de commit (Conventional Commits)

```
<tipo>(<ámbito>): <descripción en minúscula, imperativo>
```

| Tipo | Uso |
|------|-----|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de error |
| `refactor` | Cambio interno sin cambiar comportamiento |
| `test` | Pruebas |
| `docs` | Documentación |
| `chore` | Configuración, dependencias, scripts |
| `style` | Solo formato / CSS sin lógica |

Ejemplos: `feat(productos): filtrar por categoría (CU-02)`, `fix(carrito): no permitir cantidad mayor al stock`.

## 8. Cierre de sprint

1. Ambos confirman que `develop` arranca y pasa las pruebas.
2. PR `develop → main` titulado `release: sprint N`, aprobado por ambos, **Create a merge commit** (no squash).
3. Etiqueta, **solo después de fusionar el PR**: `git switch main && git pull && git merge-base --is-ancestor origin/develop main && git tag -a v0.N.0 -m "Sprint N" && git push origin v0.N.0`. `git merge-base --is-ancestor` detiene el comando si `main` todavía no tiene todo lo de `develop`: así la etiqueta nunca queda sobre la versión anterior.

### Versión de correcciones (v0.N.1, v0.N.2…)

Cuando `develop` reúne correcciones sin un sprint nuevo (por ejemplo, las de una auditoría), se publica una versión que solo sube el último número:

1. Ambos confirman que `develop` arranca y pasa las pruebas, y que cada PC aplicó las migraciones nuevas, si las hay.
2. PR `develop → main` titulado `release: v0.N.M`, aprobado por ambos, **Create a merge commit** (no squash). La descripción lista los PR incluidos y las migraciones que exige.
3. Etiqueta, **solo después de fusionar el PR**: `git switch main && git pull && git merge-base --is-ancestor origin/develop main && git tag -a v0.N.M -m "Correcciones: <tema>" && git push origin v0.N.M`.

Una etiqueta ya publicada no se borra ni se vuelve a crear: si falta algo, se publica la siguiente (`v0.N.M+1`).
