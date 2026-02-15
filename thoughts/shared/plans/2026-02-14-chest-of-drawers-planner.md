# Chest of Drawers Planner - Implementation Plan

## Overview

Build an interactive chest of drawers planner module within the existing Woodworking Planner app. Users configure a frameless (European-style) chest of drawers by specifying dimensions, materials, construction methods, and drawer layout. The tool generates a live SVG visualization (front + side views) with measurements, detailed dimensional plans with tolerances, and an optimized cutlist using 2D guillotine bin packing on user-specified stock sheets.

## Current State Analysis

- Fresh Vite + React 19 + TypeScript scaffold with Tailwind CSS v4, React Router v7, Vitest
- No state management library, no UI component library
- Minimal routing: `RootLayout` with a single `Home` page
- All tooling in place: ESLint (strict), Prettier, Husky pre-commit hooks, testing-library

### Key Files:

- `src/App.tsx:7-11` - Route configuration
- `src/layouts/RootLayout.tsx` - Shell layout with nav header
- `src/pages/Home.tsx` - Placeholder home page
- `src/index.css` - Just `@import "tailwindcss"`

## Desired End State

A fully functional `/chest-of-drawers` route where a user can:

1. Configure a chest of drawers (units, dimensions, columns, rows, materials, construction, slides)
2. See a live-updating SVG visualization with dimension annotations and constraint warnings
3. Generate detailed per-component plans with all tolerances applied
4. Generate an optimized cutlist with visual cut diagrams showing piece placement on stock sheets

**Verification**: Navigate to `/chest-of-drawers`, configure a 2-column, 4-row chest with mixed row heights, switch between construction methods and see dimensions update, export a cutlist with optimized sheet layouts.

## What We're NOT Doing

- 3D rendering (2D orthographic SVG views only)
- Face frame construction (frameless carcass only)
- Dovetail, finger joint, or pocket hole joinery for drawer boxes
- Hardware beyond standard side-mount drawer slides
- Server-side storage (localStorage only via Zustand persist)
- Print-optimized layouts
- Multiple planner types (chest of drawers only for now)
- Drag-and-drop visual editing of the chest

## New Dependencies

- **zustand** - Lightweight state management with persist middleware for localStorage save/load

No other new dependencies. SVG rendering is native React, bin packing is implemented from scratch, fraction display is a utility we write.

---

## Phase 1: Data Model, Constants & Calculation Engine

### Overview

Define all TypeScript types, woodworking constants, and pure calculation functions. This is the foundation — everything else builds on it. All calculation functions are pure (no React, no state) and thoroughly unit-tested.

### Changes Required:

#### 1. Type Definitions

**File**: `src/features/chest-of-drawers/types.ts`

Core types:

