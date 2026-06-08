/* 🚀 Space Paths Level Editor - State Management Module */
import { PaintCellsBatchCommand } from './editorCommands.js';

// Default VGA 16-color palette presets based on classic SkyRoads levels
const DEFAULT_PALETTES = {
  // Deep blue space theme
  0: [
    [0, 0, 0], [40, 97, 109], [0, 141, 0], [48, 60, 56],
    [121, 137, 121], [101, 121, 141], [109, 109, 101], [125, 153, 109],
    [80, 80, 80], [68, 68, 214], [68, 214, 68], [202, 202, 202],
    [214, 68, 68], [255, 153, 226], [80, 161, 161], [214, 214, 214]
  ],
  // Default fallback palette
  fallback: [
    [0, 0, 0], [40, 97, 109], [0, 141, 0], [48, 60, 56],
    [121, 137, 121], [101, 121, 141], [109, 109, 101], [125, 153, 109],
    [80, 80, 80], [68, 68, 214], [68, 214, 68], [202, 202, 202],
    [214, 68, 68], [255, 153, 226], [80, 161, 161], [214, 214, 214]
  ]
};

/**
 * Deep clones any JSON-serializable object to enforce immutability.
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a blank level draft data structure.
 * Defaults to 30 rows of 7 empty lanes.
 */
export function createEmptyLevel() {
  const rows = [];
  for (let r = 0; r < 30; r++) {
    rows.push(Array(7).fill(null));
  }

  return {
    name: "Custom Road",
    author: "Designer",
    parTime: 45,
    biome: 0,
    physics: {
      gravity: 8,
      oxygen: 60,
      fuel: 130
    },
    rows: rows,
    materials: {
      "mat-1": {
        name: "Custom Material 1",
        textureType: "seamless-cyan",
        color: "#00ffff",
        roughness: 0.4,
        metalness: 0.6,
        emissive: 0.0,
        repeat: 1.0
      },
      "mat-2": {
        name: "Custom Material 2",
        textureType: "seamless-orange",
        color: "#ff5500",
        roughness: 0.5,
        metalness: 0.5,
        emissive: 0.0,
        repeat: 1.0
      },
      "mat-3": {
        name: "Custom Material 3",
        textureType: "brushed-metal",
        color: "#888888",
        roughness: 0.6,
        metalness: 0.4,
        emissive: 0.0,
        repeat: 1.0
      }
    }
  };
}

export class EditorStateManager {
  constructor() {
    this.level = createEmptyLevel();
    this.history = []; // Array of executed Command instances
    this.redoStack = []; // Array of undone Command instances
    this.clipboard = null; // Array of relative copied cell objects
    
    // Editor UI state (not serialized in level file)
    this.ui = {
      activePlane: { axis: 'y', index: 0 },
      activePlaneHeight: 0,
      activePlaneRow: 0,
      activePlaneLane: 3,
      selectedCell: null, // { lane, row }
      selectedCells: [], // Array of { lane, row }
      activeTool: 'pen', // 'pen', 'line', 'fill', 'marquee', 'ramp-line', 'decal'
      activeBrush: { type: 'road', colorIdx: 11 }, // default Flat Road / Boost
      activeDecal: 'arrow-up',
      activeDecalText: 'WARNING',
      activeMaterialSlot: 'mat-1',
      maximizedViewport: null // 'top', 'front', 'side', 'perspective' or null
    };
  }

  /**
   * Executes a command on the manager, pushing it to history and clearing redo.
   */
  executeCommand(command) {
    command.execute(this);
    this.history.push(command);
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.redoStack = [];
  }

  /**
   * Undoes the last command in history.
   * Returns true if successful.
   */
  undo() {
    if (this.history.length === 0) return false;
    const command = this.history.pop();
    command.undo(this);
    this.redoStack.push(command);
    return true;
  }

  /**
   * Redoes the last undone command.
   * Returns true if successful.
   */
  redo() {
    if (this.redoStack.length === 0) return false;
    const command = this.redoStack.pop();
    command.execute(this);
    this.history.push(command);
    return true;
  }

  /**
   * Reverts or fast-forwards state to match a target history size.
   */
  jumpToHistoryIndex(targetIndex) {
    if (targetIndex < 0 || targetIndex > this.history.length + this.redoStack.length) return;
    
    while (this.history.length > targetIndex) {
      this.undo();
    }
    while (this.history.length < targetIndex) {
      this.redo();
    }
  }

