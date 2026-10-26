import { createHash } from "node:crypto";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function joinUrl(baseUrl, path) {
  const base = new URL(baseUrl);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return new URL(path, base).href;
}

async function fetchBytes(fetchImplementation, url) {
  const response = await fetchImplementation(url, { cache: "no-store", redirect: "follow" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function auditProductionArtifact({
  baseUrl,
  expectedCandidate,
  fetchImplementation = fetch,
}) {
  const failures = [];
  const manifestUrl = joinUrl(baseUrl, "build-manifest.json");
  let manifestBytes;
  let manifest;
  try {
    manifestBytes = await fetchBytes(fetchImplementation, manifestUrl);
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch (error) {
    return { ok: false, failures: [`manifest: ${error.message}`], checkedFiles: 0 };
  }

  if (sha256(manifestBytes) !== expectedCandidate.manifestSha256) {
    failures.push("production manifest SHA-256 differs from the accepted release candidate");
  }
  if (manifest.buildId !== expectedCandidate.buildId) failures.push("production build ID differs from the accepted release candidate");
  if (manifest.files?.length !== expectedCandidate.fileCount) failures.push("production file count differs from the accepted release candidate");
  if (manifest.totalBytes !== expectedCandidate.totalBytes) failures.push("production byte count differs from the accepted release candidate");

  let checkedFiles = 0;
  for (const file of Array.isArray(manifest.files) ? manifest.files : []) {
    try {
      const bytes = await fetchBytes(fetchImplementation, joinUrl(baseUrl, file.path));
      checkedFiles += 1;
      if (bytes.byteLength !== file.bytes) failures.push(`${file.path}: byte count differs from manifest`);
      if (sha256(bytes) !== file.sha256) failures.push(`${file.path}: SHA-256 differs from manifest`);
    } catch (error) {
      failures.push(`${file.path}: ${error.message}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    buildId: manifest.buildId,
    checkedFiles,
    totalBytes: manifest.totalBytes,
    manifestSha256: sha256(manifestBytes),
  };
}
