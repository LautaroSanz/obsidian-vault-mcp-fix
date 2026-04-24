---
tags: [runbook, referencia, <area>]
fecha: YYYY-MM-DD
estado: in-progress
autor: usuario.git
proyecto: "[[NOMBRE-REPO]]"
---

# Runbook: <Nombre del procedimiento>

> [!info] Cuándo usar este runbook
> <Situación concreta en la que aplicar estos pasos.>

## Pre-requisitos

- [ ] Acceso a <sistema/cluster/proyecto>
- [ ] Permisos de <rol>
- [ ] Herramientas instaladas: `<herramientas>`

## Verificación inicial

```bash
<comando para confirmar el estado actual>
```

Esperado: <qué deberías ver>

## Pasos

### 1. <Primer paso>

```bash
<comando>
```

> [!note] Qué hace
> <explicación breve>

### 2. <Segundo paso>

```bash
<comando>
```

### 3. <Verificar resultado>

```bash
<comando de validación>
```

Esperado: <output esperado>

## Rollback

Si algo sale mal:

```bash
<comando de rollback>
```

## Gotchas conocidos

> [!warning] <Gotcha>
> <Qué puede salir mal y cómo evitarlo.>

## Referencias

- [[Spec relacionada]]
- [[Postmortem previo]]
- <links a dashboards, docs externas>