  /* --- Raw State Modifiers (invoked strictly by Command executors) --- */

  setMetadataRaw(name, author, parTime, biome) {
    this.level = {
      ...this.level,
      name: String(name),
      author: String(author),
      parTime: parseInt(parTime) || 45,
      biome: parseInt(biome) || 0
    };
  }

  setPhysicsRaw(gravity, oxygen, fuel) {
    this.level = {
      ...this.level,
      physics: {
        gravity: parseInt(gravity) || 8,
        oxygen: parseInt(oxygen) || 60,
        fuel: parseInt(fuel) || 130
      }
    };
  }

  setMaterialSlotRaw(slotId, properties) {
    const currentMaterials = this.level.materials || {};
    this.level = {
      ...this.level,
      materials: {
        ...currentMaterials,
        [slotId]: {
          ...(currentMaterials[slotId] || {}),
          ...properties
        }
      }
    };
  }

  setCellRaw(lane, row, cellProps) {
    if (lane < 0 || lane > 6 || row < 0 || row >= this.level.rows.length) return;

    const newRows = [...this.level.rows];
    const newRow = [...newRows[row]];
    
    if (cellProps === null) {
      newRow[lane] = null;
    } else {
      newRow[lane] = {
        ...newRow[lane],
        ...cellProps
      };
    }
    
    newRows[row] = newRow;
    this.level = {
      ...this.level,
      rows: newRows
    };
  }

  setCellsBatchRaw(cellsList) {
    const newRows = [...this.level.rows];
    
    for (const item of cellsList) {
      const { lane, row, cellProps } = item;
      if (lane < 0 || lane > 6 || row < 0 || row >= newRows.length) continue;
      
      const newRow = [...newRows[row]];
      if (cellProps === null) {
        newRow[lane] = null;
      } else {
        newRow[lane] = {
          ...newRow[lane],
          ...cellProps
        };
      }
      newRows[row] = newRow;
    }
    
    this.level = {
      ...this.level,
      rows: newRows
    };
  }

  resizeGridRaw(newLength) {
    if (newLength < 10 || newLength > 1000) return;
    
    const currentLength = this.level.rows.length;
    let newRows = [...this.level.rows];
    
    if (newLength > currentLength) {
      for (let i = currentLength; i < newLength; i++) {
        newRows.push(Array(7).fill(null));
      }
    } else if (newLength < currentLength) {
      newRows = newRows.slice(0, newLength);
    }
    
    this.level = {
      ...this.level,
      rows: newRows
    };
  }

  /* --- File & Utility Operations --- */

  serialize() {
    return JSON.stringify(this.level, null, 2);
  }

  deserialize(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!Array.isArray(parsed.rows)) return false;

      // Extract physics fields supporting both draft and cooked structures
      const gravity = parsed.physics?.gravity !== undefined ? parsed.physics.gravity : (parsed.gravity !== undefined ? parsed.gravity : 8);
      const oxygen = parsed.physics?.oxygen !== undefined ? parsed.physics.oxygen : (parsed.oxygen !== undefined ? parsed.oxygen : 60);
      const fuel = parsed.physics?.fuel !== undefined ? parsed.physics.fuel : (parsed.fuel !== undefined ? parsed.fuel : 130);

      // Name fallback for cooked formats that lack metadata
      let name = "Loaded Level";
      if (typeof parsed.name === 'string') {
        name = parsed.name;
      } else if (parsed.level_index !== undefined) {
        name = `Level ${parsed.level_index}`;
      }

