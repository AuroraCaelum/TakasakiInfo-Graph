/**
 * The `/api/` page: Swagger UI over the TakasakiInfo API's own OpenAPI document.
 *
 * The document is read live from the API (`GET /api/v1/openapi.json`, which `takasaki build` writes
 * next to the Lambda), so this page follows API deploys without a rebuild. Its `servers` entry points
 * at the CloudFront distribution, and the API answers GETs with `Access-Control-Allow-Origin: *`, so
 * "Try it out" works from this origin.
 */

import SwaggerUI from "swagger-ui-dist/swagger-ui-es-bundle.js";
import "swagger-ui-dist/swagger-ui.css";
import "./api.css";

const API_BASE = "https://takasakiinfo-api.auroracaelum.com/api/v1/";
const SPEC_URL = new URL("openapi.json", API_BASE).toString();

document.getElementById("api-spec")?.setAttribute("href", SPEC_URL);

SwaggerUI({
  url: SPEC_URL,
  dom_id: "#swagger",
  deepLinking: true, // #/<tag>/<operationId> in the address bar
  docExpansion: "list",
  defaultModelsExpandDepth: 0,
  displayRequestDuration: true,
  filter: true,
  tryItOutEnabled: true,
  // The API is GET-only; hide the button rows for the other methods.
  supportedSubmitMethods: ["get"],
  // No `?url=` / `?configUrl=` overrides from the address bar: this page shows one document.
  queryConfigEnabled: false,
});
