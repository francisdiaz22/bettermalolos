import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const positiveInteger = (fallback) =>
  z.coerce.number().int().positive().default(fallback);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    DATABASE_URL: z.string().url().superRefine((value, context) => {
      let url;
      try {
        url = new URL(value);
      } catch {
        return;
      }
      if (url.protocol !== "mysql:") {
        context.addIssue({ code: "custom", message: "DATABASE_URL must use the mysql:// protocol" });
      }
      if (url.search || url.hash) {
        context.addIssue({
          code: "custom",
          message: "DATABASE_URL must not contain a query string or fragment; percent-encode reserved credential characters",
        });
      }
    }).optional(),
    OPS_API_TOKEN: z.string().min(1).optional(),
    CORS_ALLOW_ORIGINS: z.string().default("https://bettermalolos.org"),
    PDRRMO_URL: z.string().url().default("https://pdrrmo.bulacan.gov.ph/"),
    PDRRMO_ENABLED: booleanFromEnv,
    PDRRMO_CADENCE_MINUTES: positiveInteger(30),
    SNAPSHOT_MAX_RAW_BYTES: positiveInteger(2_000_000),
    SNAPSHOT_MAX_COMPRESSED_BYTES: positiveInteger(1_000_000),
    SNAPSHOT_DATABASE_QUOTA_BYTES: positiveInteger(250_000_000),
    HTTP_TIMEOUT_SECONDS: positiveInteger(15),
    HTTP_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
    COLLECTOR_USER_AGENT: z.string().default("BantayBaha/0.1 (+https://bettermalolos.org; contact: ops@bettermalolos.org)"),
    FRESHNESS_WARNING_MINUTES: positiveInteger(45),
    FRESHNESS_CRITICAL_MINUTES: positiveInteger(90),
  })
  .transform((environment) => ({
    ...environment,
    APP_ENV: environment.APP_ENV ?? environment.NODE_ENV,
    CORS_ALLOW_ORIGINS: environment.CORS_ALLOW_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  }))
  .superRefine((environment, context) => {
    if (["staging", "production"].includes(environment.APP_ENV) && !environment.OPS_API_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["OPS_API_TOKEN"],
        message: "OPS_API_TOKEN is required in staging and production",
      });
    }
  });

export function loadConfig(environment = process.env) {
  return environmentSchema.parse(environment);
}
