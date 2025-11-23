# Piano Flow 🎹

A beautiful, interactive 3D piano visualizer with falling notes in the style of Rousseau/Synthesia. Built with Next.js, Three.js, and Tone.js.

![Piano Flow Demo](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- **Dual View Modes**
  - **3D View**: Fully interactive 3D perspective with free camera movement
  - **Top Down View**: Classic Synthesia-style falling notes from above

- **Rich Visual Effects**
  - Smooth falling note animations
  - Particle effects on key hits
  - Sparkle effects for visual flair
  - Bloom post-processing for glowing notes
  - Color-coded notes (Magenta for left hand, Cyan for right hand)

- **Advanced Playback Controls**
  - Play/Pause functionality
  - Adjustable playback speed (0.25x - 2x)
  - Volume control
  - Seek through timeline
  - Hand filtering (Both/Left/Right hand)

- **MIDI Support**
  - Upload your own MIDI files
  - Included sample songs
  - Real-time audio synthesis using Tone.js
  - Grand piano and electric piano sounds

- **Smooth Camera Transitions**
  - Animated transitions between view modes
  - Auto-rotating camera in menu state
  - Interactive controls with damping

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gobienan/piano-tutorial-player.git
cd piano-tutorial-player
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 Usage

1. **Upload a MIDI file** or select one of the sample songs
2. **Choose your view mode**: 3D for free exploration or Top Down for classic Synthesia style
3. **Control playback** with the play/pause button
4. **Adjust settings**:
   - Speed slider (left side)
   - Volume slider (right side)
   - Hand filter buttons (top bar)
5. **Navigate the camera**:
   - **3D Mode**: Left-click to rotate, right-click to pan, scroll to zoom
   - **Top Down Mode**: Left-click to pan (2-axis movement), scroll to zoom

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **3D Graphics**: [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **Audio**: [Tone.js](https://tonejs.github.io/)
- **MIDI Parsing**: [@tonejs/midi](https://github.com/Tonejs/Midi)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Post-Processing**: [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)

## 📁 Project Structure

```
piano-tutorial-player/
├── app/                    # Next.js app directory
├── components/
│   ├── piano-player.tsx   # Main player component with controls
│   ├── piano-visualizer.tsx # 3D visualization logic
│   └── ui/                # Reusable UI components
├── public/
│   └── midi/              # Sample MIDI files
└── README.md
```

## 🎨 Customization

### Adjusting Audio Sync

If you notice audio-visual desync, adjust the `AUDIO_OFFSET` constant in `components/piano-player.tsx`:

```typescript
const AUDIO_OFFSET = -0.05 // Negative = play earlier, Positive = play later
```

### Changing Colors

Modify the `COLORS` object in `components/piano-visualizer.tsx`:

```typescript
const COLORS = {
  cyan: "#4dd0e1",      // Right hand notes
  magenta: "#ce93d8",   // Left hand notes
  gold: "#ffb74d",      // Impact bar
  // ... more colors
}
```

### Note Speed

Adjust the falling speed in `components/piano-visualizer.tsx`:

```typescript
const NOTE_SPEED = 25 // Units per second
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Rousseau](https://www.youtube.com/c/Rousseau) and [Synthesia](https://synthesiagame.com/)
- Piano samples from [Tone.js Salamander Piano](https://tonejs.github.io/audio/salamander/)
- Built with amazing open-source libraries

## 📧 Contact

Gobie - [@gobienan](https://twitter.com/gobienan)

Project Link: [https://github.com/gobienan/piano-tutorial-player](https://github.com/gobienan/piano-tutorial-player)

---

Made with ❤️ and Three.js
