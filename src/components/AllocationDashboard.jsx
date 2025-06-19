// src/components/AllocationDashboard.jsx
import React, { useState, useMemo, useRef } from "https://esm.sh/react";
import Papa from "https://esm.sh/papaparse";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { Input } from "./ui/input.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Brush
} from "https://esm.sh/recharts?bundle";
import { FileUp, AlertCircle, Download } from "https://esm.sh/lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.jsx";

/* UTILITIES */
const groupSum = (rows, keyFn, valFn = r => +r.units) => {
  const m = new Map();
  rows.forEach(r => m.set(keyFn(r), (m.get(keyFn(r)) || 0) + valFn(r)));
  return [...m].map(([key, total]) => ({ key, total }));
};
const groupCount = (rows, keyFn) => {
  const m = new Map();
  rows.forEach(r => m.set(keyFn(r), (m.get(keyFn(r)) || 0) + 1));
  return [...m].map(([key, total]) => ({ key, total }));
};
const median = arr => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const downloadCSV = (rows, name) => {
  if (!rows?.length) return;
  const header = Object.keys(rows[0]).join(",");
  const body = rows.map(r => Object.values(r).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AllocationDashboard() {
  /* REFS */
  const locRef = useRef(null);
  const prodRef = useRef(null);
  const distRef = useRef(null);

  /* STATE */
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [sortLoc, setSortLoc] = useState("desc");
  const [sortProd, setSortProd] = useState("desc");
  const [topLoc, setTopLoc] = useState("10");
  const [topProd, setTopProd] = useState("10");
  const [topDist, setTopDist] = useState("All");
  const [distView, setDistView] = useState("sku");
  const [modal, setModal] = useState(null);

  /* PARSE CSV */
  const handleFile = file => {
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        if (res.errors.length) return setError("CSV parse error");
        setRows(res.data);
      }
    });
  };

  /* HANDLERS WITH SCROLL */
  const handleTopLocChange = v => {
    setTopLoc(v);
    locRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleTopProdChange = v => {
    setTopProd(v);
    prodRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleTopDistChange = v => {
    setTopDist(v);
    distRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const handleDistViewChange = v => {
    setDistView(v);
    distRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* CALCULATIONS */
  const calc = useMemo(() => {
    if (!rows.length) return null;
    const loc = groupSum(rows, r => r.location_id);
    const prod = groupSum(rows, r => r.product_id);
    const prodLoc = groupSum(rows, r => `${r.product_id}__${r.location_id}`);
    const sortArr = (arr, dir) => [...arr].sort((a, b) => dir === "asc" ? a.total - b.total : b.total - a.total);

    // distributions sorted by key (units) ascending
    const rawDist = groupCount(rows, r => +r.units)
      .sort((a, b) => +a.key - +b.key);

    // summary stats
    const totalUnits = rows.reduce((s, r) => s + +r.units, 0);
    const stores = loc.length;
    const products = prod.length;
    const unitsPerStore = loc.map(d => d.total);
    const unitsPerProd = prod.map(d => d.total);
    const avgStore = totalUnits / stores;
    const midStore = median(unitsPerStore);
    const avgProd = totalUnits / products;
    const midProd = median(unitsPerProd);
    const prodLocCount = prodLoc.filter(d => d.total > 0).length;
    const avgGap = rows.reduce((s, r) => s + (+r.gap || 0), 0) / rows.length;

    // zero, gap
    const zeroProd = prod.filter(p => p.total === 0).map(p => p.key);
    const gapData = groupSum(rows, r => r.product_id, r => +r.gap || 0)
      .map(g => {
        const u = prod.find(p => p.key === g.key)?.total || 0;
        const fill = u ? (u / (u + g.total) * 100).toFixed(1) : 0;
        return { product: g.key, units: u, gap: g.total, fill };
      }).sort((a, b) => b.gap - a.gap);

    return {
      loc,
      prod,
      prodLoc,
      rawDist,
      sortArr,
      summaries: { totalUnits, stores, products, avgStore, midStore, avgProd, midProd, prodLocCount, avgGap },
      zeroProd,
      gapData
    };
  }, [rows]);

  /* UI HELPERS */
  const opts = ["5", "10", "20", "50", "All"];
  const SortSelect = ({ value, on }) => (
    <Select value={value} onValueChange={on}>
      <SelectTrigger className="w-20 h-8 text-xs">{value}</SelectTrigger>
      <SelectContent>
        {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  const KPI = ({ label, val }) => (
    <Card className="shadow-sm p-4">
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{typeof val === 'number' ? val.toLocaleString() : val}</p>
      </CardContent>
    </Card>
  );
  const BarCard = ({ data, title, onClick, controls, xLabel, yLabel }) => (
    <Card className="shadow-md">
      <CardHeader className="flex items-center gap-2">
        <CardTitle className="text-sm flex-1 truncate" title={title}>{title}</CardTitle>
        {controls}
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={onClick}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="key"
              angle={-45}
              textAnchor="end"
              height={60}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
            />
            <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
            <Tooltip />
            <Legend />
            <Brush dataKey="key" height={20} stroke="#8884d8" />
            <Bar dataKey="total" name="Units" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  /* upload screen */
  if (!rows.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-blue-50 space-y-6">
        <h1 className="text-2xl font-bold">Allocation Dashboard</h1>
        <label className="border-2 border-dashed border-gray-500 rounded-2xl p-8 hover:bg-orange-100 cursor-pointer flex flex-col items-center gap-4">
          <FileUp className="w-8 h-8" />
          <span>Upload CSV</span>
          <Input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </label>
        {error && (
          <div className="text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  /* render */
  const { loc, prod, rawDist, sortArr, summaries, zeroProd, gapData } = calc;
  const locSorted = sortArr(loc, sortLoc).slice(0, topLoc === 'All' ? loc.length : +topLoc);
  const prodSorted = sortArr(prod, sortProd).slice(0, topProd === 'All' ? prod.length : +topProd);
  const distSorted = rawDist.slice(0, topDist === 'All' ? rawDist.length : +topDist);

  const openModal = (t, data) => setModal({ title: t, data });

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gradient-to-br from-orange-50 to-blue-50">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Allocation Dashboard</h1>
        <Button size="sm" variant="secondary" onClick={() => setRows([])}>Reset</Button>
      </header>

      {/* KPI Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Total Units" val={summaries.totalUnits} />
        <KPI label="Stores" val={summaries.stores} />
        <KPI label="Products" val={summaries.products} />
        <KPI label="Avg/Store" val={summaries.avgStore} />
        <KPI label="Median/Store" val={summaries.midStore} />
        <KPI label="Avg/Product" val={summaries.avgProd} />
        <KPI label="Median/Product" val={summaries.midProd} />
        <KPI label="Prod-Loc w/o 0" val={summaries.prodLocCount} />
        <KPI label="Avg Gap" val={summaries.avgGap} />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 sticky top-0 bg-white z-10 p-2">
        <div className="flex items-center gap-2">
          <span>Top Stores</span>
          <SortSelect value={topLoc} on={handleTopLocChange} />
        </div>
        <div className="flex items-center gap-2">
          <span>Top Products</span>
          <SortSelect value={topProd} on={handleTopProdChange} />
        </div>
        <div className="flex items-center gap-2">
          <span>Distribution</span>
          <Select value={distView} onValueChange={handleDistViewChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              {distView === 'sku' ? 'SKU-Loc' : 'Prod-Loc'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sku">SKU-Location</SelectItem>
              <SelectItem value="prod">Product-Location</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span>Top Dist</span>
          <SortSelect value={topDist} on={handleTopDistChange} />
        </div>
      </div>

      {/* Location Chart */}
      <div ref={locRef}>
        <BarCard
          data={locSorted.map(d => ({ key: d.key, total: d.total }))}
          title="Units per Location"
          onClick={e =>
            e.activePayload &&
            openModal(
              `Products in ${e.activePayload[0].payload.key}`,
              sortArr(
                groupSum(rows.filter(r => r.location_id === e.activePayload[0].payload.key), r => r.product_id),
                "desc"
              )
            )
          }
          controls={<SortSelect value={topLoc} on={handleTopLocChange} />}
          xLabel="Store ID"
          yLabel="Units"
        />
      </div>

      {/* Product Chart */}
      <div ref={prodRef}>
        <BarCard
          data={prodSorted.map(d => ({ key: d.key, total: d.total }))}
          title="Units per Product"
          onClick={e =>
            e.activePayload &&
            openModal(
              `Locations for ${e.activePayload[0].payload.key}`,
              sortArr(
                groupSum(rows.filter(r => r.product_id === e.activePayload[0].payload.key), r => r.location_id),
                "desc"
              )
            )
          }
          controls={<SortSelect value={topProd} on={handleTopProdChange} />}
          xLabel="Product ID"
          yLabel="Units"
        />
      </div>

      {/* Distribution Chart */}
      <div ref={distRef}>
        <BarCard
          data={distSorted.map(d => ({ key: d.key, total: d.total }))}
          title={distView === "sku" ? "SKU-Location Distribution" : "Product-Location Distribution"}
          onClick={() => {}}
          controls={null}
          xLabel="Units"
          yLabel="# Pairs"
        />
      </div>

      {/* Zero-products and Gap */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm">Products with 0 Units</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => downloadCSV(zeroProd.map(p => ({ product: p })), "zero_units.csv")}
            >
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto text-xs">
            <ul className="list-disc list-inside space-y-1">
              {zeroProd.map(p => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm">Gap vs Units (Top 50)</CardTitle>
            <Button size="icon" variant="ghost" onClick={() => downloadCSV(gapData, "gap.csv")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto text-xs">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-2 text-left">Product</th>
                  <th className="px-2 text-right">Units</th>
                  <th className="px-2 text-right">Gap</th>
                  <th className="px-2 text-right">Fill%</th>
                </tr>
              </thead>
              <tbody>
                {gapData.slice(0, 50).map(r => (
                  <tr key={r.product} className="border-b odd:bg-white even:bg-gray-50">
                    <td className="px-2 truncate max-w-[120px]">{r.product}</td>
                    <td className="px-2 text-right">{r.units}</td>
                    <td className="px-2 text-right">{r.gap}</td>
                    <td className="px-2 text-right">{r.fill}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Drill-down Dialog */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle>{modal?.title}</DialogTitle>
          </DialogHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modal?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="key"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  label={{
                    value: modal?.title.includes("Products") ? "Product ID" : "Store ID",
                    position: 'insideBottom',
                    offset: -5
                  }}
                />
                <YAxis label={{ value: "Units", angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
