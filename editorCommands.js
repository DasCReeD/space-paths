/* 🚀 Space Paths Level Editor - Command Pattern Modules */

/**
 * Base Command interface.
 */
export class Command {
  execute(manager) {
    throw new Error("execute() must be implemented");
  }

  undo(manager) {
    throw new Error("undo() must be implemented");
  }

  toString() {
    return "Generic Action";
  }
}

/**
 * Command to paint or delete a single tile block.
 */
export class PaintCellCommand extends Command {
  constructor(lane, row, newCell) {
    super();
    this.lane = lane;
    this.row = row;
    this.newCell = newCell;
    this.prevCell = null;
  }

  execute(manager) {
    // Save current cell state
    this.prevCell = manager.level.rows[this.row][this.lane];
    manager.setCellRaw(this.lane, this.row, this.newCell);
  }

  undo(manager) {
    manager.setCellRaw(this.lane, this.row, this.prevCell);
  }

  toString() {
    if (this.newCell === null) {
      return `Deleted block at Lane ${this.lane + 1}, Row ${this.row}`;
    }
    const typeLabel = this.newCell.type.toUpperCase();
    return `Painted ${typeLabel} at Lane ${this.lane + 1}, Row ${this.row}`;
  }
}

/**
 * Command to batch paint multiple cells (used for Line, Fill, Select cuts).
 */
export class PaintCellsBatchCommand extends Command {
  constructor(cellsList, description = "", selectionBefore = null, selectionAfter = null) {
    super();
    this.cellsList = cellsList; // Array of { lane, row, cellProps }
    this.prevCells = [];
    this.description = description;
    this.selectionBefore = selectionBefore;
    this.selectionAfter = selectionAfter;
  }

  execute(manager) {
    // Save current state of all target cells
    this.prevCells = this.cellsList.map(item => ({
      lane: item.lane,
      row: item.row,
      cellProps: manager.level.rows[item.row]?.[item.lane] || null
    }));
    manager.setCellsBatchRaw(this.cellsList);
    if (this.selectionAfter) {
      manager.ui.selectedCells = JSON.parse(JSON.stringify(this.selectionAfter));
      if (this.selectionAfter.length > 0) {
        manager.ui.selectedCell = { ...this.selectionAfter[0] };
      } else {
        manager.ui.selectedCell = null;
      }
    }
  }

  undo(manager) {
    manager.setCellsBatchRaw(this.prevCells);
    if (this.selectionBefore) {
      manager.ui.selectedCells = JSON.parse(JSON.stringify(this.selectionBefore));
      if (this.selectionBefore.length > 0) {
        manager.ui.selectedCell = { ...this.selectionBefore[0] };
      } else {
        manager.ui.selectedCell = null;
      }
    }
  }

  toString() {
    if (this.description) return this.description;
    return `Modified ${this.cellsList.length} cells`;
  }
}

/**
 * Command to update global level metadata.
 */
export class UpdateMetadataCommand extends Command {
  constructor(name, author, parTime, biome) {
    super();
    this.name = name;
    this.author = author;
    this.parTime = parTime;
    this.biome = biome;
    this.prevMeta = null;
  }

  execute(manager) {
    this.prevMeta = {
      name: manager.level.name,
      author: manager.level.author,
      parTime: manager.level.parTime,
      biome: manager.level.biome
    };
    manager.setMetadataRaw(this.name, this.author, this.parTime, this.biome);
  }

  undo(manager) {
    manager.setMetadataRaw(this.prevMeta.name, this.prevMeta.author, this.prevMeta.parTime, this.prevMeta.biome);
  }

  toString() {
    return `Updated Level Metadata (${this.name})`;
  }
}

/**
 * Command to update physics variables.
 */
export class UpdatePhysicsCommand extends Command {
  constructor(gravity, oxygen, fuel) {
    super();
    this.gravity = gravity;
    this.oxygen = oxygen;
    this.fuel = fuel;
    this.prevPhys = null;
  }

  execute(manager) {
    this.prevPhys = { ...manager.level.physics };
    manager.setPhysicsRaw(this.gravity, this.oxygen, this.fuel);
  }

  undo(manager) {
    manager.setPhysicsRaw(this.prevPhys.gravity, this.prevPhys.oxygen, this.prevPhys.fuel);
  }

  toString() {
    return `Updated Physics overrides`;
  }
}

/**
 * Command to customize material slot properties.
 */
export class ConfigureMaterialCommand extends Command {
  constructor(slotId, newProps) {
    super();
    this.slotId = slotId;
    this.newProps = newProps;
    this.prevProps = null;
  }

  execute(manager) {
    this.prevProps = { ...(manager.level.materials?.[this.slotId] || {}) };
    manager.setMaterialSlotRaw(this.slotId, this.newProps);
  }

  undo(manager) {
    manager.setMaterialSlotRaw(this.slotId, this.prevProps);
  }

  toString() {
    const name = this.newProps.name || this.slotId;
    return `Configured Material: ${name}`;
  }
}

/**
 * Command to plot and build a ramp.
 */
export class DrawRampCommand extends Command {
  constructor(cellsList, startCoords, endCoords) {
    super();
    this.cellsList = cellsList;
    this.startCoords = startCoords;
    this.endCoords = endCoords;
    this.prevCells = [];
  }

  execute(manager) {
    this.prevCells = this.cellsList.map(item => ({
      lane: item.lane,
      row: item.row,
      cellProps: manager.level.rows[item.row]?.[item.lane] || null
    }));
    manager.setCellsBatchRaw(this.cellsList);
  }

  undo(manager) {
    manager.setCellsBatchRaw(this.prevCells);
  }

  toString() {
    return `Plotted Ramp: Lane ${this.startCoords.lane + 1}, Row ${this.startCoords.row} to Row ${this.endCoords.row}`;
  }
}

/**
 * Command to resize the track grid length.
 */
export class ResizeGridCommand extends Command {
  constructor(newLength) {
    super();
    this.newLength = newLength;
    this.prevLength = null;
  }

  execute(manager) {
    this.prevLength = manager.level.rows.length;
    manager.resizeGridRaw(this.newLength);
  }

  undo(manager) {
    manager.resizeGridRaw(this.prevLength);
  }

  toString() {
    return `Resized Track Length to ${this.newLength} rows`;
  }
}

