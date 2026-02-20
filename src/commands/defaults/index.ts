import type { ChatInputCommandInteraction, Client, GuildMember, Snowflake } from "discord.js";
import { getGuildConfig } from "@/utils/config.ts";

export async function check(client: Client, interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    const member = interaction.member as GuildMember;

    const guildConfig = getGuildConfig(guild!.id);
    const minRoleId = guildConfig.mod_role ?? process.env.MINIMUM_ROLE_REQUIRED as Snowflake;

    if (!minRoleId) {
        return { result: false, message: 'Configuration error: no minimum role configured.' };
    }

    let requiredRole;
    try {
        requiredRole = await guild!.roles.fetch(minRoleId as Snowflake);
    } catch {
        return { result: false, message: 'Configuration error: failed to fetch required role.' };
    }

    if (!requiredRole) {
        return { result: false, message: 'Configuration error: required role not found.' };
    }

    const hasRequiredRole = member.roles.highest.position >= requiredRole.position;

    if (!hasRequiredRole) {
        return { result: false, message: "The Maze isn't meant for you." };
    }

    return { result: true };
}