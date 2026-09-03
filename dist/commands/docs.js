import { Command } from "commander";
import { SKILL_DOC } from "../util/skill-doc.js";
import { renderSkillMd } from "../util/skill.js";
export { SKILL_DOC };
const FORMATS = {
    claude: {
        filename: "CLAUDE.md",
        wrap: (c) => c,
    },
    agents: {
        filename: "AGENTS.md",
        wrap: (c) => c,
    },
    cursor: {
        filename: ".cursorrules",
        wrap: (c) => c,
    },
    skill: {
        filename: "SKILL.md",
        wrap: () => renderSkillMd(),
    },
    raw: {
        filename: "",
        wrap: (c) => c,
    },
};
export function docsCommand() {
    return new Command("docs")
        .description("Generate LLM instruction snippet for notion-cli. Outputs to stdout.")
        .option("--format <type>", "Output format: claude, agents, cursor, skill, raw (default: raw)", "raw")
        .action((opts) => {
        const fmt = FORMATS[opts.format];
        if (!fmt) {
            process.stderr.write(`Unknown format: ${opts.format}. Use: ${Object.keys(FORMATS).join(", ")}\n`);
            process.exit(1);
        }
        const out = fmt.wrap(SKILL_DOC);
        process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    });
}
//# sourceMappingURL=docs.js.map