# Especificación Fase 4: Audio Pipeline — Procesamiento de Reuniones con Empresa Contratadora

**Estado:** Especificado, pendiente implementación  
**Versión objetivo:** v4.0.0  
**Dependencias:** Phase 3 completado  
**Scope:** Transcripción local de audio, extracción de contexto con IA, integración automática con Obsidian + Memory + Grafo

---

## 1. Descripción General

### Problema que resuelve

El equipo tiene reuniones periódicas con la empresa contratadora en las que se definen objetivos, roadmaps, limitaciones y acuerdos. Actualmente esa información se pierde o queda dispersa. No hay forma de consultar a Claude sobre el contexto de una reunión específica con el cliente.

### Solución

Un pipeline completamente local que:
1. Detecta automáticamente nuevos archivos de audio en una carpeta vigilada (watcher)
2. Transcribe el audio usando Whisper localmente (sin cloud)
3. Analiza la transcripción con Claude API para extraer información estructurada
4. Crea una nota enriquecida en Obsidian y la persiste en Memory y el Grafo
5. Permite consultar a Claude sobre cualquier reunión pasada con el cliente

### Requisitos confirmados

- Transcripción **100% local** (sin cloud, sin OpenAI API)
- Watcher **automático**: detecta archivos nuevos en carpeta y procesa sin intervención
- Idioma base: **español**
- Integración total con el sistema existente de Memory y Knowledge Graph

---

## 2. Arquitectura del Pipeline

```
Carpeta vigilada (ej: ~/DATAOILERS/grabaciones/incoming/)
        ↓ (nuevo archivo detectado por AudioWatcher)
AudioWatcher (chokidar)
        ↓
TranscriptionClient (@xenova/transformers — Whisper local)
        ↓
Transcripción cruda (texto + timestamps + speakers)
        ↓
MeetingAnalyzer (Claude API via @anthropic-ai/sdk)
        ↓
MeetingAnalysis estructurado:
  ├─ objectives[]
  ├─ roadmapSteps[]
  ├─ limitations[]
  ├─ people[]
  ├─ decisions[]
  └─ actionItems[]
        ↓
 ┌──────────────────────────────────────┐
 │     Persistencia (en paralelo)       │
 ├──────────────────────────────────────┤
 │  create_meeting_note() → Obsidian MD │
 │  MemoryClient.addMeeting()           │
 │  KnowledgeGraph (nodos + edges)      │
 └──────────────────────────────────────┘
        ↓
Archivo movido a processed/ o failed/
```

---

## 3. Nuevas Herramientas MCP

### 3.1 `transcribe_audio`

Transcribe un archivo de audio localmente usando Whisper.

**Input:**
```typescript
{
  filePath: string,          // ruta absoluta al archivo de audio
  language?: string,         // default "es"
  model?: "tiny" | "small" | "medium"  // default "small"
}
```

**Output:**
```typescript
{
  transcript: string,          // texto completo
  segments: TranscriptSegment[],  // con timestamps
  language: string,
  duration: number,            // segundos
  model: string
}

interface TranscriptSegment {
  start: number;    // segundos
  end: number;
  text: string;
  speaker?: string; // si se detecta speaker diarization
}
```

**Notas:**
- Los modelos se descargan en primer uso a `~/.cache/whisper/`
- `small` es el balance recomendado (rendimiento/calidad para español)
- `medium` para reuniones largas o con vocabulario técnico

---

### 3.2 `analyze_meeting_transcript`

Analiza una transcripción y extrae información estructurada usando Claude API.

**Input:**
```typescript
{
  transcript: string,
  context?: string,    // contexto adicional (ej: "reunión con empresa X")
  language?: string    // default "es"
}
```

**Output:**
```typescript
{
  title: string,
  summary: string,
  objectives: string[],
  roadmapSteps: RoadmapStep[],
  limitations: string[],
  people: ExtractedPerson[],
  decisions: Decision[],
  actionItems: ActionItem[],
  topics: string[]
}

interface RoadmapStep {
  step: string;
  responsible?: string;
  deadline?: string;
  dependencies?: string[];
}

interface ExtractedPerson {
  name: string;
  role?: string;
  company?: string;        // "contratadora" | "dataoilers" | desconocida
  mentionCount: number;
}
```

