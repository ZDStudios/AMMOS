#!/usr/bin/env node
/**
 * Minecraft Mod Builder — Local MCP Server
 * Drop this in C:\Users\Zayn\Desktop\MCP-MC-MOD-MAKER\
 * Run: npm install, then add to Claude Desktop config.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.join(__dirname, "workspace");
if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE, { recursive: true });

const server = new McpServer({
  name: "minecraft-mod-builder",
  version: "1.0.0",
});

// ── helpers ────────────────────────────────────────────────────────────────

function safePath(rel) {
  const resolved = path.resolve(WORKSPACE, rel);
  if (!resolved.startsWith(path.resolve(WORKSPACE))) throw new Error("Path escape blocked");
  return resolved;
}

function runCmd(cmd, cwd, timeoutMs = 600_000) {
  try {
    const out = execSync(cmd, {
      cwd: cwd || WORKSPACE,
      timeout: timeoutMs,
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { success: true, output: out.slice(-10000) };
  } catch (e) {
    const out = ((e.stdout || "") + "\n" + (e.stderr || "")).trim();
    return { success: false, output: out.slice(-10000), error: e.message };
  }
}

// ── tools ──────────────────────────────────────────────────────────────────

// 1. scaffold a full Forge project
server.tool(
  "scaffold_forge_mod",
  "Create the complete Forge mod project structure (build.gradle, mods.toml, main class, etc). Call this first.",
  {
    mod_id:      z.string().describe("Lowercase mod id e.g. playerlead"),
    mod_name:    z.string().describe("Display name e.g. Player Lead"),
    package:     z.string().describe("Java package e.g. com.playerlead.mod"),
    description: z.string().optional().describe("Short mod description"),
    mc_version:  z.string().optional().default("1.20.1"),
    forge_ver:   z.string().optional().default("47.2.0"),
  },
  async ({ mod_id, mod_name, package: pkg, description = "A Forge mod.", mc_version, forge_ver }) => {
    const pkgPath  = pkg.replace(/\./g, "/");
    const javaSrc  = `src/main/java/${pkgPath}`;
    const resDir   = "src/main/resources";
    const metaDir  = `${resDir}/META-INF`;
    const className = mod_id.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join("") + "Mod";
    const projectDir = path.join(WORKSPACE, mod_id);

    const files = {
      "build.gradle": `buildscript {
    repositories {
        maven { url = 'https://maven.minecraftforge.net' }
        mavenCentral()
    }
    dependencies {
        classpath group: 'net.minecraftforge.gradle', name: 'ForgeGradle', version: '6.+', changing: true
    }
}
plugins { id 'java' }
apply plugin: 'net.minecraftforge.gradle'

version = '${mc_version}-1.0.0'
group = '${pkg.split(".").slice(0, -1).join(".")}'
archivesBaseName = '${className.replace("Mod","")}'
java.toolchain.languageVersion = JavaLanguageVersion.of(17)

minecraft {
    mappings channel: 'official', version: '${mc_version}'
    runs {
        client {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'debug'
            mods { ${mod_id} { source sourceSets.main } }
        }
        server {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'debug'
            mods { ${mod_id} { source sourceSets.main } }
        }
    }
}

repositories { mavenCentral() }
dependencies { minecraft 'net.minecraftforge:forge:${mc_version}-${forge_ver}' }

jar {
    manifest {
        attributes([
            "Specification-Title": "${mod_id}",
            "Implementation-Title": project.name,
            "Implementation-Version": project.jar.archiveVersion,
        ])
    }
}
jar.finalizedBy('reobfJar')
`,
      "settings.gradle": `pluginManagement {
    repositories {
        maven { url = 'https://maven.minecraftforge.net' }
        gradlePluginPortal()
    }
}
rootProject.name = '${className.replace("Mod","")}'
`,
      "gradle.properties": `org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false
`,
      [`${metaDir}/mods.toml`]: `modLoader="javafml"
loaderVersion="[47,)"
license="MIT"
[[dependencies.${mod_id}]]
    modId="forge"
    mandatory=true
    versionRange="[47.2,)"
    ordering="NONE"
    side="BOTH"
[[dependencies.${mod_id}]]
    modId="minecraft"
    mandatory=true
    versionRange="[${mc_version},1.21)"
    ordering="NONE"
    side="BOTH"
[[mods]]
modId="${mod_id}"
version="1.0.0"
displayName="${mod_name}"
description='''${description}'''
`,
      [`${resDir}/pack.mcmeta`]: JSON.stringify(
        { pack: { description: `${mod_name} Resources`, pack_format: 15 } },
        null, 2
      ),
      [`${javaSrc}/${className}.java`]: `package ${pkg};

import com.mojang.logging.LogUtils;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

@Mod(${className}.MODID)
public class ${className} {
    public static final String MODID = "${mod_id}";
    public static final Logger LOGGER = LogUtils.getLogger();

    public ${className}() {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();
        MinecraftForge.EVENT_BUS.register(this);
        LOGGER.info("${mod_name} initialized!");
    }
}
`,
    };

    const created = [];
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(projectDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, "utf8");
      created.push(rel);
    }

    // Check for gradle wrapper
    const gradlew = path.join(projectDir, "gradlew.bat");
    const wrapperJar = path.join(projectDir, "gradle", "wrapper", "gradle-wrapper.jar");
    let wrapperNote = "";

    if (!fs.existsSync(gradlew)) {
      // Try to init wrapper via gradle if installed globally
      const initResult = runCmd("gradle wrapper --gradle-version 8.3", projectDir, 60000);
      if (initResult.success) {
        wrapperNote = "\n✅ Gradle wrapper generated automatically.";
      } else {
        wrapperNote = `\n⚠️  IMPORTANT: No Gradle wrapper found.
Copy gradlew.bat and the gradle/ folder from the Forge 1.20.1 MDK into:
  ${projectDir}
Download MDK: https://files.minecraftforge.net/net/minecraftforge/forge/index_1.20.1.html`;
      }
    }

    return {
      content: [{
        type: "text",
        text: `✅ Scaffolded '${mod_name}' (${mod_id}) for Forge ${mc_version}!\n\nProject folder: ${projectDir}\n\nFiles created:\n${created.map(f => "  • " + f).join("\n")}\n\nMain class: ${className} at ${javaSrc}/${className}.java${wrapperNote}\n\nNext step: write your event handlers with write_file(), then call build_mod("${mod_id}") to compile.`,
      }],
    };
  }
);

// 2. write a file
server.tool(
  "write_file",
  "Write any file into a mod project inside the workspace. Creates parent directories automatically.",
  {
    project: z.string().describe("Mod project folder name (the mod_id)"),
    file:    z.string().describe("Relative path inside the project e.g. src/main/java/com/foo/MyHandler.java"),
    content: z.string().describe("Full file contents"),
  },
  async ({ project, file, content }) => {
    const full = path.join(WORKSPACE, project, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
    return {
      content: [{ type: "text", text: `✅ Written: ${path.join(project, file)} (${content.length} bytes)` }],
    };
  }
);

// 3. read a file
server.tool(
  "read_file",
  "Read a file from a mod project.",
  {
    project: z.string(),
    file:    z.string().describe("Relative path inside the project"),
  },
  async ({ project, file }) => {
    const full = path.join(WORKSPACE, project, file);
    if (!fs.existsSync(full)) return { content: [{ type: "text", text: `❌ Not found: ${path.join(project, file)}` }] };
    const content = fs.readFileSync(full, "utf8");
    return { content: [{ type: "text", text: content }] };
  }
);

// 4. list files in project
server.tool(
  "list_files",
  "List all files in a mod project (or the whole workspace if no project given).",
  { project: z.string().optional().describe("Mod project folder name (optional)") },
  async ({ project }) => {
    const base = project ? path.join(WORKSPACE, project) : WORKSPACE;
    if (!fs.existsSync(base)) return { content: [{ type: "text", text: `❌ Not found: ${base}` }] };

    const lines = [];
    function walk(dir, indent = "") {
      for (const entry of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, entry);
        const rel  = path.relative(base, full);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          // Skip gradle cache dirs
          if ([".gradle", "build", "run", "node_modules"].includes(entry)) {
            lines.push(`${indent}📁 ${entry}/ (skipped)`);
            continue;
          }
          lines.push(`${indent}📁 ${entry}/`);
          walk(full, indent + "  ");
        } else {
          lines.push(`${indent}📄 ${entry} (${stat.size.toLocaleString()} bytes)`);
        }
      }
    }
    walk(base);
    return { content: [{ type: "text", text: lines.join("\n") || "(empty)" }] };
  }
);

// 5. run any shell command in a project
server.tool(
  "run_command",
  "Run any shell command inside a mod project directory. Use this for gradlew, git, java -version, etc.",
  {
    command: z.string().describe("The command to run e.g. gradlew.bat build"),
    project: z.string().optional().describe("Project folder name (optional, defaults to workspace root)"),
    timeout: z.number().optional().default(600).describe("Timeout in seconds"),
  },
  async ({ command, project, timeout }) => {
    const cwd = project ? path.join(WORKSPACE, project) : WORKSPACE;
    const result = runCmd(command, cwd, timeout * 1000);
    const status = result.success ? "✅ SUCCESS" : "❌ FAILED";
    return {
      content: [{
        type: "text",
        text: `${status} — ${command}\n\n${result.output}${result.error ? "\n\nError: " + result.error : ""}`,
      }],
    };
  }
);

// 6. build the mod — the main one
server.tool(
  "build_mod",
  "Compile the mod by running gradlew build. Returns full output so errors can be read and fixed.",
  {
    project: z.string().describe("Mod project folder name (the mod_id)"),
    extra_args: z.string().optional().default("").describe("Extra gradle args e.g. --stacktrace"),
  },
  async ({ project, extra_args }) => {
    const cwd = path.join(WORKSPACE, project);
    if (!fs.existsSync(cwd)) {
      return { content: [{ type: "text", text: `❌ Project not found: ${cwd}\nDid you run scaffold_forge_mod first?` }] };
    }

    // Make gradlew executable (needed on some systems)
    const gradlew = path.join(cwd, "gradlew.bat");
    const gradlewUnix = path.join(cwd, "gradlew");
    const cmd = fs.existsSync(gradlew) ? `gradlew.bat build ${extra_args}`.trim()
              : fs.existsSync(gradlewUnix) ? `./gradlew build ${extra_args}`.trim()
              : null;

    if (!cmd) {
      return {
        content: [{
          type: "text",
          text: `❌ No gradlew found in ${cwd}\n\nYou need to copy the Gradle wrapper from the Forge MDK:\n1. Download from https://files.minecraftforge.net/net/minecraftforge/forge/index_1.20.1.html\n2. Extract the MDK zip\n3. Copy gradlew.bat and the gradle/ folder into:\n   ${cwd}`,
        }],
      };
    }

    const result = runCmd(cmd, cwd, 600_000);
    const status = result.success ? "✅ BUILD SUCCESS" : "❌ BUILD FAILED";

    let jarInfo = "";
    if (result.success) {
      const libsDir = path.join(cwd, "build", "libs");
      if (fs.existsSync(libsDir)) {
        const jars = fs.readdirSync(libsDir).filter(f => f.endsWith(".jar") && !f.includes("-sources") && !f.includes("-javadoc"));
        if (jars.length > 0) {
          const jarPath = path.join(libsDir, jars[0]);
          const size = fs.statSync(jarPath).size;
          jarInfo = `\n\n🎉 JAR READY!\n📦 ${jarPath}\n📏 ${(size / 1024).toFixed(1)} KB\n\nDrop this file into your .minecraft/mods/ folder!`;
        }
      }
    }

    return {
      content: [{
        type: "text",
        text: `${status}\n\n${result.output}${jarInfo}`,
      }],
    };
  }
);

// 7. get the built jar path
server.tool(
  "get_jar_path",
  "Find the compiled JAR file for a mod project after a successful build.",
  { project: z.string() },
  async ({ project }) => {
    const libsDir = path.join(WORKSPACE, project, "build", "libs");
    if (!fs.existsSync(libsDir)) return { content: [{ type: "text", text: "❌ No build/libs directory. Run build_mod first." }] };
    const jars = fs.readdirSync(libsDir).filter(f => f.endsWith(".jar") && !f.includes("-sources") && !f.includes("-javadoc"));
    if (!jars.length) return { content: [{ type: "text", text: "❌ No JAR found. Build may have failed." }] };
    const jarPath = path.join(libsDir, jars[0]);
    const size = fs.statSync(jarPath).size;
    return {
      content: [{
        type: "text",
        text: `✅ JAR found!\n\nPath: ${jarPath}\nSize: ${(size / 1024).toFixed(1)} KB\n\nDrop this into your .minecraft/mods/ folder.`,
      }],
    };
  }
);

// 8. check environment
server.tool(
  "check_environment",
  "Check that Java 17, Gradle, etc. are installed correctly on this machine.",
  {},
  async () => {
    const checks = {
      "java":    "java -version",
      "javac":   "javac -version",
      "gradle":  "gradle --version",
      "git":     "git --version",
      "node":    "node --version",
    };
    const results = [];
    for (const [name, cmd] of Object.entries(checks)) {
      const r = runCmd(cmd, WORKSPACE, 10000);
      const ver = r.output.split("\n")[0].trim();
      results.push(`${r.success ? "✅" : "❌"} ${name}: ${r.success ? ver : "NOT FOUND"}`);
    }
    results.push(`\n📁 Workspace: ${WORKSPACE}`);
    return { content: [{ type: "text", text: results.join("\n") }] };
  }
);

// ── start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
