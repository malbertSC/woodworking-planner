import { useRef, useState } from "react";
import { useChestStore } from "../../store.ts";

export default function SaveLoadPanel() {
  const config = useChestStore((s) => s.config);
  const savedConfigs = useChestStore((s) => s.savedConfigs);
  const saveConfig = useChestStore((s) => s.saveConfig);
  const loadConfig = useChestStore((s) => s.loadConfig);
  const deleteConfig = useChestStore((s) => s.deleteConfig);
  const exportConfig = useChestStore((s) => s.exportConfig);
  const importConfig = useChestStore((s) => s.importConfig);
  const resetToDefaults = useChestStore((s) => s.resetToDefaults);

  const [saveName, setSaveName] = useState(config.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedNames = Object.keys(savedConfigs);

  function handleExport() {
    const json = exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        importConfig(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => {
            setSaveName(e.target.value);
          }}
          placeholder="Configuration name"
          className="flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          aria-label="Configuration name"
        />
        <button
          type="button"
          onClick={() => {
            if (saveName.trim()) saveConfig(saveName.trim());
          }}
          disabled={!saveName.trim()}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
        >
          Save
        </button>
      </div>

      {savedNames.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-stone-600">
            Saved Configurations
          </p>
          {savedNames.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded border border-stone-200 px-3 py-2 text-sm"
            >
              <span className="text-stone-800 truncate">{name}</span>
              <div className="flex gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    loadConfig(name);
                  }}
                  className="rounded px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteConfig(name);
                  }}
                  className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-stone-200 pt-3">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          aria-label="Import configuration file"
        />
      </div>

      <div className="border-t border-stone-200 pt-3">
        <button
          type="button"
          onClick={() => {
            resetToDefaults();
          }}
          className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
