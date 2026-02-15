# 3D Visualization for Chest of Drawers Planner

## Overview

Add an interactive 3D view of the chest of drawers using React Three Fiber (R3F), accessible as a "3D" tab alongside the existing "Front" and "Side" SVG views in the Visualizer component. The 3D view will render the carcass shell, drawers, and faces as individual panel meshes using the existing calculation modules and Zustand store.

## Current State Analysis

The app has a complete 2D SVG visualizer (`Visualizer.tsx`) with:

- **Tab-based view switching** between "Front" and "Side" views (`ViewTab` type at line 16)
- **Zoom controls** (scroll wheel, buttons, fit-to-view)
- **Rich computed geometry** from selectors: `selectCarcassDimensions(config)` and `selectAllDrawerBoxes(config)`
- **Opening position algorithm** in `FrontView.tsx:120-149` (`computeOpenings`) that calculates exact (x, y) positions for each drawer opening

### Key Discoveries:

- All dimensions are in inches (or cm) — these work directly as Three.js world units
- `CarcassDimensions` provides outer/inner width, height, depth (`types.ts:92-99`)
- `DrawerBoxDimensions` provides complete drawer geometry including individual piece dimensions (`types.ts:107-125`)
- `getCarcassPieces()` (`carcass.ts:102-179`) defines exact panel dimensions (top/bottom = innerWidth x innerDepth, sides = innerDepth x verticalPanelHeight, etc.)
- The `computeOpenings()` helper already computes spatial (x, y) positions for each drawer within the carcass — this translates directly to 3D placement by adding a Z (depth) coordinate
- `WoodThickness.material` ("plywood", "hardwood", "mdf") is available for material coloring

## Desired End State

A "3D" tab in the Visualizer that renders:

1. **Carcass shell** — top, bottom, left/right sides, vertical dividers, back panel, and horizontal rails as individual 3D box meshes with wood-like coloring
2. **Drawer boxes** — each drawer rendered as 5 pieces (2 sides, front, back, bottom) plus a face panel, correctly positioned within their opening
3. **Orbit controls** — mouse drag to rotate, scroll to zoom, right-drag to pan
4. **Drawer interaction** — click a drawer to slide it open/closed with a smooth animation
5. **Camera presets** — buttons to snap to Front, Side, Top, and Isometric views

### Verification:

- `pnpm build` succeeds with no type errors
- `pnpm test` passes (existing tests unbroken)
- `pnpm lint` passes
- 3D view renders the chest matching the 2D front/side views in proportions
- Orbit controls work smoothly
- Drawers slide open when clicked

## What We're NOT Doing

- Realistic wood grain textures (flat colors based on material type are sufficient)
- Exploded view / assembly animation
- Dimension annotations in 3D (the 2D views handle this well)
- Dado groove or joinery detail rendering (panels are simple boxes)
- Gridfinity bin rendering inside drawers
- Shadow mapping or advanced lighting
- Performance optimization (instanced meshes, LOD) — not needed for this geometry count

## Implementation Approach

React Three Fiber renders a Three.js scene as React components. We'll create a `ThreeView` component that reads from the Zustand store (same as the SVG views), computes 3D positions from the existing calculation modules, and renders each panel as a `<mesh>` with `<boxGeometry>`. The `@react-three/drei` library provides ready-made `OrbitControls`, camera helpers, and other utilities.

**Coordinate system:** Three.js Y-up, with the chest centered at origin.

- X = width (left-right)
- Y = height (up-down)
- Z = depth (front-back, positive = toward viewer)

**Panel construction:** Each carcass/drawer panel becomes a `<mesh>` with a `<boxGeometry>` sized to its actual dimensions. Positions are computed from the same opening-calculation logic used in `FrontView.tsx`.

---

## Phase 1: Install Dependencies & Add 3D Tab

### Overview

Install React Three Fiber and related packages. Extend the Visualizer tab system to include a "3D" option that renders a placeholder Canvas.

### Changes Required:

#### 1. Install packages

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

#### 2. Extend ViewTab type and add tab button

**File**: `src/features/chest-of-drawers/components/visualizer/Visualizer.tsx`

Change the `ViewTab` type and add conditional rendering:

```typescript
type ViewTab = "front" | "side" | "3d";
```

Add a "3D" `TabButton` alongside "Front View" and "Side View". When `activeTab === "3d"`, render the new `ThreeView` component instead of the SVG. The 3D tab does not use the SVG zoom controls, so hide them when the 3D tab is active.