      this.level = {
        name: name,
        author: typeof parsed.author === 'string' ? parsed.author : "Designer",
        parTime: parseInt(parsed.parTime) || 45,
        biome: parseInt(parsed.biome) || 0,
        physics: {
          gravity: parseInt(gravity) || 8,
          oxygen: parseInt(oxygen) || 60,
          fuel: parseInt(fuel) || 130
        },
        rows: parsed.rows.map(row => {
          if (!Array.isArray(row)) return Array(7).fill(null);
          return row.map(cell => {
            if (!cell || typeof cell !== 'object') return null;

            // If already in draft format, return it directly
            if (typeof cell.type === 'string') {
              return cell;
            }

            // Translate cooked cell format to editor draft format
            let type = 'road';
            if (cell.tunnel) {
              type = 'tunnel';
            } else if (cell.ramp) {
              type = 'ramp';
            } else if (cell.full) {
              type = 'obstacle-full';
            } else if (cell.half) {
              type = 'obstacle-half';
            } else if (cell.val === 0) {
              // Treated as void/hole
              return null;
            }

            const colorIdx = cell.val !== undefined ? cell.val : (cell.low3 !== undefined ? cell.low3 : (cell.top_color || cell.bottom_color || 1));

            const draftCell = {
              type,
              colorIdx: parseInt(colorIdx) || 1
            };

            if (type === 'ramp') {
              draftCell.ramp = {
                direction: cell.direction || 'forward',
                startY: cell.startY !== undefined ? parseFloat(cell.startY) : 0.0,
                endY: cell.endY !== undefined ? parseFloat(cell.endY) : 1.0
              };
            }

            return draftCell;
          });
        }),
        materials: parsed.materials || createEmptyLevel().materials
      };

      this.history = [];
      this.redoStack = [];
      this.ui.selectedCell = null;
      this.ui.selectedCells = [];

