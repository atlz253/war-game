import type { GameAction } from "../../core/actions/game-actions";
import type { MapDefinition } from "../../core/maps/map-definition";
import type { GameState, SideId } from "../../core/model/game-state";
import { t } from "../localization/runtime";
import {
  type MultiplayerPacket,
  type MultiplayerRole,
  parseMultiplayerPacket,
} from "./multiplayer-protocol";

const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? "ws://localhost:8080";

export interface MultiplayerSessionEvents {
  onStatus?: (status: string) => void;
  onRoomCreated?: (roomCode: string) => void;
  onPeerConnected?: () => void;
  onMatchStart?: (map: MapDefinition, state: GameState) => void;
  onActionRequest?: (action: GameAction) => void;
  onAcceptedAction?: (sequence: number, action: GameAction) => void;
  onSnapshot?: (sequence: number, state: GameState) => void;
  onResyncRequest?: () => void;
  onDisconnect?: () => void;
}

export class MultiplayerSession {
  public readonly localSide: SideId;
  private readonly peerConnection: RTCPeerConnection;
  private signaling: WebSocket | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomCode = "";
  private reconnectToken = "";
  private reconnecting = false;
  private events: MultiplayerSessionEvents = {};

  public constructor(public readonly role: MultiplayerRole) {
    this.localSide = role === "host" ? "blue" : "red";
    this.peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) this.sendSignaling({ type: "ice-candidate", payload: event.candidate });
    };
    this.peerConnection.onconnectionstatechange = () => {
      if (
        this.peerConnection.connectionState === "disconnected" ||
        this.peerConnection.connectionState === "failed"
      )
        this.handlePeerDisconnect();
    };
    this.peerConnection.ondatachannel = (event) => this.attachDataChannel(event.channel);
  }

  public setEvents(events: MultiplayerSessionEvents): void {
    this.events = events;
  }
  public get code(): string {
    return this.roomCode;
  }
  public get isConnected(): boolean {
    return this.dataChannel?.readyState === "open";
  }

  public host(): void {
    this.connectSignaling({ type: "create-room" });
  }
  public join(roomCode: string): void {
    this.connectSignaling({ type: "join-room", roomCode: roomCode.trim().toUpperCase() });
  }
  public close(): void {
    this.dataChannel?.close();
    this.peerConnection.close();
    this.signaling?.close();
  }

  public startMatch(mapDefinition: MapDefinition, state: GameState): void {
    this.sendPacket({ type: "match-start", mapDefinition, state });
  }
  public requestAction(action: GameAction): void {
    this.sendPacket({ type: "action-request", action });
  }
  public publishAcceptedAction(sequence: number, action: GameAction): void {
    this.sendPacket({ type: "accepted-action", sequence, action });
  }
  public publishSnapshot(sequence: number, state: GameState): void {
    this.sendPacket({ type: "state-snapshot", sequence, state });
  }
  public requestResync(): void {
    this.sendPacket({ type: "resync-request" });
  }
  public completeMatch(): void {
    this.sendPacket({ type: "match-complete" });
  }

  private connectSignaling(initialMessage: object): void {
    this.events.onStatus?.(t("multiplayer-session.connecting.to.signaling"));
    this.signaling = new WebSocket(SIGNALING_URL);
    this.signaling.onopen = () => this.sendSignaling(initialMessage);
    this.signaling.onmessage = (event) => this.handleSignaling(event.data);
    this.signaling.onerror = () =>
      this.events.onStatus?.(t("multiplayer-session.signaling.connection.failed"));
  }

  private handleSignaling(raw: unknown): void {
    const message = parseJson(raw);
    if (!message || typeof message.type !== "string") return;
    this.dispatchSignalingMessage(message);
  }

  private dispatchSignalingMessage(message: Record<string, unknown>): void {
    switch (message.type) {
      case "room-created":
      case "room-joined":
      case "reconnected":
        this.handleRoomMessage(message);
        return;
      case "peer-connected":
        this.events.onPeerConnected?.();
        if (this.role === "host") void this.createOffer();
        return;
      case "offer":
        void this.acceptOffer(message.payload);
        return;
      case "answer":
        void this.acceptAnswer(message.payload);
        return;
      case "ice-candidate":
        void this.addCandidate(message.payload);
        return;
      case "error":
        this.events.onStatus?.(
          t("multiplayer-session.network.error", {
            value1: String(String(message.reason ?? "unknown")),
          }),
        );
    }
  }

  private handleRoomMessage(message: Record<string, unknown>): void {
    this.reconnecting = false;
    this.roomCode = typeof message.roomCode === "string" ? message.roomCode : this.roomCode;
    this.reconnectToken = typeof message.token === "string" ? message.token : this.reconnectToken;
    if (message.type === "room-created") this.events.onRoomCreated?.(this.roomCode);
    this.events.onStatus?.(
      message.type === "room-created"
        ? t("multiplayer-session.share.room.code")
        : t("multiplayer-session.waiting.for.peer"),
    );
  }

  private async createOffer(): Promise<void> {
    this.attachDataChannel(this.peerConnection.createDataChannel("ai-war-game"));
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.sendSignaling({ type: "offer", payload: offer });
  }
  private async acceptOffer(payload: unknown): Promise<void> {
    const offer = payload as RTCSessionDescriptionInit;
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.sendSignaling({ type: "answer", payload: answer });
  }
  private async acceptAnswer(payload: unknown): Promise<void> {
    await this.peerConnection.setRemoteDescription(payload as RTCSessionDescriptionInit);
  }
  private async addCandidate(payload: unknown): Promise<void> {
    await this.peerConnection.addIceCandidate(payload as RTCIceCandidateInit);
  }
  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.onopen = () => {
      this.events.onStatus?.(t("multiplayer-session.peer.connected"));
      this.events.onPeerConnected?.();
    };
    channel.onclose = () => this.handlePeerDisconnect();
    channel.onmessage = (event) => this.handlePacket(event.data);
  }
  private handlePacket(raw: unknown): void {
    const packet = parseMultiplayerPacket(parseJson(raw));
    if (!packet) {
      this.events.onStatus?.(t("multiplayer-session.invalid.network.packet"));
      return;
    }
    this.dispatchPacket(packet);
  }
  private dispatchPacket(packet: MultiplayerPacket): void {
    if (packet.type === "match-start")
      this.events.onMatchStart?.(packet.mapDefinition, packet.state);
    if (packet.type === "action-request" && this.role === "host")
      this.events.onActionRequest?.(packet.action);
    if (packet.type === "accepted-action")
      this.events.onAcceptedAction?.(packet.sequence, packet.action);
    if (packet.type === "state-snapshot") this.events.onSnapshot?.(packet.sequence, packet.state);
    if (packet.type === "resync-request" && this.role === "host") this.events.onResyncRequest?.();
    if (packet.type === "match-complete")
      this.events.onStatus?.(t("multiplayer-session.match.complete"));
  }
  private sendPacket(packet: MultiplayerPacket): void {
    if (this.dataChannel?.readyState === "open") this.dataChannel.send(JSON.stringify(packet));
  }
  private sendSignaling(message: object): void {
    if (this.signaling?.readyState === WebSocket.OPEN) this.signaling.send(JSON.stringify(message));
  }

  private reconnectThroughSignaling(): void {
    if (this.reconnecting || !this.roomCode || !this.reconnectToken) return;
    this.reconnecting = true;
    this.signaling?.close();
    this.connectSignaling({
      type: "reconnect",
      roomCode: this.roomCode,
      token: this.reconnectToken,
    });
  }

  private handlePeerDisconnect(): void {
    this.reconnectThroughSignaling();
    this.events.onDisconnect?.();
  }
}

function parseJson(raw: unknown): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(String(raw));
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
function getIceServers(): RTCIceServer[] {
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
  return [
    { urls: DEFAULT_STUN_URL },
    ...(turnUrl && turnUsername && turnCredential
      ? [{ urls: turnUrl, username: turnUsername, credential: turnCredential }]
      : []),
  ];
}
