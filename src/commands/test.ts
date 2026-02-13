import {
    type ChatInputCommandInteraction,
    type Client,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "@/types/index.ts";

export default {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command for deployment verification'),

    permissionCheck: () => ({ result: true }),

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            content: "hey coah ur stupid",
            ephemeral: true
        });
    },
} satisfies Command;
