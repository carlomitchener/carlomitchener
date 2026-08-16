const CDN_ORIGIN = import.meta.env.DEV ? "/cdn" : "https://cdn.mrly.net";

export function cdnUrl(path: string): string {
  return `${CDN_ORIGIN}/${path}`;
}
