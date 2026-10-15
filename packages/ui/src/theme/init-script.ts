// Server-safe. An OPTIONAL inline script for static sites that cannot read cookies on the
// server. Prefer `htmlAttributes.fromCookies(cookieHeader)` in a server layout: it needs no
// inline script, so it works under a strict Content-Security-Policy.
//
// If you do inline this, add your CSP nonce to the <script> tag. The script reads only the
// two cookies below, accepts only known values, and swallows every error.
import { DENSITY_COOKIE, THEME_COOKIE } from "./preferences.js";

export function themeInitScript(): string {
  return (
    "(function(){try{" +
    "var t,d,c=(document.cookie||'').split(';');" +
    "for(var i=0;i<c.length;i++){var p=c[i].trim();" +
    `if(p.indexOf('${THEME_COOKIE}=')===0)t=p.slice(${THEME_COOKIE.length + 1});` +
    `else if(p.indexOf('${DENSITY_COOKIE}=')===0)d=p.slice(${DENSITY_COOKIE.length + 1});}` +
    "var e=document.documentElement;" +
    "if(t==='light'||t==='dark')e.setAttribute('data-theme',t);" +
    "if(d==='compact'||d==='spacious')e.setAttribute('data-density',d);" +
    "}catch(_){}})();"
  );
}
