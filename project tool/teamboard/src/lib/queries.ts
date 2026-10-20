export const userSelect = { id: true, name: true, email: true } as const;

export const taskInclude = {
  assignee: { select: userSelect },
  _count: { select: { comments: true } },
} as const;
