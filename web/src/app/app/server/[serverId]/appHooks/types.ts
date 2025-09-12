import { DailyParticipant } from "@daily-co/daily-js";

export type UserObject = {
  username: string;
  avatar: string;
}

export type ServerData = {
  slug: string;
  name: string;
  description: string;
}

export type FilledDailyParticipant = Exclude<DailyParticipant, "userData"> & {
  userData: {
    /**
     * A hash of the user's IP to identify regular users. Temporary until authentication is added.
     */
    uuid: string;
    avatarUrl: string;
  };
};

export type FilledDailyParticipantObject = {
  local: FilledDailyParticipant;
  [key: string]: FilledDailyParticipant;
};

export type ParticipantSettings = {
  /**
   * A number in [0, 300] as a percentage that represents this user's volume.
   */
  volume: number;

  /**
   * A number in [0, 100] as a percentage that represents how much influence postprocessing has on the output of this user.
   */
  postProcessingAmount: number;
};

export type ParticipantStreams = {
  /**
   * The stream before postprocessing.
   */
  dry: MediaStream;

  /**
   * The stream after postprocessing.
   */
  wet: MediaStream;

  /**
   * Sets the influence of postprocessing on `wet`.
   * @param amount How much influence, number within [0, 1]
   */
  adjustPostProcessing(amount: number): void;

  /**
   * Sets the volume of the `wet` stream.
   * @param amount The volume where `0` = muted and `1` = normal. Can be any positive number or `0`.
   */
  adjustVolume(amount: number): void;
};
