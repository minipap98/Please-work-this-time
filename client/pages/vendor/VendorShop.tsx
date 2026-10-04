import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { useVendorBidProjects } from "@/hooks/use-marketplace";
import { isDemoMode } from "@/lib/demoMode";
import {
  nextWorkOrderNumber,
  useAdjustInventory,
  useDeleteInventoryItem,
  useDeleteShipment,
  useDeleteWorkOrder,
  useInventory,
  useMarkExported,
  useReceiveShipment,
  useSaveInventoryItem,
  useSaveShipment,
  useSaveWorkOrder,
  useSetWorkOrderStatus,
  useShipments,
  useShopRealtime,
  useShopSettings,
  useCrew,
  useInviteCrew,
  useRemoveCrew,
  useRenameCrew,
  useSetCrewRole,
  type CrewRole,
  useUpdateShopSettings,
  useWorkOrders,
  type ShipmentDraft,
  type WorkOrderDraft,
} from "@/hooks/use-shop";
import { DEFAULT_SHOP_SETTINGS } from "@/data/shopDemoData";
import type { Project } from "@/data/projectData";
import { isLowStock, occupiesDay, toLocalDateKey, workOrderTotals, type InventoryItem, type WorkOrder } from "@shared/shop";
import WorkOrderEditor, { blankWorkOrder, draftFromOrder } from "@/components/shop/WorkOrderEditor";
import WorkOrdersPanel from "@/components/shop/WorkOrdersPanel";
import SchedulePanel from "@/components/shop/SchedulePanel";
import InventoryPanel from "@/components/shop/InventoryPanel";
import PartsInboundPanel, { blankShipment } from "@/components/shop/PartsInboundPanel";
import QuickBooksPanel from "@/components/shop/QuickBooksPanel";
import { inputCls, labelCls, money } from "@/components/shop/shopUi";

type Tab = "orders" | "schedule" | "inventory" | "parts" | "quickbooks" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Work Orders" },
  { key: "schedule", label: "Schedule" },
  { key: "inventory", label: "Inventory" },
  { key: "parts", label: "Parts Inbound" },
  { key: "quickbooks", label: "QuickBooks" },
  { key: "settings", label: "Shop Settings" },
];

const INBOUND_DOMAIN = import.meta.env.VITE_INBOUND_EMAIL_DOMAIN as string | undefined;

const MANAGER_HIDDEN: Tab[] = ["quickbooks", "settings"];

/**
 * The shop workspace. A crew manager opens it with `vendorIdOverride` and
 * `managerMode`: full board, inventory and parts, but no QuickBooks or settings.
 */
