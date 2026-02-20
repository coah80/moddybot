import type {Client, GuildMember, Interaction, TextChannel} from "discord.js";
import {Author, Embed, h} from "@/helpers";
import {getGuildConfig} from "@/utils/config.ts";

export default {
    name: "guildMemberAdd",
    async execute(member: GuildMember) {
        if (!member.guild) return;

        const createdTimestamp = Math.floor(member.user.createdAt.getTime() / 1000);
        const message = `<t:${createdTimestamp}:R>`;
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

        const embed = (
            <Embed title={"Suspicious Age"} description={message}>
                <Author name={member.user.globalName || member.user.username} iconURL={member.user.avatarURL()}/>
            </Embed>
        )

        if (createdTimestamp < oneWeekMs) {
            const alertChannel = member.guild.channels.cache.get(getGuildConfig(member.guild.id).log_channel ?? process.env.ALERT_CHANNEL_ID) as TextChannel;
            if (alertChannel) {
                await alertChannel.send({
                    embeds: [embed],
                });
            }
        }
    }
}