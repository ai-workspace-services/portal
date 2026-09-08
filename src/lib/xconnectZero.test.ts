import { describe, expect, it } from "vitest";
import {
  xconnectNodeStatusLabel,
  xconnectRoleStatusLabel,
  type XConnectZeroDevice,
} from "./xconnectZero";

const device: XConnectZeroDevice = {
  id: "one-test",
  network_id: "net-test",
  role: "one",
  name: "Linux One",
  platform: "linux",
  hostname: "one-test",
  wireguard_address: "10.77.0.2/32",
};

describe("Zero runtime status presentation", () => {
  it("does not turn missing control-plane data into not-enrolled or online", () => {
    expect(xconnectRoleStatusLabel(undefined, true)).toBe("状态未知");
    expect(xconnectNodeStatusLabel(device, false)).toBe(
      "Config ACK status unknown",
    );
  });
  it("describes recent ACK without claiming a live tunnel", () => {
    expect(xconnectRoleStatusLabel("connected", false)).toBe(
      "Recent config ACK",
    );
    expect(
      xconnectNodeStatusLabel(
        { ...device, connection_status: "recent_ack" },
        true,
      ),
    ).toBe("最近配置已确认");
  });
  it("shows stale, never-ACKed and revoked devices separately", () => {
    expect(
      xconnectNodeStatusLabel({ ...device, connection_status: "stale" }, false),
    ).toBe("No recent config ACK");
    expect(
      xconnectNodeStatusLabel(
        { ...device, connection_status: "never_seen" },
        false,
      ),
    ).toBe("Awaiting current config ACK");
    expect(
      xconnectNodeStatusLabel(
        { ...device, status: "revoked", connection_status: "recent_ack" },
        true,
      ),
    ).toBe("已撤销");
  });
});
