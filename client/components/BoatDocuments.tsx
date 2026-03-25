import { useState } from "react";
import { useBoatDocuments, useUploadBoatDocument } from "@/hooks/use-supabase";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

type BoatDoc = Tables<"boat_documents">;

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  registration: "Registration",
  warranty: "Warranty",
  survey: "Survey",
  title: "Title",
  other: "Other",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  insurance: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  registration: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  warranty: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  survey: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  title: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  other: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpiringSoon(expiryDate: string | null) {
  if (!expiryDate) return false;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
}

function isExpired(expiryDate: string | null) {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() < Date.now();
}

export default function BoatDocuments({ boatId }: { boatId: string }) {
  const { data: documents, isLoading } = useBoatDocuments(boatId) as { data: BoatDoc[] | undefined; isLoading: boolean };
  const uploadMutation = useUploadBoatDocument();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    documentType: "insurance" as "insurance" | "registration" | "warranty" | "survey" | "title" | "other",
    expiryDate: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!selectedFile || !uploadForm.title) return;
    await uploadMutation.mutateAsync({
      boatId,
      file: selectedFile,
      documentType: uploadForm.documentType,
      title: uploadForm.title,
      expiryDate: uploadForm.expiryDate || undefined,
      notes: uploadForm.notes || undefined,
    });
    setShowUpload(false);
    setSelectedFile(null);
    setUploadForm({ title: "", documentType: "insurance", expiryDate: "", notes: "" });
  }

  async function handleDelete(docId: string, fileUrl: string) {
    // Extract storage path from URL
    const path = fileUrl.split("/boat-documents/")[1];
    if (path) {
      await supabase.storage.from("boat-documents").remove([decodeURIComponent(path)]);
    }
    await supabase.from("boat_documents").delete().eq("id", docId);
  }

  if (isLoading) return <div className="text-xs text-muted-foreground py-2">Loading documents...</div>;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents</h4>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          {showUpload ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="border border-dashed border-primary/30 rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Type</label>
              <select
                value={uploadForm.documentType}
                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value as any })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Expiry Date</label>
              <input
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g. Progressive Insurance Policy 2026"
              className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">File</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !uploadForm.title || uploadMutation.isPending}
            className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      )}

      {/* Document list */}
      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DOC_TYPE_ICONS[doc.document_type] || DOC_TYPE_ICONS.other} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{doc.title}</p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                    {DOC_TYPE_LABELS[doc.document_type]}
                  </span>
                  {isExpired(doc.expiry_date) && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">Expired</span>
                  )}
                  {isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">Expiring soon</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                  {doc.expiry_date && ` · Expires ${new Date(doc.expiry_date).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:opacity-70 transition-opacity"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(doc.id, doc.file_url)}
                  className="text-xs text-red-500 hover:opacity-70 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showUpload && (
          <p className="text-xs text-muted-foreground py-1">No documents yet. Add insurance, registration, or warranty docs.</p>
        )
      )}
    </div>
  );
}
