const tailwindcss = require("@tailwindcss/postcss");

/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: [tailwindcss, require("autoprefixer")],
};
