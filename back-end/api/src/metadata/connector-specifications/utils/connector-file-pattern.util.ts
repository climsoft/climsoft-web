/**
 * Grammar for an import connector spec's `filePattern`.
 *
 * A pattern is a Unix-style path relative to the connector's `remotePath`. Its
 * LAST "/"-segment is always a filename glob (`*` = any run of characters);
 * every earlier segment is a literal directory name, except a single optional
 * `**` segment meaning "and every subdirectory below, recursively".
 *
 *   *.csv               .csv files directly in remotePath
 *   *                   every file directly in remotePath
 *   data.csv            the file "data.csv" directly in remotePath
 *   stationA/*.csv      .csv files directly in remotePath/stationA
 *   stationA/*          every file directly in remotePath/stationA
 *   a/b/c/*.dat         .dat files directly in remotePath/a/b/c
 *   ** /*.csv           .csv files in remotePath and every subdirectory (any depth)
 *   stationA/** /*.csv  .csv files in remotePath/stationA and every subdirectory
 *
 * `**` semantics follow standard globstar: zero-or-more path segments, so
 * `stationA/** /*.csv` also matches a file sitting directly in `stationA`.
 *
 * Rejected: a trailing "/" (write `dir/*`), a wildcard in a directory segment,
 * `**` as anything other than a whole segment, more than one `**`, and any
 * segment between `**` and the final filename glob.
 */
export interface ParsedFilePattern {
    /** Literal directory portion relative to remotePath; '.' means remotePath itself. */
    literalPrefix: string;
    /** True when the pattern has a `**` segment — walk `literalPrefix`'s subtree. */
    recursive: boolean;
    /** The raw final filename-glob segment (for logs / error messages). */
    glob: string;
    /** `glob` compiled to an anchored regex, tested against a file's basename. */
    regex: RegExp;
}

/** Translate a filename glob (`*` wildcard only) to an anchored regex. */
function globToRegex(glob: string): RegExp {
    // Escape regex-special chars, then turn the glob "*" into ".*". Anchored so
    // "*.csv" doesn't also match "data.csv.bak".
    return new RegExp('^' + glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
}

/**
 * Parse and validate a connector `filePattern`. Throws `Error` with a
 * user-facing message on any violation of the grammar above.
 */
export function parseFilePattern(rawPattern: string): ParsedFilePattern {
    const pattern = (rawPattern ?? '').trim();

    if (pattern === '') {
        throw new Error('File pattern must not be empty.');
    }
    if (pattern.endsWith('/')) {
        throw new Error(`Pattern "${pattern}" must end with a filename glob, e.g. "${pattern}*".`);
    }

    const segments = pattern.split('/');
    const glob = segments[segments.length - 1];
    const dirSegments = segments.slice(0, -1);

    if (glob === '') {
        // Only reachable via "//" or similar.
        throw new Error(`Pattern "${pattern}" has an empty segment.`);
    }
    if (glob.includes('**')) {
        throw new Error(`Pattern "${pattern}": "**" cannot be the filename segment — use "${dirSegments.concat('*').join('/')}".`);
    }

    const starStarCount = dirSegments.filter(s => s === '**').length;
    if (starStarCount > 1) {
        throw new Error(`Pattern "${pattern}" may contain at most one "**" segment.`);
    }

    const starStarIndex = dirSegments.indexOf('**');

    for (let i = 0; i < dirSegments.length; i++) {
        const seg = dirSegments[i];
        if (seg === '') {
            throw new Error(`Pattern "${pattern}" has an empty directory segment.`);
        }
        if (seg === '**') {
            if (i !== dirSegments.length - 1) {
                throw new Error(`Pattern "${pattern}": nothing may appear between "**" and the filename glob.`);
            }
            continue;
        }
        if (seg.includes('**')) {
            throw new Error(`Pattern "${pattern}": "**" must be its own path segment.`);
        }
        if (seg.includes('*')) {
            throw new Error(`Pattern "${pattern}": directory names must be literal; only the final filename segment may contain "*".`);
        }
    }

    const recursive = starStarIndex !== -1;
    const literalDirs = recursive ? dirSegments.slice(0, starStarIndex) : dirSegments;
    const literalPrefix = literalDirs.length === 0 ? '.' : literalDirs.join('/');

    return { literalPrefix, recursive, glob, regex: globToRegex(glob) };
}

/**
 * Normalise a binding's exclude list: trim each entry and drop the blanks.
 *
 * Blanks are dropped rather than rejected because they are what a stray comma
 * in the authoring form produces (`a,,b`, or a trailing comma), and an empty
 * entry could only ever mean "exclude nothing". An empty list is the normal
 * case — most bindings exclude nothing at all.
 */
export function normaliseExcludePatterns(excludePatterns: readonly string[] | null | undefined): string[] {
    const normalised: string[] = [];
    for (const pattern of excludePatterns ?? []) {
        const trimmed = pattern?.trim() ?? '';
        if (trimmed !== '') {
            normalised.push(trimmed);
        }
    }
    return normalised;
}

/**
 * Validate and compile a binding's exclude list into one regex, tested against
 * a file's basename. Returns null for an empty list, so the matcher can skip the
 * test entirely for the common case.
 *
 * Each entry is a filename glob in the same `*`-only syntax as the include
 * glob: it names files that are never data, e.g. `*_info.csv` or `README*`.
 * Directory segments and `**` are rejected so the rule stays "this file name is
 * never a data file", with no directory semantics to reason about. A file name
 * containing a literal comma (the authoring form's list separator) is excluded
 * by writing `*` in the comma's place.
 *
 * One alternation rather than a regex per entry, so the per-file cost stays one
 * test however many entries there are.
 */
export function parseExcludePatterns(excludePatterns: readonly string[] | null | undefined): RegExp | null {
    const entries = normaliseExcludePatterns(excludePatterns);
    if (entries.length === 0) {
        return null;
    }
    for (const entry of entries) {
        if (entry.includes('/')) {
            throw new Error(`Exclude pattern "${entry}" must be a file name, not a path — exclusions apply to file names in the directories the file pattern covers.`);
        }
        if (entry.includes('**')) {
            throw new Error(`Exclude pattern "${entry}": "**" is not allowed; use "*" to match any characters in a file name.`);
        }
    }
    const alternatives = entries.map(entry => globToRegex(entry).source.slice(1, -1));
    return new RegExp('^(?:' + alternatives.join('|') + ')$');
}
