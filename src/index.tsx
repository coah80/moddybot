/** @jsx h */
/** @jsxFrag Fragment */

import {
    Client,
    GatewayIntentBits,
    ChannelType,
    type Interaction,
    type Snowflake,
    type ThreadChannel,
    type ForumChannel,
    ComponentType, type GuildTextBasedChannel, DefaultWebSocketManagerOptions, ActivityType, Routes, REST,
} from "discord.js";
import {Commands} from "@/commands/index.ts";
import {Author, buildEmbed, Embed, Field, Footer, h, Fragment, deployCommands} from "@/helpers/index.tsx";
import Events from "@/events/index.ts";
import {LogAPI} from "@/utils/logger.ts";

class ComponentCollector {
    private handlers = new Map<string, ComponentHandler>();

    register(handler: ComponentHandler) {
        this.handlers.set(handler.customId, handler);
    }

    getHandler(customId: string) {
        return this.handlers.get(customId);
    }

    clear() {
        this.handlers.clear();
    }
}

interface ComponentHandler {
    customId: string;
    execute: (client: Client, interaction: any, message: any) => Promise<void>;
}

const componentCollector = new ComponentCollector();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

DefaultWebSocketManagerOptions.identifyProperties.browser = 'Discord VR'; // DO NOT CHANGE OR EDIT THIS.

const commands = new Commands();
const eventsManager = new Events();

await eventsManager.loadEvents();
eventsManager.getEvents().forEach(event => {
    client.on(event.name, event.execute)
})

client.on('clientReady', async () => {
    LogAPI.log('Ready!');
    // const server = client.guilds.cache.get('1344557689979670578')
    // server!.commands.set([])
    // client.application.commands.set([]);
    await deployCommands(commands);

    commands.getAllCommands().forEach(command => {
        if (command.components) {
            Object.values(command.components).forEach(comp => {
                componentCollector.register(comp);
            });
        }
    });

    client.user.setPresence({
        activities: [{
            name: 'REPO Modding VR',
            state: 'Playing REPO Modding VR',
        }],
        status: 'online'
    });

    // const reportChannel = client.channels.cache.get('1468680174844248282') as GuildTextBasedChannel
    // if (reportChannel) {
    //     reportChannel.send({
    //         embeds: [
    //             buildEmbed(
    //                 <Embed title={"Startup"}>
    //                     <Field name={"Commands"} value={commands.getAllCommands().map(x => {
    //                         return `\`${x.data.name}\``
    //                     }).join(', ')}/>
    //                 </Embed>
    //             )
    //         ]
    //     })
    // }
});

client.on("threadCreate", async (thread: ThreadChannel, newlyCreated: boolean) => {
    if (thread.parent?.id == process.env.CREATE_THREAD_ID) {
        const member = await thread.guild.members.fetch(thread.ownerId);
        const hasRole = member.roles.cache.has(process.env.VERIFIED_MODDER_ROLE_ID);
        const forumChannel = await client.channels.fetch(process.env.THREAD_CREATION_ALERT_ID as Snowflake) as ForumChannel;


        if (forumChannel?.type === ChannelType.GuildForum) {
            const alertEmbed = buildEmbed(
                <Embed
                    title="New Mod Released"
                    description={`A new mod has been posted. If the user does not have the verified role, use /modder <user> to give the user the verified role.`}
                    color={0x5865F2}
                >
                    <Field name="Thread Name" value={thread.name} inline={true}/>
                    <Field name="Link" value={`<#${thread.id}>`} inline={true}/>
                    <Field name="Created By" value={`<@${thread.ownerId}>`} inline={true}/>
                    <Field name="Has Verified Role?" value={hasRole ? "Yes" : "No"} inline={true}/>
                </Embed>
            );

            await forumChannel.threads.create({
                name: `New Mod Release: ${thread.name}`,
                message: {
                    embeds: [alertEmbed],
                },
            });
        }
    }
});

client.on("interactionCreate", async (interaction: Interaction) => {
    const reportChannel = client.channels.cache.get('1468680174844248282')
    try {
        if (interaction.isAutocomplete()) {
            const command = commands.getCommand(interaction.commandName);
            if (command?.autocomplete) {
                await command.autocomplete(client, interaction);
            }
            return;
        }

        if (interaction.isMessageComponent()) {
            const handler = componentCollector.getHandler(interaction.customId);
            if (handler) {
                await handler.execute(client, interaction, interaction.message);
            }
            return;
        }

        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = commands.getCommand(interaction.commandName);
            if (!command) return;

            if (command.permissionCheck) {
                const hasPermission = await command.permissionCheck(client, interaction);
                if (!hasPermission.result) {
                    return await interaction.reply({
                        content: hasPermission.message,
                        embeds: hasPermission.embeds,
                        ephemeral: hasPermission.hide || false
                    });
                }
            }

            await command.execute(client, interaction);
        }
    } catch (error) {
        LogAPI.err(error)
        reportChannel != undefined && (reportChannel as GuildTextBasedChannel).send({
            content: `\`\`\`js \n${error}\`\`\``,
        })
    }
});

await client.login(process.env.TOKEN);