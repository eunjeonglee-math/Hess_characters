const sampleData = {
  C: {
    3: {
      lowerIdeals: {
        "2*alpha[1] + 2*alpha[2] + alpha[3] | alpha[1] + 2*alpha[2] + alpha[3]": {
          complementRoots: [
            "2*alpha[1] + 2*alpha[2] + alpha[3]",
            "alpha[1] + 2*alpha[2] + alpha[3]",
          ],
          correspondingWord: "3 2 3 1 2 3 2",
          smooth: true,
          examples: ["s_3 s_2 s_3 s_1 s_2 s_3 s_2"],
          irrepColumns: ["3.", ".3", "2.1", "1.2", "21.", "11.1", ".21", "1.11", "111.", ".111"],
          irrepRows: {
            0: { "3.": 1 },
            2: { "3.": 3 },
            4: { "3.": 5, ".3": 1 },
            6: { "3.": 7, ".3": 2, "2.1": 1, "21.": 1 },
            8: { "3.": 7, ".3": 2, "2.1": 1, "21.": 1 },
            10: { "3.": 5, ".3": 1 },
            12: { "3.": 3 },
            14: { "3.": 1 },
          },
          iccColumns: ["6", "42(11)", "42", "33", "411", "222", "2211(11)", "2211", "21111", "111111"],
          iccRows: {
            0: { "6": 1 },
            2: { "6": 3 },
            4: { "6": 5, "42(11)": 1 },
            6: { "6": 6, "42(11)": 2, "411": 1 },
            8: { "6": 6, "42(11)": 2, "411": 1 },
            10: { "6": 5, "42(11)": 1 },
            12: { "6": 3 },
            14: { "6": 1 },
          },
          doubleHColumns: ["111.", "11.1", "1.11", ".111", "21.", "1.2", "2.1", ".21", "3.", ".3"],
          doubleHRows: {
            0: { "3.": 1 },
            2: { "3.": 3 },
            4: { "3.": 5, ".3": 1 },
            6: { "21.": 1, "2.1": 1, "3.": 6, ".3": 2 },
            8: { "21.": 1, "2.1": 1, "3.": 6, ".3": 2 },
            10: { "3.": 5, ".3": 1 },
            12: { "3.": 3 },
            14: { "3.": 1 },
          },
        },
      },
      rootPosetNodes: [
        { id: "r100", shortLabel: "a100", label: "alpha[1]", x: 70, y: 250 },
        { id: "r010", shortLabel: "a010", label: "alpha[2]", x: 210, y: 250 },
        { id: "r001", shortLabel: "a001", label: "alpha[3]", x: 350, y: 250 },
        { id: "r110", shortLabel: "a110", label: "alpha[1] + alpha[2]", x: 140, y: 180 },
        { id: "r011", shortLabel: "a011", label: "alpha[2] + alpha[3]", x: 280, y: 180 },
        { id: "r121", shortLabel: "a121", label: "alpha[1] + 2*alpha[2] + alpha[3]", x: 210, y: 110 },
        { id: "r221", shortLabel: "a221", label: "2*alpha[1] + 2*alpha[2] + alpha[3]", x: 210, y: 40 },
      ],
      rootPosetEdges: [
        ["r100", "r110"],
        ["r010", "r110"],
        ["r010", "r011"],
        ["r001", "r011"],
        ["r110", "r121"],
        ["r011", "r121"],
        ["r121", "r221"],
      ],
      incompatible: {
        r100: ["r110", "r121", "r221"],
        r010: ["r110", "r011", "r121", "r221"],
        r001: ["r011", "r121", "r221"],
        r110: ["r100", "r010", "r121", "r221"],
        r011: ["r010", "r001", "r121", "r221"],
        r121: ["r100", "r010", "r001", "r110", "r011", "r221"],
        r221: ["r100", "r010", "r001", "r110", "r011", "r121"],
      },
    },
    4: { lowerIdeals: {} },
    5: { lowerIdeals: {} },
  },
  B: { 3: { lowerIdeals: {} }, 4: { lowerIdeals: {} }, 5: { lowerIdeals: {} } },
  D: { 3: { lowerIdeals: {} }, 4: { lowerIdeals: {} }, 5: { lowerIdeals: {} } },
  E: { 6: { lowerIdeals: {} }, 7: { lowerIdeals: {} }, 8: { lowerIdeals: {} } },
  F: { 4: { lowerIdeals: {} } },
  G: { 2: { lowerIdeals: {} } },
};

