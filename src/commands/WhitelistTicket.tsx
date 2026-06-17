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
            .setLabel("Open Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await channel.send({
            embeds: [
                buildEmbed(
                    <Embed color={0x5865F2} title="Support Tickets">
                        <Field inline={false} name="Need help?" value="Click the button below to open a ticket." />
                        <Footer text="Verified Modders only" />
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
                        content: "You need the **Verified Modder** role to use this.",
                        ephemeral: true
                    });
                    return;
                }

                const category = interaction.guild.channels.cache.get(TICKET_CATEGORY);

                const channel = await interaction.guild.channels.create({
                    name: user.username,
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

                await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
            }
        }
    }
}