---
tags: [postmortem, incidente, <area>]
fecha: YYYY-MM-DD
estado: draft
autor: usuario.git
proyecto: "[[NOMBRE-REPO]]"
severidad: sev1 | sev2 | sev3
---

# Postmortem: <Título del incidente>

> [!danger] Resumen
> - **Fecha**: YYYY-MM-DD HH:MM (TZ)
> - **Duración**: <minutos>
> - **Severidad**: sev1 | sev2 | sev3
> - **Impacto**: <qué usuarios/servicios afectados, por cuánto tiempo>

## Timeline

| Hora | Evento |
|------|--------|
| HH:MM | <qué pasó> |
| HH:MM | <detección> |
| HH:MM | <mitigación aplicada> |
| HH:MM | <servicio restaurado> |

## Root cause

<Análisis técnico de la causa raíz. Ser específico — código, config, comando, comportamiento inesperado.>

## Contribución humana / de proceso

<Qué decisiones o huecos de proceso hicieron que esto fuera posible. Sin culpas, con estructura.>

## Qué funcionó

- <detección rápida, rollback limpio, runbook existía, etc.>

## Qué no funcionó

- <alerting silencioso, permisos faltantes, doc desactualizada, etc.>

## Action items

| # | Acción | Owner | Due | Tipo |
|---|--------|-------|-----|------|
| 1 | <qué> | @user | YYYY-MM-DD | prevent / detect / mitigate |
| 2 | ... | ... | ... | ... |

## Lecciones aprendidas

> [!note] Lección
> <qué nos llevamos>
