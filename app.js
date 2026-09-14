// ---------------------------------------------------------------------------
// Call definition
//
// One call against the GOV.UK Search API, all 27 watched taxon branches,
// including Government, unrestricted by format. Filtering by format (or
// anything else) happens in the browser after the data has loaded, not on
// the server, so the person using the page decides what to keep.
// ---------------------------------------------------------------------------

const TOPIC_BRANCH_IDS = [
  "c58fdadd-7743-46d6-9629-90bb3ccc4ef0", // Education, training and skills
  "e48ab80a-de80-4e83-bf59-26316856a5f9", // Government
  "f1d9c348-5c5e-4fc6-9172-13a62537d3ae", // Childcare and early years
  "f2c9ec1e-bbdd-45b8-afd7-fab0c9371d4b", // Devolution
  "d7e02519-b7ba-4297-80a8-01cd0e5f2cb2", // Financial services
  "0133b1b3-9ecd-48ad-b226-538b46a17ff4", // Government graduate schemes
  "74f7449e-08f8-4325-b8db-3703cb99f4d0", // Industrial strategy
  "4c18a195-9b74-4882-8d11-bf224ceb8292", // Labour market reform
  "c914fd40-dd0a-45c4-a6ff-bce0cda31bde", // Local government
  "d34ba9b3-28d8-40d5-a2d3-f52d216c2590", // Manufacturing
  "f3dcc290-752f-4bbe-b379-9155d919a58d", // National Health Service
  "d6a4884e-769d-4b81-8ba5-b64394362d92", // Public health
  "2eb09bb6-b069-4604-a55a-08e6cd46d257", // Research and innovation in health and social care
  "88c55513-b473-4627-a856-6ae95b6b4e08", // Technology in health and social care
  "a1e4659c-dc15-48be-bc4f-6c609ae061dc", // UK economy
  "29480b00-dc4d-49a0-b48c-25dda8569325", // Visas and entry clearance
  "f48188df-8130-4d36-98e0-e72125d016a2", // Visas and immigration corporate
  "092348a4-b896-4f8f-a0dc-e6d4605a4904", // Working, jobs and pensions
  "ae747de8-96ad-4f66-9d6d-4d5c357e9956", // Young people
  "43fcdde6-59c5-487f-a969-a046b334cbec", // Youth employment and social issues
  "7a4fba0a-f8d5-4aed-9d73-8a455c6ba7ac", // Artificial intelligence
  "35f5b496-add7-4263-8084-8510461881fe", // Employing people
  "0edc28be-da72-4b33-8ecf-e83455eeaced", // Mental health of children and young people
  "c41d8580-aab5-4ca5-8215-553120d03a54", // Pharmacy
  "1327984f-95e0-4ca7-94c7-c63e69c30924", // Regulation reform
  "1a045007-0eaf-4429-8240-ec034ee6e9d8", // Research and development
  "5ca3d8df-468a-4e07-a718-7e5b22a9f715", // Further/higher education & vocational training during COVID-19
];

const RESULT_FIELDS = [
  "title", "description", "link", "public_timestamp", "format",
  "organisations", "taxons", "content_id", "content_store_document_type",
];

function buildSearchUrl(params) {
  const url = new URL("https://www.gov.uk/api/search.json");
  for (const [key, value] of params) url.searchParams.append(key, value);
  return url.toString();
}

