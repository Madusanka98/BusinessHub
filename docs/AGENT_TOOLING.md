# AI Agent Tooling & MCP Integration Strategy

This document details the evaluation of AI agent tooling, Model Context Protocol (MCP) servers, skills, and prompt architecture for **BusinessHub SaaS**.

---

## 1. Industry Research & Findings Summary

We evaluated the architectural recommendations and benchmarks from:
1. **[Vercel Next DevTools MCP](https://github.com/mcp/vercel/next-devtools-mcp)**: MCP server integrating Next.js development server runtime inspection with AI agents.
2. **[Vercel Research: AGENTS.md Outperforms Skills](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)** & **[Next.js Evals](https://nextjs.org/evals)**: Benchmarks demonstrate that a repository-grounded, version-accurate `AGENTS.md` file achieves higher accuracy and fewer hallucinations than dynamic skill downloading.
3. **[Skills.sh](https://www.skills.sh/) Ecosystem**: Third-party skills library.

### Key Conclusions:
- **Prioritize In-Repo `AGENTS.md`**: Project instructions living alongside code provide immediate, deterministic context without token-heavy dynamic fetching.
- **Strict Skill Vetting**: Avoid installing dozens of unvetted third-party skills from skills directories. Unvetted skills present security risks (uncontrolled script execution, credential exfiltration), duplicate core agent capabilities, and cause context window bloat.
- **Judicious MCP Use**: MCP servers should provide concrete developer value (e.g., live Next.js documentation and runtime DevTools) rather than replacing standard CLI operations.

---

## 2. Selected Tooling Matrix

| Tool / Skill / Server | Type | Status | Justification & Value | Security & Audit Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **`AGENTS.md`** | In-Repo Rules | **Active** | Primary source of truth for business rules, multi-tenant invariants, and code standards. | In-repo, peer-reviewed, zero external execution risk. |
| **`next-devtools` MCP** | Project MCP Server | **Configured** | Provides official Next.js documentation retrieval (`nextjs_docs`) and dev-server runtime inspection (`browser_eval`, `nextjs_call`). | Published by Vercel; runs standard `npx next-devtools-mcp@latest`. Restricted to local Next.js dev server. |
| **Antigravity Built-in CLI & IDE Tools** | Native Tools | **Active** | File inspection (`view_file`), code edits (`replace_file_content`), execution (`run_command`), and search (`grep_search`). | Core sandboxed native tools under user permission control. |
| **`browser_subagent`** | Native E2E Agent | **Active** | Automated visual and end-to-end browser verification for UI workflows. | Native Antigravity browser runner, outputs artifacts locally. |

---

## 3. MCP Configuration

The Next.js DevTools MCP server is configured in the global Antigravity MCP configuration (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

### Runtime Activation Note:
The Next.js DevTools MCP runtime capabilities (DOM inspection, component tree exploration, route call tracking) require a running Next.js development server (`npm run dev`). Because Task 0 is the foundational environment setup prior to framework scaffolding, runtime DevTools commands will become active in Task 2/3 once the Next.js application server is initialized.

---

## 4. Policy for Future Skill Additions

Before proposing or installing any third-party skill from skills.sh or elsewhere:
1. **Audit Source Code**: Inspect the repository, publisher, open issues, and commit history.
2. **Security & Permissions**: Verify that the skill does NOT require environment variable access, database passwords, or network egress.
3. **Redundancy Check**: Ensure the functionality is not already natively provided by Antigravity tools or existing project scripts.
4. **Licensing**: Verify compatibility (MIT/Apache 2.0/BSD).
