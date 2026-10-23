/**
 * Pulls every machine-readable payload out of a web page so normalize() can
 * look for schedule data in it: Next.js __NEXT_DATA__, JSON <script> tags,
 * React Server Components flight chunks (self.__next_f.push) and, as a last
 * resort, the rows of HTML tables.
 */

export function extractPayloads(html: string): unknown[] {
  const payloads: unknown[] = [];
  const tryJson = (text: string) => {
    try {
      payloads.push(JSON.parse(text));
      return true;
    } catch {
      return false;
    }
  };

  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    tryJson(decodeEntities(m[1]).trim());
  }

  for (const m of html.matchAll(/self\.__next_f\.push\(\[\s*\d+\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g)) {
    let chunk: string;
    try {
      chunk = JSON.parse(m[1]);
    } catch {
      continue;
    }
    for (const line of chunk.split('\n')) {
      const body = line.replace(/^[0-9a-z]+:/i, '');
      if (body.startsWith('[') || body.startsWith('{')) tryJson(body);
    }
  }

  const tables = extractTables(html);
  if (tables.length) payloads.push(...tablesToRecords(tables));
  return payloads;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function extractTables(html: string): string[][][] {
  const tables: string[][][] = [];
  for (const t of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    const rows: string[][] = [];
    for (const r of t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      const cells = [...r[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cellText(c[1]));
      if (cells.length) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

/**
 * Two common layouts are understood:
 *  - one column per hour (header cells are times), one row per map;
 *  - one row per event with headers such as Map / Condition / Start / End.
 * Each becomes { map, condition, start[, end] } records for normalize().
 */
export function tablesToRecords(tables: string[][][]): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const isTime = (s: string) => /^\d{1,2}[:h]\d{2}(\s*(utc|z))?$/i.test(s);
  for (const [header, ...rows] of tables) {
    const timeCols = header.map((h, i) => (isTime(h) ? i : -1)).filter((i) => i >= 0);
    if (timeCols.length >= 2) {
      for (const row of rows) {
        for (const i of timeCols) {
          if (row[i] && row[i] !== '-' && row[i] !== '—') out.push({ map: row[0], condition: row[i], start: header[i] });
        }
      }
      continue;
    }
    const col = (re: RegExp) => header.findIndex((h) => re.test(h));
    const mapCol = col(/map|carte|zone/i);
    const condCol = col(/condition|event|événement|evenement|modifier/i);
    const startCol = col(/start|début|debut|time|heure/i);
    const endCol = col(/end|fin/i);
    if (mapCol < 0 || condCol < 0 || startCol < 0) continue;
    for (const row of rows) {
      const rec: Record<string, string> = { map: row[mapCol], condition: row[condCol], start: row[startCol] };
      if (endCol >= 0 && row[endCol]) rec.end = row[endCol];
      out.push(rec);
    }
  }
  return out;
}