#### 3. Create ThreeView placeholder

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx` (new)

Create a basic R3F Canvas with:

- `<Canvas>` wrapping the scene
- `<OrbitControls>` from drei for mouse interaction
- Basic lighting: one `<ambientLight>` + one `<directionalLight>`
- A placeholder box mesh at origin to verify rendering works

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function ThreeView() {
  return (
    <Canvas camera={{ position: [30, 20, 40], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 15]} intensity={0.8} />
      <OrbitControls makeDefault />
      {/* placeholder */}
      <mesh>
        <boxGeometry args={[10, 10, 10]} />
        <meshStandardMaterial color="#D4A574" />
      </mesh>
    </Canvas>
  );
}
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test` — existing tests pass
- [ ] `pnpm lint` passes

#### Manual Verification:

- [ ] "3D" tab appears in the Visualizer toolbar
- [ ] Clicking it shows a 3D canvas with a brown cube
- [ ] Orbit controls work (drag to rotate, scroll to zoom)
- [ ] Switching back to Front/Side views still works

**Implementation Note**: Pause here for manual confirmation before proceeding.

---

## Phase 2: Render Carcass Shell

### Overview

Replace the placeholder cube with the actual carcass panels computed from the store. Each panel (top, bottom, sides, dividers, back, rails) becomes a positioned `<mesh>`.

### Changes Required:

#### 1. Create geometry helper

**File**: `src/features/chest-of-drawers/components/visualizer/three-geometry.ts` (new)

This module computes 3D positions and sizes for every panel from `ChestConfig` and `CarcassDimensions`. It exports a function like:

```typescript
interface Panel3D {
  key: string;
  position: [number, number, number];
  size: [number, number, number]; // [width (X), height (Y), depth (Z)]
  material: string; // "plywood" | "hardwood" | "mdf"
  type: "carcass" | "drawer" | "face";
}

export function computeCarcassPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[];
```

The function computes positions for:

- **Top panel**: centered at (0, hh - topT/2, frontZ), size (innerWidth, topT, innerDepth)
- **Bottom panel**: centered at (0, -hh + topT/2, frontZ), size (innerWidth, topT, innerDepth)
- **Left side**: centered at (-hw + sideT/2, 0, frontZ), size (sideT, panelHeight, innerDepth)
- **Right side**: centered at (hw - sideT/2, 0, frontZ), size (sideT, panelHeight, innerDepth)
- **Back panel**: centered at (0, 0, -hd + backT/2), size (outerWidth, outerHeight, backT)
- **Vertical dividers**: computed using same algorithm as `FrontView.tsx` Dividers component, translated to 3D center coordinates
- **Horizontal rails**: same approach as FrontView.tsx HorizontalRails, as thin panels at (x, y, z) with rail dimensions

Where: `hh = outerHeight/2`, `hw = outerWidth/2`, `hd = outerDepth/2`, `frontZ` centers the non-back panels in the remaining depth.

The key insight is that the 2D `computeOpenings()` gives us (x, y) in a coordinate system starting at top-left of the carcass. We transform to 3D by:

1. Offsetting x by `-outerWidth/2` (center horizontally)
2. Flipping and offsetting y by `outerHeight/2` (SVG Y-down → 3D Y-up)
3. Adding Z = centered within innerDepth

#### 2. Create Panel mesh component

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Add a `WoodPanel` component that renders a single `<mesh>`:

```tsx
function WoodPanel({ panel }: { panel: Panel3D }) {
  return (
    <mesh position={panel.position}>
      <boxGeometry args={panel.size} />
      <meshStandardMaterial color={MATERIAL_COLORS[panel.material]} />
    </mesh>
  );
}
```

Material colors:

- plywood: `#D4A574` (warm tan, matching existing `COLORS.carcassFill`)
- hardwood: `#B8860B` (darker golden brown)
- mdf: `#C4B08B` (pale neutral)

#### 3. Wire up ThreeView to store

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Read config from the Zustand store, compute carcass dimensions via selectors, generate panels via `computeCarcassPanels()`, and render them:

```tsx
export default function ThreeView() {
  const config = useChestStore((s) => s.config);
  const carcass = useMemo(() => selectCarcassDimensions(config), [config]);
  const panels = useMemo(
    () => computeCarcassPanels(config, carcass),
    [config, carcass],
  );

  return (
    <Canvas camera={{ position: [30, 20, 40], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 15]} intensity={0.8} />
      <OrbitControls makeDefault />
      {panels.map((p) => (
        <WoodPanel key={p.key} panel={p} />
      ))}
    </Canvas>
  );
}
```

#### 4. Unit tests for geometry helper

**File**: `src/features/chest-of-drawers/components/visualizer/__tests__/three-geometry.test.ts` (new)

Test `computeCarcassPanels()` with the default config:

- Correct number of panels (top, bottom, 2 sides, back = 5 minimum)
- Panel dimensions match expected values from carcass calculations
- Multi-column config produces correct number of dividers
- Horizontal rails appear when enabled
- All positions center correctly (sum of position ± half-size should equal expected edges)

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test` — new geometry tests pass, existing tests unbroken
- [ ] `pnpm lint` passes

#### Manual Verification:

- [ ] 3D view shows the carcass shell (open front, visible interior)
- [ ] Panels have correct proportions matching the 2D front/side views
- [ ] Multi-column configs show dividers
- [ ] Horizontal rails appear when enabled in config
- [ ] Orbiting shows depth correctly (back panel visible from behind)

**Implementation Note**: Pause here for manual confirmation before proceeding.

---

## Phase 3: Render Drawers

### Overview

Add drawer boxes and faces positioned within their carcass openings. Each drawer is a group of 5 box meshes (2 sides, front, back, bottom) plus a face panel.

### Changes Required:

#### 1. Extend geometry helper with drawer computation

**File**: `src/features/chest-of-drawers/components/visualizer/three-geometry.ts`

Add a function:

```typescript
export function computeDrawerPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): Panel3D[];
```

For each drawer opening (using the same iteration as `computeOpenings()`):

1. Find the matching `DrawerBoxDimensions` by columnId/rowId
2. Compute the opening's 3D center position (same x,y transform as carcass, z centered in inner depth)
3. Position the drawer box pieces relative to the opening center:
   - **Left side**: offset left by boxOuterWidth/2 - sideThickness/2
   - **Right side**: offset right by boxOuterWidth/2 - sideThickness/2
   - **Front**: offset forward by boxOuterDepth/2 - frontBackThickness/2
   - **Back**: offset backward by boxOuterDepth/2 - frontBackThickness/2
   - **Bottom**: at bottom of box
4. Position the **face** at the front plane of the carcass, centered in the opening

The face panel should be slightly in front of the carcass front edge (at z = outerDepth/2 or just past it for overlay style).

#### 2. Add drawer panels to ThreeView

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Compute drawer panels alongside carcass panels and render them with slightly different coloring:

- Drawer box pieces: lighter wood color (`#E8D5B7`, matching `COLORS.boxFill`)
- Face: medium wood tone (`#C4956A`, matching `COLORS.faceFill`)

#### 3. Unit tests for drawer geometry

**File**: `src/features/chest-of-drawers/components/visualizer/__tests__/three-geometry.test.ts`

Extend tests:

- Correct number of drawer panels (5 pieces + 1 face per drawer opening)
- Drawer box dimensions match `DrawerBoxDimensions` values
- Faces are positioned at the front of the carcass
- Multi-column, multi-row configs produce correct panel count

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` passes

#### Manual Verification:

- [ ] Drawers are visible inside the carcass when orbiting
- [ ] Drawer faces are visible from the front, covering their openings
- [ ] Changing config (add/remove rows, columns, change dimensions) updates the 3D view reactively
- [ ] Overlay vs inset drawer faces show different sizing

**Implementation Note**: Pause here for manual confirmation before proceeding.

---

## Phase 4: Camera Presets & Polish

### Overview

Add camera preset buttons (Front, Side, Top, Isometric) and visual polish (edge highlighting, grid floor).

### Changes Required:

#### 1. Camera preset buttons

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Add a toolbar overlay (positioned absolute over the Canvas) with buttons that animate the camera to preset positions using drei's `useCamera` or by driving OrbitControls:

- **Front**: camera at (0, 0, distance), looking at origin
- **Side**: camera at (distance, 0, 0), looking at origin
- **Top**: camera at (0, distance, 0), looking at origin
- **Isometric**: camera at (distance, distance\*0.7, distance), looking at origin

Where `distance` is computed from carcass dimensions to frame the model (e.g., `Math.max(outerWidth, outerHeight, outerDepth) * 2`).

Use `OrbitControls`'s ref to call `controls.reset()` or set target/position programmatically. Drei also provides `<CameraControls>` which has a `setLookAt` method with built-in easing.

#### 2. Edge outlines

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Add `<Edges>` from drei to each `WoodPanel` mesh to give panels visible outlines (similar to the SVG stroke). This makes panels visually distinct even when adjacent:

```tsx
<mesh position={panel.position}>
  <boxGeometry args={panel.size} />
  <meshStandardMaterial color={color} />
  <Edges threshold={15} color="#8B6914" />
</mesh>
```

#### 3. Ground reference

Add a subtle `<Grid>` from drei below the chest for spatial grounding:

```tsx
<Grid
  position={[0, -outerHeight / 2 - 0.1, 0]}
  args={[100, 100]}
  cellSize={1}
  infiniteGrid
  fadeDistance={50}
/>
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes

#### Manual Verification:

- [ ] Camera preset buttons appear in 3D view toolbar
- [ ] Clicking "Front" shows the same view as the SVG front view
- [ ] Clicking "Side" shows the same view as the SVG side view
- [ ] Panel edges are visible, giving clear separation between adjacent panels
- [ ] Grid floor provides spatial context

**Implementation Note**: Pause here for manual confirmation before proceeding.

---

## Phase 5: Drawer Slide Interaction

### Overview

Add click-to-open interaction so users can click a drawer face to slide it open, revealing the interior. This is the final "wow factor" feature.

### Changes Required:

#### 1. Track open/closed state

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Add local state (not in Zustand — this is view-only state) tracking which drawers are open:

```typescript
const [openDrawers, setOpenDrawers] = useState<Set<string>>(new Set());

function toggleDrawer(drawerId: string) {
  setOpenDrawers((prev) => {
    const next = new Set(prev);
    if (next.has(drawerId)) next.delete(drawerId);
    else next.add(drawerId);
    return next;
  });
}
```

#### 2. Create DrawerGroup component

**File**: `src/features/chest-of-drawers/components/visualizer/ThreeView.tsx`

Instead of rendering drawer panels as flat `WoodPanel`s, group each drawer's pieces (box + face) into a `<group>` that can be translated along Z to simulate sliding open:

```tsx
function DrawerGroup({
  panels,   // the 5 box panels + 1 face for this drawer
  isOpen,
  onToggle,
  slideLength,
}: { ... }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const targetZ = isOpen ? slideLength * 0.75 : 0;
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetZ,
      0.1,
    );
  });

  return (
    <group ref={groupRef} onClick={onToggle}>
      {panels.map((p) => <WoodPanel key={p.key} panel={p} />)}
    </group>
  );
}
```

The drawer slides forward along +Z by 75% of the slide length, using `lerp` for smooth animation.

#### 3. Hover cursor

Add `onPointerOver` / `onPointerOut` to drawer groups to change cursor to pointer, signaling clickability.

#### 4. Extend geometry helper to group by drawer

**File**: `src/features/chest-of-drawers/components/visualizer/three-geometry.ts`

Instead of returning a flat `Panel3D[]` for drawers, return grouped data:

```typescript
interface DrawerGroup3D {
  drawerId: string; // "columnId-rowId"
  panels: Panel3D[];
}

export function computeDrawerGroups(
  config: ChestConfig,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): DrawerGroup3D[];
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes

#### Manual Verification:

- [ ] Clicking a drawer face slides it open smoothly
- [ ] Clicking again slides it closed
- [ ] Multiple drawers can be open simultaneously
- [ ] Cursor changes to pointer when hovering over a drawer
- [ ] Animation is smooth (~60fps)

---

## Testing Strategy

### Unit Tests:

- `three-geometry.test.ts` — Pure functions computing positions/sizes from config data
  - Default config produces correct panel count and dimensions
  - Multi-column produces correct divider count
  - Horizontal rails appear/disappear based on config
  - Drawer groups are correctly structured
  - Panel positions center the chest at origin
  - Edge coordinates (position ± size/2) align correctly at carcass boundaries

### Manual Testing Steps:

1. Create a default chest (1 column, 3 rows) — verify 3D matches 2D proportions
2. Add columns and rows — verify dividers and rails appear
3. Change wood thicknesses — verify panel sizes update
4. Switch drawer style (overlay/inset) — verify face sizing changes
5. Enable horizontal rails — verify they appear between rows
6. Orbit/zoom/pan — verify controls are smooth
7. Click drawers to open — verify slide animation
8. Use camera presets — verify they frame the model correctly

## Performance Considerations

The geometry count is very small for Three.js:

- A 4-column × 6-row chest = ~150 meshes total (24 drawer boxes × 6 panels + carcass panels)
- No performance concerns at this scale
- If needed later, could use `<instancedMesh>` for panels sharing identical geometry

## Dependencies

| Package              | Version         | Purpose                                             |
| -------------------- | --------------- | --------------------------------------------------- |
| `three`              | ^0.174          | 3D rendering engine                                 |
| `@react-three/fiber` | ^9              | React renderer for Three.js                         |
| `@react-three/drei`  | ^10             | R3F utility components (OrbitControls, Edges, Grid) |
| `@types/three`       | (matches three) | TypeScript types                                    |

## References

- Existing visualizer: `src/features/chest-of-drawers/components/visualizer/Visualizer.tsx`
- Opening position algorithm: `src/features/chest-of-drawers/components/visualizer/FrontView.tsx:120-149`
- Carcass panel definitions: `src/features/chest-of-drawers/calculations/carcass.ts:102-179`
- Drawer piece definitions: `src/features/chest-of-drawers/calculations/drawer.ts:258-307`
- Type definitions: `src/features/chest-of-drawers/types.ts`
