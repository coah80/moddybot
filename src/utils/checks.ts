import type {GuildMember, Message} from "discord.js";
import { getGuildConfig } from "@/utils/config.ts";

export function shouldBypass(message: Message): boolean {
    if (!message.guild || message.author.bot) return true;

    const config = getGuildConfig(message.guildId!);
    if (config.mods_bypass_checks !== "true") return false;

    const modRoleId = config.mod_role ?? process.env.MINIMUM_ROLE_REQUIRED;
    if (!modRoleId) return false;

    const modRole = message.guild.roles.cache.get(modRoleId);
    if (!modRole) return false;

    const member = message.member as GuildMember | null;
    if (!member) return false;

    return member.roles.highest.comparePositionTo(modRole) >= 0;
}