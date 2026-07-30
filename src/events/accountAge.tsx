// guildMemberAdd.tsx
import type {GuildMember, TextChannel} from "discord.js";
import {Author, Embed} from "@/helpers";
import {getGuildConfig} from "@/utils/config.ts";

const BADBOY_ROLE_ID = "1492592574374875377";

export default {
    name: "guildMemberAdd",
    async execute(member: GuildMember) {
        if (!member.guild) return;

        if (member.guild.id == process.env.GUILD_ID) {
            const badBoys = getGuildConfig(member.guild.id).badboys ?? [];
            if (badBoys.includes(member.id)) {
                await member.roles.add(BADBOY_ROLE_ID);
            }
        }

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
                await alertChannel.send({embeds: [embed]});
            }
        }
    }
}