// The live marketplace data layer lives in @bosun/shared; this binds it to the web's Supabase
// client and API client so hooks and pages keep the same function names.

import { supabase, supabaseMissing } from "@/lib/supabase";
import { api } from "@/lib/api";
import { createProject, type CreateProjectInput } from "@shared/marketplace/jobs";
import {
  acceptBid,
  markBidsSeen,
  setBidRejected,
  submitBid,
  updateProjectStatus as setProjectStatus,
  withdrawBid,
  type SubmitBidInput,
} from "@shared/marketplace/bids";
import { uploadProjectPhotos as uploadPhotos, type PhotoInput } from "@shared/marketplace/photos";
import type { Project } from "@shared/marketplace/types";

export {
  OPEN_RFP_SELECT,
  PROJECT_DETAIL_SELECT,
  PROJECT_LIST_SELECT,
  formatProjectDate,
  mapBid,
  mapProject,
  type BidRow,
  type ProjectRow,
} from "@shared/marketplace/map";
export type { CreateProjectInput, SubmitBidInput };

export async function requireClient() {
  if (supabaseMissing || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export async function uploadProjectPhotos(userId: string, projectId: string, photos: PhotoInput[]): Promise<string[]> {
  return uploadPhotos(await requireClient(), userId, projectId, photos);
}

export async function createMarketplaceProject(userId: string, input: CreateProjectInput): Promise<Project> {
  return createProject(await requireClient(), api, userId, input);
}

export async function submitMarketplaceBid(input: SubmitBidInput): Promise<void> {
  return submitBid(await requireClient(), input);
}

export async function updateProjectStatus(projectId: string, status: Project["status"]): Promise<void> {
  return setProjectStatus(await requireClient(), projectId, status);
}

export async function acceptMarketplaceBid(
  projectId: string,
  bidId: string,
  booking?: Record<string, unknown>,
): Promise<void> {
  return acceptBid(await requireClient(), projectId, bidId, booking);
}

export async function markMarketplaceBidsSeen(projectId: string): Promise<void> {
  return markBidsSeen(await requireClient(), projectId);
}

export async function setMarketplaceBidRejected(bidId: string, rejected: boolean): Promise<void> {
  return setBidRejected(await requireClient(), bidId, rejected);
}

export async function withdrawMarketplaceBid(bidId: string): Promise<void> {
  return withdrawBid(await requireClient(), bidId);
}
