import { useState, useMemo } from "react";
import {
  AutoBidTemplate,
  TemplateLineItem,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  toggleTemplateActive,
  seedDemoTemplates,
  getAutoBidLogForVendor,
} from "@/data/autoBidTemplates";
import { ENGINE_DATA, ENGINE_TYPES, EngineType } from "@/data/engineData";
import { ENGINE_SERVICES } from "@/data/engineServices";
import { Zap, Bell, Plus, Trash2, ChevronDown, ChevronUp, Pencil, Power, Copy } from "lucide-react";

interface Props {
  vendorId: string;
  onUpdate?: () => void;
}

const EMPTY_LINE_ITEM: TemplateLineItem = { description: "", quantity: 1, unitPrice: 0 };

export default function VendorBidTemplates({ vendorId, onUpdate }: Props) {
  useMemo(() => seedDemoTemplates(), []);

  const [, refresh] = useState(0);
  const bump = () => { refresh((n) => n + 1); onUpdate?.(); };

  const templates = getTemplates(vendorId);
  const log = getAutoBidLogForVendor(vendorId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────
  const [formEngineType, setFormEngineType] = useState<EngineType | "">("");
  const [formEngineMake, setFormEngineMake] = useState("");
  const [formEngineModel, setFormEngineModel] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formLineItems, setFormLineItems] = useState<TemplateLineItem[]>([{ ...EMPTY_LINE_ITEM }]);
  const [formMode, setFormMode] = useState<"auto" | "notify">("auto");
  const [formMaxConcurrent, setFormMaxConcurrent] = useState(5);
  const [formWorkLocations, setFormWorkLocations] = useState<Set<string>>(new Set(["at_marina", "vendor_facility"]));
  const [formAcceptsHaulOut, setFormAcceptsHaulOut] = useState(false);
  const [formHasCOI, setFormHasCOI] = useState(true);

  // Derived dropdown options
  const availableMakes = formEngineType ? Object.keys(ENGINE_DATA[formEngineType as EngineType] ?? {}) : [];
  const availableModels = (formEngineType && formEngineMake)
    ? (ENGINE_DATA[formEngineType as EngineType]?.[formEngineMake] ?? [])
    : [];
  const availableServices = formEngineType ? (ENGINE_SERVICES[formEngineType as EngineType] ?? []) : [];
  const selectedService = availableServices.find((s) => s.id === formServiceId);

  function resetForm() {
    setFormEngineType("");
    setFormEngineMake("");
    setFormEngineModel("");
    setFormServiceId("");
    setFormMessage("");
    setFormLineItems([{ ...EMPTY_LINE_ITEM }]);
    setFormMode("auto");
    setFormMaxConcurrent(5);
    setFormWorkLocations(new Set(["at_marina", "vendor_facility"]));
    setFormAcceptsHaulOut(false);
    setFormHasCOI(true);
    setEditingId(null);
  }

  function loadTemplateIntoForm(t: AutoBidTemplate) {
    setFormEngineType(t.engineType);
    setFormEngineMake(t.engineMake);
    setFormEngineModel(t.engineModel);
    setFormServiceId(t.serviceId);
    setFormMessage(t.message);
    setFormLineItems(t.lineItems.length > 0 ? [...t.lineItems] : [{ ...EMPTY_LINE_ITEM }]);
    setFormMode(t.mode);
    setFormMaxConcurrent(t.maxConcurrent);
    setFormWorkLocations(new Set(t.workLocations));
    setFormAcceptsHaulOut(t.acceptsHaulOut);
    setFormHasCOI(t.hasCOI);
    setEditingId(t.id);
    setShowForm(true);
  }

  function buildTemplateName(): string {
    const serviceName = selectedService?.name ?? "Service";
    const modelClean = formEngineModel.replace(/\s*\([\d–\-]+.*?\)$/, "");
    return `${serviceName} — ${formEngineMake} ${modelClean}`.trim();
  }

  function handleSave() {
    if (!formEngineType || !formEngineMake || !formEngineModel || !formServiceId) return;
    if (!formMessage.trim()) return;
    const validItems = formLineItems.filter((li) => li.description.trim() && li.unitPrice > 0);
    if (validItems.length === 0) return;

    const template: AutoBidTemplate = {
      id: editingId ?? `tpl_${Date.now()}`,
      vendorId,
      name: buildTemplateName(),
      engineType: formEngineType as EngineType,
      engineMake: formEngineMake,
      engineModel: formEngineModel,
      serviceId: formServiceId,
      serviceName: selectedService?.name ?? "",
      message: formMessage.trim(),
      lineItems: validItems,
      mode: formMode,
      maxConcurrent: formMaxConcurrent,
      active: true,
      bidCount: editingId ? (getTemplates().find((t) => t.id === editingId)?.bidCount ?? 0) : 0,
      workLocations: Array.from(formWorkLocations) as AutoBidTemplate["workLocations"],
      acceptsHaulOut: formAcceptsHaulOut,
      hasCOI: formHasCOI,
      createdAt: editingId ? (getTemplates().find((t) => t.id === editingId)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
    };

    saveTemplate(template);
    resetForm();
    setShowForm(false);
    bump();
  }

  function handleDelete(id: string) {
    deleteTemplate(id);
    if (expandedId === id) setExpandedId(null);
    bump();
  }

  function handleToggle(id: string) {
    toggleTemplateActive(id);
    bump();
  }

  function handleDuplicate(t: AutoBidTemplate) {
    const copy: AutoBidTemplate = {
      ...t,
      id: `tpl_${Date.now()}`,
      name: `${t.name} (copy)`,
      bidCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveTemplate(copy);
    bump();
  }

  function toggleWorkLocation(loc: string) {
    setFormWorkLocations((prev) => {
      const next = new Set(prev);
      next.has(loc) ? next.delete(loc) : next.add(loc);
      return next;
    });
  }

  function updateLineItem(index: number, field: keyof TemplateLineItem, value: string | number) {
    setFormLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const formTotal = formLineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const formValid = formEngineType && formEngineMake && formEngineModel && formServiceId && formMessage.trim() && formLineItems.some((li) => li.description.trim() && li.unitPrice > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Auto-Bid Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {templates.filter((t) => t.active).length} active template{templates.filter((t) => t.active).length !== 1 ? "s" : ""}
            {log.filter((e) => e.mode === "auto").length > 0 && ` · ${log.filter((e) => e.mode === "auto").length} auto-bids sent`}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </button>
      </div>

      {/* Template list */}
      {templates.length === 0 && !showForm && (
        <div className="border border-dashed border-border rounded-xl py-10 text-center">
          <Zap className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a template to auto-bid on matching RFPs</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            Create your first template
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((t) => {
            const isExpanded = expandedId === t.id;
            const bidsFromTemplate = log.filter((e) => e.templateId === t.id);
            const modelClean = t.engineModel.replace(/\s*\([\d–\-]+.*?\)$/, "");
            return (
              <div key={t.id} className={`bg-white border rounded-xl overflow-hidden transition-colors ${t.active ? "border-border" : "border-border/50 opacity-60"}`}>
                {/* Card header */}
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    t.mode === "auto" ? "bg-amber-50" : "bg-sky-50"
                  }`}>
                    {t.mode === "auto" ? (
                      <Zap className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Bell className="w-4 h-4 text-sky-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{t.serviceName}</h3>
                      {!t.active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">Paused</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.engineMake} {modelClean} · {t.engineType}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        ${t.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t.bidCount} bid{t.bidCount !== 1 ? "s" : ""} sent</p>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {/* Engine & service info */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-700">{t.engineType}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-700">{t.engineMake}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-700">{t.engineModel}</span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[10px] font-medium text-sky-700">{t.serviceName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.mode === "auto" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
                      }`}>
                        {t.mode === "auto" ? "⚡ Auto-bid" : "🔔 Notify only"}
                      </span>
                      {t.hasCOI && <span className="px-2 py-0.5 rounded-full bg-green-50 text-[10px] font-medium text-green-700">COI on file</span>}
                      {t.acceptsHaulOut && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-medium text-blue-700">Haul-out OK</span>}
                      {t.maxConcurrent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-700">
                          Max {t.maxConcurrent} concurrent
                        </span>
                      )}
                    </div>

                    {/* Bid message */}
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Bid Message</p>
                      <p className="text-xs text-foreground leading-relaxed">{t.message}</p>
                    </div>

                    {/* Line items */}
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Line Items</p>
                      <div className="space-y-1">
                        {t.lineItems.map((li, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{li.description}</span>
                            <span className="text-muted-foreground ml-2 flex-shrink-0">
                              {li.quantity > 1 && `${li.quantity} × `}${li.unitPrice > 0 ? `$${li.unitPrice.toLocaleString()}` : "Included"}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-border/50">
                          <span>Total</span>
                          <span>${t.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent activity */}
                    {bidsFromTemplate.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Recent Activity</p>
                        <div className="space-y-1">
                          {bidsFromTemplate.slice(-3).reverse().map((entry) => (
                            <div key={entry.bidId} className="flex items-center justify-between text-xs">
                              <span className="text-foreground truncate">{entry.projectTitle}</span>
                              <span className="text-muted-foreground flex-shrink-0 ml-2">
                                ${entry.price.toLocaleString()} · {new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(t.id); }}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                          t.active
                            ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                            : "text-green-700 bg-green-50 hover:bg-green-100"
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {t.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); loadTemplateIntoForm(t); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(t); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Duplicate
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Form ──────────────────────────────────── */}
      {showForm && (
        <div className="mt-3 bg-white border border-sky-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-sky-50/30">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Template" : "New Auto-Bid Template"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select the exact engine and service this template covers
            </p>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Step 1: Engine Type */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">1. Engine Type</label>
              <div className="flex gap-2">
                {ENGINE_TYPES.map((et) => (
                  <button
                    key={et}
                    onClick={() => { setFormEngineType(et); setFormEngineMake(""); setFormEngineModel(""); setFormServiceId(""); }}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-center ${
                      formEngineType === et
                        ? "border-sky-400 bg-sky-50 text-sky-800"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Engine Make */}
            {formEngineType && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">2. Engine Make</label>
                <div className="flex flex-wrap gap-2">
                  {availableMakes.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setFormEngineMake(m); setFormEngineModel(""); }}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        formEngineMake === m
                          ? "border-sky-400 bg-sky-50 text-sky-800"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Engine Model */}
            {formEngineMake && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">3. Engine Model</label>
                <select
                  value={formEngineModel}
                  onChange={(e) => setFormEngineModel(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                >
                  <option value="">Select a model…</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 4: Service Type */}
            {formEngineModel && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">4. Service Type</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                >
                  <option value="">Select a service…</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {selectedService && (
                  <p className="text-[10px] text-muted-foreground mt-1">{selectedService.description}</p>
                )}
              </div>
            )}

            {/* Once engine + service selected, show bid details */}
            {formServiceId && (
              <>
                {/* Template name preview */}
                <div className="px-3 py-2 rounded-lg bg-gray-50 border border-border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Template Name</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{buildTemplateName()}</p>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormMode("auto")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                        formMode === "auto"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Zap className="w-3 h-3" /> Auto-bid
                    </button>
                    <button
                      onClick={() => setFormMode("notify")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                        formMode === "notify"
                          ? "border-sky-300 bg-sky-50 text-sky-800"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bell className="w-3 h-3" /> Notify me
                    </button>
                  </div>
                </div>

                {/* Bid message */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Bid Message</label>
                  <textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    rows={3}
                    placeholder="Describe your service, certifications, and what's included..."
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50 resize-none"
                  />
                </div>

                {/* Line items */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Line Items</label>
                  <div className="space-y-1.5">
                    {formLineItems.map((li, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={li.description}
                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                          placeholder="Description"
                          className="flex-1 border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                        />
                        <input
                          type="number"
                          value={li.quantity}
                          onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)}
                          className="w-14 border border-border rounded-md px-2 py-1.5 text-xs text-foreground bg-background text-center focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          min={1}
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={li.unitPrice || ""}
                            onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-24 border border-border rounded-md pl-5 pr-2 py-1.5 text-xs text-foreground bg-background text-right focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          />
                        </div>
                        {formLineItems.length > 1 && (
                          <button
                            onClick={() => setFormLineItems((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setFormLineItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }])}
                      className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      + Add item
                    </button>
                    {formTotal > 0 && (
                      <span className="text-xs font-semibold text-foreground">Total: ${formTotal.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Safety & logistics */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Logistics</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Work Locations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: "at_marina", label: "At Marina" },
                          { key: "vendor_facility", label: "My Shop" },
                          { key: "mobile", label: "Mobile" },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => toggleWorkLocation(key)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                              formWorkLocations.has(key)
                                ? "bg-sky-100 text-sky-700"
                                : "bg-gray-100 text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formMode === "auto" && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Max Concurrent Auto-Bids</p>
                        <input
                          type="number"
                          value={formMaxConcurrent}
                          onChange={(e) => setFormMaxConcurrent(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-20 border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background text-center focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">0 = unlimited</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAcceptsHaulOut}
                        onChange={(e) => setFormAcceptsHaulOut(e.target.checked)}
                        className="rounded border-border"
                      />
                      Accept haul-out jobs
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formHasCOI}
                        onChange={(e) => setFormHasCOI(e.target.checked)}
                        className="rounded border-border"
                      />
                      Marina COI on file
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Form footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-gray-50/50">
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formValid}
              className="px-4 py-2 rounded-md bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
