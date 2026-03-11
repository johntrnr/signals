import { useState, useRef, useCallback, useEffect } from 'react';

// Effect types
const effects = [
  { id: 'ascii', name: 'ASCII' },
  { id: 'dithering', name: 'Dithering' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'matrix-rain', name: 'Matrix Rain' },
  { id: 'dots', name: 'Dots' },
  { id: 'contour', name: 'Contour' },
  { id: 'pixel-sort', name: 'Pixel Sort' },
  { id: 'blockify', name: 'Blockify' },
  { id: 'threshold', name: 'Threshold' },
  { id: 'edge-detection', name: 'Edge Detection' },
  { id: 'crosshatch', name: 'Crosshatch' },
  { id: 'wave-lines', name: 'Wave Lines' },
  { id: 'noise-field', name: 'Noise Field' },
  { id: 'voronoi', name: 'Voronoi' },
  { id: 'vhs', name: 'VHS' },
];

// Character sets for ASCII effect
const charSets: Record<string, string> = {
  STANDARD: ' .:-=+*#%@',
  BLOCKS: ' ░▒▓█',
  BRAILLE: ' ⠁⠃⠇⠏⠟⠿⡿⣿',
  BINARY: '01',
  DETAILED: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
};

// Slider component
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, unit = '' }: SliderProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-grain-text-secondary text-sm w-28 shrink-0">{label}</span>
      <span className="text-grain-text-primary text-sm w-10 text-right shrink-0">
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{unit}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
    </div>
  );
}

// Collapsible section component
interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-grain-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-3 px-4 text-left hover:bg-grain-bg-hover transition-colors"
      >
        <span className="text-grain-text-secondary text-sm">{isOpen ? '-' : '+'}</span>
        <span className="text-grain-text-primary text-sm font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Image processing functions
function applyAsciiEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  charSet: string,
  bgColor: string,
  fgColor: string,
  colored: boolean
) {
  const chars = charSets[charSet] || charSets.STANDARD;
  const cellSize = Math.max(2, scale * 2);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${cellSize}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      let totalBrightness = 0;
      let r = 0, g = 0, b = 0;
      let count = 0;

      for (let dy = 0; dy < cellSize && y + dy < height; dy++) {
        for (let dx = 0; dx < cellSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          count++;
        }
      }

      const avgBrightness = totalBrightness / count;
      const charIndex = Math.floor((avgBrightness / 255) * (chars.length - 1));
      const char = chars[charIndex];

      if (colored) {
        ctx.fillStyle = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
      } else {
        ctx.fillStyle = fgColor;
      }
      ctx.fillText(char, x, y);
    }
  }
}

function applyDitheringEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Floyd-Steinberg dithering
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldR = data[i];
      const oldG = data[i + 1];
      const oldB = data[i + 2];

      const newR = oldR > 127 ? 255 : 0;
      const newG = oldG > 127 ? 255 : 0;
      const newB = oldB > 127 ? 255 : 0;

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      const distributeError = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = (ny * width + nx) * 4;
          data[ni] = Math.max(0, Math.min(255, data[ni] + errR * factor));
          data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errG * factor));
          data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errB * factor));
        }
      };

      distributeError(1, 0, 7 / 16);
      distributeError(-1, 1, 3 / 16);
      distributeError(0, 1, 5 / 16);
      distributeError(1, 1, 1 / 16);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyHalftoneEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const dotSize = Math.max(4, scale * 3);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      let totalBrightness = 0;
      let r = 0, g = 0, b = 0;
      let count = 0;

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          count++;
        }
      }

      const avgBrightness = totalBrightness / count;
      const radius = (1 - avgBrightness / 255) * (dotSize / 2) * 0.9;

      if (radius > 0.5) {
        ctx.fillStyle = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
        ctx.beginPath();
        ctx.arc(x + dotSize / 2, y + dotSize / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function applyDotsEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const dotSize = Math.max(3, scale * 2);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      let r = 0, g = 0, b = 0;
      let count = 0;

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      ctx.fillStyle = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
      ctx.beginPath();
      ctx.arc(x + dotSize / 2, y + dotSize / 2, dotSize / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function applyBlockifyEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const blockSize = Math.max(4, scale * 4);

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let r = 0, g = 0, b = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyThresholdEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number = 128
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = brightness > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyEdgeDetectionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * width + (x + kx)) * 4;
          const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          gx += brightness * sobelX[ky + 1][kx + 1];
          gy += brightness * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const i = (y * width + x) * 4;
      output[i] = magnitude;
      output[i + 1] = magnitude;
      output[i + 2] = magnitude;
      output[i + 3] = 255;
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = output[i] || (i % 4 === 3 ? 255 : 0);
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyCrosshatchEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const lineSpacing = Math.max(3, scale * 2);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y += lineSpacing) {
    for (let x = 0; x < width; x += lineSpacing) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

      if (brightness < 0.8) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lineSpacing, y + lineSpacing);
        ctx.stroke();
      }
      if (brightness < 0.5) {
        ctx.beginPath();
        ctx.moveTo(x + lineSpacing, y);
        ctx.lineTo(x, y + lineSpacing);
        ctx.stroke();
      }
      if (brightness < 0.3) {
        ctx.beginPath();
        ctx.moveTo(x, y + lineSpacing / 2);
        ctx.lineTo(x + lineSpacing, y + lineSpacing / 2);
        ctx.stroke();
      }
    }
  }
}

function applyWaveLinesEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const lineSpacing = Math.max(4, scale * 3);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;

  for (let y = 0; y < height; y += lineSpacing) {
    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const waveY = y + (1 - brightness) * lineSpacing * 0.8 * Math.sin(x * 0.1);

      if (x === 0) {
        ctx.moveTo(x, waveY);
      } else {
        ctx.lineTo(x, waveY);
      }
    }
    ctx.stroke();
  }
}

function applyMatrixRainEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const cellSize = Math.max(8, scale * 4);
  const chars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${cellSize}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = 'top';

  for (let x = 0; x < width; x += cellSize) {
    for (let y = 0; y < height; y += cellSize) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

      if (brightness > 0.1) {
        const green = Math.floor(100 + brightness * 155);
        ctx.fillStyle = `rgb(0, ${green}, 0)`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);
      }
    }
  }
}

function applyContourEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  bgColor: string
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const levels = Math.max(3, Math.floor(scale * 2));

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff'];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const brightness = Math.floor((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255 * levels);

      const iRight = (y * width + x + 1) * 4;
      const iDown = ((y + 1) * width + x) * 4;
      const bRight = Math.floor((data[iRight] * 0.299 + data[iRight + 1] * 0.587 + data[iRight + 2] * 0.114) / 255 * levels);
      const bDown = Math.floor((data[iDown] * 0.299 + data[iDown + 1] * 0.587 + data[iDown + 2] * 0.114) / 255 * levels);

      if (brightness !== bRight || brightness !== bDown) {
        ctx.fillStyle = colors[brightness % colors.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function applyPixelSortEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    const row: Array<{ r: number; g: number; b: number; brightness: number }> = [];

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      row.push({ r, g, b, brightness: r * 0.299 + g * 0.587 + b * 0.114 });
    }

    // Sort pixels in segments based on brightness threshold
    let start = 0;
    while (start < width) {
      // Find start of bright segment
      while (start < width && row[start].brightness < 50) start++;
      let end = start;
      // Find end of bright segment
      while (end < width && row[end].brightness >= 50) end++;

      if (end > start) {
        const segment = row.slice(start, end);
        segment.sort((a, b) => a.brightness - b.brightness);
        for (let i = 0; i < segment.length; i++) {
          row[start + i] = segment[i];
        }
      }
      start = end + 1;
    }

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = row[x].r;
      data[i + 1] = row[x].g;
      data[i + 2] = row[x].b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyNoiseFieldEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const noiseAmount = scale * 20;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * noiseAmount;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyVHSEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // RGB shift
  const shiftAmount = 3;
  const tempData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // Red channel shift right
      const rX = Math.min(width - 1, x + shiftAmount);
      const rI = (y * width + rX) * 4;
      data[i] = tempData[rI];

      // Blue channel shift left
      const bX = Math.max(0, x - shiftAmount);
      const bI = (y * width + bX) * 4;
      data[i + 2] = tempData[bI + 2];
    }
  }

  // Add scan lines
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i] * 0.8;
      data[i + 1] = data[i + 1] * 0.8;
      data[i + 2] = data[i + 2] * 0.8;
    }
  }

  // Add noise
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyVoronoiEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const numPoints = Math.max(50, Math.floor((width * height) / (scale * scale * 400)));

  // Generate random points
  const points: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];
  for (let i = 0; i < numPoints; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const pi = (y * width + x) * 4;
    points.push({
      x, y,
      r: data[pi],
      g: data[pi + 1],
      b: data[pi + 2]
    });
  }

  // Assign each pixel to nearest point
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearest = points[0];

      for (const point of points) {
        const dist = (x - point.x) ** 2 + (y - point.y) ** 2;
        if (dist < minDist) {
          minDist = dist;
          nearest = point;
        }
      }

      const i = (y * width + x) * 4;
      data[i] = nearest.r;
      data[i + 1] = nearest.g;
      data[i + 2] = nearest.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function App() {
  const [activeEffect, setActiveEffect] = useState('ascii');
  const [zoom, setZoom] = useState(100);
  const [hasFile, setHasFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // ASCII Settings
  const [scale, setScale] = useState(2);
  const [characterSet, setCharacterSet] = useState('STANDARD');

  // Adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hueRotation, setHueRotation] = useState(0);

  // Color settings
  const [colorMode, setColorMode] = useState('Original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  // Export settings
  const [exportFormat, setExportFormat] = useState('PNG');

  // Process the image with current effect
  const processImage = useCallback(() => {
    if (!originalImage || !canvasRef.current || !originalCanvasRef.current) return;

    const canvas = canvasRef.current;
    const originalCanvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');
    if (!ctx || !originalCtx) return;

    const width = originalImage.width;
    const height = originalImage.height;

    canvas.width = width;
    canvas.height = height;
    originalCanvas.width = width;
    originalCanvas.height = height;

    // Draw original image with adjustments
    originalCtx.filter = `
      brightness(${1 + brightness / 100})
      contrast(${1 + contrast / 100})
      saturate(${1 + saturation / 100})
      hue-rotate(${hueRotation}deg)
      ${colorMode === 'Monochrome' ? 'grayscale(100%)' : ''}
      ${colorMode === 'Sepia' ? 'sepia(100%)' : ''}
      ${colorMode === 'Inverted' ? 'invert(100%)' : ''}
    `;
    originalCtx.drawImage(originalImage, 0, 0);

    // Copy adjusted image to main canvas
    ctx.drawImage(originalCanvas, 0, 0);

    // Apply effect
    const colored = colorMode === 'Original';
    const fgColor = '#ffffff';

    switch (activeEffect) {
      case 'ascii':
        applyAsciiEffect(ctx, width, height, scale, characterSet, backgroundColor, fgColor, colored);
        break;
      case 'dithering':
        applyDitheringEffect(ctx, width, height, scale);
        break;
      case 'halftone':
        applyHalftoneEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'dots':
        applyDotsEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'blockify':
        applyBlockifyEffect(ctx, width, height, scale);
        break;
      case 'threshold':
        applyThresholdEffect(ctx, width, height, 128);
        break;
      case 'edge-detection':
        applyEdgeDetectionEffect(ctx, width, height);
        break;
      case 'crosshatch':
        applyCrosshatchEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'wave-lines':
        applyWaveLinesEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'matrix-rain':
        applyMatrixRainEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'contour':
        applyContourEffect(ctx, width, height, scale, backgroundColor);
        break;
      case 'pixel-sort':
        applyPixelSortEffect(ctx, width, height, scale);
        break;
      case 'noise-field':
        applyNoiseFieldEffect(ctx, width, height, scale);
        break;
      case 'vhs':
        applyVHSEffect(ctx, width, height, scale);
        break;
      case 'voronoi':
        applyVoronoiEffect(ctx, width, height, scale);
        break;
    }
  }, [originalImage, activeEffect, scale, characterSet, brightness, contrast, saturation, hueRotation, colorMode, backgroundColor]);

  // Process image when settings change
  useEffect(() => {
    processImage();
  }, [processImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setHasFile(true);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `grainrad-export.${exportFormat.toLowerCase()}`;
    link.href = canvasRef.current.toDataURL(`image/${exportFormat.toLowerCase()}`);
    link.click();
  };

  const resetSettings = () => {
    setScale(2);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setHueRotation(0);
    setColorMode('Original');
    setBackgroundColor('#000000');
  };

  return (
    <div className="flex h-full w-full bg-grain-bg">
      {/* Hidden canvas for original image processing */}
      <canvas ref={originalCanvasRef} className="hidden" />

      {/* Left Panel */}
      <div className="w-64 flex flex-col border-r border-grain-border bg-grain-bg shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-grain-border">
          <h1 className="text-grain-text-primary text-base font-medium tracking-wide">Grainrad</h1>
        </div>

        {/* Input Section */}
        <Section title="Input" defaultOpen={true}>
          <div className="text-grain-text-muted text-xs mb-3">
            {hasFile ? 'Ready' : 'Standby'}
          </div>
          <div
            className={`border border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-grain-text-primary bg-grain-bg-hover'
                : 'border-grain-border hover:border-grain-text-muted'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <p className="text-grain-text-secondary text-xs mb-2">
              Drop file or click to browse
            </p>
            <p className="text-grain-text-muted text-xxs">
              PNG, JPG, GIF, WebP
            </p>
          </div>
        </Section>

        {/* Effects Section */}
        <Section title="Effects" defaultOpen={true}>
          <div className="flex flex-col gap-0 overflow-y-auto flex-1">
            {effects.map((effect) => (
              <button
                key={effect.id}
                type="button"
                onClick={() => setActiveEffect(effect.id)}
                className={`flex items-center gap-3 px-1 py-1 text-left transition-colors ${
                  activeEffect === effect.id
                    ? 'text-grain-text-primary'
                    : 'text-grain-text-muted hover:text-grain-text-secondary'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activeEffect === effect.id ? 'bg-grain-text-primary' : 'border border-grain-text-muted'
                }`} />
                <span className="text-sm">{effect.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Presets Section */}
        <Section title="Presets" defaultOpen={false}>
          <p className="text-grain-text-muted text-xs">No presets saved</p>
        </Section>

        {/* Footer Links */}
        <div className="mt-auto px-4 py-4 border-t border-grain-border flex gap-4">
          <button type="button" className="text-grain-text-muted text-xs hover:text-grain-text-secondary transition-colors">
            Follow
          </button>
          <button type="button" className="text-grain-text-muted text-xs hover:text-grain-text-secondary transition-colors">
            About
          </button>
          <button type="button" className="text-grain-text-muted text-xs hover:text-grain-text-secondary transition-colors">
            Changelog
          </button>
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-grain-border bg-grain-bg">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-grain-text-primary text-sm capitalize">{activeEffect.replace('-', ' ')}</span>
            <span className="text-grain-text-muted text-xs">[CANVAS]</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="p-2 rounded hover:bg-grain-bg-hover transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grain-text-secondary">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button type="button" className="p-2 rounded hover:bg-grain-bg-hover transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grain-text-secondary">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </button>
            <button type="button" className="p-2 rounded hover:bg-grain-bg-hover transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grain-text-secondary">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className="flex-1 flex items-center justify-center bg-grain-bg relative overflow-auto p-4"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {hasFile && originalImage ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain shadow-lg"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
                imageRendering: 'pixelated'
              }}
            />
          ) : (
            <div className="text-center">
              <p className="text-grain-text-secondary text-sm mb-2">Awaiting input</p>
              <p className="text-grain-text-muted text-xs">Drop a file or select a source</p>
            </div>
          )}
        </div>

        {/* Canvas Footer */}
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-grain-border bg-grain-bg">
          <button
            type="button"
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            className="text-grain-text-muted hover:text-grain-text-secondary transition-colors px-2"
          >
            -
          </button>
          <span className="text-grain-text-primary text-sm w-12 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="text-grain-text-muted hover:text-grain-text-secondary transition-colors px-2"
          >
            +
          </button>
          <span className="text-grain-border mx-2">|</span>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="text-grain-text-muted hover:text-grain-text-secondary transition-colors text-sm"
          >
            Reset
          </button>
          <span className="text-grain-text-muted text-sm">100%</span>
        </div>
      </div>

      {/* Right Panel - Settings */}
      <div className="w-72 flex flex-col border-l border-grain-border bg-grain-bg shrink-0 overflow-y-auto">
        {/* Settings Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grain-border sticky top-0 bg-grain-bg z-10">
          <div className="flex items-center gap-2">
            <span className="text-grain-text-secondary text-sm">-</span>
            <span className="text-grain-text-primary text-sm font-medium">Settings</span>
          </div>
          <button
            type="button"
            className="text-grain-text-muted text-xs hover:text-grain-text-secondary transition-colors"
            onClick={resetSettings}
          >
            Reset
          </button>
        </div>

        {/* Effect Settings */}
        <div className="px-4 py-3 border-b border-grain-border">
          <h3 className="text-grain-text-muted text-xs mb-3 uppercase tracking-wider">
            {activeEffect.toUpperCase().replace('-', ' ')}
          </h3>
          <div className="space-y-1">
            <Slider label="Scale" value={scale} min={1} max={10} onChange={setScale} />
            {activeEffect === 'ascii' && (
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-grain-text-secondary text-sm">Character Set</span>
                <select
                  value={characterSet}
                  onChange={(e) => setCharacterSet(e.target.value)}
                  className="flex-1 max-w-[140px]"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="BLOCKS">BLOCKS</option>
                  <option value="BRAILLE">BRAILLE</option>
                  <option value="BINARY">BINARY</option>
                  <option value="DETAILED">DETAILED</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Adjustments */}
        <div className="px-4 py-3 border-b border-grain-border">
          <h3 className="text-grain-text-muted text-xs mb-3 uppercase tracking-wider">Adjustments</h3>
          <div className="space-y-1">
            <Slider label="Brightness" value={brightness} min={-100} max={100} onChange={setBrightness} />
            <Slider label="Contrast" value={contrast} min={-100} max={100} onChange={setContrast} />
            <Slider label="Saturation" value={saturation} min={-100} max={100} onChange={setSaturation} />
            <Slider label="Hue Rotation" value={hueRotation} min={0} max={360} onChange={setHueRotation} unit="°" />
          </div>
        </div>

        {/* Color */}
        <div className="px-4 py-3 border-b border-grain-border">
          <h3 className="text-grain-text-muted text-xs mb-3 uppercase tracking-wider">Color</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-grain-text-secondary text-sm">Mode</span>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
                className="flex-1 max-w-[140px]"
              >
                <option value="Original">Original</option>
                <option value="Monochrome">Monochrome</option>
                <option value="Sepia">Sepia</option>
                <option value="Inverted">Inverted</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-grain-text-secondary text-sm">Background</span>
              <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-6 h-6 rounded border border-grain-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="px-4 py-3 border-b border-grain-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-grain-text-secondary text-sm">-</span>
            <span className="text-grain-text-primary text-sm font-medium">Export</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-grain-text-secondary text-sm">Format</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('PNG')}
                className={`flex-1 py-2 px-4 text-sm border transition-colors ${
                  exportFormat === 'PNG'
                    ? 'border-grain-text-primary text-grain-text-primary bg-grain-bg-hover'
                    : 'border-grain-border text-grain-text-muted hover:border-grain-text-muted'
                }`}
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('JPEG')}
                className={`flex-1 py-2 px-4 text-sm border transition-colors ${
                  exportFormat === 'JPEG'
                    ? 'border-grain-text-primary text-grain-text-primary bg-grain-bg-hover'
                    : 'border-grain-border text-grain-text-muted hover:border-grain-text-muted'
                }`}
              >
                JPEG
              </button>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasFile}
              className="w-full py-2 px-4 text-sm border border-grain-text-primary text-grain-text-primary hover:bg-grain-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
