export type BoardId =
  | 'arduino_uno'
  | 'arduino_mega'
  | 'esp32_devkit'
  | 'esp8266_nodemcu'
  | 'rp2040_pico'
  | 'stm32_bluepill'
  | 'teensy_40'
  | 'attiny85';

export type LanguageMode = 'arduino_cpp' | 'micropython';

export type DisplayType =
  | 'ssd1306_128x64'
  | 'ssd1306_128x32'
  | 'ili9341_320x240'
  | 'st7735_160x128'
  | 'lcd_16x2'
  | 'lcd_20x4'
  | 'neopixel_matrix_8x8'
  | 'neopixel_ring_16'
  | 'neopixel_strip_16'
  | 'max7219_8x8'
  | 'tm1637_4digit';

export type PinCapability = 'GPIO' | 'PWM' | 'ADC' | 'I2C' | 'SPI' | 'UART' | 'DAC' | 'POWER' | 'GND';

export interface PinSpec {
  id: string;
  gpio: number;
  label: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  index: number;
  capabilities: PinCapability[];
  alias?: string;
}

export interface BoardSpec {
  id: BoardId;
  name: string;
  shortName: string;
  mcu: string;
  architecture: string;
  clockMHz: number;
  voltage: string;
  flashKB: number;
  sramKB: number;
  adcBits: number;
  pwmBits: number;
  ledBuiltinPin: number;
  defaultI2C: { sda: string; scl: string };
  defaultSPI: { mosi: string; miso: string; sck: string; cs: string };
  supportsMicroPython: boolean;
  pcbColor: string;
  accentColor: string;
  pins: PinSpec[];
}

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'ANALOG' | 'PWM' | 'I2C' | 'SPI';

export interface PinRuntimeState {
  gpio: number;
  label: string;
  mode: PinMode;
  digitalValue: 0 | 1;
  pwmDuty: number; // 0..255 (or normalized 0..1)
  analogValue: number; // raw ADC reading
  lastChangedMs: number;
}

export interface LogicSample {
  timeMs: number;
  channels: Record<number, number>; // gpio -> 0 | 1 | normalized PWM
}

export interface SerialEntry {
  id: number;
  timestampMs: number;
  direction: 'TX' | 'RX' | 'SYS';
  text: string;
}

export interface CompilerDiagnostic {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface PeripheralInputs {
  button1Pin: number;
  button1Pressed: boolean;
  button2Pin: number;
  button2Pressed: boolean;
  pot1Pin: number; // e.g. 14 (A0) or 34
  pot1Value: number; // 0..1023 normalized 0..1
  pot2Pin: number;
  pot2Value: number; // 0..1
  dhtTempC: number;
  dhtHumidity: number;
  servoPin: number;
  servoAngle: number; // 0..180
  buzzerPin: number;
  buzzerFreqHz: number;
  buzzerActive: boolean;
  buzzerMuted: boolean;
}

export interface LibraryFunctionDoc {
  signature: string;
  description: string;
  example: string;
}

export interface LibrarySpec {
  id: string;
  header: string;
  name: string;
  category: 'Core' | 'OLED' | 'TFT' | 'Character LCD' | 'LED Matrix & Strip' | 'Sensors & Actuators' | 'MicroPython';
  version: string;
  description: string;
  supportedLanguages: LanguageMode[];
  constructorExample: string;
  functions: LibraryFunctionDoc[];
}

export interface ExampleProject {
  id: string;
  title: string;
  subtitle: string;
  board: BoardId;
  language: LanguageMode;
  display: DisplayType;
  libraries: string[];
  code: string;
}

export interface DisplayMetadata {
  id: DisplayType;
  name: string;
  controller: string;
  interfaceType: 'I2C (0x3C)' | 'SPI' | 'I2C (0x27)' | '1-Wire WS2812B' | 'SPI (MAX7219)' | '2-Wire CLK/DIO';
  resolution: string;
  colorDepth: string;
  description: string;
}
