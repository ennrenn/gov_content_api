// Loads the bundled taxonomy.json (content_id -> {title, basePath, underGovernment})
// so taxon IDs returned by the Search API can be resolved to readable names
// without an extra network call per item. Regenerate this file if the taxon
// watch list changes, see README.md.

window.taxonomyReady = fetch("taxonomy.json")
  .then((r) => r.json())
  .catch((err) => {
    console.error("Could not load taxonomy.json", err);
    return {};
  });
