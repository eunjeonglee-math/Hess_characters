export default function RootPosetBrowserPrototype() {
  const sampleData = {
    C: {
      3: {
        lowerIdeals: {\([docs.github.com](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages?utm_source=chatgpt.com)) | alpha[1] + 2*alpha[2] + alpha[3]": {
            complementRoots: [
              "2*alpha[1] + 2*alpha[2] + alpha[3]",
              "alpha[1] + 2*alpha[2] + alpha[3]",
            ],
            correspondingWord: "3 2 3 1 2 3 2",
            smooth: true,
            examples: ["s3 s2 s3 s1 s2 s3 s2"],
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
          { id: "a1", label: "alpha[1]", x: 70, y: 250 },
          { id: "a2", label: "alpha[2]", x: 210, y: 250 },
          { id: "a3", label: "alpha[3]", x: 350, y: 250 },
          { id: "a12", label: "alpha[1]+alpha[2]", x: 140, y: 180 },
          { id: "a23", label: "alpha[2]+alpha[3]", x: 280, y: 180 },
          { id: "a122", label: "alpha[1]+2alpha[2]+alpha[3]", x: 210, y: 110 },
          { id: "a212", label: "2alpha[1]+2alpha[2]+alpha[3]", x: 210, y: 40 },
        ],
        rootPosetEdges: [
          ["a1", "a12"],
          ["a2", "a12"],
          ["a2", "a23"],
          ["a3", "a23"],
          ["a12", "a122"],
          ["a23", "a122"],
          ["a122", "a212"],
        ],
        incompatible: {
          a1: ["a12", "a122", "a212"],
          a2: ["a12", "a23", "a122", "a212"],
          a3: ["a23", "a122", "a212"],
          a12: ["a1", "a2", "a122", "a212"],
          a23: ["a2", "a3", "a122", "a212"],
          a122: ["a1", "a2", "a3", "a12", "a23", "a212"],
          a212: ["a1", "a2", "a3", "a12", "a23", "a122"],
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

  const [type, setType] = React.useState("C");
  const [rank, setRank] = React.useState(3);
  const [selectedNodes, setSelectedNodes] = React.useState([]);
  const [selectedKey, setSelectedKey] = React.useState(
    "2*alpha[1] + 2*alpha[2] + alpha[3] | alpha[1] + 2*alpha[2] + alpha[3]"
  );

  const current = sampleData[type]?.[rank] || { lowerIdeals: {} };
  const nodeMap = Object.fromEntries((current.rootPosetNodes || []).map((n) => [n.id, n]));
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

  function toggleNode(nodeId) {
    if (selectedNodes.includes(nodeId)) {
      setSelectedNodes(selectedNodes.filter((x) => x !== nodeId));
      return;
    }
    if (isDisabled(nodeId)) return;
    setSelectedNodes([...selectedNodes, nodeId]);
  }

  function proceed() {
    const labels = selectedNodes.map((id) => nodeMap[id]?.label).filter(Boolean);
    const lookup = Object.entries(current.lowerIdeals || {}).find(([key, value]) => {
      const roots = value.complementRoots || [];
      return labels.length === roots.length && labels.every((x) => roots.includes(x));
    });
    if (lookup) setSelectedKey(lookup[0]);
  }

  function TableBlock({ title, columns, rows }) {
    if (!columns || !rows) return null;
    const degrees = Object.keys(rows)
      .map((x) => Number(x))
      .sort((a, b) => a - b);

    return (
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-slate-800">{title}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left border-b border-r">degree</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-center border-b whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {degrees.map((deg) => (
                <tr key={deg} className="odd:bg-white even:bg-slate-50/50">
                  <td className="sticky left-0 bg-inherit px-3 py-2 border-r font-medium">u^{deg}</td>
                  {columns.map((col) => {
                    const value = rows[deg]?.[col];
                    return (
                      <td key={col} className="px-3 py-2 text-center whitespace-nowrap">
                        {value ? value : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="rounded-3xl bg-white shadow-sm border p-6">
          <h1 className="text-3xl font-bold tracking-tight">Root Poset / Hessenberg Data Browser</h1>
          <p className="mt-2 text-slate-600">
            GitHub Pages용 프로토타입. 왼쪽에서 root poset의 complement를 선택하고, 오른쪽에서
            smooth Schubert variety 및 representation tables를 확인하는 구조입니다.
          </p>
        </div>

        <div className="rounded-3xl bg-white shadow-sm border p-4 md:p-6">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Type of G</label>
              <select
                className="w-full rounded-xl border px-3 py-2 bg-white"
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
              <label className="block text-sm font-medium mb-2">Rank of G</label>
              <select
                className="w-full rounded-xl border px-3 py-2 bg-white"
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
              >
                {rankOptions[type].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end md:justify-end">
              <button
                onClick={proceed}
                className="rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-700 transition"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Root Poset (complement selector)</h2>
              <div className="text-sm text-slate-500">pairwise incompatible only</div>
            </div>

            {current.rootPosetNodes ? (
              <div className="rounded-2xl border bg-slate-50 p-3 overflow-auto">
                <svg viewBox="0 0 420 300" className="w-full h-[340px]">
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
                    const disabled = !selected && isDisabled(node.id);
                    return (
                      <g key={node.id} onClick={() => toggleNode(node.id)} className="cursor-pointer">
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="24"
                          fill={selected ? "#0f172a" : disabled ? "#e2e8f0" : "white"}
                          stroke={selected ? "#0f172a" : "#94a3b8"}
                          strokeWidth="2"
                        />
                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fill={selected ? "white" : disabled ? "#94a3b8" : "#0f172a"}
                        >
                          {node.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="rounded-2xl border bg-slate-50 p-6 text-slate-500">
                해당 type/rank용 root poset 데이터가 아직 연결되지 않았습니다.
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Selected complement roots</div>
              <div className="flex flex-wrap gap-2">
                {selectedNodes.length ? (
                  selectedNodes.map((id) => (
                    <span key={id} className="px-3 py-1 rounded-full bg-slate-100 border text-sm">
                      {nodeMap[id]?.label || id}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">아직 선택되지 않았습니다.</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm border p-6 space-y-4">
            <h2 className="text-xl font-semibold">Selected lower ideal information</h2>

            {selectedData ? (
              <>
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <div className="grid gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Complement roots</div>
                      <div className="font-medium">{selectedData.complementRoots.join(" ; ")}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Smooth Schubert variety?</div>
                      <div className="font-medium">{selectedData.smooth ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Corresponding reduced word</div>
                      <div className="font-mono">{selectedData.correspondingWord}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Example permutations</div>
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
              <div className="rounded-2xl border bg-slate-50 p-6 text-slate-500">
                현재 선택에 대응되는 lower ideal 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-3">Recommended repository layout</h2>
          <pre className="text-sm bg-slate-950 text-slate-100 rounded-2xl p-4 overflow-auto">
{`repo/
  index.html (or React/Vite build output)
  data/
    C3/
      ideals.json
    C4/
      ideals.json
    B3/
      ideals.json
  public/
    ...assets
  .nojekyll`}
          </pre>
          <p className="mt-3 text-slate-600 text-sm">
            다음 단계에서는 txt 파일들을 위 JSON 구조로 자동 변환하는 파서를 만들고, 오른쪽의 Hessenberg
            spaces 시각화 입력창 모양을 추가하면 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
