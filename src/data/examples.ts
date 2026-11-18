import { ExampleProject } from '../types/hardware';

export const EXAMPLES: ExampleProject[] = [
  {
    id: 'oled_telemetry',
    title: 'SSD1306 OLED Live Telemetry & Waveform',
    subtitle: '128×64 I2C OLED · DHT22 + ADC Potentiometer + Pushbutton Mode',
    board: 'esp32_devkit',
    language: 'arduino_cpp',
    display: 'ssd1306_128x64',
    libraries: ['Wire.h', 'Adafruit_GFX.h', 'Adafruit_SSD1306.h', 'DHT.h'],
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define BTN_PIN 4
#define POT_PIN 34

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
DHT dht(15, DHT22);

int wave[64];
int waveIdx = 0;
bool invertMode = false;
int lastBtn = HIGH;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
  dht.begin();

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(12, 24);
  display.println("SILICONBENCH OLED");
  display.display();
  Serial.println("ESP32 + SSD1306 Telemetry Ready");
  delay(500);
}

void loop() {
  int btn = digitalRead(BTN_PIN);
  if (btn == LOW && lastBtn == HIGH) {
    invertMode = !invertMode;
    display.invertDisplay(invertMode);
    Serial.println(invertMode ? "Mode: INVERTED" : "Mode: NORMAL");
  }
  lastBtn = btn;

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int rawAdc = analogRead(POT_PIN);
  int barW = map(rawAdc, 0, 4095, 0, 52);

  // Heartbeat LED on GPIO2
  digitalWrite(LED_BUILTIN, (millis() / 300) % 2);

  // Shift waveform history
  for (int i = 0; i < 63; i++) {
    wave[i] = wave[i + 1];
  }
  wave[63] = map(rawAdc, 0, 4095, 58, 28);

  display.clearDisplay();
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setCursor(4, 2);
  display.print("ENV + ADC SCOPE");

  display.setTextColor(SSD1306_WHITE);
  display.setCursor(4, 16);
  display.print("T:");
  display.print(String(temp, 1));
  display.print("C  H:");
  display.print(String(hum, 0));
  display.print("%");

  // Left bar gauge
  display.drawRect(4, 28, 54, 10, SSD1306_WHITE);
  display.fillRect(5, 29, barW, 8, SSD1306_WHITE);
  display.setCursor(4, 44);
  display.print("ADC:");
  display.print(rawAdc);

  // Right live oscilloscope trace
  display.drawRect(61, 26, 63, 35, SSD1306_WHITE);
  for (int x = 1; x < 60; x++) {
    display.drawLine(62 + x - 1, wave[x - 1], 62 + x, wave[x], SSD1306_WHITE);
  }

  display.display();
  delay(45);
}
`,
  },
  {
    id: 'ili9341_oscilloscope',
    title: 'ILI9341 Color TFT Radar & Spectrum',
    subtitle: '320×240 16-bit RGB565 SPI TFT · TFT_eSPI + Analog Controls',
    board: 'esp32_devkit',
    language: 'arduino_cpp',
    display: 'ili9341_320x240',
    libraries: ['SPI.h', 'TFT_eSPI.h', 'DHT.h'],
    code: `#include <SPI.h>
#include <TFT_eSPI.h>
#include <DHT.h>

TFT_eSPI tft = TFT_eSPI();
DHT dht(4, DHT22);

float angle = 0;
int sweepX = 18;

void drawGrid() {
  tft.fillScreen(TFT_BLACK);
  tft.fillRect(0, 0, 320, 26, TFT_NAVY);
  tft.drawFastHLine(0, 26, 320, TFT_CYAN);
  tft.setTextColor(TFT_WHITE, TFT_NAVY);
  tft.setTextSize(2);
  tft.setCursor(10, 5);
  tft.print("ILI9341 TELEMETRY HUD");

  // Radar frame
  tft.drawRoundRect(8, 34, 146, 198, 6, TFT_DARKGREY);
  tft.drawCircle(81, 134, 58, TFT_DARKGREEN);
  tft.drawCircle(81, 134, 34, TFT_DARKGREEN);
  tft.drawFastHLine(21, 134, 120, TFT_DARKGREEN);
  tft.drawFastVLine(81, 74, 120, TFT_DARKGREEN);

  // Telemetry panel
  tft.drawRoundRect(162, 34, 150, 198, 6, TFT_DARKGREY);
  tft.setTextSize(1);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setCursor(172, 44);
  tft.print("SIGNAL GAIN (POT1)");
  tft.setCursor(172, 92);
  tft.print("PHASE FREQ (POT2)");
  tft.setCursor(172, 144);
  tft.print("AMBIENT SENSOR");
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  tft.init();
  tft.setRotation(1);
  dht.begin();
  drawGrid();
  Serial.println("ILI9341 320x240 TFT Initialized");
}

void loop() {
  int pot1 = analogRead(34);
  int pot2 = analogRead(35);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Clear radar interior and redraw rings
  tft.fillCircle(81, 134, 56, TFT_BLACK);
  tft.drawCircle(81, 134, 56, TFT_DARKGREEN);
  tft.drawCircle(81, 134, 32, TFT_DARKGREEN);
  tft.drawFastHLine(25, 134, 112, TFT_DARKGREEN);
  tft.drawFastVLine(81, 78, 112, TFT_DARKGREEN);

  // Rotating radar sweep vector
  float rad = angle * DEG_TO_RAD;
  int rx = 81 + cos(rad) * 54;
  int ry = 134 + sin(rad) * 54;
  tft.drawLine(81, 134, rx, ry, TFT_GREEN);
  tft.fillCircle(81 + cos(rad - 0.5) * 38, 134 + sin(rad - 0.5) * 38, 3, TFT_YELLOW);

  // Gain bar
  int gPct = map(pot1, 0, 4095, 0, 100);
  int fPct = map(pot2, 0, 4095, 0, 100);
  tft.fillRect(172, 58, 128, 14, TFT_BLACK);
  tft.drawRect(172, 58, 128, 14, TFT_DARKGREY);
  tft.fillRect(174, 60, map(gPct, 0, 100, 0, 124), 10, TFT_CYAN);

  tft.fillRect(172, 106, 128, 14, TFT_BLACK);
  tft.drawRect(172, 106, 128, 14, TFT_DARKGREY);
  tft.fillRect(174, 108, map(fPct, 0, 100, 0, 124), 10, TFT_ORANGE);

  // Readout values
  tft.setTextSize(2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.fillRect(172, 160, 130, 56, TFT_BLACK);
  tft.setCursor(172, 162);
  tft.print(String(temp, 1));
  tft.print(" C");
  tft.setTextColor(TFT_SKYBLUE, TFT_BLACK);
  tft.setCursor(172, 188);
  tft.print(String(hum, 1));
  tft.print(" %RH");

  angle += 6 + map(pot2, 0, 4095, 1, 16);
  if (angle >= 360) angle -= 360;
  digitalWrite(LED_BUILTIN, (millis() / 250) % 2);
  delay(45);
}
`,
  },
  {
    id: 'st7735_stm32_gauge',
    title: 'ST7735 Color TFT Horizon & Voltage Meter',
    subtitle: '160×128 SPI Color TFT · STM32 Blue Pill + Adafruit_ST7735',
    board: 'stm32_bluepill',
    language: 'arduino_cpp',
    display: 'st7735_160x128',
    libraries: ['SPI.h', 'Adafruit_GFX.h', 'Adafruit_ST7735.h'],
    code: `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

Adafruit_ST7735 tft = Adafruit_ST7735(4, 3, 2);

int prevX = 80;
int prevY = 64;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ST77XX_BLACK);
  tft.drawRect(0, 0, 160, 128, ST77XX_CYAN);
  tft.fillRect(0, 0, 160, 18, ST77XX_BLUE);
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(1);
  tft.setCursor(8, 5);
  tft.print("STM32F103 ST7735 GAUGE");
  Serial.println("STM32 ST7735 Started");
}

