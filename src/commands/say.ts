import {
    type ChatInputCommandInteraction,
    type Client, type GuildTextBasedChannel, REST, Routes,
    SlashCommandBuilder,
} from "discord.js";
import {check} from "@/commands/defaults";

export default {
    data: new SlashCommandBuilder()
        .setName('repeat')
        .setDescription('message to repeat')
        .addStringOption(option => option
            .setName('message')
            .setDescription('arg')
            .setRequired(true)
        ),

    permissionCheck: check,

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        const say = interaction.options.getString("say");
        if (!say || !guild) return;

        const rest = new REST().setToken(process.env.TOKEN);
        await rest.post(Routes.channelMessages(interaction.channel.id), {
            body: {
                content: say,
                flags: 0,
                tts: false
            }
        });
    }
}