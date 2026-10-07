import { useState } from "react";
import { ENGINE_DATA, OTHER_ENGINE, isCustomEngineModel, type EngineType } from "@/data/engineData";

/**
 * Engine model picker with an "Other / not listed" escape hatch for older or
 * unusual engines (repowers, discontinued lines). Typed models are saved as-is.
 */
export default function EngineModelField({
  engineType,
  engineMake,
  value,
  onChange,
  selectClassName,
  inputClassName,
}: {
  engineType: string;
  engineMake: string;
  value: string;
  onChange: (model: string) => void;
  selectClassName: string;
  inputClassName?: string;
}) {
  const models = engineType && engineMake ? ENGINE_DATA[engineType as EngineType]?.[engineMake] ?? [] : [];
  const [typing, setTyping] = useState(() => isCustomEngineModel(engineType, engineMake, value));
  const showInput = typing || (!!value && isCustomEngineModel(engineType, engineMake, value));

  return (
    <div className="space-y-2">
      <select
        value={showInput ? OTHER_ENGINE : value}
        disabled={!engineMake}
        className={selectClassName}
        onChange={(e) => {
          if (e.target.value === OTHER_ENGINE) {
            setTyping(true);
            onChange("");
          } else {
            setTyping(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{engineMake ? "Select a model…" : "Select a make first…"}</option>
        {models.map((m) => <option key={m} value={m}>{m}</option>)}
        {engineMake && <option value={OTHER_ENGINE}>Other / not listed (type it in)</option>}
      </select>
      {showInput && (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`e.g. ${engineMake || "Yamaha"} F300 4.2L, 2012`}
          className={inputClassName ?? selectClassName}
        />
      )}
    </div>
  );
}
