import { Mesh } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { BufferGeometry } from "three";

/**
 * Export a Three.js BufferGeometry as a binary STL file and trigger a download.
 */
export function exportGeometryAsStl(
  geometry: BufferGeometry,
  filename: string,
): void {
  const exporter = new STLExporter();

  // STLExporter works on a Mesh, so wrap the geometry in a temporary one
  const mesh = new Mesh(geometry);
  const buffer = exporter.parse(mesh, { binary: true });

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}