void loop() {
  int raw = analogRead(A0);
  float volts = (raw / 4095.0) * 3.3;
  int needleDeg = map(raw, 0, 4095, -150, -30);
  float rad = needleDeg * DEG_TO_RAD;

  // Clear dial interior
  tft.fillCircle(80, 96, 46, ST77XX_BLACK);
  tft.drawCircle(80, 96, 46, ST77XX_CYAN);
  tft.drawCircle(80, 96, 44, ST77XX_BLUE);

  int nx = 80 + cos(rad) * 40;
  int ny = 96 + sin(rad) * 40;
  tft.drawLine(80, 96, nx, ny, ST77XX_ORANGE);
  tft.fillCircle(80, 96, 4, ST77XX_WHITE);

  tft.fillRect(10, 24, 140, 20, ST77XX_BLACK);
  tft.setTextSize(2);
  tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
  tft.setCursor(32, 26);
  tft.print(String(volts, 2));
  tft.print(" V");

  digitalWrite(LED_BUILTIN, (millis() / 400) % 2);
  delay(50);
}
`,
  },
  {
    id: 'fastled_matrix_plasma',
    title: 'FastLED 8×8 RGB Matrix Rainbow & Pulse',
    subtitle: '64× WS2812B RGB LEDs · FastLED CHSV Plasma + Button Palette Switch',
    board: 'arduino_uno',
    language: 'arduino_cpp',
    display: 'neopixel_matrix_8x8',
    libraries: ['FastLED.h'],
    code: `#include <FastLED.h>

