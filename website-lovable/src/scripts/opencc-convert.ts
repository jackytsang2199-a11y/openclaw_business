import * as OpenCC from 'opencc-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../public/locales/zh-HK');
const OUTPUT_DIR = path.resolve(__dirname, '../public/locales/zh-CN');
const OVERRIDES_PATH = path.resolve(__dirname, '../opencc-overrides.json');

const overrides: Record<string, string> = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8'));
const converter = OpenCC.Converter({ from: 'hk', to: 'cn' });

function convertValue(value: string): string {
  let result = value;
  const placeholders: [string, string][] = [];

  Object.keys(overrides).forEach((brand, i) => {
    const placeholder = `__BRAND_${i}__`;
    const regex = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (regex.test(result)) {
      result = result.replace(regex, placeholder);
      placeholders.push([placeholder, overrides[brand]]);
    }
  });

  result = converter(result);

  placeholders.forEach(([placeholder, brand]) => {
    result = result.replaceAll(placeholder, brand);
  });

  return result;
}

export function generateZhCN(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    const converted: Record<string, string> = {};

    for (const [key, value] of Object.entries(source)) {
      converted[key] = typeof value === 'string' ? convertValue(value) : (value as string);
    }

    fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2) + '\n', 'utf-8');
    console.log(`[opencc] zh-HK/${file} → zh-CN/${file}`);
  }

  console.log(`[opencc] Generated ${files.length} zh-CN locale files`);
}

// Allow running as standalone script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  generateZhCN();
}
