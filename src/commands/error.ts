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
        throw new Error("Method not implemented.");
    }
}