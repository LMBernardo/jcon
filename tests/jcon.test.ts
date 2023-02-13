import { readFileSync } from "fs";

import jcon from "../src/jcon";


//**    Test Files    **//
// These two files must match once processing is complete
const basic_json_path = "tests/files/basic.json";
const basic_jcon_path = "tests/files/basic.jcon";

const invalid_json_path = "tests/files/invalid.json";
const invalid_jcon_path = "tests/files/invalid.jcon";

//*      Helpers      **//
// Remove extraneous whitespace, etc.
function minify(json: string) {
    return JSON.stringify(JSON.parse(json));
}

function check_basic_json_object(json: any) {
    expect(json.null === null);
    expect(typeof json.int === "number");
    expect(typeof json.float === "number");
    expect(typeof json.bool === "boolean");
    expect(typeof json.string === "string");
    expect(Array.isArray(json.array));
    expect(json.array.length > 0);
}

function check_basic_json(json: any) {
    check_basic_json_object(json);

    expect(typeof json.object === "object");
    check_basic_json_object(json.object);

    expect(typeof json.object.nested === "object");
    check_basic_json_object(json.object.nested);
}


//**      Setup       **//
const basic_json = minify(readFileSync(basic_json_path, { encoding: "utf8", flag: "r" }));


//**      Tests       **//
describe("required()", () => {
    it("should read basic json file", () => {
        const required = jcon.require(basic_json_path);
        check_basic_json(required);
        expect(basic_json === JSON.stringify(required));
    });

    it("should read basic jcon file", () => {
        const required = jcon.require(basic_jcon_path);
        check_basic_json(required);
        expect(basic_json === JSON.stringify(required));
    });

    it("should fail to read invalid json file", () => {
        expect(() => jcon.require(invalid_json_path)).toThrow(SyntaxError);
    });

    it("should fail to read invalid jcon file", () => {
        expect(() => jcon.require(invalid_jcon_path)).toThrow(SyntaxError);
    });
});


describe("from()", () => {
    it("should read basic json file", () => {
        const from = jcon.from(basic_json_path);
        check_basic_json(from.exports);
        expect(basic_json === JSON.stringify(from));
    });

    it("should read basic jcon file", () => {
        const from = jcon.from(basic_jcon_path);
        check_basic_json(from.exports);
        expect(basic_json === JSON.stringify(from));
    });

    it("should fail to read invalid json file", () => {
        expect(() => jcon.from(invalid_json_path)).toThrow(SyntaxError);
    });

    it("should fail to read invalid jcon file", () => {
        expect(() => jcon.from(invalid_jcon_path)).toThrow(SyntaxError);
    });
});
