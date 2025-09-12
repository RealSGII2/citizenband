import { type ReactNode, useCallback, useEffect, useState } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";

import type {
  FilledDailyParticipant,
  FilledDailyParticipantObject,
  ParticipantSettings,
  ParticipantStreams,
} from "./types";
import addPostProcessing from "../effects";
import type { DailyCall } from "@daily-co/daily-js";

const DEFAULT_SETTINGS: ParticipantSettings = {
  volume: 100,
  postProcessingAmount: 100,
};

type ParticipantObject = {
  /**
   * An ID that can identity this user
   */
  uuid: string;

  /**
   * A public-facing name for this user
   */
  username: string;

  /**
   * The avatar for this user
   */
  avatarUrl: string;

  /**
   * A private-facing ID for this user (GUID)
   */
  sessionId: string;

  /**
   * Is this the local user?
   */
  isMe: boolean;

  /**
   * The user from Daily
   */
  user: FilledDailyParticipant;

  /**
   * The participant's streams
   */
  stream: ParticipantStreams;

  /**
   * The participant's audio settings
   */
  settings: ParticipantSettings;

  /**
   * Whether this participant has Push-to-Talk enabled
   */
  isSpeaking: boolean;

  /**
   * Updates this participant's volume
   * @param volume A number as a percentage
   */
  updateVolume: (volume: number) => void;

  /**
   * Updates this participant's postprocessing influence
   * @param amount A number as a percentage from [0, 100]
   */
  updatePostProcessing: (amount: number) => void;
};

type ParticipantHook = {
  /**
   * Get all active speakers as participants
   */
  getSpeakers: () => FilledDailyParticipant[];

  /**
   * Map all participants, their streams, and their settings
   */
  map: (mapper: (object: ParticipantObject) => ReactNode) => ReactNode[];

  defaults: {
    /**
     * The default participant volume within [0, 300]
     */
    volume: number;

    /**
     * The default postprocessing influence within [0, 100]
     */
    postProcessingAmount: number;

    /**
     * Updates the default participant volume
     * @param volume A number as a percentage
     */
    updateVolume: (volume: number) => void;

    /**
     * Updates the default postprocessing influence
     * @param amount A number as a percentage from [0, 100]
     */
    updatePostProcessing: (amount: number) => void;
  };
};

/**
 * Remove all tracks from a {@link MediaStream}
 * @param stream The stream to remove tracks from
 */
function removeAllTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) stream.removeTrack(track);
}

