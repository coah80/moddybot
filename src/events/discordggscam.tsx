/** @jsx h */
/** @jsxFrag Fragment */

import { type Message, type TextChannel } from "discord.js";
import { buildEmbed, Field, Fragment, h, Embed, Author } from "@/helpers/index.tsx";
import { getGuildConfig } from "@/utils/config.ts";
import type { Event } from "@/types/index.ts";
import { LogAPI } from "@/utils/logger.ts";
import { shouldBypass } from "@/utils/checks.ts";

const urlRegex = /discord\.gg\/(\S+)/gi;

export default {
    name: "messageCreate",
    async execute(message: Message) {
        const check = await shouldBypass(message)
        console.log(check);
        if (!message.guild || message.author.bot) return;
        if (check) return;

        const foundInvites = Array.from(message.content.matchAll(urlRegex));
        if (foundInvites.length === 0) return;

        let couldDelete = false;
        try {
            await message.delete();
            couldDelete = true;
        } catch {
            LogAPI.err("Could not delete message — missing permissions or already deleted.");
        }

        const alertChannel = message.guild.channels.cache.get(
            getGuildConfig(message.guild.id).log_channel ?? process.env.ALERT_CHANNEL_ID
        ) as TextChannel | undefined;

        if (!alertChannel) return;

        await alertChannel.send({
            embeds: [
                buildEmbed(
                    <Embed title="Found Discord Invite URL(s)">
                        <Author
                            name={message.author.username}
                            iconURL={message.member?.avatarURL() ?? message.author.avatarURL() ?? undefined}
                        />
                        <Field name="URLs" value={foundInvites.map(m => m[0]).join("\n")} />
                        <Field name="Channel" value={`<#${message.channel.id}>`} inline={true} />
                        <Field name="Deleted?" value={couldDelete ? "Yes" : "No"} inline={true} />
                    </Embed>
                ),
            ],
        });
    },
} satisfies Event<"messageCreate">;