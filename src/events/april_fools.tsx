import type {GuildMember, TextChannel} from "discord.js";
import {getGuildConfig, setGuildConfig} from "@/utils/config.ts";

const GUILD_ID = "1344557689979670578";
const ALERT_CHANNEL_ID = "1344557689979670582";

let leftCount = getGuildConfig(GUILD_ID).left_count ?? 134;

export default {
    name: "guildMemberRemove",
    async execute(member: GuildMember) {
        if (member.guild.id === GUILD_ID) {
            leftCount++;
            const alertChannel = member.guild.channels.cache.get(ALERT_CHANNEL_ID) as TextChannel;
            await alertChannel.send({
                content: `${member.user.username} (${member.id}) has left the server from possibly the april fools joke :). count is now ${leftCount}`,
            });
            setGuildConfig(member.guild.id, {left_count: leftCount});
        }
    }
}