import { useEffect, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

async function fetchDevicesAsync() {
  return (await navigator.mediaDevices.enumerateDevices()).filter((x) => x.kind == 'audioinput')
}

export default function useAudioDevice(callObj: DailyCall) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [currentDevice, setCurrentDevice] = useState<MediaDeviceInfo | null>(null)

  useEffect(() => {
    (async () => {
      await callObj.setInputDevicesAsync({
        audioSource: (await navigator.mediaDevices.getUserMedia({ audio: { deviceId: currentDevice?.deviceId, autoGainControl: false } })).getAudioTracks()[0]
      })
    })()
  }, [callObj, currentDevice]);

  useEffect(() => {
    ;(async () => {
      const currentDevices = await fetchDevicesAsync()
      const currentSelectedDevice =
        currentDevices.find((x) => x.deviceId == localStorage.getItem('selectedAudioInput')) ??
        currentDevices[0]

      setCurrentDevice(currentSelectedDevice)
      setDevices(currentDevices)
    })()
  }, [])

  return {
    devices,
    currentDevice,

    async refreshDevicesAsync() {
      const newDevices = await fetchDevicesAsync()
      setDevices(newDevices)
    },

    async setCurrentDeviceIdAsync(newDeviceId: string) {
      const newDevice = devices.find((x) => x.deviceId == newDeviceId)
      if (!newDevice) return
      //
      // await callObj.setInputDevicesAsync({
      //   audioDeviceId: newDeviceId,
      //   audioSource
      // })
      localStorage.setItem('selectedAudioInput', newDeviceId)
      setCurrentDevice(newDevice)
    }
  }
}