export default function useParticipants({
  callObject,
  rerender,
  onRerender,
  onSpeakerCountUpdate,
}: {
  callObject: DailyCall;
  rerender: () => void;
  onRerender: number;

  onSpeakerCountUpdate: (oldCount: number, newCount: number) => void;
}): ParticipantHook {
  const localData = useLocalStorage();

  const [lastSpeakerCount, setLastSpeakerCount] = useState(0);

  const [participants, setParticipants] =
    useState<FilledDailyParticipantObject>({} as FilledDailyParticipantObject);
  const [participantStreams, setParticipantStreams] = useState<
    Record<string, ParticipantStreams>
  >({});

  const [participantSettings, setParticipantSettings] = useState(
    localData.get("participantSettings") ?? {},
  );
  const [defaultParticipantSettings, setDefaultParticipantSettings] = useState(
    localData.get("defaultParticipantSettings") ?? DEFAULT_SETTINGS,
  );

  const getSpeakers = useCallback(
    () =>
      Object.values(participants).filter(
        (x) => x.tracks.audio.state === "playable",
      ),
    [participants],
  );

  // Update state when the DailyCall changes
  useEffect(() => {
    const listeners: Record<string, () => void> = {};

    function updateParticipants(): void {
      const localParticipants =
        callObject.participants() as FilledDailyParticipantObject;
      setParticipants(localParticipants);

      for (const participant of Object.values(localParticipants)) {
        const streams = participantStreams[participant.user_id] ?? {
          dry: new MediaStream(),
          wet: new MediaStream(),
        };

        const settings =
          participantSettings[participant.userData.uuid] ||
          defaultParticipantSettings;

        const firstDryTrack = streams.dry.getTracks()[0];
        const persistentTrack = participant.tracks.audio.persistentTrack;
        if (!firstDryTrack || firstDryTrack.id !== persistentTrack?.id) {
          removeAllTracks(streams.dry);
          if (persistentTrack) streams.dry.addTrack(persistentTrack);
        }

        if (!streams.wet.getTracks().length && persistentTrack) {
          console.log(
            `MEMORY WATCHDOG: Setting up PostProcessing for "${participant.user_name}" (id:${participant.user_id})`,
          );
          removeAllTracks(streams.wet);
          const postProcessor = addPostProcessing(
            streams.dry,
            settings.volume / 100,
            settings.postProcessingAmount / 100,
          );
          streams.wet.addTrack(postProcessor.track);
          streams.adjustPostProcessing = postProcessor.adjustPostProcessing;
          streams.adjustVolume = postProcessor.adjustVolume;
        } else if (streams.wet.getTracks().length) {
          streams.adjustPostProcessing(settings.postProcessingAmount / 100);
          streams.adjustVolume(settings.volume / 100);
        }

        participantStreams[participant.user_id] = streams;
      }

      setParticipantStreams(participantStreams);
      rerender();
    }

    for (const event of [
      "participant-joined",
      "participant-updated",
      "participant-left",
      "joined-meeting",
    ]) {
      listeners[event] = updateParticipants;
      callObject.on(event as "participant-joined", updateParticipants);
    }

    return () => {
      for (const event in listeners)
        callObject.off(event as "participant-joined", updateParticipants);
    };
  }, [
    callObject,
    participantStreams,
    participantSettings,
    defaultParticipantSettings,
    rerender,
  ]);

  // Handle speaker count changes
  useEffect(() => {
    const newSpeakerCount = getSpeakers().length;
    onSpeakerCountUpdate(lastSpeakerCount, newSpeakerCount);
    setLastSpeakerCount(newSpeakerCount);
  }, [getSpeakers, lastSpeakerCount, onRerender, onSpeakerCountUpdate]);

  const updateUserVolume = useCallback((user: FilledDailyParticipant) => (volume: number) => {
    if (volume < 0 || volume > 300)
      throw new RangeError("`volume` must be within [0, 300]");

    participantSettings[user.userData.uuid] ??= defaultParticipantSettings;
    participantSettings[user.userData.uuid].volume = volume;

    setParticipantSettings(participantSettings);
    localData.set("participantSettings", participantSettings);
    rerender();
  }, [defaultParticipantSettings, localData, participantSettings, rerender]);

  const updateUserPostProcessing = useCallback((user: FilledDailyParticipant) => (amount: number) => {
    if (amount < 0 || amount > 300)
      throw new RangeError("`amount` must be within [0, 300]");

    participantSettings[user.userData.uuid] ??=
      defaultParticipantSettings;
    participantSettings[user.userData.uuid].postProcessingAmount =
      amount;

    setParticipantSettings(participantSettings);
    localData.set("participantSettings", participantSettings);
    rerender();
  }, [defaultParticipantSettings, localData, participantSettings, rerender]);

  const map = useCallback((mapper: (object: ParticipantObject) => ReactNode) => {
    return Object.values(participants)
      .filter((x) => !!x.userData)
      .map((user) =>
        mapper({
          uuid: user.userData.uuid,
          username: user.user_name,
          sessionId: user.user_id,
          avatarUrl: user.userData.avatarUrl,

          isMe: user.local,

          user,
          stream: participantStreams[user.user_id],
          settings:
            participantSettings[user.userData.uuid] ??
            defaultParticipantSettings,

          isSpeaking: user.tracks.audio.state === "playable",

          updateVolume: updateUserVolume(user),
          updatePostProcessing: updateUserPostProcessing(user),
        }),
      );
  }, [defaultParticipantSettings, participantSettings, participantStreams, participants, updateUserPostProcessing, updateUserVolume])

  return {
    getSpeakers,
    map,

    defaults: {
      volume: defaultParticipantSettings.volume,
      postProcessingAmount: defaultParticipantSettings.postProcessingAmount,

      updateVolume: (volume: number) => {
        const newSettings = {
          ...defaultParticipantSettings,
          volume,
        };

        setDefaultParticipantSettings(newSettings);
        localData.set("defaultParticipantSettings", newSettings);
        rerender();
      },

      updatePostProcessing: (amount: number) => {
        const newSettings = {
          ...defaultParticipantSettings,
          postProcessingAmount: amount,
        };

        setDefaultParticipantSettings(newSettings);
        localData.set("defaultParticipantSettings", newSettings);
        rerender();
      },
    },
  };
}