---

### 3.3 `process_meeting_recording`

Herramienta principal. Ejecuta el pipeline completo: transcripción → análisis → creación de nota.

**Input:**
```typescript
{
  filePath: string,
  title?: string,          // si no se provee, se genera del análisis
  vault?: string,          // default "DATAOILERS"
  context?: string,        // contexto adicional para el análisis
  model?: "tiny" | "small" | "medium"
}
```

**Output:**
```typescript
{
  notePath: string,        // ruta de la nota creada en Obsidian
  meetingId: string,       // ID en Memory
  transcript: string,
  analysis: MeetingAnalysis,
  processingTime: number   // milisegundos
}
```

---

### 3.4 `get_audio_watcher_status`

Devuelve el estado actual del watcher: carpetas vigiladas, archivos en proceso, historial reciente.

**Input:** ninguno

**Output:**
```typescript
{
  isRunning: boolean,
  watchedFolders: string[],
  currentlyProcessing: string | null,
  processedToday: number,
  lastProcessed: { file: string; notePath: string; timestamp: string } | null,
  failedFiles: { file: string; error: string; timestamp: string }[]
}
```

---

## 4. Infraestructura Nueva

### 4.1 `src/audio/transcription-client.ts`

Wrapper sobre `@xenova/transformers` para Whisper.

```typescript
class TranscriptionClient {
  private model: WhisperModel | null = null;
  private modelName: string;

  constructor(model: "tiny" | "small" | "medium" = "small") { ... }

  async initialize(): Promise<void>
  // descarga el modelo en primer uso, cachea en ~/.cache/whisper/

  async transcribe(filePath: string, language: string): Promise<TranscriptionResult>
  // procesa el audio y retorna transcript + segments

  getSupportedFormats(): string[]
  // [".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".webm", ".flac"]
}
```

**Alternativa (fallback):** Si `@xenova/transformers` presenta problemas en Windows, usar `faster-whisper` mediante Python subprocess:
```typescript
// subprocess: python -m faster_whisper --model small --language es <file>
```
La elección entre las dos opciones se configura en `config.ts`.

---

### 4.2 `src/audio/meeting-analyzer.ts`

Wrapper sobre `@anthropic-ai/sdk` para el análisis de transcripciones.

```typescript
class MeetingAnalyzer {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async analyze(transcript: string, context?: string): Promise<MeetingAnalysis>
  // llama a Claude claude-sonnet-4-6 con prompt estructurado
  // retorna JSON validado con Zod
}
```

**Prompt base para análisis:**
```
Eres un asistente que analiza transcripciones de reuniones de negocios en español.
Analiza la siguiente transcripción y extrae información estructurada.

Transcripción:
<transcript>

Extrae y retorna JSON con:
- title: título descriptivo de la reunión
- summary: resumen ejecutivo (2-3 oraciones)
- objectives: lista de objetivos mencionados
- roadmapSteps: pasos del roadmap con responsible y deadline si se mencionan
- limitations: restricciones, limitaciones técnicas o de negocio mencionadas
- people: personas mencionadas con nombre, rol y empresa si se detectan
- decisions: decisiones tomadas
- actionItems: tareas asignadas con owner y fecha si se mencionan
- topics: temas principales tratados (para tags)
```

---

### 4.3 `src/audio/audio-watcher.ts`

Servicio de vigilancia de carpetas. Se inicializa al arrancar el MCP server.

```typescript
class AudioWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private isProcessing: boolean = false;
  private queue: string[] = [];
  private stats: WatcherStats;

  constructor(
    private config: AudioWatchConfig,
    private transcriptionClient: TranscriptionClient,
    private meetingAnalyzer: MeetingAnalyzer,
    private memoryClient: MemoryClient
  ) { ... }

  start(): void
  // inicia chokidar sobre todas las carpetas configuradas
  // filtra por extensiones soportadas
  // agrega nuevos archivos a la cola

  stop(): void

  getStatus(): WatcherStatus

  private async processQueue(): Promise<void>
  // procesa archivos de la cola secuencialmente
  // mueve a processed/ o failed/ según resultado

  private async processFile(filePath: string): Promise<void>
  // 1. transcribe_audio
  // 2. analyze_transcript
  // 3. create_meeting_note
  // 4. actualizar stats
}
```

