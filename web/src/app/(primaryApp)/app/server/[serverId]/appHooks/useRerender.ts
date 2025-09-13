import { useState } from "react";

type RerenderHook = {
  /**
   * A dependency to re-run effects and memos when this is called.
   */
  onRerender: number;

  /**
   * Trigger a rerender.
   */
  rerender: () => void;
}

export default function useRerender(): RerenderHook {
  const [onRerender, setCount] = useState(0)

  return {
    onRerender,
    rerender: () => setCount(x => x + 1),
  }
}
