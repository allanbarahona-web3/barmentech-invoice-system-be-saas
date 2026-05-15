# Auditoría de Preparación Async Fiscal (Pre-Hacienda)

Fecha: 2026-05-14  
Alcance: Validar si la arquitectura actual soporta procesamiento fiscal asíncrono seguro para Costa Rica Hacienda.

## Resumen Ejecutivo

La arquitectura **tiene buena base de separación por provider/pack**, pero **no está lista todavía para un flujo asíncrono seguro en producción** (firmado XML en background, envío por cola, polling con retries y transiciones idempotentes).

Estado actual:
- Base modular fiscal: **sí** (fiscal-core + country-pack).
- Persistencia de documento fiscal: **sí**.
- RLS en fiscal_documents: **sí**.
- Orquestación async con cola + workers + retries seguros: **no**.
- Máquina de estados robusta con control de transición/reintentos: **no**.

Conclusión: **hacer un hardening mínimo crítico antes de implementar Hacienda async**.

---

## Evidencia Clave (Código Actual)

- Orquestación fiscal se dispara dentro del flujo de creación de orden:
  - `prepareOrderFiscalData(...)` y luego `createFiscalDocumentForOrder(...)` desde `OrdersService.create(...)`.
- En `prepareOrderFiscalData(...)` se hace submit al gateway en línea (sin cola).
- `TaxAuthorityGateway` solo define `submit(...)` (sin contrato de polling/retry/cancel/status-by-external-id).
- `FiscalDocumentStatus` existe con estados amplios (`DRAFT`, `READY_TO_SUBMIT`, `PROCESSING`, `ACCEPTED`, `REJECTED`, `ERROR`, etc.), pero no hay motor de transición formal ni lock/versionado.
- `fiscal_documents` tiene índices, pero no constraints de unicidad orientadas a deduplicación de reintentos async.
- No hay infraestructura de colas/workers (Bull/BullMQ/processor) en el API actual.

---

## Análisis por Requisito Futuro

### 1) Background XML signing

Diagnóstico: **Parcialmente soportado (estructura sí, ejecución no)**.

Por qué:
- Existe lugar donde persistir resultados (`signedXmlPath`, snapshots, status).
- No existe pipeline async para paso de firmado desacoplado del request.
- No existe control idempotente del paso de firmado (ej. evitar doble firma por retry).

Riesgo actual:
- Si se firma en request síncrono, se aumentan timeouts y colisiones al reintentar.

### 2) Queue-based Hacienda submission

Diagnóstico: **No soportado actualmente**.

Por qué:
- No hay cola, worker ni job model.
- El submit ocurre directamente en la orquestación actual en línea.

Riesgo actual:
- Fallos externos de Hacienda afectan latencia/estabilidad del flujo comercial.
- Retries manuales pueden duplicar envíos.

### 3) Polling retries

Diagnóstico: **No soportado actualmente**.

Por qué:
- El gateway no expone contrato de consulta de estado.
- No hay scheduler/worker para polling escalonado con backoff.

Riesgo actual:
- No hay forma consistente de converger `SUBMITTED/PROCESSING` a `ACCEPTED/REJECTED`.

### 4) Eventual consistency

Diagnóstico: **Conceptualmente posible, operativamente incompleto**.

Por qué:
- Hay entidad `FiscalDocument` separada del dominio comercial.
- Pero falta patrón outbox/job table + reconciliación por worker.

Riesgo actual:
- Orden y documento fiscal quedan acoplados temporalmente al request.

### 5) Retry-safe fiscal lifecycle transitions

Diagnóstico: **Incompleto**.

Por qué:
- Hay enum de estados, pero no reglas de transición explícitas ni control de concurrencia.
- No hay marca de idempotencia por etapa async.

Riesgo actual:
- Retries concurrentes pueden provocar saltos de estado inválidos o escrituras pisadas.

---

## Verificación de Riesgos Solicitados

### Idempotency risks

Severidad: **Alta**.

Observaciones:
- En pagos existe idempotencia (`tenantId + idempotencyKey`), pero en fiscal no hay equivalente fuerte para operaciones async.
- Falta clave idempotente por operación fiscal (sign/submit/poll/reprocess).

Impacto:
- Doble envío, doble firma o actualización de estado repetida.

### Transaction risks

Severidad: **Alta**.

Observaciones:
- Llamadas externas al gateway están dentro del flujo de creación que usa transacción de negocio.

