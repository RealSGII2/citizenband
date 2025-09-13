import { useEffect, useState } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { OverlayPositionId } from "common/desktopApi";

type OverlayHook = {
  isEnabled: boolean;
  positionId: OverlayPositionId;

  setEnabled: (enabled: boolean) => void;
  setPosition: (id: OverlayPositionId) => void;
};

export default function useOverlay(): OverlayHook {
  const localData = useLocalStorage();
  const basicOverlayData = localData.get("overlayOptions");

  const [overlayEnabled, setOverlayEnabled] = useState(
    basicOverlayData?.enabled ?? false,
  );
  const [overlayPosition, setOverlayPosition] = useState(
    basicOverlayData?.positionId ?? "br",
  );

  useEffect(() => {
    window.app.overlay.setEnabled(overlayEnabled);
  }, [overlayEnabled]);

  useEffect(() => {
    localData.set("overlayOptions", {
      enabled: overlayEnabled,
      positionId: overlayPosition,
      displayId: 0,
    });
  }, [localData, overlayEnabled, overlayPosition]);

  return {
    isEnabled: overlayEnabled,
    positionId: overlayPosition,

    setEnabled(isEnabled: boolean) {
      setOverlayEnabled(isEnabled);
    },

    setPosition(positionId: OverlayPositionId) {
      setOverlayPosition(positionId);
      window.app.overlay.updateState({
        positionId,
      });
    },
  };
}
