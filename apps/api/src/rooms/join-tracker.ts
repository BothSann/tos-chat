interface JoinRequest {
  user?: { id: string } | null;
  ip?: string;
  params?: { id?: string };
}

export function joinTracker(req: JoinRequest): string {
  return `${req.user?.id ?? req.ip}:${req.params?.id}`;
}
