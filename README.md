# SiliconBench

**SiliconBench** is an online microcontroller web IDE and real-time hardware simulator for testing **Arduino C++** and **MicroPython** firmware directly in the browser—complete with pixel-accurate OLED, Color TFT, Character LCD, and addressable LED display simulation, live PCB pinouts, interactive peripherals, and a multi-channel logic analyzer.

---

## Features

- **Multi-Platform Microcontroller Targets**
  - **Arduino Uno R3** (`ATmega328P`, 16 MHz, 5V)
  - **Arduino Mega 2560** (`ATmega2560`, 16 MHz, 5V)
  - **ESP32 DevKit V1** (`Xtensa LX6 Dual`, 240 MHz, 3.3V)
  - **NodeMCU ESP8266** (`L106`, 80 MHz, 3.3V)
  - **Raspberry Pi Pico** (`RP2040 Dual Cortex-M0+`, 133 MHz, 3.3V — Arduino C++ & MicroPython)
  - **STM32F103C8 Blue Pill** (`ARM Cortex-M3`, 72 MHz, 3.3V)
  - **Teensy 4.0** (`ARM Cortex-M7`, 600 MHz, 3.3V)
  - **ATtiny85 Digispark** (`AVR 8-bit`, 8 MHz, 5V)

- **Real-Time Display & LED Hardware Simulation**
  - **OLED Displays**: 128×64 & 128×32 `SSD1306` (`Adafruit_SSD1306`, `U8g2lib`, MicroPython `ssd1306`) with dual-zone cyan/yellow, white, and blue phosphor modes, pixel grid overlay, and PNG screenshot capture.
  - **Color TFT Displays**: 320×240 `ILI9341` & 160×128 `ST7735` 16-bit RGB565 SPI TFTs (`TFT_eSPI`, `Adafruit_ILI9341`, `Adafruit_ST7735`) with hardware drawing primitives, rotation, and live XY crosshair coordinate inspection.
  - **Character LCDs**: 16×2 & 20×4 `HD44780` I2C LCDs (`LiquidCrystal_I2C`) with green/blue backlight control and custom CGRAM glyphs (`createChar()` / `write()`).
  - **Addressable & Matrix LEDs**: `WS2812B` 8×8 RGB Matrix, 16-LED Ring, and 16-LED Strip (`FastLED`, `Adafruit_NeoPixel`, MicroPython `neopixel`), plus `MAX7219` 8×8 Red Matrix (`LedControl`) and `TM1637` 4-Digit 7-Segment Display.

- **Supported Embedded Libraries**
  - `Arduino.h`, `Wire.h`, `SPI.h`
  - `Adafruit_GFX.h`, `Adafruit_SSD1306.h`, `U8g2lib.h`
  - `TFT_eSPI.h`, `Adafruit_ILI9341.h`, `Adafruit_ST7735.h`
  - `LiquidCrystal_I2C.h`, `LiquidCrystal.h`
  - `FastLED.h`, `Adafruit_NeoPixel.h`
  - `LedControl.h`, `TM1637Display.h`
  - `DHT.h`, `Servo.h`
  - MicroPython `machine` (`Pin`, `I2C`, `ADC`, `PWM`), `ssd1306`, `neopixel`, `time`

- **Interactive Bench Peripherals & Instrumentation**
  - Live SVG PCB pinout highlighting `HIGH`, `PWM`, `ADC`, and onboard `LED_BUILTIN` states.
  - Momentary and latching pushbuttons, dual analog potentiometers, DHT22 temperature/humidity sliders, live PWM Servo horn gauge, and Web Audio piezo buzzer (`tone()` / `noTone()`).
  - **Bottom Telemetry Tray**: Interactive **Serial Monitor** (TX/RX input & timestamps), multi-channel **Logic Analyzer** waveform canvas, **Pin Matrix** live table, and **Compiler Log**.

- **Direct Web Redirect URL Sharing & File I/O**
  - Encode any board, display configuration, language, and source code into a shareable `#sketch=...` redirect link.
  - Import/export `.ino`, `.cpp`, and `.py` files, or load sketches from raw remote URLs.

---

## Project Structure

```text
src/
├── App.tsx                       # Main workbench layout & simulation orchestration
├── index.css                     # Tailwind CSS v4 styles & pixelated canvas rules
├── types/
│   └── hardware.ts               # Board, display, peripheral, and runtime types
├── data/
│   ├── boards.ts                 # Pinouts & specs for 8 MCUs and 11 display modules
│   ├── libraries.ts              # Supported library registry & API documentation
│   └── examples.ts               # 10 runnable Arduino C++ & MicroPython examples
├── engine/
│   ├── displayBuffer.ts          # Pixel-level framebuffer, RGB565 math, and 5×7 font
│   ├── transpiler.ts             # Arduino C++ to cooperative async JS transpiler
│   ├── micropython.ts            # MicroPython to cooperative async JS transpiler
│   └── simulator.ts              # Hardware runtime, GPIO/ADC/PWM, WebAudio, & drivers
└── components/
    ├── HeaderBar.tsx             # Top navigation & simulation run/stop control
    ├── CodeEditor.tsx            # Syntax-highlighted editor, board/lang switcher, I/O
    ├── DisplayBench.tsx          # Hardware display & LED visualizers
    ├── BoardVisualizer.tsx       # Interactive SVG PCB pinout monitor
    ├── PeripheralsPanel.tsx      # Pushbuttons, pots, DHT22, Servo, & Piezo controls
    ├── BottomTelemetryTray.tsx   # Serial Monitor, Logic Analyzer, Pin Matrix, Compiler
    ├── LibraryExplorer.tsx       # Searchable API docs with 1-click snippet insert
    ├── ExamplesGallery.tsx       # Filterable example gallery
    └── ShareModal.tsx            # Redirect URL generator & remote sketch loader
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Typecheck
npm run lint

# Build for production
npm run build
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Build Tooling**: Vite 8
- **Simulation**: Custom cooperative async C++/MicroPython transpilers, HTML5 Canvas pixel framebuffers, and Web Audio API synthesis
