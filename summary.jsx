
const rankOptions = {
  B: [2, 3, 4, 5],
  C: [2, 3, 4, 5],
  D: [4, 5, 6],
  E: [6, 7, 8],
  F: [4],
  G: [2],
};

function normalizeWordDisplay(word) {
  if (word == null || String(word).trim() === "") return "";
  return typeof word === "string" ? word : JSON.stringify(word);
}

function normalizeRootSet(roots) {
  return [...(roots || [])].sort().join(" || ");
}

function buildMaps(data) {
  const nodes = data?.rootPosetNodes || [];
  const edges = data?.rootPosetEdges || [];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const labelToId = {};
  nodes.forEach((n) => { labelToId[n.label] = n.id; });

  const preds = {};
  const succs = {};
  edges.forEach(([from, to]) => {
    preds[to] = preds[to] || [];
    preds[to].push(from);
    succs[from] = succs[from] || [];
    succs[from].push(to);
  });

  return { nodeMap, labelToId, preds, succs };
}

function computeMinimalGenerators(data, roots) {
  const set = new Set(roots || []);
  const { labelToId, nodeMap, preds } = buildMaps(data);
  const mins = [];
  for (const root of set) {
    const id = labelToId[root];
    const predecessors = preds[id] || [];
    const hasPredInside = predecessors.some((pid) => set.has(nodeMap[pid]?.label));
    if (!hasPredInside) mins.push(root);
  }
  return mins.sort((a, b) => a.localeCompare(b));
}

function topologicalOrderDesc(data) {
  const nodes = data?.rootPosetNodes || [];
  const edges = data?.rootPosetEdges || [];
  const indeg = {};
  const succs = {};
  nodes.forEach((n) => { indeg[n.id] = 0; succs[n.id] = []; });
  edges.forEach(([from, to]) => {
    indeg[to] = (indeg[to] || 0) + 1;
    succs[from] = succs[from] || [];
    succs[from].push(to);
  });
  const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const nxt of succs[id] || []) {
      indeg[nxt] -= 1;
      if (indeg[nxt] === 0) queue.push(nxt);
    }
  }
  return order.reverse();
}

function enumerateUpperIdeals(data, options = {}) {
  const maxCount = options.maxCount ?? 50000;
  const maxNodes = options.maxNodes ?? 24;
  const nodes = data?.rootPosetNodes || [];
  if (!nodes.length) return [];
  const { nodeMap, succs } = buildMaps(data);
  if (nodes.length > maxNodes) return null;

  const order = topologicalOrderDesc(data);
  const included = new Set();
  const results = [];
  let aborted = false;

  function dfs(i) {
    if (aborted) return;
    if (results.length > maxCount) {
      aborted = true;
      return;
    }
    if (i >= order.length) {
      const roots = [...included].map((id) => nodeMap[id]?.label).filter(Boolean).sort((a, b) => a.localeCompare(b));
      results.push(roots);
      return;
    }
    const id = order[i];
    const successors = succs[id] || [];
    dfs(i + 1); // exclude
    const canInclude = successors.every((sid) => included.has(sid));
    if (canInclude) {
      included.add(id);
      dfs(i + 1);
      included.delete(id);
    }
  }

  dfs(0);
  if (aborted) return null;
  return results;
}

function buildAllEntries(data) {
  const listed = data?.lowerIdeals || {};
  const listedBySet = new Map(
    Object.entries(listed).map(([key, value]) => [normalizeRootSet(value.complementRoots || []), { key, value }])
  );

  const enumerated = enumerateUpperIdeals(data);
  if (!enumerated) {
    return Object.entries(listed).map(([key, value], idx) => {
      const upperIdealRoots = value.complementRoots || [];
      return {
        id: key || `entry-${idx}`,
        key,
        upperIdealRoots,
        minimalGenerators: computeMinimalGenerators(data, upperIdealRoots),
        realizable: true,
        correspondingWord: value.correspondingReudcedWord ?? value.correspondingReducedWord ?? value.correspondingWord ?? "",
      };
    });
  }

  return enumerated.map((upperIdealRoots, idx) => {
    const norm = normalizeRootSet(upperIdealRoots);
    const listedMatch = listedBySet.get(norm);
    const value = listedMatch?.value || null;
    return {
      id: listedMatch?.key || `unlisted-${idx}`,
      key: listedMatch?.key || "",
      upperIdealRoots,
      minimalGenerators: computeMinimalGenerators(data, upperIdealRoots),
      realizable: !!listedMatch,
      correspondingWord: value?.correspondingReudcedWord ?? value?.correspondingReducedWord ?? value?.correspondingWord ?? "",
    };
  });
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortEntries(entries, sortBy, direction) {
  const factor = direction === "desc" ? -1 : 1;
  const arr = [...entries];
  arr.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "hess") {
      const aLen = a.minimalGenerators.length;
      const bLen = b.minimalGenerators.length;
      if (aLen !== bLen) {
        cmp = aLen - bLen;
      } else {
        const aText = aLen ? a.minimalGenerators.join(" | ") : "∅";
        const bText = bLen ? b.minimalGenerators.join(" | ") : "∅";
        cmp = compareText(aText, bText);
      }
    } else if (sortBy === "realizable") {
      cmp = Number(a.realizable) - Number(b.realizable);
    } else if (sortBy === "word") {
      cmp = compareText(normalizeWordDisplay(a.correspondingWord), normalizeWordDisplay(b.correspondingWord));
    } else {
      cmp = compareText(a.id, b.id);
    }
    if (cmp === 0) cmp = compareText(a.id, b.id);
    return factor * cmp;
  });
  return arr;
}