#define LED_PIN 6
#define NUM_LEDS 64
#define BTN_PIN 2

CRGB leds[NUM_LEDS];
uint8_t baseHue = 0;
int patternMode = 0;
int prevBtn = HIGH;

void setup() {
  Serial.begin(115200);
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(220);
  Serial.println("FastLED 8x8 Matrix Ready (Press BTN1 to cycle modes)");
}

void loop() {
  int btn = digitalRead(BTN_PIN);
  if (btn == LOW && prevBtn == HIGH) {
    patternMode = (patternMode + 1) % 3;
    Serial.print("Pattern mode -> ");
    Serial.println(patternMode);
  }
  prevBtn = btn;

  int speedBoost = map(analogRead(A0), 0, 1023, 1, 8);

  for (int y = 0; y < 8; y++) {
    for (int x = 0; x < 8; x++) {
      int idx = y * 8 + x;
      if (patternMode == 0) {
        // Diagonal HSV plasma wave
        uint8_t hue = baseHue + (x * 16) + (y * 16);
        uint8_t val = sin8(baseHue * 2 + x * 32 - y * 24);
        leds[idx] = CHSV(hue, 240, max(50, val));
      } else if (patternMode == 1) {
        // Concentric radial rings
        int dx = abs(x - 3.5);
        int dy = abs(y - 3.5);
        int dist = (dx + dy) * 24;
        leds[idx] = CHSV(baseHue + dist, 255, 255);
      } else {
        // Matrix rain columns
        uint8_t drop = (baseHue / 8 + x * 3) % 10;
        uint8_t bright = (y == drop) ? 255 : (y == (drop + 7) % 8 ? 110 : 20);
        leds[idx] = CHSV(96, 255, bright);
      }
    }
  }

  FastLED.show();
  baseHue += speedBoost;
  digitalWrite(LED_BUILTIN, (millis() / 500) % 2);
  delay(35);
}
`,
  },
  {
    id: 'neopixel_ring_gauge',
    title: 'NeoPixel 16-LED Ring Interactive Gauge',
    subtitle: 'WS2812B 16-LED Ring · Potentiometer Arc + Piezo Chime',
    board: 'arduino_uno',
    language: 'arduino_cpp',
    display: 'neopixel_ring_16',
    libraries: ['Adafruit_NeoPixel.h'],
    code: `#include <Adafruit_NeoPixel.h>

#define PIN 6
#define NUMPIXELS 16

Adafruit_NeoPixel strip(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);
int lastLit = -1;

void setup() {
  Serial.begin(115200);
  pinMode(2, INPUT_PULLUP);
  strip.begin();
  strip.setBrightness(220);
  strip.show();
  Serial.println("NeoPixel 16-Ring Gauge Active (Adjust POT1)");
}

