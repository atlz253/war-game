import { afterEach, expect, it, vi } from "vitest";
import { MultiplayerSession } from "../multiplayer/multiplayer-session";
import { getLocaleCatalog, replaceLocaleCatalog, selectLocale, t } from "./runtime";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  selectLocale("en");
  vi.unstubAllGlobals();
});
it("translates peer status locally while keeping signaling messages unchanged", () => {
  const sockets: FakeSocket[] = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = FakeSocket.OPEN;
    onopen = () => {};
    onerror = () => {};
    send = vi.fn();
    constructor() {
      sockets.push(this);
    }
  }
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("RTCPeerConnection", class {});
  replaceLocaleCatalog({
    ...original,
    locales: [
      ...original.locales,
      {
        schemaVersion: 1,
        id: "qa",
        name: "Test",
        strings: { "multiplayer-session.connecting.to.signaling": "Подключение…" },
      },
    ],
  });
  selectLocale("qa");
  const status = vi.fn();
  const host = new MultiplayerSession("host");
  host.setEvents({ onStatus: status });
  host.host();
  expect(status).toHaveBeenLastCalledWith("Подключение…");
  sockets[0]?.onopen();
  expect(sockets[0]?.send).toHaveBeenCalledWith(JSON.stringify({ type: "create-room" }));
  selectLocale("en");
  const peer = new MultiplayerSession("client");
  peer.setEvents({ onStatus: status });
  peer.join(" abcd ");
  expect(status).toHaveBeenLastCalledWith(t("multiplayer-session.connecting.to.signaling"));
  sockets[1]?.onopen();
  expect(sockets[1]?.send).toHaveBeenCalledWith(
    JSON.stringify({ type: "join-room", roomCode: "ABCD" }),
  );
});