**Comportamiento de la cola:**
- Los archivos se procesan de a uno (no en paralelo) para no saturar la GPU/CPU
- Si llega un archivo mientras se procesa otro, se encola
- Al reiniciar el servidor, los archivos en `incoming/` que no fueron procesados se re-encolan

---

### 4.4 Extensión de `MeetingEntrySchema` en `memory.ts`

```typescript
export const AudioMetadataSchema = z.object({
  originalFile: z.string(),
  duration: z.number(),          // segundos
  language: z.string(),
  transcriptPath: z.string(),    // ruta al archivo .txt con la transcripción completa
  speakerCount: z.number().optional(),
  processingDate: z.string(),    // ISO8601
  whisperModel: z.string(),      // modelo usado
});

// Agregar a MeetingEntrySchema:
audioMetadata: AudioMetadataSchema.optional(),
objectives: z.array(z.string()).optional(),
roadmapSteps: z.array(RoadmapStepSchema).optional(),
limitations: z.array(z.string()).optional(),
externalPeople: z.array(ExtractedPersonSchema).optional(),
```

---

## 5. Configuración Nueva en `config.ts`

```typescript
export const AUDIO_CONFIG = {
  // Carpeta(s) a vigilar
  watchFolders: [
    "C:/Users/riper/Documentos/DATAOILERS/grabaciones/incoming"
  ],

  // Carpetas de destino (creadas automáticamente si no existen)
  processedFolder: "C:/Users/riper/Documentos/DATAOILERS/grabaciones/processed",
  failedFolder: "C:/Users/riper/Documentos/DATAOILERS/grabaciones/failed",
  transcriptsFolder: "C:/Users/riper/Documentos/DATAOILERS/grabaciones/transcripts",

  // Configuración de transcripción
  whisperModel: "small" as const,   // "tiny" | "small" | "medium"
  language: "es",
  transcriptionBackend: "transformers" as const,  // "transformers" | "faster-whisper"

  // Configuración de análisis
  analysisModel: "claude-sonnet-4-6",

  // Vault destino para las notas
  defaultVault: "DATAOILERS",

  // Formatos soportados
  supportedFormats: [".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".webm", ".flac"],

  // Auto-procesamiento al detectar archivo
  autoProcess: true,
};
```

---

## 6. Estructura de Carpetas en Disco

```
~/DATAOILERS/grabaciones/
  ├─ incoming/          ← watcher vigila esta carpeta
  │    └─ (archivos nuevos se dejan acá)
  ├─ processed/         ← archivos procesados exitosamente
  │    └─ 2026-04-16_reunion-cliente.mp3
  ├─ failed/            ← archivos que fallaron con error.txt adjunto
  │    ├─ audio-roto.mp4
  │    └─ audio-roto.mp4.error.txt
  └─ transcripts/       ← transcripciones completas en texto
       └─ 2026-04-16_reunion-cliente.txt
```

---

## 7. Estructura de Nota Generada en Obsidian

