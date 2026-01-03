# SimplePad 🎹

A sleek, modern soundpad application built with Electron and featuring Apple's Liquid Glass design aesthetic.

![SimplePad](https://img.shields.io/badge/version-1.0.0-blue) ![macOS](https://img.shields.io/badge/platform-macOS-lightgrey)

![SimplePad Screenshot](./readme.jpg)

## ✨ Features

### 🎵 Sound Pads
- **Customizable Grid**: Adjustable rows and columns for your perfect layout
- **Multiple Shapes**: Square, rounded, circle, squircle, diamond, hexagon, and more
- **Audio Import**: Import local audio files or download directly from YouTube
- **Waveform Editor**: Visual trimming with precise start/end point control

### 🎛️ Audio Processing
- **Effects Chain**: Compressor, reverb, delay, filter, distortion, and more
- **EQ Control**: 3-band equalizer with adjustable frequencies
- **Pitch Control**: ±12 semitones pitch shifting
- **Stereo Imaging**: Pan and stereo width control

### 🔄 Loop Recorder
- **Record Loops**: Capture your session output as reusable loops
- **Unlimited Slots**: Record as many loops as you need
- **Toggle Playback**: Play once or loop continuously

### 🎤 Track Recorder
- **Full Session Recording**: Records all pads and loops together
- **Named Tracks**: Give your recordings custom names
- **Export Options**: Save to MP3, WAV, or OGG formats

### 💾 Project Management
- **Save Projects**: Bundle everything into a `.spad` file
- **Load Projects**: Restore your complete session instantly
- **Portable**: All audio files included in the project bundle

### 🎨 Visual Design
- **Liquid Glass UI**: Beautiful macOS-native glass effects
- **Custom Themes**: Per-pad color and style customization
- **Dark Mode**: Optimized for dark environments

---

## ⌨️ Keyboard Controls

### Pad Playback
| Key | Action |
|-----|--------|
| Assigned Key | Play pad (based on key binding) |
| Hold Key | Sustain/loop while held (if Hold Mode is "Continue") |

### Loop Recorder
| Shortcut | Action |
|----------|--------|
| `1` - `9` | Play loop 1-9 once |
| `Cmd + 1` - `Cmd + 9` | Toggle loop 1-9 |
| `Cmd + 0` | Toggle loop 10 |
| `Shift + Cmd + 0` - `Shift + Cmd + 9` | Toggle loops 11-20 |

### General
| Shortcut | Action |
|----------|--------|
| Click Pad | Play audio |
| Double-click Pad | Open pad configuration |
| Settings Icon | Open settings sidebar |

---

## 🎚️ Pad Settings

### General Tab
- **Label**: Display name on the pad
- **Key Binding**: Keyboard shortcut to trigger the pad
- **Retrigger Mode**: 
  - *Layer*: Overlapping sounds
  - *Restart*: Cut and restart
  - *Toggle*: Play/Stop
- **Hold Mode**:
  - *Continue*: Loop while key is held
  - *Loop*: Single trigger only
  - *None*: Play once completely

### Audio Tab
- **Waveform Editor**: Visual trim points
- **Fade In/Out**: Smooth transitions
- **Playback Rate**: Speed control

### Dynamics Tab
- **Compressor**: Level control with threshold/ratio
- **Limiter**: Prevent clipping

### Effects Tab
- **Reverb**: Room simulation
- **Delay**: Echo effect
- **Filter**: Low/High pass
- **Distortion**: Overdrive effect
- **Bitcrusher**: Lo-fi sound

### Output Tab
- **Master Volume**: Overall level
- **Stereo Pan**: Left/Right positioning
- **Pitch**: ±12 semitones

---

## 🛠️ Technical Requirements

- **macOS** 11.0 or later
- **FFmpeg** (for export functionality)
- ~100MB disk space

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/simplepad.git

# Install dependencies
cd simplepad
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

---

## 🙏 Credits

### Development
- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- State management with [Zustand](https://github.com/pmndrs/zustand)

### Design
- Liquid Glass effects by [electron-liquid-glass](https://github.com/nicholascm/electron-liquid-glass)
- Inspired by Apple's iOS 26 / macOS 26 design language

### Audio
- Web Audio API for real-time processing
- FFmpeg for audio conversion

### Special Thanks
- The Electron and React communities
- Apple for the beautiful Liquid Glass design inspiration

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with ❤️ for music creators everywhere.