      if (typeof window !== 'undefined' && window.__editorDebug) {
        window.__editorDebug.trigger('deserialization', { status: 'success', name: this.level.name, rows: this.level.rows.length });
      }
      return true;
    } catch (e) {
      if (typeof window !== 'undefined' && window.__editorDebug) {
        window.__editorDebug.trigger('deserialization', { status: 'error', error: e.message || String(e) });
      }
      return false;
    }
  }

  cook() {
    const rawPalette = DEFAULT_PALETTES[this.level.biome] || DEFAULT_PALETTES.fallback;
    
    const cookedRows = this.level.rows.map((row, r) => {
      return row.map((cell, c) => {
        if (!cell) return null;
        
        const cookedCell = {
          val: cell.colorIdx !== undefined ? cell.colorIdx : 1,
          full: cell.type === 'obstacle-full',
          half: cell.type === 'obstacle-half',
          tunnel: cell.type === 'tunnel',
          top_color: 0,
          bottom_color: 0,
          low3: cell.colorIdx !== undefined ? cell.colorIdx : 1
        };

        if (cookedCell.full || cookedCell.half) {
          cookedCell.top_color = cell.colorIdx !== undefined ? cell.colorIdx : 11;
          cookedCell.bottom_color = 0;
        } else {
          cookedCell.top_color = 0;
          cookedCell.bottom_color = cell.colorIdx !== undefined ? cell.colorIdx : 1;
        }

        if (cell.type === 'ramp') {
          cookedCell.ramp = true;
          cookedCell.startY = cell.ramp?.startY !== undefined ? cell.ramp.startY : 0.0;
          cookedCell.endY = cell.ramp?.endY !== undefined ? cell.ramp.endY : 1.0;
          cookedCell.direction = cell.ramp?.direction || 'forward';
          cookedCell.top_color = cell.colorIdx !== undefined ? cell.colorIdx : 1;
          cookedCell.bottom_color = 0;
        }

        return cookedCell;
      });
    });

    return {
      level_index: 99,
      name: this.level.name,
      author: this.level.author,
      parTime: this.level.parTime,
      biome: this.level.biome,
      gravity: this.level.physics.gravity,
      fuel: this.level.physics.fuel,
      oxygen: this.level.physics.oxygen,
      palette: rawPalette,
      rows: cookedRows
    };
  }

  copySelection() {
    if (!this.ui.selectedCells || this.ui.selectedCells.length === 0) return false;

    let minLane = Infinity;
    let minRow = Infinity;
    for (const cell of this.ui.selectedCells) {
      if (cell.lane < minLane) minLane = cell.lane;
      if (cell.row < minRow) minRow = cell.row;
    }

    this.clipboard = this.ui.selectedCells.map(coord => {
      const cellData = this.level.rows[coord.row]?.[coord.lane];
      return {
        dx: coord.lane - minLane,
        dr: coord.row - minRow,
        type: cellData ? cellData.type : 'hole',
        colorIdx: cellData ? cellData.colorIdx : null,
        materialId: (cellData && cellData.materialId !== undefined) ? cellData.materialId : null,
        decals: (cellData && cellData.decals) ? deepClone(cellData.decals) : null,
        decalText: (cellData && cellData.decalText !== undefined) ? cellData.decalText : null
      };
    });
    return true;
  }

  pasteClipboard(lane, row) {
    if (!this.clipboard || this.clipboard.length === 0) return false;

    const batchList = [];
    const selectionAfter = [];

    for (const item of this.clipboard) {
      const targetLane = lane + item.dx;
      const targetRow = row + item.dr;

      if (targetLane >= 0 && targetLane <= 6 && targetRow >= 0 && targetRow < this.level.rows.length) {
        const cellProps = item.type === 'hole' ? null : {
          type: item.type,
          colorIdx: item.colorIdx,
          materialId: item.materialId,
          decals: item.decals ? deepClone(item.decals) : null,
          decalText: item.decalText
        };
        batchList.push({ lane: targetLane, row: targetRow, cellProps });
        selectionAfter.push({ lane: targetLane, row: targetRow });
      }
    }

    if (batchList.length === 0) return false;

    const description = `Pasted ${batchList.length} cells from clipboard`;
    const command = new PaintCellsBatchCommand(batchList, description, deepClone(this.ui.selectedCells), selectionAfter);
    this.executeCommand(command);

    this.ui.selectedCells = selectionAfter;
    if (selectionAfter.length > 0) {
      this.ui.selectedCell = { ...selectionAfter[0] };
    } else {
      this.ui.selectedCell = null;
    }

    return true;
  }

  duplicateSelection() {
    if (!this.ui.selectedCells || this.ui.selectedCells.length === 0) return false;

    this.copySelection();

    let minLane = Infinity;
    let minRow = Infinity;
    for (const cell of this.ui.selectedCells) {
      if (cell.lane < minLane) minLane = cell.lane;
      if (cell.row < minRow) minRow = cell.row;
    }

    return this.pasteClipboard(minLane, minRow + 1);
  }

  nudgeSelection(dLane, dRow) {
    if (!this.ui.selectedCells || this.ui.selectedCells.length === 0) return false;

    for (const cell of this.ui.selectedCells) {
      const newLane = cell.lane + dLane;
      const newRow = cell.row + dRow;
      if (newLane < 0 || newLane > 6 || newRow < 0 || newRow >= this.level.rows.length) {
        return false; // blocked by grid boundary
      }
    }

    const batchList = [];
    const selectionData = this.ui.selectedCells.map(coord => {
      const cellData = this.level.rows[coord.row]?.[coord.lane];
      return {
        lane: coord.lane,
        row: coord.row,
        cellProps: cellData ? deepClone(cellData) : null
      };
    });

    for (const coord of this.ui.selectedCells) {
      batchList.push({ lane: coord.lane, row: coord.row, cellProps: null });
    }

    const selectionAfter = [];
    for (let i = 0; i < this.ui.selectedCells.length; i++) {
      const coord = this.ui.selectedCells[i];
      const data = selectionData[i];
      const targetLane = coord.lane + dLane;
      const targetRow = coord.row + dRow;
      batchList.push({
        lane: targetLane,
        row: targetRow,
        cellProps: data.cellProps
      });
      selectionAfter.push({ lane: targetLane, row: targetRow });
    }

    const description = `Nudged selection by (${dLane}, ${dRow})`;
    const command = new PaintCellsBatchCommand(batchList, description, deepClone(this.ui.selectedCells), selectionAfter);
    this.executeCommand(command);

    this.ui.selectedCells = selectionAfter;
    if (selectionAfter.length > 0) {
      this.ui.selectedCell = { ...selectionAfter[0] };
    } else {
      this.ui.selectedCell = null;
    }

    return true;
  }

  autosave() {
    try {
      localStorage.setItem('sp_level_editor_autosave', this.serialize());
      localStorage.setItem('sp_level_editor_autosave_time', Date.now().toString());
      return true;
    } catch (e) {
      return false;
    }
  }

  hasAutosave() {
    return !!localStorage.getItem('sp_level_editor_autosave');
  }

  recoverAutosave() {
    const saved = localStorage.getItem('sp_level_editor_autosave');
    if (saved) {
      return this.deserialize(saved);
    }
    return false;
  }

  clearAutosave() {
    localStorage.removeItem('sp_level_editor_autosave');
    localStorage.removeItem('sp_level_editor_autosave_time');
  }
}
