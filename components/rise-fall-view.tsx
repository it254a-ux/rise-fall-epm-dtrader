/* ── Mobile scrolling & text safety ─────────────────────────────────────────
   Ensures touch scrolling is smooth on iOS Safari and long words/URLs never
   force horizontal overflow or visually collide with neighboring text. */
@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }
  body {
    -webkit-overflow-scrolling: touch;
    overflow-wrap: break-word;
    word-break: break-word;
  }
}
