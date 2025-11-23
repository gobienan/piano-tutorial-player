"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { PianoVisualizer } from "@/components/piano-visualizer"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Play, Pause, Upload, Music, Volume2, Loader2, Gauge, RotateCcw, Youtube, Twitter, Globe } from "lucide-react"
import * as Tone from "tone"
import { Midi } from "@tonejs/midi"

type HandFilter = "both" | "left" | "right"

// Audio offset to compensate for latency (negative = play earlier)
const AUDIO_OFFSET = -0.05 // 50ms earlier

export function PianoPlayer() {
  const [midiData, setMidiData] = useState<Midi | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [areSamplesLoaded, setAreSamplesLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0) // dB
  const [instrumentType, setInstrumentType] = useState("grand-piano")
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [handFilter, setHandFilter] = useState<HandFilter>("both")
  const [viewMode, setViewMode] = useState<"top-down" | "synthesia">("top-down")
  const [duration, setDuration] = useState(0)
  const [displayName, setDisplayName] = useState("")
  const [isLoadingMidi, setIsLoadingMidi] = useState(false)

  const synthRef = useRef<Tone.PolySynth | Tone.Sampler | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handFilterRef = useRef(handFilter)

  useEffect(() => {
    handFilterRef.current = handFilter
  }, [handFilter])

  useEffect(() => {
    Tone.Transport.playbackRate = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    loadInstrument("grand-piano")

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
      }
      Tone.Transport.stop()
      Tone.Transport.cancel()
    }
  }, [])

  const loadInstrument = async (type: string) => {
    setAreSamplesLoaded(false)

    if (isPlaying) {
      togglePlay()
    }

    if (synthRef.current) {
      synthRef.current.dispose()
    }

    if (type === "grand-piano") {
      const sampler = new Tone.Sampler({
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3",
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => {
          setAreSamplesLoaded(true)
          console.log("[v0] Grand Piano samples loaded")
        },
      }).toDestination()

      sampler.volume.value = volume
      synthRef.current = sampler
    } else if (type === "electric-piano") {
      const sampler = new Tone.Sampler({
        urls: {
          A1: "A1.mp3",
          A2: "A2.mp3",
        },
        baseUrl: "https://tonejs.github.io/audio/casio/",
        onload: () => {
          setAreSamplesLoaded(true)
          console.log("[v0] Electric Piano samples loaded")
        },
      }).toDestination()

      sampler.volume.value = volume
      synthRef.current = sampler
    } else {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
        volume: volume,
      }).toDestination()
      setAreSamplesLoaded(true)
    }
  }

  const loadMidiFromUrl = async (url: string, fileName: string) => {
    setIsLoadingMidi(true)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load MIDI: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const midi = new Midi(arrayBuffer)
      setMidiData(midi)
      setFileName(fileName)
      // Clean up display name - remove file extension
      const cleanName = fileName.replace(/\.(mid|midi)$/i, '')
      setDisplayName(cleanName)
      setDuration(midi.duration)
      setCurrentTime(0)
      setIsPlaying(false)
      setIsLoaded(true)

      // Setup Tone.js transport
      if (Tone.Transport.state === "started") {
        Tone.Transport.stop()
      }
      Tone.Transport.cancel()

      // Reset playback rate
      Tone.Transport.playbackRate = playbackSpeed

      // Schedule notes
      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const shouldPlay =
            handFilter === "both" ||
            (handFilter === "left" && note.midi < 60) ||
            (handFilter === "right" && note.midi >= 60)

          if (shouldPlay) {
            Tone.Transport.schedule((time) => {
              // Check if synth exists and is loaded
              if (synthRef.current) {
                synthRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity)
              }
            }, note.time + AUDIO_OFFSET)
          }
        })
      })

      // Schedule end of song
      Tone.Transport.schedule((time) => {
        setIsPlaying(false)
        Tone.Transport.stop()
      }, midi.duration)
    } catch (error) {
      console.error("Error loading MIDI:", error)
      alert(`Failed to load MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingMidi(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const midi = new Midi(arrayBuffer)
      setMidiData(midi)
      setFileName(file.name)
      // Clean up display name - remove file extension
      const cleanName = file.name.replace(/\.(mid|midi)$/i, '')
      setDisplayName(cleanName)
      setDuration(midi.duration)
      setCurrentTime(0)
      setIsPlaying(false)
      setIsLoaded(true)

      // Setup Tone.js transport
      if (Tone.Transport.state === "started") {
        Tone.Transport.stop()
      }
      Tone.Transport.cancel()

      // Reset playback rate
      Tone.Transport.playbackRate = playbackSpeed

      // Schedule notes
      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const shouldPlay =
            handFilter === "both" ||
            (handFilter === "left" && note.midi < 60) ||
            (handFilter === "right" && note.midi >= 60)

          if (shouldPlay) {
            Tone.Transport.schedule((time) => {
              // Check if synth exists and is loaded
              if (synthRef.current) {
                synthRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity)
              }
            }, note.time + AUDIO_OFFSET)
          }
        })
      })

      // Schedule end of song
      Tone.Transport.schedule((time) => {
        setIsPlaying(false)
        Tone.Transport.stop()
      }, midi.duration)
    } catch (error) {
      console.error("Error parsing MIDI:", error)
    }
  }

  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    Tone.Transport.seconds = newTime
    setCurrentTime(newTime)
  }

  const togglePlay = async () => {
    if (!isLoaded) return

    await Tone.start()

    // Check if we are at the end, if so restart
    if (Tone.Transport.seconds >= duration && duration > 0) {
      Tone.Transport.seconds = 0
    }

    if (isPlaying) {
      Tone.Transport.pause()
    } else {
      Tone.Transport.start()
    }
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (synthRef.current) {
      synthRef.current.volume.value = value[0]
    }
  }

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0])
    // Removed complex rescheduling logic - Tone.Transport.playbackRate handles it
  }

  const handleHandFilterChange = (value: string) => {
    if (!value) return
    const newFilter = value as HandFilter
    setHandFilter(newFilter)

    // Note: We might need to reschedule if we want to silence notes,
    // but the visualizer uses this state.
    // For audio, we DO need to silence the other hand if we want to mute it.
    // Re-running the schedule logic is needed for AUDIO filtering.

    if (isLoaded && midiData) {
      const wasPlaying = isPlaying
      const savedTime = Tone.Transport.seconds

      if (wasPlaying) {
        Tone.Transport.pause()
      }

      Tone.Transport.cancel()

      // Reschedule notes with new hand filter
      midiData.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const shouldPlay =
            newFilter === "both" ||
            (newFilter === "left" && note.midi < 60) ||
            (newFilter === "right" && note.midi >= 60)

          if (shouldPlay) {
            Tone.Transport.schedule((time) => {
              if (synthRef.current) {
                synthRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity)
              }
            }, note.time + AUDIO_OFFSET)
          }
        })
      })

      // Re-schedule end
      Tone.Transport.schedule((time) => {
        setIsPlaying(false)
        Tone.Transport.stop()
      }, midiData.duration)

      Tone.Transport.seconds = savedTime

      if (wasPlaying) {
        Tone.Transport.start()
      }
    }
  }

  useEffect(() => {
    let animationFrame: number

    const updateTime = () => {
      if (Tone.Transport.state === "started") {
        setCurrentTime(Tone.Transport.seconds)
        animationFrame = requestAnimationFrame(updateTime)
      }
    }

    if (isPlaying) {
      updateTime()
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [isPlaying])

  // Available MIDI files
  // Available MIDI files
  const availableMidis = [
    { name: "Moonlight Sonata 3rd Movement", path: "/midi/Moonlight Sonata 3rd Movement.midi (piano only).mid" },
    { name: "Naruto - Sadness And Sorrow", path: "/midi/Naruto -Sadness And Sorrow (piano).mid" },
    { name: "Naruto Shippuden - Blue Bird", path: "/midi/Naruto Shippuden - Blue Bird.mid" },
    { name: "Digimon - Butterfly", path: "/midi/Digimon - Butterfly (Piano Version).mid" },
  ]

  return (
    <div className="relative w-full h-screen bg-black flex flex-col">
      {/* MIDI Selection Menu */}
      {!midiData && (
        <div className="relative flex-1 flex items-center justify-center z-50">
          <div className="text-center">
            <h1 className="text-4xl font-light text-white/90 mb-4 tracking-tight">Piano Flow</h1>
            <p className="text-white/40 text-sm mb-6 font-light">Upload a MIDI file to begin</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingMidi}
              className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-6 py-3 text-white/80 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 mx-auto mb-8"
            >
              {isLoadingMidi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Select MIDI File
                </>
              )}
            </button>
            <div>
              <p className="text-white/30 text-xs mb-3 font-light">or use one of our samples</p>
              <div className="flex flex-col items-center gap-2">
                {availableMidis.map((midi, index) => (
                  <button
                    key={index}
                    onClick={() => loadMidiFromUrl(midi.path, midi.path.split('/').pop() || midi.name)}
                    disabled={isLoadingMidi}
                    className="text-white/40 hover:text-white/70 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {midi.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-center bg-black/40 backdrop-blur-sm pointer-events-none border-b border-white/5">
        <div className="flex gap-3 pointer-events-auto items-center">
          <Button
            variant="outline"
            className="bg-white/10 hover:bg-white/20 hover:text-white text-white px-4 h-8 rounded-lg border border-white/20 backdrop-blur-sm transition-all text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Music className="w-4 h-4 mr-2" />
            MIDI
          </Button>

          <ToggleGroup
            type="single"
            value={handFilter}
            onValueChange={handleHandFilterChange}
            className="bg-white/5 border border-white/10 rounded-lg p-0.5"
          >
            <ToggleGroupItem
              value="both"
              className="px-4 h-8 text-xs data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 hover:bg-white/20 hover:text-white transition-all rounded"
            >
              Both
            </ToggleGroupItem>
            <ToggleGroupItem
              value="left"
              className="px-4 h-8 text-xs data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 hover:bg-white/20 hover:text-white transition-all rounded"
            >
              Left
            </ToggleGroupItem>
            <ToggleGroupItem
              value="right"
              className="px-4 h-8 text-xs data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 hover:bg-white/20 hover:text-white transition-all rounded"
            >
              Right
            </ToggleGroupItem>
          </ToggleGroup>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "top-down" | "synthesia")}
            className="bg-white/5 border border-white/10 rounded-lg p-0.5"
          >
            <ToggleGroupItem
              value="top-down"
              className="px-4 h-8 text-xs data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 hover:bg-white/20 hover:text-white transition-all rounded"
            >
              3D
            </ToggleGroupItem>
            <ToggleGroupItem
              value="synthesia"
              className="px-4 h-8 text-xs data-[state=on]:bg-white/10 data-[state=on]:text-white text-white/60 hover:bg-white/20 hover:text-white transition-all rounded"
            >
              Top Down
            </ToggleGroupItem>
          </ToggleGroup>

          <input type="file" accept=".mid,.midi" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </div>
        <div className="text-white/80 font-medium text-sm flex items-center gap-2">
          {!areSamplesLoaded && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
          {midiData ? displayName || midiData.name || "Untitled Track" : "No MIDI Loaded"}
        </div>
      </div>

      <div className="flex-1 relative">
        <PianoVisualizer midiData={midiData} currentTime={currentTime} isPlaying={isPlaying} handFilter={handFilter} viewMode={viewMode} />
      </div>

      {/* Progress Bar */}
      {isLoaded && duration > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[70%] max-w-2xl z-20 pointer-events-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <Button
                className="bg-white/10 hover:bg-white/20 hover:text-white text-white px-4 h-8 rounded-lg border border-white/20 backdrop-blur-sm transition-all"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : midiData && Tone.Transport.seconds >= duration && duration > 0 ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>
              <span className="text-white/60 text-xs font-mono min-w-[45px]">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  min={0}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="relative z-10"
                />
              </div>
              <span className="text-white/60 text-xs font-mono min-w-[45px]">
                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20 pointer-events-auto">
        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 flex flex-col items-center gap-3">
          <Gauge className="w-4 h-4 text-white/60" />
          <div className="h-32 relative bg-white/5 rounded p-2">
            <Slider
              value={[playbackSpeed]}
              max={2}
              min={0.25}
              step={0.25}
              orientation="vertical"
              onValueChange={handleSpeedChange}
              className="h-full relative z-10"
            />
          </div>
          <span className="text-white/60 text-xs font-mono">{playbackSpeed}x</span>
        </div>
      </div>

      {/* Right Side Controls - Volume */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20 pointer-events-auto">
        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 flex flex-col items-center gap-3">
          <div className="h-32 relative bg-white/5 rounded p-2">
            <Slider
              value={[volume]}
              max={10}
              min={-30}
              step={1}
              orientation="vertical"
              onValueChange={handleVolumeChange}
              className="h-full relative z-10"
            />
          </div>
          <Volume2 className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {/* Social Promos - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-20 flex gap-3 pointer-events-auto">
        <a
          href="https://youtube.com/@gobienan"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white/5 hover:bg-red-500/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10 transition-all group"
        >
          <Youtube className="w-4 h-4 text-white/60 group-hover:text-red-500 transition-colors" />
          <span className="text-white/60 text-xs font-medium group-hover:text-white transition-colors">@gobienan</span>
        </a>

        <a
          href="https://twitter.com/gobienan"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white/5 hover:bg-blue-400/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10 transition-all group"
        >
          <Twitter className="w-4 h-4 text-white/60 group-hover:text-blue-400 transition-colors" />
          <span className="text-white/60 text-xs font-medium group-hover:text-white transition-colors">@gobienan</span>
        </a>

        <a
          href="https://gobienan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white/5 hover:bg-emerald-400/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10 transition-all group"
        >
          <Globe className="w-4 h-4 text-white/60 group-hover:text-emerald-400 transition-colors" />
          <span className="text-white/60 text-xs font-medium group-hover:text-white transition-colors">gobienan.com</span>
        </a>
      </div>

    </div>
  )
}