void loop() {
  int pot = analogRead(A0);
  int litCount = map(pot, 0, 1023, 1, NUMPIXELS);
  bool rainbowMode = (digitalRead(2) == LOW);

  if (litCount != lastLit) {
    tone(8, 260 + litCount * 45, 40);
    lastLit = litCount;
  }

  strip.clear();
  for (int i = 0; i < litCount; i++) {
    if (rainbowMode) {
      strip.setPixelColor(i, strip.ColorHSV((i * 4096 + millis() * 20) % 65535, 255, 255));
    } else {
      int r = map(i, 0, NUMPIXELS - 1, 0, 255);
      int g = map(i, 0, NUMPIXELS - 1, 220, 40);
      int b = map(i, 0, NUMPIXELS - 1, 255, 0);
      strip.setPixelColor(i, strip.Color(r, g, b));
    }
  }
  strip.show();
  delay(40);
}
`,
  },
  {
    id: 'lcd_16x2_servo',
    title: '16×2 I2C LCD Environmental & Servo Console',
    subtitle: 'HD44780 16×2 LCD · Custom CGRAM Icons + DHT22 + PWM Servo',
    board: 'arduino_uno',
    language: 'arduino_cpp',
    display: 'lcd_16x2',
    libraries: ['Wire.h', 'LiquidCrystal_I2C.h', 'DHT.h', 'Servo.h'],
    code: `#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <Servo.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(4, DHT22);
Servo damper;

byte thermoIcon[8] = {
  B00100,
  B01010,
  B01010,
  B01110,
  B01110,
  B11111,
  B11111,
  B01110
};

byte dropIcon[8] = {
  B00100,
  B00100,
  B01010,
  B01010,
  B10001,
  B10001,
  B10001,
  B01110
};

void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, thermoIcon);
  lcd.createChar(1, dropIcon);
  dht.begin();
  damper.attach(9);
  Serial.println("16x2 LCD + Servo Damper Online");
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int pot = analogRead(A0);
  int angle = map(pot, 0, 1023, 0, 180);
  damper.write(angle);

  if (digitalRead(2) == LOW) {
    lcd.noBacklight();
  } else {
    lcd.backlight();
  }

  lcd.setCursor(0, 0);
  lcd.write(0);
  lcd.print(" ");
  lcd.print(String(t, 1));
  lcd.print("C  ");
  lcd.write(1);
  lcd.print(" ");
  lcd.print(String(h, 0));
  lcd.print("%  ");

  lcd.setCursor(0, 1);
  lcd.print("SRV:");
  lcd.print(angle);
  lcd.print("deg ");
  int bars = map(angle, 0, 180, 0, 6);
  for (int i = 0; i < 6; i++) {
    lcd.print(i < bars ? "#" : ".");
  }

  delay(80);
}
`,
  },
  {
    id: 'u8g2_teensy_clock',
    title: 'U8g2 Vector Radar & Orbit on Teensy 4.0',
    subtitle: '128×64 OLED · U8g2lib + 600MHz ARM Cortex-M7 Simulation',
    board: 'teensy_40',
    language: 'arduino_cpp',
    display: 'ssd1306_128x64',
    libraries: ['Wire.h', 'U8g2lib.h'],
    code: `#include <Wire.h>
#include <U8g2lib.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0);

float phase = 0.0;

void setup() {
  Serial.begin(115200);
  pinMode(13, OUTPUT);
  u8g2.begin();
  Serial.println("Teensy 4.0 U8g2 Engine Ready");
}

void loop() {
  int secs = millis() / 1000;
  int mins = (secs / 60) % 60;
  int remSec = secs % 60;
  char timeBuf[16];
  sprintf(timeBuf, "%02d:%02d", mins, remSec);

  u8g2.clearBuffer();
  u8g2.drawRFrame(0, 0, 128, 64, 4);
  u8g2.setFont(u8g2_font_ncenB14_tr);
  u8g2.drawStr(8, 28, timeBuf);

  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(8, 44, "TEENSY 4.0");
  u8g2.drawStr(8, 56, "ARM M7 600MHz");

  // Orbit animation
  int cx = 100, cy = 32;
  u8g2.drawCircle(cx, cy, 20);
  u8g2.drawCircle(cx, cy, 11);
  u8g2.drawDisc(cx + cos(phase) * 20, cy + sin(phase) * 20, 3);
  u8g2.drawDisc(cx + cos(-phase * 1.8) * 11, cy + sin(-phase * 1.8) * 11, 2);

  u8g2.sendBuffer();
  phase += 0.14;
  digitalWrite(13, (millis() / 200) % 2);
  delay(35);
}
`,
  },
  {
    id: 'rp2040_micropython_oled',
    title: 'Raspberry Pi Pico MicroPython OLED & ADC',
    subtitle: 'RP2040 MicroPython · machine.Pin, ADC, SSD1306_I2C',
    board: 'rp2040_pico',
    language: 'micropython',
    display: 'ssd1306_128x64',
    libraries: ['machine', 'ssd1306', 'time'],
    code: `from machine import Pin, I2C, ADC
