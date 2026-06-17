// commands/close.ts
import {
    SlashCommandBuilder,
    type CommandInteraction,
    EmbedBuilder
} from "discord.js";

const MODDER_ROLE = "1344708068918952109";
const LOG_CHANNEL = "1344576254447321169";

export default {
    data: new SlashCommandBuilder()
        .setName("close")
        .setDescription("Close this ticket"),

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!interaction.guild || !interaction.member) return;

        if (!interaction.member.roles.cache.has(MODDER_ROLE)) {
            await interaction.reply({
                content: "You need the **Verified Modder** role to use this.",
                ephemeral: true
            });
            return;
        }

        const channel = interaction.channel;
        const topic = channel.topic ?? "";
        const [userId, timestamp] = topic.split("-");

        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL);

        const embed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .addFields(
                { name: "Channel", value: channel.name, inline: true },
                { name: "Opened By", value: `<@${userId}>`, inline: true },
                { name: "Opened At", value: new Date(Number(timestamp)).toUTCString(), inline: false },
                { name: "Closed By", value: `${interaction.user}`, inline: true },
                { name: "Closed At", value: new Date().toUTCString(), inline: true }
            )
            .setColor(0xe74c3c)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        await interaction.reply({ content: "Ticket closed, deleting channel..." });
        await channel.delete();
    }
}