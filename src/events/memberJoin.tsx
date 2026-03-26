import {type Client, type GuildMember, type Interaction, type Snowflake, type TextChannel} from "discord.js";
import {Author, buildEmbed, Embed, Field, Footer, h} from "@/helpers";

export default {
    name: "guildMemberAdd",
    async execute(member: GuildMember) {
        const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID as Snowflake) as TextChannel

        if (welcomeChannel?.isTextBased()) {
            const joinDate = new Date();
            const welcomeEmbed = buildEmbed(
                <Embed
                    description={"Welcome to the **R.E.P.O Modding Server!**"}
                    image={"https://media.discordapp.net/attachments/871531251918581831/1344567517774876762/Untitledvideo-MadewithClipchamp1-ezgif.com-cut.gif?width=880&height=495"}
                    color={"#ff8000"}
                >
                    <Author name={`${member.user.globalName} - ${member.user.id}`}
                            iconURL={member.user.displayAvatarURL()}/>
                    <Field inline={false} name={"📌 Read rules!"}
                           value={"Reading rules is very important. So do it https://canary.discord.com/channels/1344557689979670578/1344560754937958432"}/>
                    <Field inline={false} name={"💡 Need Mod Support?"}
                           value={"Please check the FAQ first: https://canary.discord.com/channels/1344557689979670578/1363921936119238921 before asking for help in https://canary.discord.com/channels/1344557689979670578/1347085657864015872"}/>
                    <Field inline={false} name={"🔗 Looking for sick mods?"}
                           value={"Go check out [ThunderStore](https://thunderstore.io/c/repo/) or look at https://canary.discord.com/channels/1344557689979670578/1344699091959156787"}/>
                    <Field inline={false} name={"🍻 Becoming a Developer?"}
                           value={"Go check out https://canary.discord.com/channels/1344557689979670578/1347090075745255556"}/>
                    <Field inline={false} name={"🌍 Language Barrier"}
                           value={"Unfortunately, this server only mostly supports English, so please try your hardest or use a translator!"}/>
                    <Footer
                        text={`Welcome to our community! Enjoy your stay - Today at ${joinDate.toLocaleDateString()}`}/>
                </Embed>
            )

            await welcomeChannel.send({
                content: `<@${member.user.id}>`,
                embeds: [
                    welcomeEmbed
                ]
            });
        }
    }
}