// Pick of the Day: a CMS list of stories shown one per day, rotating through the list. Pure so it can be tested.

// The card keeps the shape of a row tile (200 wide by 240 high), scaled up to the card's width, so the cover art is
// shown as large as it can be without being stretched or cropped differently from the tiles.
export function pickCardHeight(cardWidth: number, tileWidth = 200, tileHeight = 240): number {
  return Math.round(cardWidth * (tileHeight / tileWidth));
}

// Which entry of a list of `count` shows on the given local day. The same all day, the next one tomorrow.
export function pickIndexForDay(count: number, today: Date = new Date()): number {
  if (!(count > 0)) return 0;
  const day = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  return ((day % count) + count) % count;
}
