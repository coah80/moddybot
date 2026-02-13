import {
    type ChatInputCommandInteraction,
    type Client, type GuildTextBasedChannel, REST, Routes,
    SlashCommandBuilder,
} from "discord.js";
import {check} from "@/commands/defaults";

const rest = new REST().setToken(process.env.TOKEN);

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('say')
        .addStringOption(option => option
            .setName('say')
            .setDescription('say')
            .setRequired(true)
        ),

    permissionCheck: check,

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        const say = interaction.options.getString("say");
        if (!say || !guild) return;

        await rest.post(Routes.channelMessages(interaction.channelId), {
            body: {
                content: say,
                flags: 0,
                tts: false
            }
        });
    }
}