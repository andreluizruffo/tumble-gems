// Rendering with PixiJS: draws the board and animates the symbols.
// It knows nothing about money or rules; it only shows what the logic decided.
import { Application, Container, Graphics, Text } from 'pixi.js';
import { BOARD_PADDING, CELL, COLS, ORB, ROWS, SCATTER, SYMBOLS } from './config';
import type { Cell, Grid } from './logic';
import { easeInCubic, easeOutBack, easeOutBounce, easeOutCubic, tween, wait } from './tween';

const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const SYMBOL_RADIUS = CELL * 0.36;

export class SlotView {
  private app: Application;
  private board = new Container();
  private sprites = new Map<number, Container>();
  private banner = new Container();
  private frame = new Graphics();

  private constructor(app: Application) {
    this.app = app;
  }

  static async create(parent: HTMLElement): Promise<SlotView> {
    const app = new Application();
    await app.init({
      width: BOARD_W + BOARD_PADDING * 2,
      height: BOARD_H + BOARD_PADDING * 2,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });
    // The canvas scales with its container (responsive), keeping the aspect ratio.
    app.canvas.style.width = '100%';
    app.canvas.style.height = 'auto';
    parent.appendChild(app.canvas);

    const view = new SlotView(app);
    view.setup();
    return view;
  }

