export function versionToNumber(version: string): number {
  const [major, minor, patch] = version.split('.').map((x) => +x)
  return major * 10000 + minor * 100 + patch
}

export default function compareVersionGT(a: string, b: string): boolean {
  return versionToNumber(a) > versionToNumber(b)
}
