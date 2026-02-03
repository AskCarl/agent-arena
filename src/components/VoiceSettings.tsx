'use client';

import { useState, useEffect } from 'react';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// ElevenLabs voice options (free tier voices)
export const VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Deep, American male' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Warm, American male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', desc: 'Gruff, American male' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', desc: 'Strong, American male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Authoritative, British male' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', desc: 'Intense, Transatlantic male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Confident, American male' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', desc: 'Friendly, American male' },
];

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('elevenLabsApiKey');
}

export function getStoredVoiceId(): string {
  if (typeof window === 'undefined') return VOICES[0].id;
  return localStorage.getItem('elevenLabsVoiceId') || VOICES[0].id;
}

export function isVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('voiceEnabled') === 'true' && !!getStoredApiKey();
}

export default function VoiceSettings({ isOpen, onClose }: VoiceSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    // Load saved settings
    const savedKey = localStorage.getItem('elevenLabsApiKey') || '';
    const savedVoice = localStorage.getItem('elevenLabsVoiceId') || VOICES[0].id;
    const savedEnabled = localStorage.getItem('voiceEnabled') === 'true';
    setApiKey(savedKey);
    setVoiceId(savedVoice);
    setVoiceEnabled(savedEnabled && !!savedKey);
  }, [isOpen]);

  const saveSettings = () => {
    localStorage.setItem('elevenLabsApiKey', apiKey);
    localStorage.setItem('elevenLabsVoiceId', voiceId);
    localStorage.setItem('voiceEnabled', voiceEnabled && apiKey ? 'true' : 'false');
    onClose();
  };

  const testVoice = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: "Welcome to Agent Arena. Let the battle begin!",
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) throw new Error('API call failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      setTestResult('success');
    } catch (error) {
      console.error('Voice test failed:', error);
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const clearSettings = () => {
    localStorage.removeItem('elevenLabsApiKey');
    localStorage.removeItem('elevenLabsVoiceId');
    localStorage.removeItem('voiceEnabled');
    setApiKey('');
    setVoiceId(VOICES[0].id);
    setVoiceEnabled(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0d0d] border-4 border-[var(--invaders-yellow)] rounded-lg max-w-md w-full p-6 relative shadow-[4px_4px_0_var(--invaders-red)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-arcade text-sm text-[var(--invaders-yellow)]">🎤 Voice Settings</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="bg-green-500/10 border border-green-500/30 rounded p-3 mb-4">
          <p className="font-arcade text-[8px] text-green-400">
            🔒 Your API key stays in YOUR browser. We never see, store, or transmit it.
          </p>
        </div>

        {/* API Key Input */}
        <div className="mb-4">
          <label className="block font-arcade text-[8px] text-[var(--invaders-yellow)] mb-2">
            ElevenLabs API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key..."
            className="w-full bg-black/60 border-2 border-white/20 rounded px-3 py-2 font-arcade text-[10px] text-white placeholder:text-white/30 focus:border-[var(--invaders-yellow)] focus:outline-none"
          />
          <p className="font-arcade text-[8px] text-white/40 mt-1">
            Get your key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-[var(--invaders-yellow)] hover:underline">elevenlabs.io</a>
          </p>
        </div>

        {/* Voice Selection */}
        <div className="mb-4">
          <label className="block font-arcade text-[8px] text-[var(--invaders-yellow)] mb-2">
            Voice
          </label>
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="w-full bg-black/60 border-2 border-white/20 rounded px-3 py-2 font-arcade text-[10px] text-white focus:border-[var(--invaders-yellow)] focus:outline-none"
          >
            {VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} — {voice.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Enable Voice Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              disabled={!apiKey}
              className="w-4 h-4 accent-[var(--invaders-yellow)]"
            />
            <span className="font-arcade text-[10px] text-white">
              Enable voice for battles
            </span>
          </label>
        </div>

        {/* Test Button */}
        {apiKey && (
          <button
            onClick={testVoice}
            disabled={testing}
            className="w-full mb-4 px-4 py-2 rounded font-arcade text-[8px] font-bold bg-black/60 border-2 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] hover:bg-[var(--invaders-yellow)] hover:text-black transition-all disabled:opacity-50"
          >
            {testing ? 'Testing...' : '🔊 Test Voice'}
          </button>
        )}

        {testResult === 'success' && (
          <p className="font-arcade text-[8px] text-green-400 mb-4 text-center">✓ Voice working!</p>
        )}
        {testResult === 'error' && (
          <p className="font-arcade text-[8px] text-red-400 mb-4 text-center">✗ Test failed. Check your API key.</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={clearSettings}
            className="flex-1 px-4 py-2 rounded font-arcade text-[8px] font-bold border-2 border-[var(--invaders-red)] text-[var(--invaders-red)] hover:bg-[var(--invaders-red)] hover:text-white transition-all"
          >
            Clear
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 px-4 py-2 rounded font-arcade text-[8px] font-bold bg-[var(--invaders-yellow)] text-black hover:scale-105 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// TTS function to be used in battle page
export async function speakText(text: string, voiceId?: string): Promise<void> {
  const apiKey = getStoredApiKey();
  if (!apiKey || !isVoiceEnabled()) return;

  const selectedVoice = voiceId || getStoredVoiceId();

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) throw new Error('TTS failed');

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  } catch (error) {
    console.error('TTS error:', error);
  }
}
