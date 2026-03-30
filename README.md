# 🧱 Minecraft Mod Builder — MCP Server

Gives Claude Desktop (and other MCP Capable AI Agents) the ability to write, compile, and deliver Minecraft mod JARs — all from chat.

---

## Setup (2 steps)

### Step 1 — Run INSTALL.bat
Double-click `INSTALL.bat`. It will:
- Check Node.js and Java are installed
- Run `npm install`
- Create the Claude Desktop config snippet
- Open your config folder

> **Need Node.js?** → https://nodejs.org (LTS version)
> **Need Java 17?** → https://adoptium.net
> **C:\Users\%USERNAME%\AppData\Local\AMMOS

### Step 2 — Add to Claude Desktop config
Paste this into `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "minecraft-builder": {
      "command": "node",
      "args": ["C:\\Users\\%USERNAME%\\Desktop\\MCP-MC-MOD-MAKER\\server.js"]
    }
  }
}
```
Restart Claude Desktop. Done.

---

## Usage

Just talk to Claude naturally:

> *"Build me a Forge 1.20.1 mod that lets me leash players with a Lead"*

Claude will:
1. `scaffold_forge_mod` — creates the full Gradle project structure
2. `write_file` — writes all Java source files
3. `build_mod` — runs `gradlew.bat build`, reads errors, auto-fixes and retries
4. `get_jar_path` — tells you exactly where the `.jar` is

Mods are saved to the `workspace\` folder inside this directory.

---

## ⚠️ Gradle Wrapper (one-time)

To compile mods, Gradle needs its wrapper files. The scaffolder tries to generate them automatically if you have Gradle installed. If not:

1. Download the Forge 1.20.1 MDK from https://files.minecraftforge.net
2. Extract it and copy `gradlew.bat` and the `gradle/` folder into your mod's project folder inside `workspace\`

---

## Tools available to Claude

| Tool | What it does |
|------|-------------|
| `scaffold_forge_mod` | Full project structure (build.gradle, mods.toml, main class) |
| `write_file` | Write any Java/config file into the project |
| `read_file` | Read a file back |
| `list_files` | Browse the project tree |
| `run_command` | Run any shell command (gradlew, git, etc.) |
| `build_mod` | Compile with gradlew, read output, report errors |
| `get_jar_path` | Find the final compiled JAR |
| `check_environment` | Verify Java, Gradle, Node are installed |
