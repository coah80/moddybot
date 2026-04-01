import {
    type ChatInputCommandInteraction,
    type Client, type GuildTextBasedChannel, REST, Routes,
    SlashCommandBuilder,
} from "discord.js";
import {check} from "@/commands/defaults";

export default {
    data: new SlashCommandBuilder()
        .setName('error')
        .setDescription('[DEV] Simulate an error.'),

    permissionCheck: check,

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        // poor atomic
        // if (interaction.user.id == "704757796599496714") {
        //     return await interaction.reply({
        //         content: `you really THOUGHT huh`,
        //     })
        // }
        throw new Error("Why must you do this to me.")
    }
}