const SWEEP_URL = buildSearchUrl([
  ...TOPIC_BRANCH_IDS.map((id) => ["filter_part_of_taxonomy_tree[]", id]),
  ["order", "-public_timestamp"],
  ["count", "1500"],
  ...RESULT_FIELDS.map((f) => ["fields", f]),
]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let allResults = [];
let taxonomy = {};

// ---------------------------------------------------------------------------
// Fetch and resolve
// ---------------------------------------------------------------------------

async function runSweep() {
  const button = document.getElementById("run-button");
  const status = document.getElementById("run-status");
  button.disabled = true;
  status.textContent = "Running…";

  taxonomy = await window.taxonomyReady;

  try {
    const response = await fetch(SWEEP_URL);
    if (!response.ok) throw new Error(`GOV.UK returned ${response.status}`);
    const data = await response.json();

    allResults = (data.results || []).map(enrichResult);
    allResults.sort((a, b) => (b.public_timestamp || "").localeCompare(a.public_timestamp || ""));

    const timestamp = new Date().toLocaleString("en-GB");
    status.textContent = `Last run ${timestamp} — ${allResults.length} items (${data.total.toLocaleString("en-GB")} match all-time).`;

    document.getElementById("filter-panel").hidden = false;
    populateFormatFilter();
    renderTable();
  } catch (err) {
    status.textContent = `Run failed: ${err.message}`;
    console.error(err);
  } finally {
    button.disabled = false;
  }
}

function enrichResult(item) {
  const taxonIds = item.taxons || [];
  const topics = taxonIds.map((id) => (taxonomy[id] ? taxonomy[id].title : id));

  let publishedDisplay = item.public_timestamp || "";
  const parsed = new Date(item.public_timestamp);
  if (!isNaN(parsed)) {
    publishedDisplay = parsed.toISOString().slice(0, 16).replace("T", " ");
  }

  return {
    ...item,
    topics,
    topicsDisplay: topics.join("; "),
    organisationsDisplay: (item.organisations || []).map((o) => o.title).join("; "),
    fullUrl: item.link && item.link.startsWith("/") ? `https://www.gov.uk${item.link}` : item.link,
    publishedDisplay,
  };
}

// ---------------------------------------------------------------------------
// Filtering and rendering
// ---------------------------------------------------------------------------

function populateFormatFilter() {
  const select = document.getElementById("filter-format");
  const formats = Array.from(new Set(allResults.map((r) => r.format).filter(Boolean))).sort();
  select.innerHTML = '<option value="">All formats</option>' +
    formats.map((f) => `<option value="${f}">${f}</option>`).join("");
}

function currentFilters() {
  return {
    text: document.getElementById("filter-text").value.trim().toLowerCase(),
    org: document.getElementById("filter-org").value.trim().toLowerCase(),
    topic: document.getElementById("filter-topic").value.trim().toLowerCase(),
    format: document.getElementById("filter-format").value,
  };
}

function applyFilters(results) {
  const f = currentFilters();
  return results.filter((r) => {
    if (f.text && !(`${r.title} ${r.description}`.toLowerCase().includes(f.text))) return false;
    if (f.org && !r.organisationsDisplay.toLowerCase().includes(f.org)) return false;
    if (f.topic && !r.topicsDisplay.toLowerCase().includes(f.topic)) return false;
    if (f.format && r.format !== f.format) return false;
    return true;
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderTable() {
  const filtered = applyFilters(allResults);
  const tbody = document.getElementById("results-body");

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No results match the current filters.</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map((r) => `
      <tr>
        <td>${escapeHtml(r.publishedDisplay)}</td>
        <td>${escapeHtml(r.format)}</td>
        <td class="title-cell">
          <a href="${escapeHtml(r.fullUrl)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>
          <span class="desc">${escapeHtml(r.description)}</span>
        </td>
        <td>${escapeHtml(r.organisationsDisplay)}</td>
        <td>${escapeHtml(r.topicsDisplay)}</td>
      </tr>
    `).join("");
  }

  document.getElementById("result-count").textContent =
    `${filtered.length} of ${allResults.length} items shown`;

  window._filteredForExport = filtered;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const EXPORT_COLUMNS = [
  ["publishedDisplay", "Published (UTC)"],
  ["format", "Format"],
  ["content_store_document_type", "Content type"],
  ["title", "Title"],
  ["description", "Description"],
  ["organisationsDisplay", "Department(s)"],
  ["topicsDisplay", "Topic(s)"],
  ["content_id", "Content ID"],
  ["fullUrl", "GOV.UK link"],
];

function toExportRows() {
  const filtered = window._filteredForExport || [];
  return filtered.map((r) => Object.fromEntries(EXPORT_COLUMNS.map(([key, label]) => [label, r[key] ?? ""])));
}

function exportCsv() {
  const rows = toExportRows();
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCsv = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")].concat(
    rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","))
  );
  downloadBlob(lines.join("\r\n"), "govuk-policy-sweep.csv", "text/csv");
}

function exportJson() {
  const rows = toExportRows();
  downloadBlob(JSON.stringify(rows, null, 2), "govuk-policy-sweep.json", "application/json");
}

function exportXlsx() {
  const rows = toExportRows();
  if (!rows.length) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Results");
  XLSX.writeFile(workbook, "govuk-policy-sweep.xlsx");
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

document.getElementById("run-button").addEventListener("click", runSweep);
["filter-text", "filter-org", "filter-topic"].forEach((id) =>
  document.getElementById(id).addEventListener("input", renderTable)
);
document.getElementById("filter-format").addEventListener("change", renderTable);
document.getElementById("export-csv").addEventListener("click", exportCsv);
document.getElementById("export-json").addEventListener("click", exportJson);
document.getElementById("export-xlsx").addEventListener("click", exportXlsx);
