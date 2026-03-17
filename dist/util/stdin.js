const STDIN_TIMEOUT = 30_000;
export async function readStdin() {
    if (process.stdin.isTTY) {
        throw new SyntaxError("--stdin flag used but no data is being piped. Pipe JSON to stdin or remove --stdin.");
    }
    const readPromise = new Promise((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf-8");
        process.stdin.on("data", (chunk) => {
            data += chunk;
        });
        process.stdin.on("end", () => {
            try {
                resolve(JSON.parse(data));
            }
            catch {
                reject(new SyntaxError(`Invalid JSON on stdin: ${data.slice(0, 100)}`));
            }
        });
        process.stdin.on("error", reject);
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("stdin read timed out after 30 seconds")), STDIN_TIMEOUT));
    return Promise.race([readPromise, timeoutPromise]);
}
//# sourceMappingURL=stdin.js.map