  private setup() {
    this.frame
      .roundRect(0, 0, BOARD_W + BOARD_PADDING * 2, BOARD_H + BOARD_PADDING * 2, 20)
      .fill({ color: 0x1e1b4b })
      .stroke({ width: 3, color: 0xfacc15, alpha: 0.6 });
    this.app.stage.addChild(this.frame);

    const cells = new Graphics();
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        cells
          .roundRect(BOARD_PADDING + col * CELL + 4, BOARD_PADDING + row * CELL + 4, CELL - 8, CELL - 8, 14)
          .fill({ color: 0xffffff, alpha: 0.05 });
      }
    }
    this.app.stage.addChild(cells);

    // Symbols live inside the board; the mask hides them while they are above it.
    this.board.position.set(BOARD_PADDING, BOARD_PADDING);
    const mask = new Graphics().rect(BOARD_PADDING, BOARD_PADDING, BOARD_W, BOARD_H).fill(0xffffff);
    this.app.stage.addChild(mask);
    this.board.mask = mask;
    this.app.stage.addChild(this.board);

    this.app.stage.addChild(this.banner);
  }

  private get ticker() {
    return this.app.ticker;
  }

  private cellCenter(col: number, row: number) {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  private drawCell(cell: Cell): Container {
    const sprite = new Container();
    const g = new Graphics();
    const r = SYMBOL_RADIUS;

    if (cell.symbol === SCATTER) {
      // Scatter: a magenta sun with a white burst, labelled BONUS
      g.star(0, 0, 12, r * 1.08, r * 0.8).fill(0xfbbf24);
      g.circle(0, 0, r * 0.78).fill(0xc026d3).stroke({ width: 3, color: 0xfde68a });
      g.star(0, -4, 4, r * 0.5, r * 0.16).fill(0xffffff);
      sprite.addChild(g);
      const label = new Text({
        text: 'BONUS',
        style: { fill: 0xffffff, fontSize: 15, fontWeight: '900', fontFamily: 'Arial', stroke: { color: 0x701a75, width: 4 } },
      });
      label.anchor.set(0.5);
      label.y = r * 0.48;
      sprite.addChild(label);
      return sprite;
    }

    if (cell.symbol === ORB) {
      // Multiplier orb
      g.circle(0, 0, r).fill(0xb45309).circle(0, 0, r * 0.82).fill(0xfbbf24);
      g.circle(-r * 0.3, -r * 0.3, r * 0.22).fill({ color: 0xffffff, alpha: 0.5 });
      sprite.addChild(g);
      const label = new Text({
        text: `x${cell.multiplier}`,
        style: { fill: 0x451a03, fontSize: 26, fontWeight: '900', fontFamily: 'Arial' },
      });
      label.anchor.set(0.5);
      sprite.addChild(label);
      return sprite;
    }

    const def = SYMBOLS[cell.symbol];
    switch (def.shape) {
      case 'circle':
        g.circle(0, 0, r);
        break;
      case 'ring':
        g.circle(0, 0, r).fill(def.color).circle(0, 0, r * 0.45).cut();
        break;
      case 'square':
        g.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 10);
        break;
      case 'triangle':
        g.poly([0, -r, r * 0.95, r * 0.75, -r * 0.95, r * 0.75]);
        break;
      case 'diamond':
        g.poly([0, -r, r * 0.8, 0, 0, r, -r * 0.8, 0]);
        break;
      case 'hexagon':
        g.regularPoly(0, 0, r, 6);
        break;
      case 'octagon':
        g.regularPoly(0, 0, r, 8, Math.PI / 8);
        break;
      case 'pentagon':
        g.regularPoly(0, 0, r, 5);
        break;
      case 'star':
        g.star(0, 0, 5, r, r * 0.45);
        break;
    }
    if (def.shape !== 'ring') g.fill(def.color);
    g.stroke({ width: 3, color: 0xffffff, alpha: 0.35 });
    // small highlight, to look like a polished gem
    g.circle(-r * 0.3, -r * 0.35, r * 0.15).fill({ color: 0xffffff, alpha: 0.45 });
    sprite.addChild(g);
    return sprite;
  }

  private addSprite(cell: Cell, col: number, row: number, startAbove: number): Container {
    const sprite = this.drawCell(cell);
    const { x, y } = this.cellCenter(col, row);
    sprite.position.set(x, y - startAbove);
    this.board.addChild(sprite);
    this.sprites.set(cell.id, sprite);
    return sprite;
  }

  /** Old symbols drop out of the board; then it is empty. */
  async clearAll() {
    const all = [...this.sprites.values()];
    await Promise.all(
      all.map((sprite, i) =>
        tween(this.ticker, sprite, { y: sprite.y + BOARD_H + CELL }, 350, easeInCubic, (i % COLS) * 30),
      ),
    );
    for (const sprite of all) sprite.destroy({ children: true });
    this.sprites.clear();
  }

  /** A brand new grid falls into the board, column by column. */
  async dropIn(grid: Grid) {
    const animations: Promise<void>[] = [];
    grid.forEach((column, col) => {
      column.forEach((cell, row) => {
        const sprite = this.addSprite(cell, col, row, BOARD_H + CELL);
        const { y } = this.cellCenter(col, row);
        animations.push(tween(this.ticker, sprite, { y }, 550, easeOutBounce, col * 70 + (ROWS - row) * 25));
      });
    });
    await Promise.all(animations);
  }

  /** Winning symbols pulse a couple of times. */
  async highlight(ids: Set<number>) {
    const targets = [...ids].map((id) => this.sprites.get(id)).filter((s): s is Container => !!s);
    for (let i = 0; i < 2; i++) {
      await Promise.all(targets.map((s) => tween(this.ticker, s.scale, { x: 1.18, y: 1.18 }, 150, easeOutCubic)));
      await Promise.all(targets.map((s) => tween(this.ticker, s.scale, { x: 1, y: 1 }, 150, easeOutCubic)));
    }
  }

  /** Winning symbols shrink and disappear. */
  async remove(ids: Set<number>) {
    const targets = [...ids].map((id) => this.sprites.get(id)).filter((s): s is Container => !!s);
    await Promise.all(
      targets.map((s) => Promise.all([
        tween(this.ticker, s.scale, { x: 0, y: 0 }, 220, easeInCubic),
        tween(this.ticker, s, { alpha: 0 }, 220, easeInCubic),
      ])),
    );
    for (const id of ids) {
      this.sprites.get(id)?.destroy({ children: true });
      this.sprites.delete(id);
    }
  }

  /** After a tumble: survivors fall into their new rows and new symbols drop from the top. */
  async settle(grid: Grid) {
    const animations: Promise<void>[] = [];
    grid.forEach((column, col) => {
      const newcomers = column.filter((cell) => !this.sprites.has(cell.id)).length;
      column.forEach((cell, row) => {
        const { y } = this.cellCenter(col, row);
        let sprite = this.sprites.get(cell.id);
        if (!sprite) sprite = this.addSprite(cell, col, row, newcomers * CELL + CELL);
        if (sprite.y !== y) {
          animations.push(tween(this.ticker, sprite, { y }, 420, easeOutBounce, col * 40));
        }
      });
    });
    await Promise.all(animations);
  }

  /** Orbs pulse and a banner shows the total multiplier. */
  async showMultiplier(total: number, ids: number[]) {
    const orbs = ids.map((id) => this.sprites.get(id)).filter((s): s is Container => !!s);
    await Promise.all(orbs.map((s) => tween(this.ticker, s.scale, { x: 1.35, y: 1.35 }, 200, easeOutBack)));
    await this.showBanner(`x${total}`, 0xfacc15);
    await Promise.all(orbs.map((s) => tween(this.ticker, s.scale, { x: 1, y: 1 }, 200, easeOutCubic)));
  }

  /** Scatters grow, spin and glow before free spins start. */
  async celebrateScatters(ids: number[]) {
    const scatters = ids.map((id) => this.sprites.get(id)).filter((s): s is Container => !!s);
    const glows = scatters.map((s) => {
      const glow = new Graphics().circle(0, 0, SYMBOL_RADIUS * 1.25).fill({ color: 0xf0abfc, alpha: 0.5 });
      glow.alpha = 0;
      s.addChildAt(glow, 0);
      return glow;
    });

    // bring the scatters to the front so the animation is not hidden by neighbours
    for (const s of scatters) this.board.setChildIndex(s, this.board.children.length - 1);

    await Promise.all([
      ...scatters.map((s) => tween(this.ticker, s.scale, { x: 1.4, y: 1.4 }, 350, easeOutBack)),
      ...glows.map((g) => tween(this.ticker, g, { alpha: 1 }, 350, easeOutCubic)),
    ]);
    for (let i = 0; i < 2; i++) {
      await Promise.all(scatters.map((s) => tween(this.ticker, s, { rotation: s.rotation + Math.PI * 2 }, 600, easeOutCubic)));
    }
    await Promise.all([
      ...scatters.map((s) => tween(this.ticker, s.scale, { x: 1, y: 1 }, 250, easeOutCubic)),
      ...glows.map((g) => tween(this.ticker, g, { alpha: 0 }, 250, easeOutCubic)),
    ]);
    glows.forEach((g) => g.destroy());
  }

  /** Visual mode for free spins: the board frame turns magenta. */
  setFreeSpinsMode(on: boolean) {
    this.frame.tint = on ? 0xf0abfc : 0xffffff;
  }

  async showBanner(text: string, color = 0xffffff, fontSize = 72) {
    const label = new Text({
      text,
      style: {
        fill: color,
        fontSize,
        align: 'center',
        fontWeight: '900',
        fontFamily: 'Arial',
        stroke: { color: 0x1e1b4b, width: 10 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(BOARD_PADDING + BOARD_W / 2, BOARD_PADDING + BOARD_H / 2);
    label.scale.set(0);
    this.banner.addChild(label);
    await tween(this.ticker, label.scale, { x: 1, y: 1 }, 300, easeOutBack);
    await wait(this.ticker, 600);
    await tween(this.ticker, label, { alpha: 0 }, 250, easeOutCubic);
    label.destroy();
  }

  destroy() {
    this.app.destroy({ removeView: true }, { children: true });
  }
}
