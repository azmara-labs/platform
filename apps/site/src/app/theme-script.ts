/**
 * Applies the reader's theme before the first paint on pages without the Fumadocs provider (the
 * landing page): the same choice next-themes makes there (storage key "theme", "light", "dark"
 * or "system", class on <html>, color-scheme), so a reader who picked dark in the docs sees the
 * landing page dark too, with no flash. On docs pages next-themes runs as well and agrees.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(d?"dark":"light");e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;
