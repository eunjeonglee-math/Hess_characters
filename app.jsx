
const rankOptions = {
  B: [2, 3, 4, 5],
  C: [2, 3, 4, 5],
  D: [4, 5],
  E: [6, 7, 8],
  F: [4],
  G: [2],
};

function normalizeRootSet(roots) {
  return [...roots].sort().join(" || ");
}

function normalizeRootLabel(label) {
  return String(label || "").replace(/\s+/g, "").toLowerCase();
}

function parseSelectionFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const type = (params.get("type") || "").toUpperCase() || null;
    const rankRaw = params.get("rank");
    const rank = rankRaw ? Number(rankRaw) : null;
    const idealKey = params.get("idealKey") || "";
    let upperIdealRoots = [];
    const rawUpper = params.get("upperIdeal") || params.get("upper");
    if (rawUpper) {
      try {
        const parsed = JSON.parse(rawUpper);
        if (Array.isArray(parsed)) upperIdealRoots = parsed.filter(Boolean);
        else if (typeof parsed === "string") upperIdealRoots = parsed.split("||").map((x) => x.trim()).filter(Boolean);
      } catch (_) {
        upperIdealRoots = rawUpper.split("||").map((x) => x.trim()).filter(Boolean);
      }
    }
    return {
      type,
      rank: Number.isFinite(rank) ? rank : null,
      idealKey,
      upperIdealRoots,
    };
  } catch (_) {
    return { type: null, rank: null, idealKey: "", upperIdealRoots: [] };
  }
}

function consumeSummarySelection() {
  try {
    const raw = window.localStorage.getItem("upperIdealSearchSelection");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function clearSummarySelection() {
  try {
    window.localStorage.removeItem("upperIdealSearchSelection");
  } catch (_) { }
}


function parseRootCoefficients(label, rank) {
  const coeffs = Array(rank).fill(0);
  const regex = /(?:(\d+)\*)?alpha\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(label || "")) !== null) {
    const coeff = match[1] ? Number(match[1]) : 1;
    const idx = Number(match[2]) - 1;
    if (idx >= 0 && idx < rank) coeffs[idx] += coeff;
  }
  return coeffs;
}

function simpleRootIndex(coeffs) {
  let found = -1;
  for (let i = 0; i < coeffs.length; i += 1) {
    if (coeffs[i] === 1 && found === -1) {
      found = i + 1;
    } else if (coeffs[i] !== 0) {
      return null;
    }
  }
  return found === -1 ? null : found;
}

function buildTriangleLayout(current) {
  if (!current?.rootPosetNodes?.length) return current?.rootPosetNodes || [];
  if (!["B", "C", "D"].includes(current.type)) return current.rootPosetNodes;

  const enriched = current.rootPosetNodes.map((node) => {
    const coeffs = parseRootCoefficients(node.label || "", current.rank || 0);
    const height = coeffs.reduce((a, b) => a + b, 0);
    const weighted = coeffs.reduce((sum, coeff, idx) => sum + coeff * (idx + 1), 0);
    const left = coeffs.findIndex((x) => x > 0) + 1;
    const right = coeffs.length - [...coeffs].reverse().findIndex((x) => x > 0);
    const center = height ? weighted / height : 0;
    return { ...node, _coeffs: coeffs, _height: height, _left: left, _right: right, _center: center };
  });

  const byHeight = new Map();
  for (const node of enriched) {
    const key = node._height;
    if (!byHeight.has(key)) byHeight.set(key, []);
    byHeight.get(key).push(node);
  }

  const heights = [...byHeight.keys()].sort((a, b) => a - b);
  const maxHeight = heights.length ? Math.max(...heights) : 1;
  const dx = current.type === "D" ? 92 : 98;
  const dy = current.type === "D" ? 82 : 86;

  const laidOut = [];
  for (const h of heights) {
    const row = byHeight.get(h).slice().sort((a, b) => {
      if (a._center !== b._center) return a._center - b._center;
      if (a._left !== b._left) return a._left - b._left;
      if (a._right !== b._right) return a._right - b._right;
      return (a.label || "").localeCompare(b.label || "");
    });

    const count = row.length;
    const startX = -((count - 1) * dx) / 2;
    const y = (maxHeight - h) * dy;

    row.forEach((node, idx) => {
      laidOut.push({ ...node, x: startX + idx * dx, y });
    });
  }

  return laidOut;
}

