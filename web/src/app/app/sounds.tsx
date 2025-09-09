import { type ReactNode, type Ref, useEffect, useImperativeHandle, useRef } from 'react'

export type SoundController = {
  doStart: () => void
  join: () => void
  leave: () => void
  doStop: (doRogerBeep: boolean) => void
  setLoop: (enabled: boolean) => void
}

export default function Sounds({ ref }: { ref: Ref<SoundController> }): ReactNode {
  const roger = useRef<HTMLAudioElement | null>(null)
  const start0 = useRef<HTMLAudioElement | null>(null)
  const start1 = useRef<HTMLAudioElement | null>(null)
  const start2 = useRef<HTMLAudioElement | null>(null)
  const start3 = useRef<HTMLAudioElement | null>(null)
  const stop = useRef<HTMLAudioElement | null>(null)
  const loop = useRef<HTMLAudioElement | null>(null)
  const join = useRef<HTMLAudioElement | null>(null)
  const leave = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    for (const audio of [roger, start0, start1, start2, start3, stop, loop])
      if (audio.current) {
        audio.current.volume = 0.5
      }

    loop.current!.volume = 0.2
    loop.current!.loop = true
  }, [roger, start0, start1, start2, start3, stop, loop])

  useImperativeHandle(ref, () => ({
    doStart() {
      const start = [start0, start1, start2, start3][Math.floor(Math.random() * 4)]
      start.current!.play()
    },

    doStop(doRogerBeep) {
      stop.current!.play()

      if (!doRogerBeep) return
      setTimeout(() => roger.current!.play(), 100)
    },

    setLoop(enabled) {
      if (enabled) loop.current?.play()
      else loop.current?.pause()
    },

    join() {
      join.current!.play()
    },

    leave() {
      leave.current!.play()
    }
  }))

  return (
    <>
      <audio controls={false} ref={roger} src='/audio/roger.wav' />
      <audio controls={false} ref={start0} src='/audio/start0.wav' />
      <audio controls={false} ref={start1} src='/audio/start1.wav' />
      <audio controls={false} ref={start2} src='/audio/start2.wav' />
      <audio controls={false} ref={start3} src='/audio/start3.wav' />
      <audio controls={false} ref={stop} src='/audio/stop.wav' />
      <audio controls={false} ref={loop} src='/audio/radiostatic.mp3' />
      <audio controls={false} ref={join} src='/audio/join.wav' />
      <audio controls={false} ref={leave} src='/audio/leave.wav' />
    </>
  )
}
