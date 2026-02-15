import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Edges, Grid } from "@react-three/drei";
import { useChestStore } from "../../store.ts";
import {
  selectCarcassDimensions,
  selectAllDrawerBoxes,
} from "../../selectors.ts";
import {
  computeCarcassPanels,
  computeDrawerGroups,
  computeSlidePanels,
  materialColor,
  type Panel3D,
} from "./three-geometry.ts";
import { COLORS } from "./svg-constants.ts";
import CameraPresetToolbar from "./CameraPresets.tsx";
import DrawerGroup from "./DrawerGroup.tsx";

function WoodPanel({ panel }: { panel: Panel3D }) {
  const edgeColor =
    panel.type === "slide" ? COLORS.slideStroke : COLORS.carcassStroke;
  return (
    <mesh position={panel.position}>
      <boxGeometry args={panel.size} />
      <meshStandardMaterial color={materialColor(panel.material)} />
      <Edges threshold={15} color={edgeColor} />
    </mesh>
  );
}

export default function ThreeView() {
  const config = useChestStore((s) => s.config);
  const controlsRef = useRef<ComponentRef<typeof CameraControls>>(null);
  const [openDrawers, setOpenDrawers] = useState<Set<string>>(new Set());

  const carcass = useMemo(() => selectCarcassDimensions(config), [config]);
  const drawerBoxes = useMemo(() => selectAllDrawerBoxes(config), [config]);
  const carcassPanels = useMemo(
    () => computeCarcassPanels(config, carcass),
    [config, carcass],
  );
  const drawerGroups = useMemo(
    () => computeDrawerGroups(config, carcass, drawerBoxes),
    [config, carcass, drawerBoxes],
  );
  const slidePanels = useMemo(
    () => computeSlidePanels(config, carcass),
    [config, carcass],
  );

  const toggleDrawer = useCallback((drawerId: string) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(drawerId)) next.delete(drawerId);
      else next.add(drawerId);
      return next;
    });
  }, []);

  const maxDim = Math.max(
    carcass.outerWidth,
    carcass.outerHeight,
    carcass.outerDepth,
  );
  const camDist = maxDim * 2;

  return (
    <div className="relative w-full h-full">
      <CameraPresetToolbar distance={camDist} controlsRef={controlsRef} />
      <Canvas
        camera={{
          position: [camDist * 0.7, camDist * 0.5, camDist],
          fov: 50,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {carcassPanels.map((p) => (
          <WoodPanel key={p.key} panel={p} />
        ))}
        {slidePanels.map((p) => (
          <WoodPanel key={p.key} panel={p} />
        ))}
        {drawerGroups.map((g) => (
          <DrawerGroup
            key={g.drawerId}
            drawerId={g.drawerId}
            panels={g.panels}
            slideLength={g.slideLength}
            isOpen={openDrawers.has(g.drawerId)}
            onToggle={toggleDrawer}
          />
        ))}
        <Grid
          position={[0, -carcass.outerHeight / 2 - 0.1, 0]}
          infiniteGrid
          fadeDistance={camDist * 2}
          cellSize={1}
          sectionSize={5}
          cellColor="#d4d4d4"
          sectionColor="#a8a29e"
        />
        <CameraControls ref={controlsRef} makeDefault />
      </Canvas>
    </div>
  );
}
