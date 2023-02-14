import { readFileSync, writeFileSync, statSync } from "fs";
import { resolve, dirname, join as joinpath } from "path";

const __DEBUG__ = false;
let debug: Function;
// @ts-ignore TS2367: This comparison appears to be unintentional because the types 'false' and 'true' have no overlap.
if (__DEBUG__ !== true) debug = () => {};
else debug = console.debug;

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
    // We need to match all comments in-order in the same output array or else
    // "//comments in quotes" and /* "quotes in comments" */ will break everything
    let comments = /(([\t\f ]*\/\/.*$)|((\/\*)((.|\r?\n)*?)(\*\/)))/gm;

    // We need these to check if we're inside of a string or not,
    // and to skip past previous matches when consuming chunks
    let quote_parity = 0;
    let last_index = 0;
    let last_match_length = 0;

    let matches: RegExpExecArray | null = null;
    let to_remove: Slice[] = [];
    // Repeatedly match regex and remove any matches that are not quoted
    while ((matches = comments.exec(value)) !== null) {
        const match = matches[0];

        // Get next chunk of input - from end of last match to start of new match
        let next_substring = value.substring(last_index + last_match_length, matches.index);
        debug(`chunk : ${next_substring}`);

        // If we've seen an odd number of quotation marks, we're inside a string
        const quotes = (next_substring.match(/"/g) || []).length;
        quote_parity = (quote_parity + quotes) % 2;

        debug(`match @ ${matches.index}: '${match}'`);
        debug(`quotes: ${quote_parity}`);

        // Only remove regex-like text from OUTSIDE of quotes
        if (quote_parity === 0) {
            debug(`Will remove '${match}'`);
            to_remove.push({ start: matches.index, end: matches.index + match.length });
            // Update last values
            last_index = matches.index;
            last_match_length = match.length;
        } else {
            last_index = last_index + next_substring.length;
        }
    }

    // We have indices, so we need to keep track of how many characters we've removed and adjust them
    let offset = 0;
    for (const match of to_remove) {
        debug(`Removing '${value.slice(match.start - offset, match.end - offset - 1)}'`);
        debug(`Offset: ${offset}`);
        value = value.slice(0, match.start - offset) + value.slice(match.end - offset);
        offset = offset + match.end - match.start;
    }

    return value;
}

// We may wish to do more than remove comments in the future.
// For now, _to_json_string is just an alias though.
const _to_json_string = _remove_comments;

// Attempt to construct a module from stringified json
function _import_from_string(content: string, filename: string) {
    const Module = require("module");
    let m = new Module();

    m.filename = filename;
    m.paths = Module._nodeModulePaths(dirname(filename));

    try {
        m.exports = JSON.parse(content);
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
    removeComments: _remove_comments,
    importFromString: _import_from_string,
};

// function _print_usage(){
//     console.log(`TOOO`);
// }

function _dot_jcon_to_json(filename: string){
    const last_dir = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"))
    const extension = filename.lastIndexOf(".");
    if (extension < last_dir){
        return [ filename.slice(0, last_dir), filename.slice(last_dir) + ".json"];
    }
    return [filename.slice(0, last_dir),  filename.slice(last_dir, extension) + ".json" ];
}

function _main() {
    console.log("_main");
    const argv_opts = {"boolean": ["m"], "default": {"m": false}};
    const argv = require("minimist")(process.argv.slice(2), argv_opts);
    console.log(`argv:\n${JSON.stringify(argv, null, 2)}`);

    let output = argv.o;
    const input_multi = argv._.length > 1;
    const input_one = argv._.length === 1;
    const output_is_dir =
        typeof output === "string" && statSync(output, { throwIfNoEntry: false })?.isDirectory() === true;

    if (typeof output !== "string" || output.length < 1) {
        const [ outpath, outfile ] = _dot_jcon_to_json(argv._[0]);
        output = joinpath(outpath ?? "", outfile ?? "");
    }

    output = resolve(output);

    if (input_multi && !output_is_dir) {
        console.log("Can't write multiple input files to a single output");
        return;
    }

    if (!input_multi && !input_one) {
        console.log("Current directory parsing not yet implemented");
    }

    for (const inputfile of argv._) {
        console.log(`Reading ${inputfile}`);

        const json = _require(inputfile);
        const json_string = (argv.m === true) ? JSON.stringify(json) : JSON.stringify(json, null, 2);

        let final_output = "./out.json";

        if (output_is_dir) {
            const [ _, output_file ] = _dot_jcon_to_json(inputfile)
            console.log(`Outputting to directory ${output}`);
            final_output = joinpath(output, output_file ?? "");
            console.log(`Outputting to file ${final_output}`);
        } else {
            console.log(`Outputting to file ${output}`);
            final_output = output;
        }

        writeFileSync(final_output, json_string);
    }
}

export { jcon as default };

if (require.main === module) _main();
