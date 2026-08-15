import { IMAGE_SIZE, MOCKUP_FORMAT, TILE_FORMAT, IMAGE_FORMAT, CDN_PREFIX } from "./config";

export function getImage(imageKey: string, handle: string, width: number = IMAGE_SIZE): string {
  if (!imageKey) return "";
  if (imageKey.startsWith("http")) {
    const separator = imageKey.includes("?") ? "&" : "?";
    return `${imageKey}${separator}width=${width}&format=${IMAGE_FORMAT}`;
  }
  const filename = `${handle}-${imageKey}.${MOCKUP_FORMAT}`;
  return `${CDN_PREFIX}${filename}?width=${width}&format=${IMAGE_FORMAT}`;
}

export function getTileUrl(handle: string, index: number): string {
  return `${CDN_PREFIX}${handle}-${index}.${TILE_FORMAT}`;
}