```typescript
export type Unit = "inches" | "cm";

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export type DrawerStyle = "overlay" | "inset";

export type DrawerBoxConstruction =
  | "dado" // Bottom panel captured in dadoes on all 4 sides
  | "butt-through-sides" // Screws through side faces into bottom edges
  | "butt-through-bottom"; // Screws through bottom face into side bottom edges

export interface WoodThickness {
  id: string;
  nominal: string; // Display: "3/4\" plywood"
  actual: number; // Actual inches: 0.71875
  material: string; // "plywood" | "hardwood" | "mdf" | "custom"
}

export interface SlideSpec {
  length: number; // Slide length in current units
  clearancePerSide: number; // Per-side horizontal clearance (default 0.5")
  minMountingHeight: number; // Minimum vertical space needed (default 1.75")
}

export interface HorizontalRailConfig {
  enabled: boolean;
  thickness: WoodThickness;
  width: number; // Front-to-back dimension
}

// Simplified wood assignments (default mode)
export interface WoodAssignments {
  carcassTopBottom: WoodThickness;
  carcassSides: WoodThickness;
  carcassDividers: WoodThickness;
  carcassBack: WoodThickness;
  horizontalRails: WoodThickness;
  drawerSides: WoodThickness;
  drawerFrontBack: WoodThickness;
  drawerBottom: WoodThickness;
  drawerFace: WoodThickness;
}

// Per-drawer overrides (advanced mode)
export interface DrawerWoodOverride {
  sides?: WoodThickness;
  frontBack?: WoodThickness;
  bottom?: WoodThickness;
  face?: WoodThickness;
}

export interface DrawerRow {
  id: string;
  openingHeight: number; // The vertical opening for this row
  construction: DrawerBoxConstruction;
  woodOverride?: DrawerWoodOverride; // Only in advanced mode
}

export interface Column {
  id: string;
  openingWidth: number; // The horizontal opening for this column
  rows: DrawerRow[];
}

export interface ChestConfig {
  name: string;
  unit: Unit;
  constraints?: Dimensions; // Optional max dimensions for warnings
  columns: Column[];
  drawerStyle: DrawerStyle;
  defaultConstruction: DrawerBoxConstruction;
  defaultRowHeight: number;
  woodAssignments: WoodAssignments;
  advancedWoodMode: boolean;
  slideSpec: SlideSpec;
  horizontalRails: HorizontalRailConfig;
  kerfWidth: number; // Default 0.125" (1/8")
  dadoGrooveDepth: number; // Default 0.25" (1/4")
  dadoGrooveOffset: number; // Distance from bottom of side to bottom of groove, default 0.375"
  overlayOverlap: number; // How much face overlaps carcass per side, default 0.375"
  insetRevealGap: number; // Gap per side for inset faces, default 0.0625" (1/16")
  drawerVerticalClearance: number; // Total top+bottom clearance in opening, default 0.75"
  drawerBackClearance: number; // Space behind drawer in carcass, default 0.5"
}

// --- Calculated/output types ---

export interface CarcassDimensions {
  outerWidth: number;
  outerHeight: number;
  outerDepth: number;
  innerWidth: number; // Total interior width (excluding sides)
  innerDepth: number; // Interior depth (excluding back panel)
  constraintViolations: ConstraintViolation[];
}

export interface ConstraintViolation {
  dimension: "width" | "height" | "depth";
  actual: number;
  max: number;
}

export interface DrawerBoxDimensions {
  rowId: string;
  columnId: string;
  boxOuterWidth: number;
  boxOuterHeight: number;
  boxOuterDepth: number;
  usableInteriorWidth: number;
  usableInteriorHeight: number;
  usableInteriorDepth: number;
  // Individual piece dimensions
  sideLength: number; // Depth of side piece
  sideHeight: number;
  frontBackLength: number; // Width of front/back piece
  frontBackHeight: number;
  bottomWidth: number;
  bottomDepth: number;
  faceWidth: number;
  faceHeight: number;
  // Warnings
  warnings: DrawerWarning[];
}

export interface DrawerWarning {
  type: "slide-height" | "slide-length" | "negative-dimension";
  message: string;
}

// For cutlist
export interface CutPiece {
  id: string;
  label: string; // e.g., "Carcass Top", "Drawer 1-2 Left Side"
  width: number;
  height: number;
  thickness: WoodThickness;
  quantity: number;
}

export interface StockSheet {
  id: string;
  label: string; // e.g., "4' x 8'"
  width: number;
  height: number;
  thickness: WoodThickness;
}

export interface PlacedPiece {
  piece: CutPiece;
  x: number;
  y: number;
  rotated: boolean; // Whether piece was rotated 90 degrees to fit
}

export interface SheetLayout {
  sheet: StockSheet;
  placements: PlacedPiece[];
  wastePercentage: number;
  usedArea: number;
  totalArea: number;
}
```

#### 2. Constants

**File**: `src/features/chest-of-drawers/constants.ts`

```typescript
// Nominal wood thicknesses with actual dimensions (in inches)
export const WOOD_THICKNESSES: WoodThickness[] = [
  // Plywood (undersized)
  { id: "ply-1/4", nominal: '1/4" plywood', actual: 0.25, material: "plywood" },
  {
    id: "ply-1/2",
    nominal: '1/2" plywood',
    actual: 0.46875,
    material: "plywood",
  }, // 15/32"
  {
    id: "ply-3/4",
    nominal: '3/4" plywood',
    actual: 0.71875,
    material: "plywood",
  }, // 23/32"
  // Baltic Birch (metric-based)
  {
    id: "bb-1/4",
    nominal: '1/4" Baltic birch',
    actual: 0.236,
    material: "plywood",
  }, // 6mm
  {
    id: "bb-1/2",
    nominal: '1/2" Baltic birch',
    actual: 0.472,
    material: "plywood",
  }, // 12mm
  {
    id: "bb-3/4",
    nominal: '3/4" Baltic birch',
    actual: 0.709,
    material: "plywood",
  }, // 18mm
  // Hardwood (surfaced S2S)
  {
    id: "hw-1/4",
    nominal: '1/4" hardwood',
    actual: 0.25,
    material: "hardwood",
  },
  { id: "hw-1/2", nominal: '1/2" hardwood', actual: 0.5, material: "hardwood" },
  {
    id: "hw-3/4",
    nominal: '3/4" hardwood (4/4 S2S)',
    actual: 0.75,
    material: "hardwood",
  },
  {
    id: "hw-1",
    nominal: '1" hardwood (5/4 S2S)',
    actual: 1.0625,
    material: "hardwood",
  }, // 1-1/16"
  // MDF
  { id: "mdf-1/4", nominal: '1/4" MDF', actual: 0.25, material: "mdf" },
  { id: "mdf-1/2", nominal: '1/2" MDF', actual: 0.5, material: "mdf" },
  { id: "mdf-3/4", nominal: '3/4" MDF', actual: 0.75, material: "mdf" },
];

// Standard slide lengths (inches)
export const STANDARD_SLIDE_LENGTHS = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

// Default tolerances (inches)
export const DEFAULTS = {
  slideClearancePerSide: 0.5,
  slideMinMountingHeight: 1.75,
  dadoGrooveDepth: 0.25,
  dadoGrooveOffset: 0.375, // Bottom of groove to bottom of side
  overlayOverlap: 0.375,
  insetRevealGap: 0.0625, // 1/16"
  drawerVerticalClearance: 0.75, // Total top + bottom
  drawerBackClearance: 0.5,
  kerfWidth: 0.125, // 1/8"
  horizontalRailWidth: 3, // Front-to-back, 3" default
};

// Horizontal rail recommendation thresholds (inches)
export const RAIL_THRESHOLDS = {
  width: 36,
  height: 48,
  maxRowsBeforeRecommend: 5,
};

// Standard stock sheets (inches)
export const STOCK_SHEETS = [
  { label: "4' x 8'", width: 48, height: 96 },
  { label: "4' x 4'", width: 48, height: 48 },
  { label: "2' x 4'", width: 24, height: 48 },
  { label: "2' x 2'", width: 24, height: 24 },
];

// Conversion factor
export const INCHES_TO_CM = 2.54;
```

