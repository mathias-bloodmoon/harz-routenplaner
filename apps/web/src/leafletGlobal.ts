import L from "leaflet";

// leaflet.markercluster is a UMD plugin that extends the global `L`.
(window as unknown as { L: typeof L }).L = L;