```markdown
---
type: meeting
source: audio-pipeline
date: 2026-04-16
vault: DATAOILERS
tags: ["reunion-cliente", "contratadora", "objetivos", "roadmap"]
audio_file: 2026-04-16_reunion-cliente.mp3
duration_minutes: 47
participants: ["Matias", "Juan (contratadora)", "Ana (contratadora)"]
---

# Reunion con Empresa Contratadora — 16/04/2026

## Resumen

Reunion de alineamiento con la empresa contratadora para definir alcance del
Q2. Se acordaron 3 objetivos principales y se identificaron 2 limitaciones
tecnicas criticas que condicionan el roadmap.

## Objetivos

- Implementar modulo de reportes automatizados antes del 30/05
- Integrar API de terceros (proveedor X) para ingestion de datos
- Migrar base de datos a nueva estructura de schemas

## Roadmap

| Paso | Responsable | Fecha Limite |
|------|-------------|--------------|
| Diseño de schemas | Matias | 2026-04-30 |
| Implementacion API | TBD contratadora | 2026-05-15 |
| Testing integrado | Equipo conjunto | 2026-05-25 |
| Deploy produccion | Matias | 2026-05-30 |

## Limitaciones

- La API del proveedor X no soporta batch requests — requiere procesamiento
  secuencial lo que impacta el throughput estimado
- El entorno de produccion del cliente no permite acceso directo a base de datos
  — toda comunicacion debe ser via REST API

## Personas Mencionadas

| Nombre | Rol | Empresa |
|--------|-----|---------|
| Juan | CTO | Contratadora |
| Ana | Project Manager | Contratadora |
| Matias | Lead Developer | DataOilers |

## Decisiones

- [ ] Usar REST API como unica interfaz (no acceso directo a BD)
- [ ] Priorizar modulo de reportes sobre migracion de schemas
- [x] Definir SLA de respuesta de API con contratadora antes de empezar

## Action Items

- [ ] Matias: Documentar contrato de API antes del 2026-04-23
- [ ] Juan (contratadora): Proveer credenciales de sandbox antes del 2026-04-20
- [ ] Ana: Confirmar presupuesto para Q2 — 2026-04-18

## Transcripcion Completa

[Ver transcripcion completa](../grabaciones/transcripts/2026-04-16_reunion-cliente.txt)
```

---

## 8. Integración con Knowledge Graph

Las notas generadas por el audio pipeline extienden el grafo existente con nuevos tipos de nodos y edges:

### Nuevos nodos generados automáticamente

| Tipo | Ejemplo |
|------|---------|
| `meeting` | La reunion en si (ya existia) |
| `person` | Juan (contratadora), Ana (PM) — personas externas |
| `topic` | "API proveedor X", "migracion schemas" |
| `limitation` | "API no soporta batch" |
| `objective` | "Modulo de reportes Q2" |

### Nuevos edges generados

| Edge | Desde → Hacia |
|------|---------------|
| `participates` | person → meeting |
| `defines` | meeting → objective |
| `constrains` | limitation → objective |
| `part_of` | roadmapStep → objective |
| `assigned_to` | actionItem → person |

---

## 9. Dependencias Nuevas

```json
{
  "@xenova/transformers": "^2.17.0",
  "chokidar": "^3.6.0",
  "@anthropic-ai/sdk": "^0.32.0"
}
```

**Notas sobre dependencias:**
- `@xenova/transformers`: descarga los modelos Whisper al primer uso (~300MB para `small`). Los modelos quedan cacheados en `~/.cache/huggingface/`.
- `chokidar`: watcher de archivos multiplataforma (funciona en Windows).
- `@anthropic-ai/sdk`: requiere `ANTHROPIC_API_KEY` en variables de entorno.

**Alternativa para transcripción si `@xenova/transformers` presenta issues en Windows:**
- Instalar Python + `faster-whisper`: `pip install faster-whisper`
- Cambiar `transcriptionBackend: "faster-whisper"` en config.ts
- El server usará subprocess Python para transcribir

---

## 10. Variables de Entorno

```bash
# Requerido para análisis con Claude
ANTHROPIC_API_KEY=sk-ant-...

# Opcional: nivel de log del watcher
AUDIO_WATCHER_LOG_LEVEL=info
```

---

## 11. Archivos a Crear / Modificar

### Archivos nuevos

```
src/audio/
  ├─ transcription-client.ts    # Wrapper Whisper (@xenova/transformers)
  ├─ meeting-analyzer.ts        # Wrapper Claude API para extraccion
  ├─ audio-watcher.ts           # Servicio chokidar
  └─ types.ts                   # TranscriptionResult, MeetingAnalysis, AudioWatchConfig

src/tools/
  └─ audio-tools.ts             # transcribe_audio, analyze_meeting_transcript,
                                 # process_meeting_recording, get_audio_watcher_status
```

### Archivos a modificar

```
src/config.ts          # Agregar AUDIO_CONFIG
src/memory.ts          # Extender MeetingEntrySchema con audioMetadata + campos nuevos
src/index.ts           # Registrar 4 nuevas herramientas + inicializar AudioWatcher
package.json           # Agregar 3 dependencias
```