#### 3. Unit Conversion

**File**: `src/features/chest-of-drawers/calculations/units.ts`

Functions:

- `toCm(inches: number): number`
- `toInches(cm: number): number`
- `convert(value: number, from: Unit, to: Unit): number`
- `formatDimension(value: number, unit: Unit): string` - formats with appropriate precision and fractional display for inches (e.g., `23/32"`, `3-1/2"`)
- `decimalToFraction(decimal: number, maxDenominator?: number): string` - converts decimal inches to nearest fraction (32nds precision)

#### 4. Carcass Calculations

**File**: `src/features/chest-of-drawers/calculations/carcass.ts`

Functions:

- `calculateCarcassDimensions(config: ChestConfig): CarcassDimensions`
  - Outer width = left side thickness + sum(column opening widths) + (numColumns - 1) \* divider thickness + right side thickness
  - Outer height = top thickness + sum(max row heights per column, including rails if enabled) + bottom thickness
    - Note: each column may have different numbers of rows; the tallest column drives the carcass height, and shorter columns get extra space at the top or evenly distributed
    - Actually: all columns must have the same total interior height (they share the same carcass). The total interior height = max of (sum of row heights + rails for each column). Shorter columns pad remaining space.
    - **Revised**: The carcass inner height is determined by the tallest column's total. Other columns warn if they don't fill the space (user should adjust).
  - Outer depth = interior depth + back panel thickness
  - Interior depth = slide length + drawer back clearance
  - Check constraints and populate violations

- `checkConstraintViolations(outer: Dimensions, constraints: Dimensions | undefined): ConstraintViolation[]`

- `shouldRecommendHorizontalRails(config: ChestConfig): boolean`
  - Returns true if outer width > 36" OR outer height > 48" OR any column has > 5 rows

- `getCarcassPieces(config: ChestConfig, carcass: CarcassDimensions): CutPiece[]`
  - Returns cut pieces for: top, bottom, left side, right side, vertical dividers, back panel, horizontal rails

#### 5. Drawer Box Calculations

**File**: `src/features/chest-of-drawers/calculations/drawer.ts`

Functions:

- `calculateDrawerBox(row: DrawerRow, column: Column, config: ChestConfig): DrawerBoxDimensions`

  **Common to all methods:**
  - Box outer width = column opening width - 2 \* slide clearance per side
  - Box outer depth = slide length (or available depth if shorter)
  - Face dimensions depend on overlay/inset (see below)

  **Dado construction:**
  - Side height = opening height - vertical clearance
  - Box outer height = side height
  - Front/back height = side height (all 4 sides get dadoes, bottom captured)
  - Bottom width = (box outer width - 2 _ side thickness) + 2 _ dado groove depth
  - Bottom depth = (box outer depth - front thickness - back thickness) + 2 \* dado groove depth
  - Usable interior height = side height - dado groove offset - bottom panel thickness
  - Usable interior width = box outer width - 2 \* side thickness

  **Butt through sides:**
  - Side height = opening height - vertical clearance
  - Box outer height = side height
  - Front/back height = side height
  - Bottom width = box outer width - 2 \* side thickness (bottom sits between sides)
  - Bottom depth = box outer depth
  - Usable interior height = side height - bottom panel thickness
  - Usable interior width = box outer width - 2 \* side thickness

  **Butt through bottom:**
  - Side height = opening height - vertical clearance - bottom panel thickness (sides sit ON the bottom)
  - Box outer height = side height + bottom panel thickness
  - Front/back height = side height
  - Bottom width = box outer width (bottom extends full width, sides sit on top)
  - Bottom depth = box outer depth
  - Usable interior height = side height (full)
  - Usable interior width = box outer width - 2 \* side thickness

  **Warnings:**
  - If opening height < slide min mounting height → "slide-height" warning
  - If box outer depth > slide length → "slide-length" warning (recommend longer slide)
  - If any calculated dimension ≤ 0 → "negative-dimension" warning

