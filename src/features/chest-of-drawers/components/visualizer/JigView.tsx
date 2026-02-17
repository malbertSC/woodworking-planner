import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Edges, Grid } from "@react-three/drei";
import { useChestStore } from "../../store.ts";
import {
  computeAllJigPanelLayouts,
  type JigPanelLayout,
  type JigPanelSegment,
} from "../../calculations/jig.ts";
import { buildJigSegmentGeometry } from "./jig-geometry.ts";
import { exportGeometryAsStl } from "./stl-export.ts";
import CameraPresetToolbar from "./CameraPresets.tsx";

const INCHES_TO_MM = 25.4;

/** Swap sideA/sideB zones to produce the back-edge variant of a segment. */
function flipSegment(seg: JigPanelSegment): JigPanelSegment {
  return {
    ...seg,
    sideAZones: seg.sideBZones,
    sideBZones: seg.sideAZones,
  };
}

function JigMesh({
  layout,
  segmentIndex,
  edge,
}: {
  layout: JigPanelLayout;
  segmentIndex: number;
  edge: "front" | "back";
}) {
  const rawSegment = layout.segments[segmentIndex];
  const geometry = useMemo(() => {
    if (!rawSegment) return null;
    const seg = edge === "back" ? flipSegment(rawSegment) : rawSegment;
    return buildJigSegmentGeometry(seg, layout.panelThickness * INCHES_TO_MM);
  }, [rawSegment, layout.panelThickness, edge]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#4fc3f7" transparent opacity={0.85} />
      <Edges threshold={15} color="#0288d1" />
    </mesh>
  );
}

export default function JigView() {
  const config = useChestStore((s) => s.config);
  const controlsRef = useRef<ComponentRef<typeof CameraControls>>(null);

  const panels = useMemo(() => computeAllJigPanelLayouts(config), [config]);

  const [panelIndex, setPanelIndex] = useState(0);
  const [edge, setEdge] = useState<"front" | "back">("front");
  const [segmentIndex, setSegmentIndex] = useState(0);

  const panel = panels[panelIndex];
  if (!panel || panel.segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        No jig data — add at least one column with drawers.
      </div>
    );
  }

  const safeSegIndex = Math.min(segmentIndex, panel.segments.length - 1);
  const segment = panel.segments[safeSegIndex];
  if (!segment) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        No segment data available.
      </div>
    );
  }
  const segHeightMm = segment.height * INCHES_TO_MM;

  const isTwoSided = panel.sideBZones.length > 0;
  const slideCount =
    panel.sideAZones.filter((z) => z.type === "gap").length +
    panel.sideBZones.filter((z) => z.type === "gap").length;

  const edgeLabel = edge === "front" ? "front" : "back";
  const fileBase = `jig-${panel.panelLabel.toLowerCase().replace(/\s+/g, "-")}-${edgeLabel}`;

  // Capture narrowed panel for use in closures (TS can't narrow across function boundaries)
  const currentPanel = panel;
  const panelThickMm = currentPanel.panelThickness * INCHES_TO_MM;

  function buildSegGeometry(seg: JigPanelSegment) {
    const effective = edge === "back" ? flipSegment(seg) : seg;
    return buildJigSegmentGeometry(effective, panelThickMm);
  }

  function handleDownloadSegment() {
    if (!segment) return;
    const geom = buildSegGeometry(segment);
    exportGeometryAsStl(geom, `${fileBase}-seg${String(safeSegIndex + 1)}.stl`);
    geom.dispose();
  }

  function handleDownloadAll() {
    for (const seg of currentPanel.segments) {
      const geom = buildSegGeometry(seg);
      exportGeometryAsStl(
        geom,
        `${fileBase}-seg${String(seg.segmentIndex + 1)}.stl`,
      );
      geom.dispose();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-3 py-2">
        {/* Panel selector */}
        {panels.length > 1 ? (
          <label className="flex items-center gap-1 text-sm text-stone-700">
            Panel
            <select
              value={panelIndex}
              onChange={(e) => {
                setPanelIndex(Number(e.target.value));
                setSegmentIndex(0);
              }}
              className="rounded border border-stone-300 px-1.5 py-0.5 text-sm"
            >
              {panels.map((p, i) => (
                <option key={p.panelIndex} value={i}>
                  {p.panelLabel}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-sm text-stone-700">{panel.panelLabel}</span>
        )}

        {/* Front / Back edge toggle */}
        <div className="flex rounded border border-stone-300 text-sm overflow-hidden">
          <button
            onClick={() => {
              setEdge("front");
            }}
            className={`px-2.5 py-0.5 ${edge === "front" ? "bg-amber-600 text-white" : "text-stone-700 hover:bg-stone-100"}`}
          >
            Front Edge
          </button>
          <button
            onClick={() => {
              setEdge("back");
            }}
            className={`px-2.5 py-0.5 ${edge === "back" ? "bg-amber-600 text-white" : "text-stone-700 hover:bg-stone-100"}`}
          >
            Back Edge
          </button>
        </div>

        {/* Segment selector */}
        {panel.segments.length > 1 && (
          <label className="flex items-center gap-1 text-sm text-stone-700">
            Segment
            <select
              value={safeSegIndex}
              onChange={(e) => {
                setSegmentIndex(Number(e.target.value));
              }}
              className="rounded border border-stone-300 px-1.5 py-0.5 text-sm"
            >
              {panel.segments.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1} of {panel.segments.length}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Download buttons */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={handleDownloadSegment}
            className="rounded bg-amber-600 px-2.5 py-0.5 text-sm text-white hover:bg-amber-700"
          >
            {panel.segments.length > 1 ? "Download Segment" : "Download STL"}
          </button>
          {panel.segments.length > 1 && (
            <button
              onClick={handleDownloadAll}
              className="rounded border border-amber-600 px-2.5 py-0.5 text-sm text-amber-700 hover:bg-amber-50"
            >
              Download All
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex gap-4 border-b border-stone-200 px-3 py-1.5 text-xs text-stone-500">
        <span>
          Panel: {(panel.panelThickness * INCHES_TO_MM).toFixed(1)}mm thick
        </span>
        <span>
          Jig height: {(panel.panelHeight * INCHES_TO_MM).toFixed(0)}mm
        </span>
        <span>
          {panel.segments.length} segment
          {panel.segments.length !== 1 ? "s" : ""}
        </span>
        <span>
          {slideCount} slide position{slideCount !== 1 ? "s" : ""}
          {isTwoSided ? " (two-sided)" : ""}
        </span>
        <span className="text-stone-400">
          Print front + back for each panel
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="relative flex-1">
        <CameraPresetToolbar
          distance={segHeightMm * 2}
          controlsRef={controlsRef}
        />
        <Canvas
          camera={{
            position: [segHeightMm * 0.7, segHeightMm * 0.5, segHeightMm],
            fov: 50,
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <JigMesh layout={panel} segmentIndex={safeSegIndex} edge={edge} />
          <Grid
            position={[0, -1, 0]}
            infiniteGrid
            fadeDistance={segHeightMm * 3}
            cellSize={10}
            sectionSize={50}
            cellColor="#d4d4d4"
            sectionColor="#a8a29e"
          />
          <CameraControls ref={controlsRef} makeDefault />
        </Canvas>
      </div>
    </div>
  );
}
