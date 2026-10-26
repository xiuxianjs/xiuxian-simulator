import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatGameDate, formatGameTime, formatGameTimeAgo, parseGameTime } from '../src/utils/gameTime';

test('game time renders instants in Beijing and treats plain dates as calendar dates', () => {
  for (const value of ['2026-10-12T00:24:05Z', '2026-10-12T08:24:05+08:00', '2026-10-12 08:24:05', new Date('2026-10-12T00:24:05Z'), Date.parse('2026-10-12T00:24:05Z')]) {
    assert.equal(formatGameTime(value, 'YYYY-MM-DD HH:mm:ss'), '2026-10-12 08:24:05');
  }
  assert.equal(formatGameTime('2026-10-12', 'YYYY-MM-DD'), '2026-10-12');
  assert.equal(formatGameDate('2026/1/2'), '2026-01-02');
  assert.equal(formatGameDate('2026/12/01'), '2026-12-01');
  assert.equal(formatGameTime('2026-10-11T20:00:00Z', 'YYYY-MM-DD HH:mm:ss'), '2026-10-12 04:00:00');
});

test('missing values never render the current time, invalid dates never overflow', () => {
  for (const value of [null, undefined, '']) assert.equal(formatGameTime(value, 'YYYY-MM-DD'), '暂无');
  for (const value of ['2026/2/30', '2026/13/1', '2026-02-30', '2026-13-01', '2026-10-12T25:00:00', 'bad date', NaN, new Date(NaN)]) {
    assert.equal(parseGameTime(value), null);
    assert.equal(formatGameTime(value, 'YYYY-MM-DD'), '时间未知');
  }
});


test('approved formats and relative-time thresholds remain readable', () => {
  assert.equal(formatGameTime('2026-10-12T00:24:05Z'), '2026-10-12 08:24:05');
  assert.equal(formatGameDate('2026-10-12'), '2026-10-12');
  assert.equal(formatGameTimeAgo(null), '暂无');
  assert.equal(formatGameTimeAgo('invalid'), '时间未知');
  const now = '2026-10-12T08:24:05+08:00';
  assert.equal(formatGameTimeAgo('2026-10-12T08:23:06+08:00', true, now), '刚刚');
  assert.equal(formatGameTimeAgo('2026-10-12T08:23:05+08:00', true, now), '1分钟前');
  assert.equal(formatGameTimeAgo('2026-10-12T07:24:05+08:00', true, now), '1小时前');
  assert.equal(formatGameTimeAgo('2026-10-11T08:24:05+08:00', true, now), '1天前');
  assert.equal(formatGameTimeAgo('2026-10-11T08:24:05+08:00', false, now), '24小时前');
});