- `calculateFaceDimensions(row: DrawerRow, column: Column, rowIndex: number, columnIndex: number, config: ChestConfig): { width: number; height: number }`

  **Overlay:**
  - Face width:
    - Leftmost column: opening width + side thickness + divider thickness/2 - reveal/2
    - Middle column: opening width + divider thickness (half from each neighbor) - reveal
    - Rightmost column: opening width + side thickness + divider thickness/2 - reveal/2
    - Single column: opening width + 2 \* side thickness - reveal
  - Face height: similar logic for top/bottom rows accounting for top/bottom carcass thickness and horizontal rails
  - Small reveal gap (1/16") between adjacent faces

  **Inset:**
  - Face width = opening width - 2 \* inset reveal gap
  - Face height = opening height - 2 \* inset reveal gap (or accounting for rails if present)

- `getDrawerPieces(box: DrawerBoxDimensions, row: DrawerRow, column: Column, config: ChestConfig): CutPiece[]`
  - Returns cut pieces for: 2 sides, 1 front, 1 back, 1 bottom, 1 face

#### 6. Slide Recommendation

**File**: `src/features/chest-of-drawers/calculations/slides.ts`

Functions:

- `recommendSlideLength(availableDepth: number): number`
  - Returns the largest standard slide length that fits within `availableDepth - 1"` (leaving room for face + back clearance)
  - Falls back to smallest standard length if none fit, with a warning

- `getAvailableSlideLengths(): number[]` - returns STANDARD_SLIDE_LENGTHS

#### 7. Barrel Export / Index

**File**: `src/features/chest-of-drawers/calculations/index.ts`

Re-exports all calculation functions for clean imports.

### Tests:

**File**: `src/features/chest-of-drawers/calculations/__tests__/units.test.ts`

- Conversion accuracy (inches ↔ cm)
- Fraction display (0.71875 → "23/32", 3.5 → "3-1/2", 0.125 → "1/8")
- Edge cases (0, very small values, whole numbers)

**File**: `src/features/chest-of-drawers/calculations/__tests__/carcass.test.ts`

- Single column carcass dimensions
- Multi-column with dividers
- Constraint violation detection
- Horizontal rail recommendation logic
- Carcass piece generation (correct count and dimensions)

**File**: `src/features/chest-of-drawers/calculations/__tests__/drawer.test.ts`

- All three construction methods produce correct dimensions
- Usable interior height differs correctly between methods
- Overlay face dimensions for edge/middle/single columns
- Inset face dimensions
- Warning generation (slide height, negative dimensions)
- Drawer piece generation

**File**: `src/features/chest-of-drawers/calculations/__tests__/slides.test.ts`

- Recommends correct slide length for various depths
- Handles edge cases (very shallow, very deep)

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] All calculation tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:

- [ ] Spot-check a few calculation results by hand against known woodworking math

---

## Phase 2: State Management & Persistence

### Overview

Set up Zustand store with the full chest configuration, computed selectors for derived dimensions, and persist middleware for localStorage save/load of named configurations.

### Changes Required:

#### 1. Install Zustand

```bash
npm install zustand
```

#### 2. Zustand Store

**File**: `src/features/chest-of-drawers/store.ts`

```typescript
interface ChestStore {
  // Current configuration
  config: ChestConfig;

  // Saved configurations
  savedConfigs: Record<string, ChestConfig>; // name → config

  // Actions: top-level
  setUnit: (unit: Unit) => void;
  setConstraints: (constraints: Dimensions | undefined) => void;
  setDrawerStyle: (style: DrawerStyle) => void;
  setDefaultConstruction: (method: DrawerBoxConstruction) => void;
  setKerfWidth: (kerf: number) => void;
  setAdvancedWoodMode: (advanced: boolean) => void;

  // Actions: columns & rows
  setColumnCount: (count: number) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  setAllColumnWidths: (width: number) => void;
  setRowCount: (columnId: string, count: number) => void;
  setRowHeight: (columnId: string, rowId: string, height: number) => void;
  setAllRowHeights: (height: number) => void; // Apply to all rows in all columns
  setRowConstruction: (
    columnId: string,
    rowId: string,
    method: DrawerBoxConstruction,
  ) => void;

  // Actions: wood
  setWoodAssignment: (
    key: keyof WoodAssignments,
    thickness: WoodThickness,
  ) => void;
  setDrawerWoodOverride: (
    columnId: string,
    rowId: string,
    override: DrawerWoodOverride,
  ) => void;

  // Actions: slides
  setSlideLength: (length: number) => void;
  setSlideClearance: (clearance: number) => void;

  // Actions: rails
  setHorizontalRailsEnabled: (enabled: boolean) => void;
  setHorizontalRailThickness: (thickness: WoodThickness) => void;

  // Actions: save/load
  saveConfig: (name: string) => void;
  loadConfig: (name: string) => void;
  deleteConfig: (name: string) => void;
  exportConfig: () => string; // Returns JSON string
  importConfig: (json: string) => void; // Parses and loads

  // Actions: reset
  resetToDefaults: () => void;
}
```

Use Zustand `persist` middleware targeting `localStorage` with key `"chest-of-drawers-store"`.

Provide a `createDefaultConfig(): ChestConfig` function that returns sensible defaults:

- Unit: inches
- 1 column, 3 rows, each 6" opening height
- 14" column opening width
- 3/4" plywood for carcass, 1/2" plywood for drawer components, 1/4" plywood for back and drawer bottoms
- Overlay style, dado construction
- 18" slides (will be adjusted by recommendation)
- Horizontal rails disabled
- 1/8" kerf

