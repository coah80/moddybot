// badboy.ts
import {
    type ChatInputCommandInteraction,
    type Client,
    SlashCommandBuilder,
} from "discord.js";
import {check} from "@/commands/defaults";
import {getGuildConfig, setGuildConfig} from "@/utils/config.ts";

const BADBOY_ROLE_ID = "1492592574374875377";

export default {
    data: new SlashCommandBuilder()
        .setName('badboy')
        .setDescription('only staff know what this does..')
        .addUserOption(o => o.setName('user').setDescription('user').setRequired(true)),

    permissionCheck: check,

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const target = interaction.options.getUser('user', true);
        const guildId = interaction.guildId!;

        const badBoys: string[] = getGuildConfig(guildId, "badboys") ?? [];
        if (!badBoys.includes(target.id)) {
            setGuildConfig(guildId, {badboys: [...badBoys, target.id]});
        }

        const member = await interaction.guild!.members.fetch(target.id);
        await member.roles.add(BADBOY_ROLE_ID);

        await interaction.reply({content: `<@${target.id}> marked.`, ephemeral: true});
    }
}