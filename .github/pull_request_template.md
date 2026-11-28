## ¿Qué hace este PR?

<!-- Una o dos líneas. -->

**Casos de uso / RF:** CU-XX · RF-XX
**Tipo:** feat / fix / refactor / docs / chore

## Checklist

- [ ] La rama sale de `develop` actualizado y apunta a `develop`
- [ ] Hice `git merge origin/develop` en mi rama y no hay conflictos
- [ ] Solo toqué mi carpeta (`backend/` + `database/` o `frontend/`), o es un PR de `docs/`
- [ ] Si cambié o agregué endpoints, `docs/diseno-tecnico/API_CONTRATOS.md` está actualizado
- [ ] Si agregué variables de entorno, están en el `.env.example`
- [ ] Si cambié el esquema, es una migración nueva (no edité una existente) y lo indico: "Requiere aplicar la migración 00N"
- [ ] Frontend: `npm run lint`, `npm test` y `npm run build` pasan
- [ ] Backend: `npm run lint` pasa y probé los endpoints afectados (curl / Thunder Client / Postman)
- [ ] No subo `.env`, `node_modules/`, `uploads/` ni `dist/`

## Cómo probarlo

1.
2.

## Capturas (si cambia la interfaz)
