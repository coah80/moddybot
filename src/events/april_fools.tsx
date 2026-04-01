import type {Client, GuildMember, Interaction, TextChannel} from "discord.js";
import {Author, Embed, h} from "@/helpers";
import {getGuildConfig} from "@/utils/config.ts";

const BANNED_COUNT = 1;
var LEFT_COUNT = 82;

export default {
    name: "guildMemberRemove",
    async execute(member: GuildMember) {
        if (member.guild.id == "1344557689979670578")
        {
            LEFT_COUNT++;
            const alertChannel = member.guild.channels.cache.get('1344557689979670582') as TextChannel;
            if (alertChannel) {
                await alertChannel.send({
                    content: `${member.user.username} (${member.id}) has left the server from possibly the april fools joke :). count is now ${LEFT_COUNT}`,
                });
            }
        }
    }
}