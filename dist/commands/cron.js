import { Command } from "commander";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
function write(msg) {
    process.stdout.write(msg);
}
const CRON_MARKER = "# notion-cli-snapshot";
export function cronCommand() {
    return new Command("cron")
        .description("Set up nightly workspace snapshot refresh via cron")
        .option("--time <HH:MM>", "Time to run (24h format)", "03:30")
        .option("--status", "Show current cron status")
        .option("--remove", "Remove cron entry")
        .action((opts) => {
        if (opts.status) {
            try {
                const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
                const entries = crontab.split("\n").filter((l) => l.includes(CRON_MARKER));
                if (entries.length === 0) {
                    write("\n  No notion-cli cron jobs found.\n\n");
                }
                else {
                    write("\n  Active notion-cli cron jobs:\n");
                    for (const e of entries) {
                        write(`    ${e}\n`);
                    }
                    write("\n");
                }
            }
            catch {
                write("\n  No crontab configured.\n\n");
            }
            return;
        }
        if (opts.remove) {
            try {
                const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
                const filtered = crontab
                    .split("\n")
                    .filter((l) => !l.includes(CRON_MARKER))
                    .join("\n");
                execSync(`echo '${filtered}' | crontab -`, { encoding: "utf-8" });
                write("\n  Removed notion-cli cron entries.\n\n");
            }
            catch {
                write("\n  No crontab to clean.\n\n");
            }
            return;
        }
        const [hours, minutes] = opts.time.split(":");
        const cwd = process.cwd();
        const notionCli = resolve(process.argv[1]);
        const cronLine = `${minutes} ${hours} * * * cd ${cwd} && ${notionCli} snapshot >> /tmp/notion-cli-cron.log 2>&1 ${CRON_MARKER}:${cwd}`;
        try {
            let crontab = "";
            try {
                crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
            }
            catch { /* empty crontab */ }
            // Remove existing entry for this project
            const lines = crontab.split("\n").filter((l) => !l.includes(`${CRON_MARKER}:${cwd}`));
            lines.push(cronLine);
            execSync(`echo '${lines.join("\n")}' | crontab -`, { encoding: "utf-8" });
            write(`\n  Cron job configured:\n`);
            write(`    Schedule: ${minutes} ${hours} * * * (${opts.time} daily)\n`);
            write(`    Project: ${cwd}\n`);
            write(`    Log: /tmp/notion-cli-cron.log\n\n`);
        }
        catch (e) {
            write(`\n  Failed to set cron: ${e.message}\n\n`);
        }
    });
}
//# sourceMappingURL=cron.js.map