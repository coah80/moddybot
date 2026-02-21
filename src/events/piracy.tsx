/** @jsx h */
/** @jsxFrag Fragment */

// Piracy detection — keyword-based regex check on message content.
import { type Message, type TextChannel } from "discord.js";
import { buildEmbed, Field, Fragment, h, Embed, Author } from "@/helpers/index.tsx";
import type { Event } from "@/types/index.ts";
import { getGuildConfig } from "@/utils/config.ts";
import { shouldBypass } from "@/utils/checks.ts";

const PIRACY_KEYWORDS = [
    "steamunlocked", "steamrip", "cracked", "pirated",
    "rutracker", "craked", "piracy", "pirate",
    "skidrow", "fitgirl", "gogunlocked",
];

export default {
    name: "messageCreate",
    async execute(message: Message) {
        if (!message.guild || message.author.bot) return;
        if (await shouldBypass(message)) return;

        const content = message.content.toLowerCase();
        const hasPiracy = PIRACY_KEYWORDS.some(word => content.includes(word));
        if (!hasPiracy) return;

        const alertChannel = message.guild.channels.cache.get(
            getGuildConfig(message.guild.id).log_channel ?? process.env.ALERT_CHANNEL_ID
        ) as TextChannel | undefined;

        if (!alertChannel) return;

        const jumpLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

        await alertChannel.send({
            embeds: [
                buildEmbed(
                    <Embed
                        title="Piracy Alert"
                        description="A message containing a potential piracy reference was detected."
                        color={0xFFA500}
                    >
                        <Author
                            name={message.author.username}
                            iconURL={message.author.avatarURL() ?? undefined}
                        />
                        <Field name="Message Content" value={message.content} />
                        <Field name="Jump Link" value={`[Jump to message](${jumpLink})`} />
                    </Embed>
                ),
            ],
        });
    },
} satisfies Event<"messageCreate">;