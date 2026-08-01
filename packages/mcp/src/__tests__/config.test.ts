import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("loads a valid config and strips a trailing slash", () => {
    const config = loadConfig({
      PAPERCLIP_API_URL: "http://localhost:3100/",
      PAPERCLIP_API_KEY: "secret",
    } as NodeJS.ProcessEnv);
    expect(config.baseUrl).toBe("http://localhost:3100");
    expect(config.apiKey).toBe("secret");
    expect(config.timeoutMs).toBe(30_000);
  });

  it("throws when the URL is missing", () => {
    expect(() => loadConfig({ PAPERCLIP_API_KEY: "secret" } as NodeJS.ProcessEnv)).toThrow(ConfigError);
  });

  it("throws when the URL is malformed", () => {
    expect(() =>
      loadConfig({ PAPERCLIP_API_URL: "not a url", PAPERCLIP_API_KEY: "secret" } as NodeJS.ProcessEnv),
    ).toThrow(ConfigError);
  });

  it("throws when the API key is missing", () => {
    expect(() =>
      loadConfig({ PAPERCLIP_API_URL: "http://localhost:3100" } as NodeJS.ProcessEnv),
    ).toThrow(ConfigError);
  });

  it("parses a custom timeout", () => {
    const config = loadConfig({
      PAPERCLIP_API_URL: "http://localhost:3100",
      PAPERCLIP_API_KEY: "secret",
      PAPERCLIP_MCP_TIMEOUT_MS: "5000",
    } as NodeJS.ProcessEnv);
    expect(config.timeoutMs).toBe(5000);
  });

  it("rejects a non-positive timeout", () => {
    expect(() =>
      loadConfig({
        PAPERCLIP_API_URL: "http://localhost:3100",
        PAPERCLIP_API_KEY: "secret",
        PAPERCLIP_MCP_TIMEOUT_MS: "-1",
      } as NodeJS.ProcessEnv),
    ).toThrow(ConfigError);
  });
});
