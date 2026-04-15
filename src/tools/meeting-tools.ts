import { z } from "zod";
import { VAULTS, TEAM_MEMBERS } from "../config.js";
import { memoryClient } from "../memory.js";
import { join, dirname } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

export const CreateMeetingNoteInputSchema = z.object({
  vault: z.enum(["FACULTAD", "DATAOILERS", "PROYECTOS"]).describe("Vault destino"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha de la reunión (YYYY-MM-DD)"),
  title: z.string().describe("Título de la reunión"),
  participants: z.array(z.string()).describe("Participantes (nombres de TEAM_MEMBERS)"),
  decisions: z.array(z.string()).describe("Decisiones tomadas"),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .describe("Items de acción"),
  summary: z.string().optional().describe("Resumen de la reunión"),
  relatedRepos: z.array(z.string()).optional().describe("Repos relacionados"),
});

export type CreateMeetingNoteInput = z.infer<typeof CreateMeetingNoteInputSchema>;

function validateTeamMembers(participants: string[]): void {
  const validNames = TEAM_MEMBERS.map(m => m.name);
  const invalid = participants.filter(p => !validNames.includes(p));
  if (invalid.length > 0) {
    throw new Error(
      `Participantes inválidos: ${invalid.join(", ")}. Válidos: ${validNames.join(", ")}`
    );
  }
}

function validateVault(vaultName: string): void {
  if (!VAULTS[vaultName as keyof typeof VAULTS]) {
    throw new Error(`Vault no encontrado: ${vaultName}`);
  }
}

function generateMeetingNoteContent(
  input: CreateMeetingNoteInput
): string {
  const dateObj = new Date(input.date);
  const dateStr = dateObj.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let content = `# ${dateStr} - ${input.title}\n\n`;

  content += `## Participantes\n`;
  input.participants.forEach(p => {
    content += `- [[${p}]]\n`;
  });
  content += "\n";

  if (input.summary) {
    content += `## Resumen\n${input.summary}\n\n`;
  }

  content += `## Decisiones\n`;
  if (input.decisions.length === 0) {
    content += `- (sin decisiones registradas)\n`;
  } else {
    input.decisions.forEach(d => {
      content += `- ${d}\n`;
    });
  }
  content += "\n";

  content += `## Items de Acción\n`;
  if (input.actionItems.length === 0) {
    content += `- (sin items de acción)\n`;
  } else {
    input.actionItems.forEach(item => {
      const dueDate = new Date(item.dueDate).toLocaleDateString("es-ES");
      content += `- [ ] **${item.owner}**: ${item.task} (vence: ${dueDate})\n`;
    });
  }
  content += "\n";

  if (input.relatedRepos && input.relatedRepos.length > 0) {
    content += `## Repos Relacionados\n`;
    input.relatedRepos.forEach(repo => {
      content += `- [[${repo}]]\n`;
    });
    content += "\n";
  }

  content += `## Implementación\n`;
  content += `- (Links a commits que implementan esta decisión se agregarán automáticamente via auto_link_commits)\n\n`;

  content += `## Notas\n\n`;

  return content;
}

function getNotePath(vaultName: string, input: CreateMeetingNoteInput): string {
  const dateObj = new Date(input.date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${year}-${month}-${day}-${slug}.md`;
  const vaultPath = VAULTS[vaultName as keyof typeof VAULTS].path;
  const folder = join(vaultPath, "Reuniones");

  return join(folder, filename);
}

export async function createMeetingNote(
  input: CreateMeetingNoteInput
): Promise<string> {
  validateVault(input.vault);
  validateTeamMembers(input.participants);

  const notePath = getNotePath(input.vault, input);
  const noteContent = generateMeetingNoteContent(input);

  try {
    mkdirSync(dirname(notePath), { recursive: true });
    writeFileSync(notePath, noteContent, "utf-8");
  } catch (error: any) {
    throw new Error(`Error al crear nota: ${error.message}`);
  }

  const relativeNotePath = notePath.substring(
    VAULTS[input.vault as keyof typeof VAULTS].path.length + 1
  );

  const meetingTimestamp = new Date(input.date).toISOString();
  const meetingId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let decisionIds: string[] = [];
  let actionItemIds: string[] = [];

  try {
    await memoryClient.saveMeeting({
      id: meetingId,
      timestamp: meetingTimestamp,
      vault: input.vault,
      title: input.title,
      summary: input.summary || `Reunión: ${input.title}`,
      participants: input.participants,
      decisions: input.decisions.map(d => ({ text: d })),
      actionItems: input.actionItems.map(ai => ({
        task: ai.task,
        owner: ai.owner,
        dueDate: ai.dueDate,
        status: "pending" as const,
      })),
      relatedRepos: input.relatedRepos,
      notePath: relativeNotePath,
    });

    // Save each decision as a separate Memory entry so it can be linked/queried
    for (const decisionText of input.decisions) {
      const decisionId = await memoryClient.saveDecision(
        decisionText,
        meetingId,
        input.participants,
        input.relatedRepos ?? [],
        meetingTimestamp
      );
      decisionIds.push(decisionId);
    }

    // Save each action item as a separate Memory entry
    for (const ai of input.actionItems) {
      const aiId = await memoryClient.saveActionItem(
        ai.task,
        ai.owner,
        ai.dueDate,
        meetingId,
        meetingTimestamp
      );
      actionItemIds.push(aiId);
    }
  } catch (error: any) {
    console.error(`Error guardando en Memory: ${error.message}`);
  }

  return JSON.stringify(
    {
      success: true,
      notePath: relativeNotePath,
      fullPath: notePath,
      meetingId,
      decisionIds,
      actionItemIds,
      message: `Nota de reunión creada. ${decisionIds.length} decisiones y ${actionItemIds.length} action items guardados en Memory.`,
    },
    null,
    2
  );
}

export const MEETING_TOOLS = {
  createMeetingNote: {
    name: "create_meeting_note",
    description:
      "Crear una nota de reunión estructurada que se guarda automáticamente en Memory",
    schema: CreateMeetingNoteInputSchema,
    handler: createMeetingNote,
  },
};