Impacto:
- Bloqueos largos, latencia alta, rollback por fallos externos y comportamiento frágil bajo carga.

### Duplicate fiscal document risks

Severidad: **Alta**.

Observaciones:
- No hay unicidad fuerte para prevenir duplicado fiscal por misma fuente comercial/reproceso.
- Índice de `(tenantId, fiscalNumber)` no reemplaza una estrategia de deduplicación por origen de evento.

Impacto:
- Posible creación de documentos paralelos para el mismo evento comercial.

### Retry collision risks

Severidad: **Alta**.

Observaciones:
- No hay locking/versionado optimistic ni token de procesamiento por documento.
- No hay ownership claro de job en worker para evitar doble ejecución.

Impacto:
- Colisión entre workers/retries con inconsistencias de estado.

### State transition integrity

Severidad: **Alta**.

Observaciones:
- El modelo tiene estados, pero no hay state machine formal ni guard clauses transaccionales.

Impacto:
- Transiciones inválidas (ej. `ERROR -> ACCEPTED` sin evidencia) o regresiones de estado.

### Queue orchestration readiness

Severidad: **Alta**.

Observaciones:
- Falta completamente infraestructura de colas y procesadores.

Impacto:
- Requisitos de async Hacienda no se pueden operar de forma segura todavía.

---

## Cambios Críticos Mínimos (Antes de Implementar Async Hacienda)

Aplicar **solo estos cambios críticos** primero:

1. Desacoplar submit/firma del request comercial
- Crear primero `FiscalDocument` en estado inicial (`DRAFT` o `READY_TO_SUBMIT`) dentro de la transacción comercial.
- Publicar trabajo async (outbox/job) **después de commit**.

Por qué:
- Elimina llamadas externas dentro de la transacción de negocio y baja riesgo de rollback por dependencias externas.

2. Introducir orquestación async mínima (cola o job table + worker)
- Agregar pipeline por etapas: `SIGN_XML -> SUBMIT_HACIENDA -> POLL_STATUS`.
- Definir retries con backoff y límite de intentos por etapa.

Por qué:
- Cumple requisitos de procesamiento asíncrono, polling y eventual consistency.

3. Endurecer idempotencia fiscal
- Agregar claves únicas/semánticas para deduplicar documento fiscal por origen comercial.
- Agregar idempotency key por operación async (job key determinística por documento+etapa).

Por qué:
- Evita duplicados y colisiones en reintentos.

4. Implementar integridad de transición de estados
- Definir matriz de transiciones válidas (state machine) y validar en escritura.
- Usar `updatedAt`/versionado optimistic o lock transaccional por documento en cambios críticos.

Por qué:
- Evita corrupción de lifecycle por concurrencia.

5. Extender contrato del gateway fiscal
- Mantener `submit`, pero agregar al menos: `getStatus`, normalización de errores y semántica de reintento (retryable/no-retryable).

Por qué:
- Sin contrato de polling y clasificación de errores no se puede cerrar correctamente el ciclo async.

6. Persistir audit trail de lifecycle (append-only)
- Tabla de eventos del documento fiscal (`FiscalDocumentEvent`) con: etapa, estado previo/nuevo, intento, correlation id, respuesta proveedor, timestamps.

Por qué:
- Requisito clave para trazabilidad, reprocessing seguro y diagnóstico productivo.

---

## Nivel de Deuda Técnica (en contexto async)

Evaluación: **Media-Alta**.

Razón:
- La base arquitectónica (providers/country-pack/persistencia) está bien encaminada.
- La parte operativa crítica de async resiliente (cola, idempotencia por etapa, state machine, polling) aún no está implementada.

---

## Riesgo de Producción

Evaluación: **Alto** si se inicia Hacienda async sin los cambios críticos anteriores.

Qué podría pasar si se avanza sin hardening:
- Duplicidad de envíos/documentos.
- Estados inconsistentes bajo retry.
- Rollbacks o timeouts en picos de tráfico.
- Dificultad para auditoría y soporte ante rechazos/reprocesos.

---

## Decisión Recomendada

La arquitectura actual **no es todavía segura** para activar workflows async de Hacienda en producción.

Sí se recomienda avanzar así:
1. Implementar primero los 6 cambios críticos mínimos.
2. Luego construir XML signing async + submit por cola + polling con backoff.
3. Finalmente habilitar por feature flag por tenant para rollout controlado.
