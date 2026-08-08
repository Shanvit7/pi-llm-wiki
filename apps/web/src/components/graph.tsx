/* Deterministic knowledge-graph SVG — a "living network":
 * solid structure lines, energy packets flowing along edges,
 * sonar rings broadcasting from the hub, a spinning dashed orbit,
 * staggered node twinkle. All CSS-driven; CSS inlined so it ships
 * with the static export. */

const HUB = [210, 150];

const NODES = [
  [210, 150],
  [120, 60],
  [300, 52],
  [72, 130],
  [346, 118],
  [96, 224],
  [324, 220],
  [150, 290],
  [270, 292],
  [42, 205],
  [378, 178],
  [48, 84],
  [368, 66],
] as const;

const EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [0, 9],
  [0, 10],
  [0, 11],
  [0, 12],
  [1, 3],
  [1, 11],
  [2, 4],
  [2, 12],
  [3, 9],
  [4, 10],
  [5, 7],
  [5, 9],
  [6, 8],
  [6, 10],
  [7, 8],
  [11, 12],
];

const HIGHLIGHT: number[] = [0, 4, 6, 8];

const isHighlightEdge = (a: number, b: number) =>
  HIGHLIGHT.some((n, j) => n === a && HIGHLIGHT[j + 1] === b);

const Graph = () => (
  <>
    <style>{`
      /* structure lines — static, faint */
      .g-struct {
        opacity: 0.4;
      }
      .g-struct-hl {
        opacity: 0.7;
      }

      /* energy packets flowing along edges */
      @keyframes g-flow {
        to { stroke-dashoffset: -21; }
      }
      .g-flow {
        stroke-dasharray: 2.5 8;
        animation: g-flow 1.6s linear infinite;
      }
      .g-flow-hl {
        stroke-dasharray: 4 7;
        animation-duration: 1.1s;
        stroke-width: 2;
      }

      /* sonar rings broadcasting from the hub */
      @keyframes g-ring {
        0%   { transform: scale(0.2); opacity: 0.55; }
        70%  { opacity: 0.12; }
        100% { transform: scale(1.75); opacity: 0; }
      }
      .g-ring {
        transform-box: fill-box;
        transform-origin: center;
        animation: g-ring 2.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
      }

      /* slow spinning dashed orbit around the hub */
      @keyframes g-spin {
        to { transform: rotate(360deg); }
      }
      .g-orbit {
        transform-box: fill-box;
        transform-origin: center;
        stroke-dasharray: 5 9;
        animation: g-spin 9s linear infinite;
      }

      /* hub breathing */
      @keyframes g-hub-pulse {
        0%, 100% { transform: scale(1); opacity: 0.06; }
        50% { transform: scale(1.18); opacity: 0.24; }
      }
      .g-hub {
        transform-box: fill-box;
        transform-origin: center;
        animation: g-hub-pulse 2.6s ease-in-out infinite;
      }
      @keyframes g-glow-pulse {
        0%, 100% { opacity: 0.03; }
        50% { opacity: 0.22; }
      }
      .g-glow {
        animation: g-glow-pulse 2.6s ease-in-out infinite;
      }

      /* node twinkle */
      @keyframes g-node {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }
      .g-node {
        animation: g-node 3s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .g-flow, .g-flow-hl, .g-ring, .g-orbit, .g-hub, .g-glow, .g-node {
          animation: none;
        }
      }
    `}</style>

    <svg
      viewBox="0 0 420 320"
      role="img"
      aria-label="Animated knowledge graph: a central hub linked to twelve concept nodes with energy flowing along the edges"
      className="h-auto w-full"
    >
      <defs>
        <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* hub glow */}
      <circle cx={HUB[0]} cy={HUB[1]} r="64" fill="url(#hub-glow)" className="g-glow" />

      {/* edges: structure line + flowing energy line */}
      {EDGES.map(([a, b], i) => {
        const hl = isHighlightEdge(a, b);
        const x1 = NODES[a][0];
        const y1 = NODES[a][1];
        const x2 = NODES[b][0];
        const y2 = NODES[b][1];
        const flowDelay = `${(i % 6) * 0.27}s`;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hl ? "var(--color-primary)" : "var(--line)"}
              strokeWidth={hl ? 1.6 : 1}
              className={hl ? "g-struct g-struct-hl" : "g-struct"}
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-primary)"
              className={hl ? "g-flow g-flow-hl" : "g-flow"}
              style={{ animationDelay: flowDelay }}
            />
          </g>
        );
      })}

      {/* sonar rings */}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={HUB[0]}
          cy={HUB[1]}
          r="44"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          className="g-ring"
          style={{ animationDelay: `${i * 0.93}s` }}
        />
      ))}

      {/* spinning orbit */}
      <circle
        cx={HUB[0]}
        cy={HUB[1]}
        r="32"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1"
        className="g-orbit"
      />

      {/* nodes */}
      {NODES.slice(1).map(([x, y], i) => (
        <g key={i} className="g-node" style={{ animationDelay: `${(i % 4) * 0.75}s` }}>
          <circle cx={x} cy={y} r="4" fill="var(--color-primary)" />
          <text
            x={x + (x < HUB[0] ? -10 : 10)}
            y={y + 3}
            textAnchor={x < HUB[0] ? "end" : "start"}
            className="fill-current"
            fontSize="9"
            opacity="0.5"
          >
            concept
          </text>
        </g>
      ))}

      {/* hub */}
      <circle cx={HUB[0]} cy={HUB[1]} r="22" fill="var(--color-primary)" className="g-hub" />
      <circle
        cx={HUB[0]}
        cy={HUB[1]}
        r="8"
        fill="var(--color-primary)"
        stroke="var(--paper)"
        strokeWidth="2.5"
      />
    </svg>
  </>
);

export default Graph;
