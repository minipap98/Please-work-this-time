import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AdminAction, AdminPerson, DemandProject, Prospect } from "@shared/admin";

export interface AuditEntry {
  id: string;
  admin: string;
  action: string;
  targetId: string | null;
  targetLabel: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}`, ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export function useAdminPeople() {
  return useQuery({ queryKey: ["admin", "people"], queryFn: () => adminFetch<{ people: AdminPerson[] }>("/api/admin/people").then((r) => r.people) });
}

export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: AdminAction }) =>
      adminFetch<{ ok: true }>(`/api/admin/people/${id}/action`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "people"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export function useAdminDemand() {
  return useQuery({ queryKey: ["admin", "demand"], queryFn: () => adminFetch<{ projects: DemandProject[] }>("/api/admin/demand").then((r) => r.projects) });
}

export function useAdminProspects() {
  return useQuery({ queryKey: ["admin", "prospects"], queryFn: () => adminFetch<{ prospects: Prospect[]; placesConfigured: boolean }>("/api/admin/prospects") });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Prospect> & { id: string }) =>
      adminFetch<{ prospect: Prospect }>(`/api/admin/prospects/${id}`, { method: "POST", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "prospects"] }),
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<Prospect>) => adminFetch<{ prospect: Prospect }>("/api/admin/prospects", { method: "POST", body: JSON.stringify(p) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "prospects"] }),
  });
}

export function useSearchProspects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: { area: string; lat: number; lng: number; radiusMiles: number; trades: string[] }) =>
      adminFetch<{ found: number; added: number }>("/api/admin/prospects/search", { method: "POST", body: JSON.stringify(q) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prospects"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export function useDraftOutreach() {
  return useMutation({
    mutationFn: ({ id, demand, sender }: { id: string; demand: string[]; sender?: string }) =>
      adminFetch<{ draft: { subject: string; email: string; text: string } }>(`/api/admin/prospects/${id}/draft`, { method: "POST", body: JSON.stringify({ demand, sender }) }).then((r) => r.draft),
  });
}

export function useAdminAudit() {
  return useQuery({ queryKey: ["admin", "audit"], queryFn: () => adminFetch<{ entries: AuditEntry[] }>("/api/admin/audit").then((r) => r.entries) });
}
