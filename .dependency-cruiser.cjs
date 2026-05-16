/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "components-not-to-flux",
      severity: "error",
      from: { path: "^components" },
      to: { path: "^lib/flux" },
    },
    {
      name: "lib-not-to-app",
      severity: "error",
      from: { path: "^lib" },
      to: { path: "^app" },
    },
    {
      name: "lib-not-to-components",
      severity: "error",
      from: { path: "^lib" },
      to: { path: "^components" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)\\.next/|\\.local/|(^|/)docs/generated/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
