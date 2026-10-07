import type { ApiClient } from "../api/client";
import type { Db } from "../db/client";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "../db/optionalColumns";
import { PROJECT_LIST_SELECT, mapProject, type ProjectRow } from "./map";
import { uploadProjectPhotos, type PhotoInput } from "./photos";
import type { Project } from "./types";

export interface CreateProjectInput {
  title: string;
  description: string;
  category?: string;
  location?: string;
  /** Approximate (rounded) job location for distance matching. */
  lat?: number | null;
  lng?: number | null;
  boatId?: string;
  photos?: PhotoInput[];
  metadata?: Record<string, unknown>;
}

/**
 * Post a job: insert the row (status "bidding"), upload its photos, then ask the API to email
 * matching shops. The in-app notification to shops comes from a database trigger, so a failed
 * email call is not an error for the owner.
 */
export async function createProject(
  client: Db,
  api: ApiClient,
  userId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const row: Record<string, unknown> = {
    owner_id: userId,
    title: input.title,
    description: input.description,
    category: input.category,
    location: input.location,
    boat_id: input.boatId,
    status: "bidding",
    metadata: input.metadata ?? {},
    ...(input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : {}),
  };
  const insert = (r: Record<string, unknown>) =>
    client.from("projects").insert(r as never).select(PROJECT_LIST_SELECT).single();
  let { data, error } = await insert(row);
  if (isMissingColumn(error)) ({ data, error } = await insert(withoutKeys(row, LOCATION_KEYS)));
  if (error) throw error;
  const project = mapProject(data as unknown as ProjectRow);
  if (input.photos?.length) {
    await uploadProjectPhotos(client, userId, project.id, input.photos);
  }
  try {
    await api.notifyJob(project.id);
  } catch {
    // In-app notifications still fire from the database trigger.
  }
  return project;
}
