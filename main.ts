// One-Line Office Joke: 24-Hour Sprint — entry 2.
//
// The entry is one short joke about office life, at most 200 characters,
// written as a single line. This program is the whole entry: it reads the
// joke from line.txt (the file shipped beside it in the repository),
// validates it against the competition gate, and writes it to
// /output/entry.txt, where the sealed scorer reads it.
//
// The gate, from the bounty rules:
//   - /output/entry.txt must be UTF-8 text of 1 to 200 characters,
//   - it must not be only whitespace,
//   - only a valid entry goes before the judge.
//
// The joke itself lives in line.txt so the program and the text are easy to
// review separately: the program is the delivery mechanism, line.txt is
// the creative work. Nothing is fetched from the network, nothing is read
// from the environment, and nothing outside this repository is executed.
//
// Run it with Node 22:
//   node main.ts
// The grader runs it the same way, in a sandbox where /output exists.
// Locally, set OUTPUT_DIR to point at a scratch folder instead.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The gate's limits, copied from the bounty rules. Kept as named constants
// so a reader can check them against the rules without hunting through code.
const MIN_CHARS = 1;
const MAX_CHARS = 200;

// Where the joke text lives, relative to this file. The repository ships
// line.txt next to main.ts, so the entry is self-contained.
const LINE_FILE = "line.txt";

// The file the grader reads. The bounty says the program writes one text
// to /output/entry.txt. A local run may override the directory with
// OUTPUT_DIR so the same code can be exercised without root access.
const OUTPUT_FILE = "entry.txt";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Count characters the way the gate does: Unicode code points, not UTF-16
// code units and not bytes. An emoji or an accented letter is one character.
function countChars(text: string): number {
  return [...text].length;
}

// True when the text is a single line: no line breaks anywhere in it. A
// trailing newline in the source file is stripped before this check, so the
// check is about the joke itself, not about how the file ends.
function isSingleLine(text: string): boolean {
  return !/[\r\n]/.test(text);
}

// True when the text carries something besides whitespace. The gate refuses
// a file that is only whitespace, so this is checked explicitly.
function hasContent(text: string): boolean {
  return text.trim().length > 0;
}

// Read the joke out of line.txt. The file is expected to hold exactly the
// joke, optionally followed by one trailing newline (how text editors save
// a file). Only that single trailing newline is removed; anything else in
// the file is part of the joke and is validated, not silently fixed. A
// UTF-8 byte-order mark at the start of the file, if an editor left one
// there, is stripped too: it is not part of the joke and the gate would
// count it.
function readLineText(repoDir: string): string {
  const path = join(repoDir, LINE_FILE);
  const raw = readFileSync(path, "utf8");
  const withoutBom = raw.replace(/^\uFEFF/, "");
  // Strip one trailing newline (LF, or CRLF) if present.
  const withoutNewline = withoutBom.replace(/\r?\n$/, "");
  return withoutNewline;
}

// Validate the joke against the gate. Every failure names the rule it
// breaks, so a bad line.txt fails loudly here instead of silently reaching
// the judge as an invalid entry.
function validate(text: string): string[] {
  const problems: string[] = [];
  const chars = countChars(text);

  if (chars < MIN_CHARS) {
    problems.push(
      `too short: ${chars} characters, minimum is ${MIN_CHARS}`,
    );
  }
  if (chars > MAX_CHARS) {
    problems.push(
      `too long: ${chars} characters, maximum is ${MAX_CHARS}`,
    );
  }
  if (!hasContent(text)) {
    problems.push("empty or whitespace-only: the gate requires real text");
  }
  if (!isSingleLine(text)) {
    problems.push("not a single line: the joke must fit on one line");
  }
  return problems;
}

// Write the validated joke to the output file, creating the output
// directory first. The write is byte-exact: the file holds the joke and
// nothing else — no trailing newline, no header, no extra whitespace —
// because the gate counts the file's characters as they are. After
// writing, the file is read back and compared byte for byte: if the disk
// does not hold exactly the joke, the run fails instead of handing the
// grader a file that differs from the validated text.
function writeEntry(outputDir: string, text: string): string {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, OUTPUT_FILE);
  writeFileSync(path, text, "utf8");
  const written = readFileSync(path, "utf8");
  if (written !== text) {
    throw new Error(
      `read-back mismatch in ${path}: wrote ${countChars(text)} characters, ` +
        `read back ${countChars(written)}`,
    );
  }
  return path;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Resolve the repository directory from this file's own location, so the
  // program works no matter which directory it is started from.
  const here = dirname(fileURLToPath(import.meta.url));

  // The output directory: /output in the grading sandbox, or OUTPUT_DIR
  // when a local run points it elsewhere.
  const outputDir = process.env.OUTPUT_DIR ?? "/output";

  const text = readLineText(here);

  const problems = validate(text);
  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`invalid entry: ${problem}`);
    }
    process.exit(1);
  }

  const outPath = writeEntry(outputDir, text);

  // A short, factual report: what was written, where, and how long it is.
  // The report goes to stdout; the entry itself is only the file.
  console.log(`wrote ${countChars(text)} characters to ${outPath}`);
  console.log(`entry: ${text}`);
}

main();
