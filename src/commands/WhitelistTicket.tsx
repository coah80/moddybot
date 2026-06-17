import {
    SlashCommandBuilder,
    ChannelType,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
    type Client,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import { buildEmbed, Embed, Field, Footer, h } from "@/helpers";

const MODDER_ROLE = "1344708068918952109";
const TICKET_CATEGORY = "1515494939251708056";
const TICKET_CHANNEL = "1514419133939192029";

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Send the ticket panel to the ticket channel"),

    permissionCheck: () => ({ result: true }),

    async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.guild.channels.cache.get(TICKET_CHANNEL);

        const button = new ButtonBuilder()
            .setCustomId("createTicketButton")
            .setLabel("Submit Beta Mod")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📨");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await channel.send({
            embeds: [
                buildEmbed(
                    <Embed color={0x5865F2} title="Beta Mod Submission">
                        <Field
                            inline={false}
                            name="📋 What is this?"
                            value="This channel is for submitting beta mods for review. Once submitted, a private ticket will be opened for you and our moderation team."
                        />
                        <Field
                            inline={false}
                            name="📌 Before Submitting"
                            value={[
                                "→ Only submit mods that are in a **beta/testable** state",
                                "→ Ensure your mod does not violate any community rules",
                                "→ Have your mod files or links ready to share",
                            ].join("\n")}
                        />
                        <Field
                            inline={false}
                            name="⚖️ Approval Process"
                            value="Approval or rejection of submitted mods is **entirely at the discretion of the moderators and staff**. Submitting a mod does not guarantee acceptance."
                        />
                        <Footer text="Only Verified Modders may open a submission ticket." />
                    </Embed>
                )
            ],
            components: [row]
        });

        await interaction.reply({ content: "Ticket panel sent.", ephemeral: true });
    },

    components: {
        createTicketButton: {
            customId: "createTicketButton",
            async execute(client: Client, interaction: ButtonInteraction): Promise<void> {
                const user = interaction.user;

                if (!interaction.guild || !interaction.member) return;

                if (!interaction.member.roles.cache.has(MODDER_ROLE)) {
                    await interaction.reply({
                        content: "You need the **Verified Modder** role to submit a beta mod.",
                        ephemeral: true
                    });
                    return;
                }

                const category = interaction.guild.channels.cache.get(TICKET_CATEGORY);

                const channel = await interaction.guild.channels.create({
                    name: `submission-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    topic: `${user.id}-${Date.now()}`,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        }
                    ]
                });

                await interaction.reply({
                    content: `Ticket has been created: ${channel}\nPlease head over and provide your mod files or links.`,
                    ephemeral: true
                });
            }
        }
    }
}