import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DELIVERY_ASSETS } from "./delivery-asset-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(SCRIPT_DIR, "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const ROOT_DIR = resolve(VER02_DIR, "..");
const DIST_DIR = resolve(GAME_DIR, "dist");
const EVIDENCE_PATH = resolve(VER02_DIR, "phases", "phase-10", "release-artifact-audit.json");
const CANDIDATE_PATH = resolve(VER02_DIR, "phases", "phase-10", "release-candidate.json");
const PACKAGE_PATH = resolve(GAME_DIR, "package.json");
const LOCK_PATH = resolve(GAME_DIR, "package-lock.json");
const ALLOWED_EXTENSIONS = new Set([".css", ".html", ".json", ".mjs", ".wav", ".webp"]);
const NOTICE_PATH = "game/public/THIRD_PARTY_NOTICES.html";
const DISALLOWED_PRODUCT_TEXT = /\b(?:placeholder|planned|draft)\b/i;
const EXTERNAL_URL = /\b(?:https?:)?\/\//i;

const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const unique = (values) => [...new Set(values)].sort();

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

export async function auditReleaseArtifact() {
  const failures = [];
  const [evidence, candidate, manifest, manifestBytes, packageJson, lockfile] = await Promise.all([
    readFile(EVIDENCE_PATH, "utf8").then(JSON.parse),
    readFile(CANDIDATE_PATH, "utf8").then(JSON.parse),
    readFile(resolve(DIST_DIR, "build-manifest.json"), "utf8").then(JSON.parse),
    readFile(resolve(DIST_DIR, "build-manifest.json")),
    readFile(PACKAGE_PATH, "utf8").then(JSON.parse),
    readFile(LOCK_PATH, "utf8").then(JSON.parse),
  ]);

  assert(evidence.schemaVersion === 1, "evidence schemaVersion must be 1", failures);
  assert(evidence.phase === "10", "evidence phase must be 10", failures);
  assert(evidence.buildId === candidate.buildId, "evidence buildId differs from release candidate", failures);
  assert(manifest.buildId === candidate.buildId, "dist buildId differs from release candidate", failures);
  assert(manifest.files.length === candidate.manifest.fileCount, "dist file count differs from release candidate", failures);
  assert(manifest.totalBytes === candidate.manifest.totalBytes, "dist byte count differs from release candidate", failures);
  assert(sha256(manifestBytes) === candidate.manifest.sha256, "dist manifest hash differs from release candidate", failures);
  assert(evidence.artifact.manifestSha256 === candidate.manifest.sha256, "evidence manifest hash differs from release candidate", failures);
  assert(evidence.artifact.fileCount === manifest.files.length, "evidence file count differs from dist", failures);
  assert(evidence.artifact.totalBytes === manifest.totalBytes, "evidence byte count differs from dist", failures);

  let externalUrlCount = 0;
  let unfinishedReferenceCount = 0;
  for (const file of manifest.files) {
    const path = resolve(DIST_DIR, file.path);
    const content = await readFile(path);
    const actual = await stat(path);
    assert(actual.size === file.bytes, `${file.path}: size differs from manifest`, failures);
    assert(sha256(content) === file.sha256, `${file.path}: sha256 differs from manifest`, failures);
    assert(ALLOWED_EXTENSIONS.has(extname(file.path)), `${file.path}: unexpected file type`, failures);
    if ([".css", ".html", ".mjs"].includes(extname(file.path))) {
      const source = content.toString("utf8");
      if (EXTERNAL_URL.test(source)) externalUrlCount += 1;
      if (DISALLOWED_PRODUCT_TEXT.test(source)) unfinishedReferenceCount += 1;
    }
  }
  assert(externalUrlCount === evidence.staticAudit.externalUrlCount, "static external URL result differs from evidence", failures);
  assert(unfinishedReferenceCount === evidence.staticAudit.unfinishedProductReferenceCount, "unfinished product reference result differs from evidence", failures);

  const deliveredPaths = new Set(manifest.files.map(({ path }) => path));
  const imageAssets = DELIVERY_ASSETS.filter(({ kind }) => kind === "webp");
  const audioAssets = DELIVERY_ASSETS.filter(({ kind }) => kind === "copy");
  const expectedBuildPaths = DELIVERY_ASSETS.map((asset) => asset.kind === "webp"
    ? `assets/delivery/${asset.deliveryPath}`
    : `assets/${asset.deliveryPath}`);
  for (const path of expectedBuildPaths) assert(deliveredPaths.has(path), `${path}: missing from release candidate`, failures);
  for (const asset of DELIVERY_ASSETS) assert(asset.status === "final", `${asset.deliveryPath}: non-final status`, failures);
  for (const asset of imageAssets) {
    assert(asset.origin === "openai-image-generation", `${asset.deliveryPath}: unexpected image origin`, failures);
    assert(asset.termsUrl === evidence.rights.termsOfUse.url, `${asset.deliveryPath}: terms URL differs from evidence`, failures);
    assert(asset.reviewedOn === evidence.recordedOn, `${asset.deliveryPath}: rights review date differs from evidence`, failures);
    assert(asset.residualRisk.includes("not-be-unique"), `${asset.deliveryPath}: uniqueness risk missing`, failures);
  }
  for (const asset of audioAssets) {
    assert(asset.origin === "project-authored-deterministic-synthesis", `${asset.deliveryPath}: unexpected audio origin`, failures);
    assert(asset.rights === "project-authored; no third-party samples", `${asset.deliveryPath}: external sample status missing`, failures);
  }
  assert(imageAssets.length === evidence.assets.imageCount, "image count differs from evidence", failures);
  assert(audioAssets.length === evidence.assets.audioCount, "audio count differs from evidence", failures);
  assert(DELIVERY_ASSETS.length === evidence.assets.totalCount, "asset total differs from evidence", failures);
  assert(unique(expectedBuildPaths).length === DELIVERY_ASSETS.length, "duplicate delivery asset path", failures);

  const notice = await readFile(resolve(DIST_DIR, NOTICE_PATH), "utf8");
  assert(deliveredPaths.has(NOTICE_PATH), "rights notice missing from release candidate", failures);
  assert(notice.includes(`確認日: ${evidence.recordedOn}`), "rights notice review date differs from evidence", failures);
  assert(notice.includes("生成物は一意とは限らず"), "rights notice omits output similarity risk", failures);
  assert(notice.includes("外部音源、サンプル、録音素材は使用していません"), "rights notice omits external sample status", failures);
  assert(notice.includes("法的助言"), "rights notice omits legal-review limitation", failures);

  assert(Object.keys(packageJson.dependencies ?? {}).length === evidence.dependencies.runtimeCount, "runtime dependency count differs from evidence", failures);
  assert(Object.keys(packageJson.devDependencies ?? {}).length === evidence.dependencies.developmentCount, "development dependency count differs from evidence", failures);
  const nonRootLockEntries = Object.keys(lockfile.packages ?? {}).filter((path) => path !== "");
  assert(nonRootLockEntries.length === evidence.dependencies.lockedPackageCount, "lockfile dependency count differs from evidence", failures);
  assert(packageJson.packageManager === evidence.dependencies.packageManager, "package manager version differs from evidence", failures);
  assert(evidence.dependencies.audit.command === "npm audit --omit=dev --audit-level=high", "dependency audit command is not fixed", failures);
  assert(evidence.dependencies.audit.status === "pass" && evidence.dependencies.audit.vulnerabilityCount === 0, "dependency audit is not recorded as zero-vulnerability pass", failures);

  assert(evidence.rights.termsOfUse.effective === "2026-01-01", "Terms of Use effective date not recorded", failures);
  assert(evidence.rights.serviceTerms.updated === "2026-10-16", "Service Terms update date not recorded", failures);
  assert(evidence.rights.residualRisk === "generated-output-non-uniqueness-and-non-infringement-not-guaranteed", "rights residual risk was removed", failures);
  assert(evidence.status === "pass", "release artifact audit is not recorded as pass", failures);
  assert(evidence.accepted === false, "artifact audit must not decide full release-candidate acceptance", failures);
  assert(typeof candidate.accepted === "boolean", "release candidate accepted must be a boolean", failures);

  return {
    failures,
    buildId: manifest.buildId,
    fileCount: manifest.files.length,
    totalBytes: manifest.totalBytes,
    imageCount: imageAssets.length,
    audioCount: audioAssets.length,
    dependencyCount: nonRootLockEntries.length,
    evidencePath: EVIDENCE_PATH.replace(`${ROOT_DIR}/`, ""),
  };
}