---

## 12. Flujo de Uso Esperado

```
1. El usuario graba la reunion con la empresa contratadora
   → Guarda el archivo .mp4 / .mp3 en la carpeta "incoming/"

2. AudioWatcher detecta el nuevo archivo (demora: 1-2 segundos)
   → Agrega a la cola de procesamiento

3. TranscriptionClient procesa el audio (demora: 1-5 min dependiendo del modelo y duracion)
   → Genera transcripcion completa en espanol con timestamps

4. MeetingAnalyzer analiza la transcripcion (demora: 10-30 segundos)
   → Claude extrae: objetivos, roadmap, limitaciones, personas, decisiones, action items

5. create_meeting_note() crea la nota en Obsidian
   → Nota estructurada guardada en DATAOILERS vault
   → Persistida en MemoryClient
   → Nodos y edges agregados al Knowledge Graph

6. Archivo movido de incoming/ a processed/
   → Transcripcion guardada en transcripts/

7. El usuario le pregunta a Claude:
   "¿Cuales fueron los objetivos de la reunion con el cliente del martes?"
   → Claude usa query_memory o search_notes para responder con contexto real
```

---

## 13. Manejo de Errores

| Error | Comportamiento |
|-------|----------------|
| Archivo de audio corrupto | Mover a `failed/` + crear `.error.txt` con detalle |
| Modelo Whisper no descargado aun | Intentar descarga, retry automatico (hasta 3 veces) |
| Claude API falla (rate limit) | Retry con backoff exponencial (1s, 2s, 4s) |
| Carpeta `incoming/` no existe | Crearla automaticamente al iniciar el watcher |
| Archivo en uso (siendo copiado) | Esperar 2 segundos y reintentar antes de procesar |

---

## 14. Testing

### Tests de integracion (nuevos)

```
tests/audio/
  ├─ transcription-client.test.ts    # Con audio de prueba en espanol (~30s)
  ├─ meeting-analyzer.test.ts        # Con transcripcion de muestra mockeando Claude API
  ├─ audio-watcher.test.ts           # Crear archivo en carpeta temp, verificar procesamiento
  └─ process-recording.test.ts       # Pipeline completo de extremo a extremo
```

### Caso de prueba minimo

- Audio de prueba: grabacion de 30-60 segundos en espanol describiendo una decision tecnica
- Verificar: transcripcion >= 80% precision en palabras clave
- Verificar: analisis extrae al menos 1 decision y 1 action item
- Verificar: nota creada en vault con frontmatter correcto

---

## 15. Criterios de Exito

- Pipeline completo funciona sin intervencion del usuario
- Transcripcion local en espanol con >= 85% precision en vocabulario tecnico
- Tiempo de procesamiento de audio de 30 min: menos de 10 minutos en hardware estandar
- Nota generada es consultable via `query_memory` o `search_notes` inmediatamente
- Watcher sobrevive reinicios del servidor MCP (re-encola archivos pendientes)
- Zero archivos perdidos: si falla el procesamiento, el archivo original se conserva

---

## 16. Open Questions

- **Speaker diarization**: ¿Vale la pena activarla para identificar quienes hablan? Requiere modelo adicional (`pyannote`) y mas tiempo de procesamiento.
- **Threshold de calidad**: ¿Que hacer si la transcripcion tiene baja confianza (mucho ruido)? ¿Notificar al usuario o crear nota de todas formas marcada como "baja calidad"?
- **Acceso al grafo desde audio**: Las personas externas (empresa contratadora) no estan en `TEAM_MEMBERS` — ¿como se referencian en el grafo?
- **Multiples speakers del mismo nombre**: Si dos personas se llaman "Juan", ¿como desambiguar?

---

## 17. Fuera de Scope (Phase 4)

- Transcripcion en tiempo real (live captioning durante la reunion)
- Interfaz web para ver el historial de grabaciones
- Integracion con plataformas de videoconferencia (Zoom, Teams, Meet) via API
- Speaker diarization automatica (puede agregarse en Phase 5)
- Notificaciones push al completar el procesamiento