from ssd1306 import SSD1306_I2C
import time

led = Pin(25, Pin.OUT)
adc0 = ADC(26)
i2c = I2C(0, scl=Pin(5), sda=Pin(4))
oled = SSD1306_I2C(128, 64, i2c)

print("RP2040 MicroPython Booted")
tick = 0

while True:
    raw = adc0.read_u16()
    volts = (raw / 65535.0) * 3.3
    pct = int((raw / 65535.0) * 100)
    led.toggle()

    oled.fill(0)
    oled.rect(0, 0, 128, 64, 1)
    oled.fill_rect(0, 0, 128, 12, 1)
    oled.text("RP2040 PYTHON", 10, 2, 0)

    oled.text(f"ADC0: {volts:.2f}V", 8, 20, 1)
    oled.text(f"LOAD: {pct}%", 8, 32, 1)
    oled.rect(8, 46, 112, 10, 1)
    oled.fill_rect(10, 48, int(pct * 1.08), 6, 1)
    oled.show()

    if tick % 15 == 0:
        print(f"ADC0={raw} ({volts:.2f}V)")
    tick = tick + 1
    time.sleep_ms(60)
`,
  },
  {
    id: 'max7219_tm1637_counter',
    title: 'MAX7219 8×8 LED Matrix Animated Sprite',
    subtitle: 'SPI MAX7219 Matrix · LedControl + Interactive Speed Control',
    board: 'arduino_mega',
    language: 'arduino_cpp',
    display: 'max7219_8x8',
    libraries: ['LedControl.h'],
    code: `#include <LedControl.h>

LedControl lc = LedControl(51, 52, 53, 1);

byte frameA[8] = {
  B00111100,
  B01000010,
  B10100101,
  B10000001,
  B10100101,
  B10011001,
  B01000010,
  B00111100
};

byte frameB[8] = {
  B00111100,
  B01000010,
  B10100101,
  B10000001,
  B10011001,
  B10100101,
  B01000010,
  B00111100
};

bool toggle = false;

void setup() {
  Serial.begin(115200);
  lc.shutdown(0, false);
  lc.setIntensity(0, 10);
  lc.clearDisplay(0);
  Serial.println("MAX7219 8x8 Matrix Ready");
}

void loop() {
  int waitMs = map(analogRead(A0), 0, 1023, 120, 700);
  for (int r = 0; r < 8; r++) {
    lc.setRow(0, r, toggle ? frameB[r] : frameA[r]);
  }
  toggle = !toggle;
  delay(waitMs);
}
`,
  },
  {
    id: 'tm1637_stopwatch',
    title: 'TM1637 4-Digit 7-Segment Timer & Counter',
    subtitle: '2-Wire TM1637 Display · Button Reset & Blinking Colon',
    board: 'arduino_uno',
    language: 'arduino_cpp',
    display: 'tm1637_4digit',
    libraries: ['TM1637Display.h'],
    code: `#include <TM1637Display.h>

#define CLK 4
#define DIO 5

TM1637Display display(CLK, DIO);
unsigned long zeroTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(2, INPUT_PULLUP);
  display.setBrightness(7);
  Serial.println("TM1637 4-Digit Stopwatch Ready (BTN1 resets)");
}

void loop() {
  if (digitalRead(2) == LOW) {
    zeroTime = millis();
    Serial.println("Stopwatch Reset!");
  }
  unsigned long sec = (millis() - zeroTime) / 1000;
  int mm = (sec / 60) % 100;
  int ss = sec % 60;
  int val = mm * 100 + ss;
  uint8_t colon = ((millis() / 500) % 2) ? 0x40 : 0x00;

  display.showNumberDecEx(val, colon, true);
  delay(80);
}
`,
  },
];
