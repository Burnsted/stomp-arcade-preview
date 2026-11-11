import { useEffect, useRef, useState, type ReactNode } from "react";
import { createGame, type Game, type Snap } from "./engine";

const EMPTY: Snap = {
  mode: "ready", muted: false, levelName: "Butter Hits", levelN: 1, endless: false, lives: 5,
  primary: "PLAY", showJump: false, showPlay: false, showReplay: false, showNext: false, showResume: false,
  hint: null, showLegend: false, pb: 0, careerStars: 0, diffId: "normal", diffs: [], levels: [], boards: [],
  nowName: "Grom Deck", nowTag: "speed ×1.00 · wider lip", nextName: null, nextHow: "", nextTag: "",
  runStars: 0, bestStars: 0, starGoal: 160, runScore: 0, goalDone: false, confirmReset: false,
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function MenuIcon() {
  return <Icon><path d="M4 6h16M4 12h16M4 18h16" /></Icon>;
}
function PauseIcon() {
  return <Icon><path d="M8 5v14M16 5v14" /></Icon>;
}
function VolumeIcon() {
  return <Icon><path d="M4 10v4h3l4 4V6L7 10H4z" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M17.5 7a7 7 0 0 1 0 10" /></Icon>;
}
function MuteIcon() {
  return <Icon><path d="M4 10v4h3l4 4V6L7 10H4z" /><path d="M18 9l-6 6M12 9l6 6" /></Icon>;
}

function stars(n: number) {
  return "★★★".slice(0, n) + "☆☆☆".slice(n);
}

function Stage({ kind }: { kind: string }) {
  return (
    <div className={"stage st-" + kind} aria-hidden="true">
      <span className="hill" />
      <span className="piece" />
      <span className="rider"><i /><b /></span>
    </div>
  );
}

export function TerrainPark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snap>(EMPTY);
  const [live, setLive] = useState("Terrain Park");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, (s) => {
      setSnap(s);
      setLive(s.mode === "play" ? "Riding " + s.levelName : s.mode === "clear" ? "Line clear " + s.runStars + " stars" : s.levelName);
    });
    gameRef.current = game;
    let sx = 0; let sy = 0; let tracking = false;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, .sheet")) return;
      const mode = game.getSnap().mode;
      if (mode === "clear" || mode === "over" || mode === "menu") return;
      if (e.clientY < 64) return;
      e.preventDefault();
      sx = e.clientX; sy = e.clientY; tracking = true;
      game.hold(true);
      game.press();
    };
    const move = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - sx; const dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 18) {
        game.aim?.(dx, dy);
        sx = e.clientX; sy = e.clientY;
      }
    };
    const up = () => { tracking = false; game.hold(false); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = () => gameRef.current;
  const showCard = snap.mode === "clear" || snap.mode === "over";

  return (
    <main className="park">
      <canvas ref={canvasRef} id="c" />
      <p className="sr" aria-live="polite">{live}</p>
      <button className="chrome-btn menu" type="button" aria-label="Park menu" onClick={() => (snap.mode === "menu" ? g()?.closeMenu() : snap.mode === "legend" ? g()?.dismissLegend() : g()?.openMenu())}><MenuIcon /></button>
      <button className="chrome-btn mute" type="button" aria-label={snap.muted ? "Unmute" : "Mute"} onClick={() => g()?.toggleMute()}>{snap.muted ? <MuteIcon /> : <VolumeIcon />}</button>
      <button className="chrome-btn pause" type="button" aria-label="Pause" onClick={() => g()?.togglePause()}><PauseIcon /></button>
      {snap.hint && <div className="hint">{snap.hint}</div>}
      {showCard && (
        <div className="result" role="status">
          <p className="kicker">{snap.mode === "ready" ? "Line " + snap.levelN : snap.mode === "over" ? "Wipeout" : "Line clear"}</p>
          <h2>{snap.mode === "over" ? (snap.lives > 0 ? snap.lives + " left" : "No lives") : snap.levelName}</h2>
          {snap.mode === "ready" && <p>{snap.levels.find((L) => L.n === snap.levelN)?.goal} · {snap.nowName}</p>}
          {snap.mode !== "ready" && <p className="scoreline">{snap.runScore} trick pts</p>}
          {snap.mode !== "ready" && <p className="stars">{stars(snap.mode === "clear" ? Math.max(snap.runStars, snap.bestStars) : snap.runStars)}</p>}
          {snap.mode === "clear" && snap.bestStars < 3 && <p>Replay to reach ★★★. Next line stays open.</p>}
          {snap.mode === "clear" && snap.bestStars >= 3 && <p>★★★ is locked in. You can still replay.</p>}
          {snap.mode === "over" && <p>Replay this line. Score is tricks only.</p>}
          {snap.mode === "ready" && <p>{snap.levelN >= 3 ? "Groms and skiers. Your board is already on." : "Groms only. Hits, rails, logs, flats, kickers."}</p>}
        </div>
      )}
      {snap.showPlay && (
        <button className="go play" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); g()?.press(); }}>PLAY</button>
      )}
      {snap.showJump && (
        <button
          className="jump air"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
            (e.currentTarget as HTMLButtonElement).dataset.sx = String(e.clientX);
            (e.currentTarget as HTMLButtonElement).dataset.sy = String(e.clientY);
            g()?.hold(true); g()?.press();
          }}
          onPointerMove={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            const sx = +(el.dataset.sx || e.clientX);
            const sy = +(el.dataset.sy || e.clientY);
            const dx = e.clientX - sx; const dy = e.clientY - sy;
            if (Math.hypot(dx, dy) > 16) {
              g()?.aim(dx, dy);
              el.dataset.sx = String(e.clientX);
              el.dataset.sy = String(e.clientY);
            }
          }}
          onPointerUp={() => g()?.hold(false)}
          onPointerCancel={() => g()?.hold(false)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >JUMP</button>
      )}
      {snap.showReplay && (
        <button className="replay" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); g()?.replay(); }}>REPLAY</button>
      )}
      {snap.showNext && (
        <button className="nextline" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); g()?.nextLine(); }}>NEXT</button>
      )}
      {snap.showResume && (
        <div className="resume" role="dialog" aria-label="Paused">
          <button type="button" onClick={(e) => { e.preventDefault(); g()?.togglePause(); }}>RESUME</button>
        </div>
      )}
      {snap.showLegend && (
        <div className="sheet" role="dialog" aria-label="How to play">
          <div className="sheet-inner">
            <h1>TERRAIN PARK</h1>
            <div className="hi">Trick stars {snap.careerStars} / 30 · best run {snap.pb}</div>
            <h2>The flip</h2>
            <Stage kind="flip" />
            <div className="row copy"><div><span className="tag">Hold</span><p>Hold through a kicker or hit and the board rotates once. Let go early and you stay upright. A clean landing is the trick. A messy one scores nothing.</p></div></div>
            <h2>The five features</h2>
            <Stage kind="hit" />
            <div className="row copy"><div><span className="tag">Hit</span><p>A small pop. Ride the lip or jump it. That is a hit.</p></div></div>
            <Stage kind="kicker" />
            <div className="row copy"><div><span className="tag">Kicker</span><p>Steep face, bigger air. Hold for the flip.</p></div></div>
            <Stage kind="flat" />
            <div className="row copy"><div><span className="tag">Flat top</span><p>Up, across the deck, down the landing. Pop the lip.</p></div></div>
            <Stage kind="rail" />
            <div className="row copy"><div><span className="tag">Rail</span><p>Ride on from the snow, hold to load a spin, pop off.</p></div></div>
            <Stage kind="log" />
            <div className="row copy"><div><span className="tag go">Log slide</span><p>Slide the log. Grind time is points. Pop off the end.</p></div></div>
            <div className="row copy"><div><span className="tag">Box</span><p>Ride-on box after the warm-up hits. Flat grind before the jump pack.</p></div></div>
            <h2>The only obstacles</h2>
            <Stage kind="grom" />
            <div className="row copy"><div><span className="tag bad">Groms</span><p>Lines 1 and 2. They wander the track. Jump or grind over them.</p></div></div>
            <Stage kind="skier" />
            <div className="row copy"><div><span className="tag bad">Skiers</span><p>From line 3, skiers join the groms. Your board is already equipped — it changes lip, grind, and pop.</p></div></div>
            <h2>Stars</h2>
            <div className="row copy"><div><span className="tag">Tricks</span><p>Hold to backflip. Tap in the air for spin — second tap is a small boost, later taps add half-turns. Hold and taps can combine. Swipe for grabs (Indy, Melon, Mute, Method, Tail, Nose, Stalefish). On rails swipe for 50-50, boardslide, lipslide, nose/tail press. Score is tricks only — no falling stars.</p></div></div>
            <h2>Board</h2>
            <div className="grid">
              {snap.boards.map((b) => (
                <button key={b.id} className={"choice" + (b.selected ? " on" : "")} type="button" disabled={!b.open} onClick={() => g()?.selectBoard(b.id)}>
                  <span className="swatch" style={{ background: b.open ? "linear-gradient(" + b.c + " 0 55%," + b.s + " 55% 75%," + b.c + " 75%)" : "#333" }} />
                  <span>{b.open ? b.name : "Locked " + b.name}<small>{b.tag} · {b.how}</small></span>
                </button>
              ))}
            </div>
            <button className="primary" type="button" onClick={() => g()?.dismissLegend()}>PLAY</button>
            <p className="foot">v0.5.1-next</p>
          </div>
        </div>
      )}
      {snap.mode === "menu" && (
        <div className="sheet menu" role="dialog" aria-label="Terrain Park">
          <div className="sheet-inner">
            <h1>TERRAIN PARK</h1>
            <p className="foot">v0.5.1-next · <button className="ghost" type="button" onClick={() => g()?.openLegend()}>How tricks work</button></p>
            <h2>Board</h2>
            <p className="boardline">{snap.nowName} · {snap.nowTag}{snap.nextName ? " · next " + snap.nextName : ""}</p>
            <div className="grid">
              {snap.boards.map((b) => (
                <button key={b.id} className={"choice" + (b.selected ? " on" : "")} type="button" disabled={!b.open} onClick={() => g()?.selectBoard(b.id)}>
                  <span className="swatch" style={{ background: b.open ? "linear-gradient(" + b.c + " 0 55%," + b.s + " 55% 75%," + b.c + " 75%)" : "#333" }} />
                  <span>{b.open ? b.name : "Locked " + b.name}<small>{b.tag} · {b.how}</small></span>
                </button>
              ))}
            </div>
            <h2>Difficulty</h2>
            <div className="grid">
              {snap.diffs.map((d) => (
                <button key={d.id} className={"choice" + (snap.diffId === d.id ? " on" : "")} type="button" onClick={() => g()?.setDiff(d.id)}>
                  <span>{d.name}<small>speed ×{d.spd} · traffic ×{d.pit} · lip ×{d.lip}</small></span>
                </button>
              ))}
            </div>
            <h2>Lines</h2>
            <div className="grid">
              {snap.levels.map((L) => (
                <button key={L.n} className={"choice" + (L.done ? " done" : "")} type="button" disabled={!L.unlocked} onClick={() => g()?.startLevel(L.n)}>
                  <b className="num">{L.unlocked ? (L.endless ? "∞" : L.n) : "–"}</b>
                  <span>{L.name}<small>{L.unlocked ? "Goal: " + L.goal + (L.best ? " · " + L.best + " " + stars(L.stars) + (L.stars < 3 ? " · replay" : "") : "") : "Locked"}</small></span>
                </button>
              ))}
            </div>
            <button className="danger" type="button" onClick={() => g()?.resetProgress()}>{snap.confirmReset ? "Tap again to reset" : "Reset progress"}</button>
            <button className="primary" type="button" onClick={() => g()?.closeMenu()}>CLOSE</button>
          </div>
        </div>
      )}
    </main>
  );
}