const rankOptions = {
  B: [3, 4, 5],
  C: [3, 4, 5],
  D: [3, 4, 5],
  E: [6, 7, 8],
  F: [4],
  G: [2],
};

function normalizeRootSet(roots) {
  return [...roots].sort().join(" || ");
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
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {degrees.map((deg) => (
              <tr key={deg}>
                <td>{`u^${deg}`}</td>
                {columns.map((col) => (
                  <td key={col}>{rows[deg]?.[col] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [type, setType] = React.useState("C");
  const [rank, setRank] = React.useState(3);
  const [selectedNodes, setSelectedNodes] = React.useState([]);
  const [selectedKey, setSelectedKey] = React.useState(
    "2*alpha[1] + 2*alpha[2] + alpha[3] | alpha[1] + 2*alpha[2] + alpha[3]"
  );

  const current = sampleData[type]?.[rank] || { lowerIdeals: {} };
  const nodeMap = React.useMemo(
    () => Object.fromEntries((current.rootPosetNodes || []).map((n) => [n.id, n])),
    [current]
  );
  const selectedData = current.lowerIdeals?.[selectedKey];

  React.useEffect(() => {
    const firstKey = Object.keys(current.lowerIdeals || {})[0] || "";
    setSelectedKey(firstKey);
    setSelectedNodes([]);
  }, [type, rank]);

  function isDisabled(nodeId) {
    if (!current.incompatible) return false;
    return selectedNodes.some((picked) => current.incompatible[picked]?.includes(nodeId));
  }

  function getUpperClosure(startId) {
    const adjacency = {};
    for (const [from, to] of current.rootPosetEdges || []) {
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

  const derivedComplementNodeIds = React.useMemo(() => {
    const all = new Set();
    for (const nodeId of selectedNodes) {
      for (const upper of getUpperClosure(nodeId)) {
        all.add(upper);
      }
    }
    return [...all];
  }, [selectedNodes, type, rank]);

  const derivedComplementRoots = derivedComplementNodeIds
    .map((id) => nodeMap[id]?.label)
    .filter(Boolean);

  function toggleNode(nodeId) {
    if (selectedNodes.includes(nodeId)) {
      setSelectedNodes(selectedNodes.filter((x) => x !== nodeId));
      return;
    }
    if (isDisabled(nodeId)) return;
    setSelectedNodes([...selectedNodes, nodeId]);
  }

  function proceed() {
    const target = normalizeRootSet(derivedComplementRoots);
    const lookup = Object.entries(current.lowerIdeals || {}).find(([_, value]) => {
      const roots = value.complementRoots || [];
      return normalizeRootSet(roots) === target;
    });
    if (lookup) {
      setSelectedKey(lookup[0]);
    } else {
      setSelectedKey("");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Root Poset / Hessenberg Data Browser</h1>
        <p>
          GitHub Pages에서 index.html과 app.jsx를 함께 올리면 바로 실행되도록 만든 버전입니다.
          왼쪽에서는 pairwise incompatible한 minimal roots를 고르고, 그로부터 생성되는 complement를
          시각화합니다.
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
              {Object.keys(rankOptions).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rankSelect">Rank of G</label>
            <select id="rankSelect" value={rank} onChange={(e) => setRank(Number(e.target.value))}>
              {rankOptions[type].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <button onClick={proceed}>Proceed</button>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="header-row">
            <h2>Root Poset (minimal complement selector)</h2>
            <div className="small-muted">pairwise incompatible only</div>
          </div>

          {current.rootPosetNodes ? (
            <>
              <div className="canvas-wrap">
                <svg viewBox="0 0 420 300" width="100%" height="340">
                  {(current.rootPosetEdges || []).map(([a, b], idx) => (
                    <line
                      key={idx}
                      x1={nodeMap[a].x}
                      y1={nodeMap[a].y}
                      x2={nodeMap[b].x}
                      y2={nodeMap[b].y}
                      stroke="#cbd5e1"
                      strokeWidth="2"
                    />
                  ))}
                  {(current.rootPosetNodes || []).map((node) => {
                    const selected = selectedNodes.includes(node.id);
                    const derived = !selected && derivedComplementNodeIds.includes(node.id);
                    const disabled = !selected && !derived && isDisabled(node.id);
                    return (
                      <g key={node.id} onClick={() => toggleNode(node.id)} style={{ cursor: "pointer" }}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="24"
                          fill={selected ? "#0f172a" : derived ? "#fde68a" : disabled ? "#e2e8f0" : "white"}
                          stroke={selected ? "#0f172a" : derived ? "#f59e0b" : "#94a3b8"}
                          strokeWidth="2"
                        />
                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fill={selected ? "white" : disabled ? "#94a3b8" : "#0f172a"}
                        >
                          {node.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="legend">
                <div className="legend-item"><span className="swatch selected"></span><span>selected minimal roots</span></div>
                <div className="legend-item"><span className="swatch derived"></span><span>derived complement roots</span></div>
                <div className="legend-item"><span className="swatch disabled"></span><span>disabled by incompatibility</span></div>
              </div>
            </>
          ) : (
            <div className="canvas-wrap"><span className="empty">해당 type/rank용 root poset 데이터가 아직 연결되지 않았습니다.</span></div>
          )}

          <div className="subsection-title">Selected minimal roots</div>
          <div className="chips">
            {selectedNodes.length ? (
              selectedNodes.map((id) => (
                <span key={id} className="chip">{nodeMap[id]?.label || id}</span>
              ))
            ) : (
              <span className="empty">아직 선택되지 않았습니다.</span>
            )}
          </div>

          <div className="subsection-title">Derived complement roots</div>
          <div className="chips">
            {derivedComplementRoots.length ? (
              derivedComplementRoots.map((label) => (
                <span key={label} className="chip derived">{label}</span>
              ))
            ) : (
              <span className="empty">선택으로부터 생성된 complement가 아직 없습니다.</span>
            )}
          </div>
        </div>

        <div className="arrow-wrap">
          <button className="arrow-btn" onClick={proceed}>Proceed →</button>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Selected lower ideal information</h2>
          {selectedData ? (
            <>
              <div className="info-box">
                <div className="info-grid">
                  <div>
                    <div className="info-title">Complement roots</div>
                    <div>{selectedData.complementRoots.join(" ; ")}</div>
                  </div>
                  <div>
                    <div className="info-title">Smooth Schubert variety?</div>
                    <div><strong>{selectedData.smooth ? "Yes" : "No"}</strong></div>
                  </div>
                  <div>
                    <div className="info-title">Corresponding reduced word</div>
                    <div className="mono">{selectedData.correspondingWord}</div>
                  </div>
                  <div>
                    <div className="info-title">Example permutations</div>
                    <div>{selectedData.examples.join(", ")}</div>
                  </div>
                </div>
              </div>

              <TableBlock
                title="Irreducible representation table"
                columns={selectedData.irrepColumns}
                rows={selectedData.irrepRows}
              />
              <TableBlock
                title="ICC / irreducible correspondence table"
                columns={selectedData.iccColumns}
                rows={selectedData.iccRows}
              />
              <TableBlock
                title="Double h-basis table"
                columns={selectedData.doubleHColumns}
                rows={selectedData.doubleHRows}
              />
            </>
          ) : (
            <div className="info-box"><span className="empty">현재 선택에 대응되는 lower ideal 데이터가 없습니다.</span></div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>GitHub repo에 이렇게 올리면 됩니다</h2>
        <pre>{`repo/
  index.html
  app.jsx
  .nojekyll`}</pre>
        <p style={{ marginTop: 12 }}>
          나중에는 data 폴더를 따로 두고 JSON 파일을 fetch해서 불러오도록 확장하면 됩니다.
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
