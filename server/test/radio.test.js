import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isAllowedAudioType,
  normalizeChannel,
  normalizeDisplayName,
  normalizeText,
  parseAllowedOrigins,
  toBuffer,
} from '../src/radio.js'

test('allowed origins are explicit and normalized', () => {
  assert.deepEqual(parseAllowedOrigins('https://one.example, https://two.example,https://one.example'), [
    'https://one.example',
    'https://two.example',
  ])
  assert.deepEqual(parseAllowedOrigins(''), [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])
})

test('radio inputs are bounded and normalized', () => {
  assert.equal(normalizeChannel(' duty '), 'DUTY')
  assert.equal(normalizeChannel('unknown'), null)
  assert.equal(normalizeDisplayName('  Headmaster\u0000  '), 'Headmaster')
  assert.equal(normalizeDisplayName(''), 'Staff')
  assert.equal(normalizeText('  All clear  '), 'All clear')
  assert.equal(normalizeText(''), null)
  assert.equal(normalizeText('x'.repeat(281)), null)
})

test('C1 control characters are stripped from display names and text', () => {
  // U+0080–U+009F are invisible C1 controls and must be filtered out
  assert.equal(normalizeDisplayName('Alpha\u0081Bravo'), 'AlphaBravo')
  assert.equal(normalizeDisplayName('\u009FHidden'), 'Hidden')
  assert.equal(normalizeText('Clear\u008Ftext'), 'Cleartext')
  // DEL (U+007F) is also stripped from display names
  assert.equal(normalizeDisplayName('Delete\u007FChar'), 'DeleteChar')
})

test('voice payload validation accepts supported bytes only', () => {
  assert.equal(isAllowedAudioType('audio/webm;codecs=opus'), true)
  assert.equal(isAllowedAudioType('audio/wav'), false)
  assert.deepEqual(toBuffer(new Uint8Array([1, 2, 3])), Buffer.from([1, 2, 3]))
  assert.equal(toBuffer('not binary'), null)
})
