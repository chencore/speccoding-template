export interface ParsedRow {
  title: string;
  views: number | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
}

export function parseImportText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  return parseLines(lines);
}

export function parseImportFile(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  return parseImportText(text);
}

function parseLines(lines: string[]): ParseResult {
  const rows: ParsedRow[] = [];
  let skipped = 0;

  let startIndex = 0;
  if (lines.length > 0) {
    const firstLower = lines[0].trim().toLowerCase();
    if (firstLower === "title,views" || firstLower === "title") {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const cols = splitCsvLine(raw);

    if (cols.length === 1) {
      const title = cols[0].trim();
      if (title) {
        rows.push({ title, views: null });
      } else {
        skipped++;
      }
      continue;
    }

    if (cols.length === 2) {
      const title = cols[0].trim();
      const viewsRaw = cols[1].trim();
      if (!title) {
        skipped++;
        continue;
      }
      const viewsNum = Number.parseInt(viewsRaw, 10);
      rows.push({
        title,
        views: Number.isNaN(viewsNum) ? null : viewsNum,
      });
      continue;
    }

    skipped++;
  }

  return { rows, skipped };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
