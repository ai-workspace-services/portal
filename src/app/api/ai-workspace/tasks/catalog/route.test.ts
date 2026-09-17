import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("Tasks Catalog API Route", () => {
  it("responds with ok and catalog payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai-workspace/tasks/catalog");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("catalog");
    expect(Array.isArray(data.catalog.pinnedTasks)).toBe(true);
    expect(Array.isArray(data.catalog.sharedProjects)).toBe(true);
  });
});
