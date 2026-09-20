import { MODE_KEY, THEME_COLORS } from "./shop.ts";

export const MODE_SCRIPT = `(function(){try{var r=document.documentElement,k="${MODE_KEY}",c={light:"${THEME_COLORS.light}",dark:"${THEME_COLORS.dark}"},m=new URLSearchParams(location.search).get("mode");if(m!=="dark"&&m!=="light"){m=null;try{m=localStorage.getItem(k)}catch(e){}}if(m!=="dark"&&m!=="light")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.dataset.mode=m;var t=document.querySelector('meta[name="theme-color"]');if(t)t.content=c[m]}catch(e){}})();`;

export const INLINE = [MODE_SCRIPT];
