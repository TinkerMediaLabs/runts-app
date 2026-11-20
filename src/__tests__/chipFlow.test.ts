import { lineCount, fitItems, type FlowItem } from '../lib/chipFlow';

const chip = (width: number): FlowItem => ({ kind: 'chip', width });

describe('lineCount', () => {
  it('wraps left to right', () => {
    expect(lineCount([], 100, 6)).toBe(0);
    expect(lineCount([40, 40], 100, 6)).toBe(1);
    expect(lineCount([50, 50], 100, 6)).toBe(2);
    expect(lineCount([60, 60, 60], 100, 6)).toBe(3);
  });
});

describe('fitItems', () => {
  it('shows everything when it fits in the lines', () => {
    expect(fitItems([chip(40), chip(40), chip(60)], 100, 6, 3, 50)).toEqual({ visible: 3, hidden: 0 });
  });
  it('hides the overflow and counts the hidden chips, leaving room for "+N more"', () => {
    const items = Array.from({ length: 8 }, () => chip(60));          // one per line
    expect(fitItems(items, 100, 6, 3, 60)).toEqual({ visible: 2, hidden: 6 });
  });
  it('never ends on the separator dot', () => {
    const items: FlowItem[] = [chip(90), chip(90), { kind: 'dot', width: 4 }, chip(90), chip(90)];
    const r = fitItems(items, 100, 6, 3, 60);
    expect(r.visible).toBe(2);
    expect(r.hidden).toBe(2);
  });
});
