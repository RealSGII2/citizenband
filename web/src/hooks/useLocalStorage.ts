import type { ParticipantSettings } from "@/app/(primaryApp)/app/server/[serverId]/appHooks/types";
import type { Keybind } from "common/keybinds";
import type {
  ServerData,
  UserObject,
} from "@/app/(primaryApp)/app/server/[serverId]/appHooks/types";
import type { OverlayPositionId } from "common/desktopApi";

type SupportedTypes = string | number | boolean | object;

export type SerializedData<T = SupportedTypes> = {
  value: T;
};

export type LocalStorageMap = {
  // Global data
  user: UserObject;
  recentServers: ServerData[];
  overlayOptions: {
    enabled: boolean;
    positionId: OverlayPositionId;
    displayId: number | null;
  };

  // Audio settings
  selfPlayback: boolean;
  rogerBeepEnabled: boolean;

  defaultParticipantSettings: ParticipantSettings;
  participantSettings: { [uuid: string]: ParticipantSettings };

  // Controls
  keybind: Keybind;

  // Misc settings
  useVnlSkin: boolean;
};

function serialize(data: SupportedTypes) {
  return JSON.stringify({ value: data });
}

function deserialize(rawData: string) {
  const { value } = JSON.parse(rawData) as SerializedData;
  return value;
}

export type LocalData = {
  get<K extends keyof LocalStorageMap>(key: K): LocalStorageMap[K] | null;
  set<K extends keyof LocalStorageMap>(key: K, value: LocalStorageMap[K]): void;
};

export default function useLocalStorage(): LocalData {
  return {
    get<K extends keyof LocalStorageMap>(key: K): LocalStorageMap[K] | null {
      if (typeof window === "undefined" || typeof localStorage === "undefined")
        return null;

      const rawData = localStorage.getItem(key);
      if (!rawData) return null;
      return deserialize(rawData) as LocalStorageMap[K];
    },

    set<K extends keyof LocalStorageMap>(key: K, value: LocalStorageMap[K]) {
      if (typeof window === "undefined" || typeof localStorage === "undefined")
        return;
      localStorage.setItem(key, serialize(value));
    },
  };
}
