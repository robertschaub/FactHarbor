/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_DATE: (() => {
      const d = new Date();
      const day = d.getDate();
      const mon = d.toLocaleString("en-US", { month: "short" });
      const yr = String(d.getFullYear()).slice(2);
      return `${day}.${mon} ${yr}`;
    })(),
  },
};

module.exports = nextConfig;
