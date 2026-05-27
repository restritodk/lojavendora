import { execSync, spawn } from "node:child_process";
import process from "node:process";

const DEV_PORT = "4100";
const LEGACY_PORTS = ["3000", "4000", DEV_PORT];

function run(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

function killProcess(pid) {
  if (!pid || Number(pid) === process.pid) {
    return;
  }

  run(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`);
}

function killPorts() {
  for (const port of LEGACY_PORTS) {
    const output = run(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
    );

    const pids = output
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter(Boolean);

    for (const pid of new Set(pids)) {
      killProcess(pid);
    }
  }
}

function killVendoraNextProcesses() {
  const projectPath = process.cwd().replaceAll("\\", "\\\\");
  const command = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'next dev' -and $_.CommandLine -match '${projectPath}' } | Select-Object -ExpandProperty ProcessId"`;
  const output = run(command);

  const pids = output
    .split(/\s+/)
    .map((pid) => pid.trim())
    .filter(Boolean);

  for (const pid of new Set(pids)) {
    killProcess(pid);
  }
}

console.log("Preparando servidor Vendora...");
killPorts();
killVendoraNextProcesses();
console.log(`Iniciando em http://localhost:${DEV_PORT}`);

const child = spawn(
  "npx",
  ["next", "dev", "-H", "localhost", "-p", DEV_PORT],
  {
    stdio: "inherit",
    shell: true,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
