# Implementation Plan: ElevenLabs Repair Procedure Narrator

A dedicated React component to provide professional, instructional voice narrations for repair procedures, utilizing the ElevenLabs API for high-quality speech synthesis, with a robust fallback to the browser's native Web Speech API.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Placement**: Integrated alongside repair procedure text on diagnosis and repair service pages (`pages/diagnosis.tsx` and repair-related sections in `pages/services.tsx`).
> - **Voice Style**: Professional, instructional technician voice ("Professional Technician").
> - **Fallback**: If the `ELEVENLABS_API_KEY` is missing or the API call fails, the system automatically falls back to the browser's native `SpeechSynthesis` API with a clear UI notification (e.g., "Using native browser voice").

---

### 1. Overview & Core Concept
We will create a `VoiceNarrator` component that takes repair text content as input, fetches high-quality audio from ElevenLabs (via our existing API route), and manages playback. It will intelligently handle API errors by switching to the native browser voice.

### 2. Technical Architecture

#### Component: `VoiceNarrator`
- **Props**: `text: string`, `voiceId: string` (defaulting to a professional technician voice ID).
- **Functionality**:
  - `play()`: Triggers API call or fallback.
  - `stop()`: Handles audio cleanup.
  - **State**: `isPlaying`, `isFallback` (boolean), `error`.
  - **Visuals**: A clean, Tailwind-styled play button/player embedded within repair procedure cards.

#### API Strategy
- Reuse existing `/api/elevenlabs/tts` route.
- Implement robust `try-catch` blocks to detect ElevenLabs configuration status and initiate fallback.

### 3. Implementation Sequence

1. **Voice Configuration**: Define the default `voiceId` for the "Professional Technician" persona in `services/elevenlabs.ts`.
2. **`VoiceNarrator` Component**:
   - Create `components/voice/VoiceNarrator.tsx`.
   - Implement `fetch` logic for audio blobs from our API route.
   - Implement `window.speechSynthesis` for fallback.
3. **Integration**:
   - Add the `<VoiceNarrator />` component into the procedure steps on the diagnosis and repair service pages.
4. **Verification**:
   - Verify TTS audio synthesis, API fallback triggering, and UI states.
