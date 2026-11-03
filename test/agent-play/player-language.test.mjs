import test from 'node:test';
import assert from 'node:assert/strict';
import { playerLanguage } from '../../src/agent-play/player-language.ts';
test('reward language distinguishes not claimed from eligible and preserves exact inputs', () => {
 assert.equal(playerLanguage('宝箱（claimed: true），其他 claimed=false、unlocked=false。'), '宝箱（已领取），其他 尚未领取、尚未解锁。');
 assert.equal(playerLanguage('"claimed": false，unlocked=true'), '尚未领取，已解锁');
 const protectedText = '[[查找 claimed:true]]\n```json\n{"claimed":true}\n```';
 assert.equal(playerLanguage(protectedText), protectedText);
 assert.equal(playerLanguage('claimedCount=0，unlockedIndex=2'), 'claimedCount=0，unlockedIndex=2');
 assert.doesNotMatch(playerLanguage('claimed=false'), /可领取/u);
});
