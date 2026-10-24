# CPF 3D Explorer

An interactive 3D model of an oil **Central Processing Facility (CPF)** that runs in the web browser.
Visitors can rotate and zoom around the plant, click any equipment to learn about it, look inside
the vessels with X-ray mode, and follow the oil from the wells to the export pipeline with a guided tour.

## Equipment

| # | Section | Equipment | Tag |
|---|---|---|---|
| 1 | Inlet | Production Manifold | MF-100 |
| 2 | Inlet | Test Separator | V-110 |
| 3 | Separation | HP Three-Phase Separator | V-120 |
| 4 | Separation | LP Separator | V-130 |
| 5 | Oil Treating | Heater Treater | H-140 |
| 6 | Oil Treating | Electrostatic Dehydrator | V-150 |
| 7 | Oil Treating | Desalter | V-160 |
| 8 | Oil Treating | Crude Stabilizer Column | C-170 |
| 9 | Storage & Export | Crude Storage Tanks | T-180 A/B |
| 10 | Storage & Export | Crude Export Pumps | P-190 A/B/C |
| 11 | Storage & Export | Fiscal Metering Skid (LACT) | M-200 |
| 12 | Support | Chemical Injection Skid | X-210 |

Each card shows the function, how it works, typical operating conditions and the main internal parts.

## Files

- `index.html`: home page
- `explorer.html`: full-screen 3D plant explorer
- `js/data.js`: all equipment text (edit this file to change the cards)
- `js/plant/`: the 3D equipment shapes, plant layout, pipes and flow markers
- `js/scene.js`, `js/explorer.js`, `js/home.js`: viewer and page logic
- `css/style.css`: styles

## Running it

It is a static website with no build step. Host the files on any web server, for example GitHub Pages.
The 3D library [Three.js](https://threejs.org) (version 0.160.0) is loaded from the jsDelivr CDN.

To test on your own computer, run a local server in this folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk will not load the 3D model.

## Note

Operating values are typical and for learning only. Real plants vary.

## Author & contact

Created by **Yaser Albeatiy**. Questions, feedback or collaboration: [LinkedIn](https://www.linkedin.com/in/yaser-ahmed-a76a6211b)

© 2026 Yaser Albeatiy. All rights reserved.
