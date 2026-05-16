import { describe, expect, it } from "vitest";
import {
  isFluxProjectHashFormat,
  isV2TenantApiSchema,
  tenantRoleFromApiSchema,
} from "./flux-schema";

describe("flux-schema", () => {
  it("accepts 7-char control-plane project hash", () => {
    expect(isFluxProjectHashFormat("85a68e7")).toBe(true);
    expect(isFluxProjectHashFormat("roommating01")).toBe(false);
  });

  it("detects v2 tenant API schema", () => {
    expect(isV2TenantApiSchema("t_203da97e1420_api")).toBe(true);
    expect(isV2TenantApiSchema("t_85a68e7_api")).toBe(false);
  });

  it("derives tenant role from API schema", () => {
    expect(tenantRoleFromApiSchema("t_203da97e1420_api")).toBe("t_203da97e1420_role");
    expect(tenantRoleFromApiSchema("api")).toBeUndefined();
  });
});
