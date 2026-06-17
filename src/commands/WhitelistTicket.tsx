import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    type ModalSubmitInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ButtonInteraction
} from "discord.js";
import {buildEmbed, Embed, Field, Footer, h} from "@/helpers";

const MODDER_ROLE = "1344708068918952109";
const TICKET_CHANNEL = "1516904937429274748";
const APPROVED_ROLE = "1516905538464518375";

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Send the ticket panel to the ticket channel"),

    permissionCheck: () => ({result: true}),

    async execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.guild.channels.cache.get(interaction.channel.id);

        const button = new ButtonBuilder()
            .setCustomId("openSubmissionModal")
            .setLabel("Submit Beta Mod")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📨");

        await channel.send({
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)]
        });

        await interaction.reply({content: "Ticket panel sent.", ephemeral: true});
    },

    components: {
        openSubmissionModal: {
            customId: "openSubmissionModal",
            async execute(client: Client, interaction: ButtonInteraction): Promise<void> {
                if (!interaction.guild || !interaction.member) return;

                if (!interaction.member.roles.cache.has(MODDER_ROLE)) {
                    await interaction.reply({
                        content: `You need the <@&${MODDER_ROLE}> role to submit a beta mod.`,
                        ephemeral: true
                    });
                    return;
                }

                const modal = new ModalBuilder()
                    .setCustomId("submissionModal")
                    .setTitle("Beta Mod Submission");

                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("modName")
                            .setLabel("Mod Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setPlaceholder("e.g. SuperMod v1.0")
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("modLink")
                            .setLabel("Mod Link")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setPlaceholder("https://thunderstore.io/...")
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("modDescription")
                            .setLabel("Description")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setPlaceholder("Describe your mod, what it does, and any known issues...")
                            .setMaxLength(1000)
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("referralId")
                            .setLabel("Referral User ID (Optional)")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                            .setPlaceholder("e.g. 123456789012345678")
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("referralReason")
                            .setLabel("Why are they a good fit? (Optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setPlaceholder("Explain why you're referring this person...")
                            .setMaxLength(500)
                    )
                );

                await interaction.showModal(modal);
            }
        },

        submissionModal: {
            customId: "submissionModal",
            async execute(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
                if (!interaction.guild || !interaction.member) return;

                const user = interaction.user;
                const modName = interaction.fields.getTextInputValue("modName");
                const modLink = interaction.fields.getTextInputValue("modLink");
                const modDescription = interaction.fields.getTextInputValue("modDescription");
                const referralId = interaction.fields.getTextInputValue("referralId");
                const referralReason = interaction.fields.getTextInputValue("referralReason");

                const ticketChannel = interaction.guild.channels.cache.get(TICKET_CHANNEL);

                const acceptButton = new ButtonBuilder()
                    .setCustomId(`acceptSubmission_${user.id}`)
                    .setLabel("Accept")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✔️");

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`rejectSubmission_${user.id}`)
                    .setLabel("Reject")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("❌");

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton);

                await ticketChannel.send({
                    embeds: [
                        buildEmbed(
                            <Embed color={0x5865F2} title={`📦 ${modName}`}>
                                <Field inline={true} name="Submitted By" value={`<@${user.id}>`} />
                                <Field inline={true} name="Submitted At" value={new Date().toUTCString()} />
                                <Field inline={false} name="Mod Link" value={modLink} />
                                <Field inline={false} name="Description" value={modDescription} />
                                {referralId && <Field inline={true} name="Referred By" value={`<@${referralId}>`} />}
                                {referralReason && <Field inline={false} name="Referral Reason" value={referralReason} />}
                                <Footer text="Approval or rejection is at the discretion of moderators and staff." />
                            </Embed>
                        )
                    ],
                    components: [row]
                });

                await interaction.reply({
                    content: "Submission received! Staff will review your mod shortly.",
                    ephemeral: true
                });
            }
        },

        acceptSubmission: {
            customId: "acceptSubmission",
            async execute(client: Client, interaction: ButtonInteraction): Promise<void> {
                if (!interaction.guild || !interaction.member) return;

                const userId = interaction.customId.split("_")[1];
                const member = await interaction.guild.members.fetch(userId);

                await member.roles.add(APPROVED_ROLE);

                await interaction.update({
                    embeds: interaction.message.embeds,
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId("submissionDone")
                                .setLabel(`Accepted by ${interaction.user.username}`)
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true)
                        )
                    ]
                });

                try {
                    await member.send(`Your beta mod submission has been **accepted**! You've been granted the approved mod role.`);
                } catch {}
            }
        },

        rejectSubmission: {
            customId: "rejectSubmission",
            async execute(client: Client, interaction: ButtonInteraction): Promise<void> {
                if (!interaction.guild || !interaction.member) return;

                const userId = interaction.customId.split("_")[1];
                const member = await interaction.guild.members.fetch(userId);

                await interaction.update({
                    embeds: interaction.message.embeds,
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId("submissionDone")
                                .setLabel(`Rejected by ${interaction.user.username}`)
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        )
                    ]
                });

                try {
                    await member.send(`our beta mod submission has been **rejected**. Please reach out to staff if you have any questions.`);
                } catch {}
            }
        }
    }
}