/** Translate known display fields only; never reinterpret command payloads or code. */
export function playerLanguage(text: string): string {
  return text.replace(
    /(\[\[[^\n]*?\]\]|```[\s\S]*?```)|["']?\b(claimed|unlocked)\b["']?\s*[:=]\s*(true|false)\b/gu,
    (match, protectedText: string | undefined, field: string, value: string) => {
      if (protectedText) {
        return match;
      }
      if (field === 'claimed') {
        return value === 'true' ? '已领取' : '尚未领取';
      }

      return value === 'true' ? '已解锁' : '尚未解锁';
    }
  );
}
