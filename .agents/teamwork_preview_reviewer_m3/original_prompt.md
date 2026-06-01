## 2026-05-30T02:25:32-04:00
Act as teamwork_preview_reviewer. Your working directory is c:\dev\Sky roads\.agents\teamwork_preview_reviewer_m3.
Analyze all core JavaScript files in c:\dev\Sky roads:
- app.js
- graphics.js
- physics.js
- levelLoader.js
- audio.js

Your task is to perform a detailed, rigorous code review against:
1. The global user rules:
   - Immutability (creating new objects vs mutating existing ones, no inline side-effects).
   - Focused files (<800 lines, many small files, extracting utilities). Wait, graphics.js has 1,455 lines! Let's check how long it is and identify if it exceeds the 800 lines constraint.
   - Comprehensive error handling explicitly at every level (async/await try-catch, user-friendly warnings).
   - Input validation at system boundaries.
   - No `console.log` statements in production.
   - Arrow functions/spread operators/Zod schema-based validation.
2. Code quality, styling, potential bugs, rule compliance, and concrete refactoring suggestions.

Write a structured review report at c:\dev\Sky roads\.agents\orchestrator\code_review_report.md including:
- A scorecard rating each file against the rules.
- Specific, line-by-line observations of rule violations (e.g. any console.log, mutation, oversized files, missing try-catch).
- Concrete refactoring suggestions (e.g., how to split graphics.js into smaller files like skybox.js, shipGeometry.js, particleSystem.js, etc.).
- A clear list of action items.
When done, send a message to me (the parent orchestrator) notifying me of completion.
