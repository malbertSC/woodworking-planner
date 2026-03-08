import { Mesh } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import JSZip from "jszip";
import type { BufferGeometry } from "three";

/** Convert a BufferGeometry to a binary STL ArrayBuffer. */
export function geometryToStlBuffer(geometry: BufferGeometry): ArrayBuffer {
  const exporter = new STLExporter();
  const mesh = new Mesh(geometry);
  const result = exporter.parse(mesh, { binary: true });
  // STLExporter returns a DataView; extract the underlying ArrayBuffer
  if (result instanceof DataView) return result.buffer;
  return new TextEncoder().encode(result as string).buffer;
}

/**
 * Export a Three.js BufferGeometry as a binary STL file and trigger a download.
 */
export function exportGeometryAsStl(
  geometry: BufferGeometry,
  filename: string,
): void {
  const buffer = geometryToStlBuffer(geometry);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Bundle multiple STL files into a single zip and trigger a download.
 */
export async function exportStlsAsZip(
  files: { name: string; buffer: ArrayBuffer }[],
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.buffer);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
