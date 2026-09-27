import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { publishSwipe } from './gestureHub.ts';
import { parseSwipeLine } from './swipe.ts';

const execFileAsync = promisify(execFile);
const RETRY_MS = 2000;

export async function findPicoPort(): Promise<string | null> {
  const configured = process.env.PICO_SERIAL_PORT?.trim();
  if (configured) return configured;
  if (process.platform === 'win32') return null;

  try {
    const names = await readdir('/dev');
    const match = names.find(
      (name) => name.startsWith('cu.usbmodem') || name.startsWith('ttyACM'),
    );
    return match ? `/dev/${match}` : null;
  } catch {
    return null;
  }
}

async function configureBaud(port: string): Promise<void> {
  if (process.platform === 'win32') return;
  const flag = process.platform === 'linux' ? '-F' : '-f';
  await execFileAsync('stty', [flag, port, '115200', 'raw', 'min', '0', 'time', '0', '-echo']);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listen(port: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(port);
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    let sawData = false;

    lines.on('line', (line) => {
      if (!sawData && line.trim()) {
        sawData = true;
        console.log(`Pico serial: receiving ${line.split(':', 1)[0]} frames`);
      }
      const gesture = parseSwipeLine(line);
      if (gesture) {
        console.log(`Pico serial: ${line.trim()}`);
        publishSwipe(gesture);
      }
    });

    stream.on('error', (err) => {
      console.warn(`Pico serial closed (${port}): ${err.message}`);
      lines.close();
      reject(err);
    });

    stream.on('close', () => {
      lines.close();
      resolve();
    });
  });
}

async function openPort(port: string): Promise<void> {
  await configureBaud(port);
  console.log(`Pico serial: listening on ${port}`);
  await listen(port);
}

/** Keep trying so a Pico plugged in after startup still attaches. */
export async function startPicoSerial(): Promise<void> {
  let announcedMissing = false;

  for (;;) {
    const port = await findPicoPort();
    if (!port) {
      if (!announcedMissing) {
        console.log('Pico serial: waiting for /dev/cu.usbmodem* (or PICO_SERIAL_PORT).');
        announcedMissing = true;
      }
      await sleep(RETRY_MS);
      continue;
    }

    announcedMissing = false;
    try {
      await openPort(port);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.warn(`Pico serial: could not open ${port}: ${message}`);
    }
    await sleep(RETRY_MS);
  }
}
