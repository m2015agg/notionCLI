export function isJsonMode(cmd) {
    const opts = cmd.optsWithGlobals();
    if (opts.json === true)
        return true;
    if (opts.json === false)
        return false;
    // Default to JSON when stdout is not a TTY (piped)
    return !process.stdout.isTTY;
}
export function outputSuccess(data, json) {
    if (json) {
        process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    }
    else {
        // Simple human-readable: pretty-print the object
        if (typeof data === "object" && data !== null) {
            const obj = data;
            if (obj.object === "page") {
                printPage(obj);
            }
            else if (obj.object === "database") {
                printDatabase(obj);
            }
            else if (obj.object === "list") {
                printList(obj);
            }
            else {
                process.stdout.write(JSON.stringify(data, null, 2) + "\n");
            }
        }
        else {
            process.stdout.write(String(data) + "\n");
        }
    }
}
export function outputError(error, json) {
    if (json) {
        process.stderr.write(JSON.stringify({ error }) + "\n");
    }
    else {
        const status = error.status ? ` (${error.status})` : "";
        process.stderr.write(`Error [${error.code}]${status}: ${error.message}\n`);
    }
}
function printPage(page) {
    process.stdout.write(`Page: ${page.id}\n`);
    if (page.url)
        process.stdout.write(`URL: ${page.url}\n`);
    const props = page.properties;
    if (props) {
        process.stdout.write("Properties:\n");
        for (const [key, val] of Object.entries(props)) {
            process.stdout.write(`  ${key}: ${JSON.stringify(val)}\n`);
        }
    }
}
function printDatabase(db) {
    process.stdout.write(`Database: ${db.id}\n`);
    if (db.url)
        process.stdout.write(`URL: ${db.url}\n`);
    const title = db.title;
    if (title?.length) {
        process.stdout.write(`Title: ${title.map((t) => t.plain_text).join("")}\n`);
    }
}
function printList(list) {
    const results = list.results;
    process.stdout.write(`Results: ${results?.length ?? 0}\n`);
    if (list.has_more)
        process.stdout.write(`Has more: true\n`);
    if (results) {
        for (const item of results) {
            const obj = item;
            process.stdout.write(`  - ${obj.id}\n`);
        }
    }
}
//# sourceMappingURL=output.js.map