#### 3. Computed Selectors

**File**: `src/features/chest-of-drawers/selectors.ts`

These are standalone selector functions (not in the store) that compute derived state:

```typescript
export function selectCarcassDimensions(config: ChestConfig): CarcassDimensions;
export function selectAllDrawerBoxes(
  config: ChestConfig,
): DrawerBoxDimensions[];
export function selectAllCutPieces(config: ChestConfig): CutPiece[];
export function selectRecommendRails(config: ChestConfig): boolean;
export function selectRecommendedSlideLength(config: ChestConfig): number;
```

These call into the Phase 1 calculation functions and can be used by components via `useChestStore(state => selectCarcassDimensions(state.config))`.

### Tests:

**File**: `src/features/chest-of-drawers/__tests__/store.test.ts`

- Default config is valid
- Actions correctly mutate state
- Save/load round-trips correctly
- Export/import produces valid JSON

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] Store tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:

- [ ] Open browser devtools → Application → localStorage, verify store persists after page reload

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Configuration UI

### Overview

Build the configuration panel — a scrollable form with collapsible sections that binds to the Zustand store. Changes update the store immediately (live-updating). Also wire up the route and page layout.

### Changes Required:

#### 1. Route & Page

**File**: `src/App.tsx`

- Add route: `<Route path="chest-of-drawers" element={<ChestOfDrawersPlanner />} />`

**File**: `src/pages/Home.tsx`

- Add a link card to `/chest-of-drawers`

**File**: `src/pages/ChestOfDrawersPlanner.tsx`

- Two-panel layout:
  - Left: `ConfigPanel` (scrollable, ~400px width on desktop)
  - Right: `Visualizer` (fills remaining space, sticky/scrollable)
  - Below (or tabbed): Plans and CutList sections
- On mobile: stacks vertically (config → visualizer → plans → cutlist)

#### 2. Config Panel Components

**Directory**: `src/features/chest-of-drawers/components/config/`

Each component reads from and writes to the Zustand store directly.

**`ConfigPanel.tsx`** - Orchestrates all config sections in collapsible panels

**`UnitSelector.tsx`** - Toggle between inches and cm. When switching, convert all current values.

**`DimensionConstraints.tsx`** - Optional H × W × D inputs. Toggle to enable/disable. Shows current calculated dimensions alongside for comparison.

**`ColumnRowConfig.tsx`** - Number of columns (1-6 stepper). Per-column: number of rows (1-10 stepper), column opening width. "Apply width to all columns" button.

**`DrawerHeightConfig.tsx`** - Per-row height inputs, organized by column. "Set all to:" input with "Apply" button for quick universal height. Visual mini-preview showing row proportions.

**`DrawerStyleConfig.tsx`** - Radio: overlay vs inset. Brief description of each shown below selection.

**`ConstructionMethodConfig.tsx`** - Radio: dado / butt-through-sides / butt-through-bottom. Brief diagram or description of each. This sets the default; in advanced mode, per-drawer overrides are available.

**`WoodThicknessConfig.tsx`**

- **Simple mode** (default): grouped assignment:
  - "Carcass" → one thickness for top/bottom/sides/dividers
  - "Drawer box" → one thickness for sides/front/back
  - "Panels" → one thickness for back panel + drawer bottoms
  - "Drawer faces" → one thickness
- **Advanced mode** (toggle): per-piece assignment matching all `WoodAssignments` keys, plus per-drawer overrides
- Each selector shows nominal name + actual dimension
- Dropdown with all `WOOD_THICKNESSES` presets + "Custom" option for entering arbitrary dimensions

