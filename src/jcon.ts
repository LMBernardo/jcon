import { readFileSync } from "fs";
import { resolve, dirname } from "path";

const __DEBUG__ = false;
// @ts-ignore TS2367: This comparison appears to be unintentional because the types 'false' and 'true' have no overlap.
if (__DEBUG__ !== true) console.debug = () => {};

type FileData = {
    content: string;
    path: string;
};

type Slice = {
    start: number;
    end: number;
};

function _remove_comments(value: string) {
    // Line comment | inline comment
    let comments = /(([\t\f ]*\/\/.*$)|((\/\*)((.|\r?\n)*?)(\*\/)))/gm;

    // We need these to check if we're inside of a string or not
    let quote_count = 0;
    let last_index = 0;
    let last_match = "";

    let matches: RegExpExecArray | null = null;
    let to_remove: Slice[] = [];
    // Repeatedly match regex and remove any matches that are not quoted
    while ((matches = comments.exec(value)) !== null) {
        const match = matches[0];

        // Get next chunk of input - from end of last match to start of new match
        let next_substring = value.substring(last_index + last_match.length, matches.index);
        console.debug(`chunk : ${next_substring}`);

        // Update quote count (add quotes from new chunk)
        const quotes = (next_substring.match(/"/g) || []).length;
        // No point in letting this possibly overflow
        quote_count = (quote_count + quotes) % 2;

        console.debug(`match @ ${matches.index}: '${match}'`);
        console.debug(`quotes: ${quote_count}`);

        // Only remove regex-like text from OUTSIDE of quotes
        if (quote_count === 0) {
            console.debug(`Will remove '${match}'`);
            to_remove.push({ start: matches.index, end: matches.index + match.length });
            // Update last values
            last_index = matches.index;
            last_match = match;
        } else {
            last_index = last_index + next_substring.length;
        }
    }

    // We have indices, so we need to keep track of how many characters we've removed and adjust them
    let offset = 0;
    for (const match of to_remove) {
        console.debug(`Removing '${value.slice(match.start - offset, match.end - offset - 1)}'`);
        console.debug(`Offset: ${offset}`);
        value = value.slice(0, match.start - offset) + value.slice(match.end - offset);
        offset = offset + match.end - match.start;
    }

    return value;
}

// We may wish to do more than remove comments in the future.
// For now, _to_json_string is just an alias though.
const _to_json_string = _remove_comments;

function _import_from_string(content: string, filename: string) {
    const Module = require("module");
    let m = new Module();

    m.filename = filename;
    m.paths = Module._nodeModulePaths(dirname(filename));

    try {
        const exports = JSON.parse(content);
        m.exports = exports;
    } catch (err: any) {
        err.message = filename + ": " + err.message;
        throw err;
    }

    m.loaded = true;
    return m;
}

function _load_file(filename: string): FileData {
    const path = resolve(filename);
    const content: string = readFileSync(path, { encoding: "utf8", flag: "r" });
    return { content, path };
}

function _require(filename: string): any {
    const { content } = _load_file(filename);
    try {
        return JSON.parse(_to_json_string(content));
    } catch (err: any) {
        err.message = filename + ": " + err.message;
        throw err;
    }
}

function _from(filename: string): any {
    const { content, path } = _load_file(filename);
    return _import_from_string(_to_json_string(content), path);
}

const jcon = {
    require: _require,
    from: _from,
};

export { jcon as default };
