
const stackOptions = ["backend", "frontend"];
const levelOptions = ["info", "error", "debug", "warn", "fatal"];
const backendPackageOptions = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
  "utils",
  "auth",
  "config",
  "middleware"
];
const frontendPackageOptions = [
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
  "utils",
  "auth",
  "config",
  "middleware"
];

const validateOption = (value, validOptions, name) => {
  if (!value || typeof value !== "string") {
    throw new Error(`${name} must be a non-empty string`);
  }
  if (!validOptions.includes(value)) {
    throw new Error(`${name} must be one of: ${validOptions.join(", ")}`);
  }
  return value;
};

const formatTimestamp = () => new Date().toISOString();

const Log = (stack, level, package, message) => {
  const validatedStack = validateOption(stack, stackOptions, "stack");
  const validatedLevel = validateOption(level, levelOptions, "level");
  const validPackages = validatedStack === "backend" ? backendPackageOptions : frontendPackageOptions;
  const validatedPackage = validateOption(package, validPackages, "package");

  if (!message || (typeof message !== "string" && !(message instanceof Error))) {
    throw new Error("message must be a non-empty string or Error instance");
  }

  const text = message instanceof Error ? message.message : message;
  const details = {
    timestamp: formatTimestamp(),
    stack: validatedStack,
    package: validatedPackage,
    level: validatedLevel,
    message: text
  };

  const output = `[${details.timestamp}] [${details.stack}] [${details.package}] [${details.level}] - ${details.message}`;

  switch (validatedLevel) {
    case "error":
    case "fatal":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    default:
      console.info(output);
  }

  return details;
};

module.exports = {
  stackOptions,
  levelOptions,
  backendPackageOptions,
  frontendPackageOptions,
  Log
};


