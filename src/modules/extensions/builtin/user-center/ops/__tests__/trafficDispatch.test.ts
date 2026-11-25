import { describe, expect, it } from "vitest";

import {
  CANONICAL_SEED_NODES,
  buildFluxgateSwarmSnippet,
  buildHaproxyBackendSnippet,
  buildHaproxyDrainCheckCommand,
  buildHaproxyReloadCommands,
  buildHaproxyRollbackCommands,
  buildHaproxyWeightCommands,
  buildPlaybookVarsYaml,
  createDispatchPlanConfig,
  deriveRemoteServerName,
  getScenarioPresets,
  mergeInventoryNodes,
  sanitizeHaproxyIdentifier,
  sanitizeHostPort,
  sanitizeSni,
} from "../trafficDispatch";

describe("trafficDispatch pure logic", () => {
  it("falls back to canonical seed nodes when inventory is empty or unavailable", () => {
    const fromEmpty = mergeInventoryNodes([]);
    const fromNull = mergeInventoryNodes(null);
    expect(fromEmpty).toHaveLength(2);
    expect(fromEmpty[0]).toMatchObject({
      id: "jp-xconnect-01.svc.plus",
      address: "3.113.5.51:443",
      engine: "haproxy",
      resourceClass: "pool-media",
      source: "seed",
    });
    expect(fromEmpty[1]).toMatchObject({
      id: "jp-xconnect-02.svc.plus",
      address: "43.207.89.150:443",
      engine: "fluxgate",
      resourceClass: "pool-media",
      source: "seed",
    });
    expect(fromNull).toEqual(fromEmpty);
  });

  it("merges live inventory while preserving canonical metadata on matching IDs", () => {
    const merged = mergeInventoryNodes([
      {
        id: "jp-xconnect-01.svc.plus",
        status: "healthy",
        clientCount: 37,
        lastHeartbeat: "2026-11-25T08:00:00Z",
      },
      {
        id: "sg-xconnect-03.svc.plus",
        address: "18.141.10.22:443",
        engine: "fluxgate",
        resourceClass: "pro",
        status: "unhealthy",
        clients: 12,
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      id: "jp-xconnect-01.svc.plus",
      address: "3.113.5.51:443",
      sni: "jp-xconnect-01.svc.plus",
      engine: "haproxy",
      resourceClass: "pool-media",
      status: "healthy",
      activeClients: 37,
      source: "live",
    });
    expect(merged[1]).toMatchObject({
      id: "sg-xconnect-03.svc.plus",
      address: "18.141.10.22:443",
      sni: "sg-xconnect-03.svc.plus",
      engine: "fluxgate",
      resourceClass: "pro",
      status: "degraded",
      activeClients: 12,
      source: "live",
    });
  });

  it("sanitizes identifiers, host:port, and SNI to prevent injection", () => {
    expect(sanitizeHaproxyIdentifier("jp02; rm -rf /")).toBe("jp02-rm-rf");
    expect(deriveRemoteServerName("jp-xconnect-02.svc.plus")).toBe("jp02");
    expect(sanitizeHostPort("43.207.89.150:443; reboot", "127.0.0.1:443")).toBe(
      "127.0.0.1:443",
    );
    expect(sanitizeHostPort("43.207.89.150:443")).toBe("43.207.89.150:443");
    expect(sanitizeSni("jp-xconnect-02.svc.plus\necho pwned")).toBe(
      "jp-xconnect-02.svc.plusechopwned",
    );
    expect(sanitizeSni("jp-xconnect-02.svc.plus")).toBe("jp-xconnect-02.svc.plus");
  });

  it("returns scenario presets for rolling-upgrade, slow-node, and custom", () => {
    const rolling = getScenarioPresets("rolling-upgrade");
    expect(rolling.map((s) => [s.localWeight, s.remoteWeight])).toEqual([
      [80, 20],
      [50, 50],
      [20, 80],
      [0, 100],
    ]);

    const slow = getScenarioPresets("slow-node");
    expect(slow).toHaveLength(1);
    expect(slow[0]).toMatchObject({ localWeight: 0, remoteWeight: 100 });

    const custom = getScenarioPresets("custom", 65);
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ localWeight: 65, remoteWeight: 35 });
  });

  it("generates HAProxy backend, reload, weight, drain check, and rollback commands matching roles/vhosts/haproxy", () => {
    const cfg = createDispatchPlanConfig({
      sourceNode: CANONICAL_SEED_NODES[0],
      targetNode: CANONICAL_SEED_NODES[1],
      scenario: "rolling-upgrade",
      localWeight: 80,
    });

    const backend = buildHaproxyBackendSnippet(cfg);
    expect(backend).toContain("backend be_xray_xhttp");
    expect(backend).toContain("balance roundrobin");
    expect(backend).toContain("server xray /dev/shm/xray.sock proto h2 weight 80");
    expect(backend).toContain(
      "server jp02 43.207.89.150:443 ssl verify none alpn h2 sni str(jp-xconnect-02.svc.plus) check inter 5s fall 3 rise 2 weight 20",
    );

    const reload = buildHaproxyReloadCommands(cfg);
    expect(reload).toContain("cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak.$(date +%F_%H%M%S)");
    expect(reload).toContain("haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy");
    expect(reload).not.toContain("systemctl restart");

    const weights = buildHaproxyWeightCommands(cfg, 50, 50);
    expect(weights).toContain(
      'echo "set server be_xray_xhttp/xray weight 50" | socat stdio /run/haproxy/admin.sock',
    );
    expect(weights).toContain(
      'echo "set server be_xray_xhttp/jp02 weight 50" | socat stdio /run/haproxy/admin.sock',
    );

    const drainCheck = buildHaproxyDrainCheckCommand(cfg);
    expect(drainCheck).toBe(
      'echo "show stat" | socat stdio /run/haproxy/admin.sock | grep be_xray_xhttp | cut -d, -f1,2,5,18,19',
    );

    const rollback = buildHaproxyRollbackCommands(cfg);
    expect(rollback).toContain('set server be_xray_xhttp/xray weight 100');
    expect(rollback).toContain("haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy");
    expect(rollback).not.toContain("systemctl restart");
  });

  it("generates Ansible role YAML and Fluxgate v0.3.0 swarm commands", () => {
    const cfg = createDispatchPlanConfig({
      sourceNode: CANONICAL_SEED_NODES[0],
      targetNode: CANONICAL_SEED_NODES[1],
      scenario: "rolling-upgrade",
      localWeight: 80,
    });

    const yaml = buildPlaybookVarsYaml(cfg);
    expect(yaml).toContain("haproxy_xhttp_local_weight: 80");
    expect(yaml).toContain("haproxy_xhttp_spillover_servers:");
    expect(yaml).toContain("- name: jp02");
    expect(yaml).toContain('address: "43.207.89.150:443"');
    expect(yaml).toContain('sni: "jp-xconnect-02.svc.plus"');
    expect(yaml).toContain("weight: 20");

    const fluxgate = buildFluxgateSwarmSnippet(cfg);
    expect(fluxgate).toContain("fluxgate swarm status");
    expect(fluxgate).toContain("fluxgate swarm drain");
    expect(fluxgate).toContain("vault kv put secret/gtm/pools/pool-media");
  });
});
