import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const slidesDir = path.join(projectRoot, 'src', 'slides');
const publicDir = path.join(projectRoot, 'public');
const MIN_BACKGROUND_WIDTH = 1920;
const MIN_BACKGROUND_HEIGHT = 1080;
const backgroundDimensionCache = new Map();

async function collectMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMdxFiles(entryPath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.mdx')) {
        const base = entry.name.split('/').pop() ?? entry.name;
        if (base.startsWith('_')) return [];
        return [entryPath];
      }
      return [];
    }),
  );
  return files.flat();
}

function extractMetaLiteral(source) {
  const marker = 'export const meta';
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let i = braceStart;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (!inString) {
      if (char === '/' && next === '/') {
        i += 2;
        while (i < source.length && source[i] !== '\n') i += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i += 2;
        continue;
      }
      if (char === '"' || char === '\'' || char === '`') {
        inString = true;
        stringChar = char;
        i += 1;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(braceStart, i + 1);
        }
      }
      i += 1;
      continue;
    }

    if (escaped) {
      escaped = false;
      i += 1;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      i += 1;
      continue;
    }

    if (char === stringChar) {
      inString = false;
      stringChar = '';
    }

    i += 1;
  }

  return null;
}

function evaluateMeta(literal, filePath) {
  try {
    return vm.runInNewContext(`(${literal})`, {}, { filename: filePath, displayErrors: true });
  } catch (error) {
    throw new Error(`Failed to evaluate meta in ${filePath}: ${error.message}`);
  }
}

function isRemoteAsset(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.startsWith('data:')) return true;
  return /^([a-z]+:\/\/|\/\/)/i.test(trimmed);
}

async function ensurePublicAssetExists(rawValue, filePath, fieldLabel) {
  if (typeof rawValue !== 'string') {
    return { issue: null, resolvedPath: null };
  }
  const value = rawValue.trim();
  if (isRemoteAsset(value)) return { issue: null, resolvedPath: null };

  const withoutLeadingSlash = value.replace(/^\/+/, '');
  const candidatePath = path.resolve(publicDir, withoutLeadingSlash);
  if (!candidatePath.startsWith(publicDir)) {
    return {
      issue: {
        filePath,
        message: `${fieldLabel} references path outside public/: ${value}`,
      },
      resolvedPath: candidatePath,
    };
  }

  try {
    await access(candidatePath);
    return { issue: null, resolvedPath: candidatePath };
  } catch (error) {
    return {
      issue: {
        filePath,
        message: `${fieldLabel} missing asset ${value} (looked for ${path.relative(
          projectRoot,
          candidatePath,
        )})`,
      },
      resolvedPath: candidatePath,
    };
  }
}

function readImageDimensions(buffer) {
  if (!buffer || buffer.length < 8) return null;
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    if (buffer.length < 24) return null;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    const len = buffer.length;
    while (offset < len) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      offset += 2;
      if (marker === 0xd9 || marker === 0xda) break;
      if (offset + 2 > len) break;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2) break;
      const segmentStart = offset + 2;
      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      ) {
        if (segmentStart + 5 >= len) break;
        const height = buffer.readUInt16BE(segmentStart + 1);
        const width = buffer.readUInt16BE(segmentStart + 3);
        return { width, height };
      }
      offset += segmentLength;
    }
  }

  return null;
}

async function getBackgroundDimensions(absolutePath) {
  if (!absolutePath) return null;
  if (backgroundDimensionCache.has(absolutePath)) {
    return backgroundDimensionCache.get(absolutePath);
  }
  try {
    const buffer = await readFile(absolutePath);
    const dimensions = readImageDimensions(buffer);
    backgroundDimensionCache.set(absolutePath, dimensions);
    return dimensions;
  } catch (error) {
    backgroundDimensionCache.set(absolutePath, null);
    return null;
  }
}

async function verifySlides() {
  const slideFiles = await collectMdxFiles(slidesDir);
  const issues = [];

  for (const filePath of slideFiles) {
    const source = await readFile(filePath, 'utf8');
    const literal = extractMetaLiteral(source);
    if (!literal) continue;

    const meta = evaluateMeta(literal, filePath);
    const audio = meta?.audioTransitions;
    const hand = meta?.handActions;
    const background = meta?.background;

    if (audio != null && !Array.isArray(audio)) {
      issues.push({ filePath, message: '`audioTransitions` is not an array' });
    }
    if (hand != null && !Array.isArray(hand)) {
      issues.push({ filePath, message: '`handActions` is not an array' });
    }

    const audioLength = Array.isArray(audio) ? audio.length : 0;
    const handLength = Array.isArray(hand) ? hand.length : 0;

    if (audioLength !== handLength) {
      issues.push({
        filePath,
        message: `audioTransitions (${audioLength}) and handActions (${handLength}) length mismatch`,
      });
    }

    if (Array.isArray(audio)) {
      for (const [index, entry] of audio.entries()) {
        if (typeof entry !== 'string' || entry.trim().length === 0) {
          issues.push({
            filePath,
            message: `audioTransitions[${index}] must be a non-empty string`,
          });
          continue;
        }
        const { issue } = await ensurePublicAssetExists(entry, filePath, `audioTransitions[${index}]`);
        if (issue) issues.push(issue);
      }
    }

    if (background != null) {
      if (typeof background !== 'string' || background.trim().length === 0) {
        issues.push({ filePath, message: '`background` must be a non-empty string when provided' });
      } else {
        const { issue, resolvedPath } = await ensurePublicAssetExists(background, filePath, 'background');
        if (issue) {
          issues.push(issue);
        } else if (resolvedPath) {
          const dimensions = await getBackgroundDimensions(resolvedPath);
          if (!dimensions?.width || !dimensions?.height) {
            issues.push({
              filePath,
              message: `background resolution could not be determined for ${path.relative(
                projectRoot,
                resolvedPath,
              )}`,
            });
          } else if (
            dimensions.width < MIN_BACKGROUND_WIDTH ||
            dimensions.height < MIN_BACKGROUND_HEIGHT
          ) {
            issues.push({
              filePath,
              message: `background resolution ${dimensions.width}x${dimensions.height} below recommended ${MIN_BACKGROUND_WIDTH}x${MIN_BACKGROUND_HEIGHT} (${path.relative(
                projectRoot,
                resolvedPath,
              )})`,
            });
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error('Slide verification failed:\n');
    for (const issue of issues) {
      console.error(`- ${path.relative(projectRoot, issue.filePath)} :: ${issue.message}`);
    }
    console.error('\nFix the issues above and re-run verification.');
    process.exitCode = 1;
    return;
  }

  console.log('All slides verified successfully.');
}

verifySlides().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