function classifyClassicalRoot(type, rank, coeffs) {
  const nz = [];
  for (let i = 0; i < coeffs.length; i += 1) if (coeffs[i] > 0) nz.push(i + 1);
  if (!nz.length) return null;
  const i = nz[0];
  const last = nz[nz.length - 1];

  if (type === "B") {
    if (coeffs[rank - 1] === 0) return { family: "minus", i, j: last + 1 };
    const allOnesToEnd = coeffs.slice(i - 1).every((c) => c === 1);
    if (allOnesToEnd) return { family: "single", i };
    let firstTwo = null;
    for (let k = i; k <= rank; k += 1) {
      if (coeffs[k - 1] === 2) { firstTwo = k; break; }
    }
    return { family: "plus", i, j: firstTwo ?? rank };
  }

  if (type === "C") {
    if (coeffs[rank - 1] === 0) return { family: "minus", i, j: last + 1 };
    const twosFromI = coeffs.slice(i - 1, rank - 1).every((c) => c === 2);
    if (twosFromI) return { family: "double", i };
    let firstTwo = null;
    for (let k = i; k <= rank - 1; k += 1) {
      if (coeffs[k - 1] === 2) { firstTwo = k; break; }
    }
    return { family: "plus", i, j: firstTwo ?? rank };
  }

  if (type === "D") {
    if (coeffs[rank - 1] === 0) return { family: "minus", i, j: last + 1 };
    let firstTwo = null;
    for (let k = i; k <= rank - 2; k += 1) {
      if (coeffs[k - 1] === 2) { firstTwo = k; break; }
    }
    if (firstTwo !== null) return { family: "plus", i, j: firstTwo };
    return { family: "plus", i, j: coeffs[rank - 2] === 1 ? rank - 1 : rank };
  }

  return null;
}

function buildClassicalGridLayout(current) {
  if (!current?.rootPosetNodes?.length) return null;
  if (!["B", "C", "D"].includes(current.type)) return null;

  const cellW = current.type === "D" ? 76 : 78;
  const cellH = 52;

  return current.rootPosetNodes.map((node) => {
    const coeffs = parseRootCoefficients(node.label || "", current.rank || 0);
    const info = classifyClassicalRoot(current.type, current.rank, coeffs);
    if (!info) return { ...node, _coeffs: coeffs, x: 0, y: 0 };

    let pos0 = 0;
    if (current.type === "B") {
      if (info.family === "minus") pos0 = info.j - info.i - 1;
      else if (info.family === "single") pos0 = current.rank - info.i;
      else if (info.family === "plus") pos0 = (current.rank - info.i + 1) + (current.rank - info.j);
    } else if (current.type === "C") {
      if (info.family === "minus") pos0 = info.j - info.i - 1;
      else if (info.family === "plus") pos0 = (current.rank - info.i) + (current.rank - info.j);
      else if (info.family === "double") pos0 = 2 * (current.rank - info.i);
    } else if (current.type === "D") {
      if (info.family === "minus") pos0 = info.j - info.i - 1;
      else if (info.family === "plus") pos0 = (current.rank - info.i) + (current.rank - info.j + 1);
    }

    const startCol = info.i + 1;
    const originalCol = startCol + pos0;
    const originalRow = info.i;
    const col = originalRow + 1;
    const row = originalCol - 1;

    return { ...node, _coeffs: coeffs, _classicalInfo: info, x: col * cellW, y: row * cellH };
  });
}

function nodeDisplayText(node, rank) {
  const coeffs = node._coeffs || parseRootCoefficients(node.label || "", rank || 0);
  const simpleIdx = simpleRootIndex(coeffs);
  if (simpleIdx !== null) return `α${simpleIdx}`;
  return node.shortLabel || node.label;
}

function formatRootList(roots) {
  if (!roots || !roots.length) return "(empty)";
  return roots.join(",\n");
}

function formatExamples(examples) {
  if (!examples || !examples.length) return "(none)";
  return examples.join(",\n");
}

function computeSvgMetrics(nodes, padX = 50, padY = 50, minW = 520, minH = 360) {
  if (!nodes?.length) return { minX: 0, minY: 0, width: minW, height: minH };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - padX;
  const minY = Math.min(...ys) - padY;
  const width = Math.max(minW, Math.max(...xs) - minX + padX + 40);
  const height = Math.max(minH, Math.max(...ys) - minY + padY + 50);
  return { minX, minY, width, height };
}

function parseWordList(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  return String(value || "")
    .match(/\d+/g)
    ?.map((x) => Number(x))
    .filter(Number.isFinite) || [];
}

function cartanMatrix(type, rank) {
  const A = Array.from({ length: rank }, (_, i) =>
    Array.from({ length: rank }, (_, j) => (i === j ? 2 : 0))
  );

  function connect(i, j, a = -1, b = -1) {
    A[i][j] = a;
    A[j][i] = b;
  }

  if (type === "B") {
    for (let i = 0; i < rank - 2; i += 1) connect(i, i + 1);
    if (rank >= 2) connect(rank - 2, rank - 1, -2, -1);
  } else if (type === "C") {
    for (let i = 0; i < rank - 2; i += 1) connect(i, i + 1);
    if (rank >= 2) connect(rank - 2, rank - 1, -1, -2);
  } else if (type === "D") {
    for (let i = 0; i < rank - 3; i += 1) connect(i, i + 1);
    if (rank >= 4) {
      connect(rank - 3, rank - 2);
      connect(rank - 3, rank - 1);
    }
  } else if (type === "E") {
    connect(0, 2);
    connect(1, 2);
    for (let i = 2; i < rank - 1; i += 1) connect(i, i + 1);
  } else if (type === "F") {
    connect(0, 1);
    connect(1, 2, -2, -1);
    connect(2, 3);
  } else if (type === "G") {
    connect(0, 1, -3, -1);
  }
  return A;
}

function identityMatrix(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function multiplyMatrices(A, B) {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < p; k += 1) {
      if (A[i][k] === 0) continue;
      for (let j = 0; j < m; j += 1) out[i][j] += A[i][k] * B[k][j];
    }
  }
  return out;
}