export default function VendorShop({
  vendorIdOverride,
  managerMode = false,
  shopName,
}: { vendorIdOverride?: string; managerMode?: boolean; shopName?: string } = {}) {
  const { vendorId: roleVendorId } = useRole();
  const vendorId = vendorIdOverride ?? roleVendorId;
  const tabs = managerMode ? TABS.filter((t) => !MANAGER_HIDDEN.includes(t.key)) : TABS;
  const { toast } = useToast();
  const demo = isDemoMode();
  const [params, setParams] = useSearchParams();
  const tab = (tabs.some((t) => t.key === params.get("tab")) ? params.get("tab") : "orders") as Tab;
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });

  useShopRealtime(vendorId);
  const { data: settings = DEFAULT_SHOP_SETTINGS } = useShopSettings(vendorId);
  const { data: orders = [], isLoading: ordersLoading } = useWorkOrders(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const { data: bidJobs = [] } = useVendorBidProjects(vendorId);

  const saveOrder = useSaveWorkOrder(vendorId);
  const setStatus = useSetWorkOrderStatus(vendorId);
  const deleteOrder = useDeleteWorkOrder(vendorId);
  const markExported = useMarkExported(vendorId);
  const saveItem = useSaveInventoryItem(vendorId);
  const deleteItem = useDeleteInventoryItem(vendorId);
  const adjust = useAdjustInventory(vendorId);
  const saveShipment = useSaveShipment(vendorId);
  const receive = useReceiveShipment(vendorId);
  const deleteShipment = useDeleteShipment(vendorId);
  const updateSettings = useUpdateShopSettings(vendorId);

  const [editor, setEditor] = useState<WorkOrderDraft | null>(null);
  const [shipmentSeed, setShipmentSeed] = useState<ShipmentDraft | null>(null);
  const clearSeed = useCallback(() => setShipmentSeed(null), []);
  const [autoPaste, setAutoPaste] = useState(false);

  const fail = (e: unknown) =>
    toast({ title: "Couldn't save", description: e instanceof Error ? e.message : String(e), variant: "destructive" });

  const wonJobs = useMemo(
    () =>
      bidJobs.filter(
        (p) =>
          p.chosenBidId &&
          p.status !== "completed" &&
          p.bids.some((b) => b.id === p.chosenBidId && (b.vendorProfileId === vendorId || b.vendorName === vendorId))
      ),
    [bidJobs, vendorId]
  );

  const todayKey = toLocalDateKey(new Date().toISOString());
  const stats = useMemo(() => {
    const today = orders.filter((o) => occupiesDay(o, todayKey) && o.status !== "invoiced");
    const waiting = orders.filter((o) => o.status === "waiting-parts");
    const low = inventory.filter(isLowStock);
    const arriving = shipments.filter((s) => !s.receivedAt && (s.status === "out-for-delivery" || s.eta === todayKey));
    const unbilled = orders
      .filter((o) => o.status === "completed" && !o.exportedAt)
      .reduce((s, o) => s + workOrderTotals(o.lines, o.taxRate).total, 0);
    return { today, waiting, low, arriving, unbilled };
  }, [orders, inventory, shipments, todayKey]);

  const deepWo = params.get("wo");
  const deepNew = params.get("new");
  const deepPaste = params.get("paste");
  useEffect(() => {
    if (!deepWo && !deepNew && !deepPaste) return;
    if (deepWo) {
      const found = orders.find((o) => o.id === deepWo);
      if (!found) return; // wait for orders to load
      setEditor(draftFromOrder(found));
    } else if (deepNew === "wo") {
      setEditor({ ...blankWorkOrder(nextWorkOrderNumber(orders), settings) });
    } else if (deepPaste) {
      setAutoPaste(true);
    }
    setParams({ tab }, { replace: true });
  }, [deepWo, deepNew, deepPaste, orders, settings, tab, setParams]);

  if (!vendorId) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Finish vendor onboarding to open your shop.</p>
        </main>
      </>
    );
  }

  const openNew = (patch: Partial<WorkOrderDraft> = {}) =>
    setEditor({ ...blankWorkOrder(nextWorkOrderNumber(orders), settings), ...patch });

  const openFromJob = (job: Project) => {
    const bid = job.bids.find((b) => b.id === job.chosenBidId);
    openNew({
      title: job.title,
      description: job.description,
      customerName: job.ownerContact?.name ?? job.owner ?? "",
      customerEmail: job.ownerContact?.email ?? "",
      boatLabel: job.boat ? `${job.boat.year} ${job.boat.make} ${job.boat.model}${job.boat.name ? ` · ${job.boat.name}` : ""}` : "",
      projectId: job.id,
      lines: bid?.lineItems?.length
        ? bid.lineItems.map((li) => ({ kind: "labor" as const, description: li.description, quantity: li.quantity, unitPrice: li.unitPrice }))
        : [{ kind: "labor", description: job.title, quantity: 1, unitPrice: bid?.price ?? settings.laborRate }],
    });
  };

  const openNewAt = (dayKey: string, bay: string) => {
    const start = new Date(`${dayKey}T08:00:00`);
    const end = new Date(`${dayKey}T12:00:00`);
    openNew({ scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), ...(bay && { bay }) });
  };

  const reorder = (item: InventoryItem) => {
    setShipmentSeed({
      ...blankShipment(),
      supplier: item.supplier,
      description: `${item.name}${item.sku ? ` (${item.sku})` : ""}`,
      inventoryItemId: item.id,
      quantity: Math.max(1, item.reorderPoint * 2 - item.qtyOnHand),
    });
    setTab("parts");
  };

  const inboundAddress = INBOUND_DOMAIN
    ? `parts+${settings.inboundEmailToken}@${INBOUND_DOMAIN}`
    : demo
      ? `parts+${settings.inboundEmailToken}@parts.bosun.app`
      : null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{shopName ?? "Shop"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Work orders, the board, parts on the shelf and on the truck, and clean books.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-5">
          <StatButton label="On the board today" value={String(stats.today.length)} onClick={() => setTab("schedule")} />
          <StatButton label="Waiting on parts" value={String(stats.waiting.length)} tone={stats.waiting.length ? "warn" : undefined} onClick={() => setTab("orders")} />
          <StatButton label="Parts arriving today" value={String(stats.arriving.length)} onClick={() => setTab("parts")} />
          <StatButton label="Low stock" value={String(stats.low.length)} tone={stats.low.length ? "warn" : undefined} onClick={() => setTab("inventory")} />
          <StatButton label="Ready to invoice" value={money(stats.unbilled)} onClick={() => setTab("quickbooks")} />
        </div>

        <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key ? "border-sky-500 text-sky-700" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {ordersLoading && !demo ? (
          <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>
        ) : (
          <>
            {tab === "orders" && (
              <WorkOrdersPanel
                orders={orders}
                shipments={shipments}
                wonJobs={wonJobs}
                onOpen={(o: WorkOrder) => setEditor(draftFromOrder(o))}
                onNew={() => openNew()}
                onFromJob={openFromJob}
                onStatus={(id, status) => setStatus.mutate({ id, status }, { onError: fail })}
              />
            )}
            {tab === "schedule" && (
              <SchedulePanel
                orders={orders}
                bays={settings.bays}
                onOpen={(o) => setEditor(draftFromOrder(o))}
                onNewAt={openNewAt}
              />
            )}
            {tab === "inventory" && (
              <InventoryPanel
                items={inventory}
                live={!demo}
                saving={saveItem.isPending}
                onAdjust={(id, delta) => adjust.mutate({ id, delta }, { onError: fail })}
                onSave={(item) => saveItem.mutate(item, { onError: fail })}
                onDelete={(id) => deleteItem.mutate(id, { onError: fail })}
                onReorder={reorder}
              />
            )}
            {tab === "parts" && (
              <PartsInboundPanel
                shipments={shipments}
                inventory={inventory}
                workOrders={orders}
                inboundAddress={inboundAddress}
                draftSeed={shipmentSeed}
                onDraftSeedUsed={clearSeed}
                autoPaste={autoPaste}
                onAutoPasteUsed={() => setAutoPaste(false)}
                onSave={(d) => saveShipment.mutate(d, { onError: fail })}
                onReceive={(id) =>
                  receive.mutate(id, {
                    onError: fail,
                    onSuccess: () => toast({ title: "Checked in", description: "Linked stock was added to inventory." }),
                  })
                }
                onDelete={(id) => deleteShipment.mutate(id, { onError: fail })}
              />
            )}
            {tab === "quickbooks" && (
              <QuickBooksPanel
                orders={orders}
                inventory={inventory}
                settings={settings}
                onMarkExported={(ids) =>
                  markExported.mutate(ids, {
                    onError: fail,
                    onSuccess: () => toast({ title: `${ids.length} work orders marked invoiced` }),
                  })
                }
                onSaveSettings={(patch) => updateSettings.mutate(patch, { onError: fail })}
              />
            )}
            {tab === "settings" && (
              <>
              <ShopSettingsPanel
                key={JSON.stringify(settings)}
                settings={settings}
                saving={updateSettings.isPending}
                onSave={(patch) =>
                  updateSettings.mutate(patch, { onError: fail, onSuccess: () => toast({ title: "Shop settings saved" }) })
                }
              />
              <CrewPanel vendorId={vendorId} techs={settings.techs} />
              </>
            )}
          </>
        )}
      </main>

      {editor && (
        <WorkOrderEditor
          open
          onOpenChange={(o) => !o && setEditor(null)}
          initial={editor}
          inventory={inventory}
          shipments={shipments}
          onOrderPart={
            editor.id
              ? (d) => {
                  setEditor(null);
                  setShipmentSeed({
                    ...blankShipment(),
                    workOrderId: editor.id!,
                    boatLabel: d.boatLabel,
                    customerName: d.customerName,
                  });
                  setTab("parts");
                }
              : undefined
          }
          settings={settings}
          saving={saveOrder.isPending}
          onSave={(d) =>
            saveOrder.mutate(d, {
              onError: fail,
              onSuccess: () => {
                setEditor(null);
                if (d.projectId && (d.status === "completed" || d.status === "invoiced")) {
                  toast({ title: "Added to the owner's boat log", description: "They'll see every line of the job." });
                }
              },
            })
          }
          onDelete={
            editor.id
              ? () => {
                  if (!confirm(`Delete ${editor.number}? Stocked parts on it go back on the shelf.`)) return;
                  deleteOrder.mutate(editor.id!, { onError: fail, onSuccess: () => setEditor(null) });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function StatButton({ label, value, tone, onClick }: { label: string; value: string; tone?: "warn"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-xl p-3 bg-white hover:border-foreground/30 transition-colors ${tone === "warn" ? "border-amber-200" : "border-border"}`}
    >
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone === "warn" ? "text-amber-700" : "text-foreground"}`}>{value}</p>
    </button>
  );
}

function ShopSettingsPanel({
  settings, saving, onSave,
}: {
  settings: typeof DEFAULT_SHOP_SETTINGS;
  saving: boolean;
  onSave: (patch: Partial<typeof DEFAULT_SHOP_SETTINGS>) => void;
}) {
  const [laborRate, setLaborRate] = useState(String(settings.laborRate));
  const [taxRate, setTaxRate] = useState(String(settings.taxRate));
  const [bays, setBays] = useState(settings.bays.join(", "));
  const [techs, setTechs] = useState(settings.techs.join(", "));
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="max-w-xl border border-border rounded-xl p-4 bg-white space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Shop labor rate ($/hr)</label>
          <input className={inputCls} type="number" min={0} value={laborRate} onChange={(e) => setLaborRate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Parts sales tax %</label>
          <input className={inputCls} type="number" min={0} step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Bays / locations (comma separated)</label>
        <input className={inputCls} value={bays} onChange={(e) => setBays(e.target.value)} placeholder="Bay 1, Bay 2, Haul-out, Dockside" />
      </div>
      <div>
        <label className={labelCls}>Techs (comma separated)</label>
        <input className={inputCls} value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="Marco, Jess, Luis" />
      </div>
      <div className="flex justify-end">
        <button
          disabled={saving}
          onClick={() => onSave({ laborRate: Number(laborRate) || 0, taxRate: Number(taxRate) || 0, bays: list(bays), techs: list(techs) })}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function CrewPanel({ vendorId, techs }: { vendorId: string; techs: string[] }) {
  const { toast } = useToast();
  const { data: crew = [] } = useCrew(vendorId);
  const invite = useInviteCrew(vendorId);
  const remove = useRemoveCrew(vendorId);
  const rename = useRenameCrew(vendorId);
  const setRole = useSetCrewRole(vendorId);
  const [email, setEmail] = useState("");
  const [techName, setTechName] = useState(techs[0] ?? "");
  const [role, setNewRole] = useState<CrewRole>("tech");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/tech` : "/tech";
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && techName.trim().length > 0;

  return (
    <div className="max-w-xl border border-border rounded-xl p-4 bg-white space-y-3 mt-4">
      <div>
        <p className="text-sm font-semibold">Crew logins</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          <b>Techs</b> see only the jobs assigned to them: the day's list, parts to pull with bin locations, and buttons to
          start, finish and add notes (notes go into the owner's Boat Log). <b>Managers</b> run the whole board, inventory
          and parts, but can't see QuickBooks or change shop settings and crew.
        </p>
      </div>
      <div className="grid grid-cols-6 gap-2">
        <input
          className={`${inputCls} col-span-3`}
          type="email"
          placeholder="tech@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={`${inputCls} col-span-2`}
          list="crew-techs"
          placeholder="Name on the board"
          value={techName}
          onChange={(e) => setTechName(e.target.value)}
        />
        <datalist id="crew-techs">{techs.map((t) => <option key={t} value={t} />)}</datalist>
        <select className={`${inputCls} col-span-1`} value={role} onChange={(e) => setNewRole(e.target.value as CrewRole)} aria-label="Role">
          <option value="tech">Tech</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Then send them <code className="bg-muted px-1 rounded">{link}</code> to sign up or log in with that email. Click a
          name to rename it; their jobs move with them.
        </p>
        <button
          disabled={!valid || invite.isPending}
          onClick={() =>
            invite.mutate(
              { email, techName: techName.trim(), role },
              {
                onSuccess: () => {
                  toast({ title: `Invited ${techName.trim()}`, description: `Send them ${link}` });
                  setEmail("");
                },
                onError: (e) => toast({ title: "Couldn't invite", description: String(e), variant: "destructive" }),
              }
            )
          }
          className="shrink-0 px-3 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
        >
          Invite
        </button>
      </div>
      {crew.length > 0 && (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {crew.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              {editing === m.id ? (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename.mutate(
                      { member: m, newName: editName },
                      {
                        onSuccess: () => {
                          setEditing(null);
                          toast({ title: `Renamed to ${editName.trim()}`, description: "Their assigned jobs moved with them." });
                        },
                        onError: (err) => toast({ title: "Couldn't rename", description: String(err), variant: "destructive" }),
                      }
                    );
                  }}
                >
                  <input autoFocus className="px-2 py-1 text-sm border border-border rounded-md w-32" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <button type="submit" className="text-xs font-semibold text-sky-700">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs text-muted-foreground">Cancel</button>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setEditing(m.id);
                    setEditName(m.techName);
                  }}
                  className="font-medium hover:underline"
                  title="Rename"
                >
                  {m.techName}
                </button>
              )}
              <span className="text-muted-foreground truncate flex-1 min-w-[8rem]">{m.email}</span>
              <select
                value={m.role}
                onChange={(e) => setRole.mutate({ id: m.id, role: e.target.value as CrewRole })}
                className="text-xs border border-border rounded-md px-1.5 py-1 bg-background"
                aria-label={`Role for ${m.techName}`}
              >
                <option value="tech">Tech</option>
                <option value="manager">Manager</option>
              </select>
              <span className={`text-[10px] font-semibold ${m.joined ? "text-emerald-700" : "text-amber-700"}`}>
                {m.joined ? "JOINED" : "INVITED"}
              </span>
              <button
                onClick={() => remove.mutate(m.id)}
                className="text-xs text-muted-foreground hover:text-red-600"
                aria-label={`Remove ${m.techName}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
