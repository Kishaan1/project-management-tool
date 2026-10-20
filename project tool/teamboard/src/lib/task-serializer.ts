import type { TaskDTO, SubtaskItem } from "./types";

export function parseSubtasks(val: unknown): SubtaskItem[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseTags(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function serializeTask(task: any): TaskDTO {
  return {
    ...task,
    tags: parseTags(task?.tags),
    subtasks: parseSubtasks(task?.subtasks),
  };
}

export function serializeTasks(tasks: any[]): TaskDTO[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(serializeTask);
}
