import type { Capabilities, Project, RenderOptions, RenderResponse } from "../types";

const API_ROOT = "/api";

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(typeof detail.detail === "string" ? detail.detail : "Error de render");
  }
  return (await response.json()) as T;
}

export async function fetchCapabilities(signal?: AbortSignal): Promise<Capabilities> {
  const response = await fetch(`${API_ROOT}/capabilities`, { signal });
  if (!response.ok) throw new Error("No se pudieron cargar las capacidades del motor");
  return (await response.json()) as Capabilities;
}

export async function renderProject(
  project: Project,
  options: RenderOptions,
  signal?: AbortSignal,
): Promise<RenderResponse> {
  return postJson<RenderResponse>(
    "/render",
    { patch: project.patch, sequence: project.sequence, options },
    signal,
  );
}

export function audioUrl(renderId: string, channel: "input" | "output" = "output", download = false): string {
  const params = new URLSearchParams({ channel });
  if (download) params.set("download", "1");
  return `${API_ROOT}/render/${renderId}/audio?${params.toString()}`;
}

export async function downloadAudio(renderId: string, channel: "input" | "output" = "output"): Promise<void> {
  const response = await fetch(audioUrl(renderId, channel, true));
  if (!response.ok) throw new Error("No se pudo descargar el audio");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ondalab-${channel}.wav`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
