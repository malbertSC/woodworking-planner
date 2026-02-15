import type { ComponentRef, RefObject } from "react";
import type { CameraControls } from "@react-three/drei";
import { TOOLBAR_BTN } from "./svg-constants.ts";

type CameraControlsRef = ComponentRef<typeof CameraControls>;

interface Preset {
  label: string;
  position: [number, number, number];
}

function makePresets(distance: number): Preset[] {
  return [
    { label: "Front", position: [0, 0, distance] },
    { label: "Side", position: [distance, 0, 0] },
    { label: "Top", position: [0, distance, 0] },
    {
      label: "Iso",
      position: [distance, distance * 0.7, distance],
    },
  ];
}

export default function CameraPresetToolbar({
  distance,
  controlsRef,
}: {
  distance: number;
  controlsRef: RefObject<CameraControlsRef | null>;
}) {
  const presets = makePresets(distance);

  function applyPreset(pos: [number, number, number]) {
    void controlsRef.current?.setLookAt(pos[0], pos[1], pos[2], 0, 0, 0, true);
  }

  return (
    <div className="absolute top-2 right-2 flex gap-1 z-10">
      {presets.map((p) => (
        <button
          key={p.label}
          className={TOOLBAR_BTN}
          onClick={() => {
            applyPreset(p.position);
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
