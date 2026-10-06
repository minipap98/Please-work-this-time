import { useState } from "react";
import { BOAT_MAKES, BOAT_MODELS, OTHER_BOAT } from "@/data/boatData";

/**
 * Make and model pickers with an "Other / not listed" escape on both, so a boat we don't
 * have in the catalog can still be entered exactly as the owner knows it.
 */
export default function BoatMakeModelFields({
  make,
  model,
  onChange,
  selectClassName,
  inputClassName,
  labelClassName = "block text-sm font-medium text-foreground mb-1.5",
}: {
  make: string;
  model: string;
  onChange: (next: { make: string; model: string }) => void;
  selectClassName: string;
  inputClassName: string;
  labelClassName?: string;
}) {
  const knownMake = !!make && BOAT_MAKES.includes(make);
  const models = knownMake ? BOAT_MODELS[make] ?? [] : [];
  const knownModel = !!model && models.includes(model);
  const [typingMake, setTypingMake] = useState(!!make && !knownMake);
  const [typingModel, setTypingModel] = useState(!!model && !knownModel && knownMake);

  return (
    <>
      <div>
        <label className={labelClassName}>Make</label>
        <select
          value={typingMake ? OTHER_BOAT : make}
          onChange={(e) => {
            if (e.target.value === OTHER_BOAT) {
              setTypingMake(true);
              setTypingModel(false);
              onChange({ make: "", model: "" });
            } else {
              setTypingMake(false);
              setTypingModel(false);
              onChange({ make: e.target.value, model: "" });
            }
          }}
          className={selectClassName}
        >
          <option value="">Select a make…</option>
          {BOAT_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value={OTHER_BOAT}>Other / not listed (type it in)</option>
        </select>
        {typingMake && (
          <input autoFocus value={make} onChange={(e) => onChange({ make: e.target.value, model })} placeholder="Builder, e.g. Valhalla" className={`${inputClassName} mt-2`} />
        )}
      </div>
      <div>
        <label className={labelClassName}>Model</label>
        {typingMake ? (
          <input value={model} onChange={(e) => onChange({ make, model: e.target.value })} placeholder="Model, e.g. V-41" className={inputClassName} disabled={!make} />
        ) : (
          <>
            <select
              value={typingModel ? OTHER_BOAT : model}
              disabled={!make}
              onChange={(e) => {
                if (e.target.value === OTHER_BOAT) {
                  setTypingModel(true);
                  onChange({ make, model: "" });
                } else {
                  setTypingModel(false);
                  onChange({ make, model: e.target.value });
                }
              }}
              className={selectClassName}
            >
              <option value="">{make ? "Select a model…" : "Select a make first…"}</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
              {make && <option value={OTHER_BOAT}>Other / not listed (type it in)</option>}
            </select>
            {typingModel && (
              <input autoFocus value={model} onChange={(e) => onChange({ make, model: e.target.value })} placeholder={`${make} model`} className={`${inputClassName} mt-2`} />
            )}
          </>
        )}
      </div>
    </>
  );
}
