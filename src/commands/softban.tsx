import {
    type ChatInputCommandInteraction,
    type Client,
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import type { Command } from "@/types";
import { buildEmbed, Embed, Field, Author, Footer, h } from "@/helpers";
import {check} from "@/commands/defaults";

export default {
    data: new SlashCommandBuilder()
        .setName("softban")
        .setDescription("Softban a user (ban and immediately unban to delete messages)")
        .addUserOption(op => op
            .setName("user")
            .setDescription("The user to softban")
            .setRequired(true)
        )
        .addStringOption(op => op
            .setName("reason")
            .setDescription("Reason for the softban")
            .setRequired(false)
        )
        .addIntegerOption(op => op
            .setName("days")
            .setDescription("Number of days of messages to delete (0-7, default: 7)")
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    permissionCheck: check,

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason") || "No reason provided";
        const deleteMessageDays = interaction.options.getInteger("days") ?? 7;

        await interaction.deferReply();

        try {
            const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

            if (!member) {
                await interaction.editReply({
                    content: `Could not find user ${user.tag} in this server.`
                });
                return;
            }

            if (!interaction.guild!.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
                await interaction.editReply({
                    content: "I don't have permission to ban members in this server."
                });
                return;
            }

            const executorMember = await interaction.guild!.members.fetch(interaction.user.id);
            if (executorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
                await interaction.editReply({
                    content: "You cannot softban someone with a higher or equal role."
                });
                return;
            }

            const botMember = interaction.guild!.members.me;
            if (botMember!.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
                await interaction.editReply({
                    content: "My highest role is not high enough to ban this user."
                });
                return;
            }

            await interaction.guild!.members.ban(user, {
                deleteMessageSeconds: deleteMessageDays * 86400,
                reason: `[SOFTBAN] ${reason} - Executed by <@${interaction.user.id}>`
            });

            await interaction.guild!.bans.remove(user, `[SOFTBAN] Auto-unban by bot`);

            const embed = buildEmbed(
                <Embed
                    title="Softban Done"
                    description={`${user.tag} has been softbanned`}
                    color={0x00FF00}
                >
                    <Field name="User" value={`${user.tag} (${user.id})`} inline={true} />
                    <Field name="Moderator" value={`<@${interaction.user.id}>`} inline={true} />
                    <Field name="Reason" value={reason} inline={false} />
                    <Field name="Messages Deleted" value={`Last ${deleteMessageDays} day${deleteMessageDays !== 1 ? 's' : ''}`} inline={true} />
                    <Field name="Timestamp" value={new Date().toISOString()} inline={true} />
                </Embed>
            );

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error("Softban error:", error);
            await interaction.editReply({
                content: `❌ Failed to softban user: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
}