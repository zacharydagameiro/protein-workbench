# Protein Workbench - Interactive Protein Visualization

A modern 3D interactive web application for visualizing genes, proteins, and molecular structures built with React, TypeScript, and Three.js.

## Features

- 🧬 Interactive 3D protein structure visualization
- 🎨 Color-coded atoms by element (Carbon, Nitrogen, Oxygen, Sulfur, Hydrogen)
- 🖱️ Orbit, zoom, and pan controls for exploring structures
- 📊 Sample protein data with gene associations
- 🎯 Modern, responsive UI with dark theme

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Three.js** - 3D graphics
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber

## Getting Started

### Prerequisites

- Node.js (v20.18.2 or higher recommended)
- npm

### Installation

1. Navigate to the project directory:
```bash
cd /Users/zacharygameiro/bio/genest-3d-app
```

2. Install dependencies (if not already done):
```bash
npm install
```

### Running the App

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
protein-workbench/
├── src/
│   ├── components/
│   │   └── ProteinViewer.tsx    # 3D viewer component
│   ├── data/
│   │   └── sampleProteins.ts     # Sample protein data
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── package.json
└── README.md
```

## Usage

1. **Select a Protein**: Click on a protein from the sidebar to load it into the 3D viewer
2. **Interact with 3D Model**:
   - **Rotate**: Click and drag
   - **Zoom**: Scroll wheel or pinch gesture
   - **Pan**: Right-click and drag (or middle mouse button)

## Sample Data

The app includes two sample protein structures:
- **Mini Helix Protein** (GENE1) - A simplified alpha-helix-like structure
- **Looped Protein** (GENE2) - A simplified loop-like structure

## Future Enhancements

- Load real PDB/mmCIF files
- Display protein chains and residues
- Advanced coloring schemes (by residue type, domain, etc.)
- Search functionality for genes/proteins
- Export functionality for images/models
- Animation of protein folding/unfolding

## License

MIT
