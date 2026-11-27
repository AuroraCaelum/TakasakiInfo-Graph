// swagger-ui-dist ships no types; this page only calls the bundle's default export.
declare module "swagger-ui-dist/swagger-ui-es-bundle.js" {
  const SwaggerUI: (options: Record<string, unknown>) => unknown;
  export default SwaggerUI;
}