function reflectionMatrix(cartan, i) {
  const n = cartan.length;
  const M = identityMatrix(n);
  for (let j = 0; j < n; j += 1) M[i][j] -= cartan[i][j];
  return M;
}

function wordToMatrix(word, type, rank) {
  const cartan = cartanMatrix(type, rank);
  const reflections = cartan.map((_, i) => reflectionMatrix(cartan, i));
  let M = identityMatrix(rank);
  for (const letter of word) {
    if (letter < 1 || letter > rank) throw new Error(`Generator ${letter} is outside the range 1..${rank}.`);
    M = multiplyMatrices(M, reflections[letter - 1]);
  }
  return M;
}

function serializeMatrix(M) {
  return M.flat().join(",");
}

function sortWordEntries(entries) {
  return entries.slice().sort((a, b) => {
    const lenA = (a.reducedWord || []).length;
    const lenB = (b.reducedWord || []).length;
    if (lenA !== lenB) return lenA - lenB;
    return (a.reducedWord || []).join(" ").localeCompare((b.reducedWord || []).join(" "));
  });
}

function buildWordIndex(wordFile, type, rank) {
  const entries = Array.isArray(wordFile?.entries) ? wordFile.entries : [];
  return sortWordEntries(entries.map((entry) => {
    const reducedWord = parseWordList(entry.reducedWord);
    let key = "";
    try {
      key = serializeMatrix(wordToMatrix(reducedWord, type, rank));
    } catch (_) {
      key = "";
    }
    return {
      ...entry,
      reducedWord,
      matrixKey: key,
      eweRoots: entry.eweRoots || entry.eweComplementRoots || entry.ewe || [],
    };
  })).filter((entry) => entry.matrixKey);
}


function normalizePermutationDisplay(candidate) {
  if (candidate === null || candidate === undefined) return "";
  const raw = Array.isArray(candidate) ? candidate.join(" ") : String(candidate).trim();
  if (!raw) return "(identity)";
  const lower = raw.toLowerCase();
  if (lower === "e" || lower === "identity" || lower === "(identity)") return "(identity)";
  const digits = parseWordList(raw);
  return digits.length ? digits.join(", ") : raw;
}


function representativeCorrespondingWord(entry) {
  function pick(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return pick(value[0]);
    if (typeof value === "object") {
      const vals = Object.values(value);
      return vals.length ? pick(vals[0]) : "";
    }
    const raw = String(value).trim();
    if (!raw) return "";
    const parts = raw.split(/\s*;\s*|\s*\|\s*/).filter(Boolean);
    return parts.length ? parts[0] : raw;
  }
  return normalizePermutationDisplay(pick(entry?.correspondingWord));
}

function collectPermutationDisplays(entry, type, rank) {
  if (!entry) return [];
  const candidates = [];
  function pushMaybe(value) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) { value.forEach(pushMaybe); return; }
    if (typeof value === "object") { Object.values(value).forEach(pushMaybe); return; }
    candidates.push(value);
  }
  pushMaybe(entry.allPermutations);
  pushMaybe(entry.permutations);
  pushMaybe(entry.smoothPermutations);
  pushMaybe(entry.smoothPermutationWords);
  pushMaybe(entry.examples);
  pushMaybe(entry.correspondingWord);
  const seen = new Set();
  const out = [];
  for (const candidate of candidates) {
    const digits = parseWordList(candidate);
    const display = normalizePermutationDisplay(candidate);
    if (!display) continue;
    let key = `S:${display.toLowerCase()}`;
    if (digits.length) {
      try { key = `M:${serializeMatrix(wordToMatrix(digits, type, rank))}`; } catch (_) { key = `W:${digits.join(",")}`; }
    } else if (display === "(identity)") {
      key = "ID";
    }
    if (!seen.has(key)) { seen.add(key); out.push(display); }
  }
  return out;
}

