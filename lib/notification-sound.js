"use client";

let audioContext = null;
let audioUnlocked = false;
let unlockHandlersAttached = false;
let notificationAudio = null;
const URGENT_BEEP_STEPS = [
  { frequency: 1040, duration: 0.08, volume: 0.08 },
  { frequency: 1320, duration: 0.1, volume: 0.09 },
  { frequency: 1560, duration: 0.12, volume: 0.1 },
];

const NOTIFICATION_BEEP_SRC =
  "data:audio/wav;base64,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";

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function getNotificationAudio() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_BEEP_SRC);
    notificationAudio.preload = "auto";
    notificationAudio.volume = 0.55;
  }

  return notificationAudio;
}

function markAudioUnlocked() {
  audioUnlocked = true;
}

function removeUnlockHandlers() {
  if (typeof window === "undefined") {
    return;
  }

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.removeEventListener(eventName, unlockAudio);
    document.removeEventListener(eventName, unlockAudio);
  });
}

async function tryUnlockAudioElement() {
  const audio = getNotificationAudio();

  if (!audio) {
    return false;
  }

  try {
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    return true;
  } catch {
    return false;
  }
}

async function tryUnlockAudioContext() {
  const context = getAudioContext();

  if (!context) {
    return false;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    return context.state === "running";
  } catch {
    return false;
  }
}

async function unlockAudio() {
  const [audioElementUnlocked, audioContextUnlocked] = await Promise.all([
    tryUnlockAudioElement(),
    tryUnlockAudioContext(),
  ]);

  if (audioElementUnlocked || audioContextUnlocked) {
    markAudioUnlocked();
    removeUnlockHandlers();
  }
}

async function playAudioElementBeeps(totalBeeps) {
  const audio = getNotificationAudio();

  if (!audio) {
    return false;
  }

  try {
    for (let index = 0; index < totalBeeps; index += 1) {
      const beepAudio = index === 0 ? audio : audio.cloneNode();
      beepAudio.volume = 0.55;
      beepAudio.currentTime = 0;
      await beepAudio.play();

      if (index < totalBeeps - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function playOscillatorBeeps(totalBeeps) {
  const context = getAudioContext();

  if (!context) {
    return false;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const startAt = context.currentTime + 0.02;

    for (let index = 0; index < totalBeeps; index += 1) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const beepStart = startAt + index * 0.18;
      const beepEnd = beepStart + 0.1;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, beepStart);
      oscillator.frequency.exponentialRampToValueAtTime(1320, beepEnd);

      gainNode.gain.setValueAtTime(0.0001, beepStart);
      gainNode.gain.exponentialRampToValueAtTime(0.06, beepStart + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, beepEnd);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(beepStart);
      oscillator.stop(beepEnd);
    }

    return true;
  } catch {
    return false;
  }
}

async function playOscillatorPattern(steps) {
  const context = getAudioContext();

  if (!context || !Array.isArray(steps) || steps.length === 0) {
    return false;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    let cursor = context.currentTime + 0.02;

    steps.forEach((step) => {
      const duration = Math.max(0.04, Number(step.duration) || 0.1);
      const volume = Math.max(0.0001, Number(step.volume) || 0.08);
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const stopAt = cursor + duration;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(Number(step.frequency) || 1320, cursor);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(220, (Number(step.frequency) || 1320) * 1.08),
        stopAt,
      );

      gainNode.gain.setValueAtTime(0.0001, cursor);
      gainNode.gain.exponentialRampToValueAtTime(volume, cursor + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(cursor);
      oscillator.stop(stopAt);

      cursor = stopAt + 0.05;
    });

    return true;
  } catch {
    return false;
  }
}

export function prepareNotificationSound() {
  if (typeof window === "undefined" || unlockHandlersAttached) {
    return;
  }

  unlockHandlersAttached = true;
  getNotificationAudio();

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { passive: true });
    document.addEventListener(eventName, unlockAudio, { passive: true });
  });
}

export async function playNotificationBeep(count = 1) {
  if (!audioUnlocked) {
    return false;
  }

  const totalBeeps = Math.min(3, Math.max(1, Math.floor(count)));
  const playedViaAudioElement = await playAudioElementBeeps(totalBeeps);

  if (playedViaAudioElement) {
    return true;
  }

  return playOscillatorBeeps(totalBeeps);
}

export async function playHighPriorityNotificationBeep() {
  if (!audioUnlocked) {
    return false;
  }

  const playedViaOscillator = await playOscillatorPattern(URGENT_BEEP_STEPS);

  if (playedViaOscillator) {
    return true;
  }

  return playAudioElementBeeps(3);
}

export async function testNotificationSound() {
  await unlockAudio();
  return playNotificationBeep(1);
}
