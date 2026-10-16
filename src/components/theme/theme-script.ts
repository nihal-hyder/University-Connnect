export const THEME_KEY = "cc-theme";

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the
 * wrong theme. Kept tiny and dependency-free.
 */
export const themeScript = `(function(){try{var c=localStorage.getItem("${THEME_KEY}");var d=c==="dark"||((!c||c==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