function collectAllSmoothPermutationsForUpperIdeal(entry, upperIdealRoots, wordIndex, current, type, rank) {
  const out = [];
  const seen = new Set();

  function pushDisplay(display, keyHint = "") {
    if (!display) return;
    const key = keyHint || `S:${String(display).toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); out.push(display); }
  }

  collectPermutationDisplays(entry, type, rank).forEach((display) => {
    const digits = parseWordList(display);
    let key = "";
    if (digits.length) {
      try { key = `M:${serializeMatrix(wordToMatrix(digits, type, rank))}`; } catch (_) { }
    } else if (display === "(identity)") {
      key = "ID";
    }
    pushDisplay(display, key);
  });

  const allRoots = (current?.rootPosetNodes || []).map((n) => n.label);
  const target = normalizeRootSet(upperIdealRoots || []);
  for (const wordEntry of wordIndex || []) {
    const eweSet = new Set((wordEntry.eweRoots || []).map((x) => String(x || "").replace(/\s+/g, "").toLowerCase()));
    const inducedUpperIdeal = allRoots.filter((root) => !eweSet.has(String(root || "").replace(/\s+/g, "").toLowerCase()));
    if (normalizeRootSet(inducedUpperIdeal) !== target) continue;
    const display = normalizePermutationDisplay(wordEntry.reducedWord);
    const key = wordEntry.matrixKey ? `M:${wordEntry.matrixKey}` : display;
    pushDisplay(display, key);
  }
  return out;
}

function isComplementIdeal(nodeIds, edges) {
  const set = new Set(nodeIds);
  for (const [from, to] of edges || []) {
    if (set.has(from) && !set.has(to)) return false;
  }
  return true;
}

function minimalElementsOfSet(nodeIds, edges) {
  const set = new Set(nodeIds);
  const preds = {};
  for (const [from, to] of edges || []) {
    preds[to] = preds[to] || [];
    preds[to].push(from);
  }
  return nodeIds.filter((id) => !(preds[id] || []).some((pred) => set.has(pred)));
}

function stopToolbarPropagation(event) {
  event.stopPropagation();
}

function TableBlock({ title, columns, rows }) {
  if (!columns || !rows) return null;
  const degrees = Object.keys(rows).map(Number).sort((a, b) => a - b);
  return (
    <div className="table-card">
      <div className="table-title">{title}</div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>degree</th>
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {degrees.map((deg) => (
              <tr key={deg}>
                <td>{`u^${deg}`}</td>
                {columns.map((col) => <td key={col}>{rows[deg]?.[col] || ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const initialSelection = React.useMemo(() => {
    const fromUrl = parseSelectionFromLocation();
    const fromStorage = consumeSummarySelection();
    const preferred =
      (fromUrl && fromUrl.type && Number.isFinite(Number(fromUrl.rank))) ? fromUrl
        : (fromStorage && fromStorage.type && Number.isFinite(Number(fromStorage.rank))) ? fromStorage
          : null;
    return preferred || { type: "C", rank: 2, upperIdealRoots: [] };
  }, []);
  const [type, setType] = React.useState(initialSelection.type || "C");
  const [rank, setRank] = React.useState(initialSelection.rank || 2);
  const [current, setCurrent] = React.useState(null);
  const [wordFile, setWordFile] = React.useState({ entries: [] });
  const [selectedNodes, setSelectedNodes] = React.useState([]);
  const [selectedKey, setSelectedKey] = React.useState("");
  const [displayInfo, setDisplayInfo] = React.useState(null);
  const [status, setStatus] = React.useState("Loading data...");
  const [wordInput, setWordInput] = React.useState("");
  const [wordResult, setWordResult] = React.useState(null);
  const [panelMode, setPanelMode] = React.useState("manual");
  const splitRef = React.useRef(null);
  const pendingSelectionRef = React.useRef((initialSelection.upperIdealRoots || []).length ? initialSelection : null);
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(() => {
    const saved = window.localStorage.getItem("root-poset-left-panel-width");
    const value = saved ? Number(saved) : 42;
    return Number.isFinite(value) ? Math.min(70, Math.max(28, value)) : 42;
  });

  const rawNodeLabelMap = React.useMemo(
    () => Object.fromEntries((current?.rootPosetNodes || []).map((n) => [n.id, n.label])),
    [current]
  );


  React.useEffect(() => {
    async function loadData() {
      setStatus(`Loading data/${type}${rank}.json ...`);
      setCurrent(null);
      setWordFile({ entries: [] });
      setSelectedNodes([]);
      setSelectedKey("");
      setDisplayInfo(null);
      setWordResult(null);
      setPanelMode("manual");
      try {
        const mainResponse = await fetch(`./data/${type}${rank}.json`);
        if (!mainResponse.ok) throw new Error(`Could not load data/${type}${rank}.json`);
        const data = await mainResponse.json();
        setCurrent(data);

        let nextWordFile = { entries: [] };
        try {
          const wordResponse = await fetch(`./data/${type}${rank}_words.json`);
          if (wordResponse.ok) nextWordFile = await wordResponse.json();
        } catch (_) {
          nextWordFile = { entries: [] };
        }
        setWordFile(nextWordFile);

        const firstKey = Object.keys(data.lowerIdeals || {})[0] || "";
        setSelectedKey((prev) => prev ? prev : firstKey);
        setDisplayInfo((prev) => {
          if (prev !== null) return prev;
          if (firstKey && data.lowerIdeals?.[firstKey]) {
            return { matched: true, data: data.lowerIdeals[firstKey] };
          }
          return null;
        });
        setStatus("");
      } catch (err) {
        setStatus(err.message);
      }
    }
    loadData();
  }, [type, rank]);

  React.useEffect(() => {
    window.localStorage.setItem("root-poset-left-panel-width", String(leftPanelWidth));
  }, [leftPanelWidth]);


  const rootLabelToId = React.useMemo(
    () => Object.fromEntries((current?.rootPosetNodes || []).map((n) => [normalizeRootLabel(n.label), n.id])),
    [current]
  );

  React.useEffect(() => {
    if (!current) return;
    const pending = pendingSelectionRef.current;
    if (!pending) return;
    if ((pending.type && String(pending.type).toUpperCase() !== String(type).toUpperCase()) ||
      (pending.rank && Number(pending.rank) !== Number(rank))) {
      return;
    }

    const roots = (pending.upperIdealRoots || []).filter(Boolean);
    const preferredKey = String(pending.idealKey || pending.key || "").trim();

    if (!roots.length && !preferredKey) {
      pendingSelectionRef.current = null;
      clearSummarySelection();
      return;
    }

    let lookup = null;
    if (preferredKey && current.lowerIdeals?.[preferredKey]) {
      lookup = [preferredKey, current.lowerIdeals[preferredKey]];
    }

    const lookupRoots = lookup ? (lookup[1].complementRoots || []) : roots;
    const nodeIds = lookupRoots
      .map((root) => rootLabelToId[normalizeRootLabel(root)])
      .filter(Boolean);

    if (!nodeIds.length) {
      setStatus("Could not match the selected upper ideal in the current root poset.");
      pendingSelectionRef.current = null;
      clearSummarySelection();
      return;
    }

    const minIds = minimalElementsOfSet(nodeIds, current.rootPosetEdges || []);
    setSelectedNodes(minIds);
    setPanelMode("manual");
    setWordResult(null);

    if (!lookup) {
      const target = normalizeRootSet(roots);
      lookup = Object.entries(current.lowerIdeals || {}).find(([_, value]) => {
        const listedRoots = value.complementRoots || [];
        return normalizeRootSet(listedRoots) === target;
      }) || null;
    }

    if (lookup) {
      setSelectedKey(lookup[0]);
      setDisplayInfo({ matched: true, data: lookup[1] });
    } else {
      setSelectedKey("");
      setDisplayInfo({
        matched: false,
        data: {
          complementRoots: roots,
          smooth: false,
          correspondingWord: "",
          examples: [],
        },
      });
    }

    setStatus("");
    pendingSelectionRef.current = null;
    clearSummarySelection();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("type");
      url.searchParams.delete("rank");
      url.searchParams.delete("upperIdeal");
      url.searchParams.delete("upper");
      url.searchParams.delete("idealKey");
      window.history.replaceState({}, "", url.toString());
    } catch (_) { }
  }, [current, type, rank, rootLabelToId]);

  function beginResize(event) {
    if (!splitRef.current) return;
    event.preventDefault();
    document.body.classList.add("is-resizing");
    const handleMove = (clientX) => {
      const rect = splitRef.current.getBoundingClientRect();
      const rawPct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(28, rawPct));
      setLeftPanelWidth(clamped);
    };
    const onMouseMove = (e) => handleMove(e.clientX);
    const onTouchMove = (e) => { if (e.touches?.[0]) handleMove(e.touches[0].clientX); };
    const stop = () => {
      document.body.classList.remove("is-resizing");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stop);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stop);
  }

  const displayNodes = React.useMemo(() => buildTriangleLayout(current), [current]);
  const classicalNodes = React.useMemo(() => buildClassicalGridLayout(current), [current]);
  const nodeMap = React.useMemo(
    () => Object.fromEntries((displayNodes || []).map((n) => [n.id, n])),
    [displayNodes]
  );
  const classicalNodeMap = React.useMemo(
    () => Object.fromEntries((classicalNodes || []).map((n) => [n.id, n])),
    [classicalNodes]
  );
  const svgMetrics = React.useMemo(() => computeSvgMetrics(displayNodes, 50, 50, 520, 360), [displayNodes]);
  const classicalSvgMetrics = React.useMemo(() => computeSvgMetrics(classicalNodes, 70, 45, 560, 280), [classicalNodes]);
  const wordIndex = React.useMemo(() => buildWordIndex(wordFile, type, rank), [wordFile, type, rank]);

  function isDisabled(nodeId) {
    if (!current?.incompatible) return false;
    return selectedNodes.some((picked) => current.incompatible[picked]?.includes(nodeId));
  }

  function getUpperClosure(startId) {
    const adjacency = {};
    for (const [from, to] of current?.rootPosetEdges || []) {
      adjacency[from] = adjacency[from] || [];
      adjacency[from].push(to);
    }
    const visited = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
      const node = queue.shift();
      for (const nxt of adjacency[node] || []) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push(nxt);
        }
      }
    }
    return [...visited];
  }

  const manualComplementNodeIds = React.useMemo(() => {
    const all = new Set();
    for (const nodeId of selectedNodes) {
      for (const upper of getUpperClosure(nodeId)) all.add(upper);
    }
    return [...all];
  }, [selectedNodes, current]);

  const manualComplementRoots = React.useMemo(() => {
    return (current?.rootPosetNodes || [])
      .filter((node) => manualComplementNodeIds.includes(node.id))
      .map((node) => node.label);
  }, [current, manualComplementNodeIds]);

  const selectedData = displayInfo?.data || current?.lowerIdeals?.[selectedKey];

  function executePushSelection(newNodes) {
    if (!current) return;
    setPanelMode("manual");

    const all = new Set();
    for (const nodeId of newNodes) {
      for (const upper of getUpperClosure(nodeId)) all.add(upper);
    }
    const newComplementRoots = (current?.rootPosetNodes || [])
      .filter((node) => all.has(node.id))
      .map((node) => node.label);

    const target = normalizeRootSet(newComplementRoots);
    const lookup = Object.entries(current.lowerIdeals || {}).find(([_, value]) => {
      const roots = value.complementRoots || [];
      return normalizeRootSet(roots) === target;
    });

    if (lookup) {
      setSelectedKey(lookup[0]);
      setDisplayInfo({ matched: true, data: lookup[1] });
      setStatus("");
    } else {
      setSelectedKey("");
      setDisplayInfo({
        matched: false,
        data: {
          complementRoots: newComplementRoots,
          smooth: false,
          correspondingWord: "",
          examples: [],
        },
      });
      if (newComplementRoots.length > 0) {
        setStatus("No matching smooth Schubert variety was found for the current selection.");
      } else {
        setStatus("");
      }
    }
  }

  function toggleNode(nodeId) {
    setPanelMode("manual");
    setWordResult((prev) => prev ? { ...prev, active: false } : prev);
    let newSelected;
    if (selectedNodes.includes(nodeId)) {
      newSelected = selectedNodes.filter((x) => x !== nodeId);
    } else {
      if (isDisabled(nodeId)) return;
      newSelected = [...selectedNodes, nodeId];
    }
    setSelectedNodes(newSelected);
    executePushSelection(newSelected);
  }

  function pushSelectionRight() {
    executePushSelection(selectedNodes);
  }



  function pushWordLeft() {
    if (!current) return;
    const parsedWord = parseWordList(wordInput);
    if (!parsedWord.length) {
      setWordResult({
        active: true,
        matched: false,
        message: "Please enter a word such as 3,2,3,2 or [1,1,2,3,2,3].",
      });
      setPanelMode("word");
      return;
    }
    if (parsedWord.some((letter) => letter < 1 || letter > rank)) {
      setWordResult({
        active: true,
        matched: false,
        parsedWord,
        message: `Every generator must be between 1 and ${rank}.`,
      });
      setPanelMode("word");
      return;
    }
    if (!wordIndex.length) {
      setWordResult({
        active: true,
        matched: false,
        parsedWord,
        message: `No word-lookup file data/${type}${rank}_words.json is available yet.`,
      });
      setPanelMode("word");
      return;
    }

    let key = "";
    try {
      key = serializeMatrix(wordToMatrix(parsedWord, type, rank));
    } catch (err) {
      setWordResult({
        active: true,
        matched: false,
        parsedWord,
        message: err.message,
      });
      setPanelMode("word");
      return;
    }

    const match = wordIndex.find((entry) => entry.matrixKey === key);
    if (!match) {
      setWordResult({
        active: true,
        matched: false,
        parsedWord,
        message: "No matching reduced word was found in the current word data.",
      });
      setPanelMode("word");
      return;
    }

    const eweRoots = match.eweRoots || [];
    const allRoots = (current.rootPosetNodes || []).map((node) => node.label);
    const eweRootSet = new Set(eweRoots.map((root) => normalizeRootLabel(root)));
    const missingRoots = eweRoots.filter((root) => !rootLabelToId[normalizeRootLabel(root)]);
    const complementRoots = allRoots.filter((root) => !eweRootSet.has(normalizeRootLabel(root)));
    const complementNodeIds = complementRoots
      .map((root) => rootLabelToId[normalizeRootLabel(root)])
      .filter(Boolean);

    const ideal = missingRoots.length === 0 && isComplementIdeal(complementNodeIds, current.rootPosetEdges || []);
    const minimalNodeIds = ideal ? minimalElementsOfSet(complementNodeIds, current.rootPosetEdges || []) : [];

    if (ideal) {
      const target = normalizeRootSet(complementRoots);
      const lookup = Object.entries(current.lowerIdeals || {}).find(([_, value]) => {
        const roots = value.complementRoots || [];
        return normalizeRootSet(roots) === target;
      });
      if (lookup) {
        setSelectedKey(lookup[0]);
        setDisplayInfo({ matched: true, data: lookup[1] });
      } else {
        setSelectedKey("");
        setDisplayInfo({
          matched: false,
          data: {
            complementRoots,
            smooth: false,
            correspondingWord: "",
            examples: [],
          },
        });
      }
    }

    setWordResult({
      active: true,
      matched: true,
      parsedWord,
      matchedReducedWord: match.reducedWord || [],
      rationallySmooth: !!match.rationallySmooth,
      smooth: !!match.smooth,
      eweRoots,
      complementRoots,
      complementNodeIds,
      minimalNodeIds,
      ideal,
      missingRoots,
      message: missingRoots.length
        ? "Some roots from the uploaded word data were not found in the current root-poset labels."
        : ideal
          ? ""
          : "The highlighted complement of E(w) is not an upper ideal in the root poset.",
    });
    setPanelMode("word");
    setStatus("");
  }

  const activeDisplay = React.useMemo(() => {
    if (panelMode === "word" && wordResult?.active && wordResult?.matched) {
      return {
        blackIds: wordResult.ideal ? wordResult.minimalNodeIds : [],
        yellowIds: wordResult.complementNodeIds,
        message: wordResult.message || "",
      };
    }
    return {
      blackIds: selectedNodes,
      yellowIds: manualComplementNodeIds,
      message: "",
    };
  }, [panelMode, wordResult, selectedNodes, manualComplementNodeIds]);

  const blackLabels = activeDisplay.blackIds.map((id) => rawNodeLabelMap[id]).filter(Boolean);
  const yellowLabels = activeDisplay.yellowIds.map((id) => rawNodeLabelMap[id]).filter(Boolean);

  function renderNodeGlyph(node, useRect = false) {
    const selected = activeDisplay.blackIds.includes(node.id);
    const derived = !selected && activeDisplay.yellowIds.includes(node.id);
    const disabled = panelMode !== "word" && !selected && !derived && isDisabled(node.id);
    const fill = selected ? "#0f172a" : derived ? "#fde68a" : disabled ? "#e2e8f0" : "white";
    const stroke = selected ? "#0f172a" : derived ? "#f59e0b" : "#94a3b8";
    const textFill = selected ? "white" : disabled ? "#94a3b8" : "#0f172a";
    const label = nodeDisplayText(node, current?.rank);

    if (useRect) {
      return (
        <g key={node.id} onClick={() => toggleNode(node.id)} style={{ cursor: "pointer" }}>
          <rect x={node.x - 36} y={node.y - 18} width="72" height="36" rx="6" fill={fill} stroke={stroke} strokeWidth="2" />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fill={textFill}>{label}</text>
        </g>
      );
    }

    return (
      <g key={node.id} onClick={() => toggleNode(node.id)} style={{ cursor: "pointer" }}>
        <circle cx={node.x} cy={node.y} r="24" fill={fill} stroke={stroke} strokeWidth="2" />
        <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill={textFill}>{label}</text>
      </g>
    );
  }

  const wordStatusBox = wordResult?.active ? (
    <div className={`info-box ${wordResult.matched ? (wordResult.ideal ? "success-box" : "warning-box") : "warning-box"}`} style={{ marginTop: "16px" }}>
      <div className="info-grid">
        <div>
          <div className="info-title">Parsed input</div>
          <div className="wrap-block mono">{(wordResult.parsedWord || []).join(", ") || "(none)"}</div>
        </div>
        {wordResult.matched ? (
          <>
            <div>
              <div className="info-title">Matched reduced word</div>
              <div className="wrap-block mono">{(wordResult.matchedReducedWord || []).join(", ") || "(identity)"}</div>
            </div>
            <div>
              <div className="info-title">Is X(w) rationally smooth?</div>
              <div><strong>{wordResult.rationallySmooth ? "Yes" : "No"}</strong></div>
            </div>
            <div>
              <div className="info-title">Is X(w) smooth?</div>
              <div><strong>{wordResult.smooth ? "Yes" : "No"}</strong></div>
            </div>
            <div>
              <div className="info-title">E(w)</div>
              <div className="wrap-block">{formatRootList(wordResult.complementRoots)}</div>
            </div>
          </>
        ) : null}
        {wordResult.message ? (
          <div>
            <div className="info-title">Message</div>
            <div className="wrap-block">{wordResult.message}</div>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="container">
      <div className="card">
        <h1>Root Poset / Hessenberg Data Browser</h1>
        <p>
          The page reads upper-ideal data from <code>data/&lt;type&gt;&lt;rank&gt;.json</code> and optional word data from
          <code> data/&lt;type&gt;&lt;rank&gt;_words.json</code>. Use the right arrow to send a selected upper ideal to the tables,
          and the left arrow to send a word lookup back to the poset panel.
        </p>
      </div>

      <div className="card">
        <div className="controls">
          <div>
            <label htmlFor="typeSelect">Type of G</label>
            <select
              id="typeSelect"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value;
                setType(nextType);
                setRank(rankOptions[nextType][0]);
              }}
            >
              {Object.keys(rankOptions).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="rankSelect">Rank of G</label>
            <select id="rankSelect" value={rank} onChange={(e) => setRank(Number(e.target.value))}>
              {rankOptions[type].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {status && <div style={{ marginTop: "12px", color: "#64748b" }}>{status}</div>}
      </div>

      <div className="split-grid" ref={splitRef} style={{ "--left-panel-width": `${leftPanelWidth}%` }}>
        <div className="card left-card">
          <div className="header-row">
            <h2>Root Poset</h2>
            <div className="small-muted">
              {panelMode === "word" ? "highlighted from the word lookup" : "select pairwise incompatible minimal elements"}
            </div>
          </div>

          {current?.rootPosetNodes ? (
            <>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>Poset view</div>
              <div className="canvas-wrap">
                <svg
                  viewBox={`${svgMetrics.minX} ${svgMetrics.minY} ${svgMetrics.width} ${svgMetrics.height}`}
                  width={svgMetrics.width}
                  height={svgMetrics.height}
                >
                  {(current.rootPosetEdges || []).map(([a, b], idx) => (
                    <line key={idx} x1={nodeMap[a].x} y1={nodeMap[a].y} x2={nodeMap[b].x} y2={nodeMap[b].y} stroke="#cbd5e1" strokeWidth="2" />
                  ))}
                  {(displayNodes || []).map((node) => renderNodeGlyph(node, false))}
                </svg>
              </div>

              {classicalNodes ? (
                <>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "16px", marginBottom: "8px" }}>
                    Reflected classical layout (synchronized)
                  </div>
                  <div className="canvas-wrap">
                    <svg
                      viewBox={`${classicalSvgMetrics.minX} ${classicalSvgMetrics.minY} ${classicalSvgMetrics.width} ${classicalSvgMetrics.height}`}
                      width={classicalSvgMetrics.width}
                      height={classicalSvgMetrics.height}
                    >
                      {(current.rootPosetEdges || []).map(([a, b], idx) => (
                        <line
                          key={idx}
                          x1={classicalNodeMap[a].x}
                          y1={classicalNodeMap[a].y}
                          x2={classicalNodeMap[b].x}
                          y2={classicalNodeMap[b].y}
                          stroke="#cbd5e1"
                          strokeWidth="2"
                        />
                      ))}
                      {(classicalNodes || []).map((node) => renderNodeGlyph(node, true))}
                    </svg>
                  </div>
                </>
              ) : null}

              <div className="legend-row">
                <div className="legend-item"><span className="legend-dot selected-dot"></span>minimal / selected roots</div>
                <div className="legend-item"><span className="legend-dot derived-dot"></span>highlighted complement roots</div>
                <div className="legend-item"><span className="legend-dot disabled-dot"></span>disabled in manual mode</div>
              </div>
            </>
          ) : (
            <div className="info-box">No root poset data is available for this type/rank yet.</div>
          )}

          <div style={{ marginTop: "16px" }}>
            <div className="info-title">
              {panelMode === "word" ? "Black roots currently shown" : "Selected minimal roots"}
            </div>
            <div className="chips">
              {blackLabels.length ? blackLabels.map((label) => (
                <span key={label} className="chip">{label}</span>
              )) : <span className="empty">{panelMode === "word" ? "No black roots are currently displayed." : "Nothing has been selected yet."}</span>}
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div className="info-title">
              {panelMode === "word" ? "Highlighted roots from E(w)" : "Derived complement roots"}
            </div>
            <div className="chips">
              {yellowLabels.length ? yellowLabels.map((label) => (
                <span key={label} className="chip derived-chip">{label}</span>
              )) : <span className="empty">{panelMode === "word" ? "No word-induced complement is displayed yet." : "No complement has been derived yet."}</span>}
            </div>
          </div>

          {panelMode === "word" && activeDisplay.message ? (
            <div className="info-box warning-box" style={{ marginTop: "16px" }}>
              <div className="wrap-block">{activeDisplay.message}</div>
            </div>
          ) : null}
        </div>

        <div
          className="splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize columns"
          title="Drag to resize columns"
          onMouseDown={beginResize}
          onTouchStart={beginResize}
          onDoubleClick={() => setLeftPanelWidth(42)}
        >
          <div className="splitter-line" />
          <div className="splitter-toolbar">
            <button
              className="toolbar-btn"
              title="Send the selected upper ideal to the table panel"
              onMouseDown={stopToolbarPropagation}
              onTouchStart={stopToolbarPropagation}
              onClick={pushSelectionRight}
            >
              →
            </button>
            <div className="toolbar-hint">selected upper ideal → right</div>
            <button
              className="toolbar-btn"
              title="Send the entered word to the poset panel"
              onMouseDown={stopToolbarPropagation}
              onTouchStart={stopToolbarPropagation}
              onClick={pushWordLeft}
            >
              ←
            </button>
            <div className="toolbar-hint">word lookup → left</div>
          </div>
        </div>

        <div className="card right-card">
          <h2 style={{ marginBottom: "16px" }}>Permutation / reduced word lookup</h2>
          <div className="info-box">
            <div className="info-grid">
              <div>
                <div className="info-title">Enter a word</div>
                <textarea
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder="Examples: 3,2,3,2   or   [1, 1, 2, 3, 2, 3]"
                />
              </div>
              <div className="muted-note">
                The left arrow compares the entered word to the reduced words listed in
                <code> data/{type}{rank}_words.json</code>. It matches equivalent words by comparing the corresponding Weyl-group element,
                so cancellations and braid-equivalent forms can still be found.
              </div>
            </div>
          </div>
          {wordStatusBox}

          <div style={{ marginTop: "20px" }}>
            <h2 style={{ marginBottom: "16px" }}>Selected upper ideal information</h2>
            {selectedData ? (
              <>
                <div className="info-box top-info-box">
                  <div className="info-grid">
                    <div>
                      <div className="info-title">Upper ideal roots</div>
                      <div className="wrap-block">{formatRootList(selectedData.complementRoots)}</div>
                    </div>
                    <div>
                      <div className="info-title">Smooth Schubert variety?</div>
                      <div><strong>{selectedData.smooth ? "Yes" : "No"}</strong></div>
                    </div>
                    {selectedData.smooth || selectedData.correspondingWord !== undefined ? (
                      <div>
                        <div className="info-title">Corresponding word</div>
                        <div className="wrap-block mono">{(() => {
                          const rawWord = selectedData.correspondingWord ?? selectedData.correspondingReducedWord ?? selectedData.correspondingReudcedWord;
                          if (rawWord == null || String(rawWord).trim() === "") return "(none)";
                          return typeof rawWord === "string" ? rawWord : JSON.stringify(rawWord);
                        })()}</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedData.smooth ? (
                  <>
                    <TableBlock title="Irreducible representation table" columns={selectedData.irrepColumns} rows={selectedData.irrepRows} />
                    <TableBlock title="ICC / irreducible correspondence table" columns={selectedData.iccColumns} rows={selectedData.iccRows} />
                    <TableBlock title="Double h-basis table" columns={selectedData.doubleHColumns} rows={selectedData.doubleHRows} />
                  </>
                ) : null}
              </>
            ) : (
              <div className="info-box">No upper-ideal data is available for the current selection.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