**`SlideConfig.tsx`** - Slide length selector (dropdown of standard lengths). Shows recommended length with a badge. Clearance per side (numeric input, default 0.5"). Warning if any drawer opening height < minimum slide mounting height.

**`HorizontalRailConfig.tsx`** - Toggle on/off. If off but recommended, show an info banner: "Horizontal rails recommended for chests wider than 36" or taller than 48"". When enabled: rail thickness selector, rail width (front-to-back) input.

**`SaveLoadPanel.tsx`** - Save current config with name. List saved configs with load/delete buttons. Export as JSON file download. Import from JSON file upload.

#### 3. Shared UI Helpers

**File**: `src/features/chest-of-drawers/components/ui/CollapsibleSection.tsx`

- Tailwind-styled collapsible section with chevron toggle

**File**: `src/features/chest-of-drawers/components/ui/NumberInput.tsx`

- Numeric input with optional min/max, step, unit suffix display
- Handles fractional input for inches (user can type "3/4" and it converts to 0.75)

**File**: `src/features/chest-of-drawers/components/ui/Select.tsx`

- Styled select dropdown wrapper

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Existing tests still pass: `npm run test`

#### Manual Verification:

- [ ] All config sections render and are interactive
- [ ] Changing units converts all values
- [ ] Column/row add/remove works correctly
- [ ] "Apply to all" buttons work for widths and heights
- [ ] Simple → advanced wood mode shows additional controls
- [ ] Save/load/export/import all function correctly
- [ ] Responsive layout works on mobile

**Implementation Note**: After completing this phase, pause for manual testing before proceeding to visualization.

---

## Phase 4: SVG Visualization

### Overview

Live-updating SVG drawings of the chest: front view (showing all drawer faces, carcass edges, and dimension lines) and side/depth view (showing carcass depth, slide length, drawer boxes in profile). Constraint violations highlighted in red.

### Changes Required:

#### 1. Visualization Container

**File**: `src/features/chest-of-drawers/components/visualizer/Visualizer.tsx`

- Tab toggle: "Front View" | "Side View" (or show both stacked if space permits)
- SVG viewBox scaled to fit the chest dimensions with padding for dimension lines
- Zoom controls (scale buttons or scroll-to-zoom)

#### 2. SVG Primitives

**File**: `src/features/chest-of-drawers/components/visualizer/DimensionLine.tsx`

- Reusable SVG component: draws a dimension line between two points
- Horizontal or vertical orientation
- Extension lines, arrows/ticks at endpoints, centered label
- Props: `x1, y1, x2, y2, label, offset` (offset pushes the line away from the object for readability)

**File**: `src/features/chest-of-drawers/components/visualizer/WarningIndicator.tsx`

- Red highlight overlay or hatching pattern for constraint-violated dimensions
- Warning icon SVG for inline warnings

#### 3. Front View

**File**: `src/features/chest-of-drawers/components/visualizer/FrontView.tsx`

Draws (from back to front layer):

1. **Carcass outline** — outer rectangle (thick stroke)
2. **Interior structure** — vertical dividers, horizontal rails (if enabled)
3. **Drawer openings** — rectangles for each opening
4. **Drawer faces** — rectangles for each face (overlay extends beyond openings, inset sits within). Slightly different fill/stroke to distinguish from openings.
5. **Dimension lines**:
   - Overall width (top)
   - Overall height (right side)
   - Per-column opening widths (bottom, inside carcass)
   - Per-row opening heights (left side, per column)
   - Material thicknesses annotated (sides, top, bottom, dividers)
6. **Constraint violation highlights** — red dashed outline on overall dimension lines that exceed constraints
7. **Slide height warnings** — yellow warning icon on rows where opening height < slide minimum

Color scheme:

- Carcass: light wood fill (#D4A574), dark stroke
- Drawer faces: slightly different wood fill (#C4956A), dark stroke
- Dimension lines: gray (#666)
- Violations: red (#DC2626)
- Warnings: amber (#D97706)

#### 4. Side View

**File**: `src/features/chest-of-drawers/components/visualizer/SideView.tsx`

Draws a cross-section from the side showing:

1. **Carcass profile** — outer rectangle (top, bottom, back panel visible)
2. **One drawer box** in profile (representative, showing):
   - Drawer face (front)
   - Drawer box front
   - Drawer box side (visible as the depth)
   - Drawer box bottom (showing construction method — dado groove visible, or butt joint line)
   - Drawer box back
   - Slide (simplified rectangle along the bottom of the opening)
   - Back clearance space
   - Back panel
3. **Dimension lines**:
   - Overall depth (top)
   - Interior depth (inside carcass)
   - Slide length
   - Drawer box depth
   - Face thickness
   - Back panel thickness
   - Back clearance

#### 5. Integration

**File**: `src/pages/ChestOfDrawersPlanner.tsx` (update)

- Wire `Visualizer` into the right panel, passing config from store

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`

#### Manual Verification:

- [ ] Front view accurately represents a configured chest with correct proportions
- [ ] Side view shows depth cross-section with all components
- [ ] Dimension lines are readable and correctly positioned
- [ ] Adding/removing columns and rows updates the visualization in real-time
- [ ] Overlay vs inset shows visible difference in face sizing
- [ ] Constraint violations show red highlighting
- [ ] Slide height warnings appear on undersized rows
- [ ] Visualization scales correctly in the viewport

**Implementation Note**: After completing this phase, pause for manual review of visual accuracy.

---

## Phase 5: Plans Output

### Overview

Generate and display detailed dimensional plans for every component, organized by assembly. All tolerances are applied. Plans are displayed in a readable table/card format with the option to print or copy.

### Changes Required:

#### 1. Plans Container

**File**: `src/features/chest-of-drawers/components/plans/Plans.tsx`

- Tab or accordion sections: "Carcass" | "Drawers" | "Summary"
- "Copy to Clipboard" button (copies as formatted text)

#### 2. Carcass Plan

**File**: `src/features/chest-of-drawers/components/plans/CarcassPlan.tsx`

Table with columns: Part | Quantity | Width | Height | Depth/Thickness | Material | Notes

Parts:

- Top panel
- Bottom panel
- Left side
- Right side
- Vertical dividers (quantity = numColumns - 1)
- Back panel
- Horizontal rails (if enabled, quantity = numRails)

Each dimension is the final cut dimension (actual thickness, not nominal). Notes column includes things like "23/32\" actual" when nominal differs.

#### 3. Drawer Plans

**File**: `src/features/chest-of-drawers/components/plans/DrawerPlan.tsx`

One section per drawer (labeled by column and row: "Column 1, Row 2"):

- Construction method noted
- Table: Part | Quantity | Width | Height | Material | Notes
  - Left/Right sides (2)
  - Front piece (1)
  - Back piece (1)
  - Bottom panel (1)
  - Face (1)
- Usable interior dimensions called out
- Any warnings (slide height, etc.)

If all drawers use the same construction/materials, show a consolidated view with quantity multiplied.

#### 4. Summary

**File**: `src/features/chest-of-drawers/components/plans/PlansSummary.tsx`

- Total piece count
- Material summary (how much of each thickness is needed in total board-feet or square-feet)
- Overall dimensions with constraint check
- List of all warnings

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`

#### Manual Verification:

- [ ] All carcass parts listed with correct dimensions
- [ ] All drawer parts listed per drawer with correct dimensions per construction method
- [ ] Dimensions match what's shown in the SVG visualization
- [ ] Copy to clipboard produces readable formatted text
- [ ] Consolidated view correctly merges identical drawers

**Implementation Note**: After completing this phase, pause for manual review of dimensional accuracy.

---

## Phase 6: Cutlist & 2D Bin Packing

### Overview

Aggregate all cut pieces from the plans, let the user configure stock sheet sizes per material/thickness, then run a 2D guillotine bin packing algorithm to optimize piece placement on sheets. Display results as a table and SVG cut diagrams per sheet.

### Changes Required:

#### 1. Cutlist Aggregation

**File**: `src/features/chest-of-drawers/calculations/cutlist.ts`

Functions:

- `aggregateCutPieces(config: ChestConfig): CutPiece[]`
  - Collects all pieces from carcass + all drawers
  - Groups by material/thickness
  - Merges identical dimensions into single entries with quantity

- `addKerfToPieces(pieces: CutPiece[], kerfWidth: number): CutPiece[]`
  - Adds kerf width to each dimension of each piece (each piece needs one kerf added to width and one to height, since each cut consumes the kerf)
  - Actually: kerf is consumed by the _cut_, not the piece. The bin packer accounts for kerf between pieces. The pieces themselves stay at their exact required dimensions. The bin packer adds kerf gaps when placing pieces.

#### 2. 2D Guillotine Bin Packing Algorithm

**File**: `src/features/chest-of-drawers/calculations/bin-packing.ts`

Implement a guillotine bin packing algorithm suitable for woodworking (only straight, edge-to-edge cuts):

```typescript
export function packPieces(
  pieces: CutPiece[], // All pieces for a single thickness
  sheet: StockSheet,
  kerfWidth: number,
  allowRotation: boolean, // default true - pieces can be rotated 90°
): SheetLayout[];
```

Algorithm (Guillotine Best Area Fit):

1. Expand pieces by quantity (1 entry per physical piece)
2. Sort by area descending (largest pieces first)
3. Maintain a list of free rectangles (initially one = full sheet)
4. For each piece:
   a. Find the free rectangle that fits the piece with the least leftover area (try both orientations if rotation allowed)
   b. Place the piece in the chosen rectangle
   c. Split the remaining space using guillotine split (choose horizontal or vertical split that maximizes the larger remaining rectangle)
   d. Account for kerf width in the split (kerf gap between the piece and the remaining space)
5. If no free rectangle fits, start a new sheet
6. Return array of SheetLayouts with placements and waste stats

Key considerations:

- Kerf is added as a gap after each placed piece (the cut that separates the piece from the remaining material)
- A piece of dimensions W×H placed at position (x,y) consumes W+kerf × H+kerf from the free rectangle
- Edge pieces (touching the sheet edge) don't need kerf on the sheet-edge side — but for simplicity in v1, we can add kerf uniformly and note this is conservative

#### 3. Stock Configuration UI

**File**: `src/features/chest-of-drawers/components/cutlist/StockConfig.tsx`

Per unique thickness used in the plan:

- Show the thickness (nominal + actual)
- Dropdown to select stock sheet size from presets
- Option to add custom sheet size
- Grain direction toggle (if grain matters, pieces won't be rotated — future enhancement, default: allow rotation)

#### 4. Cutlist Table

**File**: `src/features/chest-of-drawers/components/cutlist/CutListTable.tsx`

Grouped by material/thickness:

- Table: Part | Width | Height | Quantity | Material
- Subtotal area per group
- Number of sheets needed per group

#### 5. Sheet Layout Visualization

**File**: `src/features/chest-of-drawers/components/cutlist/SheetLayoutView.tsx`

SVG diagram per sheet:

- Sheet outline (light gray)
- Placed pieces as colored rectangles with labels (piece name + dimensions)
- Waste areas in a different color/hatching
- Sheet number, dimensions, waste percentage overlay
- Color-code pieces by type (carcass vs drawer vs face)

#### 6. Cutlist Container

**File**: `src/features/chest-of-drawers/components/cutlist/CutList.tsx`

Orchestrates:

1. Stock configuration per thickness
2. "Optimize" button (or auto-optimize on config change)
3. Cutlist table
4. Sheet layout visualizations
5. Summary: total sheets needed, total waste percentage, total material cost (future — just area for now)

### Tests:

**File**: `src/features/chest-of-drawers/calculations/__tests__/bin-packing.test.ts`

- Single piece fits on sheet
- Multiple pieces packed efficiently
- Piece that doesn't fit starts new sheet
- Kerf width correctly reduces available space
- Rotation produces better fit when applicable
- Handles pieces larger than stock sheet (error/warning)
- Waste percentage is accurate

**File**: `src/features/chest-of-drawers/calculations/__tests__/cutlist.test.ts`

- Aggregation correctly collects all pieces from a config
- Identical pieces merged with correct quantities
- Grouping by thickness is correct

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `npm run build`
- [ ] All tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:

- [ ] Cutlist table shows all pieces with correct dimensions
- [ ] Stock configuration allows selecting different sheet sizes per thickness
- [ ] Bin packing produces reasonable layouts (pieces don't overlap, fit within sheet)
- [ ] Sheet layout SVG accurately represents the packing
- [ ] Waste percentage seems reasonable (compare against manual estimation)
- [ ] Kerf is visibly accounted for in the sheet layout (small gaps between pieces)
- [ ] Adding more drawers increases the number of sheets needed

**Implementation Note**: After completing this phase, do thorough manual testing of the full flow end-to-end.

---

## Testing Strategy

### Unit Tests:

- All calculation functions (Phase 1) — core math correctness
- Bin packing algorithm (Phase 6) — packing correctness, kerf handling
- Store actions (Phase 2) — state mutations
- Unit conversion and fraction display

### Integration Tests:

- Full config → calculated dimensions → cutlist pipeline
- Store persistence round-trip (save → reload page → load)

### Manual Testing:

1. Configure a realistic chest (e.g., 36"W × 48"H × 22"D, 2 columns, 4 rows)
2. Verify all dimensions in the plan against hand calculations
3. Test each construction method and verify interior dimensions differ correctly
4. Set constraints smaller than the chest → verify red warning in visualization
5. Switch overlay ↔ inset and verify face dimensions change
6. Test cutlist with different stock sizes and verify layouts are reasonable
7. Test save/load and export/import workflows

## Performance Considerations

- Calculations are pure functions and fast; no memoization needed initially
- Bin packing is O(n²) worst case per sheet — fine for typical piece counts (< 100)
- SVG rendering with dozens of elements is trivial for browsers
- If the bin packing becomes slow with many pieces, we can add Web Worker offloading later

## File Structure Summary

```
src/
├── features/
│   └── chest-of-drawers/
│       ├── types.ts
│       ├── constants.ts
│       ├── store.ts
│       ├── selectors.ts
│       ├── calculations/
│       │   ├── index.ts
│       │   ├── units.ts
│       │   ├── carcass.ts
│       │   ├── drawer.ts
│       │   ├── slides.ts
│       │   ├── cutlist.ts
│       │   ├── bin-packing.ts
│       │   └── __tests__/
│       │       ├── units.test.ts
│       │       ├── carcass.test.ts
│       │       ├── drawer.test.ts
│       │       ├── slides.test.ts
│       │       ├── cutlist.test.ts
│       │       └── bin-packing.test.ts
│       └── components/
│           ├── config/
│           │   ├── ConfigPanel.tsx
│           │   ├── UnitSelector.tsx
│           │   ├── DimensionConstraints.tsx
│           │   ├── ColumnRowConfig.tsx
│           │   ├── DrawerHeightConfig.tsx
│           │   ├── DrawerStyleConfig.tsx
│           │   ├── ConstructionMethodConfig.tsx
│           │   ├── WoodThicknessConfig.tsx
│           │   ├── SlideConfig.tsx
│           │   ├── HorizontalRailConfig.tsx
│           │   └── SaveLoadPanel.tsx
│           ├── visualizer/
│           │   ├── Visualizer.tsx
│           │   ├── FrontView.tsx
│           │   ├── SideView.tsx
│           │   ├── DimensionLine.tsx
│           │   └── WarningIndicator.tsx
│           ├── plans/
│           │   ├── Plans.tsx
│           │   ├── CarcassPlan.tsx
│           │   ├── DrawerPlan.tsx
│           │   └── PlansSummary.tsx
│           ├── cutlist/
│           │   ├── CutList.tsx
│           │   ├── StockConfig.tsx
│           │   ├── CutListTable.tsx
│           │   └── SheetLayoutView.tsx
│           └── ui/
│               ├── CollapsibleSection.tsx
│               ├── NumberInput.tsx
│               └── Select.tsx
├── pages/
│   ├── Home.tsx
│   └── ChestOfDrawersPlanner.tsx
└── ...existing files...
```

## References

- Standard drawer slide clearances: 1/2" per side for standard side-mount slides
- Plywood actual thicknesses: 1/4" = 0.25", 1/2" = 15/32" (0.46875"), 3/4" = 23/32" (0.71875")
- Guillotine bin packing: variant of the 2D strip packing problem constrained to edge-to-edge cuts
