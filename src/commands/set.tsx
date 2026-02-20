import {
    type ChatInputCommandInteraction,
    type Client,
    type AutocompleteInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    type TextChannel,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "@/utils/config.ts";

interface SettingOption {
    id: string;
    label: string;
    description: string;
    type: "channel" | "role" | "string" | "boolean";
}

const SETTINGS: SettingOption[] = [
     //{ id: "mod_channel", label: "Mod Channel", description: "Channel for mod-related announcements", type: "channel" },
    { id: "log_channel", label: "Log Channel", description: "Channel for bot logs", type: "channel" },
    { id: "mod_role", label: "Mod Role", description: "Role required to use mod commands", type: "role" },
    { id: "should_dm", label: "Should dm", description: "Should dm", type: "boolean" },
    //{ id: "admin_role", label: "Admin Role", description: "Role required to use admin commands", type: "role" },
    //{ id: "prefix", label: "Prefix", description: "Command prefix for legacy commands", type: "string" },
    //{ id: "welcome_channel", label: "Welcome Channel", description: "Channel to send welcome messages", type: "channel" },
    //{ id: "mute_role", label: "Mute Role", description: "Role assigned to muted users", type: "role" },
];

const findSetting = (id: string): SettingOption | undefined =>
    SETTINGS.find(s => s.id === id);

export default {
    data: new SlashCommandBuilder()
        .setName("set")
        .setDescription("Configure guild settings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => option
            .setName("setting")
            .setDescription("The setting to configure")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("Channel value (if applicable)")
            .setRequired(false)
        )
        .addRoleOption(option => option
            .setName("role")
            .setDescription("Role value (if applicable)")
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName("value")
            .setDescription("String value (if applicable)")
            .setRequired(false)
        ),

    permissionCheck: () => ({ result: true }),

    async autocomplete(client: Client, interaction: AutocompleteInteraction) {
        const focused = interaction.options.getFocused(true).value.toLowerCase();

        const filtered = SETTINGS
            .filter(s => s.label.toLowerCase().includes(focused) || s.id.includes(focused))
            .slice(0, 25)
            .map(s => ({
                name: `${s.label} — ${s.description}`,
                value: s.id,
            }));

        await interaction.respond(filtered);
    },

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const settingId = interaction.options.getString("setting", true);
        const setting = findSetting(settingId);

        if (!setting) {
            await interaction.reply({ content: "❌ Unknown setting.", ephemeral: true });
            return;
        }

        const guildId = interaction.guildId!;
        let resolvedValue: string | undefined;
        let displayValue: string | undefined;

        switch (setting.type) {
            case "channel": {
                const channel = interaction.options.getChannel("channel");
                if (!channel) {
                    await interaction.reply({ content: "❌ Please provide a channel for this setting.", ephemeral: true });
                    return;
                }
                resolvedValue = channel.id;
                displayValue = `<#${channel.id}>`;
                break;
            }
            case "role": {
                const role = interaction.options.getRole("role");
                if (!role) {
                    await interaction.reply({ content: "❌ Please provide a role for this setting.", ephemeral: true });
                    return;
                }
                resolvedValue = role.id;
                displayValue = `<@&${role.id}>`;
                break;
            }
            case "string": {
                const value = interaction.options.getString("value");
                if (!value) {
                    await interaction.reply({ content: "❌ Please provide a value for this setting.", ephemeral: true });
                    return;
                }
                resolvedValue = value;
                displayValue = `\`${value}\``;
                break;
            }
            case "boolean": {
                const value = interaction.options.getString("value");
                if (!value || !["true", "false"].includes(value.toLowerCase())) {
                    await interaction.reply({ content: "❌ Please provide `true` or `false` for this setting.", ephemeral: true });
                    return;
                }
                resolvedValue = value.toLowerCase();
                displayValue = `\`${resolvedValue}\``;
                break;
            }
        }

        setGuildConfig(guildId, { [settingId]: resolvedValue });

        await interaction.reply({
            content: `✅ **${setting.label}** has been set to ${displayValue}.`,
            ephemeral: true,
        });
    },
};