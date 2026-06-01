import struct
from pathlib import Path
import json

class BitReader:
    def __init__(self, data: bytes, offset: int) -> None:
        self._data = data
        self.byte_offset = offset
        self.bit_offset = 0

    def read_bits(self, count: int) -> int:
        value = 0
        for _ in range(count):
            if self.byte_offset >= len(self._data):
                raise EOFError("unexpected end of compressed stream")
            bit = (self._data[self.byte_offset] >> (7 - self.bit_offset)) & 1
            value = (value << 1) | bit
            self.bit_offset += 1
            if self.bit_offset == 8:
                self.bit_offset = 0
                self.byte_offset += 1
        return value

    def bytes_consumed(self, start_offset: int) -> int:
        extra = 1 if self.bit_offset else 0
        return (self.byte_offset + extra) - start_offset


def copy_from_history(
    output: bytearray,
    distance: int,
    count: int,
    limit: int,
) -> None:
    if distance <= 0 or distance > len(output):
        raise ValueError(f"invalid back-reference distance {distance}")
    for _ in range(count):
        if len(output) >= limit:
            break
        output.append(output[-distance])


def decompress_stream(
    data: bytes,
    offset: int,
    expected_size: int | None,
    widths: tuple[int, int, int],
) -> bytes:
    width1, width2, width3 = widths
    reader = BitReader(data, offset)
    output = bytearray()

    try:
        while expected_size is None or len(output) < expected_size:
            prefix = reader.read_bits(1)
            if prefix == 0:
                distance = reader.read_bits(width2) + 2
                count = reader.read_bits(width1) + 2
                copy_from_history(output, distance, count, expected_size or (len(output) + count))
                continue

            prefix = reader.read_bits(1)
            if prefix == 0:
                distance = reader.read_bits(width3) + 2 + (1 << width2)
                count = reader.read_bits(width1) + 2
                copy_from_history(output, distance, count, expected_size or (len(output) + count))
                continue

            output.append(reader.read_bits(8))
    except EOFError:
        if expected_size is not None:
            raise

    return bytes(output)


def extract_pack(roads_path: Path, pack_name: str):
    data = roads_path.read_bytes()
    
    # Parse level offsets
    first_offset = struct.unpack_from("<H", data, 0)[0]
    num_levels = first_offset // 4

    levels_info = []
    for i in range(num_levels):
        offset, decomp_len = struct.unpack_from("<HH", data, i * 4)
        levels_info.append((offset, decomp_len))

    extracted_levels = []

    for i, (offset, decomp_len) in enumerate(levels_info):
        gravity, fuel, oxygen = struct.unpack_from("<HHH", data, offset)
        palette_bytes = data[offset + 6 : offset + 6 + 216]
        
        # VGA palette: 72 colors, 3 bytes each
        colors = []
        for c_idx in range(72):
            r = (palette_bytes[c_idx * 3] * 255) // 63
            g = (palette_bytes[c_idx * 3 + 1] * 255) // 63
            b = (palette_bytes[c_idx * 3 + 2] * 255) // 63
            colors.append((r, g, b))
            
        road_data_start = offset + 6 + 216
        widths = tuple(data[road_data_start : road_data_start + 3])
        
        decompressed = decompress_stream(data, road_data_start + 3, decomp_len, widths)
        
        # Parse tile grid
        num_tiles = len(decompressed) // 2
        tiles = [struct.unpack_from("<H", decompressed, idx * 2)[0] for idx in range(num_tiles)]
        rows = [tiles[row_idx * 7 : (row_idx + 1) * 7] for row_idx in range(len(tiles) // 7)]
        
        parsed_rows = []
        for row in rows:
            parsed_row = []
            for val in row:
                if val == 0:
                    parsed_row.append(None) # Empty space
                else:
                    # Correct Shikadi ModdingWiki Bit Spec
                    bottom_color = val & 0xF
                    top_color = (val >> 4) & 0xF
                    tunnel = bool((val >> 8) & 1)
                    half_height = bool((val >> 9) & 1)
                    full_height = bool((val >> 10) & 1)
                    low3 = val & 7
                    
                    parsed_row.append({
                        "val": val,
                        "full": full_height,
                        "half": half_height,
                        "tunnel": tunnel,
                        "top_color": top_color,
                        "bottom_color": bottom_color,
                        "low3": low3
                    })
            parsed_rows.append(parsed_row)
            
        level_dict = {
            "level_index": i,
            "gravity": gravity,
            "fuel": fuel,
            "oxygen": oxygen,
            "palette": colors,
            "rows": parsed_rows
        }
        extracted_levels.append(level_dict)
        print(f"[{pack_name}] Rebuilt Level {i:2d}: gravity={gravity}, fuel={fuel}, oxygen={oxygen}, rows={len(rows)}")
        
    return extracted_levels


standard_path = Path(r"C:\dev\Sky roads\ROADS.LZS")
xmas_path = Path(r"C:\dev\Sky roads\SkyRoads-Xmas-Special_DOS_EN_Freeware-Version\ROADS.LZS")

standard_extracted = extract_pack(standard_path, "Standard")
xmas_extracted = extract_pack(xmas_path, "Xmas Special")

# Write to the app data directories and public data directories
Path("data").mkdir(exist_ok=True)
Path("data/standard_levels.json").write_text(json.dumps(standard_extracted, indent=2))
Path("data/xmas_levels.json").write_text(json.dumps(xmas_extracted, indent=2))
print("Successfully generated standard and Xmas level files with correct 3D blocks!")
