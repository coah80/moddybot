/** @jsx h */
/** @jsxFrag Fragment */
// a piracy detection system that checks words if someone mentions piracy or cracked or steamunlocked, simple regex based system, not very advanced but it works
import {type Message, type TextChannel} from "discord.js";
import {buildEmbed, Field, Fragment, h, Embed, Author} from "@/helpers/index.tsx";
import type {Event} from "@/types/index.ts";
import {getGuildConfig} from "@/utils/config.ts";

const piracykw = ["steamunlocked", "steamrip", "cracked", "pirated", "rutracker", "craked", "piracy", "pirate", "skidrow", "fitgirl", "gogunlocked"];

export default {
    name: "messageCreate",
    async execute(message: Message) {
        if (message.author.bot || !message.guild) return;
        const content = message.content.toLowerCase();
        const hasPiracy = piracykw.some(word => content.includes(word));
    
        if (!hasPiracy) {
            return; 
        }

        const alertChannel = message.member.guild.channels.cache.get(getGuildConfig(message.member.guild.id).log_channel ?? process.env.ALERT_CHANNEL_ID) as TextChannel;
        if (!alertChannel) return; 
        const jumpLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
        
        const embed = buildEmbed(
            <Embed title="Piracy Alert" description="A message containing a potential pirater was detected." color={0xFFA500}>  
                <Author name={message.author.username} iconURL={message.author.avatarURL() ?? undefined} />
                <Field name="Message Content" value={message.content} />
                <Field name="Jump Link" value={`[jump to message](${jumpLink})`} />
            </Embed>
        );
        await alertChannel.send({ embeds: [embed] });
    }
} satisfies Event<"messageCreate">;