function App() {
  const [type, setType] = React.useState("C");
  const [rank, setRank] = React.useState(2);
  const [entries, setEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [sortBy, setSortBy] = React.useState("hess");
  const [direction, setDirection] = React.useState("asc");

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        const summaryRes = await fetch(`./data/${type}${rank}_summary.json`);
        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          const precomputedEntries = (summaryJson.rows || []).map((row, idx) => {
            const upperIdealRoots = row.upperIdealRoots || [];
            const minimalGenerators = row.minimalElements || [];
            const derivedKey =
              row.key ??
              row.idealKey ??
              (upperIdealRoots.length ? normalizeRootSet(upperIdealRoots) : "__EMPTY__");

            return {
              id: String(derivedKey || `summary-${idx}`),
              key: String(derivedKey || `summary-${idx}`),
              upperIdealRoots,
              minimalGenerators,
              realizable: !!row.realizable,
              smooth: !!row.smooth,
              correspondingWord:
                row.correspondingReducedWord ??
                row.correspondingReudcedWord ??
                row.correspondingWord ??
                ""
            };
          });
          setEntries(precomputedEntries);
        } else {
          const cb = Date.now();
          const res = await fetch(`./data/${type}${rank}.json?v=${cb}`);
          if (!res.ok) throw new Error(`Could not load data/${type}${rank}.json`);
          const json = await res.json();
          setEntries(buildAllEntries(json));
        }
      } catch (err) {
        setEntries([]);
        setLoadError(err.message || "Failed to load JSON.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [type, rank]);

  const sortedEntries = React.useMemo(
    () => sortEntries(entries, sortBy, direction),
    [entries, sortBy, direction]
  );

  function setSort(nextSortBy, nextDirection) {
    setSortBy(nextSortBy);
    setDirection(nextDirection);
  }

  function openIndex(entry) {
    const payload = {
      type,
      rank,
      key: entry.key || entry.id || "",
      upperIdealRoots: entry.upperIdealRoots,
      minimalGenerators: entry.minimalGenerators,
      fromSummary: true,
    };
    try {
      localStorage.setItem("upperIdealSearchSelection", JSON.stringify(payload));
    } catch (_) { }
    const query = new URLSearchParams({
      type,
      rank: String(rank),
      upperIdeal: JSON.stringify(entry.upperIdealRoots),
      idealKey: String(entry.key || entry.id || ""),
    });
    window.open(`./index.html?${query.toString()}`, "_blank", "noopener");
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Hessenberg Spaces Table</h1>
        <p>
          Choose the type and rank of <span className="intro-strong">G</span>. The table lists all upper ideals by their minimal elements.
          The <span className="intro-strong">character</span> column opens the main browser with the chosen upper ideal already selected.
        </p>
      </div>

      <div className="card">
        <div className="controls">
          <div>
            <label>Type of G</label>
            <select value={type} onChange={(e) => { const t = e.target.value; setType(t); setRank(rankOptions[t][0]); }}>
              {Object.keys(rankOptions).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Rank of G</label>
            <select value={rank} onChange={(e) => setRank(Number(e.target.value))}>
              {rankOptions[type].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="toolbar">
          <div className="count">
            {loading ? "Loading..." : loadError ? "Could not load data." : `${entries.length} upper ideals listed.`}
          </div>
        </div>
      </div>

      <div className="card">
        {loadError && <div className="empty">{loadError}</div>}
        {!loadError && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="hess-col">
                    Hess
                    <span className="sort-buttons">
                      <button className={`sort-btn ${sortBy === "hess" && direction === "asc" ? "active" : ""}`} onClick={() => setSort("hess", "asc")}>▲</button>
                      <button className={`sort-btn ${sortBy === "hess" && direction === "desc" ? "active" : ""}`} onClick={() => setSort("hess", "desc")}>▼</button>
                    </span>
                  </th>
                  <th>
                    realizable
                    <span className="sort-buttons">
                      <button className={`sort-btn ${sortBy === "realizable" && direction === "asc" ? "active" : ""}`} onClick={() => setSort("realizable", "asc")}>▲</button>
                      <button className={`sort-btn ${sortBy === "realizable" && direction === "desc" ? "active" : ""}`} onClick={() => setSort("realizable", "desc")}>▼</button>
                    </span>
                  </th>
                  <th className="word-col">
                    reduced word
                    <span className="sort-buttons">
                      <button className={`sort-btn ${sortBy === "word" && direction === "asc" ? "active" : ""}`} onClick={() => setSort("word", "asc")}>▲</button>
                      <button className={`sort-btn ${sortBy === "word" && direction === "desc" ? "active" : ""}`} onClick={() => setSort("word", "desc")}>▼</button>
                    </span>
                  </th>
                  <th>character</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr key={`${entry.id}-${normalizeRootSet(entry.upperIdealRoots)}`}>
                    <td className="hess-cell">
                      {entry.minimalGenerators.length ? entry.minimalGenerators.join(",\n") : "∅"}
                    </td>
                    <td>
                      <span className={`badge ${entry.realizable ? "yes" : "no"}`}>
                        {entry.realizable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="word-cell">{entry.realizable ? normalizeWordDisplay(entry.correspondingWord) : ""}</td>
                    <td>
                      <button className="link-btn" onClick={() => openIndex(entry)}>see</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && sortedEntries.length === 0 && (
              <div className="empty">No entries are available for the current type/rank.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
