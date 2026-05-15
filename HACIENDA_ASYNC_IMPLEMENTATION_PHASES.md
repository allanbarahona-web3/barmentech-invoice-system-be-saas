# Fases de Implementación Async Fiscal Antes de Hacienda

Fecha: 2026-05-14  
Objetivo: dejar lista la arquitectura para XML, firmado, envío por cola, polling y reintentos seguros antes de activar Hacienda en Costa Rica.

## Principios

- No hacer llamadas externas dentro de la transacción comercial.
- Separar creación del documento fiscal, firmado XML, envío y polling en etapas independientes.
- Cada etapa debe ser idempotente, reintentable y auditable.
- Mantener compatibilidad total con frontend y endpoints actuales.

---

## Fase 0 - Contratos y límites

Meta: definir el borde funcional antes de escribir el flujo asíncrono.

Pasos:
1. Extender `TaxAuthorityGateway` para soportar `submit`, `getStatus` y normalización de errores retryable/no-retryable.
2. Definir una clave idempotente fiscal por documento + etapa.
3. Formalizar transiciones válidas del lifecycle fiscal.
4. Acordar el contrato mínimo del payload para XML y firmado.

Salida esperada:
- El sistema sabe qué puede reintentar, qué no, y cómo detectar duplicados.

---

## Fase 1 - Documento fiscal y audit trail

Meta: persistir el estado fiscal como artefacto independiente y trazable.

Pasos:
1. Crear o confirmar una entidad de eventos de documento fiscal.
2. Guardar snapshot de payload, respuesta del provider y metadatos de correlación.
3. Agregar control de versión o bloqueo optimista para evitar carreras.
4. Separar claramente estado fiscal interno de la orden comercial.

Salida esperada:
- Cada cambio de estado queda registrado y puede reconstruirse.

---

## Fase 2 - XML generation y firmado en background

Meta: generar y firmar XML fuera del request comercial.

Pasos:
1. Implementar generador XML del country-pack CR.
2. Implementar servicio de firmado XML con salida persistida.
3. Guardar artefactos firmados con paths/versiones consistentes.
4. Hacer que el paso sea reintentable sin producir doble firma.

Salida esperada:
- El documento fiscal puede producir XML firmado sin bloquear la creación de la orden.

---

## Fase 3 - Cola y submission a Hacienda

Meta: mover el envío a Hacienda a un worker asincrónico.

Pasos:
1. Agregar outbox o job table para publicar trabajos después del commit.
2. Crear worker para `SIGN_XML -> SUBMIT_HACIENDA`.
3. Aplicar backoff, límite de intentos y dead-letter para fallos permanentes.
4. Registrar `externalId` o correlación del envío cuando exista.

Salida esperada:
- El flujo comercial termina rápido y el envío fiscal se completa en background.

---

## Fase 4 - Polling y consistencia eventual

Meta: cerrar el lifecycle con consultas de estado y convergencia eventual.

Pasos:
1. Programar polling por documento con ventana y frecuencia controlada.
2. Actualizar estados solo con transiciones válidas.
3. Manejar respuestas `ACCEPTED`, `REJECTED`, `PROCESSING` y errores normalizados.
4. Reintentar solo estados y errores clasificados como seguros.

Salida esperada:
- El sistema converge por sí mismo a estado final sin intervención manual para casos normales.

---

## Fase 5 - Hardening operativo

Meta: preparar el rollout productivo.

Pasos:
1. Añadir métricas y logs por etapa del pipeline.
2. Verificar aislamiento multi-tenant en cada paso async.
3. Probar duplicados, colisiones, caídas de worker y re-procesos.
4. Activar por feature flag o tenant piloto antes del rollout general.

Salida esperada:
- El flujo async queda listo para producción controlada.

---

## Criterio de inicio de Hacienda

Solo comenzar integración real cuando estén completos:
- contrato de gateway extendido
- idempotencia por etapa
- audit trail de lifecycle
- cola/worker con retries
- polling con convergencia de estados
- firmado XML desacoplado del request
