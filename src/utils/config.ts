import path from "node:path";
import fs from "node:fs";

const configPath = path.join(import.meta.dirname, "../config.json");

interface StatusConfig {
  actions: string[];
  suffixes: string[];
  users: string[];
  interval: number;
}

interface GuildConfig {
  prefix?: string;
  allowedRoles?: string[];
  logChannel?: string;
}

interface Config {
  links: string[];
  status: StatusConfig;
  guilds: Record<string, GuildConfig>;
  [key: string]: unknown;
}

export function getConfig(): Config {
  const data = fs.readFileSync(configPath, "utf8");
  return JSON.parse(data);
}

export function setConfig<K extends keyof Config>(key: K, value: Config[K]): void {
  const config = getConfig();
  config[key] = value;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getGuildConfig(guildId: string): GuildConfig {
  const config = getConfig();
  return config.guilds?.[guildId] ?? {};
}

export function setGuildConfig(guildId: string, value: Partial<GuildConfig>): void {
  const config = getConfig();
  if (!config.guilds) config.guilds = {};
  config.guilds[guildId] = { ...config.guilds[guildId], ...value };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function deleteGuildConfig(guildId: string): void {
  const config = getConfig();
  if (config.guilds?.[guildId]) {
    delete config.guilds[guildId];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
}