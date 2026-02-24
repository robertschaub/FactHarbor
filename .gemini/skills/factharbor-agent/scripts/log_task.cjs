const fs = require('fs');
const path = require('path');

const logPath = path.resolve(process.cwd(), 'Docs/AGENTS/Agent_Outputs.md');

function logTask(role, title, task, files, decisions, openItems, warnings, nextAgent, learnings) {
    const date = new Date().toISOString().split('T')[0];
    const entry = `
---
### ${date} | ${role} | Gemini CLI | ${title}
**Task:** ${task}
**Files touched:** ${files}
**Key decisions:** ${decisions}
**Open items:** ${openItems}
**Warnings:** ${warnings}
**For next agent:** ${nextAgent}
**Learnings:** ${learnings}
`;

    try {
        if (!fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '# Agent Task Completions

' + entry);
        } else {
            // Append after the header
            let content = fs.readFileSync(logPath, 'utf8');
            if (content.includes('---')) {
                // Insert after the first header if it exists, or just append
                const lines = content.split('
');
                let headerIndex = lines.findIndex(l => l.startsWith('# '));
                if (headerIndex === -1) headerIndex = -1;
                
                lines.splice(headerIndex + 2, 0, entry);
                fs.writeFileSync(logPath, lines.join('
'));
            } else {
                fs.appendFileSync(logPath, entry);
            }
        }
        console.log(`Successfully logged task to ${logPath}`);
    } catch (err) {
        console.error(`Error logging task: ${err.message}`);
        process.exit(1);
    }
}

// Simple CLI wrapper
const args = process.argv.slice(2);
if (args.length < 9) {
    console.error('Usage: node log_task.cjs <role> <title> <task> <files> <decisions> <openItems> <warnings> <nextAgent> <learnings>');
    process.exit(1);
}

logTask(...args);
